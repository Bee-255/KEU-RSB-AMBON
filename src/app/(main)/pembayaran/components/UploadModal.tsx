// src/app/(main)/pembayaran/components/UploadModal.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/utils/supabaseClient"; 
import pageStyles from "@/styles/komponen.module.css";
import styles from "@/styles/button.module.css";
import * as ExcelJS from 'exceljs';

// Import hook notifikasi kustom
import { usekeuNotification } from "@/lib/usekeuNotification"; 
import { FiDownload } from "react-icons/fi";
// Import Icon yang diperlukan
import { FaUpload, FaXmark } from "react-icons/fa6"; 
// Ganti FaHourglass dengan FaUpload, FaHourglass sudah tidak digunakan
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
  const { showToast, showConfirm } = usekeuNotification(); 
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // --- STATE UNTUK ANIMASI LOADING DOTS ---
  const [loadingDots, setLoadingDots] = useState("");

  // --- LOGIKA ANIMASI LOADING DOTS ---
  useEffect(() => {
      let interval: NodeJS.Timeout | undefined;
      if (isUploading) {
          interval = setInterval(() => {
              setLoadingDots(prev => {
                  if (prev === "...") return "";
                  return prev + ".";
              });
          }, 300); 
      } else {
          setLoadingDots(""); 
      }
      return () => {
          if (interval) clearInterval(interval);
      };
  }, [isUploading]);
  // ----------------------------------------
  
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
        // Normalisasi untuk menangkap nilai periode pembayaran
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
                // Konversi tanggal/nilai Excel dengan aman
                const cellValue = cell.value;
                if (cellValue && typeof cellValue === 'object' && cellValue.hasOwnProperty('result')) {
                    rowData[header] = (cellValue as { result: unknown }).result;
                } else {
                    rowData[header] = cellValue;
                }
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
      
      // Ambil periode pembayaran dari baris pertama data yang valid
      const firstValidItem = processedData.find(item => item.periode_pembayaran_excel);
      const periodePembayaranFromExcel = firstValidItem?.periode_pembayaran_excel || null;
      
      if (!periodePembayaranFromExcel) {
          showToast("Kolom 'PERIODE_PEMBAYARAN' pada file Excel kosong. Upload dibatalkan.", "error");
          setIsUploading(false);
          return;
      }
      
      // --- PENGECEKAN DUPLIKASI DATA ---
      const { data: existingRekapan, error: checkError } = await supabase
          .from('rekapan_pembayaran')
          .select('id')
          .eq('periode', selectedPeriod)
          .eq('periode_pembayaran', periodePembayaranFromExcel);

      if (checkError) {
          throw new Error(checkError.message || "Gagal memeriksa data duplikat.");
      }

      if (existingRekapan && existingRekapan.length > 0) {
          showToast(
              `Data untuk Periode ${selectedPeriod} dengan uraian "${periodePembayaranFromExcel}" sudah pernah di-upload sebelumnya. Upload dibatalkan.`, 
              "warning",
              6000 // Tampilkan lebih lama
          );
          setIsUploading(false);
          return;
      }
      // ------------------------------------

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
      // --- PERBAIKAN TS2552: TAMBAHKAN DEKLARASI INI ---
      const failedPeriodePembayaranIndices = new Set<string>();
      // ----------------------------------------------------
      
      const totalDataInFile = processedData.length;
      let totalBruto = 0;
      let totalPotongan = 0;
      let totalPph21 = 0;
      // Gunakan nilai yang sudah dipastikan dari pengecekan duplikasi
      const periodePembayaranFinal = periodePembayaranFromExcel; 

      processedData.forEach((item) => {
        
        let isValid = true;
        let errorReason = "";
        
        // VALIDASI 1: Cek Kesesuaian Periode
        if (item.periode_excel !== selectedPeriod) {
            errorReason = `Periode Excel (${item.periode_excel}) tidak cocok dengan periode yang dipilih (${selectedPeriod}).`;
            failedPeriodIndices.add(item.nrp_nip_nir);
            isValid = false; 
        }

        // VALIDASI 2: Cek PERIODE_PEMBAYARAN (KONSISTENSI dengan nilai pertama)
        // Cek hanya jika VALIDASI 1 LULUS
        if (isValid && item.periode_pembayaran_excel !== periodePembayaranFinal) {
            errorReason = `PERIODE PEMBAYARAN tidak konsisten. Ditemukan "${item.periode_pembayaran_excel}" sedangkan yang disetujui adalah "${periodePembayaranFinal}".`;
            failedPeriodePembayaranIndices.add(item.nrp_nip_nir); // Tambahkan ke set
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
        
        // VALIDASI 4: Cek Data Bank Pegawai
        if (pegawai && (!pegawai.bank || !pegawai.no_rekening)) {
            if (isValid) {
                errorReason = `Data bank dan nomor rekening untuk NRP/NIP/NIR (${item.nrp_nip_nir}) belum lengkap di database Pegawai.`;
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

        if (isValid && pegawai && pegawai.bank && pegawai.no_rekening) {
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
      // --- PERBAIKAN TS2552: TAMBAHKAN PERHITUNGAN INI ---
      const uniqueFailedPeriodePembayaranCount = failedPeriodePembayaranIndices.size;
      // ----------------------------------------------------

      // 4. KEPUTUSAN TRANSAKSI (ALL-OR-NOTHING)
      if (failedCount > 0) {
        
        const downloadLink = await createFailedReportLink(failedRecords); 
        
        // --- MODIFIKASI PESAN KEGAGALAN DIMULAI DI SINI (Format Baru) ---
        
        const failedHeadline = `${failedCount} total data bermasalah.`;

        const detailPoints: React.ReactNode[] = [];
        
        if (uniqueFailedPeriodCount > 0) {
            detailPoints.push(
                <p key="period" style={{ margin: '0 0 4px 0' }}>
                    — {uniqueFailedPeriodCount} data memiliki Periode tidak cocok.
                </p>
            );
        }
        if (uniqueFailedNrpNipNirCount > 0) {
            detailPoints.push(
                <p key="nrp" style={{ margin: '0 0 4px 0' }}>
                   — {uniqueFailedNrpNipNirCount} data memiliki NRP/NIP/NIR yang tidak valid/ditemukan.
                </p>
            );
        }
        // Gunakan variabel yang sudah diperbaiki
        if (uniqueFailedPeriodePembayaranCount > 0) { 
            detailPoints.push(
                <p key="pembayaran" style={{ margin: '0 0 4px 0' }}>
                    — {uniqueFailedPeriodePembayaranCount} data memiliki PERIODE PEMBAYARAN tidak konsisten.
                </p>
            );
        }
        
        const messageContent = (
            <div style={{ textAlign: 'left', fontSize: '14px' }}>
                <p style={{ marginBottom: '1rem', fontWeight: 'bold' }}>{failedHeadline}</p>
                
                <div style={{ paddingLeft: '10px' }}>
                    {detailPoints}
                </div>

                {downloadLink && (
                    <p style={{ marginTop: '1rem', marginBottom: '0' }}>Klik tombol &apos;Unduh Laporan&apos; untuk melihat detail kesalahan.</p>
                )}
            </div>
        );
        // --- MODIFIKASI PESAN KEGAGALAN SELESAI DI SINI ---
        
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
  
  // --- RENDER KOMPONEN ---
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
                <FiDownload/> Download Template
              </button>
              
            </div>
          </div>

          <div className={pageStyles.formActions}>
            {/* Tombol Batal: Menggunakan Flexbox untuk perataan ikon */}
            <button 
              type="button" 
              onClick={onClose} 
              className={pageStyles.formCancel}
              disabled={isUploading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <FaXmark/> Batal
            </button>
            
            {/* Tombol Upload: Menggunakan Flexbox, Ikon dan Teks Dinamis + Animasi Titik */}
            <button 
              onClick={handleUpload} 
              disabled={!selectedPeriod || !selectedFile || isUploading}
              className={styles.rekamButton}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
              {isUploading ? (
                  <>
                      <FaUpload className={pageStyles.loadingIcon} /> 
                      Mengupload<span className={pageStyles.loadingDotsContainer}>{loadingDots}</span>
                  </>
              ) : (
                  <>
                      <FaUpload /> Upload
                  </>
              )}
            </button>
          </div>
        </>
      </div>
    </div>
  );
};

export default UploadModal;