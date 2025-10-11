// src/app/(main)/pembayaran/utils/exportTandaTangan.ts

import * as ExcelJS from 'exceljs';
import { CiTextAlignCenter } from 'react-icons/ci';

// --- Type Definitions ---
export interface PaymentType {
  id: string; 
  periode: string;
  uraian_pembayaran: string;
  jumlah_pegawai: number;
  jumlah_bruto: number;
  jumlah_pph21: number;
  jumlah_potongan: number; 
  jumlah_netto: number;
  status: "BARU" | "DISETUJUI";
  created_at: string;
}

export interface PaymentDetailType {
  id: string;
  rekapan_id: string; 
  nrp_nip_nir: string;
  nama: string;
  pekerjaan: string; 
  jumlah_bruto: number;
  jumlah_pph21: number;
  jumlah_netto: number;
  potongan: number; 
  bank: string;
  nomor_rekening: string;
  uraian_pembayaran?: string;
  kriteria?: "MEDIS" | "PARAMEDIS";
  klasifikasi?: string;
}

// --- Helper Functions ---
const getCellRef = (row: number, col: number): string => {
    let column = '';
    while (col > 0) {
        const remainder = (col - 1) % 26;
        column = String.fromCharCode(65 + remainder) + column;
        col = Math.floor((col - 1) / 26);
    }
    return `${column}${row}`;
};

// --- FUNGSI KLASIFIKASI ---
const classifyPegawai = (detail: PaymentDetailType): "MEDIS" | "PARAMEDIS" => {
    if (detail.kriteria) {
        const kriteriaUpper = detail.kriteria.toUpperCase();
        if (kriteriaUpper === "MEDIS" || kriteriaUpper === "PARAMEDIS") {
            return kriteriaUpper as "MEDIS" | "PARAMEDIS";
        }
    }
    
    if (detail.klasifikasi) {
        const klasifikasiUpper = detail.klasifikasi.toUpperCase();
        if (klasifikasiUpper === "MEDIS" || klasifikasiUpper === "PARAMEDIS") {
            return klasifikasiUpper as "MEDIS" | "PARAMEDIS";
        }
    }
    
    const pekerjaanLower = detail.pekerjaan ? detail.pekerjaan.toLowerCase().trim() : '';
    
    const isMedis = pekerjaanLower.includes('dokter') || 
                    pekerjaanLower.includes('dr.') ||
                    pekerjaanLower.includes('dr ') ||
                    pekerjaanLower.includes('spesialis');
    
    return isMedis ? "MEDIS" : "PARAMEDIS";
};

// --- FUNGSI UTAMA PEMBUAT SHEET TTD ---
const createTandaTanganSheet = (
    workbook: ExcelJS.Workbook, 
    sheetName: string, 
    details: PaymentDetailType[],
    rekapan: PaymentType,
    allPaymentsInPeriod: PaymentType[]
) => {
    if (details.length === 0) return;

    const worksheet = workbook.addWorksheet(sheetName, {
        views: [{ state: 'frozen', ySplit: 4 }] // Freeze dikurangi 1 row
    });
    
    worksheet.properties.defaultRowHeight = 15;
    
    // Dapatkan unique uraians dari SEMUA PAYMENTS
    const uniqueUraians = Array.from(new Set(allPaymentsInPeriod.map(p => p.uraian_pembayaran))).sort();
    
    // Buat mapping dari rekapan_id ke uraian_pembayaran
    const rekapanToUraianMap = new Map();
    allPaymentsInPeriod.forEach(payment => {
        rekapanToUraianMap.set(payment.id, payment.uraian_pembayaran);
    });

    // --- KELOMPOKKAN DATA BERDASARKAN NAMA PEGAWAI ---
    const groupedData = new Map<string, {
        nama: string;
        pekerjaan: string;
        details: PaymentDetailType[];
        totalPph21: number;
        totalPotongan: number;
        totalNetto: number;
        bankInfo: string;
    }>();

    details.forEach(detail => {
        const existing = groupedData.get(detail.nama);
        
        if (existing) {
            existing.details.push(detail);
            existing.totalPph21 += detail.jumlah_pph21;
            existing.totalPotongan += detail.potongan;
            existing.totalNetto += detail.jumlah_netto;
        } else {
            groupedData.set(detail.nama, {
                nama: detail.nama,
                pekerjaan: detail.pekerjaan,
                details: [detail],
                totalPph21: detail.jumlah_pph21,
                totalPotongan: detail.potongan,
                totalNetto: detail.jumlah_netto,
                bankInfo: (detail.bank === '-' || detail.bank === '') ? 'TUNAI' : `${detail.bank} - ${detail.nomor_rekening}`
            });
        }
    });

    const finalData = Array.from(groupedData.values()).sort((a, b) => a.nama.localeCompare(b.nama));

    // --- SET JUDUL ---
    const [periodeTahun, periodeBulan] = rekapan.periode.split('-'); 
    const periodeDate = new Date(`${periodeTahun}-${periodeBulan}-01`);
    const periodeBulanNama = periodeDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase();
    
    worksheet.getCell('A1').value = 'DAFTAR PEMBAYARAN JASA RUMAH SAKIT';
    worksheet.getCell('A1').font = { bold: true, size: 12, name: 'Arial' };
    worksheet.mergeCells(`A1:${getCellRef(1, 3 + uniqueUraians.length + 3)}`);
    
    worksheet.getCell('A2').value = `BULAN ${periodeBulanNama}`;
    worksheet.getCell('A2').font = { bold: true, size: 12, name: 'Arial' };
    worksheet.mergeCells(`A2:${getCellRef(2, 3 + uniqueUraians.length + 3)}`);
    
    worksheet.addRow([]);
    
    // --- HEADER KOLOM ---
    const fixedHeaders = [
        { name: 'NO', width: 8 },
        { name: 'NAMA', width: 35 },
        { name: 'PERIODE', width: 10,},
    ];
    
    const uraianColumns = uniqueUraians.map(uraian => ({
        name: uraian,
        width: Math.max(15, uraian.length * 1.5) // Width menyesuaikan panjang judul
    }));
    
    const totalHeaders = [
        { name: 'JUMLAH PPH 21', width: 18 },
        { name: 'POTONGAN', width: 15 },
        { name: 'TOTAL PEMBAYARAN NETTO', width: 20 },
        { name: 'PEMBAYARAN', width: 25 },
    ];
    
    const headerRow4Data = [
        ...fixedHeaders.map(h => h.name),
        ...uraianColumns.map(h => h.name),
        ...totalHeaders.map(h => h.name),
    ];
    
    const headerRow4 = worksheet.addRow(headerRow4Data);

    // Set Lebar Kolom dengan width yang disesuaikan
    let currentColumn = 1;
    [...fixedHeaders, ...uraianColumns, ...totalHeaders].forEach(h => {
        worksheet.getColumn(currentColumn++).width = h.width;
    });

    // Styling Header dengan warna #FFD54A
    headerRow4.eachCell(cell => {
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.font = { bold: true, name: 'Arial', size: 10 };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD54A' }
        };
    });
    headerRow4.height = 30;

    // Variabel untuk menyimpan total per kolom
    const columnTotals = {
        uraian: new Array(uniqueUraians.length).fill(0),
        pph21: 0,
        potongan: 0,
        netto: 0
    };

    // --- ISI DATA BARIS ---
    for (let i = 0; i < finalData.length; i++) {
        const pegawai = finalData[i];
        const dataRow = worksheet.addRow([]);
        
        let dataColIndex = 1;
        dataRow.getCell(dataColIndex++).value = i + 1; // NO
        dataRow.getCell(dataColIndex++).value = pegawai.nama; // NAMA
        dataRow.getCell(dataColIndex++).value = rekapan.periode; // PERIODE

        // Isi nilai untuk setiap uraian dan akumulasi total
        uniqueUraians.forEach((uraian, uraianIndex) => {
            let totalNettoForUraian = 0;
            
            pegawai.details.forEach(detail => {
                const paymentForUraian = allPaymentsInPeriod.find(p => p.uraian_pembayaran === uraian);
                if (paymentForUraian && detail.rekapan_id === paymentForUraian.id) {
                    totalNettoForUraian += detail.jumlah_netto;
                }
            });
            
            dataRow.getCell(dataColIndex).value = totalNettoForUraian; 
            dataRow.getCell(dataColIndex).numFmt = '#,##0'; 
            dataRow.getCell(dataColIndex).alignment = { horizontal: 'right' };
            
            // Akumulasi total per uraian
            columnTotals.uraian[uraianIndex] += totalNettoForUraian;
            dataColIndex++;
        });

        // Kolom Total
        dataRow.getCell(dataColIndex).value = pegawai.totalPph21;
        dataRow.getCell(dataColIndex).numFmt = '#,##0';
        dataRow.getCell(dataColIndex).alignment = { horizontal: 'right' };
        columnTotals.pph21 += pegawai.totalPph21;
        dataColIndex++;
        
        dataRow.getCell(dataColIndex).value = pegawai.totalPotongan;
        dataRow.getCell(dataColIndex).numFmt = '#,##0';
        dataRow.getCell(dataColIndex).alignment = { horizontal: 'right' };
        columnTotals.potongan += pegawai.totalPotongan;
        dataColIndex++;
        
        dataRow.getCell(dataColIndex).value = pegawai.totalNetto;
        dataRow.getCell(dataColIndex).numFmt = '#,##0';
        dataRow.getCell(dataColIndex).alignment = { horizontal: 'right' };
        dataRow.getCell(dataColIndex).font = { bold: true };
        columnTotals.netto += pegawai.totalNetto;
        dataColIndex++;
        
        dataRow.getCell(dataColIndex).value = pegawai.bankInfo;
        
        dataRow.height = 25;
        
        // Border untuk baris data
        dataRow.eachCell({ includeEmpty: true }, cell => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    }

    // --- BARIS TOTAL ---
    if (finalData.length > 0) {
        const totalRow = worksheet.addRow([]);
        let totalColIndex = 1;
        
        totalRow.getCell(totalColIndex++).value = 'TOTAL';
        totalRow.getCell(totalColIndex++).value = ''; // NAMA kosong
        totalRow.getCell(totalColIndex++).value = ''; // PERIODE kosong

        // Total per uraian
        columnTotals.uraian.forEach(total => {
            totalRow.getCell(totalColIndex).value = total;
            totalRow.getCell(totalColIndex).numFmt = '#,##0';
            totalRow.getCell(totalColIndex).alignment = { horizontal: 'right' };
            totalColIndex++;
        });

        // Total PPH21, Potongan, Netto
        totalRow.getCell(totalColIndex++).value = columnTotals.pph21;
        totalRow.getCell(totalColIndex - 1).numFmt = '#,##0';
        totalRow.getCell(totalColIndex - 1).alignment = { horizontal: 'right' };
        
        totalRow.getCell(totalColIndex++).value = columnTotals.potongan;
        totalRow.getCell(totalColIndex - 1).numFmt = '#,##0';
        totalRow.getCell(totalColIndex - 1).alignment = { horizontal: 'right' };
        
        totalRow.getCell(totalColIndex++).value = columnTotals.netto;
        totalRow.getCell(totalColIndex - 1).numFmt = '#,##0';
        totalRow.getCell(totalColIndex - 1).alignment = { horizontal: 'right' };
        totalRow.getCell(totalColIndex - 1).font = { bold: true };
        
        totalRow.getCell(totalColIndex++).value = ''; // PEMBAYARAN kosong

        // Styling Baris Total dengan warna #FFD54A
        totalRow.eachCell(cell => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD54A' }
            };
            if (cell.value) {
                cell.font = { bold: true, name: 'Arial', size: 10 };
            }
        });
        totalRow.height = 25;
    }
    
    // --- Bagian Pejabat Penanggung Jawab ---
    const startPejabatRow = worksheet.rowCount + 2;
    const pembayaranColIndex = currentColumn - 1;

    worksheet.mergeCells(getCellRef(startPejabatRow, pembayaranColIndex - 1), getCellRef(startPejabatRow, pembayaranColIndex));
    worksheet.getCell(getCellRef(startPejabatRow, pembayaranColIndex - 1)).value = 'Mengetahui,';
    worksheet.getCell(getCellRef(startPejabatRow, pembayaranColIndex - 1)).alignment = { horizontal: 'center' };

    worksheet.addRow([]); 
    worksheet.addRow([]); 
    worksheet.addRow([]); 
    worksheet.addRow([]); 

    const namaPejabatRow = worksheet.rowCount;
    worksheet.mergeCells(getCellRef(namaPejabatRow, pembayaranColIndex - 1), getCellRef(namaPejabatRow, pembayaranColIndex));
    worksheet.getCell(getCellRef(namaPejabatRow, pembayaranColIndex - 1)).value = '_________________________';
    worksheet.getCell(getCellRef(namaPejabatRow, pembayaranColIndex - 1)).alignment = { horizontal: 'center' };
};

// --- FUNGSI UTAMA DOWNLOAD DAFTAR TTD ---
export const downloadTandaTangan = async (
    allApprovedDetails: PaymentDetailType[], 
    rekapan: PaymentType, 
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void,
    allPaymentsInPeriod: PaymentType[]
) => {
    // Pengelompokan Data
    const dataMedis = allApprovedDetails.filter(detail => 
        classifyPegawai(detail) === "MEDIS"
    );

    const dataParamedis = allApprovedDetails.filter(detail => 
        classifyPegawai(detail) === "PARAMEDIS"
    );

    if (dataMedis.length === 0 && dataParamedis.length === 0) {
        showToast("Tidak ada data Medis maupun Paramedis yang disetujui untuk diunduh.", "warning");
        return;
    }

    const workbook = new ExcelJS.Workbook(); 
    
    // Pembuatan Sheet
    if (dataMedis.length > 0) {
        createTandaTanganSheet(workbook, 'DAFTAR BAYAR MEDIS', dataMedis, rekapan, allPaymentsInPeriod);
    }
    
    if (dataParamedis.length > 0) {
        createTandaTanganSheet(workbook, 'DAFTAR BAYAR PARAMEDIS', dataParamedis, rekapan, allPaymentsInPeriod);
    }

    // Proses Download
    try {
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        const periodeDownload = rekapan.periode.replace(/-/g, '_');
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DAFTAR_BAYAR_${periodeDownload}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showToast("Daftar Pembayaran berhasil diunduh!", "success"); 

    } catch (e) {
        showToast("Gagal mengunduh file Excel.", "error");
    }
};