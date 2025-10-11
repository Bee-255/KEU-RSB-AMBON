// src/app/(main)/pembayaran/utils/exportPaymentExcelMandiri.ts
import ExcelJS from 'exceljs';

// Import interface dari file utama
import { PaymentType, PaymentDetailType } from '../page';

// Interface untuk data yang sudah diagregasi
interface AggregatedPaymentDetail {
    nama_pegawai: string;
    bank_name: string;
    nomor_rekening: string;
    nama_rekening: string;
    jumlah_netto: number;
}

/**
 * Fungsi untuk mengagregasi data detail pembayaran (Gabungkan Netto berdasarkan Rekening).
 */
const aggregatePaymentDetails = (details: PaymentDetailType[]): AggregatedPaymentDetail[] => {
    const aggregationMap = new Map<string, AggregatedPaymentDetail>();

    details.forEach(d => {
        // Kunci agregasi: Nomor Rekening + Nama Pemilik Rekening
        const key = `${d.nomor_rekening.trim().toUpperCase()}|${d.nama_rekening.trim().toUpperCase()}`;
        
        // Pembulatan ke integer terdekat
        const roundedNetto = Math.round(Number(d.jumlah_netto));

        if (aggregationMap.has(key)) {
            const existing = aggregationMap.get(key)!;
            existing.jumlah_netto += roundedNetto;
        } else {
            aggregationMap.set(key, {
                nama_pegawai: d.nama.trim(), 
                bank_name: d.bank.trim().toUpperCase(),
                nomor_rekening: d.nomor_rekening.trim(),
                nama_rekening: d.nama_rekening.trim(), 
                jumlah_netto: roundedNetto,
            });
        }
    });

    return Array.from(aggregationMap.values());
};

/**
 * Mengkonversi periode 'YYYY-MM' menjadi deskripsi Judul/Keterangan.
 * Contoh: '2025-09' -> 'PEMBAYARAN JASA SEPTEMBER 2025'
 */
const getTitleText = (periode: string): string => {
    const parts = periode.split('-');
    if (parts.length !== 2) {
        return "PEMBAYARAN JASA";
    }

    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1; 

    const monthNames = [
        "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", 
        "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"
    ];

    if (monthIndex >= 0 && monthIndex < 12) {
        const month = monthNames[monthIndex];
        return `PEMBAYARAN JASA ${month} ${year}`;
    }

    return "PEMBAYARAN JASA";
};

export const exportPaymentExcelMandiri = async (
    details: PaymentDetailType[], 
    payment: PaymentType, 
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void
) => {
    // 1. FILTERING & AGREGRASI
    const filteredDetails = details.filter(d => 
        d.bank && d.bank.toUpperCase().trim() === 'MANDIRI'
    );
    
    if (filteredDetails.length === 0) {
        showToast("Tidak ada detail pembayaran dengan Bank MANDIRI yang ditemukan untuk diunduh.", "warning");
        return;
    }
    
    // Gabungkan data
    const aggregatedDetails = aggregatePaymentDetails(filteredDetails);
    
    const titleText = getTitleText(payment.periode);

    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Lampiran Bank MANDIRI");
        const filename = `${titleText.replace(/\s/g, ' ')} - BANK MANDIRI.xlsx`;
        
        worksheet.views = [{ 
            state: 'frozen', 
            ySplit: 3,
            showGridLines: true 
        }];
        
        // --- 1. SET JUDUL ---
        const titleRow = worksheet.addRow([`DAFTAR LAMPIRAN BANK MANDIRI`]);
        titleRow.font = { 
            bold: true, 
            size: 12,
            name: 'Arial',
        };
        titleRow.height = 20;
        worksheet.mergeCells('A1:E1'); 
        titleRow.alignment = { vertical: 'middle', horizontal: 'center' }; 
        worksheet.addRow([]);

        // --- 2. TENTUKAN HEADER KOLOM BARU ---
        worksheet.columns = [
            { key: 'NOMOR', width: 8 },
            { key: 'NAMA', width: 40 },
            { key: 'BANK', width: 10 },
            { key: 'NOMOR_REKENING', width: 20 },
            { key: 'JUMLAH_NETTO', width: 15 },
        ];

        const headerRow = worksheet.addRow([
            "NOMOR",
            "NAMA",
            "BANK",
            "NOMOR REKENING",
            "JUMLAH NETTO",
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

        // --- 3. TAMBAHKAN DATA AGREGRASI ---
        let totalNetto = 0;
        
        aggregatedDetails.forEach((d, index) => { 
            const rowNumber = index + 1;
            const nettoValue = d.jumlah_netto;
            totalNetto += nettoValue;

            const dataRow = worksheet.addRow({
                NOMOR: rowNumber,
                NAMA: d.nama_pegawai,
                BANK: d.bank_name,
                NOMOR_REKENING: d.nomor_rekening,
                JUMLAH_NETTO: nettoValue,
            });
            
            dataRow.font = { name: 'Arial', size: 10 };
            dataRow.height = 13;
            
            // Format kolom JUMLAH NETTO sebagai mata uang (tanpa desimal)
            dataRow.getCell(5).numFmt = '#,##0;[Red]-#,##0';
            
            // Alignment Center untuk kolom NOMOR dan BANK
            dataRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' }; 
            dataRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' }; 
            // Alignment Kanan untuk kolom JUMLAH NETTO
            dataRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
            
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
            "", 
            "",
            "",
            "TOTAL",
            totalNetto,
        ]);
        
        totalRow.height = 16;
        
        // Gabungkan sel untuk label dari A sampai C
        const lastRowIndex = worksheet.lastRow!.number;
        worksheet.mergeCells(`A${lastRowIndex}:C${lastRowIndex}`); 

        // Format kolom total (kolom E)
        totalRow.getCell(5).numFmt = '#,##0;[Red]-#,##0';
        
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
        totalRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
        totalRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };

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