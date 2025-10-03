import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import Swal from "sweetalert2";
import { FaPlus, FaEdit, FaRegTrashAlt, FaBalanceScale } from "react-icons/fa";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

import styles from "../styles/button.module.css";
import pageStyles from "../styles/komponen.module.css";
import { formatTanggal, formatAngka } from '../lib/utils';
import PaginasiKeu from '../components/paginasi';

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

const JurnalUmum = () => {
  const [jurnalList, setJurnalList] = useState([]);
  const [akunList, setAkunList] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedJurnal, setSelectedJurnal] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [userRole, setUserRole] = useState("");
  
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    deskripsi: "",
    items: [{ akun_id: "", debit: "", kredit: "" }]
  });

  const fetchJurnal = useCallback(async () => {
    const { data: jurnalData, error: jurnalError } = await supabase
      .from("jurnal")
      .select(`
        id, tanggal, deskripsi, user_id,
        jurnal_item (akun_id, debit, kredit, akun:akun_id (kode_akun, nama_akun))
      `)
      .order("tanggal", { ascending: false });

    if (jurnalError) {
      console.error("Gagal mengambil data jurnal:", jurnalError);
      Swal.fire("Error", "Gagal mengambil data jurnal.", "error");
    } else {
      setJurnalList(jurnalData);
    }
  }, []);

  const fetchAkun = useCallback(async () => {
    const { data, error } = await supabase
      .from("bas_akun")
      .select("id, kode_akun, nama_akun, is_debit")
      .order("kode_akun", { ascending: true });
    
    if (error) {
      console.error("Gagal mengambil data akun:", error);
    } else {
      setAkunList(data);
    }
  }, []);

  useEffect(() => {
    const getLoggedInUser = async () => {
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
    getLoggedInUser();
    fetchJurnal();
    fetchAkun();
  }, [fetchJurnal, fetchAkun]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleItemChange = (e, index) => {
    const { name, value } = e.target;
    const newItems = [...formData.items];
    if (name === "debit" || name === "kredit") {
      newItems[index][name] = value === "" ? "" : parseInt(value);
      if (name === "debit") newItems[index].kredit = "";
      if (name === "kredit") newItems[index].debit = "";
    } else {
      newItems[index][name] = value;
    }
    setFormData(prevData => ({ ...prevData, items: newItems }));
  };

  const handleAddItem = () => {
    setFormData(prevData => ({ ...prevData, items: [...prevData.items, { akun_id: "", debit: "", kredit: "" }] }));
  };

  const handleRemoveItem = (index) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData(prevData => ({ ...prevData, items: newItems }));
  };

  const calculateTotals = () => {
    const totalDebit = formData.items.reduce((sum, item) => sum + (parseInt(item.debit) || 0), 0);
    const totalKredit = formData.items.reduce((sum, item) => sum + (parseInt(item.kredit) || 0), 0);
    return { totalDebit, totalKredit };
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const { totalDebit, totalKredit } = calculateTotals();
    if (totalDebit !== totalKredit || totalDebit === 0) {
      Swal.fire("Gagal!", "Total Debit dan Kredit harus sama dan tidak boleh nol.", "error");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Swal.fire("Error", "Anda harus login untuk menyimpan data.", "error");
      return;
    }

    // Menggunakan RLS untuk memastikan data hanya bisa diakses oleh pemiliknya
    const newJurnal = {
      tanggal: formData.tanggal,
      deskripsi: formData.deskripsi,
      user_id: user.id
    };

    if (isEditing) {
      const { error: jurnalError } = await supabase
        .from("jurnal")
        .update(newJurnal)
        .eq("id", selectedJurnal.id);
      if (jurnalError) {
        Swal.fire("Gagal!", `Jurnal gagal diupdate: ${jurnalError.message}`, "error");
        return;
      }
      
      const { error: itemDeleteError } = await supabase.from("jurnal_item").delete().eq("jurnal_id", selectedJurnal.id);
      if (itemDeleteError) {
        Swal.fire("Gagal!", `Item jurnal gagal dihapus: ${itemDeleteError.message}`, "error");
        return;
      }

      const itemsToInsert = formData.items.map(item => ({
        ...item,
        jurnal_id: selectedJurnal.id,
        debit: item.debit || 0,
        kredit: item.kredit || 0
      }));
      const { error: itemInsertError } = await supabase.from("jurnal_item").insert(itemsToInsert);
      if (itemInsertError) {
        Swal.fire("Gagal!", `Item jurnal gagal diupdate: ${itemInsertError.message}`, "error");
        return;
      }

      Swal.fire("Berhasil!", "Jurnal berhasil diupdate.", "success");
      fetchJurnal();
      resetForm();

    } else {
      const { data: jurnalData, error: jurnalError } = await supabase.from("jurnal").insert(newJurnal).select();
      if (jurnalError) {
        Swal.fire("Gagal!", `Jurnal gagal disimpan: ${jurnalError.message}`, "error");
        return;
      }

      const newJurnalId = jurnalData[0].id;
      const itemsToInsert = formData.items.map(item => ({
        ...item,
        jurnal_id: newJurnalId,
        debit: item.debit || 0,
        kredit: item.kredit || 0
      }));

      const { error: itemError } = await supabase.from("jurnal_item").insert(itemsToInsert);
      if (itemError) {
        Swal.fire("Gagal!", `Item jurnal gagal disimpan: ${itemError.message}`, "error");
        return;
      }

      Swal.fire("Berhasil!", "Jurnal berhasil disimpan.", "success");
      fetchJurnal();
      resetForm();
    }
  };

  const handleRowClick = (jurnal) => {
    setSelectedJurnal(selectedJurnal?.id === jurnal.id ? null : jurnal);
  };

  const handleEdit = () => {
    if (!selectedJurnal) return;
    setIsEditing(true);
    setFormData({
      tanggal: selectedJurnal.tanggal.split('T')[0],
      deskripsi: selectedJurnal.deskripsi,
      items: selectedJurnal.jurnal_item.map(item => ({
        akun_id: item.akun_id,
        debit: item.debit,
        kredit: item.kredit
      }))
    });
    setShowModal(true);
  };
  
  const handleDelete = async () => {
    if (!selectedJurnal) return;
    const result = await Swal.fire({
      title: "Apakah Anda yakin?",
      text: "Anda akan menghapus entri jurnal ini.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    });
    if (result.isConfirmed) {
      const { error } = await supabase.from("jurnal").delete().eq("id", selectedJurnal.id);
      if (error) {
        Swal.fire("Gagal!", "Data gagal dihapus. Coba lagi.", "error");
      } else {
        Swal.fire("Dihapus!", "Jurnal berhasil dihapus.", "success");
        setSelectedJurnal(null);
        fetchJurnal();
      }
      resetForm();
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setSelectedJurnal(null);
    setFormData({
      tanggal: new Date().toISOString().split('T')[0],
      deskripsi: "",
      items: [{ akun_id: "", debit: "", kredit: "" }]
    });
    setShowModal(false);
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    setSelectedJurnal(null);
  };

  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(parseInt(e.target.value));
    setCurrentPage(1);
    setSelectedJurnal(null);
  };

  const totalPages = Math.ceil(jurnalList.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedJurnal = jurnalList.slice(startIndex, endIndex);

  const isOwner = userRole === "Owner";
  const isActionDisabled = !isOwner || !selectedJurnal;
  const { totalDebit, totalKredit } = calculateTotals();

  return (
    <div className={pageStyles.container}>
      <h2 className={pageStyles.header}>Jurnal Umum</h2>
      <div className={pageStyles.buttonContainer}>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          disabled={!isOwner}
          className={styles.rekamButton}
        >
          <FaPlus /> Tambah Jurnal
        </button>
        <button
          onClick={handleEdit}
          disabled={isActionDisabled}
          className={styles.editButton}
        >
          <FaEdit /> Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={isActionDisabled}
          className={styles.hapusButton}
        >
          <FaRegTrashAlt /> Hapus
        </button>
      </div>

      {showModal && (
        <Modal onClose={resetForm}>
          <form onSubmit={handleSave}>
            <h3 style={{ marginTop: 0 }}>{isEditing ? "Edit Jurnal" : "Tambah Jurnal"}</h3>
            <hr style={dividerStyle} />
            <div className={pageStyles.modalForm} style={{ marginBottom: "20px" }}>
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Tanggal:</label>
                <input
                  type="date"
                  name="tanggal"
                  value={formData.tanggal}
                  onChange={handleInputChange}
                  required
                  className={pageStyles.formInput}
                />
              </div>
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Deskripsi:</label>
                <input
                  type="text"
                  name="deskripsi"
                  value={formData.deskripsi}
                  onChange={handleInputChange}
                  required
                  className={pageStyles.formInput}
                />
              </div>
              
              <hr style={dividerStyle} />
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <h4 style={{ margin: 0 }}>Entri Jurnal</h4>
                  <button type="button" onClick={handleAddItem} className={styles.rekamButton} style={{ padding: "5px 10px" }}>
                      <FaPlus /> Tambah Baris
                  </button>
              </div>

              {formData.items.map((item, index) => (
                <div key={index} style={{ display: "flex", gap: "10px", alignItems: "flex-end", marginBottom: "10px" }}>
                  <div className={pageStyles.formGroup} style={{ flex: 2, marginBottom: 0 }}>
                    <label className={pageStyles.formLabel}>{index === 0 ? "Akun" : ""}</label>
                    <select
                      name="akun_id"
                      value={item.akun_id}
                      onChange={(e) => handleItemChange(e, index)}
                      required
                      className={pageStyles.formInput}
                    >
                      <option value="">-- Pilih Akun --</option>
                      {akunList.map((akun) => (
                        <option key={akun.id} value={akun.id}>
                          {akun.kode_akun} - {akun.nama_akun}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={pageStyles.formGroup} style={{ flex: 1, marginBottom: 0 }}>
                    <label className={pageStyles.formLabel}>{index === 0 ? "Debit" : ""}</label>
                    <input
                      type="number"
                      name="debit"
                      value={item.debit}
                      onChange={(e) => handleItemChange(e, index)}
                      className={pageStyles.formInput}
                    />
                  </div>
                  <div className={pageStyles.formGroup} style={{ flex: 1, marginBottom: 0 }}>
                    <label className={pageStyles.formLabel}>{index === 0 ? "Kredit" : ""}</label>
                    <input
                      type="number"
                      name="kredit"
                      value={item.kredit}
                      onChange={(e) => handleItemChange(e, index)}
                      className={pageStyles.formInput}
                    />
                  </div>
                  {formData.items.length > 1 && (
                    <button type="button" onClick={() => handleRemoveItem(index)} className={styles.hapusButton} style={{ padding: "5px 10px", alignSelf: "flex-end" }}>
                        -
                    </button>
                  )}
                </div>
              ))}
              
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                  <h4 style={{margin:0, flex: 1, textAlign: "right"}}>Total Debit: {formatAngka(totalDebit)}</h4>
                  <h4 style={{margin:0, flex: 1, textAlign: "right"}}>Total Kredit: {formatAngka(totalKredit)}</h4>
              </div>
              <div style={{ textAlign: "right", color: totalDebit === totalKredit ? "green" : "red", fontWeight: "bold" }}>
                  <FaBalanceScale /> {totalDebit === totalKredit ? "Seimbang" : "Tidak Seimbang"}
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
                disabled={totalDebit !== totalKredit || totalDebit === 0}
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
              <th style={{ width: "25%" }}>Deskripsi</th>
              <th style={{ width: "20%" }}>Debit</th>
              <th style={{ width: "20%" }}>Kredit</th>
            </tr>
          </thead>
          <tbody className={pageStyles.tableBody}>
            {paginatedJurnal.length > 0 ? (
              paginatedJurnal.map((jurnal, index) => {
                const totalDebit = jurnal.jurnal_item.reduce((sum, item) => sum + item.debit, 0);
                const totalKredit = jurnal.jurnal_item.reduce((sum, item) => sum + item.kredit, 0);
                return (
                  <tr
                    key={jurnal.id}
                    onClick={() => handleRowClick(jurnal)}
                    className={`${pageStyles.tableRow} ${selectedJurnal?.id === jurnal.id ? pageStyles.selected : ""}`}
                  >
                    <td>{startIndex + index + 1}</td>
                    <td>{formatTanggal(jurnal.tanggal)}</td>
                    <td>{jurnal.deskripsi}</td>
                    <td>{formatAngka(totalDebit)}</td>
                    <td>{formatAngka(totalKredit)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className={pageStyles.tableEmpty}>
                  Tidak ada data jurnal yang ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginasiKeu
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={jurnalList.length}
        itemsPerPage={rowsPerPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleRowsPerPageChange}
      />
      <div className={pageStyles.detailContainerSPPR}>
        <div className={pageStyles.detailHeaderSPPR}>Detail Jurnal</div>
        {selectedJurnal ? (
          <div className={pageStyles.detailContentSPPR}>
            <div className={pageStyles.detailItemSPPR}>
              <div className={pageStyles.detailLabelSPPR}>Tanggal</div>
              <div className={pageStyles.detailValueSPPR}>: {formatTanggal(selectedJurnal.tanggal)}</div>
            </div>
            <div className={pageStyles.detailItemSPPR}>
              <div className={pageStyles.detailLabelSPPR}>Deskripsi</div>
              <div className={pageStyles.detailValueSPPR}>: {selectedJurnal.deskripsi}</div>
            </div>
            
            <hr style={dividerStyle} />
            <h4 style={{marginTop: 0}}>Rincian Entri:</h4>
            
            <table className={pageStyles.table} style={{width: "100%", border: "1px solid #ccc"}}>
                <thead>
                    <tr>
                        <th style={{textAlign: "left"}}>Akun</th>
                        <th style={{width: "20%"}}>Debit</th>
                        <th style={{width: "20%"}}>Kredit</th>
                    </tr>
                </thead>
                <tbody>
                    {selectedJurnal.jurnal_item.map((item) => (
                        <tr key={item.id}>
                            <td style={{textAlign: "left"}}>{item.akun.kode_akun} - {item.akun.nama_akun}</td>
                            <td>{formatAngka(item.debit)}</td>
                            <td>{formatAngka(item.kredit)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
        ) : (
          <div className={pageStyles.tableEmpty}>Pilih Jurnal untuk Melihat Detail</div>
        )}
      </div>
    </div>
  );
};

export default JurnalUmum;