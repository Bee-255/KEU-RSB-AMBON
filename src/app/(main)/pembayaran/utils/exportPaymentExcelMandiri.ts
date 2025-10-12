// src/app/(main)/pembayaran/utils/exportPaymentExcelMandiri.ts
import ExcelJS from 'exceljs';
import { supabase } from '@/utils/supabaseClient';

// Import interface dari file utama
import { PaymentType, PaymentDetailType } from '../page';
// Import utility functions untuk sorting
import { sortPegawai } from './sortingUtils';

// Interface untuk data yang sudah diagregasi
interface AggregatedPaymentDetail {
    nama_pegawai: string;
    bank_name: string;
    nomor_rekening: string;
    nama_rekening: string;
    jumlah_netto: number;
    nama: string;
    pekerjaan: string;
    pangkat: string;
    golongan: string;
}

/**
 * Fungsi untuk mengambil data pegawai dari Supabase untuk sorting
 */
const fetchDataPegawaiForSorting = async (details: PaymentDetailType[]): Promise<Map<string, any>> => {
    try {
        const nrpNipNirList = details.map(d => d.nrp_nip_nir).filter(Boolean);
        
        if (nrpNipNirList.length === 0) {
            return new Map();
        }

        const { data, error } = await supabase
            .from('pegawai')
            .select('*')
            .in('nrp_nip_nir', nrpNipNirList)
            .eq('status', 'Aktif');

        if (error) {
            console.error('Error fetching pegawai data:', error);
            return new Map();
        }

        const pegawaiMap = new Map();
        data?.forEach(p => pegawaiMap.set(p.nrp_nip_nir, p));
        return pegawaiMap;
    } catch (error) {
        console.error('Error in fetchDataPegawaiForSorting:', error);
        return new Map();
    }
};

/**
 * Fungsi untuk mengagregasi data detail pembayaran (Gabungkan Netto berdasarkan Rekening).
 */
const aggregatePaymentDetails = async (details: PaymentDetailType[]): Promise<AggregatedPaymentDetail[]> => {
    // AMBIL DATA PEGAWAI UNTUK SORTING
    const pegawaiMap = await fetchDataPegawaiForSorting(details);
    
    const aggregationMap = new Map<string, AggregatedPaymentDetail>();

    details.forEach(d => {
        // Kunci agregasi: Nomor Rekening + Nama Pemilik Rekening
        const key = `${d.nomor_rekening.trim().toUpperCase()}|${d.nama_rekening.trim().toUpperCase()}`;
        const pegawaiData = pegawaiMap.get(d.nrp_nip_nir);
        
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
                nama: d.nama,
                pekerjaan: pegawaiData?.pekerjaan || d.pekerjaan || '',
                pangkat: pegawaiData?.pangkat || '',
                golongan: pegawaiData?.golongan || ''
            });
        }
    });

    const aggregatedData = Array.from(aggregationMap.values());
    
    // URUTKAN DATA berdasarkan business rules
    return aggregatedData.sort(sortPegawai);
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

// --- Helper Function untuk Cell Reference ---
const getCellRef = (row: number, col: number): string => {
    let column = '';
    while (col > 0) {
        const remainder = (col - 1) % 26;
        column = String.fromCharCode(65 + remainder) + column;
        col = Math.floor((col - 1) / 26);
    }
    return `${column}${row}`;
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
    
    // 🔥 UBAH: Tambahkan await karena sekarang functionnya async
    const aggregatedDetails = await aggregatePaymentDetails(filteredDetails);
    
    // MENGAMBIL KETERANGAN BARU DARI payment.periode
    const keteranganValue = getKeteranganText(payment.periode);

    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Lampiran Bank MANDIRI");
        const filename = `${keteranganValue.replace(/\s/g, ' ')} - BANK MANDIRI.xlsx`;
        
        // 🌟 PENYESUAIAN FONT & VIEW: Sama seperti exportTandaTangan.ts
        worksheet.properties.defaultRowHeight = 15;
        worksheet.views = [{ 
            state: 'frozen', 
            ySplit: 3,
            showGridLines: true 
        }];
        
        // --- 1. SET JUDUL ---
        worksheet.getCell('A1').value = 'DAFTAR LAMPIRAN BANK MANDIRI';
        worksheet.getCell('A1').font = { 
            bold: true, 
            size: 12,
            name: 'Arial',
        };
        // 🌟 UBAH: Merge cells untuk 6 kolom (A sampai F)
        worksheet.mergeCells('A1:F1');
        worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(1).height = 20;
        
        worksheet.addRow([]);

        // --- 2. TENTUKAN HEADER KOLOM BARU ---
        // 🌟 UBAH: Tambah kolom KETERANGAN
        worksheet.columns = [
            { key: 'NOMOR', width: 8 },
            { key: 'NAMA', width: 40 },
            { key: 'BANK', width: 10 },
            { key: 'NOMOR_REKENING', width: 20 },
            { key: 'JUMLAH_NETTO', width: 15 },
            { key: 'KETERANGAN', width: 45 }, // 🌟 KOLOM BARU
        ];

        const headerRow = worksheet.addRow([
            "NOMOR",
            "NAMA",
            "BANK",
            "NOMOR REKENING",
            "JUMLAH NETTO",
            "KETERANGAN", // 🌟 HEADER BARU
        ]);

        // 🌟 ROW HEIGHT SAMA DENGAN exportTandaTangan.ts
        headerRow.height = 30;

        // Aplikasikan styling ke header - SAMA PERSIS dengan exportTandaTangan.ts
        headerRow.eachCell(cell => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD54A' }
            };
            cell.font = { 
                bold: true,
                name: 'Arial',
                size: 11
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = { 
                top: {style:'thin'}, left: {style:'thin'}, 
                bottom: {style:'thin'}, right: {style:'thin'}
            };
        });

        // --- 3. TAMBAHKAN DATA AGREGRASI ---
        let totalNetto = 0;
        
        // 🌟 FORMAT ACCOUNTING SAMA dengan exportTandaTangan.ts
        const accountingFormat = '_(* #,##0_);_(* (#,##0);_(* "-"_);_(@_)';
        
        // Menggunakan aggregatedDetails yang SUDAH TERURUT dengan benar
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
                KETERANGAN: keteranganValue, // 🌟 ISI KETERANGAN
            });
            
            // 🌟 ROW HEIGHT & FONT SAMA dengan exportTandaTangan.ts
            dataRow.height = 25;
            dataRow.font = { name: 'Arial', size: 11 };

            // 🌟 FORMAT NOMOR REKENING SEBAGAI TEXT
            dataRow.getCell('NOMOR_REKENING').numFmt = '@'; // Format sebagai text
            dataRow.getCell('NOMOR_REKENING').alignment = { vertical: 'middle' };

            // 🌟 FORMAT ACCOUNTING SAMA dengan exportTandaTangan.ts
            dataRow.getCell('JUMLAH_NETTO').numFmt = accountingFormat;
            dataRow.getCell('JUMLAH_NETTO').alignment = { vertical: 'middle', horizontal: 'right' };
            
            // Alignment Center untuk kolom NOMOR dan BANK
            dataRow.getCell('NOMOR').alignment = { vertical: 'middle', horizontal: 'center' };
            dataRow.getCell('BANK').alignment = { vertical: 'middle', horizontal: 'center' };
            
            // Alignment untuk kolom teks
            dataRow.getCell('NAMA').alignment = { vertical: 'middle' };
            dataRow.getCell('KETERANGAN').alignment = { vertical: 'middle' }; // 🌟 ALIGNMENT KETERANGAN
            
            // 🌟 BORDER SAMA dengan exportTandaTangan.ts
            dataRow.eachCell(cell => {
                cell.border = { 
                    top: {style:'thin'}, left: {style:'thin'}, 
                    bottom: {style:'thin'}, right: {style:'thin'}
                };
            });
        });
        
        // --- 4. TAMBAHKAN BARIS TOTAL ---
        const totalRow = worksheet.addRow([
            "TOTAL", // 🌟 "TOTAL" di kolom A (NOMOR)
            "",      // 🌟 Kolom B (NAMA) kosong karena akan di-merge
            "",
            "",
            totalNetto,
            "", // 🌟 KOLOM KETERANGAN KOSONG
        ]);
        
        // 🌟 ROW HEIGHT SAMA dengan exportTandaTangan.ts
        totalRow.height = 25;
        
        // 🌟 UBAH: Hanya merge kolom A dan B saja (NOMOR dan NAMA)
        const lastRowIndex = worksheet.lastRow!.number;
        worksheet.mergeCells(`A${lastRowIndex}:B${lastRowIndex}`); 

        // 🌟 FORMAT ACCOUNTING SAMA dengan exportTandaTangan.ts
        totalRow.getCell('JUMLAH_NETTO').numFmt = accountingFormat;
        totalRow.getCell('JUMLAH_NETTO').alignment = { vertical: 'middle', horizontal: 'right' };
        
        // 🌟 STYLING BARIS TOTAL SAMA dengan exportTandaTangan.ts
        totalRow.eachCell(cell => {
             cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD54A' }
            };
            cell.font = { 
                bold: true,
                name: 'Arial',
                size: 11
            };
            cell.border = { 
                top: {style:'thin'}, left: {style:'thin'}, 
                bottom: {style:'thin'}, right: {style:'thin'}
            };
        });

        // 🌟 PERBAIKAN ALIGNMENT: 
        totalRow.getCell('A').alignment = { vertical: 'middle', horizontal: 'center' }; // TOTAL (merged A-B)
        totalRow.getCell('JUMLAH_NETTO').alignment = { vertical: 'middle', horizontal: 'right' };

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