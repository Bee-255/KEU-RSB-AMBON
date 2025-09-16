import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import Swal from "sweetalert2";
import Layout from "../components/Layout";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import { applyPlugin } from "jspdf-autotable";

applyPlugin(jsPDF);

// Komponen Modal Pop-up
const Modal = ({ children, onClose }) => (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    }}
    onClick={onClose}
  >
    <div
      style={{
        backgroundColor: "white",
        padding: "2rem",
        borderRadius: "8px",
        position: "relative",
        maxWidth: "90%",
        maxHeight: "90vh",
        overflowY: "auto",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  </div>
);

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const options = { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatted = date.toLocaleDateString('id-ID', options);
  return formatted.replace(/\//g, '-');
};

const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
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

const unitToJenisRawat = {
  "IGD": "Rawat Jalan", "POLI UMUM": "Rawat Jalan", "POLI JIWA": "Rawat Jalan",
  "POLI GIGI": "Rawat Jalan", "POLI PENYAKIT DALAM": "Rawat Jalan",
  "POLI BEDAH GIGI DAN MULUT": "Rawat Jalan", "POLI ORTHOPEDI": "Rawat Jalan",
  "POLI KEBIDANAN/OBGYN": "Rawat Jalan", "POLI EKG": "Rawat Jalan",
  "POLI MATA": "Rawat Jalan", "POLI PARU": "Rawat Jalan", "POLI THT": "Rawat Jalan",
  "POLI JANTUNG": "Rawat Jalan", "POLI ANAK": "Rawat Jalan", "POLI SARAF": "Rawat Jalan",
  "POLI KULIT DAN KELAMIN": "Rawat Jalan", "POLI BEDAH": "Rawat Jalan",
  "VVIP": "Rawat Inap", "VIP": "Rawat Inap", "ANGGREK KELAS 1": "Rawat Inap",
  "ANGGREK KELAS 2": "Rawat Inap", "MELATI KELAS 1": "Rawat Inap",
  "MELATI KELAS 2": "Rawat Inap", "MELATI KELAS 3": "Rawat Inap",
  "MUTIARA KELAS 1": "Rawat Inap", "MUTIARA KELAS 2": "Rawat Inap",
  "MUTIARA KELAS 3": "Rawat Inap", "RUANGAN RAWAT ICU": "Rawat Inap",
  "RUANGAN KEBIDANAN": "Rawat Inap", "RADIOLOGI": "Penunjang",
  "LABORATORIUM": "Penunjang", "FISIOTERAPI": "Penunjang", "GIZI": "Penunjang",
  "DOKPOL": "Penunjang", "AMBULANCE": "Penunjang", "APOTIK": "Penunjang",
  "DIKLIT": "Penunjang", "ADMINISTRASI": "Penunjang",
  "MCU NARKOBA DAN SKBS": "Penunjang", "PATOLOGI KLINIK": "Penunjang",
  "RUANGAN OPERASI": "Penunjang", "MCU": "Penunjang"
};

const klasifikasiOptions = ["umum", "selisih"];

const formatToNumber = (str) => {
  if (typeof str !== 'string' && typeof str !== 'number') {
    return 0;
  }
  const cleaned = String(str).replace(/[^\d]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
};

// Komponen Paginasi Reusable
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const pageNumbers = [];
  const maxPagesToShow = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
  if (endPage - startPage + 1 < maxPagesToShow) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "2px", marginTop: "1rem" }}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{ padding: "4px 8px", border: "1px solid #ccc", borderRadius: "4px", backgroundColor: "#f3f4f6", cursor: "pointer", fontSize: "12px" }}
      >
        Prev
      </button>
      {startPage > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            style={{ padding: "4px 8px", border: "1px solid #ccc", borderRadius: "4px", backgroundColor: "white", cursor: "pointer", fontSize: "12px" }}
          >
            1
          </button>
          {startPage > 2 && <span style={{ padding: "4px 2px", fontSize: "12px" }}>...</span>}
        </>
      )}
      {pageNumbers.map(number => (
        <button
          key={number}
          onClick={() => onPageChange(number)}
          style={{
            padding: "4px 8px",
            border: `1px solid ${currentPage === number ? '#3b82f6' : '#ccc'}`,
            borderRadius: "4px",
            backgroundColor: currentPage === number ? '#e0e7ff' : 'white',
            fontWeight: currentPage === number ? 'bold' : 'normal',
            cursor: "pointer",
            fontSize: "12px"
          }}
        >
          {number}
        </button>
      ))}
      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span style={{ padding: "4px 2px", fontSize: "12px" }}>...</span>}
          <button
            onClick={() => onPageChange(totalPages)}
            style={{ padding: "4px 8px", border: "1px solid #ccc", borderRadius: "4px", backgroundColor: "white", cursor: "pointer", fontSize: "12px" }}
          >
            {totalPages}
          </button>
        </>
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{ padding: "4px 8px", border: "1px solid #ccc", borderRadius: "4px", backgroundColor: "#f3f4f6", cursor: "pointer", fontSize: "12px" }}
      >
        Next
      </button>
    </div>
  );
};

export default function PencatatanPasien() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState(null);
  const [rekapitulasiList, setRekapitulasiList] = useState([]);
  const [pasienList, setPasienList] = useState([]);
  const [showRekapModal, setShowRekapModal] = useState(false);
  const [showPasienModal, setShowPasienModal] = useState(false);
  const [editPasienId, setEditPasienId] = useState(null);
  const [selectedPasienId, setSelectedPasienId] = useState(null);
  const [selectedPasien, setSelectedPasien] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selectedRekapIds, setSelectedRekapIds] = useState([]);

  const [pasienData, setPasienData] = useState({
    klasifikasi: "", nomor_rm: "", nama_pasien: "", jenis_rawat: "",
    unit_layanan: "", jumlah_tagihan: "", diskon: "", jumlah_bersih: "",
    bayar_tunai: "", bayar_transfer: "", tanggal_transfer: "", total_pembayaran: "",
    rekaman_harian_id: null, user_id: null,
  });

  const [newRekapDate, setNewRekapDate] = useState("");

  const [rekapPage, setRekapPage] = useState(1);
  const [pasienPage, setPasienPage] = useState(1);
  const rekapPerPage = 5;
  const pasienPerPage = 10;
  
  const rekapStartIndex = (rekapPage - 1) * rekapPerPage;
  const rekapEndIndex = rekapStartIndex + rekapPerPage;
  const paginatedRekap = rekapitulasiList.slice(rekapStartIndex, rekapEndIndex);
  const totalRekapPages = Math.ceil(rekapitulasiList.length / rekapPerPage);

  const pasienStartIndex = (pasienPage - 1) * pasienPerPage;
  const pasienEndIndex = pasienStartIndex + pasienPerPage;
  const paginatedPasien = pasienList.slice(pasienStartIndex, pasienEndIndex);
  const totalPasienPages = Math.ceil(pasienList.length / pasienPerPage);

  const [isAllRekapSelected, setIsAllRekapSelected] = useState(false);
  const selectAllRef = useRef(null);

  useEffect(() => {
    const fetchUserAndData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("nama_lengkap")
          .eq("id", user.id)
          .single();
        if (profiles) {
          setUserName(profiles.nama_lengkap);
        }
        fetchRekapitulasi(user.id);
      } else {
        router.push("/");
      }
    };
    fetchUserAndData();
  }, [router, startDate, endDate]);

  useEffect(() => {
    const fetchAllSelectedPasien = async () => {
      if (selectedRekapIds.length > 0) {
        setPasienPage(1);
        const pasienData = await fetchPasienByRekapIds(selectedRekapIds);
        setPasienList(pasienData);
      } else {
        setPasienList([]);
      }
    };
    fetchAllSelectedPasien();
  }, [selectedRekapIds]);
  
  // Efek untuk mengontrol status "Pilih Semua" (termasuk indeterminate)
  useEffect(() => {
    if (selectAllRef.current) {
      const isIndeterminate = selectedRekapIds.length > 0 && selectedRekapIds.length < paginatedRekap.length;
      selectAllRef.current.indeterminate = isIndeterminate;
      setIsAllRekapSelected(selectedRekapIds.length === paginatedRekap.length && paginatedRekap.length > 0);
    }
  }, [selectedRekapIds, paginatedRekap]);

  const fetchRekapitulasi = async (id) => {
    console.log("Mengambil semua rekapitulasi harian...");
    let query = supabase.from("rekaman_harian").select("*");
    if (startDate && endDate) {
      query = query.gte("tanggal", startDate).lte("tanggal", endDate);
    }
    const { data, error } = await query.order("tanggal", { ascending: false });
    if (error) {
      console.error("Error fetching rekapitulasi:", error.message);
      return;
    }
    console.log("Rekapitulasi yang diterima:", data);
    setRekapitulasiList(data);
};
  
  const fetchPasienByRekapId = async (rekapId) => {
    const { data, error } = await supabase
      .from("pasien_harian")
      .select("*")
      .eq("rekaman_harian_id", rekapId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching pasien:", error.message);
      return [];
    }
    return data;
  };

  const fetchPasienByRekapIds = async (rekapIds) => {
    if (!rekapIds.length) return [];
    const { data, error } = await supabase
      .from("pasien_harian")
      .select("*")
      .in("rekaman_harian_id", rekapIds);
    if (error) {
      Swal.fire("Error", error.message, "error");
      return [];
    }
    return data;
  };

  const handleRekapFormSubmit = async (e) => {
    e.preventDefault();
    if (!newRekapDate) {
      Swal.fire("Peringatan!", "Tanggal wajib diisi.", "warning");
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

  const handlePasienFormChange = (e) => {
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

  const formatRupiahDisplay = (num) => {
    if (num === null || isNaN(num) || num === "") return "";
    return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const updateRekapitulasiTotals = async (rekapId) => {
    const pasienData = await fetchPasienByRekapId(rekapId);
    const totalPasien = pasienData.length;
    const totalTagihan = pasienData.reduce((sum, item) => sum + item.jumlah_tagihan, 0);
    const totalTunai = pasienData.reduce((sum, item) => sum + item.bayar_tunai, 0);
    const totalTransfer = pasienData.reduce((sum, item) => sum + item.bayar_transfer, 0);
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
    fetchRekapitulasi(userId);
  };

  const handlePasienFormSubmit = async (e) => {
    e.preventDefault();
    
    const rekapIdToSubmit = selectedRekapIds.length > 0 ? selectedRekapIds[0] : null;
    if (!rekapIdToSubmit) {
      Swal.fire("Peringatan!", "Silakan pilih setidaknya satu rekapitulasi harian.", "warning");
      return;
    }

    const dataToSubmit = {
      ...pasienData,
      tanggal_transfer: pasienData.bayar_transfer > 0 ? pasienData.tanggal_transfer : null,
      jumlah_tagihan: formatToNumber(pasienData.jumlah_tagihan),
      diskon: formatToNumber(pasienData.diskon),
      jumlah_bersih: formatToNumber(pasienData.jumlah_bersih),
      bayar_tunai: formatToNumber(pasienData.bayar_tunai),
      bayar_transfer: formatToNumber(pasienData.bayar_transfer),
      total_pembayaran: formatToNumber(pasienData.total_pembayaran),
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

  const getStatus = (jumlahBersih, totalPembayaran) => {
    if (totalPembayaran === jumlahBersih) {
        return "Lunas";
    } else if (totalPembayaran < jumlahBersih) {
        return "Kurang bayar";
    } else {
        return "Lebih bayar";
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
    setSelectedPasien(p);
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

  const handleRekapCheckbox = (rekapId) => {
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
  
  const handlePasienRowClick = (pasien) => {
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

  const handleDownloadExcelMulti = async () => {
    const pasienMulti = await fetchPasienByRekapIds(selectedRekapIds);
    if (!pasienMulti.length) {
      Swal.fire("Info", "Tidak ada data pasien untuk diunduh.", "info");
      return;
    }
    const dataForExcel = pasienMulti.map(p => ({
      'Tanggal Rekap': formatDate(rekapitulasiList.find(r => r.id === p.rekaman_harian_id)?.tanggal),
      'Tanggal Pasien': formatDate(p.created_at),
      'Nama Pasien': p.nama_pasien,
      'Nomor RM': p.nomor_rm,
      'Klasifikasi': p.klasifikasi,
      'Unit Layanan': p.unit_layanan,
      'Jenis Rawat': p.jenis_rawat,
      'Jumlah Tagihan': p.jumlah_tagihan,
      'Diskon (%)': p.diskon,
      'Jumlah Bersih': p.jumlah_bersih,
      'Bayar Tunai': p.bayar_tunai,
      'Bayar Transfer': p.bayar_transfer,
      'Tanggal Transfer': p.tanggal_transfer || '-',
      'Total Pembayaran': p.total_pembayaran,
      'Status': getStatus(p.jumlah_bersih, p.total_pembayaran),
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Pasien");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
    saveAs(data, `Data Pasien Multi Hari.xlsx`);
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
      formatDate(rekapitulasiList.find(r => r.id === p.rekaman_harian_id)?.tanggal),
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
      didDrawPage: function(data) {
        doc.text("Halaman " + doc.internal.getNumberOfPages(), doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, { align: "right" });
      }
    });
    doc.save(`Data Pasien Multi Hari.pdf`);
  };

  const handleClearFilter = () => {
    setStartDate("");
    setEndDate("");
  };
  
  return (
    <Layout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0rem", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", fontFamily: "Arial, sans-serif" }}>
          <h2>Rekapitulasi Harian</h2>
          <button
            onClick={() => {
              setNewRekapDate("");
              setShowRekapModal(true);
            }}
            style={{ background: "#16a34a", color: "white", padding: "6px 10px", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}
          >
            Tambah Rekap
          </button>
          <button
            onClick={handleAddPasienClick}
            disabled={selectedRekapIds.length === 0}
            style={{ 
              background: "#16a34a", 
              color: "white", 
              padding: "6px 10px", 
              border: "none", 
              borderRadius: "6px", 
              cursor: selectedRekapIds.length === 0 ? "not-allowed" : "pointer", 
              opacity: selectedRekapIds.length === 0 ? 0.5 : 1,
              fontSize: "12px"
            }}
          >
            Tambah Pasien
          </button>
          <button
            onClick={handleDeleteRekap}
            disabled={selectedRekapIds.length === 0}
            style={{ 
              background: "#dc2626", 
              color: "white", 
              padding: "6px 10px", 
              border: "none", 
              borderRadius: "6px", 
              cursor: selectedRekapIds.length === 0 ? "not-allowed" : "pointer", 
              opacity: selectedRekapIds.length === 0 ? 0.5 : 1,
              fontSize: "12px"
            }}
          >
            Hapus Rekap
          </button>
          <button
            onClick={handleDownloadClick}
            disabled={selectedRekapIds.length === 0}
            style={{ 
              background: "#2563eb", 
              color: "white", 
              padding: "6px 10px", 
              border: "none", 
              borderRadius: "6px", 
              cursor: selectedRekapIds.length === 0 ? "not-allowed" : "pointer", 
              opacity: selectedRekapIds.length === 0 ? 0.5 : 1,
              fontSize: "12px"
            }}
          >
            Download
          </button>
          <div style={{ display: "flex", flexDirection: "column", marginTop: "-25px" }}>
            <label style={{ fontSize: "12px", marginBottom: "4px" }}>Tanggal Awal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: "-25px" }}>
            <label style={{ fontSize: "12px", marginBottom: "4px" }}>Tanggal Akhir</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
            />
          </div>
          <button
            onClick={handleClearFilter}
            style={{ background: "#3b82f6", color: "white", padding: "6px 10px", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}
          >
            Clear
          </button>
        </div>
      </div>
      
      {showRekapModal && (
        <Modal onClose={() => setShowRekapModal(false)}>
          <form onSubmit={handleRekapFormSubmit}>
            <h3 style={{ marginTop: 0 }}>Tambah Rekapitulasi Baru</h3>
            <div>
              <label>Tanggal:</label>
              <input 
                type="date" 
                value={newRekapDate} 
                onChange={(e) => setNewRekapDate(e.target.value)} 
                required 
                style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }} 
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "1rem" }}>
              <button type="button" onClick={() => setShowRekapModal(false)} style={{ padding: "8px 16px", border: "1px solid #ccc", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}>Batal</button>
              <button type="submit" style={{ background: "#16a34a", color: "white", padding: "8px 16px", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}>Simpan</button>
            </div>
          </form>
        </Modal>
      )}

      {showPasienModal && (
        <Modal onClose={resetPasienForm}>
          <form onSubmit={handlePasienFormSubmit}>
            <h3 style={{ marginTop: 0 }}>{editPasienId ? "Edit Data Pasien" : "Rekam Pasien Baru"} ({selectedRekapIds.length > 1 ? "Beberapa Tanggal Terpilih" : formatDate(rekapitulasiList.find(r => r.id === selectedRekapIds[0])?.tanggal)})</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", rowGap: "1rem", marginBottom: "1rem" }}>
                <div>
                    <label>Nomor RM:</label>
                    <input type="text" name="nomor_rm" value={pasienData.nomor_rm} onChange={handlePasienFormChange} required style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }} />
                </div>
                <div>
                    <label>Nama Pasien:</label>
                    <input type="text" name="nama_pasien" value={pasienData.nama_pasien} onChange={handlePasienFormChange} required style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }} />
                </div>
                <div>
                    <label>Klasifikasi:</label>
                    <select name="klasifikasi" value={pasienData.klasifikasi} onChange={handlePasienFormChange} required style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px", backgroundColor: pasienData.klasifikasi ? "white" : "#f3f4f6" }}>
                        <option value="">-- Pilih Klasifikasi --</option>
                        {klasifikasiOptions.map((k) => (<option key={k} value={k}>{k}</option>))}
                    </select>
                </div>
                <div>
                    <label>Unit Layanan:</label>
                    <select name="unit_layanan" value={pasienData.unit_layanan} onChange={handlePasienFormChange} required style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px", backgroundColor: pasienData.unit_layanan ? "white" : "#f3f4f6" }}>
                        <option value="">-- Pilih Unit Layanan --</option>
                        {unitLayananOptions.map((unit) => (<option key={unit} value={unit}>{unit}</option>))}
                    </select>
                </div>
                <div>
                    <label>Jenis Rawat:</label>
                    <input type="text" name="jenis_rawat" value={pasienData.jenis_rawat} readOnly style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px", backgroundColor: "#e9ecef", cursor: "not-allowed" }} />
                </div>
                <div>
                    <label>Jumlah Tagihan:</label>
                    <input type="text" name="jumlah_tagihan" value={pasienData.jumlah_tagihan} onChange={handlePasienFormChange} style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }} />
                </div>
                <div>
                    <label>Diskon (%):</label>
                    <input type="text" name="diskon" value={pasienData.diskon} onChange={handlePasienFormChange} style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }} />
                </div>
                <div>
                    <label>Jumlah Bersih:</label>
                    <input type="text" name="jumlah_bersih" value={formatRupiah(pasienData.jumlah_bersih)} readOnly style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px", backgroundColor: "#f3f4f6" }} />
                </div>
                <hr style={{ gridColumn: "1 / -1", margin: "0.5rem 0", border: "1", borderTop: "1px solid #d6d3d3ff" }} />
                <div>
                    <label>Bayar Tunai:</label>
                    <input type="text" name="bayar_tunai" value={pasienData.bayar_tunai} onChange={handlePasienFormChange} style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }} />
                </div>
                <div>
                    <label>Bayar Transfer:</label>
                    <input type="text" name="bayar_transfer" value={pasienData.bayar_transfer} onChange={handlePasienFormChange} style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }} />
                </div>
                <div>
                    <label>Tanggal Transfer:</label>
                    <input type="date" name="tanggal_transfer" value={pasienData.tanggal_transfer} onChange={handlePasienFormChange} disabled={!pasienData.bayar_transfer || formatToNumber(pasienData.bayar_transfer) === 0} style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px", backgroundColor: !pasienData.bayar_transfer || formatToNumber(pasienData.bayar_transfer) === 0 ? "#e9ecef" : "white" }} />
                </div>
                <div>
                    <label>Total Pembayaran:</label>
                    <input type="text" name="total_pembayaran" value={formatRupiah(pasienData.total_pembayaran)} readOnly style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px", backgroundColor: "#f3f4f6" }} />
                </div>
                <div>
                    <label>Status:</label>
                    <input type="text" name="status" value={getStatus(pasienData.jumlah_bersih, pasienData.total_pembayaran)} readOnly style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px", backgroundColor: "#f3f4f6", cursor: "not-allowed" }} />
                </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" onClick={resetPasienForm} style={{ padding: "8px 16px", border: "1px solid #ccc", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}>Batal</button>
                <button type="submit" style={{ background: "#16a34a", color: "white", padding: "8px 16px", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}>{editPasienId ? "Update" : "Simpan"}</button>
            </div>
        </form>
        </Modal>
      )}

      <table border="1" cellPadding="4" style={{ borderCollapse: "collapse", width: "100%", marginTop: "0px", fontSize: "12px" }}>
        <thead>
          <tr style={{ background: "#f3f4f6" }}>
            <th style={{ padding: "8px", textAlign: "left", width: "30px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <input
                  type="checkbox"
                  ref={selectAllRef}
                  checked={isAllRekapSelected}
                  onChange={handleSelectAllRekap}
                  style={{ transform: "scale(1.3)" }}
                />
                <span style={{ fontSize: "12px" }}>Check</span>
              </div>
            </th>
            <th style={{ padding: "8px", textAlign: "left" }}>Tanggal</th>
            <th style={{ padding: "8px", textAlign: "left" }}>Nama User</th>
            <th style={{ padding: "8px", textAlign: "center" }}>Total Pasien</th>
            <th style={{ padding: "8px", textAlign: "center" }}>Total Tagihan</th>
            <th style={{ padding: "8px", textAlign: "center" }}>Bayar Tunai</th>
            <th style={{ padding: "8px", textAlign: "center" }}>Bayar Transfer</th>
            <th style={{ padding: "8px", textAlign: "center" }}>Total Pembayaran</th>
            <th style={{ padding: "8px", textAlign: "center" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {paginatedRekap.length > 0 ? (
            paginatedRekap.map((rekap) => (
              <tr 
                key={rekap.id} 
                style={{ backgroundColor: selectedRekapIds.includes(rekap.id) ? "#e0e7ff" : "white", cursor: "pointer" }}
              >
                <td>
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                      <input
                          type="checkbox"
                          checked={selectedRekapIds.includes(rekap.id)}
                          onChange={() => handleRekapCheckbox(rekap.id)}
                          style={{ transform: "scale(1.3)" }}
                      />
                  </div>
              </td>
                <td style={{ padding: "8px", fontWeight: "bold" }}>
                  {formatDate(rekap.tanggal)}
                </td>
                <td style={{ padding: "8px" }}>{rekap.nama_user}</td>
                <td style={{ padding: "8px", textAlign: "center" }}>{rekap.total_pasien}</td>
                <td style={{ padding: "8px", textAlign: "right" }}>{formatRupiah(rekap.total_tagihan)}</td>
                <td style={{ padding: "8px", textAlign: "right" }}>{formatRupiah(rekap.total_tunai)}</td>
                <td style={{ padding: "8px", textAlign: "right"}}>{formatRupiah(rekap.total_transfer)}</td>
                <td style={{ padding: "8px", textAlign: "right"}}>{formatRupiah(rekap.total_pembayaran)}</td>
                <td style={{ padding: "8px" }}>{rekap.status}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="9" style={{ textAlign: "center", padding: "1rem" }}>
                Tidak ada data rekapitulasi yang ditemukan.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {/* Rekap Pagination */}
      {totalRekapPages > 1 && (
        <Pagination
          currentPage={rekapPage}
          totalPages={totalRekapPages}
          onPageChange={setRekapPage}
        />
      )}

      {/* Kontrol Download Data Pasien */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", marginBottom: "0rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h2>Data Pasien</h2>
            <button
                onClick={handleEditPasien}
                disabled={!selectedPasienId}
                style={{ 
                    background: "#f59e0b", 
                    color: "white", 
                    padding: "6px 10px", 
                    border: "none", 
                    borderRadius: "6px", 
                    cursor: !selectedPasienId ? "not-allowed" : "pointer", 
                    opacity: !selectedPasienId ? 0.5 : 1,
                    fontSize: "12px"
                }}
            >
                Edit
            </button>
            <button
                onClick={handleDeletePasien}
                disabled={!selectedPasienId}
                style={{ 
                    background: "#dc2626", 
                    color: "white", 
                    padding: "6px 16px", 
                    border: "none", 
                    borderRadius: "6px", 
                    cursor: !selectedPasienId ? "not-allowed" : "pointer", 
                    opacity: !selectedPasienId ? 0.5 : 1,
                    fontSize: "12px"
                }}
            >
                Hapus
            </button>
        </div>
      </div>
      
      {/* Tabel Data Pasien */}
      <table border="1" cellPadding="4" style={{ borderCollapse: "collapse", width: "100%", marginTop: "0px", fontSize: "12px" }}>
        <thead>
          <tr style={{ background: "#f3f4f6" }}>
            <th style={{ padding: "8px", textAlign: "left" }}>Tanggal</th>
            <th style={{ padding: "8px", textAlign: "left" }}>Nama Pasien</th>
            <th style={{ padding: "8px", textAlign: "left" }}>Nomor RM</th>
            <th style={{ padding: "8px", textAlign: "left" }}>Unit Layanan</th>
            <th style={{ padding: "8px", textAlign: "right" }}>Jumlah Bersih</th>
            <th style={{ padding: "8px", textAlign: "right" }}>Total Bayar</th>
          </tr>
        </thead>
        <tbody>
          {paginatedPasien.length > 0 ? (
            paginatedPasien.map((p) => (
              <tr 
                key={p.id}
                onClick={() => handlePasienRowClick(p)} 
                style={{ backgroundColor: selectedPasienId === p.id ? "#e0e7ff" : "white", cursor: "pointer" }}
              >
                <td style={{ padding: "6px" }}>{formatDate(rekapitulasiList.find(r => r.id === p.rekaman_harian_id)?.tanggal)}</td>
                <td style={{ padding: "6px" }}>{p.nama_pasien}</td>
                <td style={{ padding: "6px" }}>{p.nomor_rm}</td>
                <td style={{ padding: "6px" }}>{p.unit_layanan}</td>
                <td style={{ padding: "6px", textAlign: "right" }}>{formatRupiah(p.jumlah_bersih)}</td>
                <td style={{ padding: "6px", textAlign: "right" }}>{formatRupiah(p.total_pembayaran)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" style={{ textAlign: "center", padding: "10px" }}>
                  {selectedRekapIds.length > 0 ? "Tidak ada pasien untuk tanggal yang dipilih." : "Silakan pilih tanggal rekapitulasi di atas."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {/* Pasien Pagination */}
      {totalPasienPages > 1 && (
        <Pagination
          currentPage={pasienPage}
          totalPages={totalPasienPages}
          onPageChange={setPasienPage}
        />
      )}
    </Layout>
  );
}