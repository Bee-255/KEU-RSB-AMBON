'use client';

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import Swal from "sweetalert2";
import * as ExcelJS from 'exceljs';
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import { applyPlugin } from "jspdf-autotable";
import { FaPlus, FaEdit, FaRegTrashAlt, FaDownload } from "react-icons/fa";
import Paginasi from '@/components/paginasi';
import styles from "@/styles/button.module.css";
import pageStyles from "@/styles/komponen.module.css";

// Perbaikan: Menambahkan deklarasi tipe untuk plugin jspdf-autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF; // Tipe ini sudah ada, akan kita biarkan untuk autoTable
  }
}
applyPlugin(jsPDF);

// Perbaikan: Menambahkan deklarasi tipe untuk props komponen Modal
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

// Fungsi utilitas di luar komponen untuk efisiensi
const formatDate = (dateString: string | null) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatted = date.toLocaleDateString('id-ID', options);
  return formatted.replace(/\//g, '-');
};

const formatRupiah = (number: number | string | null) => {
  if (number === null) return "-";
  const num = typeof number === 'string' ? parseFloat(number) : number;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

const formatToNumber = (str: string | number) => {
  if (typeof str !== 'string' && typeof str !== 'number') {
    return 0;
  }
  const cleaned = String(str).replace(/[^\d]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
};

const formatRupiahDisplay = (num: number | string) => {
  if (num === null || isNaN(Number(num)) || String(num) === "") return "";
  return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
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
  // Perbaikan: Variabel ini tidak digunakan, bisa dihapus
  // const [selectedPasien, setSelectedPasien] = useState<Pasien | null>(null); 
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedRekapIds, setSelectedRekapIds] = useState<string[]>([]);
  
  // Perbaikan: Menambahkan tipe data awal untuk state
  const [pasienData, setPasienData] = useState<{
    klasifikasi: string, nomor_rm: string, nama_pasien: string, jenis_rawat: string,
    unit_layanan: string, jumlah_tagihan: string | number, diskon: string | number, jumlah_bersih: string | number,
    bayar_tunai: string | number, bayar_transfer: string | number, tanggal_transfer: string, total_pembayaran: string | number,
    rekaman_harian_id: string | null, user_id: string | null
  }>({
    klasifikasi: "", nomor_rm: "", nama_pasien: "", jenis_rawat: "",
    unit_layanan: "", jumlah_tagihan: "", diskon: "", jumlah_bersih: "",
    bayar_tunai: "", bayar_transfer: "", tanggal_transfer: "", total_pembayaran: "",
    rekaman_harian_id: null, user_id: null,
  });

  const [newRekapDate, setNewRekapDate] = useState("");

  const [rekapPage, setRekapPage] = useState(1);
  const [rekapPerPage, setRekapPerPage] = useState(5);
  const rekapStartIndex = (rekapPage - 1) * rekapPerPage;
  const rekapEndIndex = rekapStartIndex + rekapPerPage;
  const paginatedRekap = rekapitulasiList.slice(rekapStartIndex, rekapEndIndex);
  const totalRekapPages = Math.ceil(rekapitulasiList.length / rekapPerPage);

  const [pasienPage, setPasienPage] = useState(1);
  const [pasienPerPage, setPasienPerPage] = useState(10);
  const pasienStartIndex = (pasienPage - 1) * pasienPerPage;
  const pasienEndIndex = pasienStartIndex + pasienPerPage;
  const paginatedPasien = pasienList.slice(pasienStartIndex, pasienEndIndex);
  // Perbaikan: Variabel ini tidak digunakan, bisa dihapus
  // const totalPasienPages = Math.ceil(pasienList.length / pasienPerPage);

  const [isAllRekapSelected, setIsAllRekapSelected] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const fetchRekapitulasi = useCallback(async (id: string | null) => {
    let query = supabase.from("rekaman_harian").select("*");
    if (startDate && endDate) {
      query = query.gte("tanggal", startDate).lte("tanggal", endDate);
    }
    const { data, error } = await query.order("tanggal", { ascending: false });
    if (error) {
      console.error("Error fetching rekapitulasi:", error.message);
      return;
    }
    // Perbaikan: Menambahkan tipe `as Rekapitulasi[]` untuk kejelasan
    setRekapitulasiList(data as Rekapitulasi[]);
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
        fetchRekapitulasi(user.id);
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

    const { data, error } = await supabase
      .from("rekaman_harian")
      .insert([{
        tanggal: newRekapDate,
        user_id: userId,
        nama_user: userName,
        total_pembayaran: 0,
        status: "KASIR",
      }])
      .select();

    if (error) {
      Swal.fire("Error!", "Gagal membuat rekapitulasi harian baru. Silakan periksa kebijakan RLS (INSERT).", "error");
    } else {
      Swal.fire("Berhasil!", "Rekapitulasi harian berhasil dibuat.", "success");
      setShowRekapModal(false);
      setNewRekapDate("");
      fetchRekapitulasi(userId);
    }
  };

  const handlePasienFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let updatedPasienData = { ...pasienData, [name]: value };

    if (name === "unit_layanan") {
      updatedPasienData.jenis_rawat = unitToJenisRawat[value] || "";
    }

    if (["jumlah_tagihan", "bayar_tunai", "bayar_transfer", "diskon"].includes(name)) {
      const rawValue = formatToNumber(value.toString());
      updatedPasienData = { ...updatedPasienData, [name]: rawValue };
    }

    const jumlahTagihan = formatToNumber(updatedPasienData.jumlah_tagihan);
    const diskon = formatToNumber(updatedPasienData.diskon);
    const bayarTunai = formatToNumber(updatedPasienData.bayar_tunai);
    const bayarTransfer = formatToNumber(updatedPasienData.bayar_transfer);

    const jumlahBersih = jumlahTagihan * (1 - (diskon / 100));
    const totalPembayaran = bayarTunai + bayarTransfer;

    setPasienData({
      ...updatedPasienData,
      jumlah_tagihan: formatRupiahDisplay(jumlahTagihan),
      diskon: formatRupiahDisplay(diskon),
      bayar_tunai: formatRupiahDisplay(bayarTunai),
      bayar_transfer: formatRupiahDisplay(bayarTransfer),
      jumlah_bersih: jumlahBersih,
      total_pembayaran: totalPembayaran,
    });
  };

  const updateRekapitulasiTotals = async (rekapId: string) => {
    const pasienData = await fetchPasienByRekapId(rekapId);
    const totalPasien = pasienData.length;
    const totalTagihan = pasienData.reduce((sum: number, item: Pasien) => sum + item.jumlah_tagihan, 0);
    const totalTunai = pasienData.reduce((sum: number, item: Pasien) => sum + item.bayar_tunai, 0);
    const totalTransfer = pasienData.reduce((sum: number, item: Pasien) => sum + item.bayar_transfer, 0);
    const totalPembayaran = totalTunai + totalTransfer;

    let rekapStatus = "KASIR";
    if (totalPasien > 0) {
        const allPatientsPaid = pasienData.every((p: Pasien) => getStatus(p.jumlah_bersih, p.total_pembayaran) === "LUNAS");
        if (allPatientsPaid) {
            rekapStatus = "LUNAS";
        } else {
            rekapStatus = "BELUM LUNAS";
        }
    }

    await supabase
      .from('rekaman_harian')
      .update({
        total_pasien: totalPasien,
        total_tagihan: totalTagihan,
        total_tunai: totalTunai,
        total_transfer: totalTransfer,
        total_pembayaran: totalPembayaran,
        status: rekapStatus,
      })
      .eq('id', rekapId);
    fetchRekapitulasi(userId);
  };
  
  const handlePasienFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const rekapIdToSubmit = selectedRekapIds.length > 0 ? selectedRekapIds[0] : null;
    if (!rekapIdToSubmit) {
      Swal.fire("Peringatan!", "Silakan pilih setidaknya satu rekapitulasi harian.", "warning");
      return;
    }

    // Perbaikan: Konversi tipe data sebelum submit
    const dataToSubmit = {
      ...pasienData,
      tanggal_transfer: pasienData.bayar_transfer ? pasienData.tanggal_transfer : null,
      jumlah_tagihan: Number(pasienData.jumlah_tagihan),
      diskon: Number(pasienData.diskon),
      jumlah_bersih: Number(pasienData.jumlah_bersih),
      bayar_tunai: Number(pasienData.bayar_tunai),
      bayar_transfer: Number(pasienData.bayar_transfer),
      total_pembayaran: Number(pasienData.total_pembayaran),
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

  const getStatus = (jumlahBersih: number, totalPembayaran: number) => {
    if (totalPembayaran === jumlahBersih) {
        return "LUNAS";
    } else if (totalPembayaran < jumlahBersih) {
        return "BELUM LUNAS";
    } else {
        return "LEBIH BAYAR";
    }
  };

  const handleEditPasien = () => {
    if (!selectedPasienId) return;
    const p = pasienList.find(p => p.id === selectedPasienId);
    if (!p) return;
    setPasienData({
      ...p,
      jumlah_tagihan: formatRupiahDisplay(p.jumlah_tagihan),
      diskon: formatRupiahDisplay(p.diskon),
      jumlah_bersih: p.jumlah_bersih,
      bayar_tunai: formatRupiahDisplay(p.bayar_tunai),
      bayar_transfer: formatRupiahDisplay(p.bayar_transfer),
      total_pembayaran: p.total_pembayaran,
      tanggal_transfer: p.tanggal_transfer || "",
    });
    setEditPasienId(p.id);
    // Perbaikan: Variabel ini tidak digunakan, bisa dihapus
    // setSelectedPasien(p);
    setShowPasienModal(true);
  };

  const handleDeletePasien = async () => {
    if (!selectedPasienId) return;
    const p = pasienList.find(p => p.id === selectedPasienId);
    if (!p) return;
    const rekapId = p.rekaman_harian_id;
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
        fetchRekapitulasi(userId);
      } catch (error) {
        console.error("Error:", error);
        Swal.fire("Error!", "Terjadi kesalahan saat menghapus data.", "error");
      }
    }
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
      klasifikasi: "", nomor_rm: "", nama_pasien: "", jenis_rawat: "",
      unit_layanan: "", jumlah_tagihan: "", diskon: "", jumlah_bersih: "",
      bayar_tunai: "", bayar_transfer: "", tanggal_transfer: "", total_pembayaran: "",
      rekaman_harian_id: null, user_id: null,
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
    resetPasienForm();
    setShowPasienModal(true);
  };

  const handleDownloadClick = async () => {
    if (selectedRekapIds.length === 0) {
      Swal.fire("Info", "Pilih minimal satu rekapitulasi harian.", "info");
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

  // Perbaikan: Ganti fungsi XLSX dengan ExcelJS
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
      { header: 'Status', key: 'status', width: 15 },
    ];
    
    // Perbaikan: Mengubah tipe data 'any' menjadi 'Pasien'
    const dataForExcel = pasienMulti.map((p: Pasien) => ({
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
      status: getStatus(p.jumlah_bersih, p.total_pembayaran),
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
    // Perbaikan: Mengubah tipe data 'any' menjadi 'Pasien'
    const data = pasienMulti.map((p: Pasien, index: number) => [
      index + 1,
      formatDate(rekapitulasiList.find(r => r.id === p.rekaman_harian_id)?.tanggal ?? null),
      p.nama_pasien,
      p.nomor_rm,
      p.unit_layanan,
      formatRupiah(p.jumlah_bersih),
      formatRupiah(p.total_pembayaran),
      getStatus(p.jumlah_bersih, p.total_pembayaran)
    ]);
    doc.autoTable({
      head: headers,
      body: data,
      startY: 30,
      headStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0] },
      // Perbaikan: Menghilangkan tipe 'any' yang tidak perlu
      didDrawPage: function(data) {
        doc.text("Halaman " + doc.internal.getNumberOfPages(), doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, { align: "right" });
      }
    });
    doc.save(`Data Pasien Multi Hari.pdf`);
  };

  // Perbaikan: Fungsi ini tidak digunakan di mana pun, jadi bisa dihapus.
  // const handleClearFilter = () => {
  //   setStartDate("");
  //   setEndDate("");
  // };

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

  // Perbaikan: Fungsi ini tidak digunakan di mana pun, jadi bisa dihapus.
  // const handlePasienPageChange = (page: number) => {
  //   setPasienPage(page);
  //   setSelectedPasienId(null);
  // };
  
  // Perbaikan: Fungsi ini tidak digunakan di mana pun, jadi bisa dihapus.
  // const handlePasienItemsPerPageChange = (size: number) => {
  //   setPasienPerPage(size);
  //   setPasienPage(1);
  //   setSelectedPasienId(null);
  // };
  return (
    <div className={pageStyles.container}>
      <h2 className={pageStyles.header}>Rekapitulasi Harian</h2>
        
      {/* Grup Kiri: Tombol Aksi */}
      <div className={pageStyles.buttonContainer}>
        {/* Tombol Rekam: Selalu aktif karena bisa diakses semua role */}
        <button
          onClick={() => {
            setNewRekapDate("");
            setShowRekapModal(true);
          }}
          className={styles.rekamButton}
        >
          <FaPlus/>Rekam
        </button>
        {/* Tombol Tambah Pasien: Selalu aktif karena bisa diakses semua role */}
        <button
          onClick={handleAddPasienClick}
          disabled={selectedRekapIds.length !== 1}
          className={styles.rekamButton}
        >
          <FaPlus size={14}/> Pasien
        </button>
        {/* Tombol Hapus Rekap: Dinonaktifkan jika bukan Owner */}
        <button
          onClick={handleDeleteRekap}
          disabled={selectedRekapIds.length === 0 || !(userRole === "Owner" || userRole === "Admin")}
          className={styles.hapusButton}
        >
          <FaRegTrashAlt/> Hapus
        </button>
        {/* Tombol Download: Dinonaktifkan jika bukan Operator atau Admin */}
        <button
          onClick={handleDownloadClick}
          disabled={selectedRekapIds.length === 0 || !(userRole === "Owner" || userRole === "Operator" || userRole === "Admin")}
          className={styles.downloadButton}
        >
          <FaDownload /> Download
        </button>
      </div>
    
      {/* Modal Tambah Rekapitulasi Baru */}
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

      {/* Modal Rekam Pasien */}
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
                    onChange={handlePasienFormChange}
                    required
                    className={pageStyles.formInput}
                  />
                  </div>
                  <div className={pageStyles.formGroup}>
                    <label className={pageStyles.formLabel}>Nama Pasien:</label>
                    <input
                      type="text"
                      name="nama_pasien"
                      value={pasienData.nama_pasien}
                      onChange={handlePasienFormChange}
                      required
                      className={pageStyles.formInput}
                    />
                  </div>
                  <div className={pageStyles.formGroup}>
                    <label className={pageStyles.formLabel}>Klasifikasi:</label>
                    <select
                      name="klasifikasi"
                      value={pasienData.klasifikasi}
                      onChange={handlePasienFormChange}
                      required
                      className={pageStyles.formSelect}
                      style={{ backgroundColor: pasienData.klasifikasi ? "white" : "#f3f4f6" }}>
                      <option value="">-- Pilih Klasifikasi --</option>
                      {klasifikasiOptions.map((k) => (<option key={k} value={k}>{k}</option>))}
                    </select>
                  </div>
                  <div className={pageStyles.formGroup}>
                    <label className={pageStyles.formLabel}>Unit Layanan:</label>
                      <select
                        name="unit_layanan"
                        value={pasienData.unit_layanan}
                        onChange={handlePasienFormChange}
                        required
                        className={pageStyles.formSelect}
                        style={{ backgroundColor: pasienData.unit_layanan ? "white" : "#f3f4f6" }}>
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
                      value={pasienData.jumlah_tagihan}
                      onChange={handlePasienFormChange}
                      className={pageStyles.formInput}
                    />
                  </div>
                  <div className={pageStyles.formGroup}>
                    <label className={pageStyles.formLabel}>Diskon (%):</label>
                      <input
                      type="text"
                      name="diskon"
                      value={pasienData.diskon}
                      onChange={handlePasienFormChange}
                      className={pageStyles.formInput}
                    />
                  </div>
                  <div className={pageStyles.formGroup}>
                    <label className={pageStyles.formLabel}>Jumlah Bersih:</label>
                      <input
                        type="text"
                        name="jumlah_bersih"
                        value={formatRupiah(Number(pasienData.jumlah_bersih))}
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
                      value={pasienData.bayar_tunai}
                      onChange={handlePasienFormChange}
                      className={pageStyles.formInput}
                    />
                  </div>
                  <div className={pageStyles.formGroup}>
                    <label className={pageStyles.formLabel}>Bayar Transfer:</label>
                    <input
                      type="text"
                      name="bayar_transfer"
                      value={pasienData.bayar_transfer}
                      onChange={handlePasienFormChange}
                      className={pageStyles.formInput}
                    />
                  </div>
                  <div className={pageStyles.formGroup}>
                    <label className={pageStyles.formLabel}>Tanggal Transfer:</label>
                      <input
                        type="date"
                        name="tanggal_transfer"
                        value={pasienData.tanggal_transfer}
                        onChange={handlePasienFormChange}
                        disabled={!pasienData.bayar_transfer || formatToNumber(pasienData.bayar_transfer) === 0}
                        className={pageStyles.formSelect}
                        style={{ backgroundColor: !pasienData.bayar_transfer || formatToNumber(pasienData.bayar_transfer) === 0 ? "#e9ecef" : "white" }}
                      />
                  </div>
                  <div className={pageStyles.formGroup}>
                    <label className={pageStyles.formLabel}>Total Pembayaran:</label>
                      <input
                        type="text"
                        name="total_pembayaran"
                        value={formatRupiah(Number(pasienData.total_pembayaran))}
                        readOnly
                        disabled
                        className={`${pageStyles.formInput} ${pageStyles.readOnly}`}
                      />
                  </div>
                  <div className={pageStyles.formGroup}>
                    <label className={pageStyles.formLabel}>Status:</label>
                      <input
                        type="text"
                        name="status"
                        value={getStatus(Number(pasienData.jumlah_bersih), Number(pasienData.total_pembayaran))}
                        readOnly
                        disabled
                        className={`${pageStyles.formInput} ${pageStyles.readOnly}`}
                      />
                  </div>
              </div>

            <div className={pageStyles.formActions}>
                <button type="button" onClick={resetPasienForm} style={{ padding: "8px 16px", border: "1px solid #ccc", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}>Batal</button>
                <button type="submit" style={{ background: "#16a34a", color: "white", padding: "8px 16px", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}>{editPasienId ? "Update" : "Simpan"}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Tabel data rekap harian */}
      <div className={pageStyles.tableContainer}>
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
              <th style={{ textAlign: "center" }}>Total Tagihan</th>
              <th style={{ textAlign: "center" }}>Bayar Tunai</th>
              <th style={{ textAlign: "center" }}>Bayar Transfer</th>
              <th style={{ textAlign: "center" }}>Total Pembayaran</th>
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

      {/* Rekap Pagination */}
      <Paginasi
        currentPage={rekapPage}
        totalPages={totalRekapPages}
        totalItems={rekapitulasiList.length}
        itemsPerPage={rekapPerPage}
        onPageChange={handleRekapPageChange}
        onItemsPerPageChange={handleRekapItemsPerPageChange}
      />

      {/* DETAIL Data Pasien */}
      <div className={pageStyles.detailContainer}>
       <div className={pageStyles.detailHeader}>Data Pasien</div>
        <div className={pageStyles.buttonContainer} style={{ margin: "1rem" }}>
            {/* Tombol Edit: Dinonaktifkan jika bukan Owner atau Admin, atau tidak ada pasien yang dipilih */}
            <button
                onClick={handleEditPasien}
                disabled={!selectedPasienId || !(userRole === "Owner" || userRole === "Admin"  || userRole === "Kasir")}
                className={styles.editButton}
            >
                <FaEdit/> Edit
            </button>
            {/* Tombol Hapus: Dinonaktifkan jika bukan Owner, atau tidak ada pasien yang dipilih */}
            <button
                onClick={handleDeletePasien}
                disabled={!selectedPasienId || userRole !== "Owner"}
                className={styles.hapusButton}
            >
                <FaRegTrashAlt /> Hapus
            </button>
        </div>
      
        {/* Tabel Detail Data Pasien */}
        <div className={pageStyles.tableContainer}>
          <table className={pageStyles.table}>
            <thead className={pageStyles.tableHead}>
              <tr>
                <th style={{ width: "10%", padding: "0.5rem 1.5rem" }}>Tanggal</th>
                <th style={{ width: "20%" }}>Nama Pasien</th>
                <th style={{ width: "10%" }}>Nomor RM</th>
                <th style={{ width: "10%" }}>Unit Layanan</th>
                <th style={{ width: "10%", textAlign: "right" }}>Jumlah Tagihan</th>
                <th style={{ width: "5%", textAlign: "right" }}>Diskon</th>
                <th style={{ width: "10%", textAlign: "right" }}>Jumlah Bersih</th>
                <th style={{ width: "10%", textAlign: "right" }}>Total Bayar</th>
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
                    {/* Perbaikan: Mengubah parameter 'id' menjadi 'p' untuk menghindari peringatan */}
                    <td>{formatDate(rekapitulasiList.find(r => r.id === p.rekaman_harian_id)?.tanggal ?? null)}</td>
                    <td>{p.nama_pasien}</td>
                    <td>{p.nomor_rm}</td>
                    <td>{p.unit_layanan}</td>
                    <td style={{ textAlign: "right" }}>{formatRupiah(p.jumlah_tagihan)}</td>
                    <td style={{ textAlign: "right" }}>{(p.diskon) + "%"}</td>
                    <td style={{ textAlign: "right" }}>{formatRupiah(p.jumlah_bersih)}</td>
                    <td style={{ textAlign: "right" }}>{formatRupiah(p.total_pembayaran)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className={pageStyles.tableEmpty}>
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