// src/app/(main)/pembayaran/utils/exportPaymentExcelMandiri.ts

import ExcelJS from 'exceljs';

// Definisikan ulang interface agar file ini independen
interface PaymentType {
    id: string;
    periode_pembayaran: string;
}

interface PaymentDetailType {
    nrp_nip_nir: string;
    nama: string;
    pekerjaan: string;
    jumlah_bruto: number;
    jumlah_pph21: number;
    potongan: number;
    jumlah_netto: number;
    nomor_rekening: string;
    bank: string; // Kunci untuk filtering!
    nama_rekening: string;
}

export const exportPaymentExcelMandiri = async (
    details: PaymentDetailType[], 
    payment: PaymentType | null, 
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void
) => {
    if (!payment) {
        showToast("Rekapan pembayaran belum dipilih.", "error");
        return;
    }

    // 🚀 FILTERING: Ambil hanya data yang banknya adalah "MANDIRI"
    const filteredDetails = details.filter(d => 
        d.bank && d.bank.toUpperCase().trim() === 'MANDIRI'
    );
    
    if (filteredDetails.length === 0) {
        showToast("Tidak ada detail pembayaran dengan Bank MANDIRI yang ditemukan untuk diunduh.", "warning");
        return;
    }

    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Lampiran Bank MANDIRI");
        const filename = `Pembayaran_MANDIRI_${payment.periode_pembayaran.replace(/\s/g, '_')}.xlsx`;
        
        // --- 1. SET JUDUL ---
        const titleRow = worksheet.addRow(["DAFTAR LAMPIRAN BANK MANDIRI"]);
        titleRow.font = { bold: true, size: 14 };
        worksheet.mergeCells('A1:G1');
        titleRow.alignment = { vertical: 'middle', horizontal: 'center' }; 
        worksheet.addRow([]);

        // --- 2. TENTUKAN HEADER KOLOM BARU ---
        worksheet.columns = [
            { key: 'NOMOR_REKENING', width: 20 },
            { key: 'PLUS', width: 5 },
            { key: 'JUMLAH_NETTO', width: 20 },
            { key: 'CD', width: 5 },
            { key: 'NOMOR_URUT', width: 15 },
            { key: 'NAMA_REKENING', width: 40 },
            { key: 'KETERANGAN', width: 30 },
        ];

        const headerRow = worksheet.addRow([
            "NOMOR REKENING",
            "PLUS",
            "JUMLAH NETTO",
            "CD",
            "NOMOR URUT",
            "NAMA REKENING",
            "KETERANGAN"
        ]);

        headerRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD54A' } };
            cell.font = { bold: true };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });

        // --- 3. TAMBAHKAN DATA DENGAN NOMOR URUT ---
        let totalNetto = 0;
        
        filteredDetails.forEach((d, index) => { 
            const rowNumber = index + 1;
            const nettoValue = Number(d.jumlah_netto);
            totalNetto += nettoValue;

            const dataRow = worksheet.addRow({
                NOMOR_REKENING: d.nomor_rekening,
                PLUS: "+",
                JUMLAH_NETTO: nettoValue,
                CD: "C",
                NOMOR_URUT: rowNumber,
                NAMA_REKENING: d.nama_rekening.trim(), 
                KETERANGAN: payment.periode_pembayaran
            });
            
            dataRow.getCell(3).numFmt = '#,##0.00;[Red]-#,##0.00';
            dataRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
            dataRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
            
            dataRow.eachCell(cell => {
                cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            });
        });
        
        // --- 4. TAMBAHKAN BARIS TOTAL ---
        const totalRow = worksheet.addRow(["TOTAL", "", totalNetto, "", "", "", ""]);
        const lastRowIndex = worksheet.lastRow!.number;
        worksheet.mergeCells(`A${lastRowIndex}:B${lastRowIndex}`);

        totalRow.getCell(3).numFmt = '#,##0.00;[Red]-#,##0.00';
        
        totalRow.eachCell(cell => {
             cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD54A' } };
            cell.font = { bold: true };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });
        totalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

        // --- 5. TULIS FILE DAN PICU DOWNLOAD ---
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
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