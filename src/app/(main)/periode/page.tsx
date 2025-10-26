"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/utils/supabaseClient";
import { FaPlus, FaLock, FaUnlock } from "react-icons/fa"; // FaPencilAlt tidak diperlukan lagi

// ✅ Import Hook Notifikasi yang Diminta
import { useKeuNotification } from '@/lib/useKeuNotification';

// ✅ Impor file CSS Modules
import styles from "@/styles/button.module.css";
import pageStyles from "@/styles/komponen.module.css";
import loadingStyles from "@/styles/loading.module.css";

// --- INTERFACE (FINAL SKEMA) ---
interface Periode {
  id: string; 
  tahun: number;
  bulan: number;
  nama_periode: string; // Format YYYY-MM dari DB
  nama_bulan_display?: string; // ✅ Kolom tambahan untuk nama bulan (e.g. "Januari 2025")
  status_tutup_buku: boolean; 
  created_at: string;
}

interface FormData {
  tahun: number | null;
}

// --- UTILITY FUNCTIONS ---
const formatTanggal = (dateString: string) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Fungsi untuk mendapatkan nama bulan yang mudah dibaca (e.g., "Januari 2025")
const getBulanNamaDisplay = (periode: Periode) => {
    // Jika kolom nama_bulan_display dari DB tersedia, gunakan itu
    if (periode.nama_bulan_display) return periode.nama_bulan_display; 
    
    // Fallback jika DB belum punya kolom ini (sebelum di-update)
    try {
        const date = new Date(periode.tahun, periode.bulan - 1, 1); 
        return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    } catch (e) {
        return `${periode.nama_periode}`; 
    }
};


// --- KOMPONEN UTAMA ---
const PeriodePage = () => {
  const { showToast, showConfirm } = useKeuNotification(); 
  const [periodeList, setPeriodeList] = useState<Periode[]>([]);
  const [selectedPeriode, setSelectedPeriode] = useState<Periode | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [tahunOptions, setTahunOptions] = useState<number[]>([]); // State untuk opsi filter tahun
  
  // Ambil tahun saat ini sebagai default filter
  const currentYear = new Date().getFullYear();
  const [filterTahun, setFilterTahun] = useState<number>(currentYear); 
  
  const [formData, setFormData] = useState<FormData>({
    tahun: currentYear,
  });

  // Ambil role pengguna
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

  // Ambil data periode
  const fetchPeriode = async (tahun: number) => {
    setIsLoading(true);
    
    const query = supabase
      .from("bas_periode")
      // ✅ Menambahkan nama_bulan_display
      .select("id, tahun, bulan, nama_periode, nama_bulan_display, status_tutup_buku, created_at") 
      .eq('tahun', tahun) // ✅ Filter berdasarkan tahun
      .order("tahun", { ascending: false })
      .order("bulan", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Gagal mengambil data periode:", error);
      showToast("Gagal mengambil data periode. Periksa koneksi atau skema tabel.", "error"); 
    } else {
      setPeriodeList(data as Periode[]);
      if (selectedPeriode) {
        const updatedSelected = data.find(p => p.id === selectedPeriode.id);
        setSelectedPeriode(updatedSelected as Periode || null);
      }
    }
    setIsLoading(false);
  };
  
  // Ambil daftar tahun unik untuk opsi filter
  const fetchTahunOptions = async () => {
    // Ambil semua tahun unik yang ada di tabel
    const { data, error } = await supabase
      .from("bas_periode")
      .select('tahun')
      .order('tahun', { ascending: false });

    if (error) {
      console.error("Gagal mengambil opsi tahun:", error);
    } else if (data) {
      // Ambil nilai unik dan urutkan
      const uniqueTahun = Array.from(new Set(data.map(item => item.tahun))).sort((a, b) => b - a);
      setTahunOptions(uniqueTahun);
      
      // Jika filterTahun belum diatur atau tidak ada dalam daftar, atur ke tahun terbaru
      if (!uniqueTahun.includes(filterTahun) && uniqueTahun.length > 0) {
        setFilterTahun(uniqueTahun[0]);
        return uniqueTahun[0]; // Kembalikan tahun baru yang dipilih
      }
    }
    return filterTahun; // Kembalikan tahun yang sudah diatur
  };
  
  // Effect untuk inisialisasi dan filter
  useEffect(() => {
    getLoggedInUserRole();
    // Panggil fetchTahunOptions terlebih dahulu untuk mendapatkan tahun default/terbaru
    fetchTahunOptions().then(tahun => {
      fetchPeriode(tahun);
    });
  }, []); // Hanya berjalan saat mount

  // Effect untuk refresh data saat filterTahun berubah
  useEffect(() => {
      if (filterTahun) {
          fetchPeriode(filterTahun);
      }
  }, [filterTahun]); // Berjalan saat filterTahun berubah


  const handleRowClick = (periode: Periode) => {
    setSelectedPeriode(prev => (prev?.id === periode.id ? null : periode));
  };

  const isAllowedToManage = useMemo(() => userRole === "Owner" || userRole === "Admin", [userRole]);

  // 1. Fungsi RPC: Buat 12 Periode Bulanan
  const handleCreatePeriode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tahun || !isAllowedToManage) return;

    const isConfirmed = await showConfirm({
        title: "Buat Periode Baru?",
        message: `Anda akan membuat 12 periode bulanan baru untuk Tahun ${formData.tahun}. Lanjutkan?`,
        confirmText: "Ya, Buat",
    });

    if (!isConfirmed) return;
    
    setIsLoading(true);
    
    const { error } = await supabase.rpc('buat_periode_bulanan', {
      p_tahun: formData.tahun
    });

    if (error) {
      const errorMessage = error.message || 'Terjadi kesalahan tidak terduga saat memanggil fungsi database.';

      if (errorMessage.includes('sudah ada') || errorMessage.includes('duplicate key')) {
         showToast(`Gagal! Periode tahun ${formData.tahun} sudah ada.`, "warning"); 
      } else {
        showToast(`Gagal membuat periode: ${errorMessage}`, "error"); 
        console.error("Error creating period:", JSON.stringify(error, null, 2));
      }
    } else {
      showToast(`Berhasil! 12 periode tahun ${formData.tahun} berhasil dibuat.`, "success"); 
      // Refresh data dan opsi tahun
      fetchTahunOptions().then(tahun => {
          setFilterTahun(tahun); // Pindah ke tahun yang baru dibuat
          fetchPeriode(tahun);
      });
    }
    
    setShowModal(false);
    setFormData({ tahun: currentYear });
    setIsLoading(false);
  };

  // 2. Fungsi: Tutup/Buka Periode (Dipanggil dari Tombol Aksi Global)
  const handleToggleStatus = async (periodeToToggle: Periode | null) => {
    if (!isAllowedToManage || !periodeToToggle) {
        showToast("Pilih satu periode yang akan dikelola.", "info");
        return;
    }
    
    const newStatus = !periodeToToggle.status_tutup_buku;
    const action = newStatus ? "Tutup Buku" : "Buka Kunci";
    const periodName = getBulanNamaDisplay(periodeToToggle);

    const isConfirmed = await showConfirm({
      title: `Konfirmasi ${action}`,
      message: `Yakin ingin ${action.toLowerCase()} periode ${periodName}? Data transaksi akan ${newStatus ? 'terkunci.' : 'dibuka.'}`,
      confirmText: `Ya, ${action}!`,
    });

    if (isConfirmed) {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('bas_periode')
        .update({ status_tutup_buku: newStatus, updated_at: new Date().toISOString() })
        .eq('id', periodeToToggle.id);

      if (error) {
        showToast(`Gagal ${action.toLowerCase()} periode: ${error.message}`, "error"); 
        console.error(`Error ${action.toLowerCase()} periode:`, error);
      } else {
        showToast(`Periode ${periodName} berhasil di${action.toLowerCase()}.`, "success"); 
        fetchPeriode(filterTahun); // Refresh data pada tahun yang sama
      }
      setIsLoading(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setFormData({ tahun: isNaN(value) ? null : value });
  };
  
  const Modal: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({ children, onClose }) => {
      return (
          <div className={pageStyles.modalOverlay} onClick={onClose}>
              <div className={pageStyles.modalContent} onClick={(e) => e.stopPropagation()}>
                  {children}
              </div>
          </div>
      );
  };


  return (
    <div className={pageStyles.container}>
      <h2 className={pageStyles.header}>Pengelolaan Periode Pencatatan (Bulanan)</h2>
      
      {/* Tombol Aksi Global & Filter */}
      <div className={pageStyles.buttonContainer} style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Tombol Buat Periode */}
            <button
              onClick={() => setShowModal(true)}
              disabled={!isAllowedToManage}
              className={styles.rekamButton}
            >
              <FaPlus /> Buat Periode Tahun Baru
            </button>
  
            {/* Tombol Aksi Buka/Tutup */}
            <button
                onClick={() => handleToggleStatus(selectedPeriode)}
                // Hanya disable jika tidak ada yang dipilih ATAU tidak diizinkan mengelola
                disabled={!selectedPeriode || !isAllowedToManage}
                className={selectedPeriode && !selectedPeriode.status_tutup_buku ? styles.hapusButton : styles.editButton}
                title={selectedPeriode ? (!selectedPeriode.status_tutup_buku ? "Tutup Buku Periode Terpilih" : "Buka Kunci Periode Terpilih") : "Pilih periode"}
            >
                {selectedPeriode && !selectedPeriode.status_tutup_buku ? <FaLock /> : <FaUnlock />} 
                {selectedPeriode ? (selectedPeriode.status_tutup_buku ? " Buka Kunci" : " Tutup Buku") : " Pilih Aksi"}
            </button>
          </div>
          
          {/* Filter Tahun */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label className={pageStyles.formLabel} style={{ marginBottom: 0 }}>Filter Tahun:</label>
              <select
                  value={filterTahun}
                  onChange={(e) => setFilterTahun(parseInt(e.target.value))}
                  className={pageStyles.formInput}
                  style={{ width: '120px' }}
              >
                  {tahunOptions.map(tahun => (
                      <option key={tahun} value={tahun}>
                          {tahun}
                      </option>
                  ))}
              </select>
          </div>
      </div>

      {/* Modal Input Tahun */}
      {showModal && (
          <Modal onClose={() => setShowModal(false)}>
              <form onSubmit={handleCreatePeriode}>
                  <h3 style={{ marginTop: 0 }}>Buat 12 Periode Bulanan Baru</h3>
                  <div className={pageStyles.modalForm}>
                      <div className={pageStyles.formGroup}>
                          <label className={pageStyles.formLabel}>Tahun (YYYY):</label>
                          <input
                              type="number"
                              name="tahun"
                              value={formData.tahun || ''}
                              onChange={handleInputChange}
                              required
                              min={2000}
                              max={2100}
                              className={pageStyles.formInput}
                          />
                      </div>
                  </div>
                  <div className={pageStyles.formActions}>
                      <button type="button" onClick={() => setShowModal(false)} className={pageStyles.formCancel}>
                          Batal
                      </button>
                      <button type="submit" className={styles.rekamButton} disabled={!formData.tahun || isLoading}>
                          Buat Periode
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
              {/* ✅ PERBAIKAN HYDRATION ERROR: Menghilangkan spasi antar tag <th> */}
              <tr>
                <th style={{ width: "5%", textAlign: "center" }}>No.</th><th style={{ width: "10%" }}>Tahun</th><th style={{ width: "20%" }}>ID Periode (YYYY-MM)</th><th style={{ width: "30%" }}>Nama Bulan</th><th style={{ width: "20%", textAlign: "center" }}>Status</th>
              </tr>
            </thead>
            <tbody className={pageStyles.tableBody}>
              {periodeList.length > 0 ? (
                periodeList.map((periode, index) => (
                  <tr
                    key={periode.id}
                    onClick={() => handleRowClick(periode)}
                    // ✅ PERBAIKAN HYDRATION ERROR: Menghilangkan spasi pada kode map/ternary
                    className={`${pageStyles.tableRow} ${selectedPeriode?.id === periode.id ? pageStyles.selected : ""}`}
                  ><td style={{ textAlign: "center" }}>{index + 1}</td><td>{periode.tahun}</td><td>{periode.nama_periode}</td><td>{getBulanNamaDisplay(periode)}</td><td style={{ textAlign: "center", fontWeight: 'bold', color: !periode.status_tutup_buku ? '#22c55e' : '#dc2626' }}>{!periode.status_tutup_buku ? "TERBUKA" : "TUTUP"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className={pageStyles.tableEmpty}>
                    {isLoading ? "" : "Tidak ada data periode yang ditemukan. Silakan buat periode baru atau ubah filter tahun."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Data Periode yang Dipilih */}
      <div className={pageStyles.detailContainer}>
        <div className={pageStyles.detailHeader}>Detail Periode</div>
        {selectedPeriode ? (
          <div className={pageStyles.detailContent}>
            <div className={pageStyles.detailItem}>
              <div className={pageStyles.detailLabel}>ID Periode</div>
              <div className={pageStyles.detailValue}>: {selectedPeriode.nama_periode}</div>
            </div>
            <div className={pageStyles.detailItem}>
              <div className={pageStyles.detailLabel}>Nama Bulan</div>
              <div className={pageStyles.detailValue}>: {getBulanNamaDisplay(selectedPeriode)}</div>
            </div>
            <div className={pageStyles.detailItem}>
              <div className={pageStyles.detailLabel}>Tahun/Bulan</div>
              <div className={pageStyles.detailValue}>: {selectedPeriode.tahun}/{selectedPeriode.bulan}</div>
            </div>
            <div className={pageStyles.detailItem}>
              <div className={pageStyles.detailLabel}>Status Kunci</div>
              <div className={pageStyles.detailValue} style={{ fontWeight: 'bold', color: !selectedPeriode.status_tutup_buku ? '#22c55e' : '#dc2626' }}>: {!selectedPeriode.status_tutup_buku ? "TERBUKA" : "TUTUP"}</div>
            </div>
            <div className={pageStyles.detailItem}>
              <div className={pageStyles.detailLabel}>Dibuat Pada</div>
              <div className={pageStyles.detailValue}>: {formatTanggal(selectedPeriode.created_at)}</div>
            </div>
          </div>
        ) : (
          <div className={pageStyles.tableEmpty}>Periode Belum Dipilih</div>
        )}
      </div>
    </div>
  );
};

export default PeriodePage;