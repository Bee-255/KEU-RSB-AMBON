// src/app/(main)/pembayaran/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/utils/supabaseClient";
import { FaUpload, FaEdit, FaRegTrashAlt, FaCheck, FaTimes } from "react-icons/fa";
import { FiDownload } from "react-icons/fi";
import Paginasi from '@/components/paginasi';
import styles from "@/styles/button.module.css";
import pageStyles from "@/styles/komponen.module.css";
import UploadModal from "./components/UploadModal";
import PaymentTable from "./components/PaymentTable";
import PaymentDetailTable from "./components/PaymentDetailTable";

// Import keuNotification dari sistem notifikasi kustom Anda
import { keuNotification } from "@/lib/keuNotification";


// =======================================================
// Fungsi formatAngka 
const formatAngka = (angka: number | string | null | undefined): string => {
    if (typeof angka === 'string') {
      angka = parseFloat(angka);
    }
    if (typeof angka !== 'number' || isNaN(angka) || angka === null) {
      return '0';
    }
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2, 
    }).format(angka);
  };
// =======================================================


// Interface untuk data rekapitulasi pembayaran (baris utama)
interface PaymentType {
  id: string; 
  periode: string;
  periode_pembayaran: string;
  jumlah_pegawai: number;
  jumlah_bruto: number;
  jumlah_pph21: number;
  jumlah_netto: number;
  status: "BARU" | "DISETUJUI" | "DITOLAK";
  created_at: string;
}

// Interface untuk detail pembayaran (baris per pegawai)
interface PaymentDetailType {
  id: string; 
  rekapan_id: string; // Foreign Key yang mengacu ke PaymentType.id
  nrp_nip_nir: string;
  nama: string;
  pekerjaan: string;
  jumlah_bruto: number;
  pph21_persen: number;
  jumlah_pph21: number;
  jumlah_netto: number;
  nomor_rekening: string;
  bank: string;
  nama_rekening: string;
  potongan: number;
}

const Pembayaran = () => {
  // Panggil keuNotification
  const { showToast, showConfirm } = keuNotification();

  const [paymentList, setPaymentList] = useState<PaymentType[]>([]);
  const [paymentDetailList, setPaymentDetailList] = useState<PaymentDetailType[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentType | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<string[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isTableLoading, setIsTableLoading] = useState<boolean>(true);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [detailCurrentPage, setDetailCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [detailRowsPerPage, setDetailRowsPerPage] = useState(10);
  const [searchPeriod, setSearchPeriod] = useState("");
  const [showEditDetailModal, setShowEditDetailModal] = useState(false);
  const [detailToEdit, setDetailToEdit] = useState<PaymentDetailType | null>(null);

  // Fetch data rekapitulasi pembayaran (baris Rekap)
  const fetchPayments = useCallback(async () => {
    setIsTableLoading(true);
    try {
      let query = supabase
        .from("rekapan_pembayaran") // === Tabel Rekapan ===
        .select("*")
        .order("created_at", { ascending: false });
      
      if (searchPeriod) {
        query = query.ilike("periode", `%${searchPeriod}%`); 
      }

      const { data, error } = await query;
      
      if (error) {
        console.error("Gagal mengambil data rekap pembayaran:", error);
        showToast("Gagal mengambil data rekap pembayaran.", "error");
        setPaymentList([]);
        return;
      }
      setPaymentList(data as PaymentType[]);
    } catch (e) {
      console.error("Failed to fetch payment data:", e);
      setPaymentList([]);
      showToast("Terjadi kesalahan saat mengambil data pembayaran.", "error");
    } finally {
      setIsTableLoading(false);
    }
  }, [searchPeriod, showToast]);

  // Fetch detail pembayaran (baris Detail)
  const fetchPaymentDetails = useCallback(async (paymentId: string) => {
    setIsDetailLoading(true);
    console.log(`DEBUG: fetchPaymentDetails dipanggil untuk ID rekapan: ${paymentId}`); 
    try {
      const { data, error } = await supabase
        .from("detail_pembayaran") // === Tabel Detail ===
        .select("*") 
        .eq("rekapan_id", paymentId) // Menggunakan Foreign Key 'rekapan_id'
        .order("nama", { ascending: true });

      if (error) {
        console.error("Gagal mengambil detail pembayaran:", error);
        console.log("DEBUG: Supabase DETAIL Error:", error); 
        setPaymentDetailList([]);
        return;
      }
      
      console.log(`DEBUG: ${data.length} baris Detail DITEMUKAN.`);
      if (data.length > 0) {
          console.log("DEBUG: Sample Detail Data:", data.slice(0, 1));
      }
      
      setPaymentDetailList(data as PaymentDetailType[]);
    } catch (e) {
      console.error("Failed to fetch payment details:", e);
      setPaymentDetailList([]);
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Handle ketika pembayaran dipilih
  const handlePaymentSelect = useCallback(async (payment: PaymentType) => {
    if (selectedPayment?.id === payment.id) {
      setSelectedPayment(null);
      setPaymentDetailList([]);
      console.log("DEBUG: Rekapan deselect. Detail dihapus."); 
    } else {
      setSelectedPayment(payment);
      console.log(`DEBUG: Memilih Rekapan ID: ${payment.id}. Memanggil fetch detail...`);
      await fetchPaymentDetails(payment.id); 
    }
    setSelectedDetails([]);
    setDetailCurrentPage(1);
  }, [selectedPayment, fetchPaymentDetails]);

  // Handle upload success
  const handleUploadSuccess = useCallback((totalCount: number, failedCount: number) => {
    setShowUploadModal(false);
    fetchPayments();
    
    let successMsg = `Upload Selesai. ${totalCount - failedCount} berhasil.`;
    if (failedCount > 0) {
        successMsg += ` (${failedCount} gagal divalidasi).`;
        showToast(successMsg, "warning"); 
    } else {
        showToast(successMsg, "success");
    }
  }, [fetchPayments, showToast]);

  
  // Handle approve payment (Mengubah status di baris Rekap)
  const handleApprove = async () => {
    if (!selectedPayment || selectedPayment.status !== 'BARU') return;
    
    const isConfirmed = await showConfirm({
        title: 'Konfirmasi Persetujuan',
        message: `Anda akan menyetujui pembayaran periode ${selectedPayment.periode_pembayaran}`,
        confirmText: 'Ya, Setujui',
    });

    if (isConfirmed) {
        const { error } = await supabase
            .from('rekapan_pembayaran') // === Tabel Rekapan ===
            .update({ status: 'DISETUJUI' })
            .eq('id', selectedPayment.id);
        
        if (error) {
            showToast(`Gagal menyetujui: ${error.message}`, "error");
        } else {
            showToast("Pembayaran Berhasil Disetujui!", "success");
            
            const newStatus: PaymentType['status'] = 'DISETUJUI';
            
            // Optimistic Updates
            setPaymentList(prevList => 
                prevList.map(p => 
                    p.id === selectedPayment.id 
                        ? { ...p, status: newStatus } 
                        : p
                )
            );
            setSelectedPayment(prev => prev ? { ...prev, status: newStatus } : null);
            
            fetchPayments();
        }
    }
  };

  // Handle reject payment (Mengubah status di baris Rekap)
  const handleReject = async () => {
    if (!selectedPayment || selectedPayment.status !== 'BARU') return;
    
    const isConfirmed = await showConfirm({
        title: 'Konfirmasi Penolakan',
        message: `Anda akan menolak pembayaran periode ${selectedPayment.periode_pembayaran}`,
        confirmText: 'Ya, Tolak',
    });
    
    if (isConfirmed) {
        const { error } = await supabase
            .from('rekapan_pembayaran') // === Tabel Rekapan ===
            .update({ status: 'DITOLAK' })
            .eq('id', selectedPayment.id); 
        
        if (error) {
            showToast(`Gagal menolak: ${error.message}`, "error");
        } else {
            showToast("Pembayaran Berhasil Ditolak!", "success");
            
            const newStatus: PaymentType['status'] = 'DITOLAK';
            
            // Optimistic Updates
            setPaymentList(prevList => 
                prevList.map(p => 
                    p.id === selectedPayment.id 
                        ? { ...p, status: newStatus } 
                        : p
                )
            );
            setSelectedPayment(prev => prev ? { ...prev, status: newStatus } : null);
            
            fetchPayments();
        }
    }
  };

  // Handle delete selected details (menghapus baris Detail)
  const handleDeleteDetails = async () => {
    if (selectedDetails.length === 0 || !selectedPayment || !canEditDelete) return;
    
    const isConfirmed = await showConfirm({
        title: 'Konfirmasi Hapus Detail',
        message: `Anda akan menghapus ${selectedDetails.length} data detail pembayaran terpilih`,
        confirmText: 'Ya, Hapus!',
    });

    if (isConfirmed) {
        const { error } = await supabase
            .from("detail_pembayaran") // === Tabel Detail ===
            .delete()
            .in("id", selectedDetails); 

        if (error) {
            showToast(`Data gagal dihapus. Pesan: ${error.message}`, "error");
        } else {
            showToast("Data detail berhasil dihapus.", "success");
            if (selectedPayment) {
                fetchPaymentDetails(selectedPayment.id); // Refresh detail
            }
            setSelectedDetails([]);
            fetchPayments(); // Refresh rekap (total agregasi mungkin berubah)
        }
    }
  };

  // Handle delete rekapitulasi (menghapus baris Rekap dan Detail terkait)
  const handleDeleteRekap = async () => {
    if (!selectedPayment) return;

    const isConfirmed = await showConfirm({
        title: 'Konfirmasi Hapus Rekap',
        message: `Anda akan menghapus SELURUH data pembayaran periode ${selectedPayment.periode_pembayaran} beserta detailnya!`,
        confirmText: 'Ya, Hapus Semua!',
        // BARIS INI DIHAPUS untuk menyelesaikan error 2353
        // isDestructive: true, 
    });

    if (isConfirmed) {
        // Hapus baris rekap (menggunakan ID Rekap)
        const { error: rekapError } = await supabase
            .from("rekapan_pembayaran") // === Tabel Rekapan ===
            .delete()
            .eq("id", selectedPayment.id);

        if (rekapError) {
            showToast("Gagal menghapus data pembayaran. Periksa RLS.", "error");
        } else {
            showToast("Seluruh data pembayaran berhasil dihapus.", "success");
            setSelectedPayment(null);
            setPaymentDetailList([]);
            fetchPayments();
        }
    }
  };
  
  // Handle Edit Detail (Placeholder)
  const handleEditDetail = (detail: PaymentDetailType) => {
    if (!canEditDelete || selectedDetails.length !== 1) return; 
    setDetailToEdit(detail);
    setShowEditDetailModal(true);
    showToast(`Membuka edit data untuk NRP/NIP/NIR: ${detail.nrp_nip_nir}`, "info");
  };

  // Handle download (disederhanakan)
  const handleDownload = (type: 'pdf' | 'excel') => {
    if (!selectedPayment) {
      showToast("Pilih data pembayaran yang akan diunduh.", "error");
      return;
    }
    
    if (type === 'pdf') {
      showToast("Download PDF akan segera tersedia", "success");
    } else {
      showToast("Download Excel akan segera tersedia", "success");
    }
  };

  // Pagination dan Kalkulasi lainnya (tetap sama)
  const totalPages = Math.ceil(paymentList.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedPayments = useMemo(() => 
    paymentList.slice(startIndex, endIndex), 
    [paymentList, startIndex, endIndex]
  );

  const detailTotalPages = Math.ceil(paymentDetailList.length / detailRowsPerPage);
  const detailStartIndex = (detailCurrentPage - 1) * detailRowsPerPage;
  const detailEndIndex = detailStartIndex + detailRowsPerPage;
  const paginatedDetails = useMemo(() => 
    paymentDetailList.slice(detailStartIndex, detailEndIndex), 
    [paymentDetailList, detailStartIndex, detailEndIndex]
  );

  const canEditDelete = selectedPayment && (selectedPayment.status === 'BARU' || selectedPayment.status === 'DITOLAK');
  const isDisabled = !selectedPayment || !canEditDelete; 

  return (
    <div className={pageStyles.container}>
      
      <h2 className={pageStyles.header}>Pembayaran Jasa</h2>
      
      {/* Search dan Tombol Aksi Tabel Rekap */}
      <div className={pageStyles.buttonContainer}>
          <button onClick={() => setShowUploadModal(true)} className={styles.rekamButton}>
              <FaUpload/> Upload Excel
          </button>
      
          <button 
              onClick={handleApprove} 
              disabled={!selectedPayment || selectedPayment.status !== 'BARU'} 
              className={styles.rekamButton}
          >
              <FaCheck /> Setujui
          </button>
      
          <button 
              onClick={handleReject} 
              disabled={!selectedPayment || selectedPayment.status !== 'BARU'} 
              className={styles.hapusButton}
          >
              <FaTimes /> Tolak
          </button>

          <button 
              onClick={handleDeleteRekap} 
              disabled={!selectedPayment || selectedPayment.status === 'DISETUJUI'} 
              className={styles.hapusButton}
          >
              <FaRegTrashAlt /> Hapus Rekap
          </button>
      
          <button 
              onClick={() => handleDownload('pdf')} 
              disabled={!selectedPayment} 
              className={styles.downloadButton}
          >
              <FiDownload /> PDF
          </button>
          
          <button 
              onClick={() => handleDownload('excel')} 
              disabled={!selectedPayment} 
              className={styles.downloadButton}
          >
              <FiDownload /> Excel
          </button>
      

          <div className={pageStyles.searchContainer}>
              <input
                  type="text"
                  placeholder="Cari periode (e.g., 2025-01)"
                  value={searchPeriod}
                  onChange={(e) => setSearchPeriod(e.target.value)}
                  className={pageStyles.searchInput}
              />
          </div>
      </div>

      {/* Modal Upload */}
      {showUploadModal && (
        <UploadModal 
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
      
      {/* Tabel Pembayaran (Rekapitulasi) */}
      <PaymentTable
        payments={paginatedPayments}
        selectedPayment={selectedPayment}
        onPaymentSelect={handlePaymentSelect}
        isLoading={isTableLoading}
        startIndex={startIndex}
        formatAngka={formatAngka} 
      />

      {/* Pagination Tabel Utama */}
      <Paginasi 
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={paymentList.length}
        itemsPerPage={rowsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setRowsPerPage}
      />

      {/* Tabel Detail Pembayaran */}
      <div 
        className={pageStyles.detailContainer} 
        style={{ opacity: isTableLoading ? 0.5 : 1, paddingBottom: '20px' }} 
      >
        <div className={pageStyles.detailHeader}>
          Detail Pembayaran
        </div>
        
          <div 
            className={pageStyles.buttonContainer} 
            style={{ 
              margin: '1rem',
              opacity: isDisabled ? 0.5 : 1, 
              pointerEvents: isDisabled ? 'none' : 'auto' 
            }}
          >
            <button 
                onClick={() => showToast("Fitur Edit belum diimplementasi.", "error")} 
                className={styles.editButton}
                disabled={isDisabled || selectedDetails.length !== 1} 
            >
                <FaEdit /> Edit Detail
            </button>

            <button 
              onClick={handleDeleteDetails}
              disabled={isDisabled || selectedDetails.length === 0} 
              className={styles.hapusButton}
            >
              <FaRegTrashAlt /> Hapus Detail
            </button>
          </div>
        
        {/* Tabel Detail (Selalu Render) */}
        <PaymentDetailTable
          details={paginatedDetails}
          selectedDetails={selectedDetails}
          onSelectionChange={setSelectedDetails}
          onEdit={handleEditDetail} 
          isLoading={isDetailLoading}
          canEdit={!!canEditDelete} 
          startIndex={detailStartIndex}
          formatAngka={formatAngka} 
        />

        {/* Pagination Tabel Detail */}
        <Paginasi 
          currentPage={detailCurrentPage}
          totalPages={detailTotalPages}
          totalItems={paymentDetailList.length}
          itemsPerPage={detailRowsPerPage}
          onPageChange={setDetailCurrentPage}
          onItemsPerPageChange={setDetailRowsPerPage}
        />
      </div>
    </div>
  );
};

export default Pembayaran;