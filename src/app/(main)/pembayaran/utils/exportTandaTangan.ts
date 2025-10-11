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
  // Kolom kriteria yang diminta untuk klasifikasi
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

// --- FUNGSI UTAMA PEMBUAT SHEET TTD (TANPA KOLOM TTD, 1-ROW HEADER) ---
const createTandaTanganSheet = (
    workbook: ExcelJS.Workbook, 
    sheetName: string, 
    details: PaymentDetailType[],
    rekapan: PaymentType
) => {
    if (details.length === 0) return;

    const worksheet = workbook.addWorksheet(sheetName, {
        views: [{ state: 'frozen', ySplit: 5 }] // Membekukan baris judul
    });
    
    worksheet.properties.defaultRowHeight = 15;
    
    // Dapatkan semua uraian pembayaran unik untuk dijadikan kolom
    const uniqueUraians = Array.from(new Set(details.map(d => d.uraian_pembayaran))).sort();
    
    // Grouping Data: Mengelompokkan detail berdasarkan pegawai (NRP/NIP/NIR)
    const groupedByPegawai = details.reduce((acc, detail) => {
        const key = detail.nrp_nip_nir; 
        
        if (!acc[key]) {
            acc[key] = {
                nrp_nip_nir: detail.nrp_nip_nir,
                nama: detail.nama,
                // Menggabungkan info bank/rekening atau menggunakan 'TUNAI'
                bank_info: (detail.bank === '-' || detail.bank === '') ? 'TUNAI' : `${detail.bank} - ${detail.nomor_rekening}`,
                total_pph21: 0,
                total_potongan: 0,
                total_netto: 0,
                // Menyimpan total netto per uraian
                uraian_netto: {} as { [uraian: string]: number }
            };
        }

        const uraian = detail.uraian_pembayaran || 'Lain-lain';
        
        // Inisialisasi dan Akumulasi nilai Netto per uraian
        acc[key].uraian_netto[uraian] = (acc[key].uraian_netto[uraian] || 0) + detail.jumlah_netto;
        
        // Akumulasi Total keseluruhan
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
        uraian_netto: { [uraian: string]: number }; // Hanya simpan netto per uraian
    }});

    const finalData = Object.values(groupedByPegawai).sort((a, b) => a.nama.localeCompare(b.nama));

    // --- 1. SET JUDUL (Baris 1 & 2) ---
    const [periodeTahun, periodeBulan] = rekapan.periode.split('-'); 
    const periodeDate = new Date(`${periodeTahun}-${periodeBulan}-01`);
    const periodeBulanNama = periodeDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase();
    
    worksheet.getCell('A1').value = 'DAFTAR PEMBAYARAN JASA RUMAH SAKIT';
    worksheet.getCell('A1').font = { bold: true, size: 12, name: 'Arial' };
    worksheet.mergeCells(`A1:${getCellRef(1, 3 + uniqueUraians.length + 4)}`); // Merge hingga kolom terakhir
    
    worksheet.getCell('A2').value = `BULAN ${periodeBulanNama}`;
    worksheet.getCell('A2').font = { bold: true, size: 12, name: 'Arial' };
    worksheet.mergeCells(`A2:${getCellRef(2, 3 + uniqueUraians.length + 4)}`); // Merge hingga kolom terakhir
    
    worksheet.addRow([]); // Baris kosong
    
    // --- 2. TENTUKAN HEADER KOLOM BARU (1 BARIS HEADER) ---
    const fixedHeaders = [
        { name: 'NO', width: 5 },
        { name: 'NAMA', width: 40 },
        { name: 'PERIODE', width: 15 },
    ];
    
    // Kolom dinamis berdasarkan uniqueUraians
    const uraianColumns = uniqueUraians.map(uraian => ({
        name: uraian, // Nama uraian menjadi header
        width: 15,
    }));
    
    const totalHeaders = [
        { name: 'JUMLAH PPH 21', width: 15 },
        { name: 'POTONGAN', width: 15 },
        { name: 'TOTAL PEMBAYARAN NETTO', width: 20 },
        { name: 'PEMBAYARAN', width: 40 },
        { name: 'TANDA TANGAN', width: 15 }, // Kolom TTD yang baru ditambahkan
    ];
    
    // Gabungan semua header untuk 1 baris
    const headerRow4Data = [
        ...fixedHeaders.map(h => h.name),
        ...uraianColumns.map(h => h.name), // Kolom-kolom uraian
        ...totalHeaders.map(h => h.name),
    ];
    
    const headerRow4 = worksheet.addRow(headerRow4Data);

    // Set Lebar Kolom
    let currentColumn = 1;
    [...fixedHeaders, ...uraianColumns, ...totalHeaders].forEach(h => {
        worksheet.getColumn(currentColumn++).width = h.width / 1.5;
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


    // --- Isi Data Baris (TANPA MERGE, 1 BARIS DATA) ---
    for (let i = 0; i < finalData.length; i++) {
        const pegawai = finalData[i];
        
        const dataRow = worksheet.addRow([]);
        
        let dataColIndex = 1;
        dataRow.getCell(dataColIndex++).value = i + 1; // NO
        dataRow.getCell(dataColIndex++).value = pegawai.nama; // NAMA
        dataRow.getCell(dataColIndex++).value = rekapan.periode; // PERIODE

        // Kolom Dinamis Uraian - TAMPILKAN NETTO PER URAIAN
        uniqueUraians.forEach(uraian => {
            const netto = pegawai.uraian_netto[uraian] || 0;
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
        
        // Kolom Tanda Tangan
        dataRow.getCell(dataColIndex++).value = i % 2 === 0 ? `${i + 1}.` : ''; // Penomoran TTD
        dataRow.height = 25; // Tinggikan sedikit untuk kolom TTD
        
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
    
    // --- Bagian Pejabat Penanggung Jawab ---
    const startPejabatRow = worksheet.rowCount + 2;
    const ttdColIndex = currentColumn - 1; // Kolom TTD
    const pembayaranColIndex = ttdColIndex - 1; // Kolom Pembayaran
    
    worksheet.mergeCells(getCellRef(startPejabatRow, pembayaranColIndex), getCellRef(startPejabatRow, ttdColIndex));
    worksheet.getCell(getCellRef(startPejabatRow, pembayaranColIndex)).value = 'Mengetahui,';
    worksheet.getCell(getCellRef(startPejabatRow, pembayaranColIndex)).alignment = { horizontal: 'center' };

    worksheet.addRow([]); 
    worksheet.addRow([]); 
    worksheet.addRow([]); 
    worksheet.addRow([]); 

    const namaPejabatRow = worksheet.rowCount;
    worksheet.mergeCells(getCellRef(namaPejabatRow, pembayaranColIndex), getCellRef(namaPejabatRow, ttdColIndex));
    worksheet.getCell(getCellRef(namaPejabatRow, pembayaranColIndex)).value = '_________________________';
    worksheet.getCell(getCellRef(namaPejabatRow, pembayaranColIndex)).alignment = { horizontal: 'center' };
    
};

// --- FUNGSI UTAMA DOWNLOAD DAFTAR TTD ---

/**
 * Membuat file Excel dengan 2 sheet (Medis & Paramedis) untuk daftar tanda tangan.
 * Klasifikasi berdasarkan kolom kriteria, fallback ke pekerjaan jika kriteria tidak ada.
 */
export const downloadTandaTangan = async (
    allApprovedDetails: PaymentDetailType[], 
    rekapan: PaymentType, 
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void
) => {
    
    // 1. Fungsi klasifikasi yang lebih robust
    const classifyPegawai = (detail: PaymentDetailType): "MEDIS" | "PARAMEDIS" => {
        // Prioritaskan kolom kriteria jika tersedia dan memiliki nilai yang valid
        if (detail.kriteria === "MEDIS" || detail.kriteria === "PARAMEDIS") {
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
        
        // Default ke Paramedis jika tidak termasuk Medis
        return "PARAMEDIS";
    };

    // 2. Pengelompokan Data dengan klasifikasi yang diperbaiki
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
        a.download = `DAFTAR_BAYAR_TTD_${periodeDownload}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showToast("Daftar Pembayaran/Tanda Tangan berhasil diunduh!", "success"); 

    } catch (e) {
        console.error("Gagal saat memproses atau mengunduh file Excel:", e);
        showToast("Gagal mengunduh file Excel.", "error");
    }
};