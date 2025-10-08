// src/app/(main)/sppr/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/utils/supabaseClient";
import Swal from "sweetalert2";
import { FaPlus, FaEdit, FaRegTrashAlt } from "react-icons/fa";
import { FiDownload } from "react-icons/fi";
import { MdDoneAll } from "react-icons/md";
import { Toaster, toast } from "react-hot-toast";
import Paginasi from '@/components/paginasi';
import styles from "@/styles/button.module.css";
import pageStyles from "@/styles/komponen.module.css";
import loadingStyles from "@/styles/loading.module.css";
import { capitalizeWords, formatAngka, parseAngka, toRoman, formatTanggal } from '@/lib/format';
import { terbilang } from "@/lib/terbilang";
import { generateSpprPdf } from "@/lib/pdfsppr";

// Interface untuk data mentah dari Supabase (data_rekening)
interface RawRekeningData {
  nomor_rekening: string | null;
  kode_akun_bank: string | null;
  bank: string | null;
  nama_rekening: string | null;
}

// Interface untuk data rekening
interface RekeningOption {
  value: string;
  label: string;
  kodeAkun: string;
  bank: string;
  namaRekening: string;
  nomorRekening: string;
}

interface SpprType {
  id: number;
  tanggal: string;
  nomor_surat: string;
  nama_kpa: string;
  pangkat_kpa: string;
  jabatan_kpa: string;
  nama_bendahara: string;
  pangkat_bendahara: string;
  jabatan_bendahara: string;
  nama_pengambil: string;
  pangkat_pengambil: string;
  jabatan_pengambil: string;
  rekening_penarikan: string;
  nama_bank: string;           // Kolom baru
  nama_rekening: string;       // Kolom baru
  nomor_rekening: string;      // Kolom baru
  jumlah_penarikan: number;
  operator: string;
  status_sppr: string;
  created_at?: string;
}

// Interface untuk Pegawai yang diambil (hanya kolom yang dibutuhkan)
interface PegawaiMinimal {
  nama: string;
  pangkat: string;
  nrp_nip_nir: string | null;
  tipe_identitas: string | null;
  jabatan_struktural: string;
}

// Interface untuk hasil JOIN Pejabat Keuangan dan Pegawai (untuk KPA/Bendahara)
interface PejabatKeuanganJoin {
  pegawai: PegawaiMinimal;
  // Jika ada kolom lain dari pejabat_keuangan yang diambil, tambahkan di sini
}

// Interface untuk tipe data akhir yang digunakan (PersonType)
interface PersonType {
  nama: string;
  pangkat: string;
  tipe_identitas: string | null;
  nrp_nip_nir: string | null;
  jabatan: string;
}

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
}

const Modal = ({ children, onClose }: ModalProps) => {
  return (
    <div className={pageStyles.modalOverlay} onClick={onClose}>
      <div className={pageStyles.modalContent} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

const Sppr = () => {
  const [spprList, setSpprList] = useState<SpprType[]>([]);
  const [kpaList, setKpaList] = useState<PersonType[]>([]);
  const [bendaharaList, setBendaharaList] = useState<PersonType[]>([]);
  const [pengambilList, setPengambilList] = useState<PersonType[]>([]);
  const [rekeningOptions, setRekeningOptions] = useState<RekeningOption[]>([]); 
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSppr, setSelectedSppr] = useState<SpprType | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isTableLoading, setIsTableLoading] = useState<boolean>(true);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false); // Loading untuk detail
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [formData, setFormData] = useState<SpprType>({
    id: 0, 
    tanggal: "", 
    nomor_surat: "", 
    nama_kpa: "", 
    pangkat_kpa: "", 
    jabatan_kpa: "",
    nama_bendahara: "", 
    pangkat_bendahara: "", 
    jabatan_bendahara: "", 
    nama_pengambil: "",
    pangkat_pengambil: "", 
    jabatan_pengambil: "", 
    rekening_penarikan: "",
    nama_bank: "",           // Kolom baru
    nama_rekening: "",       // Kolom baru
    nomor_rekening: "",      // Kolom baru
    jumlah_penarikan: 0, 
    operator: "", 
    status_sppr: "BARU",
  });
  const [operatorName, setOperatorName] = useState("");
  const [userRole, setUserRole] = useState("");

  const fetchSPPR = useCallback(async () => {
    setIsTableLoading(true);
    try {
      const { data, error } = await supabase.from("sppr").select("*").order("created_at", { ascending: false });
      if (error) {
        console.error("Gagal mengambil data:", error);
        Swal.fire("Error", "Gagal mengambil data SPPR.", "error");
        setSpprList([]);
        return;
      }
      setSpprList(data as SpprType[]);
    } catch (e) {
      console.error("Failed to fetch SPPR data:", e);
      setSpprList([]);
    } finally {
      setIsTableLoading(false);
    }
  }, []);

  // --- FUNGSI: Ambil Data Rekening Penarikan dengan Sorting ---
  const fetchRekeningOptions = useCallback(async () => {
    try {
      const { data: rekeningData, error } = await supabase
        .from("data_rekening")
        .select(`
          nomor_rekening,
          kode_akun_bank,
          bank,
          nama_rekening
        `)
        .eq('status_rekening', 'Aktif')
        .not('kode_akun_bank', 'is', null);

      if (error) {
        console.error("Gagal mengambil data rekening:", error);
        return;
      }

      const rawData = rekeningData as RawRekeningData[];
      
      const formattedOptions: RekeningOption[] = rawData.map((item) => {
        const kodeAkun = item.kode_akun_bank || '';
        const bank = item.bank || 'Bank Tidak Diketahui';
        const namaRekening = item.nama_rekening || 'Rekening Tidak Diketahui';
        const nomorRekening = item.nomor_rekening || '000000';
        
        // Format value untuk dropdown: "Nama Rekening - Nomor Rekening"
        const value = `${namaRekening} - ${nomorRekening}`;
        
        return {
          value: value,
          label: value,
          kodeAkun: kodeAkun,
          bank: bank,
          namaRekening: namaRekening,
          nomorRekening: nomorRekening
        };
      });
      
      // Mengurutkan berdasarkan kodeAkun
      formattedOptions.sort((a, b) => a.kodeAkun.localeCompare(b.kodeAkun));
      setRekeningOptions(formattedOptions);
    } catch (e) {
      console.error("Failed to fetch rekening options:", e);
    }
  }, []);

  const fetchPejabatAndPegawai = useCallback(async () => {
    try {
      // Data KPA (Pejabat Keuangan JOIN Pegawai)
      const { data: kpaData } = await supabase
        .from("pejabat_keuangan")
        .select("*, pegawai(nama, pangkat, nrp_nip_nir, tipe_identitas, jabatan_struktural)")
        .eq("jabatan_pengelola_keuangan", "KPA").eq("status", "Aktif");
      
      // 💡 PERBAIKAN BARIS 194: Tipe eksplisit PejabatKeuanganJoin[]
      const formattedKpa = (kpaData as PejabatKeuanganJoin[])?.map(item => ({
        nama: item.pegawai.nama, pangkat: item.pegawai.pangkat, tipe_identitas: item.pegawai.tipe_identitas,
        nrp_nip_nir: item.pegawai.nrp_nip_nir, jabatan: item.pegawai.jabatan_struktural
      })) || [];
      setKpaList(formattedKpa as PersonType[]);
  
      // Data Bendahara (Pejabat Keuangan JOIN Pegawai)
      const { data: bendaharaData } = await supabase
        .from("pejabat_keuangan")
        .select("*, pegawai(nama, pangkat, nrp_nip_nir, tipe_identitas, jabatan_struktural)")
        .eq("jabatan_pengelola_keuangan", "BPG").eq("status", "Aktif");
        
      // 💡 PERBAIKAN BARIS 204: Tipe eksplisit PejabatKeuanganJoin[]
      const formattedBendahara = (bendaharaData as PejabatKeuanganJoin[])?.map(item => ({
        nama: item.pegawai.nama, pangkat: item.pegawai.pangkat, tipe_identitas: item.pegawai.tipe_identitas,
        nrp_nip_nir: item.pegawai.nrp_nip_nir, jabatan: item.pegawai.jabatan_struktural
      })) || [];
      setBendaharaList(formattedBendahara as PersonType[]);
  
      // Data Pengambil (Select langsung dari Pegawai)
      const { data: pengambilData } = await supabase
        .from("pegawai")
        .select("nama, pangkat, nrp_nip_nir, tipe_identitas, jabatan_struktural")
        .in("jabatan_struktural", ["BANUM KEU", "STAF KEU"]).eq("status", "Aktif");

      // 💡 PERBAIKAN BARIS 214: Tipe eksplisit PegawaiMinimal[]
      const formattedPengambil = (pengambilData as PegawaiMinimal[])?.map(item => ({
        nama: item.nama, pangkat: item.pangkat, tipe_identitas: item.tipe_identitas,
        nrp_nip_nir: item.nrp_nip_nir, jabatan: item.jabatan_struktural
      })) || [];
      setPengambilList(formattedPengambil as PersonType[]);
    } catch (e) {
      console.error("Failed to fetch person data:", e);
    }
  }, []);

  const getLoggedInUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles").select("nama_lengkap, role").eq("id", user.id).single();
        if (profile) {
          setOperatorName(profile.nama_lengkap);
          setUserRole(profile.role);
        }
      }
    } catch (e) {
      console.error("Failed to fetch user role:", e);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([getLoggedInUser(), fetchSPPR(), fetchPejabatAndPegawai(), fetchRekeningOptions()]); 
    };
    initializeData();
  }, [fetchSPPR, fetchPejabatAndPegawai, fetchRekeningOptions]);

  useEffect(() => {
    if (showModal) {
      setFormData(prevData => ({ ...prevData, operator: operatorName }));
    }
  }, [showModal, operatorName]);

  useEffect(() => {
    if (showModal && !isEditing) {
      generateNomorSurat();
    }
  }, [showModal, isEditing]);

  const generateNomorSurat = async () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthRoman = toRoman(today.getMonth() + 1);

    const { data, error } = await supabase
      .from("sppr").select("nomor_surat")
      .gte("tanggal", `${currentYear}-01-01`).lt("tanggal", `${currentYear + 1}-01-01`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching nomor surat:", error);
      return;
    }

    let lastNumber = 0;
    if (data && data.length > 0) {
      const lastSppr = data[0];
      const parts = lastSppr.nomor_surat.split('/');
      if (parts.length > 0) {
        const lastPart = parts[0];
        const num = parseInt(lastPart, 10);
        if (!isNaN(num)) lastNumber = num;
      }
    }
    const nextNumber = lastNumber + 1;
    const formattedNumber = String(nextNumber).padStart(3, "0");
    const newNomorSurat = `${formattedNumber}/KEU./${currentMonthRoman}/${currentYear}/Rumkit.`;

    setFormData((prevData) => ({
      ...prevData,
      tanggal: new Date().toISOString().split('T')[0],
      nomor_surat: newNomorSurat,
      status_sppr: "BARU",
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Jika yang berubah adalah rekening_penarikan, isi otomatis 3 kolom baru
    if (name === "rekening_penarikan") {
      const selectedRekening = rekeningOptions.find(opt => opt.value === value);
      
      if (selectedRekening) {
        setFormData(prevData => ({
          ...prevData,
          rekening_penarikan: value,
          nama_bank: selectedRekening.bank,
          nama_rekening: selectedRekening.namaRekening,
          nomor_rekening: selectedRekening.nomorRekening
        }));
      } else {
        setFormData(prevData => ({
          ...prevData,
          rekening_penarikan: value,
          nama_bank: "",
          nama_rekening: "",
          nomor_rekening: ""
        }));
      }
      return;
    }

    // Untuk input lainnya
    const newFormData = { ...formData, [name]: value };

    if (name === "jumlah_penarikan") {
      const sanitizedValue = parseAngka(value);
      newFormData.jumlah_penarikan = sanitizedValue;
    } else if (name === "nama_pengambil") {
      const selectedPengambil = pengambilList.find(p => p.nama === value);
      newFormData.nama_pengambil = value;
      newFormData.pangkat_pengambil = selectedPengambil ? `${selectedPengambil.pangkat} ${selectedPengambil.tipe_identitas || ''} ${selectedPengambil.nrp_nip_nir}`.trim() : "";
      newFormData.jabatan_pengambil = selectedPengambil ? selectedPengambil.jabatan : "";
    } else if (name === "nama_kpa") {
      const selectedKpa = kpaList.find(p => p.nama === value);
      newFormData.nama_kpa = value;
      newFormData.pangkat_kpa = selectedKpa ? `${selectedKpa.pangkat} ${selectedKpa.tipe_identitas || ''} ${selectedKpa.nrp_nip_nir}`.trim() : "";
      newFormData.jabatan_kpa = selectedKpa ? selectedKpa.jabatan : "";
    } else if (name === "nama_bendahara") {
      const selectedBendahara = bendaharaList.find(p => p.nama === value);
      newFormData.nama_bendahara = value;
      newFormData.pangkat_bendahara = selectedBendahara ? `${selectedBendahara.pangkat} ${selectedBendahara.tipe_identitas || ''} ${selectedBendahara.nrp_nip_nir}`.trim() : "";
      newFormData.jabatan_bendahara = selectedBendahara ? selectedBendahara.jabatan : "";
    }

    setFormData(newFormData);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.rekening_penarikan) {
      Swal.fire("Peringatan", "Mohon pilih Rekening Penarikan.", "warning");
      return;
    }
    
    const dataToSave = { ...formData, operator: operatorName };

    if (isEditing) {
      const { error } = await supabase.from("sppr").update(dataToSave).eq("id", selectedSppr?.id);
      if (error) {
        Swal.fire("Gagal!", `Data gagal diupdate: ${error.message}`, "error");
      } else {
        Swal.fire("Berhasil!", "Data berhasil diupdate.", "success");
        fetchSPPR();
        resetForm();
      }
    } else {
      const { error } = await supabase.from("sppr").insert([dataToSave]);
      if (error) {
        Swal.fire("Gagal!", `Data gagal disimpan: ${error.message}`, "error");
      } else {
        Swal.fire("Berhasil!", "Data berhasil disimpan.", "success");
        fetchSPPR();
        resetForm();
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedSppr) return;
    const result = await Swal.fire({
      title: "Apakah Anda yakin?", text: `Anda akan menghapus data SPPR dengan nomor surat ${selectedSppr.nomor_surat}`,
      icon: "warning", showCancelButton: true, confirmButtonColor: "#dc2626", cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, hapus!", cancelButtonText: "Batal",
    });
    if (result.isConfirmed) {
      const { error } = await supabase.from("sppr").delete().eq("id", selectedSppr.id);
      if (error) {
        Swal.fire("Gagal!", "Data gagal dihapus. Coba lagi.", "error");
      } else {
        Swal.fire("Dihapus!", "Data berhasil dihapus.", "success");
        setSelectedSppr(null);
        fetchSPPR();
      }
      resetForm();
    }
  };

  const handleEdit = () => {
    if (!selectedSppr) return;
    setIsEditing(true);
    setFormData(selectedSppr);
    setShowModal(true);
  };

  const handleApprove = async () => {
    if (!selectedSppr || selectedSppr.status_sppr !== 'BARU') return;
    
    const result = await Swal.fire({
      title: 'Apakah Anda yakin?', 
      text: `Anda akan menyetujui data SPPR Nomor Surat: ${selectedSppr.nomor_surat}`,
      icon: 'question', 
      showCancelButton: true, 
      confirmButtonColor: '#10B981', 
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Setujui', 
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      const { error } = await supabase.from('sppr').update({ status_sppr: 'DISETUJUI' }).eq('id', selectedSppr.id);
      
      if (error) {
        Swal.fire('Gagal!', `Gagal menyetujui data: ${error.message}`, 'error');
      } else {
        // Tampilkan toast dan refresh data
        toast.success("SPPR Berhasil Disetujui!");
        
        // Refresh data setelah toast muncul
        await fetchSPPR();
        
        setSelectedSppr({ ...selectedSppr, status_sppr: 'DISETUJUI' });
      }
    }
  };

  const handleDownload = () => {
    if (selectedSppr) {
      generateSpprPdf(selectedSppr);
    } else {
      Swal.fire("Peringatan", "Pilih data SPPR yang akan diunduh.", "warning");
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setSelectedSppr(null);
    setFormData({
      id: 0, 
      tanggal: new Date().toISOString().split('T')[0], 
      nomor_surat: "", 
      nama_kpa: "", 
      pangkat_kpa: "", 
      jabatan_kpa: "",
      nama_bendahara: "", 
      pangkat_bendahara: "", 
      jabatan_bendahara: "", 
      nama_pengambil: "",
      pangkat_pengambil: "", 
      jabatan_pengambil: "", 
      rekening_penarikan: "",
      nama_bank: "",           // Kolom baru
      nama_rekening: "",       // Kolom baru
      nomor_rekening: "",      // Kolom baru
      jumlah_penarikan: 0, 
      operator: operatorName, 
      status_sppr: "BARU",
    });
    setShowModal(false);
  };

  const handleRowClick = async (sppr: SpprType) => {
    if (selectedSppr?.id === sppr.id) {
      setSelectedSppr(null);
    } else {
      setIsDetailLoading(true); // Mulai loading detail
      // Simulasi loading untuk efek visual (bisa dihapus jika tidak perlu)
      await new Promise(resolve => setTimeout(resolve, 400));
      setSelectedSppr(sppr);
      setIsDetailLoading(false); // Selesai loading detail
    }
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    setSelectedSppr(null);
  };

  const handleRowsPerPageChange = (rowsPerPage: number) => {
    setRowsPerPage(rowsPerPage);
    setCurrentPage(1);
    setSelectedSppr(null);
  };

  const totalPages = Math.ceil(spprList.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedSppr = useMemo(() => spprList.slice(startIndex, endIndex), [spprList, startIndex, endIndex]);

  const isAllowedToRekam = userRole === "Owner" || userRole === "Operator";
  const isAllowedToEditOrDelete = userRole === "Owner" || userRole === "Admin" || userRole === "Operator";
  const isAllowedToApprove = userRole === "Owner" || userRole === "Admin";
  const isAllowedToDownload = userRole === "Owner" || userRole === "Admin" || userRole === "Operator";

  const isEditingOrDeletingDisabled = !isAllowedToEditOrDelete || !selectedSppr || selectedSppr?.status_sppr === "DISETUJUI";
  const isApprovingDisabled = !isAllowedToApprove || !selectedSppr || selectedSppr?.status_sppr === "DISETUJUI";
  const isDownloadingDisabled = !isAllowedToDownload || !selectedSppr;

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
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
        }}
      />
      <h2 className={pageStyles.header}>Data Surat Perintah Pendebitan Rekening</h2>
      
      {/* Tombol Aksi */}
      <div className={pageStyles.buttonContainer}>
        <button onClick={() => { resetForm(); fetchPejabatAndPegawai(); setShowModal(true); }} disabled={!isAllowedToRekam} className={styles.rekamButton}>
          <FaPlus/> Rekam
        </button>
        <button onClick={handleEdit} disabled={isEditingOrDeletingDisabled} className={styles.editButton}>
          <FaEdit /> Edit
        </button>
        <button onClick={handleDelete} disabled={isEditingOrDeletingDisabled} className={styles.hapusButton}>
          <FaRegTrashAlt /> Hapus
        </button>
        <button onClick={handleApprove} disabled={isApprovingDisabled} className={styles.rekamButton}>
          <MdDoneAll size={16}/> Setujui
        </button>
        <button onClick={handleDownload} disabled={isDownloadingDisabled} className={styles.downloadButton}>
          <FiDownload size={14} strokeWidth={3}/> Download PDF
        </button>
      </div>

      {/* Modal Rekam/Edit */}
      {showModal && (
        <Modal onClose={resetForm}>
          <form onSubmit={handleSave}>
            <h3 style={{ marginTop: 0 }}>{isEditing ? "Edit Data SPPR" : "Rekam Data SPPR"}</h3>
            <hr style={{ border: "0", height: "1px", backgroundColor: "#e5e7eb", margin: "20px 0" }} />
            
            {/* Baris 1: Tanggal dan Nomor Surat */}
            <div className={pageStyles.modalForm}>
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Tanggal:</label>
                <input type="date" name="tanggal" value={formData.tanggal} onChange={handleInputChange} required className={pageStyles.formInput} />
              </div>
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Nomor Surat:</label>
                <input type="text" name="nomor_surat" value={formData.nomor_surat} readOnly onChange={handleInputChange} required className={`${pageStyles.formInput} ${pageStyles.readOnly}`} />
              </div>
            </div>

            <hr style={{ border: "0", height: "1px", backgroundColor: "#e5e7eb", margin: "15px 0" }} />
            
            {/* Baris 2 & 3: KPA */}
            <div className={pageStyles.modalForm}>
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Nama KPA:</label>
                <select name="nama_kpa" value={formData.nama_kpa} onChange={handleInputChange} required className={pageStyles.formSelect}>
                  <option value="">-- Pilih KPA --</option>
                  {kpaList.map((kpa, index) => (<option key={index} value={kpa.nama}>{kpa.nama}</option>))}
                </select>
              </div>
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Pangkat KPA:</label>
                <input type="text" name="pangkat_kpa" value={formData.pangkat_kpa} readOnly className={`${pageStyles.formInput} ${pageStyles.readOnly}`} />
              </div>
            </div>
            <hr style={{ border: "0", height: "1px", backgroundColor: "#e5e7eb", margin: "15px 0" }} />

            {/* Baris 4 & 5: Bendahara */}
            <div className={pageStyles.modalForm}>
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Nama Bendahara:</label>
                <select name="nama_bendahara" value={formData.nama_bendahara} onChange={handleInputChange} required className={pageStyles.formSelect}>
                  <option value="">-- Pilih Bendahara --</option>
                  {bendaharaList.map((bendahara, index) => (<option key={index} value={bendahara.nama}>{bendahara.nama}</option>))}
                </select>
              </div>
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Pangkat Bendahara:</label>
                <input type="text" name="pangkat_bendahara" value={formData.pangkat_bendahara} readOnly className={`${pageStyles.formInput} ${pageStyles.readOnly}`} />
              </div>
            </div>

            <hr style={{ border: "0", height: "1px", backgroundColor: "#e5e7eb", margin: "15px 0" }} />

            {/* Baris 6 & 7: Pengambil */}
            <div className={pageStyles.modalForm}>
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Nama Pengambil:</label>
                <select name="nama_pengambil" value={formData.nama_pengambil} onChange={handleInputChange} required className={pageStyles.formSelect}>
                  <option value="">-- Pilih Pengambil --</option>
                  {pengambilList.map((pengambil, index) => (<option key={index} value={pengambil.nama}>{pengambil.nama}</option>))}
                </select>
              </div>
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Pangkat Pengambil:</label>
                <input type="text" name="pangkat_pengambil" value={formData.pangkat_pengambil} readOnly className={`${pageStyles.formInput} ${pageStyles.readOnly}`} />
              </div>
            </div>

            <hr style={{ border: "0", height: "1px", backgroundColor: "#e5e7eb", margin: "20px 0" }} />
            
            {/* BARIS BARU: Rekening Penarikan (Kiri) dan Jumlah Penarikan (Kanan) */}
            <div className={pageStyles.modalForm}>
              
              {/* Rekening Penarikan (Kiri) */}
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Rekening Penarikan:</label>
                <select 
                  name="rekening_penarikan" 
                  value={formData.rekening_penarikan} 
                  onChange={handleInputChange} 
                  required 
                  className={`${pageStyles.formSelect} ${formData.rekening_penarikan === "" ? pageStyles.selectPlaceholder : ""}`}
                >
                  <option value="">-- Pilih Rekening --</option>
                  {rekeningOptions.map((rekening, index) => (
                    <option key={index} value={rekening.value}>{rekening.label}</option>
                  ))}
                </select>
              </div>

              {/* Jumlah Penarikan (Kanan) */}
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Jumlah Penarikan (Rp):</label>
                <input type="text" name="jumlah_penarikan" value={formatAngka(formData.jumlah_penarikan)} onChange={handleInputChange} className={pageStyles.formInput} />
              </div>
            </div>
            
            {/* BARIS BARU: Terbilang (Full Width di Bawah Sekali) */}
            <div className={pageStyles.modalForm} style={{ marginTop: '10px' }}> 
              <div className={pageStyles.formGroupFull}>
                <label className={pageStyles.formLabel}>Terbilang:</label>
                <div className={pageStyles.formReadOnly}>{capitalizeWords(terbilang(parseInt(formData.jumlah_penarikan.toString()) || 0))} Rupiah</div>
              </div>
            </div>

            <div className={pageStyles.formActions}>
              <button type="button" onClick={resetForm} className={pageStyles.formCancel}>Batal</button>
              <button type="submit" className={styles.rekamButton}>{isEditing ? "Update" : "Simpan"}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Tabel Data SPPR */}
      <div className={pageStyles.tableContainer}>
        <div className={pageStyles.tableWrapper}>
          {/* Tampilkan loading saat initial load */}
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
                <th style={{ width: "5%" }}>No.</th>
                <th style={{ width: "10%" }}>Tanggal</th>
                <th style={{ width: "20%" }}>Nomor Surat</th>
                <th style={{ width: "25%" }}>Operator</th>
                <th style={{ width: "10%", textAlign: "right"}}>Jumlah Penarikan</th>
                <th style={{ width: "10%" }}>Status</th>
              </tr>
            </thead>
            <tbody className={pageStyles.tableBody}>
              {paginatedSppr.length > 0 ? (
                paginatedSppr.map((sppr, index) => (
                  <tr key={sppr.id} onClick={() => handleRowClick(sppr)} className={`${pageStyles.tableRow} ${selectedSppr?.id === sppr.id ? pageStyles.selected : ""}`}>
                    <td>{startIndex + index + 1}</td>
                    <td>{formatTanggal(sppr.tanggal)}</td>
                    <td>{sppr.nomor_surat}</td>
                    <td>{sppr.operator}</td>
                    <td style={{ textAlign: "right" }}>{formatAngka(sppr.jumlah_penarikan)}</td>
                    <td>{sppr.status_sppr}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className={pageStyles.tableEmpty}>
                    {isTableLoading ? "" : "Tidak ada data SPPR yang ditemukan."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Paginasi currentPage={currentPage} totalPages={totalPages} totalItems={spprList.length} itemsPerPage={rowsPerPage} onPageChange={handlePageChange} onItemsPerPageChange={handleRowsPerPageChange} />

      {/* Detail Data SPPR */}
      <div className={pageStyles.detailContainerSPPR}>
  <div className={pageStyles.detailHeaderSPPR}>Detail Data SPPR</div>
  {isDetailLoading ? (
    <div className={pageStyles.detailContentSPPR} style={{ position: 'relative', minHeight: '160px' }}>
      <div className={pageStyles.tableOverlay} >
        <div className={loadingStyles.dotContainer}>
          <div className={`${loadingStyles.dot} ${loadingStyles['dot-1']}`} />
          <div className={`${loadingStyles.dot} ${loadingStyles['dot-2']}`} />
          <div className={`${loadingStyles.dot} ${loadingStyles['dot-3']}`} />
        </div>
      </div>
    </div>
  ) : selectedSppr ? (
    <div className={pageStyles.detailContentSPPR}>
      <div className={pageStyles.detailItemSPPR}>
        <div className={pageStyles.detailLabelSPPR}>Tanggal</div>
        <div className={pageStyles.detailValueSPPR}>: {formatTanggal(selectedSppr.tanggal)}</div></div>
      <div className={pageStyles.detailItemSPPR}><div className={pageStyles.detailLabelSPPR}>Nomor Surat</div><div className={pageStyles.detailValueSPPR}>: {selectedSppr.nomor_surat}</div></div>
      <div className={pageStyles.detailItemSPPR}><div className={pageStyles.detailLabelSPPR}>Nama KPA</div><div className={pageStyles.detailValueSPPR}>: {selectedSppr.nama_kpa}</div></div>
      <div className={pageStyles.detailItemSPPR}><div className={pageStyles.detailLabelSPPR}>Jabatan KPA</div><div className={pageStyles.detailValueSPPR}>: {selectedSppr.jabatan_kpa || "N/A"}</div></div>
      <div className={pageStyles.detailItemSPPR}><div className={pageStyles.detailLabelSPPR}>Pangkat KPA</div><div className={pageStyles.detailValueSPPR}>: {selectedSppr.pangkat_kpa}</div></div>
      <div className={pageStyles.detailItemSPPR}><div className={pageStyles.detailLabelSPPR}>Nama Bendahara</div><div className={pageStyles.detailValueSPPR}>: {selectedSppr.nama_bendahara}</div></div>
      <div className={pageStyles.detailItemSPPR}><div className={pageStyles.detailLabelSPPR}>Jabatan Bendahara</div><div className={pageStyles.detailValueSPPR}>: {selectedSppr.jabatan_bendahara || "N/A"}</div></div>
      <div className={pageStyles.detailItemSPPR}><div className={pageStyles.detailLabelSPPR}>Pangkat Bendahara</div><div className={pageStyles.detailValueSPPR}>: {selectedSppr.pangkat_bendahara}</div></div>
      <div className={pageStyles.detailItemSPPR}><div className={pageStyles.detailLabelSPPR}>Nama Pengambil</div><div className={pageStyles.detailValueSPPR}>: {selectedSppr.nama_pengambil}</div></div>
      <div className={pageStyles.detailItemSPPR}><div className={pageStyles.detailLabelSPPR}>Jabatan Pengambil</div><div className={pageStyles.detailValueSPPR}>: {selectedSppr.jabatan_pengambil || "N/A"}</div></div>
      <div className={pageStyles.detailItemSPPR}><div className={pageStyles.detailLabelSPPR}>Pangkat Pengambil</div><div className={pageStyles.detailValueSPPR}>: {selectedSppr.pangkat_pengambil}</div></div>
      <div className={pageStyles.detailItemSPPR}><div className={pageStyles.detailLabelSPPR}>Operator</div><div className={pageStyles.detailValueSPPR}>: {selectedSppr.operator || "N/A"}</div></div>
      
      {/* TAMBAHAN: 3 Kolom Baru Rekening */}
      <div className={pageStyles.detailItemSPPR}><div className={pageStyles.detailLabelSPPR}>Nama Bank</div><div className={pageStyles.detailValueSPPR}>: {selectedSppr.nama_bank || "N/A"}</div></div>
      <div className={pageStyles.detailItemSPPR}><div className={pageStyles.detailLabelSPPR}>Nama Rekening</div><div className={pageStyles.detailValueSPPR}>: {selectedSppr.nama_rekening || "N/A"}</div></div>
      <div className={pageStyles.detailItemSPPR}><div className={pageStyles.detailLabelSPPR}>Nomor Rekening</div><div className={pageStyles.detailValueSPPR}>: {selectedSppr.nomor_rekening || "N/A"}</div></div>
      
      <div className={pageStyles.detailItemFullSPPR}>
        <div className={pageStyles.detailLabelSPPR}>Jumlah Penarikan</div>
        <div className={pageStyles.detailValueSPPR}>: {formatAngka(selectedSppr.jumlah_penarikan)} ({capitalizeWords(terbilang(selectedSppr.jumlah_penarikan))} Rupiah)</div>
      </div>
    </div>
  ) : (
    <div className={pageStyles.tableEmpty}>Data SPPR Belum Dipilih</div>
  )}
</div>
    </div>
  );
};

export default Sppr;