// src/app/pejabatkeuangan/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import Swal from "sweetalert2";
import { FaPlus, FaEdit, FaRegTrashAlt } from "react-icons/fa";

// ✅ Impor file CSS Modules dengan path alias
import styles from "@/styles/button.module.css";
import pageStyles from "@/styles/komponen.module.css";
import loadingStyles from "@/styles/loading.module.css";

// Interface untuk data
interface Pegawai {
  id: string;
  nama: string;
  pangkat: string;
  nrp_nip_nir: string;
  jabatan_struktural: string;
  tipe_identitas: string;
}

interface Pejabat {
  id: string;
  pegawai_id: string;
  jabatan_pengelola_keuangan: string;
  deskripsi_jabatan: string;
  status: "Aktif" | "Tidak Aktif";
  created_at: string;
  pegawai: Pegawai;
}

// Tipe untuk state form
interface FormData {
  pegawai_id: string;
  jabatan_pengelola_keuangan: string;
  deskripsi_jabatan: string;
  status: "" | "Aktif" | "Tidak Aktif";
}

// Komponen Modal Pop-up
const Modal: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({ children, onClose }) => {
  return (
    <div className={pageStyles.modalOverlay} onClick={onClose}>
      <div className={pageStyles.modalContent} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

// Objek untuk memetakan singkatan ke deskripsi
const jabatanMap: { [key: string]: string } = {
  KPA: "KUASA PENGGUNA ANGGARAN",
  PPK: "PEJABAT PEMBUAT KOMITMEN",
  PPSPM: "PEJABAT PENANDATANGANAN SURAT PERINTAH MEMBAYAR",
  BPG: "BENDAHARA PENGELUARAN",
  BPN: "BENDAHARA PENERIMAAN",
};

// Komponen utama Pejabat Keuangan
const PejabatKeuangan = () => {
  const [pejabatList, setPejabatList] = useState<Pejabat[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [selectedPejabat, setSelectedPejabat] = useState<Pejabat | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // State untuk form input
  const [formData, setFormData] = useState<FormData>({
    pegawai_id: "",
    jabatan_pengelola_keuangan: "",
    deskripsi_jabatan: "",
    status: "",
  });

  const getLoggedInUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile) {
        setUserRole(profile.role);
      }
    }
  };

  useEffect(() => {
    fetchPejabat();
    fetchPegawai();
    getLoggedInUserRole();
  }, []);

  const fetchPejabat = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("pejabat_keuangan")
      .select(`
        *,
        pegawai (nama, pangkat, nrp_nip_nir, jabatan_struktural, tipe_identitas)
      `)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Gagal mengambil data pejabat:", error);
      Swal.fire("Error", "Gagal mengambil data pejabat. Periksa koneksi atau nama tabel.", "error");
    } else {
      setPejabatList(data as Pejabat[]);
    }
    setIsLoading(false);
  };

  const fetchPegawai = async () => {
    const { data, error } = await supabase.from("pegawai").select("id, nama, pangkat, nrp_nip_nir, jabatan_struktural, tipe_identitas");
    if (error) {
      console.error("Gagal mengambil data pegawai:", error);
      Swal.fire("Error", "Gagal mengambil data pegawai. Periksa koneksi atau nama tabel.", "error");
    } else {
      setPegawaiList(data as Pegawai[]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handlePegawaiChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedPegawai = pegawaiList.find(p => p.id === selectedId);

    if (selectedPegawai) {
      setFormData({
        ...formData,
        pegawai_id: selectedId,
      });
    } else {
      setFormData({
        ...formData,
        pegawai_id: "",
      });
    }
  };

  const handleJabatanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const deskripsi = jabatanMap[value] || "";
    setFormData({
      ...formData,
      jabatan_pengelola_keuangan: value,
      deskripsi_jabatan: deskripsi,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing) {
      const { error } = await supabase
        .from("pejabat_keuangan")
        .update({
          pegawai_id: formData.pegawai_id,
          jabatan_pengelola_keuangan: formData.jabatan_pengelola_keuangan,
          deskripsi_jabatan: formData.deskripsi_jabatan,
          status: formData.status,
        })
        .eq("id", selectedPejabat!.id);

      if (error) {
        Swal.fire("Gagal!", `Data gagal diupdate: ${error.message}`, "error");
        console.error("Error updating data:", error);
      } else {
        Swal.fire("Berhasil!", "Data berhasil diupdate.", "success");
        fetchPejabat();
        resetForm();
      }
    } else {
      const { error } = await supabase.from("pejabat_keuangan").insert([
        {
          pegawai_id: formData.pegawai_id,
          jabatan_pengelola_keuangan: formData.jabatan_pengelola_keuangan,
          deskripsi_jabatan: formData.deskripsi_jabatan,
          status: formData.status,
        },
      ]);

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
      text: `Anda akan menghapus data pejabat ${selectedPejabat.pegawai.nama}`,
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
      pegawai_id: selectedPejabat.pegawai_id,
      jabatan_pengelola_keuangan: selectedPejabat.jabatan_pengelola_keuangan,
      deskripsi_jabatan: jabatanMap[selectedPejabat.jabatan_pengelola_keuangan] || "",
      status: selectedPejabat.status,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setIsEditing(false);
    setSelectedPejabat(null);
    setFormData({
      pegawai_id: "",
      jabatan_pengelola_keuangan: "",
      deskripsi_jabatan: "",
      status: "",
    });
    setShowModal(false);
  };

  const handleRowClick = (pejabat: Pejabat) => {
    if (selectedPejabat?.id === pejabat.id) {
      setSelectedPejabat(null);
    } else {
      setSelectedPejabat(pejabat);
    }
  };

  const isAllowedToEditOrDelete = userRole === "Owner" || userRole === "Admin";

  return (
    <div className={pageStyles.container}>
      <h2 className={pageStyles.header}>Data Pejabat Keuangan</h2>

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
          disabled={!selectedPejabat || !isAllowedToEditOrDelete}
          className={styles.editButton}
        >
          <FaEdit /> Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={!selectedPejabat || !isAllowedToEditOrDelete}
          className={styles.hapusButton}
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
                  name="pegawai_id"
                  value={formData.pegawai_id}
                  onChange={handlePegawaiChange}
                  required
                  className={pageStyles.formSelect}
                >
                  <option value="">-- Pilih Nama Pegawai --</option>
                  {pegawaiList.map((pegawai) => (
                    <option key={pegawai.id} value={pegawai.id}>
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
                  value={pegawaiList.find(p => p.id === formData.pegawai_id)?.pangkat || ""}
                  readOnly
                  className={`${pageStyles.formInput} ${pageStyles.readOnly}`}
                />
              </div>
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Tipe NRP/NIP:</label>
                <input
                  type="text"
                  name="tipe_nrp_nip"
                  value={pegawaiList.find(p => p.id === formData.pegawai_id)?.tipe_identitas || ""}
                  readOnly
                  className={`${pageStyles.formInput} ${pageStyles.readOnly}`}
                />
              </div>
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>NRP/NIP:</label>
                <input
                  type="text"
                  name="nrp_nip"
                  value={pegawaiList.find(p => p.id === formData.pegawai_id)?.nrp_nip_nir || ""}
                  readOnly
                  className={`${pageStyles.formInput} ${pageStyles.readOnly}`}
                />
              </div>
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Jabatan Struktural:</label>
                <input
                  type="text"
                  name="jabatan_struktural"
                  value={pegawaiList.find(p => p.id === formData.pegawai_id)?.jabatan_struktural || ""}
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

      {/* Table Section dengan Loading Overlay */}
      <div className={pageStyles.tableContainer}>
        <div className={pageStyles.tableWrapper}>
          {isLoading && (
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
                    <td>{pejabat.pegawai.nama}</td>
                    <td>{pejabat.pegawai.pangkat}</td>
                    <td>{pejabat.pegawai.nrp_nip_nir}</td>
                    <td>{pejabat.jabatan_pengelola_keuangan}</td>
                    <td>{pejabat.status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className={pageStyles.tableEmpty}>
                    {isLoading ? "" : "Tidak ada data pejabat yang ditemukan."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Data Pejabat yang Dipilih */}
      <div className={pageStyles.detailContainer}>
        <div className={pageStyles.detailHeader}>Detail Data Pejabat Keuangan</div>
        {selectedPejabat ? (
          <div className={pageStyles.detailContent}>
            <div className={pageStyles.detailItem}>
              <div className={pageStyles.detailLabel}>Nama</div>
              <div className={pageStyles.detailValue}>: {selectedPejabat.pegawai.nama}</div>
            </div>
            <div className={pageStyles.detailItem}>
              <div className={pageStyles.detailLabel}>Pangkat</div>
              <div className={pageStyles.detailValue}>: {selectedPejabat.pegawai.pangkat}</div>
            </div>
            <div className={pageStyles.detailItem}>
              <div className={pageStyles.detailLabel}>Tipe NRP/NIP</div>
              <div className={pageStyles.detailValue}>: {selectedPejabat.pegawai.tipe_identitas}</div>
            </div>
            <div className={pageStyles.detailItem}>
              <div className={pageStyles.detailLabel}>NRP/NIP</div>
              <div className={pageStyles.detailValue}>: {selectedPejabat.pegawai.nrp_nip_nir}</div>
            </div>
            <div className={pageStyles.detailItem}>
              <div className={pageStyles.detailLabel}>Jabatan Struktural</div>
              <div className={pageStyles.detailValue}>: {selectedPejabat.pegawai.jabatan_struktural}</div>
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