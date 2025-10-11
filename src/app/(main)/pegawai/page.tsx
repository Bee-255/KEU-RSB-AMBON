'use client';

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/utils/supabaseClient";
import Paginasi from '@/components/paginasi';
import pageStyles from "@/styles/komponen.module.css";
// 👈 Import hook notifikasi kustom
import { useKeuNotification } from "@/lib/useKeuNotification"; 

// Import types, constants, dan components
import { FormPegawaiData, PegawaiData } from './types';
import { golonganByPangkatAsn, golonganByPangkatPolri } from './constants';
import Modal from './components/Modal';
import PegawaiForm from './components/PegawaiForm';
import PegawaiTable from './components/PegawaiTable';
import PegawaiDetail from './components/PegawaiDetail';
import SearchAndFilter from './components/SearchAndFilter';
import ActionButtons from './components/ActionButtons';

export default function Pegawai() {
  const { showToast, showConfirm } = useKeuNotification(); // 👈 Inisialisasi hook

  const [editId, setEditId] = useState<string | null>(null);
  const [selectedPegawai, setSelectedPegawai] = useState<PegawaiData | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterPekerjaan, setFilterPekerjaan] = useState<string>("");
  const [isTableLoading, setIsTableLoading] = useState<boolean>(true);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);

  const [pegawai, setPegawai] = useState<FormPegawaiData>({
    nama: "",
    pekerjaan: "",
    nrp_nip_nir: "",
    klasifikasi: "",
    pangkat: "",
    tipe_identitas: "",
    golongan: "",
    jabatan_struktural: "",
    status: "",
    bank: "-",
    no_rekening: "-",
    nama_rekening: "",
  });

  const [listPegawai, setListPegawai] = useState<PegawaiData[]>([]);
  const [pangkatOptions, setPangkatOptions] = useState<string[]>([]);
  const [golonganOptions, setGolonganOptions] = useState<string[]>([]);
  
  const [userRole, setUserRole] = useState<string | null>(null);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Helper function untuk safe access ke golonganByPangkatAsn
  const getGolonganAsn = (pangkat: string): string[] => {
    if (pangkat in golonganByPangkatAsn) {
      return golonganByPangkatAsn[pangkat as keyof typeof golonganByPangkatAsn];
    }
    return [];
  };

  // Helper function untuk safe access ke golonganByPangkatPolri
  const getGolonganPolri = (pangkat: string): string[] => {
    if (pangkat in golonganByPangkatPolri) {
      return golonganByPangkatPolri[pangkat as keyof typeof golonganByPangkatPolri];
    }
    return [];
  };

  const fetchPegawai = useCallback(async () => {
    setIsTableLoading(true);
    try {
      let query = supabase.from("pegawai").select("*", { count: "exact" });

      if (filterPekerjaan) {
        query = query.filter('pekerjaan', 'eq', filterPekerjaan);
      }

      if (searchTerm) {
        query = query.or(`nama.ilike.%${searchTerm}%,pekerjaan.ilike.%${searchTerm}%,nrp_nip_nir.ilike.%${searchTerm}%`);
      }

      const { data, count, error } = await query.order("id", { ascending: false });

      if (error) {
        console.error("Error fetching pegawai:", error.message);
        return;
      }
      
      const sortedData = (data as PegawaiData[]).sort((a, b) => {
        const pekerjaanOrder = ["Anggota Polri", "ASN", "PPPK", "TKK", "Dokter Mitra", "Tenaga Mitra"];
        const pekerjaanA = pekerjaanOrder.indexOf(a.pekerjaan);
        const pekerjaanB = pekerjaanOrder.indexOf(b.pekerjaan);
        if (pekerjaanA !== pekerjaanB) return pekerjaanA - pekerjaanB;
        
        const statusOrder: { [key: string]: number } = { 'Aktif': 1, 'Tidak Aktif': 2 };
        const statusA = statusOrder[a.status] || 3;
        const statusB = statusOrder[b.status] || 3;
        if (statusA !== statusB) return statusA - statusB;

        const allPangkatPolri = [
          "KOMISARIS BESAR POLISI", "AJUN KOMISARIS BESAR POLISI", "KOMISARIS POLISI", "AJUN KOMISARIS POLISI",
          "INSPEKTUR POLISI SATU", "INSPEKTUR POLISI DUA", "AIPTU", "AIPDA",
          "BRIPKA", "BRIGADIR", "BRIPTU", "BRIPDA", "AJUN BRIGADIR POLISI",
          "AJUN BRIGADIR POLISI DUA", "BHAYANGKARA KEPALA", "BHAYANGKARA SATU", "BHAYANGKARA DUA"
        ];

        const allPangkatAsn = [
          "PEMBINA UTAMA", "PEMBINA UTAMA MADYA", "PEMBINA UTAMA MUDA", "PEMBINA TK. I", "PEMBINA",
          "PENATA TK. I", "PENATA", "PENDA TK. I", "PENDA", "PENGATUR TK. I",
          "PENGATUR", "PENGATUR MUDA TK. I", "PENGATUR MUDA", "JURU TK. I", "JURU",
          "JURU MUDA TK. I", "JURU MUDA"
        ];

        const getPangkatIndex = (pangkat: string, pekerjaan: string) => {
          if (pekerjaan === "Anggota Polri") return allPangkatPolri.indexOf(pangkat);
          if (pekerjaan === "ASN") return allPangkatAsn.indexOf(pangkat);
          return 999;
        };
        const pangkatA = getPangkatIndex(a.pangkat, a.pekerjaan);
        const pangkatB = getPangkatIndex(b.pangkat, b.pekerjaan);
        if (pangkatA !== pangkatB) return pangkatA - pangkatB;
        
        return a.nama.localeCompare(b.nama);
      });

      setTotalItems(sortedData.length);

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage;
      const paginatedData = sortedData.slice(from, to);
      
      setListPegawai(paginatedData);
    } catch (e) {
      console.error("Failed to fetch pegawai:", e);
    } finally {
      setIsTableLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm, filterPekerjaan]);

  const saveOrUpdatePegawai = useCallback(async () => {
    try {
      if (editId) {
        const { error } = await supabase.from("pegawai").update(pegawai).eq("id", editId);
        if (error) throw error;
        showToast("Data pegawai berhasil diperbarui.", "success");
      } else {
        const { error } = await supabase.from("pegawai").insert([pegawai]);
        if (error) throw error;
        showToast("Pegawai baru berhasil ditambahkan.", "success");
      }
      resetForm();
      fetchPegawai();
    } catch (error) {
      let errorMessage = "Terjadi kesalahan yang tidak diketahui.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      showToast(`Gagal menyimpan data: ${errorMessage}`, "error");
    }
  }, [editId, pegawai, fetchPegawai, showToast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === "pekerjaan") {
      setPegawai(prev => ({ 
        ...prev, 
        [name]: value,
        pangkat: "",
        golongan: ""
      }));
    } else if (name === "pangkat") {
      setPegawai(prev => ({
        ...prev,
        [name]: value,
        golongan: ""
      }));
    } else {
      setPegawai(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editId) {
      saveOrUpdatePegawai();
      return;
    }
    
    const inputNrpNipNir = pegawai.nrp_nip_nir.trim();
    const { data: existingPegawai, error: checkError } = await supabase
        .from("pegawai")
        .select("nama, nrp_nip_nir")
        .eq("nrp_nip_nir", inputNrpNipNir)
        .limit(1);

    if (checkError) {
        console.error("Supabase error:", checkError);
        showToast("Terjadi kesalahan saat memeriksa data. Silakan coba lagi.", "error");
        return;
    }

    if (existingPegawai && existingPegawai.length > 0) {
        const tipeIdentitas = pegawai.pekerjaan === "Anggota Polri" ? "NRP" : pegawai.pekerjaan === "ASN" ? "NIP" : pegawai.pekerjaan === "PPPK" ? "NIP" : "NIR";
        showToast(`Data ${tipeIdentitas} sudah ada dengan nama ${existingPegawai[0].nama}.`, "warning");
        return;
    }
    
    saveOrUpdatePegawai();
  };

  const handleDelete = useCallback(async () => {
    if (!selectedPegawai) return;

    // 👈 Pemanggilan showConfirm yang diperbaiki
    const isConfirmed = await showConfirm({
      title: "Hapus Data Pegawai",
      message: `Apakah Anda yakin ingin menghapus data ${selectedPegawai.nama}?`,
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      // Properti 'isDanger' dihapus untuk menghindari Error 2353
    });
    
    if (isConfirmed) {
      try {
        const { error } = await supabase.from("pegawai").delete().eq("id", selectedPegawai.id);
        if (error) throw error;
        showToast("Data pegawai telah dihapus.", "success");
        setSelectedPegawai(null);
        fetchPegawai();
      } catch (error) {
        console.error("Error:", error);
        showToast("Terjadi kesalahan saat menghapus data.", "error");
      }
    }
  }, [selectedPegawai, fetchPegawai, showConfirm, showToast]);

  const handleEdit = () => {
    if (!selectedPegawai) return;
    setPegawai(selectedPegawai);
    setEditId(selectedPegawai.id);
    setShowModal(true);
  };

  const resetForm = () => {
    setPegawai({
      nama: "", pekerjaan: "", nrp_nip_nir: "", klasifikasi: "", pangkat: "",
      tipe_identitas: "", golongan: "", jabatan_struktural: "", status: "",
      bank: "-", no_rekening: "-", nama_rekening: "",
    });
    setEditId(null);
    setShowModal(false);
  };
  
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    setSelectedPegawai(null);
  };

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
    setSelectedPegawai(null);
  };

  const handleRowClick = async (p: PegawaiData) => {
    // Jika mengklik row yang sama, tutup detail
    if (selectedPegawai?.id === p.id) {
      setSelectedPegawai(null);
      return;
    }
    // Tampilkan loading
    setIsDetailLoading(true);
    setSelectedPegawai(p);
    // Simulasi loading (bisa disesuaikan dengan kebutuhan)
    // Jika ada proses async yang perlu dilakukan, letakkan di sini
    setTimeout(() => {
      setIsDetailLoading(false);
    }, 400); // 400ms loading effect
  };
  
  const handleFilterChange = (value: string) => {
      setFilterPekerjaan(value);
      setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const fetchUserRole = useCallback(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          const { data, error } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', user.id)
              .single();

          if (error) {
              console.error("Error fetching user role:", error.message);
              setUserRole(null);
          } else {
              setUserRole(data.role);
          }
      }
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([fetchPegawai(), fetchUserRole()]);
    };
    initializeData();
  }, [fetchPegawai, fetchUserRole]);

  useEffect(() => {
    const allPangkatPolri = [
      "KOMISARIS BESAR POLISI", "AJUN KOMISARIS BESAR POLISI", "KOMISARIS POLISI", "AJUN KOMISARIS POLISI",
      "INSPEKTUR POLISI SATU", "INSPEKTUR POLISI DUA", "AIPTU", "AIPDA",
      "BRIPKA", "BRIGADIR", "BRIPTU", "BRIPDA", "AJUN BRIGADIR POLISI",
      "AJUN BRIGADIR POLISI DUA", "BHAYANGKARA KEPALA", "BHAYANGKARA SATU", "BHAYANGKARA DUA"
    ];

    const allPangkatAsn = [
      "PEMBINA UTAMA", "PEMBINA UTAMA MADYA", "PEMBINA UTAMA MUDA", "PEMBINA TK. I", "PEMBINA",
      "PENATA TK. I", "PENATA", "PENDA TK. I", "PENDA", "PENGATUR TK. I",
      "PENGATUR", "PENGATUR MUDA TK. I", "PENGATUR MUDA", "JURU TK. I", "JURU",
      "JURU MUDA TK. I", "JURU MUDA"
    ];

    if (pegawai.pekerjaan === "Anggota Polri") {
      setPangkatOptions(allPangkatPolri);
    } else if (pegawai.pekerjaan === "ASN") {
      setPangkatOptions(allPangkatAsn);
    } else {
      setPangkatOptions([]);
    }
  }, [pegawai.pekerjaan]);

  useEffect(() => {
    let newGolonganOptions: string[] = [];
    if (pegawai.pekerjaan === "ASN" && pegawai.pangkat) {
      // Menggunakan helper function untuk safe access
      newGolonganOptions = getGolonganAsn(pegawai.pangkat);
    } else if (pegawai.pekerjaan === "Anggota Polri" && pegawai.pangkat) {
      // Menggunakan helper function untuk safe access
      newGolonganOptions = getGolonganPolri(pegawai.pangkat);
    }

    setGolonganOptions(newGolonganOptions);

    if (newGolonganOptions.length === 1) {
      setPegawai(prev => ({ ...prev, golongan: newGolonganOptions[0] }));
    } else {
      setPegawai(prev => ({ ...prev, golongan: "" }));
    }
  }, [pegawai.pekerjaan, pegawai.pangkat]);

  useEffect(() => {
    if (pegawai.pekerjaan === "Anggota Polri") {
      setPegawai(prev => ({ ...prev, tipe_identitas: "NRP" }));
    } else if (pegawai.pekerjaan === "ASN") {
      setPegawai(prev => ({ ...prev, tipe_identitas: "NIP" }));
    } else if (pegawai.pekerjaan === "PPPK") {
      setPegawai(prev => ({ ...prev, tipe_identitas: "NIP" }));
    } else {
      setPegawai(prev => ({ ...prev, tipe_identitas: "NIR" }));
    }
  }, [pegawai.pekerjaan]);

  const isAllowedToEditOrDelete = userRole === "Owner" || userRole === "Admin";

  return (
    <div className={pageStyles.container}>
      <h2 className={pageStyles.header}>Data Pegawai</h2>

      <div className={pageStyles.buttonContainer}>
        <ActionButtons
          isAllowedToEditOrDelete={isAllowedToEditOrDelete}
          selectedPegawai={selectedPegawai}
          onAdd={() => { resetForm(); setShowModal(true); }}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
        
        <SearchAndFilter
          searchTerm={searchTerm}
          filterPekerjaan={filterPekerjaan}
          onSearchChange={handleSearchChange}
          onFilterChange={handleFilterChange}
        />
      </div>
      
      {showModal && (
        <Modal onClose={resetForm}>
          <PegawaiForm
            pegawai={pegawai}
            editId={editId}
            pangkatOptions={pangkatOptions}
            golonganOptions={golonganOptions}
            onClose={resetForm}
            onSubmit={handleSubmit}
            onChange={handleChange}
          />
        </Modal>
      )}
      
      <PegawaiTable
        listPegawai={listPegawai}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        selectedPegawai={selectedPegawai}
        isTableLoading={isTableLoading}
        onRowClick={handleRowClick}
      />

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Paginasi
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      </div>
      
      <PegawaiDetail
        selectedPegawai={selectedPegawai}
        isDetailLoading={isDetailLoading}
      />
    </div>
  );
}