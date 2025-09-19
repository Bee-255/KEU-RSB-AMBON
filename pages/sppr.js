// sppr.js
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import Swal from "sweetalert2";
import jsPDF from "jspdf";
import "jspdf-autotable";

// Fungsi untuk mengonversi angka menjadi teks (Terbilang)
const terbilang = (angka) => {
  const bilangan = [
    "",
    "satu",
    "dua",
    "tiga",
    "empat",
    "lima",
    "enam",
    "tujuh",
    "delapan",
    "sembilan",
    "sepuluh",
    "sebelas",
  ];

  angka = Math.abs(angka);
  if (angka === 0) {
    return "nol";
  }

  if (angka < 12) {
    return bilangan[angka];
  } else if (angka < 20) {
    return terbilang(angka - 10) + " belas";
  } else if (angka < 100) {
    const sisa = angka % 10;
    const puluh = Math.floor(angka / 10);
    return (
      bilangan[puluh] +
      " puluh" +
      (sisa > 0 ? " " + terbilang(sisa) : "")
    );
  } else if (angka < 200) {
    const sisa = angka - 100;
    return "seratus" + (sisa > 0 ? " " + terbilang(sisa) : "");
  } else if (angka < 1000) {
    const sisa = angka % 100;
    const ratus = Math.floor(angka / 100);
    return (
      bilangan[ratus] +
      " ratus" +
      (sisa > 0 ? " " + terbilang(sisa) : "")
    );
  } else if (angka < 2000) {
    const sisa = angka - 1000;
    return "seribu" + (sisa > 0 ? " " + terbilang(sisa) : "");
  } else if (angka < 1000000) {
    const sisa = angka % 1000;
    const ribu = Math.floor(angka / 1000);
    return (
      terbilang(ribu) +
      " ribu" +
      (sisa > 0 ? " " + terbilang(sisa) : "")
    );
  } else if (angka < 1000000000) {
    const sisa = angka % 1000000;
    const juta = Math.floor(angka / 1000000);
    return (
      terbilang(juta) +
      " juta" +
      (sisa > 0 ? " " + terbilang(sisa) : "")
    );
  } else if (angka < 1000000000000) {
    const sisa = angka % 1000000000;
    const milyar = Math.floor(angka / 1000000000);
    return (
      terbilang(milyar) +
      " milyar" +
      (sisa > 0 ? " " + terbilang(sisa) : "")
    );
  } else if (angka < 1000000000000000) {
    const sisa = angka % 1000000000000;
    const triliun = Math.floor(angka / 1000000000000);
    return (
      terbilang(triliun) +
      " triliun" +
      (sisa > 0 ? " " + terbilang(sisa) : "")
    );
  } else {
    return "Jumlah melebihi batas";
  }
};

// Fungsi untuk memformat setiap kata menjadi kapital di awal
const capitalizeWords = (str) => {
  if (!str) return "";
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// Fungsi untuk memformat angka dengan pemisah ribuan
const formatAngka = (angka) => {
  if (angka === null || typeof angka === 'undefined') {
    return "";
  }
  return angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Fungsi untuk mengembalikan angka murni dari string yang diformat
const parseAngka = (str) => {
  return parseInt(str.replace(/\./g, ""), 10) || 0;
};

// Fungsi untuk mengubah angka bulan menjadi angka Romawi
const toRoman = (num) => {
    const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
    return roman[num] || "";
};

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

// Fungsi untuk membuat PDF dari tabel
const createPDF = (data) => {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("Laporan Surat Perintah Pendebitan Rekening", 14, 20);

  const tableData = data.map((item) => [
    item.tanggal,
    item.nomor_surat,
    item.nama_kpa,
    item.nama_bendahara,
    item.nama_pengambil,
    item.pangkat_nrp,
    formatAngka(item.jumlah_penarikan),
    `${capitalizeWords(terbilang(item.jumlah_penarikan))} Rupiah`
  ]);

  const tableHeaders = [
    ["Tanggal", "Nomor Surat", "Nama KPA", "Bendahara", "Pengambil", "Pangkat/NRP", "Jumlah Penarikan", "Terbilang"],
  ];

  doc.autoTable({
    startY: 30,
    head: tableHeaders,
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [22, 160, 133] },
  });

  doc.save("laporan_sppr.pdf");
};

const Sppr = () => {
  const [spprList, setSpprList] = useState([]);
  const [kpaList, setKpaList] = useState([]);
  const [bendaharaList, setBendaharaList] = useState([]);
  // State baru untuk daftar pengambil
  const [pengambilList, setPengambilList] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSppr, setSelectedSppr] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  // State untuk Paginasi dan Jumlah Baris
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // State untuk form input
  const [formData, setFormData] = useState({
    tanggal: "",
    nomor_surat: "",
    nama_kpa: "",
    nama_bendahara: "",
    nama_pengambil: "",
    pangkat_nrp: "",
    jumlah_penarikan: 0,
  });

  useEffect(() => {
    fetchSPPR();
    fetchKPA();
    fetchBendahara();
    fetchPengambil(); // Panggil fungsi untuk mengambil data Pengambil
    if (showModal && !isEditing) {
      generateNomorSurat();
    }
  }, [showModal, isEditing]);

  const fetchSPPR = async () => {
    const { data, error } = await supabase.from("sppr").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("Gagal mengambil data:", error);
      Swal.fire("Error", "Gagal mengambil data SPPR. Periksa koneksi atau nama tabel.", "error");
    } else {
      setSpprList(data);
    }
  };

  const fetchKPA = async () => {
    const { data, error } = await supabase
      .from("pejabat_keuangan")
      .select("nama")
      .eq("jabatan_pengelola_keuangan", "KPA")
      .eq("status", "Aktif");
    if (error) {
      console.error("Gagal mengambil data KPA:", error);
    } else {
      setKpaList(data.map(item => item.nama));
    }
  };

  const fetchBendahara = async () => {
    const { data, error } = await supabase
      .from("pejabat_keuangan")
      .select("nama")
      .eq("jabatan_pengelola_keuangan", "BPG")
      .eq("status", "Aktif");
    if (error) {
      console.error("Gagal mengambil data Bendahara:", error);
    } else {
      setBendaharaList(data.map(item => item.nama));
    }
  };
  
  // Fungsi baru untuk mengambil data pengambil
  const fetchPengambil = async () => {
    const { data, error } = await supabase
      .from("pegawai")
      .select("nama, pangkat, nrp_nip_nir")
      .in("jabatan_struktural", ["BANUM KEU", "STAF KEU"])
      .eq("status", "Aktif");
    if (error) {
      console.error("Gagal mengambil data Pengambil:", error);
    } else {
      setPengambilList(data);
    }
  };

  const generateNomorSurat = async () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthRoman = toRoman(today.getMonth() + 1);

    const { data, error } = await supabase
      .from("sppr")
      .select("nomor_surat")
      .gte("tanggal", `${currentYear}-01-01`)
      .lt("tanggal", `${currentYear + 1}-01-01`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Gagal mengambil data untuk penomoran:", error);
      return;
    }
    
    let lastNumber = 0;
    if (data && data.length > 0) {
        const lastSppr = data[0];
        const parts = lastSppr.nomor_surat.split('/');
        if (parts.length > 0) {
            const lastPart = parts[0];
            const num = parseInt(lastPart, 10);
            if (!isNaN(num)) {
                lastNumber = num;
            }
        }
    }
    const nextNumber = lastNumber + 1;
    const formattedNumber = String(nextNumber).padStart(3, "0");

    const newNomorSurat = `${formattedNumber}/KEU./${currentMonthRoman}/${currentYear}/Rumkit.`;

    setFormData((prevData) => ({
      ...prevData,
      nomor_surat: newNomorSurat,
      tanggal: today.toISOString().split("T")[0],
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "jumlah_penarikan") {
      const sanitizedValue = parseAngka(value);
      setFormData({ ...formData, [name]: sanitizedValue });
    } else if (name === "nama_pengambil") {
      // Cari data pengambil yang cocok
      const selectedPengambil = pengambilList.find(p => p.nama === value);
      // Update form data dengan nama dan gabungan pangkat & nrp
      setFormData({
        ...formData,
        nama_pengambil: value,
        pangkat_nrp: selectedPengambil ? `${selectedPengambil.pangkat} ${selectedPengambil.nrp_nip_nir}` : "",
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };
  
  const handleSave = async (e) => {
    e.preventDefault();
  
    const dataToSave = {
      ...formData,
      jumlah_penarikan: parseInt(formData.jumlah_penarikan) || 0,
    };
  
    if (isEditing) {
      const { error } = await supabase
        .from("sppr")
        .update(dataToSave)
        .eq("id", selectedSppr.id);
  
      if (error) {
        Swal.fire("Gagal!", `Data gagal diupdate: ${error.message}`, "error");
        console.error("Error updating data:", error);
      } else {
        Swal.fire("Berhasil!", "Data berhasil diupdate.", "success");
        fetchSPPR();
        resetForm();
      }
    } else {
      const { error } = await supabase.from("sppr").insert([dataToSave]);
  
      if (error) {
        Swal.fire("Gagal!", `Data gagal disimpan: ${error.message}`, "error");
        console.error("Error inserting data:", error);
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
      title: "Apakah Anda yakin?",
      text: `Anda akan menghapus data SPPR dengan nomor surat ${selectedSppr.nomor_surat}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      const { error } = await supabase.from("sppr").delete().eq("id", selectedSppr.id);
      if (error) {
        Swal.fire("Gagal!", "Data gagal dihapus. Coba lagi.", "error");
        console.error("Error deleting data:", error);
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

  const handleDownload = () => {
    createPDF(spprList);
  };

  const resetForm = () => {
    setIsEditing(false);
    setSelectedSppr(null);
    setFormData({
      tanggal: "",
      nomor_surat: "",
      nama_kpa: "",
      nama_bendahara: "",
      nama_pengambil: "",
      pangkat_nrp: "",
      jumlah_penarikan: 0,
    });
    setShowModal(false);
  };

  const handleRowClick = (sppr) => {
    if (selectedSppr?.id === sppr.id) {
      setSelectedSppr(null);
    } else {
      setSelectedSppr(sppr);
    }
  };

  // Logika Paginasi
  const totalPages = Math.ceil(spprList.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedSppr = spprList.slice(startIndex, endIndex);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    setSelectedSppr(null); 
  };

  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(parseInt(e.target.value));
    setCurrentPage(1); 
    setSelectedSppr(null); 
  };

  return (
    <div style={{ padding: "1rem 2rem", backgroundColor: "#F3F4F6" }}>
      <h2>Data Surat Perintah Pendebitan Rekening</h2>

      <div style={{ marginBottom: "1rem", display: "flex", gap: "10px", alignItems: "center" }}>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          style={{ background: "#16a34a", color: "white", padding: "10px 20px", border: "none", borderRadius: "6px", cursor: "pointer" }}
        >
          Rekam SPPR
        </button>
        <button
          onClick={handleEdit}
          disabled={!selectedSppr}
          style={{ background: "#f59e0b", color: "white", padding: "10px 20px", border: "none", borderRadius: "6px", cursor: selectedSppr ? "pointer" : "not-allowed", opacity: selectedSppr ? 1 : 0.5 }}
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={!selectedSppr}
          style={{ background: "#dc2626", color: "white", padding: "10px 20px", border: "none", borderRadius: "6px", cursor: selectedSppr ? "pointer" : "not-allowed", opacity: selectedSppr ? 1 : 0.5 }}
        >
          Hapus
        </button>
        <button
          onClick={handleDownload}
          style={{ background: "#3b82f6", color: "white", padding: "10px 20px", border: "none", borderRadius: "6px", cursor: "pointer" }}
        >
          Download PDF
        </button>
      </div>
      
      {showModal && (
        <Modal onClose={resetForm}>
          <form onSubmit={handleSave}>
            <h3 style={{ marginTop: 0 }}>{isEditing ? "Edit Data SPPR" : "Rekam Data SPPR"}</h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", rowGap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label>Tanggal:</label>
                <input
                  type="date"
                  name="tanggal"
                  value={formData.tanggal}
                  onChange={handleInputChange}
                  required
                  readOnly={isEditing}
                  style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px", backgroundColor: isEditing ? "#f0f0f0" : "white" }}
                />
              </div>
              <div>
                <label>Nomor Surat:</label>
                <input
                  type="text"
                  name="nomor_surat"
                  value={formData.nomor_surat}
                  readOnly
                  onChange={handleInputChange}
                  required
                  style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px", backgroundColor: "#f0f0f0" }}
                />
              </div>
              <div>
                <label>Nama KPA:</label>
                <select
                  name="nama_kpa"
                  value={formData.nama_kpa}
                  onChange={handleInputChange}
                  required
                  style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                >
                  <option value="">-- Pilih KPA --</option>
                  {kpaList.map((kpa, index) => (
                    <option key={index} value={kpa}>
                      {kpa}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Nama Bendahara:</label>
                <select
                  name="nama_bendahara"
                  value={formData.nama_bendahara}
                  onChange={handleInputChange}
                  required
                  style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                >
                  <option value="">-- Pilih Bendahara --</option>
                  {bendaharaList.map((bendahara, index) => (
                    <option key={index} value={bendahara}>
                      {bendahara}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Nama Pengambil:</label>
                {/* Ganti input dengan select dropdown */}
                <select
                  name="nama_pengambil"
                  value={formData.nama_pengambil}
                  onChange={handleInputChange}
                  required
                  style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                >
                  <option value="">-- Pilih Pengambil --</option>
                  {/* Map dari data pengambil yang sudah difilter */}
                  {pengambilList.map((pengambil, index) => (
                    <option key={index} value={pengambil.nama}>
                      {pengambil.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Pangkat & NRP:</label>
                {/* Input ini sekarang read-only dan otomatis terisi */}
                <input
                  type="text"
                  name="pangkat_nrp"
                  value={formData.pangkat_nrp}
                  readOnly
                  style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px", backgroundColor: "#f0f0f0" }}
                />
              </div>
              {/* Layout untuk Jumlah Penarikan dan Terbilang */}
              <div style={{ gridColumn: "span 2", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                <div>
                  <label>Jumlah Penarikan (Rp):</label>
                  <input
                    type="text"
                    name="jumlah_penarikan"
                    value={formatAngka(formData.jumlah_penarikan)}
                    onChange={handleInputChange}
                    style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                  />
                </div>
                <div>
                  <label>Terbilang:</label>
                  <div
                      style={{
                        padding: "8px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        backgroundColor: "#f9f9f9",
                        fontSize: "14px",
                        textAlign: "justify",
                      }}
                    >
                    {capitalizeWords(terbilang(parseInt(formData.jumlah_penarikan) || 0))} Rupiah
                  </div>
                </div>
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

      {/* Tabel Data SPPR */}
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
              <th style={{ width: "50px", padding: "8px", textAlign: "center" }}>No.</th>
              <th style={{ width: "15%", padding: "8px", textAlign: "left" }}>Tanggal</th>
              <th style={{ width: "20%", padding: "8px", textAlign: "left" }}>Nomor Surat</th>
              <th style={{ width: "15%", padding: "8px", textAlign: "left" }}>Nama KPA</th>
              <th style={{ width: "15%", padding: "8px", textAlign: "left" }}>Nama Bendahara</th>
              <th style={{ width: "15%", padding: "8px", textAlign: "left" }}>Nama Pengambil</th>
              <th style={{ width: "15%", padding: "8px", textAlign: "left" }}>Pangkat/NRP</th>
              <th style={{ width: "15%", padding: "8px", textAlign: "left" }}>Jumlah Penarikan</th>
              <th style={{ width: "20%", padding: "8px", textAlign: "left" }}>Terbilang</th>
            </tr>
          </thead>
          <tbody>
            {paginatedSppr.length > 0 ? (
              paginatedSppr.map((sppr, index) => (
                <tr
                  key={sppr.id}
                  onClick={() => handleRowClick(sppr)}
                  style={{ cursor: "pointer", backgroundColor: selectedSppr?.id === sppr.id ? "#e0e7ff" : "white" }}
                >
                  <td style={{ width: "50px", padding: "8px", textAlign: "center" }}>{startIndex + index + 1}</td>
                  <td style={{ padding: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sppr.tanggal}</td>
                  <td style={{ padding: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sppr.nomor_surat}</td>
                  <td style={{ padding: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sppr.nama_kpa}</td>
                  <td style={{ padding: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sppr.nama_bendahara}</td>
                  <td style={{ padding: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sppr.nama_pengambil}</td>
                  <td style={{ padding: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sppr.pangkat_nrp}</td>
                  <td style={{ padding: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{formatAngka(sppr.jumlah_penarikan)}</td>
                  <td style={{ padding: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{capitalizeWords(terbilang(sppr.jumlah_penarikan))} Rupiah</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" style={{ textAlign: "center", padding: "1rem" }}>
                  Tidak ada data SPPR yang ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Container Paginasi dan Jumlah Baris */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", marginTop: "1rem", fontSize: "14px" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span>Tampilkan </span>
          <select 
            value={rowsPerPage} 
            onChange={handleRowsPerPageChange}
            style={{ 
              marginLeft: "8px", 
              padding: "4px 8px", 
              borderRadius: "4px",
              border: "1px solid #ccc"
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span style={{ marginLeft: "8px" }}> baris</span>
        </div>
        <div>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={{ 
              padding: "6px 12px", 
              border: "1px solid #ccc", 
              borderRadius: "4px",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              backgroundColor: currentPage === 1 ? "#f3f4f6" : "white"
            }}
          >
            Previous
          </button>
          <span style={{ margin: "0 12px" }}>
            Halaman {currentPage} dari {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{ 
              padding: "6px 12px", 
              border: "1px solid #ccc", 
              borderRadius: "4px",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              backgroundColor: currentPage === totalPages ? "#f3f4f6" : "white"
            }}
          >
            Next
          </button>
        </div>
      </div>

      {/* Detail Data SPPR yang Dipilih */}
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
            Detail Data SPPR
        </h3>
        {selectedSppr ? (
        <div style={{ 
            display: "grid", 
            gridTemplateColumns: "1fr 1fr", 
            gap: "1rem" 
        }}>
            <div style={{ display: "flex" }}>
                <p style={{ margin: 0, width: "150px", paddingLeft: "1rem" }}><strong>Tanggal</strong></p>
                <p style={{ margin: 0 }}>: {selectedSppr.tanggal}</p>
            </div>
            <div style={{ display: "flex" }}>
                <p style={{ margin: 0, width: "150px" }}><strong>Nomor Surat</strong></p>
                <p style={{ margin: 0 }}>: {selectedSppr.nomor_surat}</p>
            </div>
            <div style={{ display: "flex" }}>
                <p style={{ margin: 0, width: "150px", paddingLeft: "1rem" }}><strong>Nama KPA</strong></p>
                <p style={{ margin: 0 }}>: {selectedSppr.nama_kpa}</p>
            </div>
            <div style={{ display: "flex" }}>
                <p style={{ margin: 0, width: "150px" }}><strong>Nama Bendahara</strong></p>
                <p style={{ margin: 0 }}>: {selectedSppr.nama_bendahara}</p>
            </div>
            <div style={{ display: "flex" }}>
                <p style={{ margin: 0, width: "150px", paddingLeft: "1rem" }}><strong>Nama Pengambil</strong></p>
                <p style={{ margin: 0 }}>: {selectedSppr.nama_pengambil}</p>
            </div>
            <div style={{ display: "flex" }}>
                <p style={{ margin: 0, width: "150px" }}><strong>Pangkat & NRP</strong></p>
                <p style={{ margin: 0 }}>: {selectedSppr.pangkat_nrp}</p>
            </div>
            <div style={{ display: "flex" }}>
                <p style={{ margin: 0, width: "150px", paddingLeft: "1rem" }}><strong>Jumlah Penarikan</strong></p>
                <p style={{ margin: 0 }}>: {formatAngka(selectedSppr.jumlah_penarikan)}</p>
            </div>
            <div style={{ display: "flex" }}>
                <p style={{ margin: 0, width: "150px" }}><strong>Terbilang</strong></p>
                <p style={{ margin: 0 }}>: {capitalizeWords(terbilang(selectedSppr.jumlah_penarikan))} Rupiah</p>
            </div>
        </div>
        ) : (
            <p style={{ textAlign: "center", paddingBottom: "1rem" }}>Data SPPR Belum Dipilih</p>
        )}
      </div>
    </div>
  );
};

export default Sppr;