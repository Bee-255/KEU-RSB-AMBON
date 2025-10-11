// src/app/(main)/pembayaran/utils/exportTandaTangan.ts

import * as ExcelJS from 'exceljs';

// --- Type Definitions ---
// Interface PaymentType (Data Rekap)
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

// Interface PaymentDetailType (Data Pegawai per Uraian)
export interface PaymentDetailType {
  id: string;
  rekapan_id: string; 
  nrp_nip_nir: string;
  nama: string;
  pekerjaan: string; 
  jumlah_bruto: number; // Nilai Bruto per detail
  jumlah_pph21: number;
  jumlah_netto: number;
  potongan: number; 
  bank: string;
  nomor_rekening: string;
  uraian_pembayaran: string; 
  kriteria?: "MEDIS" | "PARAMEDIS"; // DIJAMIN AKURAT DARI TABEL PEGAWAI
}

// --- Helper Functions ---

const getCellRef = (row: number, col: number): string => {
    let column = '';
    let c = col;
    while (c > 0) {
        const remainder = (c - 1) % 26;
        column = String.fromCharCode(65 + remainder) + column;
        c = Math.floor((c - 1) / 26);
    }
    return `${column}${row}`;
};

// --- FUNGSI UTAMA PEMBUAT SHEET DAFTAR BAYAR ---
const createPaymentSheet = (
    workbook: ExcelJS.Workbook, 
    sheetName: string, 
    details: PaymentDetailType[],
    rekapan: PaymentType 
) => {
    if (details.length === 0) return;

    // --- 1. PRE-PROCESSING DATA ---

    const worksheet = workbook.addWorksheet(sheetName, {
        views: [{ state: 'frozen', ySplit: 4 }] // Membekukan Baris Judul/Header
    });
    worksheet.properties.defaultRowHeight = 15;
    
    // Dapatkan semua uraian pembayaran unik (kolom dinamis)
    const uniqueUraians = Array.from(new Set(details.map(d => d.uraian_pembayaran))).sort();
    
    // Grouping Data: Mengelompokkan data per pegawai (NRP/NIP/NIR)
    const groupedByPegawai = details.reduce((acc, detail) => {
        const key = detail.nrp_nip_nir; 
        
        if (!acc[key]) {
            acc[key] = {
                nrp_nip_nir: detail.nrp_nip_nir,
                nama: detail.nama,
                // Format Pembayaran: BANK-NO_REKENING atau TUNAI
                bank_info: (detail.bank === '-' || detail.bank === '') ? 'TUNAI' : `${detail.bank}-${detail.nomor_rekening}`,
                total_pph21: 0,
                total_potongan: 0,
                total_netto: 0,
                // Menyimpan TOTAL BRUTO PER URAIAN
                uraian_bruto: {} as { [uraian: string]: number } 
            };
        }

        const uraian = detail.uraian_pembayaran || 'Lain-lain';
        
        // Akumulasi nilai BRUTO per uraian (untuk kolom dinamis)
        acc[key].uraian_bruto[uraian] = (acc[key].uraian_bruto[uraian] || 0) + detail.jumlah_bruto;
        
        // Akumulasi TOTAL KESELURUHAN (untuk kolom statis akhir)
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
        uraian_bruto: { [uraian: string]: number };
    }});

    const finalData = Object.values(groupedByPegawai).sort((a, b) => a.nama.localeCompare(b.nama));
    
    // --- 2. DEFINISI KOLOM HEADER (1 BARIS) ---
    
    const fixedHeadersBefore = [
        { name: 'NO', width: 5 },
        { name: 'NAMA', width: 40 },
        { name: 'PERIODE', width: 15 },
    ];
    
    // Kolom dinamis (BRUTO per Uraian)
    const uraianColumns = uniqueUraians.map(uraian => ({
        name: uraian.toUpperCase(), 
        width: 18, 
    }));
    
    // Header statis akhir
    const fixedHeadersAfter = [
        { name: 'TOTAL PPH 21', width: 15 },
        { name: 'POTONGAN', width: 15 },
        { name: 'JUMLAH NETTO', width: 20 },
        { name: 'PEMBAYARAN', width: 40 },
    ];

    const allColumns = [...fixedHeadersBefore, ...uraianColumns, ...fixedHeadersAfter];
    const totalCols = allColumns.length;

    // --- 3. SET JUDUL (Baris 1 & 2) ---
    
    const [periodeTahun, periodeBulan] = rekapan.periode.split('-'); 
    const periodeDate = new Date(`${periodeTahun}-${periodeBulan}-01`);
    const periodeBulanNama = periodeDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase();
    
    worksheet.getCell('A1').value = 'DAFTAR PEMBAYARAN JASA RUMAH SAKIT';
    worksheet.getCell('A1').font = { bold: true, size: 12, name: 'Arial' };
    worksheet.mergeCells(`A1:${getCellRef(1, totalCols)}`);
    
    worksheet.getCell('A2').value = `BULAN ${periodeBulanNama}`;
    worksheet.getCell('A2').font = { bold: true, size: 12, name: 'Arial' };
    worksheet.mergeCells(`A2:${getCellRef(2, totalCols)}`);
    
    worksheet.addRow([]); // Baris 3: Baris kosong pemisah
    
    // --- 4. HEADER KOLOM (Baris 4) ---
    
    const headerRow4Data = allColumns.map(h => h.name);
    const headerRow4 = worksheet.addRow(headerRow4Data);

    // Set Lebar Kolom
    allColumns.forEach((h, index) => {
        worksheet.getColumn(index + 1).width = h.width / 1.5;
    });

    // Styling Header
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
            fgColor: { argb: 'FFE0E0E0' } 
        };
    });
    headerRow4.height = 30;


    // --- 5. ISI DATA BARIS ---
    
    for (let i = 0; i < finalData.length; i++) {
        const pegawai = finalData[i];
        
        const dataRow = worksheet.addRow([]);
        
        let dataColIndex = 1;

        // Kolom Statis Awal
        dataRow.getCell(dataColIndex++).value = i + 1; // NO
        dataRow.getCell(dataColIndex++).value = pegawai.nama; // NAMA
        dataRow.getCell(dataColIndex++).value = rekapan.periode; // PERIODE

        // Kolom Dinamis Uraian (BRUTO)
        uniqueUraians.forEach(uraian => {
            const bruto = pegawai.uraian_bruto[uraian] || 0;
            dataRow.getCell(dataColIndex++).value = bruto; 
            dataRow.getCell(dataColIndex - 1).numFmt = '#,##0'; 
            dataRow.getCell(dataColIndex - 1).alignment = { horizontal: 'right' };
            dataRow.getCell(dataColIndex - 1).font = { bold: true }; 
        });

        // Kolom Statis Akhir (Total Akumulasi)
        
        dataRow.getCell(dataColIndex++).value = pegawai.total_pph21; // TOTAL PPH 21
        dataRow.getCell(dataColIndex - 1).numFmt = '#,##0';
        dataRow.getCell(dataColIndex - 1).alignment = { horizontal: 'right' };
        
        dataRow.getCell(dataColIndex++).value = pegawai.total_potongan; // POTONGAN
        dataRow.getCell(dataColIndex - 1).numFmt = '#,##0';
        dataRow.getCell(dataColIndex - 1).alignment = { horizontal: 'right' };
        
        dataRow.getCell(dataColIndex++).value = pegawai.total_netto; // JUMLAH NETTO
        dataRow.getCell(dataColIndex - 1).numFmt = '#,##0';
        dataRow.getCell(dataColIndex - 1).alignment = { horizontal: 'right' };
        dataRow.getCell(dataColIndex - 1).font = { bold: true };
        
        dataRow.getCell(dataColIndex++).value = pegawai.bank_info; // PEMBAYARAN (BANK-NO_REKENING)
        
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
    
};

// ----------------------------------------------------------------------
// --- FUNGSI UTAMA DOWNLOAD DAFTAR BAYAR ---
// ----------------------------------------------------------------------

/**
 * Membuat file Excel dengan 2 sheet (Medis & Paramedis) untuk daftar pembayaran.
 * Klasifikasi HANYA mengandalkan kolom 'kriteria'.
 */
export const downloadTandaTangan = async ( 
    allApprovedDetails: PaymentDetailType[], 
    rekapan: PaymentType, 
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void
) => {
    
    // 1. Fungsi klasifikasi yang HANYA mengandalkan kolom 'kriteria'
    const classifyPegawai = (detail: PaymentDetailType): "MEDIS" | "PARAMEDIS" => {
        
        // PRIORITAS TUNGGAL: Mengandalkan detail.kriteria yang sudah dibawa dari Tabel Pegawai
        if (detail.kriteria === "MEDIS") {
            return "MEDIS";
        }
        
        // Default ke PARAMEDIS jika kriteria kosong atau bukan MEDIS
        return "PARAMEDIS"; 
    };

    // 2. Pengelompokan Data
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
    
    // 3. Pembuatan Sheet
    if (dataMedis.length > 0) {
        createPaymentSheet(workbook, 'DAFTAR BAYAR MEDIS', dataMedis, rekapan);
    }
    
    if (dataParamedis.length > 0) {
        createPaymentSheet(workbook, 'DAFTAR BAYAR PARAMEDIS', dataParamedis, rekapan);
    }

    // 4. Proses Download
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
        console.error("Gagal saat memproses atau mengunduh file Excel:", e);
        showToast("Gagal mengunduh file Excel.", "error");
    }
};