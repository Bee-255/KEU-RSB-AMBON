// src/app/(main)/pembayaran/components/UploadModal.tsx
"use client";

import React, { useState } from "react";
import { supabase } from "@/utils/supabaseClient"; 
import Swal from "sweetalert2";
import pageStyles from "@/styles/komponen.module.css";
import styles from "@/styles/button.module.css";
import * as ExcelJS from 'exceljs';

interface UploadModalProps {
  onClose: () => void;
  onSuccess: (totalCount: number, failedCount: number) => void;
}

interface PegawaiData {
  nrp_nip_nir: string;
  jumlah_bruto: number;
  potongan: number;
}

interface PegawaiFromDB {
  nrp_nip_nir: string;
  nama: string;
  pekerjaan: string;
  golongan: string | null;
  bank: string | null;
  no_rekening: string | null; 
  nama_rekening: string | null;
}

interface PaymentDetailData {
  pembayaran_id: string; // Akan diisi saat insert
  nrp_nip_nir: string;
  nama: string;
  pekerjaan: string;
  jumlah_bruto: number;
  potongan: number;
  pph21_persen: number;
  jumlah_pph21: number;
  jumlah_netto: number;
  bank: string;
  nomor_rekening: string;
  nama_rekening: string;
}

const UploadModal: React.FC<UploadModalProps> = ({ onClose, onSuccess }) => {
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number } | null>(null);

  // Generate pilihan periode (dari bulan ini hingga 2 tahun ke depan)
  const periodOptions: string[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const startMonth = now.getMonth() + 1;

  for (let y = currentYear; y <= currentYear + 2; y++) {
    for (let m = 1; m <= 12; m++) {
      if (y === currentYear && m < startMonth) continue;
      const period = `${y}-${m.toString().padStart(2, '0')}`;
      periodOptions.push(period);
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && 
          file.type !== 'application/vnd.ms-excel') {
        Swal.fire("Error", "Harap unggah file Excel (.xlsx, .xls)", "error");
        return;
      }
      setSelectedFile(file);
    }
  };

  const calculatePph21Persen = (pegawai: PegawaiFromDB): number => {
    if (pegawai.golongan && (pegawai.golongan.startsWith('III') || pegawai.golongan.startsWith('IV'))) {
      return 0.025;
    }
    
    if (pegawai.pekerjaan && pegawai.pekerjaan.toLowerCase().includes('dokter mitra')) {
      return 0.025;
    }
    
    return 0;
  };

  const processExcelData = (data: unknown[]): PegawaiData[] => {
    return data
      .filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null)
      .map(row => ({
        nrp_nip_nir: String(row.nrp_nip_nir || "").trim(),
        jumlah_bruto: Number(row.jumlah_bruto) || 0,
        potongan: Number(row.potongan) || 0,
      }))
      .filter(item => item.nrp_nip_nir && item.jumlah_bruto > 0);
  };

  const readExcelFile = async (file: File): Promise<unknown[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);
          
          const worksheet = workbook.worksheets[0];
          const jsonData: unknown[] = [];
          
          const headerRow = worksheet.getRow(1);
          const headers: string[] = [];
          headerRow.eachCell((cell, colNumber) => {
            headers[colNumber - 1] = String(cell.text || '').toLowerCase().trim();
          });
          
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            
            const rowData: Record<string, unknown> = {};
            row.eachCell((cell, colNumber) => {
              const header = headers[colNumber - 1];
              if (header) {
                rowData[header] = cell.value;
              }
            });
            
            if (Object.keys(rowData).length > 0) {
              jsonData.push(rowData);
            }
          });
          
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
  };

  const downloadTemplate = () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template Pembayaran');
    
    worksheet.addRow(['No',"NRP_NIP_NIR",'Jumlah_Bruto', 'Potongan']);
    
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };
    
    worksheet.getColumn(1).width = 5;
    worksheet.getColumn(2).width = 20;
    worksheet.getColumn(3).width = 15;
    worksheet.getColumn(4).width = 15;
    
    worksheet.addRow(['1','1234567890','5000000', '200000']);
    worksheet.addRow(['2','0987654321','6000000', '250000']);
    
    
    workbook.xlsx.writeBuffer().then((buffer) => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template-pembayaran.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  };

  /**
   * FUNGSI UTAMA UPLOAD DATA
   * Diubah untuk mengakomodasi skenario SATU TABEL (pembayaran)
   */
  const handleUpload = async (): Promise<void> => {
    if (!selectedPeriod || !selectedFile) {
      Swal.fire("Peringatan", "Harap pilih periode dan unggah file Excel", "warning");
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      // 1. Baca dan Proses Data Excel
      const jsonData = await readExcelFile(selectedFile);
      const processedData = processExcelData(jsonData);
      
      if (processedData.length === 0) {
        Swal.fire("Error", "Tidak ada data valid yang ditemukan dalam file", "error");
        setIsUploading(false);
        return;
      }

      // 2. Ambil data Pegawai
      const { data: pegawaiList, error: pegawaiError } = await supabase
        .from("pegawai")
        .select("nrp_nip_nir, nama, pekerjaan, golongan, bank, no_rekening, nama_rekening")
        .in("nrp_nip_nir", processedData.map(item => item.nrp_nip_nir));

      if (pegawaiError) {
          throw new Error(pegawaiError.message || "Gagal mengambil data pegawai dari database. Cek RLS.");
      }

      const pegawaiMap = new Map<string, PegawaiFromDB>();
      pegawaiList?.forEach(p => {
        pegawaiMap.set(p.nrp_nip_nir, p);
      });

      // 3. Siapkan Data Detail
      const detailData: PaymentDetailData[] = [];
      let totalBruto = 0;
      let totalPotongan = 0;
      let totalPph21 = 0;
      
      const totalDataInFile = processedData.length;

      processedData.forEach(item => {
        const pegawai = pegawaiMap.get(item.nrp_nip_nir);
        
        if (!pegawai) {
          console.warn(`Data pegawai tidak ditemukan untuk NRP: ${item.nrp_nip_nir}`);
          return;
        }

        const pph21Persen = calculatePph21Persen(pegawai);
        const jumlahPph21 = item.jumlah_bruto * pph21Persen;
        const jumlahNetto = item.jumlah_bruto - item.potongan - jumlahPph21;

        totalBruto += item.jumlah_bruto;
        totalPotongan += item.potongan;
        totalPph21 += jumlahPph21;

        // Data yang akan dimasukkan ke tabel 'pembayaran' sebagai BARIS DETAIL
        detailData.push({
          pembayaran_id: '', // Placeholder, akan diisi setelah baris rekap di-insert
          nrp_nip_nir: item.nrp_nip_nir,
          nama: pegawai.nama,
          pekerjaan: pegawai.pekerjaan || '',
          jumlah_bruto: item.jumlah_bruto,
          potongan: item.potongan,
          pph21_persen: pph21Persen,
          jumlah_pph21: jumlahPph21,
          jumlah_netto: jumlahNetto,
          bank: pegawai.bank || '',
          nomor_rekening: pegawai.no_rekening || '',
          nama_rekening: pegawai.nama_rekening || '',
        });
      });
      
      const successCount = detailData.length;
      const failedCount = totalDataInFile - successCount;

      if (successCount === 0) {
        Swal.fire("Error", "Tidak ada data yang berhasil diproses. Periksa NRP/NIP/NIR di file Excel.", "error");
        setIsUploading(false);
        return;
      }

      const totalNetto = totalBruto - totalPotongan - totalPph21;

      // 4. Insert ke tabel pembayaran (BARIS REKAPITULASI)
      const paymentData = {
        periode: selectedPeriod,
        periode_pembayaran: `JASA BPJS ${selectedPeriod.split('-')[1]} ${selectedPeriod.split('-')[0]}`,
        jumlah_pegawai: successCount,
        jumlah_bruto: totalBruto,
        jumlah_pph21: totalPph21,
        jumlah_netto: totalNetto,
        status: "BARU" as const,
        // Kolom detail per pegawai (nrp_nip_nir, nama, dll.) DIBIARKAN KOSONG/NULL
      };

      const { data: payment, error: paymentError } = await supabase
        .from("pembayaran")
        .insert([paymentData])
        .select('id') // Ambil ID baris rekapitulasi yang baru dibuat
        .single();

      if (paymentError) {
          console.error("Supabase Error (Insert Baris Rekap):", paymentError);
          throw new Error(paymentError.message || "Gagal insert data rekap pembayaran. Pastikan RLS diizinkan dan kolom rekap diizinkan NULL."); 
      }
      
      const paymentId = payment.id; 

      // 5. Insert Detail Pembayaran (BARIS DETAIL PER PEGAWAI)
      // Gunakan ID dari baris rekapitulasi untuk kolom 'pembayaran_id'
      const finalDetailData = detailData.map(detail => ({
        ...detail,
        pembayaran_id: paymentId,
        // Kolom rekap (periode, jumlah_pegawai, total_bruto, dll.) DIBIARKAN KOSONG/NULL
      }));

      const { error: detailError } = await supabase
        .from("pembayaran")
        .insert(finalDetailData);

      if (detailError) {
          console.error("Supabase Error (Insert Baris Detail):", detailError);
          // Jika insert detail gagal, idealnya baris rekap juga harus dihapus,
          // tapi untuk kesederhanaan, kita hanya melempar error.
          throw new Error(detailError.message || "Gagal insert data detail pembayaran. Pastikan kolom detail diizinkan NULL."); 
      }

      // 6. Sukses
      setUploadResult({ success: successCount, failed: failedCount });
      
      onSuccess(totalDataInFile, failedCount); 

    } catch (error) {
      // 7. Error Handling yang Kuat
      
      console.error("Error processing file:", error);
      
      let errorMessage: string;
      if (error instanceof Error) {
          errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
          errorMessage = (error as { message: string }).message;
      } else {
          errorMessage = "Terjadi kesalahan yang tidak diketahui saat memproses file. Pastikan skema tabel sudah benar (izinkan NULL untuk kolom yang tidak diisi).";
      }

      Swal.fire("Error", `Gagal memproses file: ${errorMessage}`, "error");

    } finally {
      setIsUploading(false);
    }
  };
  
  // ... (Sisa komponen return, handleClose)

  return (
    <div className={pageStyles.modalOverlay} onClick={onClose}>
      <div className={pageStyles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Upload Data Pembayaran</h3>
        
        {!uploadResult ? (
          <>
            <div className={pageStyles.modalForm}>
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Periode Pembayaran (YYY-MM):</label>
                <select 
                  value={selectedPeriod} 
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className={pageStyles.formSelect}
                  required
                >
                  <option value="">-- Pilih Periode --</option>
                  {periodOptions.map(period => (
                    <option key={period} value={period}>{period}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={pageStyles.modalForm}>
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>File Excel:</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className={pageStyles.formInput}
                  required
                />
                <div style={{ marginTop: '8px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button 
                    type="button" 
                    onClick={downloadTemplate}
                    className={styles.downloadButton}
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    Download Template
                  </button>
                  <span style={{ fontSize: '12px', color: '#666' }}>
                      Kolom wajib: **NRP_NIP_NIR**, **Jumlah_Bruto**, **Potongan**
                  </span>
                </div>
              </div>
            </div>

            <div className={pageStyles.formActions}>
              <button 
                type="button" 
                onClick={onClose} 
                className={pageStyles.formCancel}
                disabled={isUploading}
              >
                Batal
              </button>
              <button 
                onClick={handleUpload} 
                disabled={!selectedPeriod || !selectedFile || isUploading}
                className={styles.rekamButton}
              >
                {isUploading ? "Mengupload..." : "Upload"}
              </button>
            </div>
          </>
        ) : (
          /* Tampilan Hasil Upload */
          <>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <h4 style={{ color: '#10B981' }}>Upload Selesai!</h4>
              <p>Total data yang ada di file: <strong>{uploadResult.success + uploadResult.failed}</strong></p>
              <p><strong>{uploadResult.success}</strong> data berhasil diunggah dengan status BARU.</p>
              {uploadResult.failed > 0 && (
                <p style={{ color: '#EF4444' }}>
                  <strong>{uploadResult.failed}</strong> data gagal diproses (NRP/NIP/NIR tidak ditemukan)
                </p>
              )}
            </div>
            <div className={pageStyles.formActions}>
              <button 
                onClick={() => onSuccess(uploadResult.success + uploadResult.failed, uploadResult.failed)}
                className={styles.rekamButton}
              >
                OK
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UploadModal;