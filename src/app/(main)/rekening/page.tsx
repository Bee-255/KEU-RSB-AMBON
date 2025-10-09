// src/app/(main)/rekening/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/utils/supabaseClient";
import { FaPlus, FaEdit, FaRegTrashAlt } from "react-icons/fa";
import Paginasi from '@/components/paginasi';
import { useKeuNotification } from "@/lib/useKeuNotification";
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

// Interface untuk data rekening
interface Rekening {
    id: string; 
    kode: string;
    wilayah: string;
    nama_satker: string;
    kode_satker: string;
    nomor_rekening: string;
    nama_rekening: string;
    bank: string;
    nomor_izin: string | null;
    tanggal_izin: string | null;
    kelompok: string;
    status_rekening: string;
    kode_akun_bank: string | null;
    // Kolom baru
    nama_kode_akun_bank: string | null; 
    created_at: string;
}

// Interface untuk Form Data
interface RekeningFormData {
    kode: string;
    wilayah: string;
    nama_satker: string;
    kode_satker: string;
    nomor_rekening: string;
    nama_rekening: string;
    bank: string;
    nomor_izin: string;
    tanggal_izin: string;
    kelompok: string;
    status_rekening: string;
    kode_akun_bank: string;
    // Properti baru di Form Data
    nama_kode_akun_bank: string; 
}

// === Komponen Utama Daftar Rekening ===
const DaftarRekening: React.FC = () => {
    const [rekeningList, setRekeningList] = useState<Rekening[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedRekening, setSelectedRekening] = useState<Rekening | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    
    const [formData, setFormData] = useState<RekeningFormData>({
        kode: "",
        wilayah: "Maluku",
        nama_satker: "",
        kode_satker: "",
        nomor_rekening: "",
        nama_rekening: "",
        bank: "",
        nomor_izin: "",
        tanggal_izin: "",
        kelompok: "", // Default empty for placeholder
        status_rekening: "Aktif",
        kode_akun_bank: "", // Default empty for placeholder
        nama_kode_akun_bank: "", // Default value untuk kolom baru
    });
    
    const [userRole, setUserRole] = useState("");
    const [akunBankOptions, setAkunBankOptions] = useState<{kode_akun: string, nama_akun: string}[]>([]); 
    
    // Inisialisasi hook notifikasi
    const { showToast, showConfirm } = useKeuNotification();

    // --- Fungsi Pengambilan Role Pengguna ---
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
            console.error("Gagal mengambil role pengguna:", error);
        }
    };

    // --- Fungsi Pengambilan Data Rekening ---
    const fetchRekening = useCallback(async () => {
        setIsLoading(true);
        try {
            // Pastikan Anda juga memilih kolom 'nama_kode_akun_bank'
            const { data, error } = await supabase
                .from("data_rekening") 
                .select("*") 
                .order("created_at", { ascending: false });
            
            if (error) {
                console.error("Gagal mengambil data rekening:", error);
                // Perubahan: Menggunakan showToast
                showToast("Gagal mengambil data rekening. Periksa koneksi atau nama tabel.", "error");
            } else {
                setRekeningList(data as Rekening[]);
            }
        } catch (error) {
            console.error("Gagal mengambil data rekening:", error);
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    // --- Fungsi Pengambilan Opsi Kode Akun Bank (Filtered Enum) ---
    const fetchKodeAkunBank = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("bas_akun")
                .select("kode_akun, nama_akun")
                .eq("is_induk", false)
                .like("kode_akun", "111911%") 
                .order("kode_akun", { ascending: true });
            
            if (error) {
                console.error("Gagal mengambil daftar kode akun bank:", error);
            } else {
                setAkunBankOptions(data as {kode_akun: string, nama_akun: string}[]);
            }
        } catch (error) {
            console.error("Error fetching bank account codes:", error);
        }
    }, []);

    // --- Efek Samping (Side Effects) ---
    useEffect(() => {
        getLoggedInUser();
        fetchRekening();
        fetchKodeAkunBank();
    }, [fetchRekening, fetchKodeAkunBank]);
    
    // *** FUNGSI BARU: Cari Nama Akun Bank dari Options ***
    const getNamaAkunBank = useCallback((kode: string | null): string => {
        if (!kode) return '-';
        const akun = akunBankOptions.find(opt => opt.kode_akun === kode);
        return akun ? `${akun.kode_akun} - ${akun.nama_akun}` : kode;
    }, [akunBankOptions]);
    
    // *** FUNGSI BARU: Mendapatkan Nama Akun dari Kode Akun ***
    const getNamaAkunFromKode = useCallback((kode: string): string => {
        const akun = akunBankOptions.find(opt => opt.kode_akun === kode);
        return akun ? akun.nama_akun : "";
    }, [akunBankOptions]);
    // *************************************************

    // --- Handler Aksi Pengguna ---
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        // Logika untuk mengisi nama_kode_akun_bank
        if (name === "kode_akun_bank") {
            const namaAkun = getNamaAkunFromKode(value);
            setFormData(prevData => ({
                ...prevData,
                [name]: value,
                nama_kode_akun_bank: namaAkun, // Otomatis mengisi nama akun
            }));
        } else {
            setFormData(prevData => ({
                ...prevData,
                [name]: value,
            }));
        }
    }, [getNamaAkunFromKode]);
    
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (formData.kelompok === "") {
            // Perubahan: Menggunakan showToast
            showToast("Mohon pilih Kelompok Rekening (BPG atau RPL).", "warning");
            return;
        }

        // Cek duplikasi nomor_rekening
        const { data: existingRekening, error: fetchError } = await supabase
            .from('data_rekening')
            .select('id')
            .eq('nomor_rekening', formData.nomor_rekening)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            // Perubahan: Menggunakan showToast
            showToast("Gagal memeriksa nomor rekening.", "error");
            console.error("Error checking for duplicate:", fetchError);
            return;
        }

        if (existingRekening && (!isEditing || existingRekening.id !== selectedRekening?.id)) {
            // Perubahan: Menggunakan showToast
            showToast("Nomor rekening ini sudah terdaftar. Mohon gunakan nomor lain.", "warning");
            return;
        }
        
        // Data yang akan disimpan, termasuk kolom baru: nama_kode_akun_bank
        const dataToSave = { 
            ...formData, 
            nomor_izin: formData.nomor_izin || null, 
            tanggal_izin: formData.tanggal_izin || null,
            kode_akun_bank: formData.kode_akun_bank || null,
            // Menyimpan nama akun bank. Jika kode_akun_bank kosong, nama_kode_akun_bank juga kosong.
            nama_kode_akun_bank: formData.kode_akun_bank ? formData.nama_kode_akun_bank : null,
        };
        
        if (isEditing) {
            const { error } = await supabase
                .from("data_rekening")
                .update(dataToSave)
                .eq("id", selectedRekening?.id);
            if (error) {
                // Perubahan: Menggunakan showToast
                showToast(`Data gagal diupdate: ${error.message}`, "error");
                console.error("Error updating data:", error);
            } else {
                // Perubahan: Menggunakan showToast
                showToast("Data berhasil diupdate.", "success");
                await fetchRekening();
                resetForm();
            }
        } else {
            const { error } = await supabase.from("data_rekening").insert([dataToSave]);
            if (error) {
                // Perubahan: Menggunakan showToast
                showToast(`Data gagal disimpan: ${error.message}`, "error");
                console.error("Error inserting data:", error);
            } else {
                // Perubahan: Menggunakan showToast
                showToast("Data berhasil disimpan.", "success");
                await fetchRekening();
                resetForm();
            }
        }
    };
    
    const handleDelete = async () => {
        if (!selectedRekening) return;
        
        // Perubahan: Menggunakan showConfirm
        const isConfirmed = await showConfirm({
            title: "Konfirmasi Hapus",
            message: (
                <>
                    Apakah Anda yakin ingin menghapus rekening ini?
                    <br />
                    <strong>{selectedRekening.nomor_rekening} ({selectedRekening.bank})</strong>
                    <p className="mt-2 text-sm text-gray-500">Aksi ini tidak dapat dibatalkan.</p>
                </>
            ),
            confirmText: "Ya, Hapus!",
            cancelText: "Batal",
        });

        if (isConfirmed) {
            const { error } = await supabase.from("data_rekening").delete().eq("id", selectedRekening.id);
            if (error) {
                // Perubahan: Menggunakan showToast
                showToast("Data gagal dihapus. Coba lagi.", "error");
                console.error("Error deleting data:", error);
            } else {
                // Perubahan: Menggunakan showToast
                showToast("Data berhasil dihapus.", "success");
                setSelectedRekening(null);
                await fetchRekening();
            }
            resetForm();
        }
    };
    
    const handleEdit = () => {
        if (!selectedRekening) return;
        setIsEditing(true);
        // Mendapatkan nama akun bank saat ini
        const currentNamaAkunBank = selectedRekening.kode_akun_bank 
            ? getNamaAkunFromKode(selectedRekening.kode_akun_bank) 
            : (selectedRekening.nama_kode_akun_bank || "");

        setFormData({
            kode: selectedRekening.kode,
            wilayah: selectedRekening.wilayah,
            nama_satker: selectedRekening.nama_satker,
            kode_satker: selectedRekening.kode_satker,
            nomor_rekening: selectedRekening.nomor_rekening,
            nama_rekening: selectedRekening.nama_rekening,
            bank: selectedRekening.bank,
            nomor_izin: selectedRekening.nomor_izin || "",
            // Ambil tanggal_izin dan format agar sesuai dengan input type="date" (YYYY-MM-DD)
            tanggal_izin: selectedRekening.tanggal_izin ? selectedRekening.tanggal_izin.split('T')[0] : "",
            kelompok: selectedRekening.kelompok,
            status_rekening: selectedRekening.status_rekening,
            kode_akun_bank: selectedRekening.kode_akun_bank || "",
            // Mengisi kolom baru saat edit
            nama_kode_akun_bank: currentNamaAkunBank, 
        });
        setShowModal(true);
    };
    
    const resetForm = useCallback(() => {
        setIsEditing(false);
        setSelectedRekening(null);
        setFormData({
            kode: "",
            wilayah: "Maluku",
            nama_satker: "",
            kode_satker: "",
            nomor_rekening: "",
            nama_rekening: "",
            bank: "",
            nomor_izin: "",
            tanggal_izin: "",
            kelompok: "",
            status_rekening: "Aktif",
            kode_akun_bank: "",
            nama_kode_akun_bank: "", // Reset kolom baru
        });
        setShowModal(false);
    }, []);
    
    const handleRowClick = (rekening: Rekening) => {
        // Logika klik baris tetap sama...
        if (selectedRekening?.id === rekening.id) {
            setSelectedRekening(null);
        } else {
            setSelectedRekening(rekening);
        }
    };
    
    // --- Logika Paginasi (Sama) ---
    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
        setSelectedRekening(null);
    };
    
    const handleRowsPerPageChange = (items: number) => {
        setRowsPerPage(items);
        setCurrentPage(1);
        setSelectedRekening(null);
    };
    
    const totalPages = Math.ceil(rekeningList.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedRekening = useMemo(() => {
        const endIndex = startIndex + rowsPerPage;
        return rekeningList.slice(startIndex, endIndex);
    }, [rekeningList, startIndex, rowsPerPage]);
    
    // --- Logic Akses Role (Sama) ---
    const isOwner = userRole === "Owner";
    const canCUD = ['Owner', 'Admin', 'Operator'].includes(userRole);
    
    const isEditOrRekamDisabled = !canCUD; 
    const isHapusDisabled = !isOwner || !selectedRekening; 
    const isEditDisabled = !canCUD || !selectedRekening; 

    // --- Render Komponen ---
    return (
        <div className={pageStyles.container}>
            <h2 className={pageStyles.header}>Daftar Rekening Rumah Sakit</h2>
            <div className={pageStyles.buttonContainer}>
                <button
                    onClick={() => {
                        resetForm();
                        setShowModal(true);
                    }}
                    disabled={isEditOrRekamDisabled}
                    className={styles.rekamButton}
                >
                    <FaPlus /> Tambah Rekening
                </button>
            
                <button
                    onClick={handleEdit}
                    disabled={isEditDisabled}
                    className={styles.editButton}
                >
                    <FaEdit /> Edit
                </button>
            
                <button
                    onClick={handleDelete}
                    disabled={isHapusDisabled}
                    className={styles.hapusButton}
                >
                    <FaRegTrashAlt /> Hapus
                </button>
            </div>
            
            {/* === Komponen Modal Tambah/Edit === */}
            {showModal && (
                <Modal onClose={resetForm}>
                    <form onSubmit={handleSave}>
                        <h3 style={{ marginTop: 0 }}>{isEditing ? "Edit Data Rekening" : "Tambah Data Rekening"}</h3>
                        <hr style={{ border: "0", height: "1px", backgroundColor: "#e5e7eb", margin: "20px 0" }} />
                        <div className={pageStyles.modalForm}>
                            {/* Baris 1: Kode, Wilayah */}
                            <div className={pageStyles.formGroup}>
                                <label className={pageStyles.formLabel}>Kode Wilayah:</label>
                                <input
                                    type="text"
                                    name="kode"
                                    value={formData.kode}
                                    onChange={handleInputChange}
                                    required
                                    className={pageStyles.formInput}
                                />
                            </div>
                            <div className={pageStyles.formGroup}>
                                <label className={pageStyles.formLabel}>Wilayah:</label>
                                <input
                                    type="text"
                                    name="wilayah"
                                    value={formData.wilayah}
                                    onChange={handleInputChange}
                                    required
                                    className={pageStyles.formInput}
                                />
                            </div>

                            {/* Baris 2: Nama Satker, Kode Satker */}
                            <div className={pageStyles.formGroup}>
                                <label className={pageStyles.formLabel}>Nama Satker:</label>
                                <input
                                    type="text"
                                    name="nama_satker"
                                    value={formData.nama_satker}
                                    onChange={handleInputChange}
                                    required
                                    className={pageStyles.formInput}
                                />
                            </div>
                            <div className={pageStyles.formGroup}>
                                <label className={pageStyles.formLabel}>Kode Satker:</label>
                                <input
                                    type="text"
                                    name="kode_satker"
                                    value={formData.kode_satker}
                                    onChange={handleInputChange}
                                    required
                                    className={pageStyles.formInput}
                                />
                            </div>
                            
                            {/* Baris 3: Nomor Rekening, Nama Rekening */}
                            <div className={pageStyles.formGroup}>
                                <label className={pageStyles.formLabel}>Nomor Rekening:</label>
                                <input
                                    type="text"
                                    name="nomor_rekening"
                                    value={formData.nomor_rekening}
                                    onChange={handleInputChange}
                                    required
                                    className={`${pageStyles.formInput} ${isEditing ? pageStyles.readOnly : ''}`}
                                    readOnly={isEditing} 
                                />
                            </div>
                            <div className={pageStyles.formGroup}>
                                <label className={pageStyles.formLabel}>Nama Rekening (Atas Nama):</label>
                                <input
                                    type="text"
                                    name="nama_rekening"
                                    value={formData.nama_rekening}
                                    onChange={handleInputChange}
                                    required
                                    className={pageStyles.formInput}
                                />
                            </div>
                            
                            {/* Baris 4: Bank, Kode Akun Bank (ENUM/SELECT) */}
                            <div className={pageStyles.formGroup}>
                                <label className={pageStyles.formLabel}>Nama Bank:</label>
                                <input
                                    type="text"
                                    name="bank"
                                    value={formData.bank}
                                    onChange={handleInputChange}
                                    required
                                    className={pageStyles.formInput}
                                />
                            </div>
                            <div className={pageStyles.formGroup}>
                                <label className={pageStyles.formLabel}>Kode Akun Bank:</label>
                                <select 
                                    name="kode_akun_bank"
                                    value={formData.kode_akun_bank}
                                    onChange={handleInputChange}
                                    className={`${pageStyles.formInput} ${formData.kode_akun_bank === "" ? pageStyles.selectPlaceholder : ""}`}
                                >
                                    <option value="">-- Pilih Kode Akun --</option> 
                                    {akunBankOptions.map(akun => (
                                        <option key={akun.kode_akun} value={akun.kode_akun}>
                                            {akun.kode_akun} - {akun.nama_akun}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            {/* TIDAK ADA INPUT UNTUK nama_kode_akun_bank DI SINI */}

                            {/* Baris 5: Nomor Izin, Tanggal Izin */}
                            <div className={pageStyles.formGroup}>
                                <label className={pageStyles.formLabel}>Nomor Izin:</label>
                                <input
                                    type="text"
                                    name="nomor_izin"
                                    value={formData.nomor_izin}
                                    onChange={handleInputChange}
                                    className={pageStyles.formInput}
                                />
                            </div>
                            <div className={pageStyles.formGroup}>
                                <label className={pageStyles.formLabel}>Tanggal Izin:</label>
                                <input
                                    type="date"
                                    name="tanggal_izin"
                                    value={formData.tanggal_izin}
                                    onChange={handleInputChange}
                                    className={pageStyles.formInput}
                                />
                            </div>

                            {/* Baris 6: Kelompok Rekening (ENUM) */}
                            <div className={pageStyles.formGroup}>
                                <label className={pageStyles.formLabel}>Kelompok:</label>
                                <select
                                    name="kelompok"
                                    value={formData.kelompok}
                                    onChange={handleInputChange}
                                    required
                                    className={`${pageStyles.formInput} ${formData.kelompok === "" ? pageStyles.selectPlaceholder : ""}`}
                                >
                                    <option value="">-- Pilih Kelompok --</option>
                                    <option value="BPG">BPG</option>
                                    <option value="RPL">RPL</option>
                                </select>
                            </div>

                            {/* Baris 6: Status Rekening */}
                            <div className={pageStyles.formGroup}>
                                <label className={pageStyles.formLabel}>Status Rekening:</label>
                                <select
                                    name="status_rekening"
                                    value={formData.status_rekening}
                                    onChange={handleInputChange}
                                    required
                                    className={pageStyles.formInput}
                                >
                                    <option value="Aktif">Aktif</option>
                                    <option value="Tidak Aktif">Tidak Aktif</option>
                                </select>
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
            
            {/* === Tabel Daftar Rekening === */}
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
                                <th style={{ width: "5%" }}>No.</th>
                                <th style={{ width: "15%" }}>Kode Satker</th>
                                <th style={{ width: "20%" }}>Nama Satker</th>
                                 <th style={{ width: "15%" }}>Bank</th>
                                <th style={{ width: "20%" }}>Nomor Rekening</th>
                                 <th style={{ width: "15%" }}>Kelompok</th> 
                                <th style={{ width: "10%" }}>Status</th>
                            </tr>
                        </thead><tbody className={pageStyles.tableBody}>
                            {paginatedRekening.length > 0 ? (
                                paginatedRekening.map((rekening, index) => (
                                    <tr key={rekening.id} onClick={() => handleRowClick(rekening)} className={`${pageStyles.tableRow} ${selectedRekening?.id === rekening.id ? pageStyles.selected : ""}`}>
                                        <td>{startIndex + index + 1}</td>
                                        <td>{rekening.kode_satker}</td>
                                        <td>{rekening.nama_satker}</td>
                                         <td>{rekening.bank}</td>
                                        <td>{rekening.nomor_rekening}</td>
                                        <td>{rekening.kelompok}</td>
                                        <td>{rekening.status_rekening}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className={pageStyles.tableEmpty}>Tidak ada data rekening yang ditemukan.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* === Paginasi (Sama) === */}
            <Paginasi
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={rekeningList.length}
                itemsPerPage={rowsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleRowsPerPageChange}
            />
            
            {/* === Detail Data Rekening === */}
            <div className={pageStyles.detailContainer}>
                <div className={pageStyles.detailHeader}>Detail Data Rekening</div>
                {selectedRekening ? (
                     <div className={pageStyles.detailContent}>
                        <div className={pageStyles.detailItem}>
                            <div className={pageStyles.detailLabel}>Kode Satker</div>
                            <div className={pageStyles.detailValue}>: {selectedRekening.kode_satker}</div>
                        </div>
                        <div className={pageStyles.detailItem}>
                            <div className={pageStyles.detailLabel}>Nama Satker</div>
                            <div className={pageStyles.detailValue}>: {selectedRekening.nama_satker}</div>
                        </div>
                        <div className={pageStyles.detailItem}>
                            <div className={pageStyles.detailLabel}>Nomor Rekening</div>
                            <div className={pageStyles.detailValue}>: {selectedRekening.nomor_rekening}</div>
                        </div>
                        <div className={pageStyles.detailItem}>
                            <div className={pageStyles.detailLabel}>Nama Bank</div>
                            <div className={pageStyles.detailValue}>: {selectedRekening.bank}</div>
                        </div>
                        <div className={pageStyles.detailItem}>
                            <div className={pageStyles.detailLabel}>Atas Nama</div>
                            <div className={pageStyles.detailValue}>: {selectedRekening.nama_rekening}</div>
                        </div>
                        <div className={pageStyles.detailItem}>
                            <div className={pageStyles.detailLabel}>Kelompok</div>
                            <div className={pageStyles.detailValue}>: {selectedRekening.kelompok}</div>
                        </div>
                         <div className={pageStyles.detailItem}>
                            <div className={pageStyles.detailLabel}>Nomor Izin</div>
                            <div className={pageStyles.detailValue}>: {selectedRekening.nomor_izin || '-'}</div>
                        </div>
                        <div className={pageStyles.detailItem}>
                            <div className={pageStyles.detailLabel}>Tanggal Izin</div>
                            <div className={pageStyles.detailValue}>: {selectedRekening.tanggal_izin ? formatTanggal(selectedRekening.tanggal_izin) : '-'}</div>
                        </div>
                        <div className={pageStyles.detailItem}>
                            <div className={pageStyles.detailLabel}>Status Rekening</div>
                            <div className={pageStyles.detailValue}>: {selectedRekening.status_rekening}</div>
                        </div>
                        <div className={pageStyles.detailItem}>
                            <div className={pageStyles.detailLabel}>Kode Akun Bank</div>
                            {/* Menggunakan fungsi getNamaAkunBank (yang sudah ada) */}
                            <div className={pageStyles.detailValue}>: <strong>{getNamaAkunBank(selectedRekening.kode_akun_bank)}</strong></div>
                        </div>
                    </div>
                    // END: Perubahan
                ) : (
                    <div className={pageStyles.tableEmpty}>Pilih Rekening untuk Melihat Detail</div>
                )}
            </div>
        </div>
    );
};
export default DaftarRekening;