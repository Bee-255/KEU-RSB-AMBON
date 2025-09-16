import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";
import Swal from "sweetalert2";

// Komponen Modal Pop-up (Tetap sama)
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
  "INSPEKTUR POLISI SATU", "INSPEKTUR POLISI DUA", "AJUN INSPEKTUR POLISI SATU", "AJUN INSPEKTUR POLISI DUA",
  "BRIGADIR KEPALA", "BRIGADIR", "BRIGADIR SATU", "BRIGADIR DUA", "AJUN BRIGADIR POLISI",
  "AJUN BRIGADIR POLISI DUA", "BHAYANGKARA KEPALA", "BHAYANGKARA SATU", "BHAYANGKARA DUA"
];

const allPangkatAsn = [
  "PEMBINA UTAMA",
  "PEMBINA UTAMA MADYA",
  "PEMBINA UTAMA MUDA",
  "PEMBINA TK. I",
  "PEMBINA",
  "PENATA TK. I",
  "PENATA",
  "PENATA MUDA TK. I",
  "PENATA MUDA",
  "PENGATUR TK. I",
  "PENGATUR",
  "PENGATUR MUDA TK. I",
  "PENGATUR MUDA",
  "JURU TK. I",
  "JURU",
  "JURU MUDA TK. I",
  "JURU MUDA"
];

const golonganByPangkatAsn = {
  "PEMBINA UTAMA": ["IV/e"],
  "PEMBINA UTAMA MADYA": ["IV/d"],
  "PEMBINA UTAMA MUDA": ["IV/c"],
  "PEMBINA TK. I": ["IV/b"],
  "PEMBINA": ["IV/a"],
  "PENATA TK. I": ["III/d"],
  "PENATA": ["III/c"],
  "PENATA MUDA TK. I": ["III/b"],
  "PENATA MUDA": ["III/a"],
  "PENGATUR TK. I": ["II/d"],
  "PENGATUR": ["II/c"],
  "PENGATUR MUDA TK. I": ["II/b"],
  "PENGATUR MUDA": ["II/a"],
  "JURU TK. I": ["I/d"],
  "JURU": ["I/c"],
  "JURU MUDA TK. I": ["I/b"],
  "JURU MUDA": ["I/a"],
};

// Menambahkan data golongan untuk Anggota Polri
const golonganByPangkatPolri = {
  // Pangkat Perwira
  "KOMISARIS BESAR POLISI": ["IV/c"],
  "AJUN KOMISARIS BESAR POLISI": ["IV/b"],
  "KOMISARIS POLISI": ["IV/a"],
  "AJUN KOMISARIS POLISI": ["III/c"],
  "INSPEKTUR POLISI SATU": ["III/b"],
  "INSPEKTUR POLISI DUA": ["III/a"],
  // Pangkat Bintara
  "AJUN INSPEKTUR POLISI SATU": ["II/f"],
  "AJUN INSPEKTUR POLISI DUA": ["II/e"],
  "BRIGADIR KEPALA": ["II/d"],
  "BRIGADIR": ["II/c"],
  "BRIGADIR SATU": ["II/b"],
  "BRIGADIR DUA": ["II/a"],
  "AJUN BRIGADIR POLISI": ["I/e"],
  "AJUN BRIGADIR POLISI DUA": ["I/d"],
  // Pangkat Tamtama
  "BHAYANGKARA KEPALA": ["I/c"],
  "BHAYANGKARA SATU": ["I/b"],
  "BHAYANGKARA DUA": ["I/a"]
};

export default function Pegawai() {
  const router = useRouter();
  const [editId, setEditId] = useState(null);
  const [selectedPegawai, setSelectedPegawai] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // State untuk paginasi
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalItems, setTotalItems] = useState(0);

  // State form pegawai
  const [pegawai, setPegawai] = useState({
    nama: "",
    pekerjaan: "",
    identitas: "",
    klasifikasi: "",
    pangkat: "",
    golongan: "",
    status: "",
    bank: "-",
    no_rekening: "-",
    nama_rekening: "",
  });

  const [listPegawai, setListPegawai] = useState([]);

  // State untuk opsi dinamis
  const [pangkatOptions, setPangkatOptions] = useState([]);
  const [golonganOptions, setGolonganOptions] = useState([]);

  // Efek untuk mengambil data pegawai dengan paginasi dan pencarian
  useEffect(() => {
    fetchPegawai();
  }, [currentPage, itemsPerPage, searchTerm]);

  // Efek untuk memperbarui opsi pangkat dan golongan
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

  // Logika baru untuk mengisi opsi Golongan
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

  const fetchPegawai = async () => {
    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    // Mulai query dengan opsi count
    let query = supabase.from("pegawai").select("*", { count: "exact" });

    // Terapkan filter pencarian jika ada kata kunci
    if (searchTerm) {
      query = query.or(`nama.ilike.%${searchTerm}%,pekerjaan.ilike.%${searchTerm}%,identitas.ilike.%${searchTerm}%`);
    }

    // Eksekusi query dengan pengurutan dan rentang untuk paginasi
    const { data, count, error } = await query
      .order("id", { ascending: false })
      .range(from, to);
    
    if (error) {
      console.error("Error fetching pegawai:", error.message);
      return;
    }
    
    // Set state dengan data yang sudah diambil
    setTotalItems(count);
    setListPegawai(data);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPegawai((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    let isSuccess = false;
    let successMessage = "";

    if (editId) {
      const { error } = await supabase
        .from("pegawai")
        .update(pegawai)
        .eq("id", editId);

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
        const { error } = await supabase
          .from("pegawai")
          .delete()
          .eq("id", selectedPegawai.id);
        
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
      nama: "",
      pekerjaan: "",
      identitas: "",
      klasifikasi: "",
      pangkat: "",
      golongan: "",
      status: "",
      bank: "-",
      no_rekening: "-",
      nama_rekening: "-",
    });
    setEditId(null);
    setShowModal(false);
  };
  
  // Fungsi untuk mengubah halaman
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    setSelectedPegawai(null); // Membatalkan pilihan saat ganti halaman
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const renderPaginationButtons = () => {
    const buttons = [];
    for (let i = 1; i <= totalPages; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          style={{
            padding: "8px 12px",
            margin: "0 4px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            cursor: "pointer",
            backgroundColor: currentPage === i ? "#2563eb" : "white",
            color: currentPage === i ? "white" : "black",
          }}
        >
          {i}
        </button>
      );
    }
    return buttons;
  };
  
  // Fungsi untuk memilih/membatalkan pilihan pegawai
  const handleRowClick = (p) => {
    if (selectedPegawai?.id === p.id) {
      setSelectedPegawai(null);
    } else {
      setSelectedPegawai(p);
    }
  };

  return (
    <>
      <h2>Data Pegawai</h2>

      {/* Tombol Aksi dan Input Pencarian dalam satu baris */}
      <div style={{ marginBottom: "1rem", display: "flex", gap: "10px", alignItems: "center" }}>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          style={{ background: "#16a34a", color: "white", padding: "10px 20px", border: "none", borderRadius: "6px", cursor: "pointer" }}
        >
          Rekam Pegawai
        </button>
        <button
          onClick={handleEdit}
          disabled={!selectedPegawai}
          style={{ background: "#f59e0b", color: "white", padding: "10px 20px", border: "none", borderRadius: "6px", cursor: selectedPegawai ? "pointer" : "not-allowed", opacity: selectedPegawai ? 1 : 0.5 }}
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={!selectedPegawai}
          style={{ background: "#dc2626", color: "white", padding: "10px 20px", border: "none", borderRadius: "6px", cursor: selectedPegawai ? "pointer" : "not-allowed", opacity: selectedPegawai ? 1 : 0.5 }}
        >
          Hapus
        </button>

        {/* Input Pencarian dengan tombol clear, posisinya di kanan */}
        <div style={{ position: "relative", maxWidth: "300px" }}>
          <input
            type="text"
            placeholder="Cari pegawai..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{ width: "100%", padding: "8px", paddingRight: "30px", border: "1px solid #ccc", borderRadius: "4px" }}
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
                <label>Identitas:</label>
                <input
                  type="text"
                  name="identitas"
                  value={pegawai.identitas}
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
          marginTop: "20px", 
          fontSize: "12px",
          tableLayout: "fixed"
        }}
      >
        <thead>
          <tr style={{ background: "#f3f4f6" }}>
            <th style={{ width: "50px", padding: "8px", textAlign: "center" }}>No.</th>
            <th style={{ width: "25%", padding: "8px", textAlign: "left" }}>Nama</th>
            <th style={{ width: "25%", padding: "8px", textAlign: "left" }}>Pekerjaan</th>
            <th style={{ width: "50%", padding: "8px", textAlign: "left" }}>Identitas</th>
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
                <td style={{ width: "50px", padding: "8px", textAlign: "center" }}>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                <td style={{ padding: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.nama}</td>
                <td style={{ padding: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.pekerjaan}</td>
                <td style={{ padding: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.identitas}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" style={{ textAlign: "center", padding: "1rem" }}>
                Tidak ada data pegawai yang ditemukan.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Kontrol Paginasi */}
      <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span>Tampilkan </span>
          <select 
            value={itemsPerPage} 
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            style={{ padding: "4px", borderRadius: "4px" }}
          >
            {[5, 10, 50, 100, 500, 1000].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          <span> baris</span>
        </div>
        <div>
          {renderPaginationButtons()}
        </div>
      </div>
      
      {/* Detail Pegawai yang Dipilih */}
      <div style={{ 
          marginTop: "2rem", 
          border: "1px solid #ccc", 
          paddingTop: "0rem",
          paddingBottom: "1rem", 
          paddingLeft: "0rem", 
          paddingRight: "0rem",  
          borderRadius: "0px 8PX" }}>
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
            gap: "1rem" 
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
            {/* Baris 3: Identitas */}
            <div style={{ display: "flex" }}>
                <p style={{ margin: 0, width: "150px", paddingLeft: "1rem" }}><strong>Identitas</strong></p>
                <p style={{ margin: 0 }}>: {selectedPegawai.identitas}</p>
            </div>
            {/* Baris 4: Klasifikasi */}
            <div style={{ display: "flex" }}>
                <p style={{ margin: 0, width: "150px" }}><strong>Klasifikasi</strong></p>
                <p style={{ margin: 0 }}>: {selectedPegawai.klasifikasi}</p>
            </div>
            {/* Baris 5: Pangkat */}
            <div style={{ display: "flex" }}>
                <p style={{ margin: 0, width: "150px", paddingLeft: "1rem" }}><strong>Pangkat</strong></p>
                <p style={{ margin: 0 }}>: {selectedPegawai.pangkat}</p>
            </div>
            {/* Baris 6: Golongan */}
            <div style={{ display: "flex" }}>
                <p style={{ margin: 0, width: "150px" }}><strong>Golongan</strong></p>
                <p style={{ margin: 0 }}>: {selectedPegawai.golongan}</p>
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