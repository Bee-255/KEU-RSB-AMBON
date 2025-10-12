// src/app/(main)/pembayaran/utils/exportPaymentExcelBtn.ts
import ExcelJS from 'exceljs';
import { supabase } from '@/utils/supabaseClient';

// Import interface dari file utama
import { PaymentType, PaymentDetailType } from '../page';
// Import utility functions untuk sorting
import { sortPegawai } from './sortingUtils';

// Interface untuk data pegawai dari database
interface PegawaiData {
  nrp_nip_nir: string;
  pekerjaan?: string;
  pangkat?: string;
  golongan?: string;
  status: string;
  nama?: string;
  // tambahkan properti lain yang diperlukan dari tabel pegawai
}

// Interface untuk data yang sudah diagregasi
interface AggregatedPaymentDetail {
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
const fetchDataPegawaiForSorting = async (details: PaymentDetailType[]): Promise<Map<string, PegawaiData>> => {
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

        const pegawaiMap = new Map<string, PegawaiData>();
        data?.forEach(p => pegawaiMap.set(p.nrp_nip_nir, p));
        return pegawaiMap;
    } catch (error) {
        console.error('Error in fetchDataPegawaiForSorting:', error);
        return new Map();
    }
};

/**
 * Fungsi untuk mengagregasi data detail pembayaran.
 * Menggabungkan jumlah_netto berdasarkan 'nomor_rekening' dan 'nama_rekening'.
 */
const aggregatePaymentDetails = async (details: PaymentDetailType[]): Promise<AggregatedPaymentDetail[]> => {
    // AMBIL DATA PEGAWAI UNTUK SORTING
    const pegawaiMap = await fetchDataPegawaiForSorting(details);
    
    const aggregationMap = new Map<string, AggregatedPaymentDetail>();

    details.forEach(d => {
        const key = `${d.nomor_rekening.trim().toUpperCase()}|${d.nama_rekening.trim().toUpperCase()}`;
        const pegawaiData = pegawaiMap.get(d.nrp_nip_nir);
        
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
                nama: d.nama,
                pekerjaan: pegawaiData?.pekerjaan || d.pekerjaan || '', // PRIORITAS data pegawai
                pangkat: pegawaiData?.pangkat || '',                    // AMBIL dari tabel pegawai
                golongan: pegawaiData?.golongan || ''                   // AMBIL dari tabel pegawai
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
    
    // 🔥 UBAH: Tambahkan await karena sekarang functionnya async
    const aggregatedDetails = await aggregatePaymentDetails(filteredDetails);
    
    // MENGAMBIL KETERANGAN BARU DARI payment.periode
    const keteranganValue = getKeteranganText(payment.periode);

    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Lampiran Bank Tabungan Negara");
        const baseFilename = `${keteranganValue} - BTN`;

        const filename = `${baseFilename.replace(/\s/g, ' ')}.xlsx`;
        
        // 🌟 PENYESUAIAN FONT & VIEW: Sama seperti exportTandaTangan.ts
        worksheet.properties.defaultRowHeight = 15;
        worksheet.views = [{ 
            state: 'frozen', 
            ySplit: 3, // Bekukan baris header
            showGridLines: true 
        }];
        
        // --- 1. SET JUDUL ---
        worksheet.getCell('A1').value = 'DAFTAR LAMPIRAN BANK TABUNGAN NEGARA';
        worksheet.getCell('A1').font = { 
            bold: true, 
            size: 12,
            name: 'Arial',
        };
        worksheet.mergeCells('A1:G1');
        worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(1).height = 20;
        
        worksheet.addRow([]);

        // --- 2. TENTUKAN HEADER KOLOM BARU ---
        worksheet.columns = [
            { key: 'NOMOR_REKENING', width: 25 },
            { key: 'PLUS', width: 10 },
            { key: 'JUMLAH_NETTO', width: 20 },
            { key: 'CD', width: 5 },
            { key: 'NOMOR', width: 10 },
            { key: 'NAMA_REKENING', width: 50 },
            { key: 'KETERANGAN', width: 45 },
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

        // --- 3. TAMBAHKAN DATA DENGAN NOMOR (MENGGUNAKAN DATA AGREGRASI) ---
        let totalNetto = 0;

        // 🌟 FORMAT ACCOUNTING SAMA dengan exportTandaTangan.ts
        const accountingFormat = '_(* #,##0_);_(* (#,##0);_(* "-"_);_(@_)';

        // Menggunakan aggregatedDetails yang SUDAH TERURUT dengan benar
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
            
            // 🌟 ROW HEIGHT & FONT SAMA dengan exportTandaTangan.ts
            dataRow.height = 25;
            dataRow.font = { name: 'Arial', size: 11 };

            // 🌟 FORMAT NOMOR REKENING SEBAGAI TEXT (tambah ini)
            dataRow.getCell('NOMOR_REKENING').numFmt = '@'; // Format sebagai text
            dataRow.getCell('NOMOR_REKENING').alignment = { vertical: 'middle' };

            // 🌟 FORMAT ACCOUNTING SAMA dengan exportTandaTangan.ts
            dataRow.getCell('JUMLAH_NETTO').numFmt = accountingFormat;
            dataRow.getCell('JUMLAH_NETTO').alignment = { vertical: 'middle', horizontal: 'right' };
            
            // Alignment Center untuk kolom PLUS, CD dan NOMOR
            dataRow.getCell('PLUS').alignment = { vertical: 'middle', horizontal: 'center' };
            dataRow.getCell('CD').alignment = { vertical: 'middle', horizontal: 'center' };
            dataRow.getCell('NOMOR').alignment = { vertical: 'middle', horizontal: 'center' };
            
            // Alignment untuk kolom teks
            dataRow.getCell('NAMA_REKENING').alignment = { vertical: 'middle' };
            dataRow.getCell('KETERANGAN').alignment = { vertical: 'middle' };
            
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
        
        // 🌟 ROW HEIGHT SAMA dengan exportTandaTangan.ts
        totalRow.height = 25;

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

        // PERBAIKAN ALIGNMENT: 
        totalRow.getCell('A').alignment = { vertical: 'middle', horizontal: 'center' };
        totalRow.getCell('C').alignment = { vertical: 'middle', horizontal: 'right' };

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