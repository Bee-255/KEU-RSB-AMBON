// src/app/(main)/pembayaran/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/utils/supabaseClient";
// import Swal from "sweetalert2"; // HAPUS SWAL
import { FaUpload, FaEdit, FaRegTrashAlt, FaCheck, FaTimes } from "react-icons/fa";
import { FiDownload } from "react-icons/fi";
import { Toaster, toast } from "react-hot-toast";
import Paginasi from '@/components/paginasi';
import styles from "@/styles/button.module.css";
import pageStyles from "@/styles/komponen.module.css";
import UploadModal from "./components/UploadModal";
import PaymentTable from "./components/PaymentTable";
import PaymentDetailTable from "./components/PaymentDetailTable";


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
        // PERUBAHAN: Ganti Swal dengan toast
        toast.error("Gagal mengambil data rekap pembayaran.", { duration: 5000 });
        setPaymentList([]);
        return;
      }
      setPaymentList(data as PaymentType[]);
    } catch (e) {
      console.error("Failed to fetch payment data:", e);
      setPaymentList([]);
      // PERUBAHAN: Tambahkan toast error untuk catch
      toast.error("Terjadi kesalahan saat mengambil data pembayaran.");
    } finally {
      setIsTableLoading(false);
    }
  }, [searchPeriod]);

  // Fetch detail pembayaran (baris Detail)
  const fetchPaymentDetails = useCallback(async (paymentId: string) => {
    setIsDetailLoading(true);
    console.log(`DEBUG: fetchPaymentDetails dipanggil untuk ID rekapan: ${paymentId}`); // LOG
    try {
      const { data, error } = await supabase
        .from("detail_pembayaran") // === Tabel Detail ===
        .select("*") 
        .eq("rekapan_id", paymentId) // Menggunakan Foreign Key 'rekapan_id'
        .order("nama", { ascending: true });

      if (error) {
        console.error("Gagal mengambil detail pembayaran:", error);
        console.log("DEBUG: Supabase DETAIL Error:", error); // LOG ERROR
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
      console.log("DEBUG: Rekapan deselect. Detail dihapus."); // LOG
    } else {
      setSelectedPayment(payment);
      console.log(`DEBUG: Memilih Rekapan ID: ${payment.id}. Memanggil fetch detail...`);
      await fetchPaymentDetails(payment.id); 
    }
    setSelectedDetails([]);
    setDetailCurrentPage(1);
  }, [selectedPayment, fetchPaymentDetails]);

  // Handle upload success (Di dalamnya sudah menggunakan toast dari UploadModal)
  const handleUploadSuccess = useCallback((totalCount: number, failedCount: number) => {
    setShowUploadModal(false);
    fetchPayments();
    
    // Notifikasi di sini bersifat opsional karena sudah dihandle di UploadModal,
    // tapi bisa dipertahankan sebagai fallback/summary:
    let successMsg = `Upload Selesai. ${totalCount - failedCount} berhasil.`;
    if (failedCount > 0) {
        successMsg += ` (${failedCount} gagal divalidasi).`;
        // Hapus toast.success di sini jika Anda yakin notifikasi di UploadModal sudah cukup.
    }
    // Jika tidak ada notif dari UploadModal, gunakan ini:
    // toast.success(successMsg);
  }, [fetchPayments]);

  // Fungsi Konfirmasi Kustom (Mengganti Swal.fire untuk konfirmasi)
  const confirmAction = (title: string, text: string, confirmText: string, action: () => Promise<void>, isDestructive = false) => {
    // Memberikan ID unik agar toast bisa di-dismiss
    const toastId = toast.custom((t) => (
      <div 
        style={{ 
          background: isDestructive ? '#FEE2E2' : '#EFF6FF', 
          color: isDestructive ? '#991B1B' : '#1E40AF', 
          padding: '10px 15px', 
          borderRadius: '8px',
          border: `1px solid ${isDestructive ? '#FCA5A5' : '#93C5FD'}`,
          maxWidth: '300px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        }}
      >
        <p style={{ fontWeight: 'bold', margin: '0 0 5px 0' }}>{title}</p>
        <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>{text}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button 
            onClick={() => toast.dismiss(t.id)} 
            style={{ 
              background: '#D1D5DB', color: '#1F2937', padding: '4px 10px', borderRadius: '4px', border: 'none', cursor: 'pointer'
            }}
          >
            Batal
          </button>
          <button 
            onClick={() => {
              action();
              toast.dismiss(t.id);
            }} 
            style={{ 
              background: isDestructive ? '#EF4444' : '#3B82F6', 
              color: 'white', 
              padding: '4px 10px', 
              borderRadius: '4px', 
              border: 'none', 
              cursor: 'pointer'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    ), { duration: Infinity, id: 'confirm' });
    return toastId;
  };
  

  // Handle approve payment (Mengubah status di baris Rekap)
  const handleApprove = () => {
    if (!selectedPayment || selectedPayment.status !== 'BARU') return;
    
    confirmAction(
      'Konfirmasi Persetujuan',
      `Anda akan menyetujui pembayaran periode ${selectedPayment.periode_pembayaran}`,
      'Ya, Setujui',
      async () => {
        // UPdate baris rekapan (di tabel rekapan_pembayaran)
        const { error } = await supabase
          .from('rekapan_pembayaran') // === Tabel Rekapan ===
          .update({ status: 'DISETUJUI' })
          .eq('id', selectedPayment.id) 
        
        if (error) {
          // PERUBAHAN: Ganti Swal Gagal dengan toast
          toast.error(`Gagal menyetujui: ${error.message}`);
        } else {
          toast.success("Pembayaran Berhasil Disetujui!");
          
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
    );
  };

  // Handle reject payment (Mengubah status di baris Rekap)
  const handleReject = () => {
    if (!selectedPayment || selectedPayment.status !== 'BARU') return;
    
    confirmAction(
      'Konfirmasi Penolakan',
      `Anda akan menolak pembayaran periode ${selectedPayment.periode_pembayaran}`,
      'Ya, Tolak',
      async () => {
        // UPdate baris rekapan (di tabel rekapan_pembayaran)
        const { error } = await supabase
          .from('rekapan_pembayaran') // === Tabel Rekapan ===
          .update({ status: 'DITOLAK' })
          .eq('id', selectedPayment.id) 
        
        if (error) {
          // PERUBAHAN: Ganti Swal Gagal dengan toast
          toast.error(`Gagal menolak: ${error.message}`);
        } else {
          toast.success("Pembayaran Berhasil Ditolak!");
          
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
      },
      true // isDestructive = true
    );
  };

  // Handle delete selected details (menghapus baris Detail)
  const handleDeleteDetails = () => {
    if (selectedDetails.length === 0 || !selectedPayment || !canEditDelete) return;
    
    confirmAction(
      'Konfirmasi Hapus Detail',
      `Anda akan menghapus ${selectedDetails.length} data detail pembayaran terpilih`,
      'Ya, Hapus!',
      async () => {
        const { error } = await supabase
          .from("detail_pembayaran") // === Tabel Detail ===
          .delete()
          .in("id", selectedDetails); 

        if (error) {
          // PERUBAHAN: Ganti Swal Gagal dengan toast
          toast.error(`Data gagal dihapus. Pesan: ${error.message}`);
        } else {
          // PERUBAHAN: Ganti Swal Sukses dengan toast
          toast.success("Data detail berhasil dihapus.");
          if (selectedPayment) {
            fetchPaymentDetails(selectedPayment.id); // Refresh detail
          }
          setSelectedDetails([]);
          fetchPayments(); // Refresh rekap (total agregasi mungkin berubah)
        }
      },
      true // isDestructive = true
    );
  };

  // Handle delete rekapitulasi (menghapus baris Rekap dan Detail terkait)
  const handleDeleteRekap = () => {
    if (!selectedPayment) return;

    confirmAction(
      'Konfirmasi Hapus Rekap',
      `Anda akan menghapus SELURUH data pembayaran periode ${selectedPayment.periode_pembayaran} beserta detailnya!`,
      'Ya, Hapus Semua!',
      async () => {
        // Hapus baris rekap (menggunakan ID Rekap)
        const { error: rekapError } = await supabase
            .from("rekapan_pembayaran") // === Tabel Rekapan ===
            .delete()
            .eq("id", selectedPayment.id);

        if (rekapError) {
            // PERUBAHAN: Ganti Swal Gagal dengan toast
            toast.error("Gagal menghapus data pembayaran. Periksa RLS.");
        } else {
            // PERUBAHAN: Ganti Swal Sukses dengan toast
            toast.success("Seluruh data pembayaran berhasil dihapus.");
            setSelectedPayment(null);
            setPaymentDetailList([]);
            fetchPayments();
        }
      },
      true // isDestructive = true
    );
  };
  
  // Handle Edit Detail (Placeholder)
  const handleEditDetail = (detail: PaymentDetailType) => {
    if (!canEditDelete || selectedDetails.length !== 1) return; 
    setDetailToEdit(detail);
    setShowEditDetailModal(true);
    toast(`Membuka edit data untuk NRP/NIP/NIR: ${detail.nrp_nip_nir}`);
  };

  // Handle download (disederhanakan)
  const handleDownload = (type: 'pdf' | 'excel') => {
    if (!selectedPayment) {
      // PERUBAHAN: Ganti Swal Peringatan dengan toast
      toast.error("Pilih data pembayaran yang akan diunduh.");
      return;
    }
    
    if (type === 'pdf') {
      toast.success("Download PDF akan segera tersedia");
    } else {
      toast.success("Download Excel akan segera tersedia");
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
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
            fontSize: '14px',
            marginTop: '50px',
            zIndex: 9999,
          },
        }}
      />
      
      
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
                // Menggunakan toast error untuk placeholder Edit
                onClick={() => toast.error("Fitur Edit belum diimplementasi.")} 
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