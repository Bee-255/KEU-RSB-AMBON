// src/app/pegawai/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/utils/supabaseClient";
import Swal from "sweetalert2";
import { FaPlus, FaEdit, FaRegTrashAlt } from "react-icons/fa";
import Paginasi from '@/components/paginasi';
import styles from "@/styles/button.module.css";
import pageStyles from "@/styles/komponen.module.css";

// Interface untuk data pegawai
interface PegawaiData {
  id: string;
  nama: string;
  pekerjaan: string;
  nrp_nip_nir: string;
  klasifikasi: string;
  pangkat: string;
  tipe_identitas: string;
  golongan: string;
  jabatan_struktural: string;
  status: string;
  bank: string;
  no_rekening: string;
  nama_rekening: string;
}

// Interface untuk state form
interface FormPegawaiData {
  nama: string;
  pekerjaan: string;
  nrp_nip_nir: string;
  klasifikasi: string;
  pangkat: string;
  tipe_identitas: string;
  golongan: string;
  jabatan_struktural: string;
  status: string;
  bank: string;
  no_rekening: string;
  nama_rekening: string;
}

// Interface untuk mapping golongan
interface PangkatMap {
  [key: string]: string[];
}

const Modal: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({ children, onClose }) => {
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

const allPangkatPolri: string[] = [
  "KOMISARIS BESAR POLISI", "AJUN KOMISARIS BESAR POLISI", "KOMISARIS POLISI", "AJUN KOMISARIS POLISI",
  "INSPEKTUR POLISI SATU", "INSPEKTUR POLISI DUA", "AIPTU", "AIPDA",
  "BRIPKA", "BRIGADIR", "BRIPTU", "BRIPDA", "AJUN BRIGADIR POLISI",
  "AJUN BRIGADIR POLISI DUA", "BHAYANGKARA KEPALA", "BHAYANGKARA SATU", "BHAYANGKARA DUA"
];

const allPangkatAsn: string[] = [
  "PEMBINA UTAMA", "PEMBINA UTAMA MADYA", "PEMBINA UTAMA MUDA", "PEMBINA TK. I", "PEMBINA",
  "PENATA TK. I", "PENATA", "PENDA TK. I", "PENDA", "PENGATUR TK. I",
  "PENGATUR", "PENGATUR MUDA TK. I", "PENGATUR MUDA", "JURU TK. I", "JURU",
  "JURU MUDA TK. I", "JURU MUDA"
];

const golonganByPangkatAsn: PangkatMap = {
  "PEMBINA UTAMA": ["IV/e"], "PEMBINA UTAMA MADYA": ["IV/d"], "PEMBINA UTAMA MUDA": ["IV/c"], "PEMBINA TK. I": ["IV/b"], "PEMBINA": ["IV/a"],
  "PENATA TK. I": ["III/d"], "PENATA": ["III/c"], "PENDA TK. I": ["III/b"], "PENDA": ["III/a"],
  "PENGATUR TK. I": ["II/d"], "PENGATUR": ["II/c"], "PENGATUR MUDA TK. I": ["II/b"], "PENGATUR MUDA": ["II/a"],
  "JURU TK. I": ["I/d"], "JURU": ["I/c"], "JURU MUDA TK. I": ["I/b"], "JURU MUDA": ["I/a"],
};

const golonganByPangkatPolri: PangkatMap = {
  "KOMISARIS BESAR POLISI": ["IV/c"], "AJUN KOMISARIS BESAR POLISI": ["IV/b"], "KOMISARIS POLISI": ["IV/a"],
  "AJUN KOMISARIS POLISI": ["III/c"], "INSPEKTUR POLISI SATU": ["III/b"], "INSPEKTUR POLISI DUA": ["III/a"],
  "AIPTU": ["II/f"], "AIPDA": ["II/e"], "BRIPKA": ["II/d"], "BRIGADIR": ["II/c"], "BRIPTU": ["II/b"], "BRIPDA": ["II/a"],
  "AJUN BRIGADIR POLISI": ["I/e"], "AJUN BRIGADIR POLISI DUA": ["I/d"], "BHAYANGKARA KEPALA": ["I/c"], "BHAYANGKARA SATU": ["I/b"], "BHAYANGKARA DUA": ["I/a"]
};

const pekerjaanOrder: string[] = ["Anggota Polri", "ASN", "PPPK", "TKK", "Dokter Mitra", "Tenaga Mitra"];

export default function Pegawai() {
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedPegawai, setSelectedPegawai] = useState<PegawaiData | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterPekerjaan, setFilterPekerjaan] = useState<string>("");

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

  const fetchPegawai = useCallback(async () => {
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
    
    const sortedData = data.sort((a, b) => {
      const pekerjaanA = pekerjaanOrder.indexOf(a.pekerjaan);
      const pekerjaanB = pekerjaanOrder.indexOf(b.pekerjaan);
      if (pekerjaanA !== pekerjaanB) return pekerjaanA - pekerjaanB;
      
      const statusOrder: { [key: string]: number } = { 'Aktif': 1, 'Tidak Aktif': 2 };
      const statusA = statusOrder[a.status] || 3;
      const statusB = statusOrder[b.status] || 3;
      if (statusA !== statusB) return statusA - statusB;

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
    
    setListPegawai(paginatedData as PegawaiData[]);
  }, [currentPage, itemsPerPage, searchTerm, filterPekerjaan]);

  const saveOrUpdatePegawai = useCallback(async () => {
    try {
      if (editId) {
        const { error } = await supabase.from("pegawai").update(pegawai).eq("id", editId);
        if (error) throw error;
        Swal.fire("Berhasil!", "Data pegawai berhasil diperbarui.", "success");
      } else {
        const { error } = await supabase.from("pegawai").insert([pegawai]);
        if (error) throw error;
        Swal.fire("Berhasil!", "Pegawai baru berhasil ditambahkan.", "success");
      }
      resetForm();
      fetchPegawai();
    } catch (error: any) {
      Swal.fire("Error!", error.message, "error");
    }
  }, [editId, pegawai, fetchPegawai]);

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
        .eq("nrp_nip_nir", inputNrpNipNir);

    if (checkError) {
        console.error("Supabase error:", checkError);
        Swal.fire("Error!", "Terjadi kesalahan saat memeriksa data. Silakan coba lagi.", "error");
        return;
    }

    if (existingPegawai && existingPegawai.length > 0) {
        const tipeIdentitas = pegawai.pekerjaan === "Anggota Polri" ? "NRP" : pegawai.pekerjaan === "ASN" ? "NIP" : "NIR";
        Swal.fire("Gagal!", `Data ${tipeIdentitas} sudah ada dengan nama ${existingPegawai[0].nama}.`, "error");
        return;
    }
    
    saveOrUpdatePegawai();
  };

  const handleDelete = useCallback(async () => {
    if (!selectedPegawai) return;
    const result = await Swal.fire({
      title: "Apakah Anda yakin?",
      text: `Anda akan menghapus data ${selectedPegawai.nama}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    });
    
    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from("pegawai").delete().eq("id", selectedPegawai.id);
        if (error) throw error;
        Swal.fire("Terhapus!", "Data pegawai telah dihapus.", "success");
        setSelectedPegawai(null);
        fetchPegawai();
      } catch (error) {
        console.error("Error:", error);
        Swal.fire("Error!", "Terjadi kesalahan saat menghapus data.", "error");
      }
    }
  }, [selectedPegawai, fetchPegawai]);

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
      bank: "-", no_rekening: "-", nama_rekening: "-",
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

  const handleRowClick = (p: PegawaiData) => {
    if (selectedPegawai?.id === p.id) {
      setSelectedPegawai(null);
    } else {
      setSelectedPegawai(p);
    }
  };
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setFilterPekerjaan(e.target.value);
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
    fetchPegawai();
    fetchUserRole();
  }, [fetchPegawai, fetchUserRole]);

  useEffect(() => {
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
      newGolonganOptions = golonganByPangkatAsn[pegawai.pangkat] || [];
    } else if (pegawai.pekerjaan === "Anggota Polri" && pegawai.pangkat) {
      newGolonganOptions = golonganByPangkatPolri[pegawai.pangkat] || [];
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
    } else {
      setPegawai(prev => ({ ...prev, tipe_identitas: "NIR" }));
    }
  }, [pegawai.pekerjaan]);

  const isAllowedToEditOrDelete = userRole === "Owner" || userRole === "Admin";
  
  return (
    <div className={pageStyles.container}>
      <h2 className={pageStyles.header}>Data Pegawai</h2>

      <div className={pageStyles.buttonContainer}>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          disabled={!isAllowedToEditOrDelete}
          className={styles.rekamButton}
        >
          <FaPlus /> Rekam
        </button>
        
        <button
          onClick={handleEdit}
          disabled={!selectedPegawai || !isAllowedToEditOrDelete}
          className={styles.editButton}
        >
          <FaEdit /> Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={!selectedPegawai || !isAllowedToEditOrDelete}
          className={styles.hapusButton}
        >
          <FaRegTrashAlt /> Hapus
        </button>
        
        <select
            value={filterPekerjaan}
            onChange={handleFilterChange}
            className={pageStyles.filterSelect}
        >
            <option value="">Semua Pekerjaan</option>
            {pekerjaanOrder.map((pekerjaan) => (
                <option key={pekerjaan} value={pekerjaan}>{pekerjaan}</option>
            ))}
        </select>

        <div className={pageStyles.searchContainer}>
          <input
            type="text"
            placeholder="Cari pegawai..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className={pageStyles.searchInput}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className={pageStyles.searchClearButton}
            >
              &#x2715;
            </button>
          )}
        </div>
      </div>
      
      {showModal && (
        <Modal onClose={resetForm}>
          <form onSubmit={handleSubmit}>
            <h3 style={{ marginTop: 0 }}>{editId ? "Edit Data Pegawai" : "Rekam Pegawai Baru"}</h3>

            <div className={pageStyles.modalForm}>
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Nama:</label>
                <input
                  type="text"
                  name="nama"
                  value={pegawai.nama}
                  onChange={handleChange}
                  required
                  className={pageStyles.formInput}
                />
              </div>

              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Pekerjaan:</label>
                <select
                  name="pekerjaan"
                  value={pegawai.pekerjaan}
                  onChange={handleChange}
                  required
                  className={pageStyles.formSelect}
                >
                  <option value="">-- Pilih Pekerjaan --</option>
                  <option>Anggota Polri</option>
                  <option>ASN</option>
                  <option>PPPK</option>
                  <option>TKK</option>
                  <option>Dokter Mitra</option>
                  <option>Tenaga Mitra</option>
                </select>
              </div>

              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Tipe Identitas:</label>
                <input
                  type="text"
                  name="tipe_identitas"
                  value={pegawai.tipe_identitas}
                  onChange={handleChange}
                  readOnly
                  disabled
                  className={`${pageStyles.formInput} ${pageStyles.readOnly}`}
                />
              </div>

              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>NRP / NIP / NIR:</label>
                <input
                  type="text"
                  name="nrp_nip_nir"
                  value={pegawai.nrp_nip_nir}
                  onChange={handleChange}
                  required
                  className={pageStyles.formInput}
                />
              </div>

              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Pangkat:</label>
                <select
                  name="pangkat"
                  value={pegawai.pangkat}
                  onChange={handleChange}
                  required={pegawai.pekerjaan === "Anggota Polri" || pegawai.pekerjaan === "ASN"}
                  disabled={pegawai.pekerjaan !== "Anggota Polri" && pegawai.pekerjaan !== "ASN"}
                  className={`${pageStyles.formSelect} ${pegawai.pekerjaan !== "Anggota Polri" && pegawai.pekerjaan !== "ASN" ? pageStyles.readOnly : ""}`}
                >
                  <option value="">-- Pilih Pangkat --</option>
                  {pangkatOptions.map((pangkat) => (
                    <option key={pangkat} value={pangkat}>
                      {pangkat}
                    </option>
                  ))}
                </select>
              </div>

              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Golongan:</label>
                <select
                  name="golongan"
                  value={pegawai.golongan}
                  onChange={handleChange}
                  required={pegawai.pekerjaan === "ASN"}
                  disabled={true}
                  className={`${pageStyles.formSelect} ${pageStyles.readOnly}`}
                >
                  <option value="">-- Terisi Otomatis --</option>
                  {golonganOptions.map((golongan) => (
                    <option key={golongan} value={golongan}>
                      {golongan}
                    </option>
                  ))}
                </select>
              </div>

              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Jabatan Struktural:</label>
                <input
                  type="text"
                  name="jabatan_struktural"
                  value={pegawai.jabatan_struktural}
                  onChange={handleChange}
                  className={pageStyles.formInput}
                />
              </div>

              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Klasifikasi:</label>
                <select
                  name="klasifikasi"
                  value={pegawai.klasifikasi}
                  onChange={handleChange}
                  required
                  className={pageStyles.formSelect}
                >
                  <option value="">-- Pilih Klasifikasi --</option>
                  <option>Medis</option>
                  <option>Paramedis</option>
                  <option>Non Medis</option>
                </select>
              </div>
              
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Status:</label>
                <select
                  name="status"
                  value={pegawai.status}
                  onChange={handleChange}
                  required
                  className={pageStyles.formSelect}
                >
                  <option value="">-- Pilih Status --</option>
                  <option>Aktif</option>
                  <option>Tidak Aktif</option>
                </select>
              </div>

              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Bank:</label>
                <input
                  type="text"
                  name="bank"
                  value={pegawai.bank}
                  onChange={handleChange}
                  className={pageStyles.formInput}
                />
              </div>

              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>No. Rekening:</label>
                <input
                  type="text"
                  name="no_rekening"
                  value={pegawai.no_rekening}
                  onChange={handleChange}
                  className={pageStyles.formInput}
                />
              </div>

              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Nama Rekening:</label>
                <input
                  type="text"
                  name="nama_rekening"
                  value={pegawai.nama_rekening}
                  onChange={handleChange}
                  className={pageStyles.formInput}
                />
              </div>
            </div>

            <div className={pageStyles.formActions}>
              <button
                type="button"
                onClick={resetForm}
                className={pageStyles.formCancel}
              >
                Batal
              </button>
              <button
                type="submit"
                className={styles.rekamButton}
              >
                {editId ? "Update" : "Simpan"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      
      <div className={pageStyles.tableContainer}>
        <table className={pageStyles.table}>
          <thead className={pageStyles.tableHead}>
            <tr>
              <th>No.</th>
              <th>Nama</th>
              <th>Pekerjaan</th>
              <th>Pangkat</th>
              <th>NRP / NIP / NIR</th>
              <th>Jabatan Struktural</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody className={pageStyles.tableBody}>
            {listPegawai.length > 0 ? (
              listPegawai.map((p, index) => (
                <tr
                  key={p.id}
                  onClick={() => handleRowClick(p)}
                  className={`${pageStyles.tableRow} ${selectedPegawai?.id === p.id ? pageStyles.selected : ""}`}
                >
                  <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                  <td>{p.nama}</td>
                  <td>{p.pekerjaan}</td>
                  <td>{p.pangkat}</td>
                  <td>{p.nrp_nip_nir}</td>
                  <td>{p.jabatan_struktural}</td>
                  <td>{p.status}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className={pageStyles.tableEmpty}>
                  Tidak ada data pegawai yang ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
      

      <div className={pageStyles.detailContainer}>
        <div className={pageStyles.detailHeader}>Detail Data Pegawai</div>
        {selectedPegawai ? (
          <div className={pageStyles.detailContent}>
            <div className={pageStyles.detailItem}>
              <div className={pageStyles.detailLabel}>Nama</div>
              <div className={pageStyles.detailValue}>: {selectedPegawai.nama}</div>
            </div>
            <div className={pageStyles.detailItem}>
              <div className={pageStyles.detailLabel}>Pekerjaan</div>
              <div className={pageStyles.detailValue}>: {selectedPegawai.pekerjaan}</div>
            </div>
            <div className={pageStyles.detailItem}>
              <div className={pageStyles.detailLabel}>Tipe Identitas</div>
              <div className={pageStyles.detailValue}>: {selectedPegawai.tipe_identitas}</div>
            </div>
            <div className={pageStyles.detailItem}>
              <div className={pageStyles.detailLabel}>NRP / NIP / NIR</div>
              <div className={pageStyles.detailValue}>: {selectedPegawai.nrp_nip_nir}</div>
            </div>
            <div className={pageStyles.detailItem}>
              <div className={pageStyles.detailLabel}>Klasifikasi</div>
              <div className={pageStyles.detailValue}>: {selectedPegawai.klasifikasi}</div>
            </div>
            <div className={pageStyles.detailItem}>
              <div className={pageStyles.detailLabel}>Pangkat</div>
              <div className={pageStyles.detailValue}>: {selectedPegawai.pangkat}</div>
            </div>
            <div className={pageStyles.detailItem}>
              <div className={pageStyles.detailLabel}>Golongan</div>
              <div className={pageStyles.detailValue}>: {selectedPegawai.golongan}</div>
            </div>
            <div className={pageStyles.detailItem}>
              <div className={pageStyles.detailLabel}>Jabatan Struktural</div>
              <div className={pageStyles.detailValue}>: {selectedPegawai.jabatan_struktural}</div>
            </div>
            <div className={pageStyles.detailItem}>
              <div className={pageStyles.detailLabel}>Status</div>
              <div className={pageStyles.detailValue}>: {selectedPegawai.status}</div>
            </div>
            <div className={pageStyles.detailItem}>
              <div className={pageStyles.detailLabel}>Bank</div>
              <div className={pageStyles.detailValue}>: {selectedPegawai.bank}</div>
            </div>
            <div className={pageStyles.detailItem}>
              <div className={pageStyles.detailLabel}>No. Rekening</div>
              <div className={pageStyles.detailValue}>: {selectedPegawai.no_rekening}</div>
            </div>
            <div className={pageStyles.detailItem}>
              <div className={pageStyles.detailLabel}>Nama Rekening</div>
              <div className={pageStyles.detailValue}>: {selectedPegawai.nama_rekening}</div>
            </div>
          </div>
        ) : (
          <div className={pageStyles.tableEmpty}>Data Pegawai Belum Dipilih</div>
        )}
      </div>
    </div>
  );
}