// src/app/(main)/pembayaran/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/utils/supabaseClient";
import { FaUpload, FaEdit, FaRegTrashAlt, FaCheck, FaFilePdf, FaFileExcel, FaChevronDown, FaList } from "react-icons/fa";
import Paginasi from '@/components/paginasi';
import styles from "@/styles/button.module.css";
import pageStyles from "@/styles/komponen.module.css";
import UploadModal from "./components/UploadModal";
import PaymentTable, { PaymentTotals } from "./components/PaymentTable"; 
import PaymentDetailTable from "./components/PaymentDetailTable";
import PeriodSelect from "./components/PeriodSelect";
import { useKeuNotification } from "@/lib/useKeuNotification";
import { exportPaymentExcelBni } from './utils/exportPaymentExcelBni';
import { exportPaymentExcelBtn } from './utils/exportPaymentExcelBtn';
import { exportPaymentExcelMandiri } from './utils/exportPaymentExcelMandiri';
import { exportPaymentExcelTunai } from './utils/exportPaymentExcelTunai';
import { downloadTandaTangan } from './utils/exportTandaTangan';

// CENTRALIZED INTERFACES - Ekspor agar bisa diimport oleh file lain
export interface PaymentType {
  id: string;
  periode: string;
  periode_pembayaran: string;
  uraian_pembayaran: string;
  jumlah_pegawai: number;
  jumlah_bruto: number;
  jumlah_pph21: number;
  jumlah_potongan: number; 
  jumlah_netto: number;
  status: "BARU" | "DISETUJUI";
  created_at: string;
}

export interface PaymentDetailType {
  id: string;
  rekapan_id: string;
  nrp_nip_nir: string;
  nama: string;
  pekerjaan: string;
  klasifikasi: string;
  jumlah_bruto: number;
  pph21_persen: number;
  jumlah_pph21: number;
  jumlah_netto: number;
  nomor_rekening: string;
  bank: string;
  nama_rekening: string;
  potongan: number;
  uraian_pembayaran?: string;
}

interface PeriodOption {
  id: string;
  uraian_pembayaran: string;
  periode: string;
  created_at: string;
  status: "BARU" | "DISETUJUI";
}

interface DatabasePaymentType {
  id: string;
  periode: string;
  periode_pembayaran?: string;
  uraian_pembayaran: string;
  jumlah_pegawai: number;
  jumlah_bruto: number;
  jumlah_pph21: number;
  jumlah_potongan: number;
  jumlah_netto: number;
  status: "BARU" | "DISETUJUI";
  created_at: string;
}

// Type untuk fungsi export
type ExportFunctionType = (
  details: PaymentDetailType[], 
  payment: PaymentType, 
  showToast: (message: string, type: "success" | "error" | "warning" | "info") => void
) => Promise<void>;

// Constants
const exportFunctions: Record<string, ExportFunctionType> = {
  'BTN': exportPaymentExcelBtn,
  'BNI': exportPaymentExcelBni,
  'MANDIRI': exportPaymentExcelMandiri,
  'TUNAI': exportPaymentExcelTunai,
};

const formatAngka = (angka: number | string | null | undefined, shouldRound: boolean = false): string => {
  if (typeof angka === 'string') angka = parseFloat(angka);
  if (typeof angka !== 'number' || isNaN(angka) || angka === null) return '0';
  
  const displayedAngka = shouldRound ? Math.round(angka) : angka;
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: shouldRound ? 0 : 0,
    maximumFractionDigits: shouldRound ? 0 : 2,
  }).format(displayedAngka);
};

// Helper function untuk transform data dari database
const transformPaymentData = (data: DatabasePaymentType): PaymentType => {
  return {
    ...data,
    periode_pembayaran: data.periode_pembayaran || data.periode || data.uraian_pembayaran || ''
  };
};

const Pembayaran = () => {
  const { showToast, showConfirm } = useKeuNotification();
  const downloadButtonRef = useRef<HTMLDivElement>(null);

  // State
  const [paymentList, setPaymentList] = useState<PaymentType[]>([]);
  const [paymentDetailList, setPaymentDetailList] = useState<PaymentDetailType[]>([]); 
  const [selectedPayment, setSelectedPayment] = useState<PaymentType | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<string[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [detailCurrentPage, setDetailCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [detailRowsPerPage, setDetailRowsPerPage] = useState(10);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [availablePeriods, setAvailablePeriods] = useState<PeriodOption[]>([]);
  const [uniqueBanks, setUniqueBanks] = useState<string[]>([]);
  const [selectedBankForDownload, setSelectedBankForDownload] = useState("");
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [showPdfDropdown, setShowPdfDropdown] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Data Fetching Functions
  const fetchPaymentDetails = useCallback(async (paymentId: string) => {
    setIsDetailLoading(true);
    try {
      const { data, error } = await supabase
        .from("detail_pembayaran")
        .select(`*`) 
        .eq("rekapan_id", paymentId)
        .order("nama", { ascending: true });

      if (error) throw error;
      
      // Transformasi data untuk memastikan klasifikasi ada
      const transformedData = (data || []).map(d => ({
        ...d,
        klasifikasi: d.klasifikasi || "PARAMEDIS",
      })) as PaymentDetailType[];

      setPaymentDetailList(transformedData);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : JSON.stringify(e);
      console.error("Gagal mengambil detail pembayaran:", errorMessage);
      setPaymentDetailList([]);
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  const fetchAllApprovedPaymentDetails = useCallback(async () => {
    const approvedRekapIds = paymentList.filter(p => p.status === 'DISETUJUI').map(p => p.id);
    if (approvedRekapIds.length === 0) return { details: [], error: "Tidak ada rekapan yang berstatus DISETUJUI di periode ini." };

    try {
      const { data, error } = await supabase
        .from("detail_pembayaran")
        .select(`*`)
        .in("rekapan_id", approvedRekapIds)
        .order("nama", { ascending: true });

      if (error) throw error;

      // Transformasi data untuk menyertakan klasifikasi
      const transformedData = (data || []).map(d => ({
        ...d,
        klasifikasi: d.klasifikasi || "PARAMEDIS",
      })) as PaymentDetailType[];

      return { details: transformedData, error: null };
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : JSON.stringify(e);
      console.error("Failed to fetch all approved payment details:", errorMessage);
      return { details: [], error: "Kesalahan saat memproses data." };
    }
  }, [paymentList]);

  const fetchAvailablePeriodsData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("rekapan_pembayaran")
        .select("id, uraian_pembayaran, periode, created_at, status")
        .order("created_at", { ascending: false });

      if (error || !data) throw error;

      const uniquePeriodsMap = new Map<string, PeriodOption>();
      data.forEach(period => !uniquePeriodsMap.has(period.periode) && uniquePeriodsMap.set(period.periode, period));

      const uniquePeriods = Array.from(uniquePeriodsMap.values()).sort((a, b) => a.periode.localeCompare(b.periode));
      const latestPeriodId = data[0]?.id || "";

      return { periods: uniquePeriods, latestPeriodId };
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : JSON.stringify(e);
      console.error("Failed to fetch available periods:", errorMessage);
      return { periods: [], latestPeriodId: "" };
    }
  }, []);

  const fetchPayments = useCallback(async (periodId: string) => {
    if (!periodId) {
      setPaymentList([]);
      setIsTableLoading(false);
      resetDetailState();
      return;
    }

    setIsTableLoading(true);
    try {
      const { data: singleRekapData, error: singleRekapError } = await supabase
        .from("rekapan_pembayaran")
        .select("periode")
        .eq("id", periodId)
        .maybeSingle();

      if (singleRekapError || !singleRekapData) throw singleRekapError;

      const { data, error } = await supabase
        .from("rekapan_pembayaran")
        .select("*")
        .eq("periode", singleRekapData.periode)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform data untuk memastikan periode_pembayaran ada
      const fetchedPayments = (data || []).map(transformPaymentData);
      setPaymentList(fetchedPayments);

      if (fetchedPayments.length > 0) {
        const rekapIds = fetchedPayments.map(p => p.id);
        const { data: allDetails } = await supabase
          .from("detail_pembayaran")
          .select("bank")
          .in("rekapan_id", rekapIds);

        const banks = new Set<string>();
        allDetails?.forEach(d => {
          let bankName = (d.bank || '').trim().toUpperCase();
          if (bankName === '-' || bankName === '') bankName = 'TUNAI';
          if (bankName) banks.add(bankName);
        });
        setUniqueBanks(Array.from(banks).sort());
      } else {
        setUniqueBanks([]);
      }

      resetDetailState();
    } catch (e) {
      console.error("Failed to fetch payment data:", e);
      showToast("Terjadi kesalahan saat mengambil data pembayaran.", "error");
      setPaymentList([]);
    } finally {
      setIsTableLoading(false);
    }
  }, [showToast]);

  // Helper Functions
  const resetDetailState = () => {
    setSelectedPayment(null);
    setExpandedIds(new Set());
    setShowBankDropdown(false);
    setShowPdfDropdown(false);
  };

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
        resetDetailState();
        setPaymentDetailList([]);
        setSelectedDetails([]);
      } else {
        newSet.clear();
        newSet.add(id);
        const selected = paymentList.find(p => p.id === id);
        if (selected) setSelectedPayment(selected);
      }
      return newSet;
    });
  }, [paymentList]);

  const handlePaymentSelect = useCallback((payment: PaymentType) => {
    toggleExpand(payment.id);
  }, [toggleExpand]);

  const handleUploadSuccess = useCallback(async (totalCount: number, failedCount: number) => {
    setShowUploadModal(false);
    const { periods, latestPeriodId } = await fetchAvailablePeriodsData();
    setAvailablePeriods(periods);
    if (latestPeriodId) setSelectedPeriodId(latestPeriodId);

    const successMsg = `Upload Selesai. ${totalCount - failedCount} data diupload.${failedCount > 0 ? ` (${failedCount} gagal divalidasi).` : ''}`;
    showToast(successMsg, failedCount > 0 ? "warning" : "success");
  }, [fetchAvailablePeriodsData, showToast]);

  const handleApprove = async () => {
    if (!selectedPayment || selectedPayment.status !== 'BARU') return;

    const isConfirmed = await showConfirm({
      title: 'Konfirmasi Persetujuan',
      message: `Anda akan menyetujui pembayaran periode ${selectedPayment.uraian_pembayaran}`,
      confirmText: 'Ya, Setujui',
    });

    if (!isConfirmed) return;

    const { error } = await supabase
      .from('rekapan_pembayaran')
      .update({ status: 'DISETUJUI' })
      .eq('id', selectedPayment.id);

    if (error) {
      showToast(`Gagal menyetujui: ${error.message}`, "error");
    } else {
      showToast("Pembayaran Berhasil Disetujui!", "success");
      const newSelectedPayment = { ...selectedPayment, status: 'DISETUJUI' as const };
      setPaymentList(prev => prev.map(p => p.id === selectedPayment.id ? newSelectedPayment : p));
      setSelectedPayment(newSelectedPayment);
      fetchPaymentDetails(selectedPayment.id);
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

    if (!isConfirmed) return;

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
  };

  const handleDeleteRekap = async () => {
    const rekapToDelete = availablePeriods.find(p => p.id === selectedPeriodId);
    if (!rekapToDelete) return;

    const isConfirmed = await showConfirm({
      title: 'Konfirmasi Hapus Rekap',
      message: `Anda akan menghapus rekapan spesifik ini: ${rekapToDelete.uraian_pembayaran}.`,
      confirmText: 'Ya, Hapus!',
    });

    if (!isConfirmed) return;

    const { error: rekapError } = await supabase
      .from("rekapan_pembayaran")
      .delete()
      .eq("id", rekapToDelete.id);

    if (rekapError) {
      showToast("Gagal menghapus data pembayaran. Periksa RLS.", "error");
      return;
    }

    showToast("Data rekapan berhasil dihapus.", "success");
    const { periods: newPeriods, latestPeriodId } = await fetchAvailablePeriodsData();
    
    const { data: remainingRekap } = await supabase
      .from("rekapan_pembayaran")
      .select("id")
      .eq("periode", rekapToDelete.periode)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const newSelectedId = remainingRekap?.id || latestPeriodId;
    
    resetDetailState();
    setPaymentDetailList([]);
    setAvailablePeriods(newPeriods);
    setSelectedPeriodId(newSelectedId);
  };

  const handleEditDetail = (detail: PaymentDetailType) => {
    const canEditDelete = selectedPayment && (selectedPayment.status === 'BARU');
    if (!canEditDelete) {
      showToast("Hanya data dengan status BARU yang bisa diedit.", "error");
      return;
    }
    showToast(`Membuka edit data untuk NRP/NIP/NIR: ${detail.nrp_nip_nir} (Fitur Edit Belum Aktif)`, "info");
  };

  const handleEditDetailButton = () => {
    const canEditDelete = selectedPayment && (selectedPayment.status === 'BARU');
    if (!canEditDelete || selectedDetails.length !== 1) {
      showToast("Pilih tepat satu baris detail dengan status BARU untuk mengedit.", "warning");
      return;
    }
    
    const detailToEdit = paymentDetailList.find(d => d.id === selectedDetails[0]);
    detailToEdit ? handleEditDetail(detailToEdit) : showToast("Detail yang dipilih tidak ditemukan.", "error");
  };

  // Fungsi untuk download daftar tanda tangan
  const handleDownloadDaftar = async () => {
    if (!selectedPeriodId) {
      showToast("Pilih periode pembayaran terlebih dahulu.", "error");
      return;
    }

    const hasUnapproved = paymentList.some(p => p.status !== 'DISETUJUI');
    if (hasUnapproved) {
      showToast("Ada rekapan yang belum disetujui. Download hanya untuk rekapan yang sudah DISETUJUI.", "info");
      return;
    }

    const { details: allApprovedDetails, error: fetchError } = await fetchAllApprovedPaymentDetails();

    if (fetchError || allApprovedDetails.length === 0) {
      showToast(fetchError || "Tidak ada data detail yang disetujui untuk periode ini.", "error");
      return;
    }

    const firstApprovedPayment = paymentList.find(p => p.status === 'DISETUJUI');
    if (!firstApprovedPayment) {
      showToast("Tidak ada rekapan yang disetujui untuk diunduh.", "error");
      return;
    }

    const detailsWithUraian = allApprovedDetails.map(detail => ({
      ...detail,
      uraian_pembayaran: detail.uraian_pembayaran || firstApprovedPayment.uraian_pembayaran
    }));

    await downloadTandaTangan(detailsWithUraian, firstApprovedPayment, showToast);
  };

  const handleDownload = async (type: 'pdf' | 'excel', bank?: string) => {
    if (!selectedPeriodId) {
      showToast("Pilih periode pembayaran terlebih dahulu.", "error");
      setShowBankDropdown(false);
      setShowPdfDropdown(false);
      return;
    }

    const hasUnapproved = paymentList.some(p => p.status !== 'DISETUJUI');
    if (hasUnapproved) {
      showToast("Ada rekapan yang belum disetujui. Download hanya untuk rekapan yang sudah DISETUJUI.", "info");
      setShowBankDropdown(false);
      setShowPdfDropdown(false);
      return;
    }

    if (type === 'pdf') {
      setShowPdfDropdown(false);
      showToast("Download PDF akan segera tersedia", "success");
    } else if (type === 'excel') {
      const bankToDownload = bank || selectedBankForDownload;
      if (!bankToDownload) {
        showToast("Pilih Bank atau 'TUNAI' terlebih dahulu.", "error");
        return;
      }

      setShowBankDropdown(false);
      const { details: allApprovedDetails, error: fetchError } = await fetchAllApprovedPaymentDetails();

      if (fetchError || allApprovedDetails.length === 0) {
        showToast(fetchError || "Tidak ada data detail yang disetujui untuk periode ini.", "error");
        return;
      }

      const filteredDetails = allApprovedDetails.filter(d => {
        const detailBank = (d.bank || '').trim().toUpperCase();
        const targetBank = bankToDownload.toUpperCase();
        return targetBank === 'TUNAI' ? (detailBank === '-' || detailBank === '') : detailBank === targetBank;
      });

      if (filteredDetails.length === 0) {
        showToast(`Tidak ada data untuk Bank ${bankToDownload} di semua rekapan yang disetujui.`, "warning");
        return;
      }

      const bankKey = bankToDownload.toUpperCase();
      const exportFunc = exportFunctions[bankKey];
      const firstApprovedPayment = paymentList.find(p => p.status === 'DISETUJUI');

      if (exportFunc && firstApprovedPayment) {
        await exportFunc(filteredDetails, firstApprovedPayment, showToast);
      } else {
        showToast(`Fungsi export untuk Bank ${bankToDownload} belum diimplementasikan atau rekapan tidak ditemukan.`, "error");
      }
    }
  };

  const handleExcelButtonClick = () => {
    if (!selectedPeriodId) {
      showToast("Pilih periode pembayaran terlebih dahulu.", "error");
      return;
    }

    if (uniqueBanks.length === 0) {
      showToast("Tidak ada data bank yang ditemukan di periode ini.", "info");
      return;
    }

    const hasUnapproved = paymentList.some(p => p.status !== 'DISETUJUI');
    if (hasUnapproved) {
      showToast("Ada rekapan yang belum disetujui. Download Excel hanya untuk rekapan yang sudah DISETUJUI.", "info");
      setShowBankDropdown(false);
      return;
    }

    setShowBankDropdown(prev => !prev);
    setShowPdfDropdown(false);
  };

  // Effects
  useEffect(() => {
    const initializePeriods = async () => {
      const { periods } = await fetchAvailablePeriodsData();
      setAvailablePeriods(periods);
    };
    initializePeriods();
  }, [fetchAvailablePeriodsData]);

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

  useEffect(() => {
    if (uniqueBanks.length > 0) {
      setSelectedBankForDownload(uniqueBanks[0]);
    } else {
      setSelectedBankForDownload("");
    }
  }, [uniqueBanks]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadButtonRef.current && !downloadButtonRef.current.contains(event.target as Node)) {
        setShowBankDropdown(false);
        setShowPdfDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Memoized Calculations
  const paymentTotals: PaymentTotals = useMemo(() => paymentList.reduce((acc, current) => ({
    totalBruto: acc.totalBruto + current.jumlah_bruto,
    totalPph21: acc.totalPph21 + current.jumlah_pph21,
    totalPotongan: acc.totalPotongan + current.jumlah_potongan,
    totalNetto: acc.totalNetto + current.jumlah_netto,
  }), {
    totalBruto: 0,
    totalPph21: 0,
    totalPotongan: 0,
    totalNetto: 0,
  }), [paymentList]);

  const totalPages = Math.ceil(paymentList.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedPayments = useMemo(() => paymentList.slice(startIndex, startIndex + rowsPerPage), [paymentList, startIndex, rowsPerPage]);

  const detailTotalPages = Math.ceil(paymentDetailList.length / detailRowsPerPage);
  const detailStartIndex = (detailCurrentPage - 1) * detailRowsPerPage;
  const paginatedDetails = useMemo(() => paymentDetailList.slice(detailStartIndex, detailStartIndex + detailRowsPerPage), [paymentDetailList, detailStartIndex, detailRowsPerPage]);

  // Derived State
  const canEditDelete = selectedPayment && (selectedPayment.status === 'BARU');
  const isDetailActive = !!selectedPayment;
  const isPeriodSelected = !!selectedPeriodId;

  return (
    <div className={pageStyles.container}>
      <h2 className={pageStyles.header}>Pembayaran Jasa</h2>

      <div className={pageStyles.buttonContainer} ref={downloadButtonRef}>
        <button onClick={() => setShowUploadModal(true)} className={styles.rekamButton}><FaUpload/> Upload Excel</button>
        <button onClick={handleApprove} disabled={!selectedPayment || selectedPayment.status !== 'BARU'} className={styles.rekamButton}><FaCheck /> Setujui</button>
        <button onClick={handleDeleteRekap} disabled={!isPeriodSelected || selectedPayment?.status !== 'BARU'} className={styles.hapusButton}><FaRegTrashAlt /> Hapus Rekap</button>

        <button 
          onClick={handleDownloadDaftar} 
          disabled={!isPeriodSelected || paymentList.some(p => p.status !== 'DISETUJUI')}
          className={styles.downloadButton}
          style={{ marginLeft: '5px' }}
        >
          <FaList /> Unduh Daftar
        </button>

        <div style={{ position: 'relative', display: 'inline-block', marginLeft: '5px' }}>
          <button onClick={() => handleDownload('pdf')} disabled={!isPeriodSelected} className={styles.downloadButton}><FaFilePdf /> <FaChevronDown style={{ marginLeft: '5px', fontSize: '0.8em' }}/></button>
        </div>

        <div style={{ position: 'relative', display: 'inline-block', marginLeft: '5px' }}>
          <button onClick={handleExcelButtonClick} disabled={!isPeriodSelected || uniqueBanks.length === 0} className={styles.downloadButton}><FaFileExcel /> <FaChevronDown style={{ marginLeft: '5px', fontSize: '0.8em' }}/></button>
          
          {showBankDropdown && (
            <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, backgroundColor: 'white', border: '1px solid #ccc', boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)', minWidth: '150px', borderRadius: '4px', marginTop: '5px' }}>
              {uniqueBanks.map(bank => (
                <div key={bank} onClick={() => handleDownload('excel', bank)} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }} onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f1f1f1')} onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'white')}>{bank}</div>
              ))}
            </div>
          )}
        </div>

        <div className={pageStyles.searchContainer}>
          <PeriodSelect periods={availablePeriods} selectedId={selectedPeriodId} onSelect={setSelectedPeriodId} />
        </div>
      </div>

      {showUploadModal && <UploadModal onClose={() => setShowUploadModal(false)} onSuccess={handleUploadSuccess} />}

      <PaymentTable 
        payments={paginatedPayments} 
        selectedPayment={selectedPayment} 
        onPaymentSelect={handlePaymentSelect} 
        isLoading={isTableLoading && isPeriodSelected} 
        startIndex={startIndex} 
        formatAngka={formatAngka} 
        expandedIds={expandedIds} 
        toggleExpand={toggleExpand} 
        paymentTotals={paymentTotals} 
      />

      {paymentList.length > 0 && <Paginasi currentPage={currentPage} totalPages={totalPages} totalItems={paymentList.length} itemsPerPage={rowsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setRowsPerPage} />}

      <div className={pageStyles.detailContainer} style={{ paddingBottom: '20px' }}>
        <div className={pageStyles.detailHeader}>Detail Pembayaran{selectedPayment && <span>: {selectedPayment.uraian_pembayaran}</span>}</div>

        <div className={pageStyles.buttonContainer} style={{ margin: '1rem' }}>
          <button onClick={handleEditDetailButton} className={styles.editButton} disabled={!canEditDelete || selectedDetails.length !== 1}><FaEdit /> Edit Detail</button>
          <button onClick={handleDeleteDetails} disabled={!canEditDelete || selectedDetails.length === 0} className={styles.hapusButton}><FaRegTrashAlt /> Hapus Detail</button>
        </div>

        <PaymentDetailTable 
          details={paginatedDetails} 
          selectedDetails={selectedDetails} 
          onSelectionChange={setSelectedDetails} 
          onEdit={handleEditDetail} 
          isLoading={isDetailLoading && isDetailActive} 
          canEdit={!!canEditDelete} 
          startIndex={detailStartIndex} 
          formatAngka={formatAngka} 
        />

        {paymentDetailList.length > 0 && <Paginasi currentPage={detailCurrentPage} totalPages={detailTotalPages} totalItems={paymentDetailList.length} itemsPerPage={detailRowsPerPage} onPageChange={setDetailCurrentPage} onItemsPerPageChange={setDetailRowsPerPage} />}
      </div>
    </div>
  );
};

export default Pembayaran;