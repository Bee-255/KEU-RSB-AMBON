// src/app/(main)/daftarakun/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/utils/supabaseClient";
import Swal from "sweetalert2";
import { FaPlus, FaEdit, FaRegTrashAlt } from "react-icons/fa";
import Paginasi from '@/components/paginasi';
import styles from "@/styles/button.module.css";
import pageStyles from "@/styles/komponen.module.css";
import { formatTanggal } from "@/components/utilitas"


// === Komponen Modal ===
const Modal: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({ children, onClose }) => {
    return (
        <div className={pageStyles.modalOverlay} onClick={onClose}>
            <div className={pageStyles.modalContent} onClick={(e) => e.stopPropagation()}>
                {children}
            </div>
        </div>
    );
};

// === Helper Functions (Dipindahkan ke luar komponen utama) ===
const getKategoriDariKode = (kodeAkun: string): string => {
    const firstDigit = kodeAkun.charAt(0);
    switch (firstDigit) {
        case '1': return 'Aset';
        case '2': return 'Kewajiban';
        case '3': return 'Ekuitas';
        case '4': return 'Pendapatan';
        case '5': return 'Belanja';
        default: return '';
    }
};

const getIsDebitDariKode = (kodeAkun: string): boolean | null => {
    const firstDigit = kodeAkun.charAt(0);
    if (!kodeAkun) return null;
    return ['1', '5'].includes(firstDigit);
};

// Interface untuk data akun
interface Akun {
    id: number;
    kode_akun: string;
    nama_akun: string;
    kategori: string;
    is_debit: boolean;
    is_induk: boolean;
    created_at: string;
}

// === Komponen Utama Daftar Akun ===
const DaftarAkun: React.FC = () => {
    const [akunList, setAkunList] = useState<Akun[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedAkun, setSelectedAkun] = useState<Akun | null>(null);
    const [showModal, setShowModal] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    
    // PERBAIKAN: Anotasi tipe yang benar untuk formData
    const [formData, setFormData] = useState<{
        kode_akun: string;
        nama_akun: string;
        kategori: string;
        is_debit: boolean | null;
        is_induk: boolean | null;
    }>({
        kode_akun: "",
        nama_akun: "",
        kategori: "",
        is_debit: null,
        is_induk: null,
    });
    
    const [userRole, setUserRole] = useState("");

    // --- Efek Samping (Side Effects) ---
    useEffect(() => {
        const initializeData = async () => {
            await getLoggedInUser();
            await fetchAkun();
        };
        initializeData();
    }, []);

    // --- Fungsi Pengambilan Data ---
    const getLoggedInUser = async () => {
        try {
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
        } catch (error) {
            console.error("Failed to fetch user role:", error);
        }
    };

    const fetchAkun = useCallback(async () => {
        const { data, error } = await supabase.from("bas_akun").select("*").order("created_at", { ascending: false });
        if (error) {
            console.error("Gagal mengambil data:", error);
            Swal.fire("Error", "Gagal mengambil data akun. Periksa koneksi atau nama tabel.", "error");
        } else {
            setAkunList(data as Akun[]);
        }
    }, []);

    // --- Handler Aksi Pengguna ---
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        
        if (name === "kode_akun") {
            const newKategori = getKategoriDariKode(value);
            const newIsDebit = getIsDebitDariKode(value);
            const newIsInduk = value.trim() !== '' ? !value.includes('.') : null;
            
            setFormData(prevData => ({
                ...prevData,
                kode_akun: value,
                kategori: newKategori,
                is_debit: newIsDebit,
                is_induk: newIsInduk,
            }));
        } else {
            setFormData(prevData => ({
                ...prevData,
                [name]: value,
            }));
        }
    }, []);
    
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const dataToSave = { ...formData, is_induk: !formData.kode_akun.includes('.') };
        
        // Cek duplikasi kode akun
        const { data: existingAccount, error: fetchError } = await supabase
            .from('bas_akun')
            .select('id')
            .eq('kode_akun', formData.kode_akun)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            Swal.fire("Error", "Gagal memeriksa kode akun.", "error");
            console.error("Error checking for duplicate:", fetchError);
            return;
        }

        if (existingAccount && (!isEditing || existingAccount.id !== selectedAkun?.id)) {
            Swal.fire("Gagal!", "Kode akun ini sudah ada. Mohon gunakan kode lain.", "warning");
            return;
        }
        
        if (isEditing) {
            const { error } = await supabase
                .from("bas_akun")
                .update(dataToSave)
                .eq("id", selectedAkun?.id);
            if (error) {
                Swal.fire("Gagal!", `Data gagal diupdate: ${error.message}`, "error");
                console.error("Error updating data:", error);
            } else {
                Swal.fire("Berhasil!", "Data berhasil diupdate.", "success");
                await fetchAkun();
                resetForm();
            }
        } else {
            const { error } = await supabase.from("bas_akun").insert([dataToSave]);
            if (error) {
                Swal.fire("Gagal!", `Data gagal disimpan: ${error.message}`, "error");
                console.error("Error inserting data:", error);
            } else {
                Swal.fire("Berhasil!", "Data berhasil disimpan.", "success");
                await fetchAkun();
                resetForm();
            }
        }
    };
    
    const handleDelete = async () => {
        if (!selectedAkun) return;
        const result = await Swal.fire({
            title: "Apakah Anda yakin?",
            text: `Anda akan menghapus akun dengan nama ${selectedAkun.nama_akun}`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#dc2626",
            cancelButtonColor: "#6b7280",
            confirmButtonText: "Ya, hapus!",
            cancelButtonText: "Batal",
        });
        if (result.isConfirmed) {
            const { error } = await supabase.from("bas_akun").delete().eq("id", selectedAkun.id);
            if (error) {
                Swal.fire("Gagal!", "Data gagal dihapus. Coba lagi.", "error");
                console.error("Error deleting data:", error);
            } else {
                Swal.fire("Dihapus!", "Data berhasil dihapus.", "success");
                setSelectedAkun(null);
                await fetchAkun();
            }
            resetForm();
        }
    };
    
    const handleEdit = () => {
        if (!selectedAkun) return;
        setIsEditing(true);
        setFormData({
            kode_akun: selectedAkun.kode_akun,
            nama_akun: selectedAkun.nama_akun,
            kategori: selectedAkun.kategori,
            is_debit: selectedAkun.is_debit,
            is_induk: selectedAkun.is_induk,
        });
        setShowModal(true);
    };
    
    const resetForm = useCallback(() => {
        setIsEditing(false);
        setSelectedAkun(null);
        setFormData({
            kode_akun: "",
            nama_akun: "",
            kategori: "",
            is_debit: null,
            is_induk: null,
        });
        setShowModal(false);
    }, []);
    
    const handleRowClick = (akun: Akun) => {
        if (selectedAkun?.id === akun.id) {
            setSelectedAkun(null);
        } else {
            setSelectedAkun(akun);
        }
    };
    
    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
        setSelectedAkun(null);
    };
    
    const handleRowsPerPageChange = (items: number) => {
        setRowsPerPage(items);
        setCurrentPage(1);
        setSelectedAkun(null);
    };
    
    const totalPages = Math.ceil(akunList.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedAkun = useMemo(() => {
        const endIndex = startIndex + rowsPerPage;
        return akunList.slice(startIndex, endIndex);
    }, [akunList, startIndex, rowsPerPage]);
    
    const isOwner = userRole === "Owner";
    const isActionDisabled = !isOwner || !selectedAkun;

    return (
        <div className={pageStyles.container}>
            <h2 className={pageStyles.header}>Daftar Bagan Akun Standar (BAS)</h2>
            <div className={pageStyles.buttonContainer}>
                <button
                    onClick={() => {
                        resetForm();
                        setShowModal(true);
                    }}
                    disabled={!isOwner}
                    className={styles.rekamButton}
                >
                    <FaPlus /> Tambah Akun
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
                        <h3 style={{ marginTop: 0 }}>{isEditing ? "Edit Akun BAS" : "Tambah Akun BAS"}</h3>
                        <hr style={{ border: "0", height: "1px", backgroundColor: "#e5e7eb", margin: "20px 0" }} />
                        <div className={pageStyles.modalForm}>
                            <div className={pageStyles.formGroup}>
                                <label className={pageStyles.formLabel}>Kode Akun:</label>
                                <input
                                    type="text"
                                    name="kode_akun"
                                    value={formData.kode_akun}
                                    onChange={handleInputChange}
                                    required
                                    className={pageStyles.formInput}
                                    readOnly={isEditing}
                                />
                            </div>
                            <div className={pageStyles.formGroup}>
                                <label className={pageStyles.formLabel}>Nama Akun:</label>
                                <input
                                    type="text"
                                    name="nama_akun"
                                    value={formData.nama_akun}
                                    onChange={handleInputChange}
                                    required
                                    className={pageStyles.formInput}
                                />
                            </div>
                            <div className={pageStyles.formGroup}>
                                <label className={pageStyles.formLabel}>Kategori:</label>
                                <input
                                    type="text"
                                    name="kategori"
                                    value={formData.kategori}
                                    readOnly
                                    className={`${pageStyles.formInput} ${pageStyles.readOnly}`}
                                />
                            </div>
                            <div className={pageStyles.formGroup}>
                                <label className={pageStyles.formLabel}>Saldo Normal:</label>
                                <input
                                    type="text"
                                    name="saldo_normal"
                                    value={formData.is_debit === null ? "" : (formData.is_debit ? "Debit" : "Kredit")}
                                    readOnly
                                    className={`${pageStyles.formInput} ${pageStyles.readOnly}`}
                                />
                            </div>
                            <div className={pageStyles.formGroup}>
                                <label className={pageStyles.formLabel}>Jenis Akun:</label>
                                <input
                                    type="text"
                                    name="jenis_akun"
                                    value={formData.is_induk === null ? "" : (formData.is_induk ? "Induk" : "Detail")}
                                    readOnly
                                    className={`${pageStyles.formInput} ${pageStyles.readOnly}`}
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
                            <th style={{ width: "20%" }}>Kode Akun</th>
                            <th style={{ width: "30%" }}>Nama Akun</th>
                            <th style={{ width: "15%" }}>Kategori</th>
                            <th style={{ width: "20%" }}>Saldo Normal</th>
                            <th style={{ width: "10%" }}>Jenis</th>
                        </tr>
                    </thead>
                    <tbody className={pageStyles.tableBody}>
                        {paginatedAkun.length > 0 ? (
                            paginatedAkun.map((akun, index) => (
                                <tr
                                    key={akun.id}
                                    onClick={() => handleRowClick(akun)}
                                    className={`${pageStyles.tableRow} ${selectedAkun?.id === akun.id ? pageStyles.selected : ""}`}
                                >
                                    <td>{startIndex + index + 1}</td>
                                    <td>{akun.kode_akun}</td>
                                    <td>{akun.nama_akun}</td>
                                    <td>{akun.kategori}</td>
                                    <td>{akun.is_debit ? "Debit" : "Kredit"}</td>
                                    <td>{akun.is_induk ? "Induk" : "Detail"}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className={pageStyles.tableEmpty}>
                                    Tidak ada data akun yang ditemukan.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <Paginasi
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={akunList.length}
                itemsPerPage={rowsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleRowsPerPageChange}
            />
            <div className={pageStyles.detailContainerSPPR}>
                <div className={pageStyles.detailHeaderSPPR}>Detail Data Akun</div>
                {selectedAkun ? (
                    <div className={pageStyles.detailContentSPPR}>
                        <div className={pageStyles.detailItemSPPR}>
                            <div className={pageStyles.detailLabelSPPR}>Kode Akun</div>
                            <div className={pageStyles.detailValueSPPR}>: {selectedAkun.kode_akun}</div>
                        </div>
                        <div className={pageStyles.detailItemSPPR}>
                            <div className={pageStyles.detailLabelSPPR}>Nama Akun</div>
                            <div className={pageStyles.detailValueSPPR}>: {selectedAkun.nama_akun}</div>
                        </div>
                        <div className={pageStyles.detailItemSPPR}>
                            <div className={pageStyles.detailLabelSPPR}>Kategori</div>
                            <div className={pageStyles.detailValueSPPR}>: {selectedAkun.kategori}</div>
                        </div>
                        <div className={pageStyles.detailItemSPPR}>
                            <div className={pageStyles.detailLabelSPPR}>Saldo Normal</div>
                            <div className={pageStyles.detailValueSPPR}>: {selectedAkun.is_debit ? "Debit" : "Kredit"}</div>
                        </div>
                        <div className={pageStyles.detailItemSPPR}>
                            <div className={pageStyles.detailLabelSPPR}>Jenis Akun</div>
                            <div className={pageStyles.detailValueSPPR}>: {selectedAkun.is_induk ? "Induk" : "Detail"}</div>
                        </div>
                        <div className={pageStyles.detailItemSPPR}>
                            <div className={pageStyles.detailLabelSPPR}>Tanggal Dibuat</div>
                            <div className={pageStyles.detailValueSPPR}>: {formatTanggal(selectedAkun.created_at)}</div>
                        </div>
                    </div>
                ) : (
                    <div className={pageStyles.tableEmpty}>Pilih Akun untuk Melihat Detail</div>
                )}
            </div>
        </div>
    );
};

export default DaftarAkun;