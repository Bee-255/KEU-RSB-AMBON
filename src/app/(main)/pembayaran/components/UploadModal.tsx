// src/app/(main)/pembayaran/components/UploadModal.tsx
"use client";

import React, { useState } from "react";
import { supabase } from "@/utils/supabaseClient"; 
import pageStyles from "@/styles/komponen.module.css";
import styles from "@/styles/button.module.css";
import * as ExcelJS from 'exceljs';

// Import hook notifikasi kustom
import { useNotification } from "@/lib/useNotification"; 


// ... (Semua Interface tetap di sini)
interface UploadModalProps {
  onClose: () => void;
  onSuccess: (totalCount: number, failedCount: number) => void;
}

interface PegawaiData {
  nrp_nip_nir: string;
  jumlah_bruto: number;
  potongan: number;
  periode_excel: string; 
  nama_excel: string;
  periode_pembayaran_excel: string; 
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
  rekapan_id: string;
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

interface FailedRecord {
  'NRP/NIP/NIR': string; 
  'NAMA (Excel)': string; 
  'PERIODE (Excel)': string; 
  'PERIODE PEMBAYARAN (Excel)': string;
  'Alasan Kegagalan': string;
}
// ... (Akhir Interface)


const UploadModal: React.FC<UploadModalProps> = ({ onClose, onSuccess }) => {
  const { showToast, showConfirm } = useNotification(); 
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const periodOptions: string[] = [];
  const targetYear = 2025;
  for (let m = 1; m <= 12; m++) {
      const period = `${targetYear}-${m.toString().padStart(2, '0')}`;
      periodOptions.push(period);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && 
          file.type !== 'application/vnd.ms-excel') {
        showToast("Harap unggah file Excel (.xlsx, .xls)", "error");
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
        nrp_nip_nir: String(row.nrp_nip_nir || row.nrp_nip_nik || "").trim(),
        jumlah_bruto: Number(row.jumlah_bruto || row.jumlah || 0),
        potongan: Number(row.potongan) || 0,
        periode_excel: String(row.periode || row.PERIODE || "").trim(),
        nama_excel: String(row.nama || row.NAMA || "").trim(),
        periode_pembayaran_excel: String(row.periode_pembayaran || row.PERIODE_PEMBAYARAN || "").trim(),
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
    
    worksheet.addRow(['No','PERIODE','PERIODE_PEMBAYARAN','NRP_NIP_NIR','NAMA','Jumlah_Bruto', 'Potongan']);
    
    worksheet.getRow(1).font = { bold: true };
    
    worksheet.getColumn(1).width = 5;
    worksheet.getColumn(2).width = 15;
    worksheet.getColumn(3).width = 25; 
    worksheet.getColumn(4).width = 20;
    worksheet.getColumn(5).width = 30;
    worksheet.getColumn(6).width = 15;
    worksheet.getColumn(7).width = 15;
    
    worksheet.addRow([
      '1',
      '2025-01', 
      'JASA BPJS JANUARI 2025',
      '123456',
      'Nama Contoh',
      '5000000', 
      '200000'
    ]);
    
    workbook.xlsx.writeBuffer().then((buffer) => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template-pembayaran.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      showToast("Template berhasil diunduh!", "success");
    }).catch((error) => {
      console.error("Error downloading template:", error);
      showToast("Gagal mengunduh template", "error");
    });
  };

  const createFailedReportLink = async (reportData: FailedRecord[]): Promise<string> => {
    if (reportData.length === 0) return ""; 

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Kegagalan Upload');
    
    const headers = Object.keys(reportData[0] || []) as Array<keyof FailedRecord>;
    worksheet.addRow(headers);
    worksheet.getRow(1).font = { bold: true };
    
    reportData.forEach(item => {
        worksheet.addRow(headers.map(h => item[h]));
    });
    
    worksheet.getColumn(1).width = 20;
    worksheet.getColumn(2).width = 30;
    worksheet.getColumn(3).width = 15;
    worksheet.getColumn(4).width = 25; 
    worksheet.getColumn(5).width = 50;
    
    try {
        const buffer = await workbook.xlsx.writeBuffer(); 
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        return window.URL.createObjectURL(blob); 
    } catch (e) {
        console.error("Gagal membuat buffer Excel:", e);
        return "";
    }
  };

  const downloadFromBlobUrl = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan_kegagalan_upload_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showToast("Laporan kegagalan berhasil diunduh!", "success");
  };

  const handleUpload = async (): Promise<void> => {
    if (!selectedPeriod || !selectedFile) {
      showToast("Harap pilih periode dan unggah file Excel", "warning");
      return;
    }

    setIsUploading(true);

    try {
      const jsonData = await readExcelFile(selectedFile);
      const processedData = processExcelData(jsonData);
      
      if (processedData.length === 0) {
        showToast("Tidak ada data valid yang ditemukan dalam file. Upload dibatalkan.", "error");
        setIsUploading(false);
        return;
      }

      const nrpNipNirList = processedData.map(item => item.nrp_nip_nir);
      const { data: pegawaiList, error: pegawaiError } = await supabase
        .from("pegawai")
        .select("nrp_nip_nir, nama, pekerjaan, golongan, bank, no_rekening, nama_rekening")
        .in("nrp_nip_nir", nrpNipNirList);

      if (pegawaiError) {
          throw new Error(pegawaiError.message || "Gagal mengambil data pegawai dari database.");
      }

      const pegawaiMap = new Map<string, PegawaiFromDB>();
      pegawaiList?.forEach(p => {
        pegawaiMap.set(p.nrp_nip_nir, p);
      });

      // 3. Validasi Penuh (Dry Run)
      const detailData: Omit<PaymentDetailData, 'rekapan_id'>[] = [];
      const failedRecords: FailedRecord[] = []; 
      
      const failedPeriodIndices = new Set<string>();
      const failedNrpNipNirIndices = new Set<string>();
      const failedPeriodePembayaranIndices = new Set<string>();
      
      const totalDataInFile = processedData.length;
      let totalBruto = 0;
      let totalPotongan = 0;
      let totalPph21 = 0;
      let firstPeriodePembayaran: string | null = null;
      // Perbaikan #1: Variabel isPeriodePembayaranConsistent dihapus.
      // let isPeriodePembayaranConsistent = true; // Dihapus karena tidak digunakan di luar loop

      processedData.forEach((item) => {
        
        let isValid = true;
        let errorReason = "";
        
        // VALIDASI 1: Cek Kesesuaian Periode
        if (item.periode_excel !== selectedPeriod) {
            errorReason = `Periode Excel (${item.periode_excel}) tidak cocok dengan periode yang dipilih (${selectedPeriod}).`;
            failedPeriodIndices.add(item.nrp_nip_nir);
            isValid = false; 
        }

        // VALIDASI 2: Cek PERIODE_PEMBAYARAN (KONSISTENSI)
        if (isValid && item.periode_pembayaran_excel) {
          if (firstPeriodePembayaran === null) {
            firstPeriodePembayaran = item.periode_pembayaran_excel;
          } else if (item.periode_pembayaran_excel !== firstPeriodePembayaran) {
            errorReason = `PERIODE PEMBAYARAN tidak konsisten. Ditemukan "${item.periode_pembayaran_excel}" sedangkan sebelumnya "${firstPeriodePembayaran}".`;
            failedPeriodePembayaranIndices.add(item.nrp_nip_nir);
            isValid = false;
            // isPeriodePembayaranConsistent = false; // Dihapus karena variabel dihapus
          }
        } else if (isValid && !item.periode_pembayaran_excel) {
          errorReason = `Kolom PERIODE PEMBAYARAN tidak boleh kosong.`;
          failedPeriodePembayaranIndices.add(item.nrp_nip_nir);
          isValid = false;
        }

        const pegawai = pegawaiMap.get(item.nrp_nip_nir);
        
        // VALIDASI 3: Cek Ketersediaan Pegawai
        if (!pegawai) {
          if (isValid) {
            errorReason = `NRP/NIP/NIR (${item.nrp_nip_nir}) tidak ditemukan di database Pegawai.`;
            failedNrpNipNirIndices.add(item.nrp_nip_nir);
            isValid = false;
          }
        }

        // Tambahkan ke failed records jika ada error
        if (!isValid && errorReason) {
          failedRecords.push({
            'NRP/NIP/NIR': item.nrp_nip_nir,
            'NAMA (Excel)': item.nama_excel,
            'PERIODE (Excel)': item.periode_excel,
            'PERIODE PEMBAYARAN (Excel)': item.periode_pembayaran_excel,
            'Alasan Kegagalan': errorReason
          });
        }

        if (isValid && pegawai) {
            const pph21Persen = calculatePph21Persen(pegawai);
            const jumlahPph21 = item.jumlah_bruto * pph21Persen;
            const jumlahNetto = item.jumlah_bruto - item.potongan - jumlahPph21;

            totalBruto += item.jumlah_bruto;
            totalPotongan += item.potongan;
            totalPph21 += jumlahPph21;

            detailData.push({
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
        }
      });
      
      const failedCount = failedRecords.length;
      const uniqueFailedPeriodCount = failedPeriodIndices.size;
      const uniqueFailedNrpNipNirCount = failedNrpNipNirIndices.size;
      const uniqueFailedPeriodePembayaranCount = failedPeriodePembayaranIndices.size;

      // 4. KEPUTUSAN TRANSAKSI (ALL-OR-NOTHING)
      if (failedCount > 0) {
        
        const downloadLink = await createFailedReportLink(failedRecords); 
        
        let failedMessage = `Upload Dibatalkan. ${failedCount} data bermasalah:`;
        if (uniqueFailedPeriodCount > 0) {
            failedMessage += ` ${uniqueFailedPeriodCount} periode tidak cocok.`;
        }
        if (uniqueFailedNrpNipNirCount > 0) {
            failedMessage += ` ${uniqueFailedNrpNipNirCount} NRP/NIP/NIR tidak valid.`;
        }
        if (uniqueFailedPeriodePembayaranCount > 0) {
            failedMessage += ` ${uniqueFailedPeriodePembayaranCount} PERIODE PEMBAYARAN tidak konsisten/kosong.`;
        }
        
        const messageContent = (
            <div style={{ textAlign: 'left', fontSize: '15px' }}>
                <p style={{ marginBottom: '15px', color: '#B91C1C', fontWeight: 'bold' }}>{failedMessage}</p>
                {downloadLink && (
                    <p style={{ marginBottom: '0' }}>Klik tombol &apos;Unduh Laporan&apos; untuk melihat detail kesalahan.</p>
                )}
            </div>
        );

        const isConfirmed = await showConfirm({
            title: 'Upload Dibatalkan',
            message: messageContent,
            confirmText: downloadLink ? 'Unduh Laporan' : 'OK',
            cancelText: 'Tutup',
        });
        
        if (isConfirmed && downloadLink) {
          downloadFromBlobUrl(downloadLink);
        }
        
        setIsUploading(false);
        return; 
      }
      
      // 5. KOMITMEN DATA (INSERT REKAPAN dan DETAIL)
      const totalNetto = totalBruto - totalPotongan - totalPph21;
      const finalSuccessCount = detailData.length;
      const periodePembayaranFinal = firstPeriodePembayaran || `JASA BPJS ${selectedPeriod.split('-')[1]} ${selectedPeriod.split('-')[0]}`;

      const rekapanPayload = {
        periode: selectedPeriod,
        periode_pembayaran: periodePembayaranFinal, 
        jumlah_pegawai: finalSuccessCount,
        jumlah_bruto: totalBruto,
        jumlah_pph21: totalPph21,
        jumlah_netto: totalNetto,
        status: "BARU" as const,
      };

      const { data: rekapan, error: rekapanError } = await supabase
        .from("rekapan_pembayaran")
        .insert([rekapanPayload])
        .select('id')
        .single();

      if (rekapanError) {
          throw new Error(rekapanError.message || "Gagal insert data rekap pembayaran."); 
      }
      
      const rekapanId = rekapan.id;

      const finalDetailData: PaymentDetailData[] = detailData.map(detail => ({
        ...detail,
        rekapan_id: rekapanId,
      }));

      const { error: detailError } = await supabase
        .from("detail_pembayaran")
        .insert(finalDetailData);

      if (detailError) {
          await supabase.from('rekapan_pembayaran').delete().eq('id', rekapanId);
          throw new Error(detailError.message || "Gagal insert data detail pembayaran."); 
      }

      // 6. Sukses Penuh
      onSuccess(totalDataInFile, 0); 
      
      showToast(`${finalSuccessCount} data berhasil diunggah!`, "success");
      
      onClose(); 

    } catch (error) {
      // 7. Error Handling (Error sistem)
      console.error("Error processing file:", error);
      
      let errorMessage: string;
      if (error instanceof Error) {
          errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
          errorMessage = (error as { message: string }).message;
      } else {
          errorMessage = "Terjadi kesalahan yang tidak diketahui saat memproses file.";
      }

      showToast(`Gagal memproses file: ${errorMessage}`, "error", 6000);

    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className={pageStyles.modalOverlay} onClick={onClose}>
      <div className={pageStyles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Upload Data Pembayaran</h3>
        
        {/* Tampilan Form Upload */}
        <>
          <div className={pageStyles.modalForm} style={{display: ''}}>
            <div className={pageStyles.formGroup}>
              <label className={pageStyles.formLabel}>Periode Pembayaran (YYYY-MM):</label>
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
          
            <div className={pageStyles.formGroup}>
              <label className={pageStyles.formLabel}>File Excel:</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className={pageStyles.formInput}
                required
              />
            </div>
            <div className={pageStyles.detailItemFullSPPR}>
              <button 
                type="button" 
                onClick={downloadTemplate}
                className={styles.downloadButton}
                style={{ padding: '6px 12px', fontSize: '12px', marginRight: '1rem' }}
              >
                Download Template
              </button>
              {/* Perbaikan #2: Mengganti tanda kutip tunggal di JSX menjadi HTML entity &apos; */}
              <span style={{ fontSize: '12px', color: '#666' }}>
                  Kolom wajib: <strong>PERIODE, PERIODE_PEMBAYARAN, NRP_NIP_NIR, NAMA, Jumlah_Bruto</strong>
              </span>
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
      </div>
    </div>
  );
};

export default UploadModal;