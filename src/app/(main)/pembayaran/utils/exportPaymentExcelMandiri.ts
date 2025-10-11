// src/app/(main)/pembayaran/utils/exportPaymentExcelMandiri.ts

import ExcelJS from 'exceljs';

// Definisikan ulang interface agar file ini independen
interface PaymentType {
    id: string;
    periode_pembayaran: string;
    // ASUMSI: Menambahkan properti 'periode' yang formatnya YYYY-MM
    periode: string; 
}

interface PaymentDetailType {
    nrp_nip_nir: string;
    nama: string; // Akan digunakan sebagai Nama Pegawai
    pekerjaan: string;
    jumlah_bruto: number;
    jumlah_pph21: number;
    potongan: number;
    jumlah_netto: number;
    nomor_rekening: string;
    bank: string; // Kunci untuk filtering!
    nama_rekening: string; // Akan digunakan sebagai Nama Pemilik Rekening
}

// BARU: Interface untuk menampung data yang sudah diagregasi
interface AggregatedPaymentDetail {
    nama_pegawai: string; // Nama dari tabel pegawai (nama)
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
        return "PEMBAYARAN JASA"; // Fallback jika format salah
    }

    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1; 

    const monthNames = [
        "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", 
        "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"
    ];

    if (monthIndex >= 0 && monthIndex < 12) {
        const month = monthNames[monthIndex];
        // Menggunakan format yang diminta: PEMBAYARAN JASA SEPTEMBER 2025
        return `PEMBAYARAN JASA ${month} ${year}`;
    }

    return "PEMBAYARAN JASA"; // Fallback jika bulan tidak valid
};


export const exportPaymentExcelMandiri = async (
    details: PaymentDetailType[], 
    payment: PaymentType | null, 
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void
) => {
    if (!payment) {
        showToast("Rekapan pembayaran belum dipilih.", "error");
        return;
    }

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
    
    // 🚀 PERUBAHAN: Dapatkan teks judul dari payment.periode
    const titleText = getTitleText(payment.periode);


    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Lampiran Bank MANDIRI");
        const filename = `${titleText.replace(/\s/g, ' ')} - BANK MANDIRI.xlsx`;
        
        // 🌟 PENYESUAIAN VIEW: Hapus defaultRowHeight = 16
        worksheet.views = [{ 
            state: 'frozen', 
            ySplit: 3, // Bekukan baris header
            showGridLines: true 
        }];
        
        // --- 1. SET JUDUL ---
        // 🚀 PERUBAHAN: Menggunakan titleText
        const titleRow = worksheet.addRow([`DAFTAR LAMPIRAN BANK MANDIRI`]);
        titleRow.font = { 
            bold: true, 
            size: 12,
            name: 'Arial', // 🌟 Terapkan Arial
        };
        titleRow.height = 20; // 🌟 Set tinggi baris Judul
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

        headerRow.height = 16; // 🌟 Set tinggi baris Header

        // Aplikasikan styling ke header
        headerRow.eachCell(cell => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD54A' } // Warna #FFD54A
            };
            cell.font = { 
                bold: true,
                name: 'Arial', // 🌟 Terapkan Arial
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
            const nettoValue = d.jumlah_netto; // Sudah dibulatkan
            totalNetto += nettoValue;

            const dataRow = worksheet.addRow({
                NOMOR: rowNumber,
                NAMA: d.nama_pegawai,
                BANK: d.bank_name,
                NOMOR_REKENING: d.nomor_rekening,
                JUMLAH_NETTO: nettoValue,
            });
            
            // 🌟 Terapkan Arial dan Size 10 pada baris data
            dataRow.font = { name: 'Arial', size: 10 };
            
            // 🌟 PERUBAHAN UTAMA: Set tinggi baris data menjadi 13
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
            "", // Kolom B dikosongkan
            "", // Kolom C dikosongkan
            "TOTAL", // Di kolom D
            totalNetto, // Di kolom E
        ]);
        
        totalRow.height = 16; // 🌟 Set tinggi baris Total
        
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
                fgColor: { argb: 'FFD54A' } // Warna #FFD54A
            };
            cell.font = { 
                bold: true,
                name: 'Arial', // 🌟 Terapkan Arial
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = { 
                top: {style:'thin'}, left: {style:'thin'}, 
                bottom: {style:'thin'}, right: {style:'thin'}
            };
        });
        
        // PERBAIKAN ALIGNMENT: 
        // Kolom A (setelah merge A:C) harus align KIRI
        totalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
        // Kolom D ("TOTAL") harus align KANAN
        totalRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
        // Kolom E (Total Netto) harus align KANAN
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