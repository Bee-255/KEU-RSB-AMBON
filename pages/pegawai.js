// components/Pegawai.js

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import Swal from "sweetalert2";
import { FaPlus, FaEdit, FaRegTrashAlt } from "react-icons/fa";
import PaginasiKeu from '../components/paginasi';

// ✅ Impor file CSS Modules
import styles from "../styles/button.module.css";
import pageStyles from "../styles/komponen.module.css";

// Komponen Modal Pop-up
const Modal = ({ children, onClose }) => {
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

// Data Pangkat dan Golongan Statis
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

const golonganByPangkatAsn = {
  "PEMBINA UTAMA": ["IV/e"], "PEMBINA UTAMA MADYA": ["IV/d"], "PEMBINA UTAMA MUDA": ["IV/c"], "PEMBINA TK. I": ["IV/b"], "PEMBINA": ["IV/a"],
  "PENATA TK. I": ["III/d"], "PENATA": ["III/c"], "PENDA TK. I": ["III/b"], "PENDA": ["III/a"],
  "PENGATUR TK. I": ["II/d"], "PENGATUR": ["II/c"], "PENGATUR MUDA TK. I": ["II/b"], "PENGATUR MUDA": ["II/a"],
  "JURU TK. I": ["I/d"], "JURU": ["I/c"], "JURU MUDA TK. I": ["I/b"], "JURU MUDA": ["I/a"],
};

const golonganByPangkatPolri = {
  "KOMISARIS BESAR POLISI": ["IV/c"], "AJUN KOMISARIS BESAR POLISI": ["IV/b"], "KOMISARIS POLISI": ["IV/a"],
  "AJUN KOMISARIS POLISI": ["III/c"], "INSPEKTUR POLISI SATU": ["III/b"], "INSPEKTUR POLISI DUA": ["III/a"],
  "AIPTU": ["II/f"], "AIPDA": ["II/e"], "BRIPKA": ["II/d"], "BRIGADIR": ["II/c"], "BRIPTU": ["II/b"], "BRIPDA": ["II/a"],
  "AJUN BRIGADIR POLISI": ["I/e"], "AJUN BRIGADIR POLISI DUA": ["I/d"], "BHAYANGKARA KEPALA": ["I/c"], "BHAYANGKARA SATU": ["I/b"], "BHAYANGKARA DUA": ["I/a"]
};

const pekerjaanOrder = ["Anggota Polri", "ASN", "PPPK", "TKK", "Dokter Mitra", "Tenaga Mitra"];

export default function Pegawai() {
  const [editId, setEditId] = useState(null);
  const [selectedPegawai, setSelectedPegawai] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPekerjaan, setFilterPekerjaan] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [pegawai, setPegawai] = useState({
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

  const [listPegawai, setListPegawai] = useState([]);
  const [pangkatOptions, setPangkatOptions] = useState([]);
  const [golonganOptions, setGolonganOptions] = useState([]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // --- Fungsi-fungsi Utama ---
  
  // ✅ PERBAIKAN: Gunakan useCallback untuk fetchPegawai
  const fetchPegawai = useCallback(async () => {
    let query = supabase.from("pegawai").select("*");

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
      
      const statusOrder = { 'Aktif': 1, 'Tidak Aktif': 2 };
      const statusA = statusOrder[a.status] || 3;
      const statusB = statusOrder[b.status] || 3;
      if (statusA !== statusB) return statusA - statusB;

      const getPangkatIndex = (pangkat, pekerjaan) => {
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
  }, [currentPage, itemsPerPage, searchTerm, filterPekerjaan]); // ✅ Tambahkan semua dependency di sini

  // ✅ PERBAIKAN: Membungkus saveOrUpdatePegawai dengan useCallback
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
    } catch (error) {
        Swal.fire("Error!", error.message, "error");
    }
  }, [editId, pegawai, fetchPegawai]); // ✅ Tambahkan dependencies

  const handleChange = (e) => {
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

  const handleSubmit = async (e) => {
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

  // ✅ PERBAIKAN: Membungkus handleDelete dengan useCallback
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
  }, [selectedPegawai, fetchPegawai]); // ✅ Tambahkan dependencies

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
  
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    setSelectedPegawai(null);
  };

  const handleItemsPerPageChange = (size) => {
    setItemsPerPage(size);
    setCurrentPage(1);
    setSelectedPegawai(null);
  };

  const handleRowClick = (p) => {
    if (selectedPegawai?.id === p.id) {
      setSelectedPegawai(null);
    } else {
      setSelectedPegawai(p);
    }
  };
  
  const handleFilterChange = (e) => {
      setFilterPekerjaan(e.target.value);
      setCurrentPage(1);
  };

  // --- Efek Samping (useEffect) ---

  // ✅ PERBAIKAN: Panggil fetchPegawai di useEffect dengan dependency yang benar
  useEffect(() => {
    fetchPegawai();
  }, [fetchPegawai]); // ✅ Sekarang fetchPegawai sudah dibungkus useCallback

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
    let newGolonganOptions = [];
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

  // --- Tampilan (JSX) ---
  return (
    <div className={pageStyles.container}>
      <h2 className={pageStyles.header}>Data Pegawai</h2>

      <div className={pageStyles.buttonContainer}>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className={styles.rekamButton}
        >
          <FaPlus  /> Rekam
        </button>

        <button
          onClick={handleEdit}
          disabled={!selectedPegawai}
          className={styles.editButton}
        >
          <FaEdit/> Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={!selectedPegawai}
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
              
              {/* Pangkat */}
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
              
              {/* Golongan */}
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Golongan:</label>
                <select
                  name="golongan"
                  value={pegawai.golongan}
                  onChange={handleChange}
                  required={pegawai.pekerjaan === "ASN"}
                  disabled={true} // Selalu dinonaktifkan
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

              {/* Jabatan Struktural */}
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
      
      {/* Tabel Pegawai */}
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
                <td colSpan="7" className={pageStyles.tableEmpty}>
                  Tidak ada data pegawai yang ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Kontrol Paginasi */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <PaginasiKeu
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      </div>
      

      {/* Detail Pegawai yang Dipilih */}
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