// src/app/(main)/pembayaran/utils/exportTandaTangan.ts

import * as ExcelJS from 'exceljs';
import { supabase } from '@/utils/supabaseClient';
// PERBAIKAN: Import dengan alias yang berbeda
import { sortPegawai as sortPegawaiUtil, normalizePegawaiData } from './sortingUtils';

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
  kriteria?: string;
  klasifikasi?: string;
}

interface PegawaiType {
  id: string;
  nrp_nip_nir: string;
  nama: string;
  pekerjaan: string;
  jabatan_struktural: string;
  klasifikasi: string;
  status: string;
  bank: string;
  nomor_rekening: string;
  nama_rekening: string;
  golongan: string;
  pangkat: string;
}
const accountingFormat = '_(* #,##0_);_(* (#,##0);_(* "-"_);_(@_)';

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

// --- FUNGSI AMBIL DATA PEGAWAI DARI SUPABASE ---
const fetchDataPegawai = async (nrpNipNirList: string[]): Promise<Map<string, PegawaiType>> => {
    try {
        const { data, error } = await supabase
            .from('pegawai')
            .select('*')
            .in('nrp_nip_nir', nrpNipNirList)
            .eq('status', 'Aktif');

        if (error) {
            console.error('Error fetching pegawai data:', error);
            return new Map();
        }

        const pegawaiMap = new Map<string, PegawaiType>();
        data?.forEach(pegawai => {
            pegawaiMap.set(pegawai.nrp_nip_nir, pegawai);
        });

        return pegawaiMap;
    } catch (error) {
        console.error('Error in fetchDataPegawai:', error);
        return new Map();
    }
};

// --- FUNGSI KLASIFIKASI YANG DIPERBAIKI ---
const classifyPegawai = (detail: PaymentDetailType, pegawaiData?: PegawaiType): "Medis" | "Paramedis" => {
    // PRIORITAS 1: Data dari tabel pegawai
    if (pegawaiData?.klasifikasi) {
        const klasifikasi = pegawaiData.klasifikasi.trim();
        if (klasifikasi.toLowerCase() === 'medis') return 'Medis';
        if (klasifikasi.toLowerCase() === 'paramedis') return 'Paramedis';
    }

    // PRIORITAS 2: Field klasifikasi dari payment detail
    if (detail.klasifikasi) {
        const klasifikasi = detail.klasifikasi.trim();
        if (klasifikasi.toLowerCase() === 'medis') return 'Medis';
        if (klasifikasi.toLowerCase() === 'paramedis') return 'Paramedis';
    }

    // PRIORITAS 3: Analisis pekerjaan dari tabel pegawai
    if (pegawaiData?.pekerjaan) {
        const pekerjaan = pegawaiData.pekerjaan.toLowerCase();
        if (pekerjaan.includes('dokter mitra')) return 'Medis';
    }

    // PRIORITAS 4: Analisis pekerjaan dari payment detail
    const pekerjaanDetail = detail.pekerjaan ? detail.pekerjaan.toLowerCase().trim() : '';
    const isMedis = pekerjaanDetail.includes('dokter') || 
                    pekerjaanDetail.includes('dr.') ||
                    pekerjaanDetail.includes('dr ') ||
                    pekerjaanDetail.includes('spesialis');

    return isMedis ? "Medis" : "Paramedis";
};

// --- HAPUS FUNGSI sortPegawai LAMA DI SINI ---
// (Fungsi sortPegawai sudah dipindah ke sortingUtils.ts)

// --- FUNGSI UTAMA PEMBUAT SHEET TTD (DIPERBAIKI) ---
const createTandaTanganSheet = async (
    workbook: ExcelJS.Workbook, 
    sheetName: string, 
    details: PaymentDetailType[],
    rekapan: PaymentType,
    allPaymentsInPeriod: PaymentType[]
) => {
    if (details.length === 0) return;

    // Ambil data pegawai dari Supabase
    const nrpNipNirList = details.map(d => d.nrp_nip_nir).filter(Boolean);
    const pegawaiMap = await fetchDataPegawai(nrpNipNirList);

    const worksheet = workbook.addWorksheet(sheetName, {
        views: [{ state: 'frozen', ySplit: 4 }]
    });
    
    worksheet.properties.defaultRowHeight = 15;
    
    // Dapatkan unique uraians dari SEMUA PAYMENTS
    const uniqueUraians = Array.from(new Set(allPaymentsInPeriod.map(p => p.uraian_pembayaran))).sort();
    
    // Hitung total kolom secara dinamis
    const totalFixedHeaders = 3;        // NO, NAMA, PERIODE
    const totalUraianColumns = uniqueUraians.length; // Dynamic uraian
    const totalSummaryHeaders = 4;      // PPH21, POTONGAN, NETTO, PEMBAYARAN
    const totalKolom = totalFixedHeaders + totalUraianColumns + totalSummaryHeaders;

    // Buat mapping dari rekapan_id ke uraian_pembayaran
    const rekapanToUraianMap = new Map();
    allPaymentsInPeriod.forEach(payment => {
        rekapanToUraianMap.set(payment.id, payment.uraian_pembayaran);
    });

    // --- KELOMPOKKAN DATA DENGAN DATA PEGAWAI ---
    const groupedData = new Map<string, {
        nama: string;
        pekerjaan: string;
        pangkat: string;
        golongan: string;
        details: PaymentDetailType[];
        totalPph21: number;
        totalPotongan: number;
        totalNetto: number;
        bankInfo: string;
    }>();

    details.forEach(detail => {
        const pegawaiData = pegawaiMap.get(detail.nrp_nip_nir);
        const existing = groupedData.get(detail.nama);
        
        if (existing) {
            existing.details.push(detail);
            existing.totalPph21 += detail.jumlah_pph21;
            existing.totalPotongan += detail.potongan;
            existing.totalNetto += detail.jumlah_netto;
        } else {
            groupedData.set(detail.nama, {
                nama: detail.nama,
                pekerjaan: pegawaiData?.pekerjaan || detail.pekerjaan || '',
                pangkat: pegawaiData?.pangkat || '',
                golongan: pegawaiData?.golongan || '',
                details: [detail],
                totalPph21: detail.jumlah_pph21,
                totalPotongan: detail.potongan,
                totalNetto: detail.jumlah_netto,
                bankInfo: (detail.bank === '-' || detail.bank === '') ? 'TUNAI' : `${detail.bank} - ${detail.nomor_rekening}`
            });
        }
    });

    // PERBAIKAN: Gunakan sortPegawaiUtil dari utility functions
    const finalData = Array.from(groupedData.values()).sort(sortPegawaiUtil);

    // --- SET JUDUL ---
    const [periodeTahun, periodeBulan] = rekapan.periode.split('-'); 
    const periodeDate = new Date(`${periodeTahun}-${periodeBulan}-01`);
    const periodeBulanNama = periodeDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase();
    
    // Merge cells judul yang dinamis
    worksheet.getCell('A1').value = 'DAFTAR PEMBAYARAN JASA RUMAH SAKIT';
    worksheet.getCell('A1').font = { bold: true, size: 11, name: 'Arial' };
    worksheet.mergeCells(`A1:${getCellRef(1, totalKolom)}`);
    worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
    
    worksheet.getCell('A2').value = `BULAN ${periodeBulanNama}`;
    worksheet.getCell('A2').font = { bold: true, size: 11, name: 'Arial' };
    worksheet.mergeCells(`A2:${getCellRef(2, totalKolom)}`);
    worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
    
    worksheet.addRow([]);
    
    // --- HEADER KOLOM ---
    const fixedHeaders = [
        { name: 'NO', width: 8 },
        { name: 'NAMA', width: 50 },
        { name: 'PERIODE', width: 10 },
    ];
    
    const uraianColumns = uniqueUraians.map(uraian => ({
        name: uraian,
        width: Math.max(15, uraian.length * 0.8)
    }));
    
    const totalHeaders = [
        { name: 'JUMLAH PPH 21', width: 18 },
        { name: 'POTONGAN', width: 15 },
        { name: 'TOTAL NETTO', width: 15 },
        { name: 'PEMBAYARAN', width: 25 },
    ];
    
    const headerRow4Data = [
        ...fixedHeaders.map(h => h.name),
        ...uraianColumns.map(h => h.name),
        ...totalHeaders.map(h => h.name),
    ];
    
    const headerRow4 = worksheet.addRow(headerRow4Data);

    // Set Lebar Kolom
    let currentColumn = 1;
    [...fixedHeaders, ...uraianColumns, ...totalHeaders].forEach(h => {
        const column = worksheet.getColumn(currentColumn);
        column.width = h.width;
        currentColumn++;
    });

    // Styling Header dengan warna #FFD54A
    headerRow4.eachCell(cell => {
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.font = { bold: true, name: 'Arial', size: 11 };
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
        
        // Kolom NO - Center aligned
        dataRow.getCell(dataColIndex).value = i + 1;
        dataRow.getCell(dataColIndex).alignment = { vertical: 'middle', horizontal: 'center' };
        dataRow.getCell(dataColIndex).font = { name: 'Arial', size: 11 };
        dataColIndex++;
        
        // Kolom NAMA - Middle aligned
        dataRow.getCell(dataColIndex).value = pegawai.nama;
        dataRow.getCell(dataColIndex).alignment = { vertical: 'middle' };
        dataRow.getCell(dataColIndex).font = { name: 'Arial', size: 11 };
        dataColIndex++;
        
        // Kolom PERIODE - Center aligned
        dataRow.getCell(dataColIndex).value = rekapan.periode;
        dataRow.getCell(dataColIndex).alignment = { vertical: 'middle', horizontal: 'center' };
        dataRow.getCell(dataColIndex).font = { name: 'Arial', size: 11 };
        dataColIndex++;

        // Isi nilai untuk setiap uraian - MENGGUNAKAN BRUTO
        uniqueUraians.forEach((uraian, uraianIndex) => {
            let totalBrutoForUraian = 0;
            
            pegawai.details.forEach(detail => {
                const paymentForUraian = allPaymentsInPeriod.find(p => p.uraian_pembayaran === uraian);
                if (paymentForUraian && detail.rekapan_id === paymentForUraian.id) {
                    totalBrutoForUraian += detail.jumlah_bruto;
                }
            });
            
            dataRow.getCell(dataColIndex).value = totalBrutoForUraian; 
            dataRow.getCell(dataColIndex).numFmt = accountingFormat; 
            dataRow.getCell(dataColIndex).alignment = { vertical: 'middle', horizontal: 'right' };
            dataRow.getCell(dataColIndex).font = { name: 'Arial', size: 11 };
            
            // Akumulasi total per uraian
            columnTotals.uraian[uraianIndex] += totalBrutoForUraian;
            dataColIndex++;
        });

        // Kolom Total PPH21
        dataRow.getCell(dataColIndex).value = pegawai.totalPph21;
        dataRow.getCell(dataColIndex).numFmt = accountingFormat;
        dataRow.getCell(dataColIndex).alignment = { vertical: 'middle', horizontal: 'right' };
        dataRow.getCell(dataColIndex).font = { name: 'Arial', size: 11 };
        columnTotals.pph21 += pegawai.totalPph21;
        dataColIndex++;
        
        // Kolom Potongan
        dataRow.getCell(dataColIndex).value = pegawai.totalPotongan;
        dataRow.getCell(dataColIndex).numFmt = accountingFormat;
        dataRow.getCell(dataColIndex).alignment = { vertical: 'middle', horizontal: 'right' };
        dataRow.getCell(dataColIndex).font = { name: 'Arial', size: 11 };
        columnTotals.potongan += pegawai.totalPotongan;
        dataColIndex++;
        
        // Kolom Total Netto
        dataRow.getCell(dataColIndex).value = pegawai.totalNetto;
        dataRow.getCell(dataColIndex).numFmt = accountingFormat;
        dataRow.getCell(dataColIndex).alignment = { vertical: 'middle', horizontal: 'right' };
        dataRow.getCell(dataColIndex).font = { name: 'Arial', size: 11, bold: true };
        columnTotals.netto += pegawai.totalNetto;
        dataColIndex++;
        
        // Kolom Pembayaran
        dataRow.getCell(dataColIndex).value = pegawai.bankInfo;
        dataRow.getCell(dataColIndex).alignment = { vertical: 'middle' };
        dataRow.getCell(dataColIndex).font = { name: 'Arial', size: 11 };
        
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
        
        // Merge dan center align untuk tulisan "TOTAL" (kolom 1-3)
        totalRow.getCell(totalColIndex).value = 'TOTAL';
        worksheet.mergeCells(`A${worksheet.rowCount}:C${worksheet.rowCount}`);
        totalRow.getCell(totalColIndex).alignment = { vertical: 'middle', horizontal: 'center' };
        totalRow.getCell(totalColIndex).font = { name: 'Arial', size: 11, bold: true };
        
        // Skip kolom 2 dan 3 karena sudah di-merge
        totalColIndex = 4;

        // Total per uraian
        columnTotals.uraian.forEach(total => {
            totalRow.getCell(totalColIndex).value = total;
            totalRow.getCell(totalColIndex).numFmt = '#,##0';
            totalRow.getCell(totalColIndex).alignment = { vertical: 'middle', horizontal: 'right' };
            totalRow.getCell(totalColIndex).font = { name: 'Arial', size: 11, bold: true };
            totalColIndex++;
        });

        // Total PPH21
        totalRow.getCell(totalColIndex).value = columnTotals.pph21;
        totalRow.getCell(totalColIndex).numFmt = '#,##0';
        totalRow.getCell(totalColIndex).alignment = { vertical: 'middle', horizontal: 'right' };
        totalRow.getCell(totalColIndex).font = { name: 'Arial', size: 11, bold: true };
        totalColIndex++;
        
        // Total Potongan
        totalRow.getCell(totalColIndex).value = columnTotals.potongan;
        totalRow.getCell(totalColIndex).numFmt = '#,##0';
        totalRow.getCell(totalColIndex).alignment = { vertical: 'middle', horizontal: 'right' };
        totalRow.getCell(totalColIndex).font = { name: 'Arial', size: 11, bold: true };
        totalColIndex++;
        
        // Total Netto
        totalRow.getCell(totalColIndex).value = columnTotals.netto;
        totalRow.getCell(totalColIndex).numFmt = '#,##0';
        totalRow.getCell(totalColIndex).alignment = { vertical: 'middle', horizontal: 'right' };
        totalRow.getCell(totalColIndex).font = { name: 'Arial', size: 11, bold: true };
        totalColIndex++;
        
        totalRow.getCell(totalColIndex).value = ''; // PEMBAYARAN kosong
        totalRow.getCell(totalColIndex).alignment = { vertical: 'middle' };
        totalRow.getCell(totalColIndex).font = { name: 'Arial', size: 11 };

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
        });
        totalRow.height = 25;
    }
    
    // --- Bagian Pejabat Penanggung Jawab ---
    const startPejabatRow = worksheet.rowCount + 2;
    const pembayaranColIndex = currentColumn - 1;

    worksheet.mergeCells(getCellRef(startPejabatRow, pembayaranColIndex - 1), getCellRef(startPejabatRow, pembayaranColIndex));
    const mengetahuiCell = worksheet.getCell(getCellRef(startPejabatRow, pembayaranColIndex - 1));
    mengetahuiCell.value = 'Mengetahui,';
    mengetahuiCell.alignment = { vertical: 'middle', horizontal: 'center' };
    mengetahuiCell.font = { name: 'Arial', size: 11 };

    worksheet.addRow([]); 
    worksheet.addRow([]); 
    worksheet.addRow([]); 
    worksheet.addRow([]); 

    const namaPejabatRow = worksheet.rowCount;
    worksheet.mergeCells(getCellRef(namaPejabatRow, pembayaranColIndex - 1), getCellRef(namaPejabatRow, pembayaranColIndex));
    const garisCell = worksheet.getCell(getCellRef(namaPejabatRow, pembayaranColIndex - 1));
    garisCell.value = '_________________________';
    garisCell.alignment = { vertical: 'middle', horizontal: 'center' };
    garisCell.font = { name: 'Arial', size: 11 };
};

// --- FUNGSI UTAMA DOWNLOAD DAFTAR TTD (DIPERBAIKI) ---
export const downloadTandaTangan = async (
    allApprovedDetails: PaymentDetailType[], 
    rekapan: PaymentType, 
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void,
    allPaymentsInPeriod: PaymentType[]
) => {
    // Ambil data pegawai untuk klasifikasi yang akurat
    const nrpNipNirList = allApprovedDetails.map(d => d.nrp_nip_nir).filter(Boolean);
    const pegawaiMap = await fetchDataPegawai(nrpNipNirList);

    // Pengelompokan Data dengan klasifikasi dari data pegawai
    const dataMedis = allApprovedDetails.filter(detail => {
        const pegawaiData = pegawaiMap.get(detail.nrp_nip_nir);
        return classifyPegawai(detail, pegawaiData) === "Medis";
    });

    const dataParamedis = allApprovedDetails.filter(detail => {
        const pegawaiData = pegawaiMap.get(detail.nrp_nip_nir);
        return classifyPegawai(detail, pegawaiData) === "Paramedis";
    });

    if (dataMedis.length === 0 && dataParamedis.length === 0) {
        showToast("Tidak ada data Medis maupun Paramedis yang disetujui untuk diunduh.", "warning");
        return;
    }

    const workbook = new ExcelJS.Workbook(); 
    
    // Pembuatan Sheet dengan data yang sudah terklasifikasi
    if (dataMedis.length > 0) {
        await createTandaTanganSheet(workbook, 'DAFTAR BAYAR MEDIS', dataMedis, rekapan, allPaymentsInPeriod);
    }
    
    if (dataParamedis.length > 0) {
        await createTandaTanganSheet(workbook, 'DAFTAR BAYAR PARAMEDIS', dataParamedis, rekapan, allPaymentsInPeriod);
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
        console.error('Error downloading Excel:', e);
        showToast("Gagal mengunduh file Excel.", "error");
    }
};