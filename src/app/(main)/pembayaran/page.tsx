// src/app/(main)/pembayaran/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/utils/supabaseClient";
import { FaUpload, FaEdit, FaRegTrashAlt, FaCheck, FaFilePdf, FaFileExcel, FaChevronDown } from "react-icons/fa";
import Paginasi from '@/components/paginasi';
import styles from "@/styles/button.module.css";
import pageStyles from "@/styles/komponen.module.css";
import UploadModal from "./components/UploadModal";
import PaymentTable, { PaymentTotals } from "./components/PaymentTable"; 
import PaymentDetailTable from "./components/PaymentDetailTable";
import PeriodSelect from "./components/PeriodSelect";
import { useKeuNotification } from "@/lib/useKeuNotification";

// IMPORT FUNGSI EXPORT UNTUK SEMUA BANK
import { exportPaymentExcelBtn } from './utils/exportPaymentExcelBtn';
import { exportPaymentExcelBni } from './utils/exportPaymentExcelBni';
import { exportPaymentExcelMandiri } from './utils/exportPaymentExcelMandiri';
import { exportPaymentExcelTunai } from './utils/exportPaymentExcelTunai';


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

// MAPPING BANK DENGAN FUNGSI EXPORT
const exportFunctions: { [key: string]: Function } = {
    'BTN': exportPaymentExcelBtn,
    'BNI': exportPaymentExcelBni,
    'MANDIRI': exportPaymentExcelMandiri,
    'TUNAI': exportPaymentExcelTunai,
};

const Pembayaran = () => {
  const { showToast, showConfirm } = useKeuNotification();
  // Ref untuk Click Outside pada seluruh area tombol download
  const downloadButtonRef = useRef<HTMLDivElement>(null); 

  const [paymentList, setPaymentList] = useState<PaymentType[]>([]);
  const [paymentDetailList, setPaymentDetailList] = useState<PaymentDetailType[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentType | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<string[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isTableLoading, setIsTableLoading] = useState<boolean>(false); 
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [detailCurrentPage, setDetailCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [detailRowsPerPage, setDetailRowsPerPage] = useState(10);

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(""); 
  const [availablePeriods, setAvailablePeriods] = useState<PeriodOption[]>([]);
  
  const [uniqueBanks, setUniqueBanks] = useState<string[]>([]);
  const [selectedBankForDownload, setSelectedBankForDownload] = useState<string>("");
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [showPdfDropdown, setShowPdfDropdown] = useState(false); 


  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // =======================================================
  // Fungsi-fungsi yang harus dideklarasikan lebih awal
  // =======================================================

  /**
   * Mengambil detail pembayaran untuk satu rekapan tertentu.
   */
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
  
  /**
   * Mengambil SEMUA detail pembayaran untuk SEMUA rekapan yang DISETUJUI 
   * di periode yang sedang dipilih. Digunakan untuk EXPORT EXCEL.
   */
  const fetchAllApprovedPaymentDetails = useCallback(async (): Promise<{ details: PaymentDetailType[], error: string | null }> => {
      // 1. Filter ID Rekapan yang berstatus DISETUJUI dari state paymentList
      const approvedRekapIds = paymentList
          .filter(p => p.status === 'DISETUJUI')
          .map(p => p.id);
      
      if (approvedRekapIds.length === 0) {
          return { details: [], error: "Tidak ada rekapan yang berstatus DISETUJUI di periode ini." };
      }

      try {
          // 2. Ambil semua detail yang rekapan_id-nya ada di approvedRekapIds (menggabungkan data)
          const { data, error } = await supabase
              .from("detail_pembayaran")
              .select("*")
              .in("rekapan_id", approvedRekapIds)
              .order("nama", { ascending: true }); // Mengurutkan berdasarkan nama agar rapi

          if (error) {
              console.error("Gagal mengambil semua detail pembayaran yang disetujui:", error);
              return { details: [], error: error.message };
          }

          return { details: data as PaymentDetailType[], error: null };

      } catch (e) {
          console.error("Failed to fetch all approved payment details:", e);
          return { details: [], error: "Kesalahan saat memproses data." };
      }
  }, [paymentList]);


  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
            newSet.delete(id); 
            setSelectedPayment(null);
            setPaymentDetailList([]);
            setSelectedDetails([]);
            // setUniqueBanks([]); // JANGAN DIHAPUS agar tombol download tetap beroperasi
            setSelectedBankForDownload(""); 
            setShowBankDropdown(false);
            setShowPdfDropdown(false);
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

  /**
   * Mengambil data untuk Dropdown. 
   */
  const fetchAvailablePeriodsData = useCallback(async () => {
    try {
        const { data, error } = await supabase
            .from("rekapan_pembayaran")
            .select("id, periode_pembayaran, periode, created_at, status") 
            .order("created_at", { ascending: false }); 

        if (error || !data) {
            console.error("Gagal mengambil daftar periode:", error);
            return { periods: [], latestPeriodId: "" };
        }

        const allPeriods = data as PeriodOption[];
        const uniquePeriodsMap = new Map<string, PeriodOption>();
        let latestPeriodId = "";

        if (allPeriods.length > 0) {
            latestPeriodId = allPeriods[0].id; 
        }

        allPeriods.forEach(period => {
            if (!uniquePeriodsMap.has(period.periode)) {
                uniquePeriodsMap.set(period.periode, period);
            }
        });

        const uniquePeriods = Array.from(uniquePeriodsMap.values());
        
        const sortedUniquePeriods = uniquePeriods.sort((a, b) => 
            a.periode.localeCompare(b.periode) 
        );
        
        return { periods: sortedUniquePeriods, latestPeriodId };

    } catch (e) {
        console.error("Failed to fetch available periods:", e);
        return { periods: [], latestPeriodId: "" };
    }
  }, []);

  const fetchPayments = useCallback(async (periodId: string) => {
    if (!periodId) {
        setPaymentList([]);
        setIsTableLoading(false);
        setSelectedPayment(null);
        setExpandedIds(new Set());
        setPaymentDetailList([]); 
        setUniqueBanks([]); // RESET UNIQUE BANKS JIKA PERIODE TIDAK DIPILIH
        setSelectedBankForDownload(""); 
        setShowBankDropdown(false);
        setShowPdfDropdown(false); 
        return;
    }

    setIsTableLoading(true);

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

        // Ambil semua rekapan yang memiliki nilai 'periode' yang sama
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

        const fetchedPayments = data as PaymentType[];
        setPaymentList(fetchedPayments);

        // Setelah mengambil paymentList, kita perlu mencari semua bank unik 
        // dari semua detail rekapan yang ada di dalam list ini untuk tombol DOWNLOAD.
        if (fetchedPayments.length > 0) {
            const rekapIds = fetchedPayments.map(p => p.id);
            const { data: allDetails, error: detailError } = await supabase
                .from("detail_pembayaran")
                .select("bank")
                .in("rekapan_id", rekapIds);
            
            if (!detailError && allDetails) {
                const banks = new Set<string>();
                allDetails.forEach(d => {
                    let bankName = (d.bank || '').trim().toUpperCase();
                    
                    // 🚩 PERBAIKAN 1: Logika baru untuk mengubah '-' atau '' menjadi 'TUNAI'
                    if (bankName === '-' || bankName === '') {
                        bankName = 'TUNAI';
                    }
                    
                    if (bankName) {
                        banks.add(bankName);
                    } 
                    // Jika bankName kosong setelah trim (misalnya hanya spasi), 
                    // ini sudah ditangani oleh kondisi di atas (diubah menjadi 'TUNAI' jika ''/null)
                });
                const sortedBanks = Array.from(banks).sort();
                setUniqueBanks(sortedBanks);
            }
        } else {
            setUniqueBanks([]);
        }


        // Reset detail
        setSelectedPayment(null);
        setExpandedIds(new Set());
        setShowBankDropdown(false);
        setShowPdfDropdown(false); 

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

  // Effect 1: Inisialisasi daftar periode
  useEffect(() => {
    const initializePeriods = async () => {
        const { periods } = await fetchAvailablePeriodsData();
        setAvailablePeriods(periods);
    };
    initializePeriods();
  }, [fetchAvailablePeriodsData]);

  // Effect 2: Muat data tabel utama saat selectedPeriodId berubah
  useEffect(() => {
    fetchPayments(selectedPeriodId); 
    setCurrentPage(1);
  }, [selectedPeriodId, fetchPayments]);

  // Effect 3: Muat data detail saat baris rekap dipilih (selectedPayment)
  useEffect(() => {
    if (selectedPayment) {
      // Saat baris dipilih, kita panggil fetchPaymentDetails untuk detail rekapan tersebut
      fetchPaymentDetails(selectedPayment.id);
    } else {
        setPaymentDetailList([]);
    }
    setDetailCurrentPage(1);
  }, [selectedPayment, fetchPaymentDetails]);

  // Reset pilihan bank download saat daftar bank berubah
  useEffect(() => {
    if (uniqueBanks.length > 0) {
        setSelectedBankForDownload(uniqueBanks[0]); 
    } else {
        setSelectedBankForDownload("");
    }
  }, [uniqueBanks]);

  // Effect 4: Logic Click Outside untuk seluruh area download
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Cek apakah click ada di luar ref tombol download/dropdown
      if (downloadButtonRef.current && !downloadButtonRef.current.contains(event.target as Node)) {
        setShowBankDropdown(false);
        setShowPdfDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [downloadButtonRef]);


  // =======================================================
  // Handlers
  // =======================================================

  /**
   * Setelah upload berhasil:
   * ...
   */
  const handleUploadSuccess = useCallback(async (totalCount: number, failedCount: number) => {
    setShowUploadModal(false);

    // 1. Ambil daftar periode terbaru dan ID rekapan yang paling baru di-upload
    const { periods, latestPeriodId } = await fetchAvailablePeriodsData(); 
    
    // 2. Set state daftar periode (untuk dropdown)
    setAvailablePeriods(periods);
    
    // 3. SELALU atur selectedPeriodId ke latestPeriodId yang baru
    // agar tabel utama memuat data yang baru di-upload.
    if (latestPeriodId) {
        setSelectedPeriodId(latestPeriodId); 
    }

    let successMsg = `Upload Selesai. ${totalCount - failedCount} data diupload.`;
    if (failedCount > 0) {
        successMsg += ` (${failedCount} gagal divalidasi).`;
        showToast(successMsg, "warning");
    } else {
        showToast(successMsg, "success");
    }
  }, [fetchAvailablePeriodsData, showToast]);


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
            
            // Re-fetch details hanya jika diperlukan, tapi saat ini kita hanya update list
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

            // Setelah hapus detail, muat ulang detail untuk mempertahankan tampilan
            fetchPaymentDetails(selectedPayment.id);
            setSelectedDetails([]);
        }
    }
  };

  /**
   * Logika Penghapusan Rekap Kritis 
   */
  const handleDeleteRekap = async () => {
    const rekapToDelete = availablePeriods.find(p => p.id === selectedPeriodId);
    if (!rekapToDelete) return;

    const isConfirmed = await showConfirm({
        title: 'Konfirmasi Hapus Rekap',
        message: `Anda akan menghapus rekapan spesifik ini: ${rekapToDelete.periode_pembayaran}.`,
        confirmText: 'Ya, Hapus!',
    });

    if (!isConfirmed) return;
    
    const deletedPeriod = rekapToDelete.periode;
        
    // 1. Hapus rekapan dari DB
    const { error: rekapError } = await supabase
        .from("rekapan_pembayaran")
        .delete()
        .eq("id", rekapToDelete.id);

    if (rekapError) {
        showToast("Gagal menghapus data pembayaran. Periksa RLS.", "error");
        return;
    }

    showToast("Data rekapan berhasil dihapus.", "success");

    let newSelectedId = "";

    // 2. Cek apakah ada sisa rekapan di periode kalender yang sama
    const { data: remainingRekap } = await supabase
        .from("rekapan_pembayaran")
        .select("id")
        .eq("periode", deletedPeriod)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();


    // 3. Ambil daftar periode terbaru (setelah penghapusan)
    const { periods: newPeriods, latestPeriodId } = await fetchAvailablePeriodsData();

    if (remainingRekap) {
        // KASUS 1: Masih ada rekapan tersisa di periode ini (set new ID dari sisa rekapan)
        newSelectedId = remainingRekap.id; 
    } else {
        // KASUS 2 & 3: Pindah ke rekapan paling baru secara global, atau "" jika kosong
        newSelectedId = latestPeriodId; 
    }
    
    // 4. Update SEMUA state yang terkait secara serempak:
    
    // Reset detail
    setSelectedPayment(null);
    setPaymentDetailList([]);
    setExpandedIds(new Set());
    
    // Update daftar dropdown dan nilai yang dipilih
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

    if(detailToEdit) {
        handleEditDetail(detailToEdit);
    } else {
        showToast("Detail yang dipilih tidak ditemukan.", "error");
    }
  }


  const handleDownload = async (type: 'pdf' | 'excel', bank?: string) => {
    // 1. Validasi Periode
    if (!selectedPeriodId) { 
      showToast("Pilih periode pembayaran terlebih dahulu.", "error");
      setShowBankDropdown(false);
      setShowPdfDropdown(false);
      return;
    }
    
    // Validasi Status DISETUJUI UNTUK SEMUA REKAPAN DI PERIODE (di cek lagi di sini)
    const hasUnapproved = paymentList.some(p => p.status !== 'DISETUJUI');

    if (hasUnapproved) {
        // Logika ini seharusnya ditangani oleh handleExcelButtonClick, tapi dipertahankan sebagai double check
        showToast("Ada rekapan yang belum disetujui. Download hanya untuk rekapan yang sudah DISETUJUI.", "info");
        setShowBankDropdown(false);
        setShowPdfDropdown(false);
        return;
    }

    if (type === 'pdf') {
        setShowPdfDropdown(false); // Tutup dropdown PDF
        showToast("Download PDF akan segera tersedia", "success");
    } else if (type === 'excel') {
        const bankToDownload = bank || selectedBankForDownload; 

        if (!bankToDownload) {
            showToast("Pilih Bank atau 'TUNAI' terlebih dahulu.", "error");
            return;
        }
        
        setShowBankDropdown(false); // Tutup dropdown Excel

        // 2. Ambil Semua Detail Pembayaran yang DISETUJUI DARI FUNGSI GABUNGAN
        const { details: allApprovedDetails, error: fetchError } = await fetchAllApprovedPaymentDetails();

        if (fetchError || allApprovedDetails.length === 0) {
            showToast(fetchError || "Tidak ada data detail yang disetujui untuk periode ini.", "error");
            return;
        }

        // 🚩 PERBAIKAN 2: Logika filter yang disesuaikan untuk TUNAI ('-' atau '')
        const filteredDetails = allApprovedDetails.filter(d => {
            const detailBank = (d.bank || '').trim().toUpperCase();
            const targetBank = bankToDownload.toUpperCase();

            // KASUS TUNAI: Filter yang banknya kosong/null ATAU strip (-)
            if (targetBank === 'TUNAI') {
                return detailBank === '-' || detailBank === '';
            }
            
            // KASUS BANK LAIN: Filter sesuai nama bank
            return detailBank === targetBank;
        });


        if (filteredDetails.length === 0) {
            showToast(`Tidak ada data untuk Bank ${bankToDownload} di semua rekapan yang disetujui.`, "warning");
            return;
        }


        // 4. Lakukan Export
        const bankKey = bankToDownload.toUpperCase();
        const exportFunc = exportFunctions[bankKey];

        // Ambil rekapan pertama yang disetujui sebagai header/info periode untuk file
        const firstApprovedPayment = paymentList.find(p => p.status === 'DISETUJUI');

        if (exportFunc && firstApprovedPayment) {
            // KIRIMKAN filteredDetails (gabungan semua rekapan disetujui)
            await exportFunc(filteredDetails, firstApprovedPayment, showToast);
        } else {
            showToast(`Fungsi export untuk Bank ${bankToDownload} belum diimplementasikan atau rekapan tidak ditemukan.`, "error");
        }
    }
  };
// ---------------------------------------------------------------------------------------------------
  /**
   * Handler untuk membuka dropdown Excel, dengan validasi status 'DISETUJUI' terlebih dahulu.
   */
  const handleExcelButtonClick = () => {
    const isPeriodSelected = !!selectedPeriodId;
    
    if (!isPeriodSelected) { 
        showToast("Pilih periode pembayaran terlebih dahulu.", "error");
        return;
    }

    if (uniqueBanks.length === 0) {
        showToast("Tidak ada data bank yang ditemukan di periode ini.", "info");
        return;
    }

    // Cek apakah ada yang belum disetujui
    const hasUnapproved = paymentList.some(p => p.status !== 'DISETUJUI');

    if (hasUnapproved) {
        showToast("Ada rekapan yang belum disetujui. Download Excel hanya untuk rekapan yang sudah DISETUJUI.", "info");
        setShowBankDropdown(false); // Pastikan tertutup
        return;
    }
    
    // Jika semua sudah disetujui dan ada bank, tampilkan dropdown
    setShowBankDropdown(prev => !prev);
    setShowPdfDropdown(false); 
  };


  // =======================================================
  // Kalkulasi & Render
  // =======================================================

  const paymentTotals: PaymentTotals = useMemo(() => {
    return paymentList.reduce((acc, current) => {
      acc.totalBruto += current.jumlah_bruto;
      acc.totalPph21 += current.jumlah_pph21;
      acc.totalPotongan += current.jumlah_potongan; 
      acc.totalNetto += current.jumlah_netto; 
      return acc;
    }, {
      totalBruto: 0,
      totalPph21: 0,
      totalPotongan: 0, 
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

  const isPeriodSelected = !!selectedPeriodId; 


  return (
    <div className={pageStyles.container}>

      <h2 className={pageStyles.header}>Pembayaran Jasa</h2>

      <div className={pageStyles.buttonContainer} ref={downloadButtonRef}> {/* PENTING: Pindahkan ref ke container download */}
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
              // Tombol ini harus aktif jika ada periode yang dipilih di dropdown
              disabled={!isPeriodSelected || selectedPayment?.status !== 'BARU'}
              className={styles.hapusButton}
          >
              <FaRegTrashAlt /> Hapus Rekap
          </button>

          {/* DROPDOWN BUTTON DOWNLOAD PDF */}
          <div 
              style={{ position: 'relative', display: 'inline-block', marginLeft: '5px' }}
          >
              <button
                  onClick={() => {
                      // Cek status "DISETUJUI" di handler download
                      handleDownload('pdf');
                  }}
                  disabled={!isPeriodSelected} 
                  className={styles.downloadButton}
              >
                  <FaFilePdf /> <FaChevronDown style={{ marginLeft: '5px', fontSize: '0.8em' }}/>
              </button>

              {/* PDF Dropdown disabled untuk sementara waktu, logikanya dipindahkan ke handleDownload */}
              {/* {showPdfDropdown && ( 
                  <div 
                      // ... kode dropdown PDF yang sekarang di-handle langsung oleh handleDownload
                  >
                      ...
                  </div>
              )} */}
          </div>
          {/* AKHIR DROPDOWN BUTTON DOWNLOAD PDF */}


          {/* DROPDOWN BUTTON DOWNLOAD EXCEL */}
          <div 
              style={{ position: 'relative', display: 'inline-block', marginLeft: '5px' }}
          >
              <button
                  onClick={handleExcelButtonClick} // Menggunakan handler baru untuk validasi status
                  // Tombol aktif jika ada periode dan ada bank yang ditemukan 
                  disabled={!isPeriodSelected || uniqueBanks.length === 0} 
                  className={styles.downloadButton}
              >
                  <FaFileExcel /> <FaChevronDown style={{ marginLeft: '5px', fontSize: '0.8em' }}/>
              </button>

              {/* Dropdown Menu Bank */}
              {showBankDropdown && (
                  <div 
                      style={{ 
                          position: 'absolute', 
                          top: '100%', 
                          left: 0, 
                          zIndex: 10,
                          backgroundColor: 'white', 
                          border: '1px solid #ccc',
                          boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)',
                          minWidth: '150px',
                          borderRadius: '4px',
                          marginTop: '5px'
                      }}
                  >
                      {uniqueBanks.map(bank => (
                          <div
                              key={bank}
                              // Memanggil handler download dengan nama bank yang dipilih
                              onClick={() => handleDownload('excel', bank)}
                              style={{ 
                                  padding: '10px', 
                                  cursor: 'pointer', 
                                  borderBottom: '1px solid #eee',
                                  whiteSpace: 'nowrap'
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f1f1f1')}
                              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                          >
                              {bank}
                          </div>
                      ))}
                  </div>
              )}
          </div>
          {/* AKHIR DROPDOWN BUTTON DOWNLOAD EXCEL */}


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
        // Pastikan loading hanya berjalan jika ada periode yang dipilih
        isLoading={isTableLoading && isPeriodSelected} 
        startIndex={startIndex}
        formatAngka={formatAngka}
        expandedIds={expandedIds}
        toggleExpand={toggleExpand}
        paymentTotals={paymentTotals} 
      />

      {/* Pagination Tabel Utama */}
      {/* Tampilkan Pagination hanya jika ada data */}
      {paymentList.length > 0 && (
          <Paginasi
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={paymentList.length}
            itemsPerPage={rowsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setRowsPerPage}
          />
      )}

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
          // Pastikan loading detail hanya berjalan jika ada payment yang dipilih
          isLoading={isDetailLoading && isDetailActive}
          canEdit={!!canEditDelete}
          startIndex={detailStartIndex}
          formatAngka={formatAngka} 
        />

        {/* Pagination Tabel Detail */}
        {/* Tampilkan Pagination hanya jika ada data */}
        {paymentDetailList.length > 0 && (
            <Paginasi
              currentPage={detailCurrentPage}
              totalPages={detailTotalPages}
              totalItems={paymentDetailList.length}
              itemsPerPage={detailRowsPerPage}
              onPageChange={setDetailCurrentPage}
              onItemsPerPageChange={setDetailRowsPerPage}
            />
        )}
      </div>
    </div>
  );
};

export default Pembayaran;