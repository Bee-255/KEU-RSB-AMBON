// src/app/(main)/pembayaran/utils/exportTandaTangan.ts

import * as ExcelJS from 'exceljs';

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
  uraian_pembayaran: string; 
  // Tambahkan kriteria jika tersedia di data sebenarnya
  kriteria?: "MEDIS" | "PARAMEDIS";
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

// --- FUNGSI UTAMA PEMBUAT SHEET TTD (TANPA KOLOM TTD) ---
const createTandaTanganSheet = (
    workbook: ExcelJS.Workbook, 
    sheetName: string, 
    details: PaymentDetailType[],
    rekapan: PaymentType
) => {
    if (details.length === 0) return;

    const worksheet = workbook.addWorksheet(sheetName, {
        views: [{ state: 'frozen', ySplit: 5 }] 
    });
    
    worksheet.properties.defaultRowHeight = 15;
    
    // Dapatkan semua uraian pembayaran unik untuk dijadikan kolom
    const uniqueUraians = Array.from(new Set(details.map(d => d.uraian_pembayaran))).sort();
    
    // Grouping Data - PERBAIKAN: Simpan detail per uraian
    const groupedByPegawai = details.reduce((acc, detail) => {
        const key = detail.nrp_nip_nir; 
        
        if (!acc[key]) {
            acc[key] = {
                nrp_nip_nir: detail.nrp_nip_nir,
                nama: detail.nama,
                bank_info: (detail.bank === '-' || detail.bank === '') ? 'TUNAI' : `${detail.bank} - ${detail.nomor_rekening}`,
                total_pph21: 0,
                total_potongan: 0,
                total_netto: 0,
                // Simpan detail per uraian, bukan hanya total
                uraian_details: {} as { [uraian: string]: {
                    netto: number;
                    bruto: number;
                    pph21: number;
                    potongan: number;
                }}
            };
        }

        const uraian = detail.uraian_pembayaran || 'Lain-lain';
        
        // Inisialisasi jika belum ada
        if (!acc[key].uraian_details[uraian]) {
            acc[key].uraian_details[uraian] = {
                netto: 0,
                bruto: 0,
                pph21: 0,
                potongan: 0
            };
        }
        
        // Akumulasi nilai per uraian
        acc[key].uraian_details[uraian].netto += detail.jumlah_netto;
        acc[key].uraian_details[uraian].bruto += detail.jumlah_bruto;
        acc[key].uraian_details[uraian].pph21 += detail.jumlah_pph21;
        acc[key].uraian_details[uraian].potongan += detail.potongan;
        
        // Total keseluruhan
        acc[key].total_pph21 += detail.jumlah_pph21;
        acc[key].total_potongan += detail.potongan;
        acc[key].total_netto += detail.jumlah_netto;

        return acc;
    }, {} as { [key: string]: {
        nrp_nip_nir: string;
        nama: string;
        bank_info: string;
        total_pph21: number;
        total_potongan: number;
        total_netto: number;
        uraian_details: { [uraian: string]: {
            netto: number;
            bruto: number;
            pph21: number;
            potongan: number;
        }};
    }});

    const finalData = Object.values(groupedByPegawai).sort((a, b) => a.nama.localeCompare(b.nama));

    // --- 1. SET JUDUL (Baris 1 & 2) ---
    const [periodeTahun, periodeBulan] = rekapan.periode.split('-'); 
    const periodeDate = new Date(`${periodeTahun}-${periodeBulan}-01`);
    const periodeBulanNama = periodeDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase();
    
    worksheet.getCell('A1').value = 'DAFTAR PEMBAYARAN JASA RUMAH SAKIT';
    worksheet.getCell('A1').font = { bold: true, size: 12, name: 'Arial' };
    worksheet.mergeCells('A1:E1');
    
    worksheet.getCell('A2').value = `BULAN ${periodeBulanNama}`;
    worksheet.getCell('A2').font = { bold: true, size: 12, name: 'Arial' };
    worksheet.mergeCells('A2:E2');
    
    worksheet.addRow([]); 
    
    // --- 2. TENTUKAN HEADER KOLOM BARU (TANPA TTD) ---
    const fixedHeaders = [
        { name: 'NO', width: 5 },
        { name: 'NAMA', width: 40 },
        { name: 'PERIODE', width: 15 },
    ];
    
    const uraianColumns = uniqueUraians.map(uraian => ({
        name: uraian,
        width: 15,
    }));
    
    const totalHeaders = [
        { name: 'JUMLAH PPH 21', width: 15 },
        { name: 'POTONGAN', width: 15 },
        { name: 'TOTAL PEMBAYARAN NETTO', width: 20 },
        { name: 'PEMBAYARAN', width: 40 },
    ];
    
    // HAPUS: ttdHeaders dihapus seluruhnya

    const headerRow4Data = [
        ...fixedHeaders.map(h => h.name),
        'URAIAN PEMBAYARAN',
        ...Array(uraianColumns.length - 1).fill(null),
        ...totalHeaders.map(h => h.name),
        // HAPUS: bagian TTD dihapus
    ];
    
    const headerRow5Data = [
        ...Array(fixedHeaders.length).fill(null),
        ...uraianColumns.map(h => h.name),
        ...Array(totalHeaders.length).fill(null), 
        // HAPUS: bagian TTD dihapus
    ];

    const headerRow4 = worksheet.addRow(headerRow4Data);
    const headerRow5 = worksheet.addRow(headerRow5Data);

    // --- Merging Cells (TANPA BAGIAN TTD) ---
    let colIndex = 1;
    
    fixedHeaders.forEach(() => {
        worksheet.mergeCells(getCellRef(4, colIndex), getCellRef(5, colIndex));
        colIndex++;
    });

    const startUraianCol = colIndex;
    const endUraianCol = colIndex + uraianColumns.length - 1;
    worksheet.mergeCells(getCellRef(4, startUraianCol), getCellRef(4, endUraianCol));
    colIndex = endUraianCol + 1;

    totalHeaders.forEach(() => {
        worksheet.mergeCells(getCellRef(4, colIndex), getCellRef(5, colIndex));
        colIndex++;
    });

    // HAPUS: semua merging cells untuk TTD

    // Set Lebar Kolom (TANPA KOLOM TTD)
    let currentColumn = 1;
    [...fixedHeaders, ...uraianColumns, ...totalHeaders].forEach(h => {
        worksheet.getColumn(currentColumn++).width = h.width / 1.5;
    });

    // Styling Header
    [headerRow4, headerRow5].forEach(row => {
        row.eachCell(cell => {
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
                fgColor: { argb: 'FFE0E0E0' } 
            };
        });
        row.height = 30;
    });

    // --- Isi Data Baris (TANPA BAGIAN TTD) ---
    for (let i = 0; i < finalData.length; i++) {
        const pegawai = finalData[i];
        
        const dataRow = worksheet.addRow([]);
        
        let dataColIndex = 1;
        dataRow.getCell(dataColIndex++).value = i + 1; // NO
        dataRow.getCell(dataColIndex++).value = pegawai.nama; // NAMA
        dataRow.getCell(dataColIndex++).value = rekapan.periode; // PERIODE

        // Kolom Dinamis Uraian - TAMPILKAN DETAIL PER URAIAN
        uniqueUraians.forEach(uraian => {
            const detail = pegawai.uraian_details[uraian];
            const netto = detail ? detail.netto : 0;
            dataRow.getCell(dataColIndex++).value = netto; 
            dataRow.getCell(dataColIndex - 1).numFmt = '#,##0'; 
            dataRow.getCell(dataColIndex - 1).alignment = { horizontal: 'right' };
        });

        // Kolom Total Statis
        dataRow.getCell(dataColIndex++).value = pegawai.total_pph21;
        dataRow.getCell(dataColIndex - 1).numFmt = '#,##0';
        dataRow.getCell(dataColIndex - 1).alignment = { horizontal: 'right' };
        
        dataRow.getCell(dataColIndex++).value = pegawai.total_potongan;
        dataRow.getCell(dataColIndex - 1).numFmt = '#,##0';
        dataRow.getCell(dataColIndex - 1).alignment = { horizontal: 'right' };
        
        dataRow.getCell(dataColIndex++).value = pegawai.total_netto;
        dataRow.getCell(dataColIndex - 1).numFmt = '#,##0';
        dataRow.getCell(dataColIndex - 1).alignment = { horizontal: 'right' };
        dataRow.getCell(dataColIndex - 1).font = { bold: true };
        
        dataRow.getCell(dataColIndex++).value = pegawai.bank_info; // PEMBAYARAN
        
        // HAPUS: seluruh logika TTD (baris kosong, merge cells TTD, dll)
        
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
    
    // HAPUS: bagian pejabat di bawah karena TTD dihapus
};

// --- FUNGSI UTAMA DOWNLOAD DAFTAR TTD ---

/**
 * Membuat file Excel dengan 2 sheet (Medis & Paramedis) untuk daftar tanda tangan.
 * DENGAN PERBAIKAN KLASIFIKASI: Gunakan kriteria jika tersedia, fallback ke pekerjaan
 */
export const downloadTandaTangan = async (
    allApprovedDetails: PaymentDetailType[], 
    rekapan: PaymentType, 
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void
) => {
    
    // PERBAIKAN: Fungsi klasifikasi yang lebih robust
    const classifyPegawai = (detail: PaymentDetailType): "MEDIS" | "PARAMEDIS" => {
        // Prioritaskan kolom kriteria jika tersedia
        if (detail.kriteria) {
            return detail.kriteria;
        }
        
        // Fallback ke klasifikasi berdasarkan pekerjaan
        const pekerjaanLower = detail.pekerjaan ? detail.pekerjaan.toLowerCase() : '';
        
        // Kriteria Medis
        const medisKeywords = ['dokter', 'spesialis', 'dr.', 'sp.', 'dokter spesialis'];
        const isMedis = medisKeywords.some(keyword => pekerjaanLower.includes(keyword));
        
        if (isMedis) {
            return "MEDIS";
        }
        
        // Default ke Paramedis
        return "PARAMEDIS";
    };

    // 1. Pengelompokan Data dengan klasifikasi yang diperbaiki
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
    
    if (dataMedis.length > 0) {
        createTandaTanganSheet(workbook, 'DAFTAR BAYAR MEDIS', dataMedis, rekapan);
    }
    
    if (dataParamedis.length > 0) {
        createTandaTanganSheet(workbook, 'DAFTAR BAYAR PARAMEDIS', dataParamedis, rekapan);
    }

    // 4. Proses Download
    try {
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        const periodeDownload = rekapan.periode.replace(/-/g, '_');
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DAFTAR_TTD_${periodeDownload}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showToast("Daftar Tanda Tangan berhasil diunduh!", "success"); 

    } catch (e) {
        console.error("Gagal saat memproses atau mengunduh file Excel:", e);
        showToast("Gagal mengunduh file Excel.", "error");
    }
};