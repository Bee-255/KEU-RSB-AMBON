// pejabatkeuangan.js
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Swal from "sweetalert2";
import { FiDelete, FiEdit3, FiPlus } from "react-icons/fi";

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
          maxWidth: "700px",
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

// Objek untuk memetakan singkatan ke deskripsi
const jabatanMap = {
  KPA: "KUASA PENGGUNA ANGGARAN",
  PPK: "PEJABAT PEMBUAT KOMITMEN",
  PPSPM: "PEJABAT PENANDATANGANAN SURAT PERINTAH MEMBAYAR",
  BPG: "BENDAHARA PENGELUARAN",
  BPN: "BENDAHARA PENERIMAAN",
};

// Komponen utama Pejabat Keuangan
const PejabatKeuangan = () => {
  const [pejabatList, setPejabatList] = useState([]);
  const [pegawaiList, setPegawaiList] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPejabat, setSelectedPejabat] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // State untuk form input
  const [formData, setFormData] = useState({
    nama: "",
    pangkat: "",
    nrp_nip: "", 
    jabatan_struktural: "",
    jabatan_pengelola_keuangan: "",
    deskripsi_jabatan: "",
    // BARU: Tambah kolom status
    status: "",
  });

  useEffect(() => {
    fetchPejabat();
    fetchPegawai();
  }, []);

  const fetchPejabat = async () => {
    const { data, error } = await supabase.from("pejabat_keuangan").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("Gagal mengambil data pejabat:", error);
      Swal.fire("Error", "Gagal mengambil data pejabat. Periksa koneksi atau nama tabel.", "error");
    } else {
      setPejabatList(data);
    }
  };

  const fetchPegawai = async () => {
    const { data, error } = await supabase.from("pegawai").select("nama, pangkat, nrp_nip_nir, jabatan_struktural");
    if (error) {
      console.error("Gagal mengambil data pegawai:", error);
      Swal.fire("Error", "Gagal mengambil data pegawai. Periksa koneksi atau nama tabel.", "error");
    } else {
      setPegawaiList(data);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handlePegawaiChange = (e) => {
    const selectedName = e.target.value;
    const selectedPegawai = pegawaiList.find(p => p.nama === selectedName);
    
    if (selectedPegawai) {
      setFormData({
        ...formData,
        nama: selectedName,
        pangkat: selectedPegawai.pangkat,
        nrp_nip: selectedPegawai.nrp_nip_nir, 
        jabatan_struktural: selectedPegawai.jabatan_struktural,
      });
    } else {
      setFormData({
        ...formData,
        nama: "",
        pangkat: "",
        nrp_nip: "",
        jabatan_struktural: "",
      });
    }
  };

  const handleJabatanChange = (e) => {
    const value = e.target.value;
    const deskripsi = jabatanMap[value] || "";
    setFormData({
      ...formData,
      jabatan_pengelola_keuangan: value,
      deskripsi_jabatan: deskripsi,
    });
  };
  
  const handleSave = async (e) => {
    e.preventDefault();
  
    if (isEditing) {
      const { error } = await supabase
        .from("pejabat_keuangan")
        .update(formData)
        .eq("id", selectedPejabat.id);
  
      if (error) {
        Swal.fire("Gagal!", `Data gagal diupdate: ${error.message}`, "error");
        console.error("Error updating data:", error);
      } else {
        Swal.fire("Berhasil!", "Data berhasil diupdate.", "success");
        fetchPejabat();
        resetForm();
      }
    } else {
      const { error } = await supabase.from("pejabat_keuangan").insert([formData]);
  
      if (error) {
        Swal.fire("Gagal!", `Data gagal disimpan: ${error.message}`, "error");
        console.error("Error inserting data:", error);
      } else {
        Swal.fire("Berhasil!", "Data berhasil disimpan.", "success");
        fetchPejabat();
        resetForm();
      }
    }
  };
  
  const handleDelete = async () => {
    if (!selectedPejabat) return;
    
    const result = await Swal.fire({
      title: "Apakah Anda yakin?",
      text: `Anda akan menghapus data pejabat ${selectedPejabat.nama}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      const { error } = await supabase.from("pejabat_keuangan").delete().eq("id", selectedPejabat.id);
      if (error) {
        Swal.fire("Gagal!", "Data gagal dihapus. Coba lagi.", "error");
        console.error("Error deleting data:", error);
      } else {
        Swal.fire("Dihapus!", "Data berhasil dihapus.", "success");
        setSelectedPejabat(null);
        fetchPejabat();
      }
      resetForm();
    }
  };

  const handleEdit = () => {
    if (!selectedPejabat) return;
    setIsEditing(true);
    setFormData({
      ...selectedPejabat,
      deskripsi_jabatan: jabatanMap[selectedPejabat.jabatan_pengelola_keuangan] || "",
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setIsEditing(false);
    setSelectedPejabat(null);
    setFormData({
      nama: "",
      pangkat: "",
      nrp_nip: "", 
      jabatan_struktural: "",
      jabatan_pengelola_keuangan: "",
      deskripsi_jabatan: "",
      // BARU: Reset status
      status: "",
    });
    setShowModal(false);
  };

  const handleRowClick = (pejabat) => {
    if (selectedPejabat?.id === pejabat.id) {
      setSelectedPejabat(null);
    } else {
      setSelectedPejabat(pejabat);
    }
  };

  return (
    <div style={{ padding: "0rem 0rem", backgroundColor: "#F3F4F6" }}>
        <h2>Data Pejabat Keuangan</h2>

        <div style={{ marginBottom: "1rem", display: "flex", gap: "10px", alignItems: "center" }}>
            <button
            onClick={() => {
                resetForm();
                setShowModal(true);
            }}
            style={{
            background: "#16a34a", color: "white",padding: "6px 10px", border: "none",
            borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}
            >
            <FiPlus /> Tambah Pejabat
            </button>
            <button
            onClick={handleEdit}
            disabled={!selectedPejabat}
            style={{
            background: "#f59e0b", color: "white",padding: "6px 10px", border: "none",
            borderRadius: "6px", display: "flex", alignItems: "center", gap: "5px",
            cursor: selectedPejabat ? "pointer" : "not-allowed", opacity: selectedPejabat ? 1 : 0.5
          }}
            >
            <FiEdit3 /> Edit
            </button>
            <button
            onClick={handleDelete}
            disabled={!selectedPejabat}
            style={{ background: "#dc2626", color: "white",padding: "6px 10px", border: "none",
            borderRadius: "6px", display: "flex", alignItems: "center", gap: "5px",
            cursor: selectedPejabat ? "pointer" : "not-allowed", opacity: selectedPejabat ? 1 : 0.5
           }}
            >
            <FiDelete /> Hapus
            </button>
        </div>
        
        {showModal && (
            <Modal onClose={resetForm}>
            <form onSubmit={handleSave}>
                <h3 style={{ marginTop: 0 }}>{isEditing ? "Edit Data Pejabat" : "Tambah Pejabat Baru"}</h3>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", rowGap: "1rem", marginBottom: "1rem" }}>
                <div>
                    <label>Nama:</label>
                    <select
                    name="nama"
                    value={formData.nama}
                    onChange={handlePegawaiChange}
                    required
                    style={{ 
                        width: "100%", 
                        padding: "8px", 
                        border: "1px solid #ccc", 
                        borderRadius: "4px",
                        backgroundColor: formData.nama ? "white" : "#f0f0f0"
                    }}
                    >
                        <option value="">-- Pilih Nama Pegawai --</option>
                        {pegawaiList.map((pegawai, index) => (
                            <option key={index} value={pegawai.nama}>{pegawai.nama}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label>Pangkat:</label>
                    <input
                    type="text"
                    name="pangkat"
                    value={formData.pangkat}
                    readOnly
                    style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px", backgroundColor: "#f0f0f0" }}
                    />
                </div>
                <div>
                    <label>NRP/NIP:</label>
                    <input
                    type="text"
                    name="nrp_nip"
                    value={formData.nrp_nip}
                    readOnly
                    style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px", backgroundColor: "#f0f0f0" }}
                    />
                </div>
                <div>
                    <label>Jabatan Struktural:</label>
                    <input
                    type="text"
                    name="jabatan_struktural"
                    value={formData.jabatan_struktural}
                    readOnly
                    style={{ 
                        width: "100%", 
                        padding: "8px", 
                        border: "1px solid #ccc", 
                        borderRadius: "4px",
                        backgroundColor: "#f0f0f0"
                    }}
                    />
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <label>Jabatan Pengelola Keuangan:</label>
                    <select
                    name="jabatan_pengelola_keuangan"
                    value={formData.jabatan_pengelola_keuangan}
                    onChange={handleJabatanChange}
                    required
                    style={{ 
                        width: "100%", 
                        padding: "8px", 
                        border: "1px solid #ccc", 
                        borderRadius: "4px",
                        backgroundColor: formData.jabatan_pengelola_keuangan ? "white" : "#f0f0f0"
                    }}
                    >
                        <option value="">-- Pilih Jabatan --</option>
                        {Object.keys(jabatanMap).map((key) => (
                            <option key={key} value={key}>{key}</option>
                        ))}
                    </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <label>Deskripsi Jabatan:</label>
                    <input
                    type="text"
                    name="deskripsi_jabatan"
                    value={formData.deskripsi_jabatan}
                    readOnly
                    style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px", backgroundColor: "#f0f0f0" }}
                    />
                </div>

                {/* BARU: Kolom Status */}
                <div>
                  <label>Status:</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      backgroundColor: formData.status === "" ? "#f0f0f0" : "white",
                    }}
                  >
                    <option value="">-- Pilih Status --</option>
                    <option>Aktif</option>
                    <option>Tidak Aktif</option>
                  </select>
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
                    {isEditing ? "Update" : "Simpan"}
                </button>
                </div>
            </form>
            </Modal>
        )}

        {/* Tabel Data Pejabat Keuangan */}
        <div style={{ overflowX: "auto" }}>
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
                <th style={{ width: "40px", padding: "8px", textAlign: "center" }}>No.</th>
                <th style={{ width: "30%", padding: "8px", textAlign: "left" }}>Nama</th>
                <th style={{ width: "20%", padding: "8px", textAlign: "left" }}>Pangkat</th>
                <th style={{ width: "30%", padding: "8px", textAlign: "left" }}>NRP/NIP</th>
                <th style={{ width: "20%", padding: "8px", textAlign: "left" }}>Jabatan Pengelola Keuangan</th>
                {/* BARU: Kolom status di tabel */}
                <th style={{ width: "15%", padding: "8px", textAlign: "left" }}>Status</th>
                </tr>
            </thead>
            <tbody>
                {pejabatList.length > 0 ? (
                pejabatList.map((pejabat, index) => (
                    <tr
                    key={pejabat.id}
                    onClick={() => handleRowClick(pejabat)}
                    style={{ cursor: "pointer", backgroundColor: selectedPejabat?.id === pejabat.id ? "#e0e7ff" : "white" }}
                    >
                    <td style={{ width: "50px", padding: "8px", textAlign: "center" }}>{index + 1}</td>
                    <td style={{ padding: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pejabat.nama}</td>
                    <td style={{ padding: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pejabat.pangkat}</td>
                    <td style={{ padding: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pejabat.nrp_nip}</td>
                    <td style={{ padding: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pejabat.jabatan_pengelola_keuangan}</td>
                    {/* BARU: Menampilkan status di tabel */}
                    <td style={{ padding: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pejabat.status}</td>
                    </tr>
                ))
                ) : (
                <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: "1rem" }}>
                    Tidak ada data pejabat yang ditemukan.
                    </td>
                </tr>
                )}
            </tbody>
            </table>
        </div>
        
        {/* Detail Data Pejabat yang Dipilih */}
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
                Detail Data Pejabat Keuangan
            </h3>
            {selectedPejabat ? (
            <div style={{ 
                display: "grid", 
                gridTemplateColumns: "1fr 1fr", 
                gap: "1rem",
                fontSize: "12px"
            }}>
                <div style={{ display: "flex" }}>
                    <p style={{ margin: 0, width: "180px", paddingLeft: "1rem" }}><strong>Nama</strong></p>
                    <p style={{ margin: 0 }}>: {selectedPejabat.nama}</p>
                </div>
                <div style={{ display: "flex" }}>
                    <p style={{ margin: 0, width: "180px", paddingLeft: "1rem" }}><strong>Pangkat</strong></p>
                    <p style={{ margin: 0 }}>: {selectedPejabat.pangkat}</p>
                </div>
                <div style={{ display: "flex" }}>
                    <p style={{ margin: 0, width: "180px", paddingLeft: "1rem" }}><strong>NRP/NIP</strong></p>
                    <p style={{ margin: 0 }}>: {selectedPejabat.nrp_nip}</p> 
                </div>
                <div style={{ display: "flex" }}>
                    <p style={{ margin: 0, width: "180px", paddingLeft: "1rem" }}><strong>Jabatan Struktural</strong></p>
                    <p style={{ margin: 0 }}>: {selectedPejabat.jabatan_struktural}</p>
                </div>
                <div style={{ display: "flex" }}>
                    <p style={{ margin: 0, width: "180px", paddingLeft: "1rem" }}><strong>Jabatan Pengelola Keuangan</strong></p>
                    <p style={{ margin: 0 }}>: {selectedPejabat.jabatan_pengelola_keuangan}</p>
                </div>
                <div style={{ display: "flex" }}>
                    <p style={{ margin: 0, width: "180px", paddingLeft: "1rem" }}><strong>Deskripsi Jabatan</strong></p>
                    <p style={{ margin: 0 }}>: {jabatanMap[selectedPejabat.jabatan_pengelola_keuangan] || ""}</p>
                </div>
                {/* BARU: Baris untuk Status */}
                <div style={{ display: "flex" }}>
                    <p style={{ margin: 0, width: "180px", paddingLeft: "1rem" }}><strong>Status</strong></p>
                    <p style={{ margin: 0 }}>: {selectedPejabat.status}</p>
                </div>
            </div>
            ) : (
                <p style={{ textAlign: "center", paddingBottom: "1rem" }}>Data Pejabat Keuangan Belum Dipilih</p>
            )}
        </div>
    </div>
  );
};

export default PejabatKeuangan;