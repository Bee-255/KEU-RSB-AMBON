// src/app/(main)/daftarakun/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useKeuNotification } from "@/lib/useKeuNotification";
import { FaPlus, FaEdit, FaRegTrashAlt } from "react-icons/fa";
import Paginasi from '@/components/paginasi';
import styles from "@/styles/button.module.css";
import pageStyles from "@/styles/komponen.module.css";
import loadingStyles from "@/styles/loading.module.css";
import { formatTanggal } from "@/components/utilitas";

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

// === Helper Functions ===
const getKategoriDariKode = (kodeAkun: string): string => {
    const firstDigit = kodeAkun.charAt(0);
    switch (firstDigit) {
        case '1': return 'Aset';
        case '2': return 'Kewajiban';
        case '3': return 'Ekuitas';
        case '4': return 'Pendapatan';
        case '5': return 'Belanja';
        case '6': return 'Beban';
        default: return '';
    }
};

const getIsDebitDariKode = (kodeAkun: string): boolean | null => {
    const firstDigit = kodeAkun.charAt(0);
    if (!kodeAkun) return null;
    return ['1', '5', '6'].includes(firstDigit);
};

// Interface untuk data akun
interface Akun {
    id: number;
    kode_akun: string;
    nama_akun: string;
    kategori_akun: string;
    is_debit: boolean;
    is_induk: boolean;
    created_at: string;
}

// === Komponen Utama Daftar Akun ===
const DaftarAkun: React.FC = () => {
    const [akunList, setAkunList] = useState<Akun[]>([]);
    const [filteredAkunList, setFilteredAkunList] = useState<Akun[]>([]);
    const [kategoriList, setKategoriList] = useState<string[]>([]);
    const [selectedKategori, setSelectedKategori] = useState<string>("");
    const [isEditing, setIsEditing] = useState(false);
    const [selectedAkun, setSelectedAkun] = useState<Akun | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    
    const [formData, setFormData] = useState<{
        kode_akun: string;
        nama_akun: string;
        kategori_akun: string;
        is_debit: boolean | null;
        is_induk: boolean | null;
    }>({
        kode_akun: "",
        nama_akun: "",
        kategori_akun: "",
        is_debit: null,
        is_induk: null,
    });
    
    const [userRole, setUserRole] = useState("");
    const { showToast, showConfirm } = useKeuNotification();

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
            showToast("Gagal mengambil data pengguna", "error");
        }
    };

    const fetchAkun = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("bas_akun")
                .select("*")
                .order("kode_akun", { ascending: true });
            
            if (error) {
                console.error("Gagal mengambil data:", error);
                showToast("Gagal mengambil data akun", "error");
            } else {
                setAkunList(data as Akun[]);
                setFilteredAkunList(data as Akun[]);
                
                // Ekstrak kategori unik dan urutkan sesuai urutan yang diinginkan
                const uniqueKategori = Array.from(new Set(data.map((item: Akun) => item.kategori_akun)))
                    .filter(kategori => kategori)
                    .sort((a, b) => {
                        const order = ['Aset', 'Kewajiban', 'Ekuitas', 'Pendapatan', 'Belanja', 'Belanja-LO', 'Beban'];
                        return order.indexOf(a) - order.indexOf(b);
                    });
                
                setKategoriList(uniqueKategori);
            }
        } catch (error) {
            console.error("Gagal mengambil data:", error);
            showToast("Terjadi kesalahan saat mengambil data", "error");
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    // --- Filter Data ---
    const applyFilter = useCallback(() => {
        if (!selectedKategori) {
            setFilteredAkunList(akunList);
        } else {
            const filtered = akunList.filter(akun => 
                akun.kategori_akun === selectedKategori
            );
            setFilteredAkunList(filtered);
        }
        setCurrentPage(1);
        setSelectedAkun(null);
    }, [selectedKategori, akunList]);

    // --- Efek Samping (Side Effects) ---
    useEffect(() => {
        getLoggedInUser();
        fetchAkun();
    }, [fetchAkun]);

    useEffect(() => {
        applyFilter();
    }, [applyFilter]);

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
                kategori_akun: newKategori,
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
    
    const handleKategoriFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedKategori(e.target.value);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const dataToSave = { 
            ...formData, 
            is_induk: formData.kode_akun.includes('.') ? false : true 
        };
        
        // Cek duplikasi kode_akun
        const { data: existingAccount, error: fetchError } = await supabase
            .from('bas_akun')
            .select('id')
            .eq('kode_akun', formData.kode_akun)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            showToast("Gagal memeriksa kode akun", "error");
            console.error("Error checking for duplicate:", fetchError);
            return;
        }

        if (existingAccount && (!isEditing || existingAccount.id !== selectedAkun?.id)) {
            showToast("Kode akun sudah ada. Gunakan kode lain", "warning");
            return;
        }
        
        try {
            if (isEditing) {
                const { error } = await supabase
                    .from("bas_akun")
                    .update(dataToSave)
                    .eq("id", selectedAkun?.id);
                
                if (error) throw error;
                
                showToast("Data berhasil diupdate", "success");
                await fetchAkun();
                resetForm();
            } else {
                const { error } = await supabase.from("bas_akun").insert([dataToSave]);
                
                if (error) throw error;
                
                // Auto-create account_balance untuk akun baru
                try {
                    await supabase
                        .from("account_balances")
                        .insert([
                            {
                                kode_akun: dataToSave.kode_akun,
                                saldo: 0,
                                last_updated: new Date().toISOString()
                            }
                        ]);
                } catch (balanceError) {
                    console.warn("Gagal membuat account balance, tetapi akun berhasil dibuat:", balanceError);
                }
                
                showToast("Data berhasil disimpan", "success");
                await fetchAkun();
                resetForm();
            }
        } catch (error: any) {
            console.error("Error saving data:", error);
            showToast(`Data gagal disimpan: ${error.message}`, "error");
        }
    };
    
    const handleDelete = async () => {
        if (!selectedAkun) return;
        
        const result = await showConfirm({
            title: "Konfirmasi Hapus",
            message: `Anda akan menghapus akun dengan nama ${selectedAkun.nama_akun}`,
            confirmText: "Ya, Hapus!",
        });
        
        if (result) {
            try {
                // Hapus dari account_balances terlebih dahulu
                await supabase
                    .from("account_balances")
                    .delete()
                    .eq("kode_akun", selectedAkun.kode_akun);
                
                // Hapus dari bas_akun
                const { error } = await supabase
                    .from("bas_akun")
                    .delete()
                    .eq("id", selectedAkun.id);
                
                if (error) throw error;
                
                showToast("Data berhasil dihapus", "success");
                setSelectedAkun(null);
                await fetchAkun();
            } catch (error: any) {
                console.error("Error deleting data:", error);
                showToast("Data gagal dihapus", "error");
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
            kategori_akun: selectedAkun.kategori_akun,
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
            kategori_akun: "",
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
    
    // --- Logika Paginasi ---
    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
        setSelectedAkun(null);
    };
    
    const handleRowsPerPageChange = (items: number) => {
        setRowsPerPage(items);
        setCurrentPage(1);
        setSelectedAkun(null);
    };
    
    const totalPages = Math.ceil(filteredAkunList.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedAkun = useMemo(() => {
        const endIndex = startIndex + rowsPerPage;
        return filteredAkunList.slice(startIndex, endIndex);
    }, [filteredAkunList, startIndex, rowsPerPage]);
    
    const isOwner = userRole === "Owner";
    const isActionDisabled = !isOwner || !selectedAkun;

    // --- Render Komponen ---
    return (
        <div className={pageStyles.container}>
            <h2 className={pageStyles.header}>Daftar Bagan Akun Standar (BAS)</h2>

            {/* Action Buttons dan Filter */}
            <div className={pageStyles.buttonContainer}>
                <button
                    onClick={() => {
                        resetForm();
                        setShowModal(true);
                    }}
                    disabled={!isOwner}
                    className={styles.rekamButton}
                >
                    <FaPlus /> Rekam
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

                {/* Filter Kategori - dipindah ke samping tombol aksi */}
                <select
                    value={selectedKategori}
                    onChange={handleKategoriFilterChange}
                    className={pageStyles.filterSelect}
                    style={{ marginLeft: 'auto' }}
                >
                    <option value="">-- Pilih Kategori --</option>
                    {kategoriList.map((kategori) => (
                        <option key={kategori} value={kategori}>
                            {kategori}
                        </option>
                    ))}
                </select>
            </div>

            {/* Modal */}
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
                                    className={`${pageStyles.formInput} ${isEditing ? pageStyles.readOnly : ''}`}
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
                                    name="kategori_akun"
                                    value={formData.kategori_akun}
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
            
            {/* Wrapper untuk Tabel dan Paginasi */}
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
                    
                    {/* Tabel Section */}
                    <table className={pageStyles.table}>
                        <thead className={pageStyles.tableHead}>
                            <tr>
                                <th style={{ width: "3%", textAlign: "center" }}>No.</th>
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
                                    <tr key={akun.id} onClick={() => handleRowClick(akun)} className={`${pageStyles.tableRow} ${selectedAkun?.id === akun.id ? pageStyles.selected : ""}`}>
                                        <td style={{ textAlign: "center" }}>{startIndex + index + 1}</td>
                                        <td>{akun.kode_akun}</td>
                                        <td>{akun.nama_akun}</td>
                                        <td>{akun.kategori_akun}</td>
                                        <td>{akun.is_debit ? "Debit" : "Kredit"}</td>
                                        <td>{akun.is_induk ? "Induk" : "Detail"}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className={pageStyles.tableEmpty}>
                                        {selectedKategori ? 
                                            `Tidak ada data akun dengan kategori ${selectedKategori}` : 
                                            "Tidak ada data akun yang ditemukan."
                                        }
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    
                    {/* Paginasi Section - sekarang dalam wrapper yang sama */}
                    <div style={{ 
                        padding: '1rem', 
                        borderTop: '1px solid #e2e8f0',
                        backgroundColor: 'white',
                        position: 'sticky',
                        bottom: 0,
                        zIndex: 5
                    }}>
                        <Paginasi
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={filteredAkunList.length}
                            itemsPerPage={rowsPerPage}
                            onPageChange={handlePageChange}
                            onItemsPerPageChange={handleRowsPerPageChange}
                        />
                    </div>
                </div>
            </div>
            
            {/* Detail Section */}
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
                            <div className={pageStyles.detailValueSPPR}>: {selectedAkun.kategori_akun}</div>
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
            {/* End Detail Section */}
        </div>
    );
};

export default DaftarAkun;