// pejabatkeuangan.js
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Swal from "sweetalert2";
import { FaPlus, FaEdit, FaRegTrashAlt } from "react-icons/fa";

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
    <div className={pageStyles.container}>
      <h2 className={pageStyles.header}>Data Pejabat Keuangan</h2>

      <div className={pageStyles.buttonContainer}>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className={styles.rekamButton}
        >
          <FaPlus /> Rekam
        </button>
        <button
          onClick={handleEdit}
          disabled={!selectedPejabat}
          className={styles.editButton} // ✅ Cukup gunakan satu kelas
        >
          <FaEdit /> Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={!selectedPejabat}
          className={styles.hapusButton} // ✅ Cukup gunakan satu kelas
        >
          <FaRegTrashAlt /> Hapus
        </button>
      </div>

      {showModal && (
        <Modal onClose={resetForm}>
          <form onSubmit={handleSave}>
            <h3 style={{ marginTop: 0 }}>{isEditing ? "Edit Data Pejabat" : "Tambah Pejabat Baru"}</h3>

            <div className={pageStyles.modalForm}>
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Nama:</label>
                <select
                  name="nama"
                  value={formData.nama}
                  onChange={handlePegawaiChange}
                  required
                  className={pageStyles.formSelect}
                >
                  <option value="">-- Pilih Nama Pegawai --</option>
                  {pegawaiList.map((pegawai, index) => (
                    <option key={index} value={pegawai.nama}>
                      {pegawai.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Pangkat:</label>
                <input
                  type="text"
                  name="pangkat"
                  value={formData.pangkat}
                  readOnly
                  className={`${pageStyles.formInput} ${pageStyles.readOnly}`}
                />
              </div>
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>NRP/NIP:</label>
                <input
                  type="text"
                  name="nrp_nip"
                  value={formData.nrp_nip}
                  readOnly
                  className={`${pageStyles.formInput} ${pageStyles.readOnly}`}
                />
              </div>
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Jabatan Struktural:</label>
                <input
                  type="text"
                  name="jabatan_struktural"
                  value={formData.jabatan_struktural}
                  readOnly
                  className={`${pageStyles.formInput} ${pageStyles.readOnly}`}
                />
              </div>
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Jabatan Pengelola Keuangan:</label>
                <select
                  name="jabatan_pengelola_keuangan"
                  value={formData.jabatan_pengelola_keuangan}
                  onChange={handleJabatanChange}
                  required
                  className={pageStyles.formSelect}
                >
                  <option value="">-- Pilih Jabatan --</option>
                  {Object.keys(jabatanMap).map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </div>
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Deskripsi Jabatan:</label>
                <input
                  type="text"
                  name="deskripsi_jabatan"
                  value={formData.deskripsi_jabatan}
                  readOnly
                  className={`${pageStyles.formInput} ${pageStyles.readOnly}`}
                />
              </div>
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Status:</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                  className={pageStyles.formSelect}
                >
                  <option value="">-- Pilih Status --</option>
                  <option>Aktif</option>
                  <option>Tidak Aktif</option>
                </select>
              </div>
            </div>

            <div className={pageStyles.formActions}>
              <button type="button" onClick={resetForm} className={pageStyles.formCancel}>
                Batal
              </button>
              <button type="submit" className={styles.rekamButton}>
                {isEditing ? "Update" : "Simpan"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Tabel Data Pejabat Keuangan */}
      <div className={pageStyles.tableContainer}>
        <table className={pageStyles.table}>
          <thead className={pageStyles.tableHead}>
            <tr>
              <th>No.</th>
              <th>Nama</th>
              <th>Pangkat</th>
              <th>NRP/NIP</th>
              <th>Jabatan Pengelola Keuangan</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody className={pageStyles.tableBody}>
            {pejabatList.length > 0 ? (
              pejabatList.map((pejabat, index) => (
                <tr
                  key={pejabat.id}
                  onClick={() => handleRowClick(pejabat)}
                  className={`${pageStyles.tableRow} ${selectedPejabat?.id === pejabat.id ? pageStyles.selected : ""}`}
                >
                  <td>{index + 1}</td>
                  <td>{pejabat.nama}</td>
                  <td>{pejabat.pangkat}</td>
                  <td>{pejabat.nrp_nip}</td>
                  <td>{pejabat.jabatan_pengelola_keuangan}</td>
                  <td>{pejabat.status}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className={pageStyles.tableEmpty}>
                  Tidak ada data pejabat yang ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Data Pejabat yang Dipilih */}
<div className={pageStyles.detailContainer}>
  <div className={pageStyles.detailHeader}>Detail Data Pejabat Keuangan</div>
  {selectedPejabat ? (
    <div className={pageStyles.detailContent}>
      <div className={pageStyles.detailItem}>
        <div className={pageStyles.detailLabel}>Nama</div>
        <div className={pageStyles.detailValue}>: {selectedPejabat.nama}</div>
      </div>
      <div className={pageStyles.detailItem}>
        <div className={pageStyles.detailLabel}>Pangkat</div>
        <div className={pageStyles.detailValue}>: {selectedPejabat.pangkat}</div>
      </div>
      <div className={pageStyles.detailItem}>
        <div className={pageStyles.detailLabel}>NRP/NIP</div>
        <div className={pageStyles.detailValue}>: {selectedPejabat.nrp_nip}</div>
      </div>
      <div className={pageStyles.detailItem}>
        <div className={pageStyles.detailLabel}>Jabatan Struktural</div>
        <div className={pageStyles.detailValue}>: {selectedPejabat.jabatan_struktural}</div>
      </div>
      <div className={pageStyles.detailItem}>
        <div className={pageStyles.detailLabel}>Jabatan Pengelola Keuangan</div>
        <div className={pageStyles.detailValue}>: {selectedPejabat.jabatan_pengelola_keuangan}</div>
      </div>
      <div className={pageStyles.detailItem}>
        <div className={pageStyles.detailLabel}>Deskripsi Jabatan</div>
        <div className={pageStyles.detailValue}>: {jabatanMap[selectedPejabat.jabatan_pengelola_keuangan] || ""}</div>
      </div>
      <div className={pageStyles.detailItem}>
        <div className={pageStyles.detailLabel}>Status</div>
        <div className={pageStyles.detailValue}>: {selectedPejabat.status}</div>
      </div>
    </div>
  ) : (
    <div className={pageStyles.tableEmpty}>Data Pejabat Keuangan Belum Dipilih</div>
  )}
</div>
    </div>
  );
};

export default PejabatKeuangan;