// src/app/(main)/pembayaran/utils/exportPaymentExcelBtn.ts
import ExcelJS from 'exceljs';

// Import interface dari file utama
import { PaymentType, PaymentDetailType } from '../page';

// Interface untuk data yang sudah diagregasi
interface AggregatedPaymentDetail {
    nomor_rekening: string;
    nama_rekening: string;
    jumlah_netto: number;
}

/**
 * Fungsi untuk mengagregasi data detail pembayaran.
 * Menggabungkan jumlah_netto berdasarkan 'nomor_rekening' dan 'nama_rekening'.
 */
const aggregatePaymentDetails = (details: PaymentDetailType[]): AggregatedPaymentDetail[] => {
    const aggregationMap = new Map<string, AggregatedPaymentDetail>();

    details.forEach(d => {
        const key = `${d.nomor_rekening.trim().toUpperCase()}|${d.nama_rekening.trim().toUpperCase()}`;
        
        // Pembulatan ke integer terdekat
        const roundedNetto = Math.round(Number(d.jumlah_netto));

        if (aggregationMap.has(key)) {
            const existing = aggregationMap.get(key)!;
            existing.jumlah_netto += roundedNetto;
        } else {
            aggregationMap.set(key, {
                nomor_rekening: d.nomor_rekening.trim(),
                nama_rekening: d.nama_rekening.trim(), 
                jumlah_netto: roundedNetto,
            });
        }
    });

    return Array.from(aggregationMap.values());
};

/**
 * Mengkonversi periode 'YYYY-MM' menjadi deskripsi Keterangan.
 * Contoh: '2025-09' -> 'PEMBAYARAN JASA BULAN SEPTEMBER 2025'
 */
const getKeteranganText = (periode: string): string => {
    // Memastikan format YYYY-MM
    const parts = periode.split('-');
    if (parts.length !== 2) {
        return "PEMBAYARAN JASA"; // Fallback jika format salah
    }

    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1; // 0-indexed month

    const monthNames = [
        "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", 
        "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"
    ];

    if (monthIndex >= 0 && monthIndex < 12) {
        const month = monthNames[monthIndex];
        return `PEMBAYARAN JASA BULAN ${month} ${year}`;
    }

    return "PEMBAYARAN JASA"; // Fallback jika bulan tidak valid
};

export const exportPaymentExcelBtn = async (
    details: PaymentDetailType[], 
    payment: PaymentType, 
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void
) => {
    // 1. FILTERING & AGREGRASI
    const filteredDetails = details.filter(d => 
        d.bank && d.bank.toUpperCase().trim() === 'BTN'
    );
    
    if (filteredDetails.length === 0) {
        showToast("Tidak ada detail pembayaran dengan Bank Tabungan Negara yang ditemukan untuk diunduh.", "warning");
        return;
    }
    
    const aggregatedDetails = aggregatePaymentDetails(filteredDetails);
    
    // MENGAMBIL KETERANGAN BARU DARI payment.periode
    const keteranganValue = getKeteranganText(payment.periode);

    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Lampiran Bank Tabungan Negara");
        const baseFilename = `${keteranganValue} - BTN`;

        const filename = `${baseFilename.replace(/\s/g, ' ')}.xlsx`;
        
        // 🌟 PENYESUAIAN FONT & VIEW: Hapus defaultRowHeight: 16
        worksheet.views = [{ 
            state: 'frozen', 
            ySplit: 3, // Bekukan baris header
            showGridLines: true 
        }];
        
        // --- 1. SET JUDUL ---
        const titleRow = worksheet.addRow([`DAFTAR LAMPIRAN BANK TABUNGAN NEGARA`]);
        titleRow.font = { 
            bold: true, 
            size: 12,
            name: 'Arial',
        };
        titleRow.height = 20;
        worksheet.mergeCells('A1:G1');
        titleRow.alignment = { vertical: 'middle', horizontal: 'center' }; 
        worksheet.addRow([]);

        // --- 2. TENTUKAN HEADER KOLOM BARU ---
        worksheet.columns = [
            { key: 'NOMOR_REKENING', width: 20 },
            { key: 'PLUS', width: 7 },
            { key: 'JUMLAH_NETTO', width: 17 },
            { key: 'CD', width: 5 },
            { key: 'NOMOR', width: 10 },
            { key: 'NAMA_REKENING', width: 40 },
            { key: 'KETERANGAN', width: 40 },
        ];

        // Tambahkan baris header dengan teks yang diminta
        const headerRow = worksheet.addRow([
            "NOMOR REKENING",
            "PLUS",
            "JUMLAH NETTO",
            "CD",
            "NOMOR",
            "NAMA REKENING",
            "KETERANGAN"
        ]);
        
        headerRow.height = 16;

        // Aplikasikan styling ke header
        headerRow.eachCell(cell => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD54A' }
            };
            cell.font = { 
                bold: true,
                name: 'Arial',
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = { 
                top: {style:'thin'}, left: {style:'thin'}, 
                bottom: {style:'thin'}, right: {style:'thin'}
            };
        });

        // --- 3. TAMBAHKAN DATA DENGAN NOMOR (MENGGUNAKAN DATA AGREGRASI) ---
        let totalNetto = 0;
        
        // Menggunakan aggregatedDetails
        aggregatedDetails.forEach((d, index) => { 
            const rowNumber = index + 1;
            const nettoValue = d.jumlah_netto; // Sudah dibulatkan saat agregasi
            totalNetto += nettoValue;

            const dataRow = worksheet.addRow({
                NOMOR_REKENING: d.nomor_rekening,
                PLUS: "+",
                JUMLAH_NETTO: nettoValue,
                CD: "C",
                NOMOR: rowNumber,
                NAMA_REKENING: d.nama_rekening, 
                KETERANGAN: keteranganValue
            });
            
            dataRow.font = { name: 'Arial', size: 10 };
            dataRow.height = 13;

            // Format kolom JUMLAH NETTO sebagai mata uang (tanpa desimal)
            dataRow.getCell(3).numFmt = '#,##0;[Red]-#,##0';
            
            // Alignment Center untuk kolom PLUS, CD dan NOMOR
            dataRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
            dataRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
            dataRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
            
            // Tambahkan border untuk semua cell data
            dataRow.eachCell(cell => {
                cell.border = { 
                    top: {style:'thin'}, left: {style:'thin'}, 
                    bottom: {style:'thin'}, right: {style:'thin'}
                };
            });
        });
        
        // --- 4. TAMBAHKAN BARIS TOTAL ---
        const totalRow = worksheet.addRow([
            "TOTAL",
            "",
            totalNetto,
            "",
            "",
            "",
            ""
        ]);
        
        // Gabungkan cell untuk label "TOTAL"
        const lastRowIndex = worksheet.lastRow!.number;
        worksheet.mergeCells(`A${lastRowIndex}:B${lastRowIndex}`);
        
        totalRow.height = 16;

        // Format kolom total (kolom C)
        totalRow.getCell(3).numFmt = '#,##0;[Red]-#,##0';
        
        // Aplikasikan styling ke baris total
        totalRow.eachCell(cell => {
             cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD54A' }
            };
            cell.font = { 
                bold: true,
                name: 'Arial',
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = { 
                top: {style:'thin'}, left: {style:'thin'}, 
                bottom: {style:'thin'}, right: {style:'thin'}
            };
        });
        
        // PERBAIKAN ALIGNMENT: 
        totalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
        totalRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'right' };

        // --- 5. TULIS FILE DAN PICU DOWNLOAD ---
        const buffer = await workbook.xlsx.writeBuffer();

        const blob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showToast(`File Excel ${filename} berhasil dibuat!`, "success");

    } catch (e) {
        console.error("Gagal membuat file Excel:", e);
        showToast("Terjadi kesalahan saat mengunduh file Excel.", "error");
    }
};