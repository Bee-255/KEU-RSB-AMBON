'use client';

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import Swal from "sweetalert2";
import * as ExcelJS from 'exceljs';
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { FaPlus, FaEdit, FaRegTrashAlt, FaDownload, FaLock, FaUnlock } from "react-icons/fa";
import Paginasi from '@/components/paginasi';
import styles from "@/styles/button.module.css";
import pageStyles from "@/styles/komponen.module.css";
import loadingStyles from "@/styles/loading.module.css";
import { Toaster, toast } from "react-hot-toast";

// Deklarasi tipe untuk props komponen Modal
interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ children, onClose }) => {
  return (
    <div
      className={pageStyles.modalOverlay}
      onClick={onClose}
    >
      <div
        className={pageStyles.modalContent}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

// Fungsi utilitas format angka Indonesia
const formatDate = (dateString: string | null) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatted = date.toLocaleDateString('id-ID', options);
  return formatted.replace(/\//g, '-');
};

const formatRupiah = (number: number | string | null) => {
  if (number === null || number === undefined || number === "") return "-";
  const num = typeof number === 'string' ? parseFloat(number.replace(/\./g, '')) : number;
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

// Format input dengan pemisah ribuan (Indonesia)
const formatInputRupiah = (value: string): string => {
  const numbersOnly = value.replace(/[^\d]/g, '');
  
  if (numbersOnly === '') return '';
  
  return numbersOnly.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Konversi dari format input ke number
const parseRupiahInput = (formattedValue: string): number => {
  if (!formattedValue) return 0;
  const numbersOnly = formattedValue.replace(/\./g, '');
  return parseInt(numbersOnly, 10) || 0;
};

// Format untuk display di table (tanpa Rp)
const formatNumberDisplay = (number: number | string | null): string => {
  if (number === null || number === undefined || number === "") return "-";
  const num = typeof number === 'string' ? parseFloat(number.replace(/\./g, '')) : number;
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat('id-ID').format(num);
};

const unitLayananOptions = [
  "IGD", "POLI UMUM", "POLI JIWA", "POLI GIGI", "POLI PENYAKIT DALAM","POLI BEDAH GIGI DAN MULUT", "POLI ORTHOPEDI", "POLI KEBIDANAN/OBGYN","POLI EKG", "POLI MATA", "POLI PARU", "POLI THT", "POLI JANTUNG",
  "POLI ANAK", "POLI SARAF", "POLI KULIT DAN KELAMIN", "POLI BEDAH",
  "VVIP", "VIP", "ANGGREK KELAS 1", "ANGGREK KELAS 2", "MELATI KELAS 1",
  "MELATI KELAS 2", "MELATI KELAS 3", "MUTIARA KELAS 1", "MUTIARA KELAS 2",
  "MUTIARA KELAS 3", "RUANGAN RAWAT ICU", "RUANGAN KEBIDANAN",
  "RADIOLOGI", "LABORATORIUM", "FISIOTERAPI", "GIZI", "DOKPOL",
  "AMBULANCE", "APOTIK", "DIKLIT", "ADMINISTRASI", "MCU NARKOBA DAN SKBS",
  "PATOLOGI KLINIK", "RUANGAN OPERASI", "MCU"
];

const unitToJenisRawat: Record<string, string> = {
  "IGD": "RAWAT JALAN", "POLI UMUM": "RAWAT JALAN", "POLI JIWA": "RAWAT JALAN","POLI GIGI": "RAWAT JALAN", "POLI PENYAKIT DALAM": "RAWAT JALAN","POLI BEDAH GIGI DAN MULUT": "RAWAT JALAN", "POLI ORTHOPEDI": "RAWAT JALAN","POLI KEBIDANAN/OBGYN": "RAWAT JALAN", "POLI EKG": "RAWAT JALAN","POLI MATA": "RAWAT JALAN", "POLI PARU": "RAWAT JALAN", "POLI THT": "RAWAT JALAN","POLI JANTUNG": "RAWAT JALAN", "POLI ANAK": "RAWAT JALAN", "POLI SARAF": "RAWAT JALAN","POLI KULIT DAN KELAMIN": "RAWAT JALAN", "POLI BEDAH": "RAWAT JALAN","VVIP": "RAWAT INAP", "VIP": "RAWAT INAP", "ANGGREK KELAS 1": "RAWAT INAP","ANGGREK KELAS 2": "RAWAT INAP", "MELATI KELAS 1": "RAWAT INAP","MELATI KELAS 2": "RAWAT INAP", "MELATI KELAS 3": "RAWAT INAP","MUTIARA KELAS 1": "RAWAT INAP", "MUTIARA KELAS 2": "RAWAT INAP","MUTIARA KELAS 3": "RAWAT INAP", "RUANGAN RAWAT ICU": "RAWAT INAP","RUANGAN KEBIDANAN": "RAWAT INAP", "RADIOLOGI": "PENUNJANG","LABORATORIUM": "PENUNJANG", "FISIOTERAPI": "PENUNJANG", "GIZI": "PENUNJANG","DOKPOL": "PENUNJANG", "AMBULANCE": "PENUNJANG", "APOTIK": "PENUNJANG","DIKLIT": "PENUNJANG", "ADMINISTRASI": "PENUNJANG","MCU NARKOBA DAN SKBS": "PENUNJANG", "PATOLOGI KLINIK": "PENUNJANG","RUANGAN OPERASI": "PENUNJANG", "MCU": "PENUNJANG"};

const klasifikasiOptions = ["UMUM", "SELISIH"];

// Definisikan Tipe Data (untuk keamanan tipe di TypeScript)
interface Pasien {
  id: string;
  created_at: string;
  klasifikasi: string;
  nomor_rm: string;
  nama_pasien: string;
  jenis_rawat: string;
  unit_layanan: string;
  jumlah_tagihan: number;
  diskon: number;
  jumlah_bersih: number;
  bayar_tunai: number;
  bayar_transfer: number;
  tanggal_transfer: string | null;
  total_pembayaran: number;
  rekaman_harian_id: string;
  user_id: string;
}

interface Rekapitulasi {
  id: string;
  tanggal: string;
  nama_user: string;
  total_pasien: number;
  total_tagihan: number;
  total_tunai: number;
  total_transfer: number;
  total_pembayaran: number;
  status: string;
}

export default function PencatatanPasien() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [rekapitulasiList, setRekapitulasiList] = useState<Rekapitulasi[]>([]);
  const [pasienList, setPasienList] = useState<Pasien[]>([]);
  const [showRekapModal, setShowRekapModal] = useState(false);
  const [showPasienModal, setShowPasienModal] = useState(false);
  const [editPasienId, setEditPasienId] = useState<string | null>(null);
  const [selectedPasienId, setSelectedPasienId] = useState<string | null>(null);
  const [startDate] = useState("");
  const [endDate] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedRekapIds, setSelectedRekapIds] = useState<string[]>([]);
  
  // === Deklarasi State Loading ===
  const [isTableLoading, setIsTableLoading] = useState<boolean>(true);
  
  // State untuk form pasien - sekarang menyimpan nilai asli (number)
  const [pasienData, setPasienData] = useState<{
    klasifikasi: string, 
    nomor_rm: string, 
    nama_pasien: string, 
    jenis_rawat: string,
    unit_layanan: string, 
    jumlah_tagihan: number, 
    diskon: number, 
    jumlah_bersih: number,
    bayar_tunai: number, 
    bayar_transfer: number, 
    tanggal_transfer: string, 
    total_pembayaran: number,
    rekaman_harian_id: string | null, 
    user_id: string | null
  }>({
    klasifikasi: "", 
    nomor_rm: "", 
    nama_pasien: "", 
    jenis_rawat: "",
    unit_layanan: "", 
    jumlah_tagihan: 0, 
    diskon: 0, 
    jumlah_bersih: 0,
    bayar_tunai: 0, 
    bayar_transfer: 0, 
    tanggal_transfer: "", 
    total_pembayaran: 0,
    rekaman_harian_id: null, 
    user_id: null,
  });

  // State untuk format display di input field
  const [inputDisplay, setInputDisplay] = useState<{
    jumlah_tagihan: string;
    diskon: string;
    bayar_tunai: string;
    bayar_transfer: string;
  }>({
    jumlah_tagihan: "",
    diskon: "",
    bayar_tunai: "",
    bayar_transfer: ""
  });

  const [newRekapDate, setNewRekapDate] = useState("");

  const [rekapPage, setRekapPage] = useState(1);
  const [rekapPerPage, setRekapPerPage] = useState(5);
  const rekapStartIndex = (rekapPage - 1) * rekapPerPage;
  const rekapEndIndex = rekapStartIndex + rekapPerPage;
  const paginatedRekap = rekapitulasiList.slice(rekapStartIndex, rekapEndIndex);
  const totalRekapPages = Math.ceil(rekapitulasiList.length / rekapPerPage);

  const [pasienPage, setPasienPage] = useState(1);
  const [pasienPerPage] = useState(10);
  const pasienStartIndex = (pasienPage - 1) * pasienPerPage;
  const pasienEndIndex = pasienStartIndex + pasienPerPage;
  const paginatedPasien = pasienList.slice(pasienStartIndex, pasienEndIndex);

  const [isAllRekapSelected, setIsAllRekapSelected] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const fetchRekapitulasi = useCallback(async () => {
    setIsTableLoading(true); // Mulai loading untuk tabel rekap
    let query = supabase.from("rekaman_harian").select("*");
    if (startDate && endDate) {
      query = query.gte("tanggal", startDate).lte("tanggal", endDate);
    }
    const { data, error } = await query.order("tanggal", { ascending: false });
    if (error) {
      console.error("Error fetching rekapitulasi:", error.message);
      Swal.fire("Error", "Gagal mengambil data rekapitulasi.", "error");
      setIsTableLoading(false);
      return;
    }
    setRekapitulasiList(data as Rekapitulasi[]);
    setIsTableLoading(false); // Akhiri loading untuk tabel rekap
  }, [startDate, endDate]);

  const fetchPasienByRekapId = async (rekapId: string): Promise<Pasien[]> => {
    const { data, error } = await supabase
      .from("pasien_harian")
      .select("*")
      .eq("rekaman_harian_id", rekapId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching pasien:", error.message);
      return [];
    }
    return data as Pasien[];
  };

  const fetchPasienByRekapIds = async (rekapIds: string[]): Promise<Pasien[]> => {
    if (!rekapIds.length) return [];
    const { data, error } = await supabase
      .from("pasien_harian")
      .select("*")
      .in("rekaman_harian_id", rekapIds);
    if (error) {
      Swal.fire("Error", error.message, "error");
      return [];
    }
    return data as Pasien[];
  };

  const fetchAllSelectedPasien = useCallback(async () => {
    if (selectedRekapIds.length > 0) {
      setPasienPage(1);
      const pasienData = await fetchPasienByRekapIds(selectedRekapIds);
      setPasienList(pasienData);
    } else {
      setPasienList([]);
    }
  }, [selectedRekapIds]);

  useEffect(() => {
    const fetchUserAndData = async () => {
      setIsTableLoading(true); // Mulai loading untuk tabel rekap
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("nama_lengkap, role")
          .eq("id", user.id)
          .single();
        if (profiles) {
          setUserName(profiles.nama_lengkap);
          setUserRole(profiles.role);
        }
        await fetchRekapitulasi();
        setIsTableLoading(false); // Akhiri loading setelah data awal diambil
      } else {
        router.push("/");
      }
    };
    fetchUserAndData();
  }, [router, fetchRekapitulasi]);
  
  useEffect(() => {
    fetchAllSelectedPasien();
  }, [fetchAllSelectedPasien]);

  useEffect(() => {
    if (selectAllRef.current) {
      const isIndeterminate = selectedRekapIds.length > 0 && selectedRekapIds.length < paginatedRekap.length;
      selectAllRef.current.indeterminate = isIndeterminate;
      setIsAllRekapSelected(selectedRekapIds.length === paginatedRekap.length && paginatedRekap.length > 0);
    }
  }, [selectedRekapIds, paginatedRekap]);

  const handleRekapFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date().setHours(0, 0, 0, 0);
    const selectedDate = new Date(newRekapDate).setHours(0, 0, 0, 0);
    
    if (!newRekapDate) {
      Swal.fire("Peringatan!", "Tanggal wajib diisi.", "warning");
      return;
    }
    
    if (selectedDate > today) {
        Swal.fire("Peringatan!", "Tanggal tidak boleh lebih dari hari ini.", "warning");
        return;
    }
    if (selectedDate < today) {
        Swal.fire("Peringatan!", "Tanggal tidak boleh kurang dari hari ini.", "warning");
        return;
    }

    const { error } = await supabase
      .from("rekaman_harian")
      .insert([{
        tanggal: newRekapDate,
        user_id: userId,
        nama_user: userName,
        total_pembayaran: 0,
        status: "BARU",
      }])
      .select();

    if (error) {
      Swal.fire("Error!", "Gagal membuat rekapitulasi harian baru. Silakan periksa kebijakan RLS (INSERT).", "error");
    } else {
      Swal.fire("Berhasil!", "Rekapitulasi harian berhasil dibuat.", "success");
      setShowRekapModal(false);
      setNewRekapDate("");
      fetchRekapitulasi();
    }
  };

  const handleNumericInputChange = (fieldName: string, value: string) => {
    const formattedValue = formatInputRupiah(value);
    
    setInputDisplay(prev => ({
      ...prev,
      [fieldName]: formattedValue
    }));

    const numericValue = parseRupiahInput(formattedValue);

    setPasienData(prev => ({
      ...prev,
      [fieldName]: numericValue
    }));

    calculateTotals(fieldName, numericValue);
  };

  const calculateTotals = (changedField: string, newValue: number) => {
    const currentData = { ...pasienData };
    
    if (changedField === "jumlah_tagihan") {
      currentData.jumlah_tagihan = newValue;
    } else if (changedField === "diskon") {
      currentData.diskon = newValue;
    } else if (changedField === "bayar_tunai") {
      currentData.bayar_tunai = newValue;
    } else if (changedField === "bayar_transfer") {
      currentData.bayar_transfer = newValue;
    }

    const jumlahBersih = currentData.jumlah_tagihan * (1 - (currentData.diskon / 100));
    
    const totalPembayaran = currentData.bayar_tunai + currentData.bayar_transfer;

    setPasienData(prev => ({
      ...prev,
      jumlah_bersih: jumlahBersih,
      total_pembayaran: totalPembayaran
    }));
  };

  const handlePasienInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (["nomor_rm", "nama_pasien", "tanggal_transfer"].includes(name)) {
      setPasienData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handlePasienSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const { name, value } = e.target;
      if (name === "unit_layanan") {
          setPasienData(prev => ({
              ...prev,
              [name]: value,
              jenis_rawat: unitToJenisRawat[value] || ""
          }));
      } else if (name === "klasifikasi") {
          setPasienData(prev => ({
              ...prev,
              [name]: value
          }));
      }
  };
  
  const updateRekapitulasiTotals = async (rekapId: string) => {
    const pasienData = await fetchPasienByRekapId(rekapId);
    const totalPasien = pasienData.length;
    const totalTagihan = pasienData.reduce((sum: number, item: Pasien) => sum + item.jumlah_tagihan, 0);
    const totalTunai = pasienData.reduce((sum: number, item: Pasien) => sum + item.bayar_tunai, 0);
    const totalTransfer = pasienData.reduce((sum: number, item: Pasien) => sum + item.bayar_transfer, 0);
    const totalPembayaran = totalTunai + totalTransfer;

    await supabase
      .from('rekaman_harian')
      .update({
        total_pasien: totalPasien,
        total_tagihan: totalTagihan,
        total_tunai: totalTunai,
        total_transfer: totalTransfer,
        total_pembayaran: totalPembayaran,
      })
      .eq('id', rekapId);
    fetchRekapitulasi();
  };
  
  const handlePasienFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const rekapIdToSubmit = selectedRekapIds.length > 0 ? selectedRekapIds[0] : null;
    if (!rekapIdToSubmit) {
      Swal.fire("Peringatan!", "Silakan pilih setidaknya satu rekapitulasi harian.", "warning");
      return;
    }

    const dataToSubmit = {
      ...pasienData,
      tanggal_transfer: pasienData.bayar_transfer > 0 ? pasienData.tanggal_transfer : null,
      rekaman_harian_id: rekapIdToSubmit,
      user_id: userId,
    };

    if (dataToSubmit.bayar_transfer > 0 && !dataToSubmit.tanggal_transfer) {
      Swal.fire("Peringatan!", "Tanggal transfer wajib diisi jika ada pembayaran transfer.", "warning");
      return;
    }
    if (!dataToSubmit.nama_pasien || !dataToSubmit.klasifikasi || !dataToSubmit.jenis_rawat || !dataToSubmit.unit_layanan) {
      Swal.fire("Peringatan!", "Harap lengkapi semua data pasien yang wajib diisi.", "warning");
      return;
    }

    let isSuccess = false;
    let successMessage = "";

    if (editPasienId) {
      const { error } = await supabase.from("pasien_harian").update(dataToSubmit).eq("id", editPasienId);
      if (error) {
        Swal.fire("Error!", error.message, "error");
        return;
      }
      isSuccess = true;
      successMessage = "Data pasien berhasil diperbarui.";
    } else {
      const { error } = await supabase.from("pasien_harian").insert([dataToSubmit]);
      if (error) {
        Swal.fire("Error!", error.message, "error");
        return;
      }
      isSuccess = true;
      successMessage = "Pasien baru berhasil ditambahkan.";
    }

    if (isSuccess) {
      Swal.fire("Berhasil!", successMessage, "success");
      resetPasienForm();
      await updateRekapitulasiTotals(rekapIdToSubmit);
      const updatedPasienList = await fetchPasienByRekapIds(selectedRekapIds);
      setPasienList(updatedPasienList);
    }
  };

  const getStatusPembayaran = (jumlahBersih: number, totalPembayaran: number) => {
    if (totalPembayaran === jumlahBersih) {
        return "LUNAS";
    } else if (totalPembayaran < jumlahBersih) {
        return "KURANG BAYAR";
    } else {
        return "LEBIH BAYAR";
    }
  };

  const handleEditPasien = () => {
    if (!selectedPasienId) return;
    const p = pasienList.find(p => p.id === selectedPasienId);
    if (!p) return;
    
    const selectedRekap = rekapitulasiList.find(r => r.id === p.rekaman_harian_id);
    if ((selectedRekap?.status === "TUTUP" || selectedRekap?.status === "BANK") && userRole === "Kasir") {
      Swal.fire("Tidak Diizinkan", "Data sudah ditutup, tidak bisa diubah.", "warning");
      return;
    }
    if (selectedRekap?.status === "BANK") {
        Swal.fire("Tidak Diizinkan", "Data sudah disetor ke bank, tidak bisa diubah.", "warning");
        return;
    }

    setPasienData({
      ...p,
      tanggal_transfer: p.tanggal_transfer || "",
    });

    setInputDisplay({
      jumlah_tagihan: formatNumberDisplay(p.jumlah_tagihan),
      diskon: formatNumberDisplay(p.diskon),
      bayar_tunai: formatNumberDisplay(p.bayar_tunai),
      bayar_transfer: formatNumberDisplay(p.bayar_transfer)
    });

    setEditPasienId(p.id);
    setShowPasienModal(true);
  };

  const handleDeletePasien = async () => {
    if (!selectedPasienId) return;
    const p = pasienList.find(p => p.id === selectedPasienId);
    if (!p) return;
    const rekapId = p.rekaman_harian_id;

    const selectedRekap = rekapitulasiList.find(r => r.id === rekapId);
    if ((selectedRekap?.status === "TUTUP" || selectedRekap?.status === "BANK") && userRole === "Kasir") {
      Swal.fire("Tidak Diizinkan", "Data sudah ditutup, tidak bisa dihapus.", "warning");
      return;
    }
    if (selectedRekap?.status === "BANK") {
        Swal.fire("Tidak Diizinkan", "Data sudah disetor ke bank, tidak bisa dihapus.", "warning");
        return;
    }

    const result = await Swal.fire({
      title: "Apakah Anda yakin?",
      text: `Anda akan menghapus data ${p.nama_pasien}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from("pasien_harian").delete().eq("id", selectedPasienId);
        if (error) throw error;
        Swal.fire("Terhapus!", "Data pasien telah dihapus.", "success");
        setSelectedPasienId(null);
        await updateRekapitulasiTotals(rekapId);
        const updatedPasienList = await fetchPasienByRekapIds(selectedRekapIds);
        setPasienList(updatedPasienList);
      } catch (error) {
        console.error("Error:", error);
        Swal.fire("Error!", "Terjadi kesalahan saat menghapus data.", "error");
      }
    }
  };

  const handleDeleteRekap = async () => {
    if (selectedRekapIds.length === 0) {
      Swal.fire("Info", "Pilih rekapitulasi yang ingin dihapus.", "info");
      return;
    }
    const rekapStatusCheck = rekapitulasiList.filter(r => selectedRekapIds.includes(r.id)).some(r => r.status === "BANK");
    if (rekapStatusCheck) {
        Swal.fire("Tidak Diizinkan", "Tidak bisa menghapus rekapitulasi yang sudah disetor ke bank.", "warning");
        return;
    }

    const result = await Swal.fire({
      title: "Apakah Anda yakin?",
      text: `Menghapus ${selectedRekapIds.length} rekapitulasi harian akan menghapus semua data pasien di dalamnya. Tindakan ini tidak bisa dibatalkan.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from("rekaman_harian").delete().in("id", selectedRekapIds);
        if (error) throw error;
        Swal.fire("Terhapus!", "Data rekapitulasi telah dihapus.", "success");
        setSelectedRekapIds([]);
        setPasienList([]);
        fetchRekapitulasi();
      } catch (error) {
        console.error("Error:", error);
        Swal.fire("Error!", "Terjadi kesalahan saat menghapus data.", "error");
      }
    }
  };

  const handleTutupSetor = async (action: 'tutup' | 'setor') => {
    if (selectedRekapIds.length !== 1) {
      toast.error("Pilih satu rekapitulasi harian untuk diproses.");
      return;
    }
    
    const selectedRekap = rekapitulasiList.find(r => r.id === selectedRekapIds[0]);
    if (!selectedRekap) return;

    try {
      if (action === "tutup") {
        if (selectedRekap.status !== "BARU") {
          toast.error("Hanya rekapitulasi berstatus 'BARU' yang bisa ditutup.");
          return;
        }
        if (userRole === "Kasir" || userRole === "Owner") {
          const { error } = await supabase
            .from("rekaman_harian")
            .update({ status: "TUTUP" })
            .eq("id", selectedRekap.id);
          
          if (error) {
            toast.error("Gagal mengubah status.");
            console.error("Error updating status:", error);
          } else {
            toast.success("Rekapitulasi berhasil ditutup. Siap untuk disetor.");
            // Refresh data setelah berhasil
            await fetchRekapitulasi();
          }
        } else {
          toast.error("Hanya kasir atau owner yang bisa menutup rekapitulasi.");
        }
      } else if (action === "setor") {
        if (selectedRekap.status !== "TUTUP") {
          toast.error("Hanya rekapitulasi berstatus 'TUTUP' yang bisa disetor.");
          return;
        }
        if (userRole === "Owner" || userRole === "Admin" || userRole === "Operator") {
          const { error } = await supabase
            .from("rekaman_harian")
            .update({ status: "BANK" })
            .eq("id", selectedRekap.id);
          
          if (error) {
            toast.error("Gagal menyetor rekapitulasi ke bank.");
            console.error("Error updating status:", error);
          } else {
            toast.success("Rekapitulasi berhasil disetor ke bank.");
            // Refresh data setelah berhasil
            await fetchRekapitulasi();
          }
        } else {
          toast.error("Hanya Owner, Admin, atau Operator yang bisa menyetor ke bank.");
        }
      }
    } catch (error) {
      console.error("Error in handleTutupSetor:", error);
      toast.error("Terjadi kesalahan saat memproses data.");
    }
  };

  const handleDownloadClick = async () => {
    if (selectedRekapIds.length === 0) {
      Swal.fire("Info", "Pilih minimal satu rekapitulasi harian.", "info");
      return;
    }

    const selectedRekaps = rekapitulasiList.filter(r => selectedRekapIds.includes(r.id));
    const isAllZero = selectedRekaps.every(r => r.total_pasien === 0);
    
    if (isAllZero && selectedRekapIds.length > 1) {
      Swal.fire("Peringatan", "Beberapa baris yang Anda pilih tidak memiliki data pasien.", "warning");
      return;
    } else if (isAllZero && selectedRekapIds.length === 1) {
      Swal.fire("Info", "Rekapitulasi ini tidak memiliki data pasien.", "info");
      return;
    }

    const { value: format } = await Swal.fire({
      title: 'Pilih format unduhan',
      input: 'radio',
      inputOptions: {
        'excel': 'Excel',
        'pdf': 'PDF'
      },
      inputValue: 'excel',
      showCancelButton: true,
      confirmButtonText: 'Unduh',
      cancelButtonText: 'Batal'
    });

    if (format === 'excel') {
      handleDownloadExcelMulti();
    } else if (format === 'pdf') {
      handleDownloadPDFMulti();
    }
  };

  const handleDownloadExcelMulti = async () => {
    const pasienMulti = await fetchPasienByRekapIds(selectedRekapIds);
    if (!pasienMulti.length) {
      Swal.fire("Info", "Tidak ada data pasien untuk diunduh.", "info");
      return;
    }
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data Pasien');

    worksheet.columns = [
      { header: 'Tanggal Rekap', key: 'tanggal_rekap', width: 15 },
      { header: 'Tanggal Pasien', key: 'tanggal_pasien', width: 15 },
      { header: 'Nama Pasien', key: 'nama_pasien', width: 25 },
      { header: 'Nomor RM', key: 'nomor_rm', width: 15 },
      { header: 'Klasifikasi', key: 'klasifikasi', width: 15 },
      { header: 'Unit Layanan', key: 'unit_layanan', width: 20 },
      { header: 'Jenis Rawat', key: 'jenis_rawat', width: 15 },
      { header: 'Jumlah Tagihan', key: 'jumlah_tagihan', width: 20 },
      { header: 'Diskon (%)', key: 'diskon', width: 15 },
      { header: 'Jumlah Bersih', key: 'jumlah_bersih', width: 20 },
      { header: 'Bayar Tunai', key: 'bayar_tunai', width: 20 },
      { header: 'Bayar Transfer', key: 'bayar_transfer', width: 20 },
      { header: 'Tanggal Transfer', key: 'tanggal_transfer', width: 20 },
      { header: 'Total Pembayaran', key: 'total_pembayaran', width: 20 },
      { header: 'Status Pembayaran', key: 'status_pembayaran', width: 20 },
    ];
    
    const dataForExcel = pasienMulti.map((p) => ({
      tanggal_rekap: formatDate(rekapitulasiList.find(r => r.id === p.rekaman_harian_id)?.tanggal ?? null),
      tanggal_pasien: formatDate(p.created_at),
      nama_pasien: p.nama_pasien,
      nomor_rm: p.nomor_rm,
      klasifikasi: p.klasifikasi,
      unit_layanan: p.unit_layanan,
      jenis_rawat: p.jenis_rawat,
      jumlah_tagihan: p.jumlah_tagihan,
      diskon: p.diskon,
      jumlah_bersih: p.jumlah_bersih,
      bayar_tunai: p.bayar_tunai,
      bayar_transfer: p.bayar_transfer,
      tanggal_transfer: p.tanggal_transfer || '-',
      total_pembayaran: p.total_pembayaran,
      status_pembayaran: getStatusPembayaran(p.jumlah_bersih, p.total_pembayaran),
    }));

    worksheet.addRows(dataForExcel);
    
    const excelBuffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
    saveAs(blob, `Data Pasien Multi Hari.xlsx`);
  };

  const handleDownloadPDFMulti = async () => {
    const pasienMulti = await fetchPasienByRekapIds(selectedRekapIds);
    if (!pasienMulti.length) {
      Swal.fire("Info", "Tidak ada data pasien untuk diunduh.", "info");
      return;
    }
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text(`Data Pasien Multi Hari`, 14, 20);

    const headers = [['No.', 'Tanggal', 'Nama Pasien', 'No. RM', 'Unit Layanan', 'Jml Bersih', 'Total Bayar', 'Status']];
    const data = pasienMulti.map((p, index) => [
      index + 1,
      formatDate(rekapitulasiList.find(r => r.id === p.rekaman_harian_id)?.tanggal ?? null),
      p.nama_pasien,
      p.nomor_rm,
      p.unit_layanan,
      formatRupiah(p.jumlah_bersih),
      formatRupiah(p.total_pembayaran),
      getStatusPembayaran(p.jumlah_bersih, p.total_pembayaran)
    ]);
    
    // @ts-expect-error - autoTable method exists but types are not properly defined
    doc.autoTable({
      head: headers,
      body: data,
      startY: 30,
      headStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0] },
      didDrawPage: (hookData: { doc: jsPDF, pageNumber: number }) => {
        hookData.doc.text(`Halaman ${hookData.pageNumber}`, hookData.doc.internal.pageSize.width - 20, hookData.doc.internal.pageSize.height - 10, { align: "right" });
      }
    });
    doc.save(`Data Pasien Multi Hari.pdf`);
  };

  const handleRekapCheckbox = (rekapId: string) => {
    setSelectedPasienId(null);
    setSelectedRekapIds((prev) =>
      prev.includes(rekapId)
        ? prev.filter((id) => id !== rekapId)
        : [...prev, rekapId]
    );
  };

  const handleSelectAllRekap = () => {
    if (isAllRekapSelected) {
      setSelectedRekapIds([]);
    } else {
      const allIds = paginatedRekap.map(rekap => rekap.id);
      setSelectedRekapIds(allIds);
    }
  };

  const handlePasienRowClick = (pasien: Pasien) => {
    setSelectedPasienId((prev) => (prev === pasien.id ? null : pasien.id));
  };

  const resetPasienForm = () => {
    setPasienData({
      klasifikasi: "", 
      nomor_rm: "", 
      nama_pasien: "", 
      jenis_rawat: "",
      unit_layanan: "", 
      jumlah_tagihan: 0, 
      diskon: 0, 
      jumlah_bersih: 0,
      bayar_tunai: 0, 
      bayar_transfer: 0, 
      tanggal_transfer: "", 
      total_pembayaran: 0,
      rekaman_harian_id: null, 
      user_id: null,
    });
    setInputDisplay({
      jumlah_tagihan: "",
      diskon: "",
      bayar_tunai: "",
      bayar_transfer: ""
    });
    setEditPasienId(null);
    setSelectedPasienId(null);
    setShowPasienModal(false);
  };

  const handleAddPasienClick = () => {
    if (selectedRekapIds.length === 0) {
      Swal.fire("Info", "Pilih setidaknya satu rekapitulasi harian untuk menambahkan pasien.", "info");
      return;
    }
    if (selectedRekapIds.length > 1) {
      Swal.fire("Info", "Hanya bisa menambah pasien untuk satu rekapitulasi harian saja.", "info");
      return;
    }
    const selectedRekap = rekapitulasiList.find(r => r.id === selectedRekapIds[0]);
    if (selectedRekap?.status !== "BARU" && (userRole === "Kasir")) {
        Swal.fire("Tidak Diizinkan", "Data sudah ditutup, tidak bisa ditambahkan.", "warning");
        return;
    }
    if (selectedRekap?.status === "BANK") {
        Swal.fire("Tidak Diizinkan", "Data sudah disetor ke bank, tidak bisa ditambahkan.", "warning");
        return;
    }

    resetPasienForm();
    setShowPasienModal(true);
  };

  const handleRekapPageChange = (page: number) => {
    setRekapPage(page);
    setSelectedRekapIds([]);
    setPasienList([]);
  };

  const handleRekapItemsPerPageChange = (size: number) => {
    setRekapPerPage(size);
    setRekapPage(1);
    setSelectedRekapIds([]);
    setPasienList([]);
  };

  const getTombolAksiTambahan = () => {
    if (selectedRekapIds.length !== 1) {
      return (
        <>
          <button className={styles.tutupButton} disabled>
            <FaLock /> Tutup
          </button>
          <button className={styles.setorButton} disabled>
            <FaUnlock /> Setor
          </button>
        </>
      );
    }
    
    const selectedRekap = rekapitulasiList.find(r => r.id === selectedRekapIds[0]);
    if (!selectedRekap) {
      return (
        <>
          <button className={styles.disabledButton} disabled>
            <FaLock /> Tutup
          </button>
          <button className={styles.disabledButton} disabled>
            <FaUnlock /> Setor
          </button>
        </>
      );
    }

    if (selectedRekap.status === "BARU") {
      const isAllowed = (userRole === "Kasir" || userRole === "Owner") && selectedRekap.total_pasien > 0;
      return (
        <>
          <button 
            onClick={() => handleTutupSetor('tutup')} 
            className={styles.tutupButton} 
            disabled={!isAllowed}
          >
            <FaLock /> Tutup
          </button>
          <button className={styles.setorButton} disabled>
            <FaUnlock /> Setor
          </button>
        </>
      );
    }
    
    if (selectedRekap.status === "TUTUP") {
      const isAllowed = (userRole === "Owner" || userRole === "Admin" || userRole === "Operator") && selectedRekap.total_pasien > 0;
      return (
        <>
          <button className={styles.tutupButton} disabled>
            <FaLock /> Tutup
          </button>
          <button 
            onClick={() => handleTutupSetor('setor')} 
            className={styles.setorButton} 
            disabled={!isAllowed}
          >
            <FaUnlock /> Setor
          </button>
        </>
      );
    }
    
    if (selectedRekap.status === "BANK") {
      return (
        <>
          <button className={styles.tutupButton} disabled>
            <FaLock /> Tutup
          </button>
          <button className={styles.setorButton} disabled>
            <FaUnlock /> Setor
          </button>
        </>
      );
    }
  };

  const isPasienFormDisabled = () => {
    if (userRole === "Owner" || userRole === "Admin" || userRole === "Operator") {
        return false;
    }

    if (editPasienId) {
      const selectedPasien = pasienList.find(p => p.id === editPasienId);
      if (selectedPasien) {
        const rekap = rekapitulasiList.find(r => r.id === selectedPasien.rekaman_harian_id);
        return rekap?.status === "TUTUP" || rekap?.status === "BANK";
      }
    }
    if (selectedRekapIds.length === 1) {
        const selectedRekap = rekapitulasiList.find(r => r.id === selectedRekapIds[0]);
        return selectedRekap?.status === "TUTUP" || selectedRekap?.status === "BANK";
    }
    return false;
  };

  const isPasienEditDisabled = () => {
    const isOwnerOrAdminOrOperator = userRole === "Owner" || userRole === "Admin" || userRole === "Operator";
    if (isOwnerOrAdminOrOperator) return false;

    if (selectedPasienId) {
        const p = pasienList.find(p => p.id === selectedPasienId);
        if (p) {
            const rekap = rekapitulasiList.find(r => r.id === p.rekaman_harian_id);
            return rekap?.status === "TUTUP" || rekap?.status === "BANK";
        }
    }
    return true;
  };

  const isPasienDeleteDisabled = () => {
    const isOwnerOrAdmin = userRole === "Owner" || userRole === "Admin";
    if (isOwnerOrAdmin) return false;
    
    if (selectedPasienId) {
        const p = pasienList.find(p => p.id === selectedPasienId);
        if (p) {
            const rekap = rekapitulasiList.find(r => r.id === p.rekaman_harian_id);
            return rekap?.status === "TUTUP" || rekap?.status === "BANK";
        }
    }
    return true;
  };

  // Logika untuk menonaktifkan tombol "Download" jika semua baris terpilih memiliki total pasien 0
  const isDownloadDisabled = () => {
    if (selectedRekapIds.length === 0) return true;
    
    const selectedRekaps = rekapitulasiList.filter(r => selectedRekapIds.includes(r.id));
    const hasData = selectedRekaps.some(r => r.total_pasien > 0);
    
    const isRoleAllowed = userRole === "Owner" || userRole === "Operator" || userRole === "Admin";

    return !isRoleAllowed || !hasData;
  };

  return (
    <div className={pageStyles.container}>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            zIndex: '9999',
          },
        }}
      />
      <h2 className={pageStyles.header}>Rekapitulasi Harian</h2>
        
      <div className={pageStyles.buttonContainer}>
        <button
          onClick={() => {
            setNewRekapDate("");
            setShowRekapModal(true);
          }}
          className={styles.rekamButton}
        >
          <FaPlus/>Rekam
        </button>
        <button
          onClick={handleAddPasienClick}
          disabled={selectedRekapIds.length !== 1 || isPasienFormDisabled()}
          className={styles.rekamButton}
        >
          <FaPlus size={14}/> Pasien
        </button>
        <button
          onClick={handleDeleteRekap}
          disabled={selectedRekapIds.length === 0 || !(userRole === "Owner" || userRole === "Admin")}
          className={styles.hapusButton}
        >
          <FaRegTrashAlt/> Hapus
        </button>
        <button
          onClick={handleDownloadClick}
          disabled={isDownloadDisabled()}
          className={styles.downloadButton}
        >
          <FaDownload /> Download
        </button>
        {getTombolAksiTambahan()}
      </div>
    
      {showRekapModal && (
        <Modal onClose={() => setShowRekapModal(false)}>
          <form onSubmit={handleRekapFormSubmit}>
            <h3 style={{ marginTop: "1rem" }}>Tambah Rekapitulasi Baru</h3>
            <div>
              <label className={pageStyles.formLabel}>Tanggal:</label>
              <input
                type="date"
                value={newRekapDate}
                onChange={(e) => setNewRekapDate(e.target.value)}
                required
                className={pageStyles.formInput}
              />
            </div>
            <div className={pageStyles.formActions}>
              <button type="button" onClick={() => setShowRekapModal(false)} style={{ padding: "8px 16px", border: "1px solid #ccc", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}>Batal</button>
              <button type="submit" style={{ background: "#16a34a", color: "white", padding: "8px 16px", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}>Simpan</button>
            </div>
          </form>
        </Modal>
      )}

      {showPasienModal && (
        <Modal onClose={resetPasienForm}>
          <form onSubmit={handlePasienFormSubmit}>
            <h3 style={{ marginTop: 0 }}>{editPasienId ? "Edit Data Pasien" : "Rekam Pasien Baru"} ({selectedRekapIds.length > 1 ? "Beberapa Tanggal Terpilih" : formatDate(rekapitulasiList.find(r => r.id === selectedRekapIds[0])?.tanggal ?? null)})</h3>
              <div className={pageStyles.modalForm}>
              <div className={pageStyles.formGroup}>
                  <label className={pageStyles.formLabel}>Nomor RM:</label>
                  <input
                    type="text"
                    name="nomor_rm"
                    value={pasienData.nomor_rm}
                    onChange={handlePasienInputChange}
                    required
                    className={pageStyles.formInput}
                    disabled={isPasienFormDisabled()}
                  />
                  </div>
                  <div className={pageStyles.formGroup}>
                    <label className={pageStyles.formLabel}>Nama Pasien:</label>
                    <input
                      type="text"
                      name="nama_pasien"
                      value={pasienData.nama_pasien}
                      onChange={handlePasienInputChange}
                      required
                      className={pageStyles.formInput}
                      disabled={isPasienFormDisabled()}
                    />
                  </div>
                  <div className={pageStyles.formGroup}>
                    <label className={pageStyles.formLabel}>Klasifikasi:</label>
                    <select
                      name="klasifikasi"
                      value={pasienData.klasifikasi}
                      onChange={handlePasienSelectChange}
                      required
                      className={pageStyles.formSelect}
                      style={{ backgroundColor: pasienData.klasifikasi ? "white" : "#f3f4f6" }}
                      disabled={isPasienFormDisabled()}>
                      <option value="">-- Pilih Klasifikasi --</option>
                      {klasifikasiOptions.map((k) => (<option key={k} value={k}>{k}</option>))}
                    </select>
                  </div>
                  <div className={pageStyles.formGroup}>
                    <label className={pageStyles.formLabel}>Unit Layanan:</label>
                      <select
                        name="unit_layanan"
                        value={pasienData.unit_layanan}
                        onChange={handlePasienSelectChange}
                        required
                        className={pageStyles.formSelect}
                        style={{ backgroundColor: pasienData.unit_layanan ? "white" : "#f3f4f6" }}
                        disabled={isPasienFormDisabled()}>
                        <option value="">-- Pilih Unit Layanan --</option>
                        {unitLayananOptions.map((unit) => (<option key={unit} value={unit}>{unit}</option>))}
                      </select>
                  </div>
                  <div className={pageStyles.formGroup}>
                    <label className={pageStyles.formLabel}>Jenis Rawat:</label>
                    <input
                      type="text"
                      name="jenis_rawat"
                      value={pasienData.jenis_rawat}
                      disabled
                      className={`${pageStyles.formInput} ${pageStyles.readOnly}`}
                    />
                  </div>
                  <div className={pageStyles.formGroup}>
                    <label className={pageStyles.formLabel}>Jumlah Tagihan:</label>
                    <input
                      type="text"
                      name="jumlah_tagihan"
                      value={inputDisplay.jumlah_tagihan}
                      onChange={(e) => handleNumericInputChange("jumlah_tagihan", e.target.value)}
                      className={pageStyles.formInput}
                      placeholder="0"
                      disabled={isPasienFormDisabled()}
                    />
                  </div>
                  <div className={pageStyles.formGroup}>
                    <label className={pageStyles.formLabel}>Diskon (%):</label>
                      <input
                      type="text"
                      name="diskon"
                      value={inputDisplay.diskon}
                      onChange={(e) => handleNumericInputChange("diskon", e.target.value)}
                      className={pageStyles.formInput}
                      placeholder="0"
                      disabled={isPasienFormDisabled()}
                    />
                  </div>
                  <div className={pageStyles.formGroup}>
                    <label className={pageStyles.formLabel}>Jumlah Bersih:</label>
                      <input
                        type="text"
                        name="jumlah_bersih"
                        value={formatRupiah(pasienData.jumlah_bersih)}
                        readOnly
                        disabled
                        className={`${pageStyles.formInput} ${pageStyles.readOnly}`}
                      />
                  </div>
                  <hr className={pageStyles.pemisahForm} />
                  <div className={pageStyles.formGroup}>
                    <label className={pageStyles.formLabel}>Bayar Tunai:</label>
                    <input
                      type="text"
                      name="bayar_tunai"
                      value={inputDisplay.bayar_tunai}
                      onChange={(e) => handleNumericInputChange("bayar_tunai", e.target.value)}
                      className={pageStyles.formInput}
                      placeholder="0"
                      disabled={isPasienFormDisabled()}
                    />
                  </div>
                  <div className={pageStyles.formGroup}>
                    <label className={pageStyles.formLabel}>Bayar Transfer:</label>
                    <input
                      type="text"
                      name="bayar_transfer"
                      value={inputDisplay.bayar_transfer}
                      onChange={(e) => handleNumericInputChange("bayar_transfer", e.target.value)}
                      className={pageStyles.formInput}
                      placeholder="0"
                      disabled={isPasienFormDisabled()}
                    />
                  </div>
                  <div className={pageStyles.formGroup}>
                    <label className={pageStyles.formLabel}>Tanggal Transfer:</label>
                      <input
                        type="date"
                        name="tanggal_transfer"
                        value={pasienData.tanggal_transfer}
                        onChange={handlePasienInputChange}
                        disabled={!pasienData.bayar_transfer || pasienData.bayar_transfer === 0 || isPasienFormDisabled()}
                        className={pageStyles.formSelect}
                        style={{ backgroundColor: !pasienData.bayar_transfer || pasienData.bayar_transfer === 0 || isPasienFormDisabled() ? "#e9ecef" : "white" }}
                      />
                  </div>
                  <div className={pageStyles.formGroup}>
                    <label className={pageStyles.formLabel}>Total Pembayaran:</label>
                      <input
                        type="text"
                        name="total_pembayaran"
                        value={formatRupiah(pasienData.total_pembayaran)}
                        readOnly
                        disabled
                        className={`${pageStyles.formInput} ${pageStyles.readOnly}`}
                      />
                  </div>
                  <div className={pageStyles.formGroup}>
                    <label className={pageStyles.formLabel}>Status Pembayaran:</label>
                      <input
                        type="text"
                        name="status_pembayaran"
                        value={getStatusPembayaran(Number(pasienData.jumlah_bersih), Number(pasienData.total_pembayaran))}
                        readOnly
                        disabled
                        className={`${pageStyles.formInput} ${pageStyles.readOnly}`}
                      />
                  </div>
              </div>

            <div className={pageStyles.formActions}>
                <button type="button" onClick={resetPasienForm} style={{ padding: "8px 16px", border: "1px solid #ccc", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}>Batal</button>
                <button type="submit" style={{ background: "#16a34a", color: "white", padding: "8px 16px", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }} disabled={isPasienFormDisabled()}>{editPasienId ? "Update" : "Simpan"}</button>
            </div>
          </form>
        </Modal>
      )}

     <div className={pageStyles.tableContainer}>
  <div className={pageStyles.tableWrapper}>
    {isTableLoading && (
      <div className={pageStyles.tableOverlay}>
        <div className={loadingStyles.dotContainer}>
          <div className={`${loadingStyles.dot} ${loadingStyles['dot-1']}`} />
          <div className={`${loadingStyles.dot} ${loadingStyles['dot-2']}`} />
          <div className={`${loadingStyles.dot} ${loadingStyles['dot-3']}`} />
        </div>
      </div>
    )}
    
    <table className={pageStyles.table}>
      <thead className={pageStyles.tableHead}>
        <tr>
          <th style={{ width: "2%" }}>
            <input
              type="checkbox"
              ref={selectAllRef}
              checked={isAllRekapSelected}
              onChange={handleSelectAllRekap}
              style={{ transform: "scale(1.2)" }}
            />
          </th>
          <th>Tanggal</th>
          <th>Nama User</th>
          <th style={{ textAlign: "center" }}>Total Pasien</th>
          <th style={{ textAlign: "right" }}>Total Tagihan</th>
          <th style={{ textAlign: "right" }}>Bayar Tunai</th>
          <th style={{ textAlign: "right" }}>Bayar Transfer</th>
          <th style={{ textAlign: "right" }}>Total Pembayaran</th>
          <th style={{ textAlign: "center" }}>Status</th>
        </tr>
      </thead>
      <tbody className={pageStyles.tableBody}>
        {paginatedRekap.length > 0 ? (
          paginatedRekap.map((rekap) => (
            <tr
              key={rekap.id}
              className={`${pageStyles.tableRow} ${selectedRekapIds.includes(rekap.id) ? pageStyles.selected : ""}`}
            >
              <td>
                <div style={{display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={selectedRekapIds.includes(rekap.id)}
                    onChange={() => handleRekapCheckbox(rekap.id)}
                    style={{ transform: "scale(1.2)" }}
                  />
                </div>
              </td>
              <td>{formatDate(rekap.tanggal)}</td>
              <td>{rekap.nama_user}</td>
              <td style={{ textAlign: "center" }}>{rekap.total_pasien}</td>
              <td style={{ textAlign: "right" }}>{formatRupiah(rekap.total_tagihan)}</td>
              <td style={{ textAlign: "right" }}>{formatRupiah(rekap.total_tunai)}</td>
              <td style={{ textAlign: "right" }}>{formatRupiah(rekap.total_transfer)}</td>
              <td style={{ textAlign: "right" }}>{formatRupiah(rekap.total_pembayaran)}</td>
              <td style={{ textAlign: "center" }}>{rekap.status}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={9} className={pageStyles.tableEmpty}>
              Tidak ada data rekapitulasi yang ditemukan.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</div>

      <Paginasi
        currentPage={rekapPage}
        totalPages={totalRekapPages}
        totalItems={rekapitulasiList.length}
        itemsPerPage={rekapPerPage}
        onPageChange={handleRekapPageChange}
        onItemsPerPageChange={handleRekapItemsPerPageChange}
      />

      <div className={pageStyles.detailContainer}>
       <div className={pageStyles.detailHeader}>Data Pasien</div>
        <div className={pageStyles.buttonContainer} style={{ margin: "1rem" }}>
            <button
                onClick={handleEditPasien}
                disabled={!selectedPasienId || isPasienEditDisabled()}
                className={styles.editButton}
            >
                <FaEdit/> Edit
            </button>
            <button
                onClick={handleDeletePasien}
                disabled={!selectedPasienId || isPasienDeleteDisabled()}
                className={styles.hapusButton}
            >
                <FaRegTrashAlt /> Hapus
            </button>
        </div>
      
        <div className={pageStyles.detailtableContainer}>
          <table className={pageStyles.table}>
            <thead className={pageStyles.tableHead}>
              <tr>
                <th style={{ width: "10%", padding: "0.5rem 1.5rem" }}>Tanggal Bayar</th>
                <th style={{ width: "20%" }}>Nama Pasien</th>
                <th style={{ width: "10%" }}>Nomor RM</th>
                <th style={{ width: "10%" }}>Unit Layanan</th>
                <th style={{ width: "10%", textAlign: "right" }}>Jumlah Tagihan</th>
                <th style={{ width: "5%", textAlign: "right" }}>Diskon</th>
                <th style={{ width: "10%", textAlign: "right" }}>Jumlah Bersih</th>
                <th style={{ width: "10%", textAlign: "right" }}>Total Bayar</th>
                <th style={{ width: "10%", textAlign: "center" }}>Status Pembayaran</th>
              </tr>
            </thead>
            <tbody className={pageStyles.tableBody}>
              {paginatedPasien.length > 0 ? (
                paginatedPasien.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => handlePasienRowClick(p)}
                    className={`${pageStyles.tableRow} ${selectedPasienId === p.id ? pageStyles.selected : ""}`}
                  >
                    <td>{formatDate(p.tanggal_transfer || (rekapitulasiList.find(r => r.id === p.rekaman_harian_id)?.tanggal ?? null))}</td>
                    <td>{p.nama_pasien}</td>
                    <td>{p.nomor_rm}</td>
                    <td>{p.unit_layanan}</td>
                    <td style={{ textAlign: "right" }}>{formatRupiah(p.jumlah_tagihan)}</td>
                    <td style={{ textAlign: "right" }}>{(p.diskon) + "%"}</td>
                    <td style={{ textAlign: "right" }}>{formatRupiah(p.jumlah_bersih)}</td>
                    <td style={{ textAlign: "right" }}>{formatRupiah(p.total_pembayaran)}</td>
                    <td style={{ textAlign: "center" }}>{getStatusPembayaran(p.jumlah_bersih, p.total_pembayaran)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className={pageStyles.tableEmpty}>
                    {selectedRekapIds.length > 0 ? "Tidak ada pasien untuk tanggal yang dipilih." : "Silakan pilih tanggal rekapitulasi di atas."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}