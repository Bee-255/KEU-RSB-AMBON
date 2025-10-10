// src/app/(main)/pembayaran/utils/exportPaymentExcelTunai.ts

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

export const exportPaymentExcelTunai = async (
    details: PaymentDetailType[], 
    payment: PaymentType | null, 
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void
) => {
    if (!payment) {
        showToast("Rekapan pembayaran belum dipilih.", "error");
        return;
    }

    // 🚀 FILTERING: Ambil hanya data yang banknya kosong atau null
    const filteredDetails = details.filter(d => 
        !d.bank || d.bank.trim() === ''
    );
    
    if (filteredDetails.length === 0) {
        showToast("Tidak ada detail pembayaran dengan status TUNAI yang ditemukan untuk diunduh.", "warning");
        return;
    }

    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Lampiran Pembayaran Tunai");
        const filename = `Pembayaran_TUNAI_${payment.periode_pembayaran.replace(/\s/g, '_')}.xlsx`;
        
        // --- 1. SET JUDUL ---
        const titleRow = worksheet.addRow(["DAFTAR LAMPIRAN PEMBAYARAN TUNAI"]);
        titleRow.font = { bold: true, size: 14 };
        // Merge cell hingga Kolom G, meskipun Tunai mungkin hanya butuh sedikit
        worksheet.mergeCells('A1:G1'); 
        titleRow.alignment = { vertical: 'middle', horizontal: 'center' }; 
        worksheet.addRow([]);

        // --- 2. TENTUKAN HEADER KOLOM BARU ---
        // Kolom disesuaikan untuk Tunai, namun mempertahankan 7 kolom untuk konsistensi file.
        worksheet.columns = [
            { key: 'NOMOR_URUT', width: 10 }, 
            { key: 'NRP', width: 20 },
            { key: 'NAMA', width: 40 },
            { key: 'JUMLAH_NETTO', width: 20 },
            { key: 'KETERANGAN', width: 30 },
            { key: 'EMPTY1', width: 5 },
            { key: 'EMPTY2', width: 5 },
        ];

        const headerRow = worksheet.addRow([
            "NO.",
            "NRP/NIP/NIR",
            "NAMA PEGAWAI",
            "JUMLAH NETTO",
            "KETERANGAN",
            "",
            ""
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
                NOMOR_URUT: rowNumber,
                NRP: d.nrp_nip_nir,
                NAMA: d.nama,
                JUMLAH_NETTO: nettoValue,
                KETERANGAN: payment.periode_pembayaran
            });
            
            // Format kolom JUMLAH NETTO (Kolom D)
            dataRow.getCell(4).numFmt = '#,##0.00;[Red]-#,##0.00';
            
            // Alignment Center untuk Kolom No.
            dataRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' }; 
            
            dataRow.eachCell(cell => {
                cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            });
        });
        
        // --- 4. TAMBAHKAN BARIS TOTAL ---
        const totalRow = worksheet.addRow(["TOTAL", "", "TOTAL NETTO", totalNetto, "", "", ""]);
        const lastRowIndex = worksheet.lastRow!.number;
        
        // Merge cell A-B-C untuk label TOTAL
        worksheet.mergeCells(`A${lastRowIndex}:C${lastRowIndex}`); 

        // Format kolom total (Kolom D)
        totalRow.getCell(4).numFmt = '#,##0.00;[Red]-#,##0.00';
        
        totalRow.eachCell(cell => {
             cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD54A' } };
            cell.font = { bold: true };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });
        totalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' }; // Kolom A yang sudah di-merge

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