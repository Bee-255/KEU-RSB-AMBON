import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import Swal from "sweetalert2";
import { FaPlus, FaEdit, FaRegTrashAlt } from "react-icons/fa";
import { FiDownload } from "react-icons/fi";
import { MdDoneAll } from "react-icons/md";
import PaginasiKeu from '../components/paginasi';

import styles from "../styles/button.module.css";
import pageStyles from "../styles/komponen.module.css";

import { capitalizeWords, formatAngka, parseAngka, toRoman, formatTanggal } from '../lib/utils';
import { terbilang } from "../lib/terbilang"; // Import terbilang di sini
import { createPDF } from '../lib/pdfsppr';

// === Komponen Modal ===
const Modal = ({ children, onClose }) => {
  return (
    <div className={pageStyles.modalOverlay} onClick={onClose}>
      <div className={pageStyles.modalContent} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

const dividerStyle = {
  border: "0",
  height: "1px",
  backgroundColor: "#e5e7eb",
  margin: "20px 0",
};

// === Komponen Utama SPPR ===
const Sppr = () => {
  // === State Management ===
  const [spprList, setSpprList] = useState([]);
  const [kpaList, setKpaList] = useState([]);
  const [bendaharaList, setBendaharaList] = useState([]);
  const [pengambilList, setPengambilList] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSppr, setSelectedSppr] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  const [formData, setFormData] = useState({
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
    jumlah_penarikan: 0,
    operator: "",
    status_sppr: "BARU",
  });
  
  const [operatorName, setOperatorName] = useState("");
  const [userRole, setUserRole] = useState("");
  
  const router = useRouter();
  
  // === Efek Samping (Side Effects) ===
  useEffect(() => {
    getLoggedInUser();
    fetchSPPR();
    fetchPejabatAndPegawai();
  }, []);
  
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
  
  // === Fungsi Pengambilan Data ===
  const getLoggedInUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("nama_lengkap, role")
        .eq("id", user.id)
        .single();
      if (profile) {
        setOperatorName(profile.nama_lengkap);
        setUserRole(profile.role);
      }
    }
  };
  
  const fetchSPPR = useCallback(async () => {
    const { data, error } = await supabase.from("sppr").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("Gagal mengambil data:", error);
      Swal.fire("Error", "Gagal mengambil data SPPR. Periksa koneksi atau nama tabel.", "error");
    } else {
      setSpprList(data);
    }
  }, []);
  
  const fetchPejabatAndPegawai = async () => {
    const { data: kpaData } = await supabase
      .from("pejabat_keuangan")
      .select("*, pegawai(nama, pangkat, nrp_nip_nir, tipe_identitas, jabatan_struktural)")
      .eq("jabatan_pengelola_keuangan", "KPA")
      .eq("status", "Aktif");
    const formattedKpa = kpaData?.map(item => ({
      nama: item.pegawai.nama,
      pangkat: item.pegawai.pangkat,
      tipe_identitas: item.pegawai.tipe_identitas,
      nrp_nip_nir: item.pegawai.nrp_nip_nir,
      jabatan: item.pegawai.jabatan_struktural
    })) || [];
    setKpaList(formattedKpa);

    const { data: bendaharaData } = await supabase
      .from("pejabat_keuangan")
      .select("*, pegawai(nama, pangkat, nrp_nip_nir, tipe_identitas, jabatan_struktural)")
      .eq("jabatan_pengelola_keuangan", "BPG")
      .eq("status", "Aktif");
    const formattedBendahara = bendaharaData?.map(item => ({
      nama: item.pegawai.nama,
      pangkat: item.pegawai.pangkat,
      tipe_identitas: item.pegawai.tipe_identitas,
      nrp_nip_nir: item.pegawai.nrp_nip_nir,
      jabatan: item.pegawai.jabatan_struktural
    })) || [];
    setBendaharaList(formattedBendahara);

    const { data: pengambilData } = await supabase
      .from("pegawai")
      .select("nama, pangkat, nrp_nip_nir, tipe_identitas, jabatan_struktural")
      .in("jabatan_struktural", ["BANUM KEU", "STAF KEU"])
      .eq("status", "Aktif");
    const formattedPengambil = pengambilData?.map(item => ({
      nama: item.nama,
      pangkat: item.pangkat,
      tipe_identitas: item.tipe_identitas,
      nrp_nip_nir: item.nrp_nip_nir,
      jabatan: item.jabatan_struktural
    })) || [];
    setPengambilList(formattedPengambil);
  };
  
  // === Fungsi Helper ===
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
      if (data?.length > 0) {
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
        status_sppr: "BARU",
      }));
    };
    
    // === Handler Aksi Pengguna ===
    const handleInputChange = (e) => {
      const { name, value } = e.target;
      let newFormData = { ...formData, [name]: value };
      
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
    
    const handleSave = async (e) => {
      e.preventDefault();
      const dataToSave = {
        ...formData,
        jumlah_penarikan: parseInt(formData.jumlah_penarikan) || 0,
        operator: operatorName,
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
    
    const handleApprove = async () => {
      if (!selectedSppr || selectedSppr.status_sppr !== 'BARU') {
        return;
      }
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
        const { error } = await supabase
          .from('sppr')
          .update({ status_sppr: 'DISETUJUI' })
          .eq('id', selectedSppr.id);
        if (error) {
          Swal.fire('Gagal!', `Gagal menyetujui data: ${error.message}`, 'error');
          console.error("Error approving data:", error);
        } else {
          Swal.fire('Berhasil!', 'Data berhasil Disetujui.', 'success');
          fetchSPPR();
          setSelectedSppr({ ...selectedSppr, status_sppr: 'DISETUJUI' });
        }
      }
    };
    
    const handleDownload = () => {
      if (selectedSppr) {
        createPDF(selectedSppr);
      } else {
        Swal.fire("Peringatan", "Pilih data SPPR yang akan diunduh.", "warning");
      }
    };
    
    const resetForm = () => {
      setIsEditing(false);
      setSelectedSppr(null);
      setFormData({
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
        jumlah_penarikan: 0,
        operator: operatorName,
        status_sppr: "BARU",
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
    
    const handlePageChange = (pageNumber) => {
      setCurrentPage(pageNumber);
      setSelectedSppr(null);
    };
    
    const handleRowsPerPageChange = (e) => {
      setRowsPerPage(parseInt(e.target.value));
      setCurrentPage(1);
      setSelectedSppr(null);
    };
    
    // === Logika Tampilan & Otorisasi ===
    const totalPages = Math.ceil(spprList.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedSppr = spprList.slice(startIndex, endIndex);
    
    const isAllowedToRekam = userRole === "Owner" || userRole === "Operator";
    const isAllowedToEditOrDelete = userRole === "Owner" || userRole === "Admin" || userRole === "Operator";
    const isAllowedToApprove = userRole === "Owner" || userRole === "Admin";
    const isAllowedToDownload = userRole === "Owner" || userRole === "Admin" || userRole === "Operator";
    
    const isEditingOrDeletingDisabled = !isAllowedToEditOrDelete || !selectedSppr || selectedSppr?.status_sppr === "DISETUJUI";
    const isApprovingDisabled = !isAllowedToApprove || !selectedSppr || selectedSppr?.status_sppr === "DISETUJUI";
    const isDownloadingDisabled = !isAllowedToDownload || !selectedSppr;

    // === Tampilan (Render) ===
    return (
      <div className={pageStyles.container}>
        <h2 className={pageStyles.header}>Data Surat Perintah Pendebitan Rekening</h2>
        <div className={pageStyles.buttonContainer}>
          <button
            onClick={() => {
              resetForm();
              fetchPejabatAndPegawai();
              setShowModal(true);
            }}
            disabled={!isAllowedToRekam}
            className={styles.rekamButton}
          >
            <FaPlus/> Rekam
          </button>
        
          <button
            onClick={handleEdit}
            disabled={isEditingOrDeletingDisabled}
            className={styles.editButton}
          >
            <FaEdit /> Edit
          </button>
        
          <button
            onClick={handleDelete}
            disabled={isEditingOrDeletingDisabled}
            className={styles.hapusButton}
          >
            <FaRegTrashAlt /> Hapus
          </button>
        
          <button
            onClick={handleApprove}
            disabled={isApprovingDisabled}
            className={styles.rekamButton}
          >
            <MdDoneAll size={16}/> Setujui
          </button>
        
          <button
            onClick={handleDownload}
            disabled={isDownloadingDisabled}
            className={styles.downloadButton}
          >
            <FiDownload size={14} strokeWidth={3}/> Download PDF
          </button>
        </div>
        {showModal && (
          <Modal onClose={resetForm}>
            <form onSubmit={handleSave}>
              <h3 style={{ marginTop: 0 }}>{isEditing ? "Edit Data SPPR" : "Rekam Data SPPR"}</h3>
              <hr style={dividerStyle} />
              <div className={pageStyles.modalForm}>
                <div className={pageStyles.formGroup}>
                  <label className={pageStyles.formLabel}>Tanggal:</label>
                  <input
                    type="date"
                    name="tanggal"
                    value={formData.tanggal}
                    onChange={handleInputChange}
                    required
                    readOnly={isEditing}
                    className={pageStyles.formInput}
                  />
                </div>
                <div className={pageStyles.formGroup}>
                  <label className={pageStyles.formLabel}>Nomor Surat:</label>
                  <input
                    type="text"
                    name="nomor_surat"
                    value={formData.nomor_surat}
                    readOnly
                    onChange={handleInputChange}
                    required
                    className={`${pageStyles.formInput} ${pageStyles.readOnly}`}
                  />
                </div>
              </div>
              <hr style={dividerStyle} />
              <div className={pageStyles.modalForm}>
                <div className={pageStyles.formGroup}>
                  <label className={pageStyles.formLabel}>Nama KPA:</label>
                  <select
                    name="nama_kpa"
                    value={formData.nama_kpa}
                    onChange={handleInputChange}
                    required
                    className={pageStyles.formSelect}
                  >
                    <option value="">-- Pilih KPA --</option>
                    {kpaList.map((kpa, index) => (
                      <option key={index} value={kpa.nama}>
                        {kpa.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={pageStyles.formGroup}>
                  <label className={pageStyles.formLabel}>Jabatan KPA:</label>
                  <input
                    type="text"
                    name="jabatan_kpa"
                    value={formData.jabatan_kpa}
                    readOnly
                    className={`${pageStyles.formInput} ${pageStyles.readOnly}`}
                  />
                </div>
                <div className={pageStyles.formGroup}>
                  <label className={pageStyles.formLabel}>Pangkat KPA:</label>
                  <input
                    type="text"
                    name="pangkat_kpa"
                    value={formData.pangkat_kpa}
                    readOnly
                    className={`${pageStyles.formInput} ${pageStyles.readOnly}`}
                  />
                </div>
              </div>
              <hr style={dividerStyle} />
              <div className={pageStyles.modalForm}>
                <div className={pageStyles.formGroup}>
                  <label className={pageStyles.formLabel}>Nama Bendahara:</label>
                  <select
                    name="nama_bendahara"
                    value={formData.nama_bendahara}
                    onChange={handleInputChange}
                    required
                    className={pageStyles.formSelect}
                  >
                    <option value="">-- Pilih Bendahara --</option>
                    {bendaharaList.map((bendahara, index) => (
                      <option key={index} value={bendahara.nama}>
                        {bendahara.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={pageStyles.formGroup}>
                  <label className={pageStyles.formLabel}>Jabatan Bendahara:</label>
                  <input
                    type="text"
                    name="jabatan_bendahara"
                    value={formData.jabatan_bendahara}
                    readOnly
                    className={`${pageStyles.formInput} ${pageStyles.readOnly}`}
                  />
                </div>
                <div className={pageStyles.formGroup}>
                  <label className={pageStyles.formLabel}>Pangkat Bendahara:</label>
                  <input
                    type="text"
                    name="pangkat_bendahara"
                    value={formData.pangkat_bendahara}
                    readOnly
                    className={`${pageStyles.formInput} ${pageStyles.readOnly}`}
                  />
                </div>
              </div>
              <hr style={dividerStyle} />
              <div className={pageStyles.modalForm}>
                <div className={pageStyles.formGroup}>
                  <label className={pageStyles.formLabel}>Nama Pengambil:</label>
                  <select
                    name="nama_pengambil"
                    value={formData.nama_pengambil}
                    onChange={handleInputChange}
                    required
                    className={pageStyles.formSelect}
                  >
                    <option value="">-- Pilih Pengambil --</option>
                    {pengambilList.map((pengambil, index) => (
                      <option key={index} value={pengambil.nama}>
                        {pengambil.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={pageStyles.formGroup}>
                  <label className={pageStyles.formLabel}>Jabatan Pengambil:</label>
                  <input
                    type="text"
                    name="jabatan_pengambil"
                    value={formData.jabatan_pengambil}
                    readOnly
                    className={`${pageStyles.formInput} ${pageStyles.readOnly}`}
                  />
                </div>
                <div className={pageStyles.formGroup}>
                  <label className={pageStyles.formLabel}>Pangkat Pengambil:</label>
                  <input
                    type="text"
                    name="pangkat_pengambil"
                    value={formData.pangkat_pengambil}
                    readOnly
                    className={`${pageStyles.formInput} ${pageStyles.readOnly}`}
                  />
                </div>
              </div>
              <hr style={dividerStyle} />
              <div className={pageStyles.modalForm}>
                <div className={pageStyles.formGroupFull}>
                  <div className={pageStyles.formGroupNested}>
                    <label className={pageStyles.formLabel}>Jumlah Penarikan (Rp):</label>
                    <input
                      type="text"
                      name="jumlah_penarikan"
                      value={formatAngka(formData.jumlah_penarikan)}
                      onChange={handleInputChange}
                      className={pageStyles.formInput}
                    />
                  </div>
                  <div className={pageStyles.formGroupNested}>
                    <label className={pageStyles.formLabel}>Terbilang:</label>
                    <div className={pageStyles.formReadOnly}>
                      {capitalizeWords(terbilang(parseInt(formData.jumlah_penarikan) || 0))} Rupiah
                    </div>
                  </div>
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
                  {isEditing ? "Update" : "Simpan"}
                </button>
              </div>
            </form>
          </Modal>
        )}
        <div className={pageStyles.tableContainer}>
          <table className={pageStyles.table}>
            <thead className={pageStyles.tableHead}>
              <tr>
                <th style={{ width: "5%" }}>No.</th>
                <th style={{ width: "10%" }}>Tanggal</th>
                <th style={{ width: "20%" }}>Nomor Surat</th>
                <th style={{ width: "25%" }}>Operator</th>
                <th style={{ width: "10%" }}>Jumlah Penarikan</th>
                <th style={{ width: "10%" }}>Status</th>
              </tr>
            </thead>
            <tbody className={pageStyles.tableBody}>
              {paginatedSppr.length > 0 ? (
                paginatedSppr.map((sppr, index) => (
                  <tr
                    key={sppr.id}
                    onClick={() => handleRowClick(sppr)}
                    className={`${pageStyles.tableRow} ${selectedSppr?.id === sppr.id ? pageStyles.selected : ""}`}
                  >
                    <td>{startIndex + index + 1}</td>
                    <td>{formatTanggal(sppr.tanggal)}</td>
                    <td>{sppr.nomor_surat}</td>
                    <td>{sppr.operator}</td>
                    <td>{formatAngka(sppr.jumlah_penarikan)}</td>
                    <td>{sppr.status_sppr}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className={pageStyles.tableEmpty}>
                    Tidak ada data SPPR yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginasiKeu 
          currentPage={currentPage} 
          totalPages={totalPages} 
          totalItems={spprList.length} 
          itemsPerPage={rowsPerPage} 
          onPageChange={handlePageChange} 
          onItemsPerPageChange={handleRowsPerPageChange} 
        />
        <div className={pageStyles.detailContainerSPPR}>
          <div className={pageStyles.detailHeaderSPPR}>Detail Data SPPR</div>
          {selectedSppr ? (
            <div className={pageStyles.detailContentSPPR}>
              <div className={pageStyles.detailItemSPPR}>
                <div className={pageStyles.detailLabelSPPR}>Tanggal</div>
                <div className={pageStyles.detailValueSPPR}>: {formatTanggal(selectedSppr.tanggal)}</div>
              </div>
              <div className={pageStyles.detailItemSPPR}>
                <div className={pageStyles.detailLabelSPPR}>Nomor Surat</div>
                <div className={pageStyles.detailValueSPPR}>: {selectedSppr.nomor_surat}</div>
              </div>
              <div className={pageStyles.detailItemSPPR}>
                <div className={pageStyles.detailLabelSPPR}>Operator</div>
                <div className={pageStyles.detailValueSPPR}>: {selectedSppr.operator || "N/A"}</div>
              </div>
              <div className={pageStyles.detailItemSPPR}>
                <div className={pageStyles.detailLabelSPPR}>Nama KPA</div>
                <div className={pageStyles.detailValueSPPR}>: {selectedSppr.nama_kpa}</div>
              </div>
              <div className={pageStyles.detailItemSPPR}>
                <div className={pageStyles.detailLabelSPPR}>Jabatan KPA</div>
                <div className={pageStyles.detailValueSPPR}>: {selectedSppr.jabatan_kpa || "N/A"}</div>
              </div>
              <div className={pageStyles.detailItemSPPR}>
                <div className={pageStyles.detailLabelSPPR}>Pangkat KPA</div>
                <div className={pageStyles.detailValueSPPR}>: {selectedSppr.pangkat_kpa}</div>
              </div>
              <div className={pageStyles.detailItemSPPR}>
                <div className={pageStyles.detailLabelSPPR}>Nama Bendahara</div>
                <div className={pageStyles.detailValueSPPR}>: {selectedSppr.nama_bendahara}</div>
              </div>
              <div className={pageStyles.detailItemSPPR}>
                <div className={pageStyles.detailLabelSPPR}>Jabatan Bendahara</div>
                <div className={pageStyles.detailValueSPPR}>: {selectedSppr.jabatan_bendahara || "N/A"}</div>
              </div>
              <div className={pageStyles.detailItemSPPR}>
                <div className={pageStyles.detailLabelSPPR}>Pangkat Bendahara</div>
                <div className={pageStyles.detailValueSPPR}>: {selectedSppr.pangkat_bendahara}</div>
              </div>
              <div className={pageStyles.detailItemSPPR}>
                <div className={pageStyles.detailLabelSPPR}>Nama Pengambil</div>
                <div className={pageStyles.detailValueSPPR}>: {selectedSppr.nama_pengambil}</div>
              </div>
              <div className={pageStyles.detailItemSPPR}>
                <div className={pageStyles.detailLabelSPPR}>Jabatan Pengambil</div>
                <div className={pageStyles.detailValueSPPR}>: {selectedSppr.jabatan_pengambil || "N/A"}</div>
              </div>
              <div className={pageStyles.detailItemSPPR}>
                <div className={pageStyles.detailLabelSPPR}>Pangkat Pengambil</div>
                <div className={pageStyles.detailValueSPPR}>: {selectedSppr.pangkat_pengambil}</div>
              </div>
              <div className={pageStyles.detailItemFullSPPR}>
                <div className={pageStyles.detailLabelSPPR}>Jumlah Penarikan</div>
                <div className={pageStyles.detailValueSPPR}>
                  : {formatAngka(selectedSppr.jumlah_penarikan)} ({capitalizeWords(terbilang(selectedSppr.jumlah_penarikan))} Rupiah)
                </div>
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