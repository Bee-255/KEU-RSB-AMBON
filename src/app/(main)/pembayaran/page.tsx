// src/app/(main)/pembayaran/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/utils/supabaseClient";
import Swal from "sweetalert2";
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
  pembayaran_id: string; 
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

  // Fetch data rekapitulasi pembayaran
  const fetchPayments = useCallback(async () => {
    setIsTableLoading(true);
    try {
      let query = supabase
        .from("pembayaran")
        .select("*")
        .not('jumlah_pegawai', 'is', null) 
        .is('nrp_nip_nir', null)          
        .order("created_at", { ascending: false });
      
      if (searchPeriod) {
        query = query.ilike("periode", `%${searchPeriod}%`); 
      }

      const { data, error } = await query;
      
      if (error) {
        console.error("Gagal mengambil data rekap pembayaran:", error);
        Swal.fire("Error", "Gagal mengambil data rekap pembayaran.", "error");
        setPaymentList([]);
        return;
      }
      setPaymentList(data as PaymentType[]);
    } catch (e) {
      console.error("Failed to fetch payment data:", e);
      setPaymentList([]);
    } finally {
      setIsTableLoading(false);
    }
  }, [searchPeriod]);

  // Fetch detail pembayaran
  const fetchPaymentDetails = useCallback(async (paymentId: string) => {
    setIsDetailLoading(true);
    try {
      const { data, error } = await supabase
        .from("pembayaran") 
        .select("*") 
        .eq("pembayaran_id", paymentId) 
        .not('nrp_nip_nir', 'is', null) 
        .order("nama", { ascending: true });

      if (error) {
        console.error("Gagal mengambil detail pembayaran:", error);
        setPaymentDetailList([]);
        return;
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
    } else {
      setSelectedPayment(payment);
      await fetchPaymentDetails(payment.id); 
    }
    setSelectedDetails([]);
    setDetailCurrentPage(1);
  }, [selectedPayment, fetchPaymentDetails]);

  // Handle upload success
  const handleUploadSuccess = useCallback((totalCount: number, failedCount: number) => {
    setShowUploadModal(false);
    fetchPayments();
    
    let successMsg = `Berhasil mengupload ${totalCount - failedCount} data.`;
    if (failedCount > 0) {
        successMsg += ` (${failedCount} gagal karena NRP/NIP/NIR tidak ditemukan).`;
    }
    toast.success(successMsg);
  }, [fetchPayments]);

  // Handle approve payment (disederhanakan)
  const handleApprove = async () => {
    if (!selectedPayment || selectedPayment.status !== 'BARU') return;
    
    const result = await Swal.fire({
      title: 'Apakah Anda yakin?', 
      text: `Anda akan menyetujui pembayaran periode ${selectedPayment.periode_pembayaran}`,
      icon: 'question', 
      showCancelButton: true, 
      confirmButtonText: 'Ya, Setujui', 
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      const { error } = await supabase
        .from('pembayaran')
        .update({ status: 'DISETUJUI' })
        .eq('id', selectedPayment.id) 
        .is('nrp_nip_nir', null); 
      
      if (error) {
        Swal.fire('Gagal!', `Gagal menyetujui: ${error.message}`, 'error');
      } else {
        toast.success("Pembayaran Berhasil Disetujui!");
        
        // --- START PERBAIKAN ---
        const newStatus: PaymentType['status'] = 'DISETUJUI';
        
        // 1. Perbarui paymentList untuk me-refresh status di PaymentTable
        setPaymentList(prevList => 
            prevList.map(p => 
                p.id === selectedPayment.id 
                    ? { ...p, status: newStatus } 
                    : p
            )
        );

        // 2. Perbarui selectedPayment untuk me-refresh status di Detail Header
        setSelectedPayment(prev => prev ? { ...prev, status: newStatus } : null);

        // fetchPayments() tidak diperlukan karena state sudah diupdate
        // --- END PERBAIKAN ---
      }
    }
  };

  // Handle reject payment (disederhanakan)
  const handleReject = async () => {
    if (!selectedPayment || selectedPayment.status !== 'BARU') return;
    
    const result = await Swal.fire({
      title: 'Apakah Anda yakin?', 
      text: `Anda akan menolak pembayaran periode ${selectedPayment.periode_pembayaran}`,
      icon: 'warning', 
      showCancelButton: true, 
      confirmButtonText: 'Ya, Tolak', 
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      const { error } = await supabase
        .from('pembayaran')
        .update({ status: 'DITOLAK' })
        .eq('id', selectedPayment.id) 
        .is('nrp_nip_nir', null); 
      
      if (error) {
        Swal.fire('Gagal!', `Gagal menolak: ${error.message}`, 'error');
      } else {
        toast.success("Pembayaran Berhasil Ditolak!");
        
        // --- START PERBAIKAN ---
        const newStatus: PaymentType['status'] = 'DITOLAK';
        
        // 1. Perbarui paymentList untuk me-refresh status di PaymentTable
        setPaymentList(prevList => 
            prevList.map(p => 
                p.id === selectedPayment.id 
                    ? { ...p, status: newStatus } 
                    : p
            )
        );

        // 2. Perbarui selectedPayment untuk me-refresh status di Detail Header
        setSelectedPayment(prev => prev ? { ...prev, status: newStatus } : null);
        
        // fetchPayments() tidak diperlukan karena state sudah diupdate
        // --- END PERBAIKAN ---
      }
    }
  };

  // Handle delete selected details
  const handleDeleteDetails = async () => {
    if (selectedDetails.length === 0 || !selectedPayment) return;
    
    // Gunakan canEditDelete untuk memastikan tombol tidak aktif saat DISETUJUI
    if (!canEditDelete) return;

    const result = await Swal.fire({
      title: "Apakah Anda yakin?",
      text: `Anda akan menghapus ${selectedDetails.length} data detail pembayaran terpilih`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      const { error } = await supabase
        .from("pembayaran") 
        .delete()
        .in("id", selectedDetails); 

      if (error) {
        Swal.fire("Gagal!", `Data gagal dihapus. Pesan: ${error.message}`, "error");
      } else {
        Swal.fire("Dihapus!", "Data berhasil dihapus.", "success");
        if (selectedPayment) {
          fetchPaymentDetails(selectedPayment.id); // Refresh detail
        }
        setSelectedDetails([]);
      }
    }
  };

  // Handle delete rekapitulasi (disederhanakan)
  const handleDeleteRekap = async () => {
    if (!selectedPayment) return;

    const result = await Swal.fire({
      title: "Apakah Anda yakin?",
      text: `Anda akan menghapus seluruh data pembayaran periode ${selectedPayment.periode_pembayaran} beserta detailnya!`,
      icon: "error",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus Semua!",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
        // Hapus baris detail
        const { error: detailError } = await supabase
            .from("pembayaran")
            .delete()
            .eq("pembayaran_id", selectedPayment.id);
            
        // Hapus baris rekap
        const { error: rekapError } = await supabase
            .from("pembayaran")
            .delete()
            .eq("id", selectedPayment.id);

        if (detailError || rekapError) {
            Swal.fire("Gagal!", "Gagal menghapus data pembayaran. Periksa RLS.", "error");
        } else {
            Swal.fire("Dihapus!", "Seluruh data pembayaran berhasil dihapus.", "success");
            setSelectedPayment(null);
            setPaymentDetailList([]);
            fetchPayments();
        }
    }
  };
  
  // Handle Edit Detail (Placeholder)
  const handleEditDetail = (detail: PaymentDetailType) => {
    // Tambahkan kondisi pemeriksaan agar tidak error jika detail belum dipilih
    if (!canEditDelete || selectedDetails.length !== 1) return; 
    setDetailToEdit(detail);
    setShowEditDetailModal(true);
    toast(`Membuka edit data untuk NRP/NIP/NIR: ${detail.nrp_nip_nir}`);
  };

  // Handle download (disederhanakan)
  const handleDownload = (type: 'pdf' | 'excel') => {
    if (!selectedPayment) {
      Swal.fire("Peringatan", "Pilih data pembayaran yang akan diunduh.", "warning");
      return;
    }
    
    if (type === 'pdf') {
      toast.success("Download PDF akan segera tersedia");
    } else {
      toast.success("Download Excel akan segera tersedia");
    }
  };

  // Pagination untuk tabel utama
  const totalPages = Math.ceil(paymentList.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedPayments = useMemo(() => 
    paymentList.slice(startIndex, endIndex), 
    [paymentList, startIndex, endIndex]
  );

  // Pagination untuk tabel detail
  const detailTotalPages = Math.ceil(paymentDetailList.length / detailRowsPerPage);
  const detailStartIndex = (detailCurrentPage - 1) * detailRowsPerPage;
  const detailEndIndex = detailStartIndex + detailRowsPerPage;
  const paginatedDetails = useMemo(() => 
    paymentDetailList.slice(detailStartIndex, detailEndIndex), 
    [paymentDetailList, detailStartIndex, detailEndIndex]
  );

  // VARIABEL PENENTU KUNCI: TRUE jika status BARU atau DITOLAK
  // Nilai ini akan menjadi false jika selectedPayment adalah null atau statusnya DISETUJUI
  const canEditDelete = selectedPayment && (selectedPayment.status === 'BARU' || selectedPayment.status === 'DITOLAK');

  // Variabel untuk mengunci tombol (karena tidak ada rekap yang dipilih)
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
        // --- PERBAIKAN: Mengembalikan style yang hilang ---
        style={{ opacity: isTableLoading ? 0.5 : 1, paddingBottom: '20px' }} 
        // ---
      >
        <div className={pageStyles.detailHeader}>
          Detail Pembayaran - {selectedPayment ? selectedPayment.periode_pembayaran : "Pilih Data Rekap"}
          {selectedPayment && (
            <span className={pageStyles.statusBadge} data-status={selectedPayment.status}>
              {selectedPayment.status}
            </span>
          )}
        </div>
        
          <div 
            className={pageStyles.buttonContainer} 
            // --- PERBAIKAN: Mengganti margin: "1rem" dengan style yang lebih konsisten ---
            style={{ 
              margin: '1rem',
              opacity: isDisabled ? 0.5 : 1, 
              pointerEvents: isDisabled ? 'none' : 'auto' 
            }}
            // ---
          >
            <button 
                onClick={() => toast.error("Fitur Edit belum diimplementasi.")} 
                className={styles.rekamButton}
                disabled={isDisabled || selectedDetails.length !== 1} 
            >
                <FaEdit /> Edit Detail
            </button>

            <button 
              onClick={handleDeleteDetails}
              disabled={isDisabled || selectedDetails.length === 0} 
              className={styles.hapusButton}
            >
              <FaRegTrashAlt /> Hapus Detail Terpilih ({selectedDetails.length})
            </button>
          </div>
        
        {/* Tabel Detail (Selalu Render) */}
        <PaymentDetailTable
          details={paginatedDetails}
          selectedDetails={selectedDetails}
          onSelectionChange={setSelectedDetails}
          onEdit={handleEditDetail} 
          isLoading={isDetailLoading}
          // canEdit=false jika tidak ada selectedPayment atau status DISETUJUI
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