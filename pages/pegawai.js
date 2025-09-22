// components/Pegawai.js

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Swal from "sweetalert2";
import { FaPlus, FaEdit, FaTrashAlt, FaAngleLeft, FaAngleRight, FaAngleDoubleLeft, FaAngleDoubleRight, FaRegTrashAlt } from "react-icons/fa";
import PaginasiKeu from '../components/paginasi';

// Komponen Modal Pop-up
const Modal = ({ children, onClose }) => {
  return (
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
  "AIPTU": ["II/f"], "AIPDA": ["II/e"], "BBRIPKA": ["II/d"], "BRIGADIR": ["II/c"], "BRIPTU": ["II/b"], "BRIPDA": ["II/a"],
  "AJUN BRIGADIR POLISI": ["I/e"], "AJUN BRIGADIR POLISI DUA": ["I/d"], "BHAYANGKARA KEPALA": ["I/c"], "BHAYANGKARA SATU": ["I/b"], "BHAYANGKARA DUA": ["I/a"]
};

export default function Pegawai() {
  const [editId, setEditId] = useState(null);
  const [selectedPegawai, setSelectedPegawai] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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
  const fetchPegawai = async () => {
    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    let query = supabase.from("pegawai").select("*", { count: "exact" });

    if (searchTerm) {
      query = query.or(`nama.ilike.%${searchTerm}%,pekerjaan.ilike.%${searchTerm}%,nrp_nip_nir.ilike.%${searchTerm}%`);
    }

    const { data, count, error } = await query.order("id", { ascending: false }).range(from, to);
    
    if (error) {
      console.error("Error fetching pegawai:", error.message);
      return;
    }
    
    setTotalItems(count);
    setListPegawai(data);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPegawai((prev) => ({ ...prev, [name]: value, }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let isSuccess = false;
    let successMessage = "";

    if (editId) {
      const { error } = await supabase.from("pegawai").update(pegawai).eq("id", editId);
      if (error) {
        Swal.fire("Error!", error.message, "error");
        return;
      }
      isSuccess = true;
      successMessage = "Data pegawai berhasil diperbarui.";
    } else {
      const { error } = await supabase.from("pegawai").insert([pegawai]);
      if (error) {
        Swal.fire("Error!", error.message, "error");
        return;
      }
      isSuccess = true;
      successMessage = "Pegawai baru berhasil ditambahkan.";
    }

    if (isSuccess) {
      Swal.fire("Berhasil!", successMessage, "success");
      resetForm();
      fetchPegawai();
    }
  };

  const handleDelete = async () => {
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
  };

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

  // --- Efek Samping (useEffect) ---
  useEffect(() => {
    fetchPegawai();
  }, [currentPage, itemsPerPage, searchTerm]);

  useEffect(() => {
    if (pegawai.pekerjaan === "Anggota Polri") {
      setPangkatOptions(allPangkatPolri);
    } else if (pegawai.pekerjaan === "ASN") {
      setPangkatOptions(allPangkatAsn);
    } else {
      setPangkatOptions([]);
      setPegawai(prev => ({ ...prev, pangkat: "", golongan: "" }));
    }
  }, [pegawai.pekerjaan]);

  useEffect(() => {
    if (pegawai.pekerjaan === "ASN" && pegawai.pangkat) {
      setGolonganOptions(golonganByPangkatAsn[pegawai.pangkat] || []);
    } else if (pegawai.pekerjaan === "Anggota Polri" && pegawai.pangkat) {
      setGolonganOptions(golonganByPangkatPolri[pegawai.pangkat] || []);
    } else {
      setGolonganOptions([]);
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
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1rem" }}></div>
      <h2>Data Pegawai</h2>

      <div style={{ marginBottom: "1rem", display: "flex", flexWrap: "wrap", gap: "5px", alignItems: "center" }}>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          style={{
            background: "#16a34a", color: "white",padding: "6px 10px", border: "none",
            borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px"
          }}
        >
          <FaPlus  /> Rekam Pegawai
        </button>

        <button
          onClick={handleEdit}
          disabled={!selectedPegawai}
          style={{
            background: "#f59e0b", color: "white",padding: "6px 10px", border: "none",
            borderRadius: "6px", display: "flex", alignItems: "center", gap: "5px",
            cursor: selectedPegawai ? "pointer" : "not-allowed", opacity: selectedPegawai ? 1 : 0.5
          }}
          
        >
          <FaEdit/> Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={!selectedPegawai}
          style={{ background: "#dc2626", color: "white",padding: "6px 10px", border: "none",
            borderRadius: "6px", display: "flex", alignItems: "center", gap: "5px",
            cursor: selectedPegawai ? "pointer" : "not-allowed", opacity: selectedPegawai ? 1 : 0.5
           }}
        >
          <FaRegTrashAlt /> Hapus
        </button>

        <div style={{ position: "relative", maxWidth: "300px", marginLeft: "0" }}>
          <input
            type="text"
            placeholder="Cari pegawai..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{ width: "120%", padding: "8px", paddingRight: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              style={{
                position: "absolute",
                right: "1px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "0.9rem",
                color: "#6b7280",
                padding: "5px",
              }}
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
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", rowGap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label>Nama:</label>
                <input
                  type="text"
                  name="nama"
                  value={pegawai.nama}
                  onChange={handleChange}
                  required
                  style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                />
              </div>
              
              <div>
              <label>Pekerjaan:</label>
              <select
                name="pekerjaan"
                value={pegawai.pekerjaan}
                onChange={handleChange}
                required
                style={{ 
                  width: "100%", 
                  padding: "8px", 
                  border: "1px solid #ccc", 
                  borderRadius: "4px",
                  backgroundColor: pegawai.pekerjaan === "" ? "#f3f4f6" : "white" 
                }}
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
              
              <div>
                <label>NRP / NIP / NIR:</label>
                <input
                  type="text"
                  name="nrp_nip_nir"
                  value={pegawai.nrp_nip_nir}
                  onChange={handleChange}
                  required
                  style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                />
              </div>
              
              <div>
                <label>Klasifikasi:</label>
                <select
                  name="klasifikasi"
                  value={pegawai.klasifikasi}
                  onChange={handleChange}
                  required
                  style={{ 
                    width: "100%", 
                    padding: "8px", 
                    border: "1px solid #ccc", 
                    borderRadius: "4px",
                    backgroundColor: pegawai.klasifikasi === "" ? "#f3f4f6" : "white" 
                  }}
                >
                  <option value="">-- Pilih Klasifikasi --</option>
                  <option>Medis</option>
                  <option>Paramedis</option>
                  <option>Non Medis</option>
                </select>
              </div>
              
              {/* Pangkat */}
              <div>
                <label>Pangkat:</label>
                <select
                  name="pangkat"
                  value={pegawai.pangkat}
                  onChange={handleChange}
                  required={pegawai.pekerjaan === "Anggota Polri" || pegawai.pekerjaan === "ASN"}
                  disabled={pegawai.pekerjaan !== "Anggota Polri" && pegawai.pekerjaan !== "ASN"}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    backgroundColor:
                      pegawai.pekerjaan !== "Anggota Polri" && pegawai.pekerjaan !== "ASN"
                        ? "#e9ecef"
                        : pegawai.pangkat === ""
                        ? "#f3f4f6"
                        : "white",
                  }}
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
              <div>
                <label>Golongan:</label>
                <select
                  name="golongan"
                  value={pegawai.golongan}
                  onChange={handleChange}
                  required={pegawai.pekerjaan === "ASN"}
                  disabled={pegawai.pekerjaan !== "ASN" && pegawai.pekerjaan !== "Anggota Polri" || !pegawai.pangkat}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    backgroundColor:
                      (pegawai.pekerjaan !== "ASN" && pegawai.pekerjaan !== "Anggota Polri" || !pegawai.pangkat)
                        ? "#e9ecef"
                        : pegawai.golongan === ""
                        ? "#f3f4f6"
                        : "white",
                  }}
                >
                  <option value="">-- Pilih Golongan --</option>
                  {golonganOptions.map((golongan) => (
                    <option key={golongan} value={golongan}>
                      {golongan}
                    </option>
                  ))}
                </select>
              </div>

              {/* BARU: Input Jabatan Struktural */}
              <div>
                <label>Jabatan Struktural:</label>
                <input
                  type="text"
                  name="jabatan_struktural"
                  value={pegawai.jabatan_struktural}
                  onChange={handleChange}
                  style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                />
              </div>
              
              <div>
                <label>Status:</label>
                <select
                  name="status"
                  value={pegawai.status}
                  onChange={handleChange}
                  required
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    backgroundColor:
                      pegawai.status === "" ? "#f3f4f6" : "white",
                  }}
                >
                  <option value="">-- Pilih Status --</option>
                  <option>Aktif</option>
                  <option>Tidak Aktif</option>
                </select>
              </div>
              
              <div>
                <label>Bank:</label>
                <input
                  type="text"
                  name="bank"
                  value={pegawai.bank}
                  onChange={handleChange}
                  style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                />
              </div>
              
              <div>
                <label>No. Rekening:</label>
                <input
                  type="text"
                  name="no_rekening"
                  value={pegawai.no_rekening}
                  onChange={handleChange}
                  style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                />
              </div>
              
              <div>
                <label>Nama Rekening:</label>
                <input
                  type="text"
                  name="nama_rekening"
                  value={pegawai.nama_rekening}
                  onChange={handleChange}
                  style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                />
              </div>
            </div>
            
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={resetForm}
                style={{ padding: "10px 20px", border: "1px solid #ccc", borderRadius: "6px", cursor: "pointer" }}
              >
                Batal
              </button>
              <button
                type="submit"
                style={{ background: "#16a34a", color: "white", padding: "10px 20px", border: "none", borderRadius: "6px", cursor: "pointer" }}
              >
                {editId ? "Update" : "Simpan"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      
      {/* Tabel Pegawai */}
      <table 
        border="1" 
        cellPadding="4" 
        style={{ 
          borderCollapse: "collapse", 
          width: "100%", 
          marginTop: "0px", 
          fontSize: "12px",
          tableLayout: "fixed",
        }}
      >
        <thead>
          <tr style={{ background: "#f3f4f6" }}>
            <th style={{ width: "10px", padding: "8px", textAlign: "center" }}>No.</th>
            <th style={{ width: "23%", padding: "8px", textAlign: "left" }}>Nama</th>
            <th style={{ width: "10%", padding: "8px", textAlign: "left" }}>Pekerjaan</th>
            <th style={{ width: "15%", padding: "8px", textAlign: "left" }}>Pangkat</th>
            <th style={{ width: "15%", padding: "8px", textAlign: "left" }}>NRP / NIP / NIR</th>
            <th style={{ width: "15%", padding: "8px", textAlign: "left" }}>Jabatan Struktural</th>
            <th style={{ width: "10%", padding: "8px", textAlign: "left" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {listPegawai.length > 0 ? (
            listPegawai.map((p, index) => (
              <tr
                key={p.id}
                onClick={() => handleRowClick(p)}
                style={{ cursor: "pointer", backgroundColor: selectedPegawai?.id === p.id ? "#e0e7ff" : "white" }}
              >
                <td style={{ width: "30px", padding: "6px 0px 6px 8px", textAlign: "center" }}>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                <td style={{ width: "15%", padding: "6px 0px 6px 8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.nama}</td>
                <td style={{ width: "10%", padding: "6px 0px 6px 8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.pekerjaan}</td>
                <td style={{ width: "15%", padding: "6px 0px 6px 8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.pangkat}</td>
                <td style={{ width: "15%", padding: "6px 0px 6px 8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.nrp_nip_nir}</td>
                <td style={{ width: "15%", padding: "6px 0px 6px 8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.jabatan_struktural}</td>
                <td style={{ width: "10%", padding: "6px 0px 6px 8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.status}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" style={{ textAlign: "center", padding: "1rem" }}>
                Tidak ada data pegawai yang ditemukan.
              </td>
            </tr>
          )}
        </tbody>
      </table>

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
      <div style={{ 
          marginTop: "2rem", 
          border: "1px solid #ccc", 
          paddingTop: "0rem",
          paddingBottom: "1rem", 
          paddingLeft: "0rem", 
          paddingRight: "0rem",  
          borderRadius: "0px 8PX", fontSize: "12px", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"}}>
        <h3 
            style={{ 
                marginTop: 0,
                padding: "0.5rem 1rem ",
                backgroundColor: "#e5e7eaff",
                borderRadius: "0px",
                marginBottom: "1rem"
            }}>
            Detail Data Pegawai
        </h3>
        {selectedPegawai ? (
        <div style={{ 
            display: "grid", 
            gridTemplateColumns: "1fr 1fr",
            gap: "0.5rem" 
        }}>
            {/* Baris 1: Nama */}
            <div style={{ display: "flex" }}>
                <p style={{ margin: 0, width: "150px", paddingLeft: "1rem" }}><strong>Nama</strong></p>
                <p style={{ margin: 0 }}>: {selectedPegawai.nama}</p>
            </div>
            {/* Baris 2: Pekerjaan */}
            <div style={{ display: "flex" }}>
                <p style={{ margin: 0, width: "150px", }}><strong>Pekerjaan</strong></p>
                <p style={{ margin: 0 }}>: {selectedPegawai.pekerjaan}</p>
            </div>
            {/* BARU: Baris untuk Tipe Identitas */}
            <div style={{ display: "flex" }}>
                <p style={{ margin: 0, width: "150px", paddingLeft: "1rem" }}><strong>Tipe Identitas</strong></p>
                <p style={{ margin: 0 }}>: {selectedPegawai.tipe_identitas}</p>
            </div>
            {/* Baris 3: NRP / NIP / NIR */}
            <div style={{ display: "flex" }}>
                <p style={{ margin: 0, width: "150px" }}><strong>NRP / NIP / NIR</strong></p>
                <p style={{ margin: 0 }}>: {selectedPegawai.nrp_nip_nir}</p>
            </div>
            {/* Baris 4: Klasifikasi */}
            <div style={{ display: "flex" }}>
                <p style={{ margin: 0, width: "150px", paddingLeft: "1rem" }}><strong>Klasifikasi</strong></p>
                <p style={{ margin: 0 }}>: {selectedPegawai.klasifikasi}</p>
            </div>
            {/* Baris 5: Pangkat */}
            <div style={{ display: "flex" }}>
                <p style={{ margin: 0, width: "150px" }}><strong>Pangkat</strong></p>
                <p style={{ margin: 0 }}>: {selectedPegawai.pangkat}</p>
            </div>
            {/* Baris 6: Golongan */}
            <div style={{ display: "flex" }}>
                <p style={{ margin: 0, width: "150px", paddingLeft: "1rem" }}><strong>Golongan</strong></p>
                <p style={{ margin: 0 }}>: {selectedPegawai.golongan}</p>
            </div>
            {/* BARU: Baris untuk Jabatan Struktural */}
            <div style={{ display: "flex" }}>
                <p style={{ margin: 0, width: "150px" }}><strong>Jabatan Struktural</strong></p>
                <p style={{ margin: 0 }}>: {selectedPegawai.jabatan_struktural}</p>
            </div>
            {/* Baris 7: Status */}
            <div style={{ display: "flex" }}>
                <p style={{ margin: 0, width: "150px", paddingLeft: "1rem" }}><strong>Status</strong></p>
                <p style={{ margin: 0 }}>: {selectedPegawai.status}</p>
            </div>
            {/* Baris 8: Bank */}
            <div style={{ display: "flex" }}>
                <p style={{ margin: 0, width: "150px" }}><strong>Bank</strong></p>
                <p style={{ margin: 0 }}>: {selectedPegawai.bank}</p>
            </div>
            {/* Baris 9: No. Rekening */}
            <div style={{ display: "flex" }}>
                <p style={{ margin: 0, width: "150px", paddingLeft: "1rem" }}><strong>No. Rekening</strong></p>
                <p style={{ margin: 0 }}>: {selectedPegawai.no_rekening}</p>
            </div>
            {/* Baris 10: Nama Rekening */}
            <div style={{ display: "flex" }}>
                <p style={{ margin: 0, width: "150px" }}><strong>Nama Rekening</strong></p>
                <p style={{ margin: 0 }}>: {selectedPegawai.nama_rekening}</p>
            </div>
        </div>
        ) : (
            <p style={{ textAlign: "center", paddingBottom: "1rem" }}>Data Pegawai Belum Dipilih</p>
        )}
      </div>
    </>
  );
}