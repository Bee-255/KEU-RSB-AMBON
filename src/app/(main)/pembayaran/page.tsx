// src/app/(main)/pembayaran/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/utils/supabaseClient";
import { FaUpload, FaEdit, FaRegTrashAlt, FaCheck, FaFilePdf, FaFileExcel } from "react-icons/fa";
import Paginasi from '@/components/paginasi';
import styles from "@/styles/button.module.css";
import pageStyles from "@/styles/komponen.module.css";
import UploadModal from "./components/UploadModal";
// Import PaymentTotals interface dari PaymentTable untuk typing yang akurat
import PaymentTable, { PaymentTotals } from "./components/PaymentTable"; 
import PaymentDetailTable from "./components/PaymentDetailTable";
import PeriodSelect from "./components/PeriodSelect";
import { useKeuNotification } from "@/lib/useKeuNotification";


// =======================================================
// Fungsi formatAngka (Disesuaikan untuk Pembulatan)
const formatAngka = (angka: number | string | null | undefined, shouldRound: boolean = false): string => {
    if (typeof angka === 'string') {
      angka = parseFloat(angka);
    }
    if (typeof angka !== 'number' || isNaN(angka) || angka === null) {
      return '0';
    }
    
    let displayedAngka = angka;

    // Logika Pembulatan: 1000.52 -> 1001, 1000.46 -> 1000
    if (shouldRound) {
        displayedAngka = Math.round(angka);
    }

    return new Intl.NumberFormat('id-ID', {
      // Jika dibulatkan, pastikan tidak ada desimal. Jika tidak dibulatkan, tampilkan hingga 2 desimal.
      minimumFractionDigits: shouldRound ? 0 : 0, 
      maximumFractionDigits: shouldRound ? 0 : 2,
    }).format(displayedAngka);
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
  // PERUBAHAN: Tambahkan jumlah_potongan
  jumlah_potongan: number; 
  jumlah_netto: number;
  status: "BARU" | "DISETUJUI";
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

// Interface baru untuk data periode di dropdown
interface PeriodOption {
    id: string;
    periode_pembayaran: string;
    periode: string;
    created_at: string;
    status: "BARU" | "DISETUJUI";
}

const Pembayaran = () => {
  const { showToast, showConfirm } = useKeuNotification();

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

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [availablePeriods, setAvailablePeriods] = useState<PeriodOption[]>([]);

  // States 'showEditDetailModal' dan 'detailToEdit' sengaja tidak dideklarasikan karena tidak digunakan

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // =======================================================
  // Fungsi-fungsi yang harus dideklarasikan lebih awal
  // =======================================================

  const fetchPaymentDetails = useCallback(async (paymentId: string) => {
    setIsDetailLoading(true);
    try {
      const { data, error } = await supabase
        .from("detail_pembayaran")
        .select("*")
        .eq("rekapan_id", paymentId)
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

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
            newSet.delete(id); 
            setSelectedPayment(null);
            setPaymentDetailList([]);
            setSelectedDetails([]);
        } else {
            newSet.clear(); 
            newSet.add(id); 
            const selected = paymentList.find(p => p.id === id);
            if (selected) {
              setSelectedPayment(selected);
            }
        }
        return newSet;
    });
  }, [paymentList]);

  const fetchAvailablePeriods = useCallback(async (shouldSetDefault: boolean) => {
    try {
        const { data, error } = await supabase
            .from("rekapan_pembayaran")
            .select("id, periode_pembayaran, periode, created_at, status") 
            .order("periode", { ascending: false })
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Gagal mengambil daftar periode:", error);
            return [];
        }

        const allPeriods = data as PeriodOption[];
        const uniquePeriodsMap = new Map<string, PeriodOption>();

        allPeriods.forEach(period => {
            if (!uniquePeriodsMap.has(period.periode)) {
                uniquePeriodsMap.set(period.periode, period);
            }
        });

        const uniquePeriods = Array.from(uniquePeriodsMap.values());
        
        const sortedUniquePeriods = uniquePeriods.sort((a, b) => b.periode.localeCompare(a.periode));
        
        setAvailablePeriods(sortedUniquePeriods);

        if (shouldSetDefault && sortedUniquePeriods.length > 0) {
          setSelectedPeriodId(sortedUniquePeriods[0].id);
        } else if (shouldSetDefault) {
          setSelectedPeriodId("");
        }

        return sortedUniquePeriods;
    } catch (e) {
        console.error("Failed to fetch available periods:", e);
        return [];
    }
  }, []);


  const fetchPayments = useCallback(async (periodId: string) => {
    setIsTableLoading(true);

    if (!periodId) {
        setPaymentList([]);
        setIsTableLoading(false);
        setSelectedPayment(null);
        setExpandedIds(new Set());
        setPaymentDetailList([]); 
        return;
    }

    try {
        const { data: singleRekapData, error: singleRekapError } = await supabase
            .from("rekapan_pembayaran")
            .select("periode")
            .eq("id", periodId)
            .maybeSingle();

        if (singleRekapError || !singleRekapData) {
            console.error("Gagal mendapatkan periode dari ID:", singleRekapError);
            setPaymentList([]);
            setIsTableLoading(false);
            return;
        }

        const commonPeriod = singleRekapData.periode;

        // Variabel 'query' diubah menjadi const untuk mematuhi prefer-const
        const query = supabase
            .from("rekapan_pembayaran")
            .select("id, periode, periode_pembayaran, jumlah_pegawai, jumlah_bruto, jumlah_pph21, jumlah_potongan, jumlah_netto, status, created_at")
            .eq("periode", commonPeriod)
            .order("created_at", { ascending: false });

        const { data, error } = await query;

        if (error) {
            console.error("Gagal mengambil data rekap pembayaran:", error);
            showToast("Gagal mengambil data rekap pembayaran.", "error");
            setPaymentList([]);
            return;
        }

        setPaymentList(data as PaymentType[]);

        setSelectedPayment(null);
        setExpandedIds(new Set());

    } catch (e) {
        console.error("Failed to fetch payment data:", e);
        setPaymentList([]);
        showToast("Terjadi kesalahan saat mengambil data pembayaran.", "error");
    } finally {
        setIsTableLoading(false);
    }
  }, [showToast]);


  const handlePaymentSelect = useCallback(async (payment: PaymentType) => {
    toggleExpand(payment.id);
  }, [toggleExpand]);


  // =======================================================
  // Effects
  // =======================================================

  useEffect(() => {
    fetchAvailablePeriods(true);
  }, [fetchAvailablePeriods]);

  useEffect(() => {
    fetchPayments(selectedPeriodId);
    setCurrentPage(1);
  }, [selectedPeriodId, fetchPayments]);

  useEffect(() => {
    if (selectedPayment) {
      fetchPaymentDetails(selectedPayment.id);
    } else {
        setPaymentDetailList([]);
    }

    setDetailCurrentPage(1);

  }, [selectedPayment, fetchPaymentDetails]);


  // =======================================================
  // Handlers
  // =======================================================

  const handleUploadSuccess = useCallback(async (totalCount: number, failedCount: number) => {
    setShowUploadModal(false);

    await fetchAvailablePeriods(true); 
    
    let successMsg = `Upload Selesai. ${totalCount - failedCount} data diupload.`;
    if (failedCount > 0) {
        successMsg += ` (${failedCount} gagal divalidasi).`;
        showToast(successMsg, "warning");
    } else {
        showToast(successMsg, "success");
    }
  }, [fetchAvailablePeriods, showToast]);


  const handleApprove = async () => {
    if (!selectedPayment || selectedPayment.status !== 'BARU') return;

    const isConfirmed = await showConfirm({
        title: 'Konfirmasi Persetujuan',
        message: `Anda akan menyetujui pembayaran periode ${selectedPayment.periode_pembayaran}`,
        confirmText: 'Ya, Setujui',
    });

    if (isConfirmed) {
        const { error } = await supabase
            .from('rekapan_pembayaran')
            .update({ status: 'DISETUJUI' })
            .eq('id', selectedPayment.id);

        if (error) {
            showToast(`Gagal menyetujui: ${error.message}`, "error");
        } else {
            showToast("Pembayaran Berhasil Disetujui!", "success");

            const newSelectedPayment = { ...selectedPayment, status: 'DISETUJUI' as const };
            
            setPaymentList(prevList => 
                prevList.map(p => p.id === selectedPayment.id ? newSelectedPayment : p)
            );
            
            setSelectedPayment(newSelectedPayment);
            
            fetchPaymentDetails(selectedPayment.id);
        }
    }
  };


  const handleDeleteDetails = async () => {
    const canEditDelete = selectedPayment && (selectedPayment.status === 'BARU');
    if (selectedDetails.length === 0 || !selectedPayment || !canEditDelete) return;

    const isConfirmed = await showConfirm({
        title: 'Konfirmasi Hapus Detail',
        message: `Anda akan menghapus ${selectedDetails.length} data detail pembayaran terpilih`,
        confirmText: 'Ya, Hapus!',
    });

    if (isConfirmed) {
        const { error } = await supabase
            .from("detail_pembayaran")
            .delete()
            .in("id", selectedDetails);

        if (error) {
            showToast(`Data gagal dihapus. Pesan: ${error.message}`, "error");
        } else {
            showToast("Data detail berhasil dihapus.", "success");

            fetchPaymentDetails(selectedPayment.id);
            setSelectedDetails([]);
        }
    }
  };

  const handleDeleteRekap = async () => {
    const rekapToDelete = availablePeriods.find(p => p.id === selectedPeriodId);
    if (!rekapToDelete) return;

    const isConfirmed = await showConfirm({
        title: 'Konfirmasi Hapus Rekap',
        message: `Anda akan menghapus SELURUH rekapan yang ID-nya ada di dropdown: ${rekapToDelete.periode_pembayaran}!`,
        confirmText: 'Ya, Hapus!',
    });

    if (isConfirmed) {
        const { error: rekapError } = await supabase
            .from("rekapan_pembayaran")
            .delete()
            .eq("id", rekapToDelete.id);

        if (rekapError) {
            showToast("Gagal menghapus data pembayaran. Periksa RLS.", "error");
        } else {
            showToast("Data rekapan berhasil dihapus.", "success");

            setSelectedPayment(null);
            setPaymentDetailList([]);
            setExpandedIds(new Set());
            await fetchAvailablePeriods(true);
        }
    }
  };

  // Handler yang menerima detail dari PaymentDetailTable
  const handleEditDetail = (detail: PaymentDetailType) => {
    const canEditDelete = selectedPayment && (selectedPayment.status === 'BARU');
    if (!canEditDelete) {
        showToast("Hanya data dengan status BARU yang bisa diedit.", "error");
        return;
    }
    // Logic untuk edit seharusnya di sini (misalnya, setShowEditDetailModal(true))
    showToast(`Membuka edit data untuk NRP/NIP/NIR: ${detail.nrp_nip_nir} (Fitur Edit Belum Aktif)`, "info");
  };

  // Handler untuk tombol "Edit Detail" yang berada di page.tsx
  const handleEditDetailButton = () => {
    const canEditDelete = selectedPayment && (selectedPayment.status === 'BARU');
    if (!canEditDelete || selectedDetails.length !== 1) {
        showToast("Pilih tepat satu baris detail dengan status BARU untuk mengedit.", "warning");
        return;
    }
    
    // Cari detail yang dipilih
    const detailToEdit = paymentDetailList.find(d => d.id === selectedDetails[0]);

    if(detailToEdit) {
        // Panggil handler utama (yang akan membuka modal edit nantinya)
        handleEditDetail(detailToEdit);
    } else {
        showToast("Detail yang dipilih tidak ditemukan.", "error");
    }
  }


  const handleDownload = (type: 'pdf' | 'excel') => {
    if (!selectedPayment) { 
      showToast("Pilih data pembayaran yang akan diunduh (klik baris di tabel).", "error");
      return;
    }

    if (type === 'pdf') {
      showToast("Download PDF akan segera tersedia", "success");
    } else {
      showToast("Download Excel akan segera tersedia", "success");
    }
  };

  // =======================================================
  // Kalkulasi & Render
  // =======================================================

  // PERUBAHAN: Kalkulasi Total untuk Tabel Payment
  const paymentTotals: PaymentTotals = useMemo(() => {
    return paymentList.reduce((acc, current) => {
      acc.totalBruto += current.jumlah_bruto;
      acc.totalPph21 += current.jumlah_pph21;
      // BARU: Hitung total potongan
      acc.totalPotongan += current.jumlah_potongan; 
      // PERUBAHAN: Hitung total Netto baru (Bruto - PPh21 - Potongan)
      // Catatan: Jika Netto sudah dihitung di database, ini mungkin redundan
      // namun kita gunakan data yang ada di kolom jumlah_netto dari database/rekapan.
      acc.totalNetto += current.jumlah_netto; 
      return acc;
    }, {
      totalBruto: 0,
      totalPph21: 0,
      totalPotongan: 0, // Inisialisasi
      totalNetto: 0,
    });
  }, [paymentList]);


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

  const canEditDelete = selectedPayment && (selectedPayment.status === 'BARU');

  const isDetailActive = !!selectedPayment;

  const activePayment = selectedPayment;

  const rekapFilterSelected = availablePeriods.find(p => p.id === selectedPeriodId) || null;

  const isRekapDeletable = rekapFilterSelected && rekapFilterSelected.status !== 'DISETUJUI';

  const isDisabledDetailActions = !isDetailActive || !canEditDelete;


  return (
    <div className={pageStyles.container}>

      <h2 className={pageStyles.header}>Pembayaran Jasa</h2>

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
              onClick={handleDeleteRekap}
              disabled={!selectedPayment || selectedPayment.status !== 'BARU'}
              className={styles.hapusButton}
          >
              <FaRegTrashAlt /> Hapus Rekap
          </button>

          <button
              onClick={() => handleDownload('pdf')}
              disabled={!selectedPayment}
              className={styles.downloadButton}
          >
              <FaFilePdf /> PDF
          </button>

          <button
              onClick={() => handleDownload('excel')}
              disabled={!selectedPayment}
              className={styles.downloadButton}
          >
              <FaFileExcel /> Excel
          </button>

          <div className={pageStyles.searchContainer}>
              <PeriodSelect
                  periods={availablePeriods}
                  selectedId={selectedPeriodId}
                  onSelect={setSelectedPeriodId}
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
        // PERUBAHAN: formatAngka dikirim tanpa argumen kedua (default: false)
        formatAngka={formatAngka}
        expandedIds={expandedIds}
        toggleExpand={toggleExpand}
        // PERUBAHAN: Kirim data total ke tabel
        paymentTotals={paymentTotals} 
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
        style={{ paddingBottom: '20px' }}
      >
        <div className={pageStyles.detailHeader}>
          Detail Pembayaran
          {activePayment && <span>: {activePayment.periode_pembayaran}</span>}
        </div>

          <div
            className={pageStyles.buttonContainer}
            style={{
              margin: '1rem',
              
            }}
          >
            <button
                onClick={handleEditDetailButton} 
                className={styles.editButton}
                disabled={!canEditDelete || selectedDetails.length !== 1}
            >
                <FaEdit /> Edit Detail
            </button>

            <button
              onClick={handleDeleteDetails}
              disabled={!canEditDelete || selectedDetails.length === 0}
              className={styles.hapusButton}
            >
              <FaRegTrashAlt /> Hapus Detail
            </button>
          </div>

        {/* Tabel Detail */}
        <PaymentDetailTable
          details={paginatedDetails}
          selectedDetails={selectedDetails}
          onSelectionChange={setSelectedDetails}
          onEdit={handleEditDetail}
          isLoading={isDetailLoading && isDetailActive}
          canEdit={!!canEditDelete}
          startIndex={detailStartIndex}
          // Di sini kita tidak menggunakan pembulatan
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