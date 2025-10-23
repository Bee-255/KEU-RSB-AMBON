// src/app/(main)/pendapatan/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/utils/supabaseClient";
import { FaPlus, FaEdit, FaRegTrashAlt, FaSearch, FaTimes, FaCheck } from "react-icons/fa";
import { useKeuNotification } from '@/lib/useKeuNotification';
import { useYearContext } from "@/contexts/YearContext"; 
import { formatAngka, formatTanggal } from '@/lib/format';
import styles from "@/styles/button.module.css";
import pageStyles from "@/styles/komponen.module.css";
import loadingStyles from "@/styles/loading.module.css";

// --- INTERFACE ---
interface PeriodeAktif {
  id: string;
  nama_periode: string;
  bulan: number;
}

interface Pendapatan {
  id: string;
  periode_id: string;
  tanggal: string;
  deskripsi: string;
  jumlah: number;
  nomor_bukti: string | null;
  bas_periode: {
    nama_periode: string;
  };
}

interface RekamanHarian {
  id: string;
  tanggal: string;
  status: string;
  total_transfer: number;
  total_tunai: number;
  total_tagihan: number;
  total_pasien: number;
  nama_user: string;
  total_pembayaran: number;
}

interface PasienHarianDB {
  id: string;
  nama_pasien: string;
  jenis_rawat: string;
  jumlah_bersih: number;
  bayar_transfer: number;
  bayar_tunai: number;
  rekaman_harian_id: string;
  nomor_rm?: string;
  klasifikasi?: string;
  unit_layanan?: string;
}

interface PasienHarianDetail {
  id: string;
  nama_pasien: string;
  jenis_rawat: string;
  jumlah_bersih: number;
  bayar_transfer: number;
  bayar_tunai: number;
  rekaman_harian_id: string;
  nomor_rm: string;
  klasifikasi: string;
  unit_layanan: string;
}

interface GroupedPasien {
  unit_layanan: string;
  total_jumlah: number;
  jumlah_pasien: number;
  rekaman_ids: string[];
}

// === Komponen Modal Utama ===
const Modal: React.FC<{ 
  children: React.ReactNode; 
  onClose: () => void;
  size?: 'medium' | 'large';
}> = ({ children, onClose, size = 'medium' }) => {
  const modalSize = size === 'large' 
    ? { width: '600px', maxHeight: '80vh' }
    : { width: '500px', maxHeight: '80vh' };

  return (
    <div className={pageStyles.modalOverlay} onClick={onClose}>
      <div 
        className={pageStyles.modalContent} 
        onClick={(e) => e.stopPropagation()}
        style={modalSize}
      >
        {children}
      </div>
    </div>
  );
};

// === Komponen Modal Pilihan Rekaman ===
const PilihRekamanModal: React.FC<{ 
  children: React.ReactNode; 
  onClose: () => void;
  onConfirm: () => void;
  confirmText?: string;
}> = ({ children, onClose, onConfirm, confirmText = "Pilih" }) => {
  return (
    <div 
      className={pageStyles.modalOverlay} 
      onClick={onClose}
      style={{ zIndex: 10001 }}
    >
      <div 
        className={pageStyles.modalContent} 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          width: '700px',
          maxHeight: '600px',
          zIndex: 10002,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {children}
        <div style={{
          padding: '1rem',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.5rem',
          marginTop: 'auto'
        }}>
          <button
            onClick={onClose}
            style={{
              background: '#EF4444',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <FaTimes /> Batal
          </button>
          <button
            onClick={onConfirm}
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <FaCheck /> {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- KOMPONEN UTAMA ---
const PendapatanPage = () => {
  const { selectedYear } = useYearContext();
  const { showToast, showConfirm } = useKeuNotification();
  const [pendapatanList, setPendapatanList] = useState<Pendapatan[]>([]);
  const [periodeAktifOptions, setPeriodeAktifOptions] = useState<PeriodeAktif[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [selectedPendapatan, setSelectedPendapatan] = useState<Pendapatan | null>(null);

  // State form
  const [formId, setFormId] = useState<string | null>(null);
  const [periodeId, setPeriodeId] = useState<string>("");
  const [tanggal, setTanggal] = useState<string>("");
  const [deskripsi, setDeskripsi] = useState<string>("");
  const [jumlah, setJumlah] = useState<string>("");
  const [nomorBukti, setNomorBukti] = useState<string>("");

  // State untuk fitur pencarian rekaman
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showPilihRekamanModal, setShowPilihRekamanModal] = useState<boolean>(false);
  const [groupedPasien, setGroupedPasien] = useState<GroupedPasien[]>([]);
  const [selectedUnits, setSelectedUnits] = useState<GroupedPasien[]>([]);

  // State untuk tidak bisa edit data dari loop rekaman
  const [isDataFromPopup, setIsDataFromPopup] = useState<boolean>(false);

  // Fungsi generate nomor bukti otomatis
  const generateNomorBukti = useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const time = now.getTime().toString().slice(-4);
    
    return `BUKTI/${year}${month}${day}/${time}`;
  }, []);

  // --- FETCHING DATA ---
  async function fetchPeriodeAktif(year: number | null) {
    if (!year) {
      setPeriodeAktifOptions([]);
      return;
    }

    const { data, error } = await supabase
      .from("bas_periode")
      .select("id, nama_periode, bulan")
      .is("status_tutup_buku", false)
      .eq("tahun", year)
      .order("bulan", { ascending: true });

    if (error) {
      console.error("Error fetch periode:", error);
      showToast("Gagal memuat periode", "error");
    } else {
      setPeriodeAktifOptions(data || []);
    }
  }

  const fetchPendapatan = async (year: number | null) => {
    if (!year) {
      setPendapatanList([]);
      return;
    }

    const { data: periodeData } = await supabase
      .from("bas_periode")
      .select("id")
      .eq("tahun", year);

    if (!periodeData || periodeData.length === 0) {
      setPendapatanList([]);
      return;
    }

    const periodeIds = periodeData.map((p) => p.id);

    const { data, error } = await supabase
      .from("bas_pendapatan")
      .select(`*, bas_periode (nama_periode)`)
      .in("periode_id", periodeIds)
      .order("tanggal", { ascending: false });

    if (error) {
      console.error("Error fetch pendapatan:", error);
      showToast("Gagal mengambil data pendapatan", "error");
    } else {
      setPendapatanList(data || []);
    }
  };

  // --- FUNGSI UNTUK MENGAMBIL DAN GROUPING DATA PASIEN ---
  const fetchAndGroupPasienData = async (tanggalCari: string) => {
    if (!tanggalCari) return;

    setIsSearching(true);
    setGroupedPasien([]);
    setSelectedUnits([]);
    
    try {
      console.log('🔍 Mencari rekaman harian untuk tanggal:', tanggalCari);
      
      // 1. Ambil rekaman_harian dengan status BANK
      let { data: rekamanData, error: rekamanError } = await supabase
        .from('rekaman_harian')
        .select('id')
        .eq('tanggal', tanggalCari)
        .eq('status', 'BANK');

      if (rekamanError) {
        console.error('❌ Error fetch rekaman:', rekamanError);
        showToast('Gagal mengambil data rekaman harian', 'error');
        return;
      }

      if (!rekamanData || rekamanData.length === 0) {
        showToast('Tidak ditemukan data rekaman dengan status BANK untuk tanggal tersebut', 'warning');
        return;
      }

      const rekamanIds = rekamanData.map(item => item.id);

      // 2. Ambil data pasien_harian
      const { data: pasienData, error: pasienError } = await supabase
        .from('pasien_harian')
        .select('*')
        .in('rekaman_harian_id', rekamanIds);

      if (pasienError) {
        console.error('Error fetching pasien_harian:', pasienError);
        showToast('Gagal mengambil data pasien', 'error');
        return;
      }

      // 3. Ambil SEMUA data pendapatan untuk tanggal ini
      const { data: existingPendapatan, error: pendapatanError } = await supabase
        .from('bas_pendapatan')
        .select('id, deskripsi, jumlah, tanggal')
        .eq('tanggal', tanggalCari);

      if (pendapatanError) {
        console.error('Error fetching existing pendapatan:', pendapatanError);
        // Lanjut saja tanpa filter
      }

      // 4. BUAT FILTER YANG LEBIH AKURAT - berdasarkan kombinasi data
      const processedUnits = new Set<string>();
      
      // Analisis data pasien untuk buat mapping unit -> total
      const unitTotals: { [key: string]: number } = {};
      (pasienData || []).forEach(pasien => {
        const unit = pasien.unit_layanan || 'TANPA UNIT';
        unitTotals[unit] = (unitTotals[unit] || 0) + (pasien.jumlah_bersih || 0);
      });

      console.log('📊 Unit totals:', unitTotals);
      console.log('📋 Existing pendapatan:', existingPendapatan);

      // Cek setiap pendapatan yang sudah ada
      existingPendapatan?.forEach(pendapatan => {
        // Cari unit yang match berdasarkan jumlah + pattern deskripsi
        Object.keys(unitTotals).forEach(unit => {
          const unitTotal = unitTotals[unit];
          // Jika jumlah sama (dengan tolerance kecil) dan deskripsi mengandung kata kunci
          const amountMatch = Math.abs(pendapatan.jumlah - unitTotal) < 100; // Tolerance Rp 100
          const descriptionMatch = pendapatan.deskripsi.toLowerCase().includes(unit.toLowerCase()) ||
                                 pendapatan.deskripsi.toLowerCase().includes('setoran');
          
          if (amountMatch && descriptionMatch) {
            console.log(`✅ Unit ${unit} sudah diproses: ${pendapatan.deskripsi}`);
            processedUnits.add(unit);
          }
        });
      });

      console.log('🚫 Processed units:', Array.from(processedUnits));

      // 5. Filter pasienData - hanya yang unitnya belum diproses
      const filteredPasienData = (pasienData || []).filter(pasien => {
        const unit = pasien.unit_layanan || 'TANPA UNIT';
        return !processedUnits.has(unit);
      });

      if (filteredPasienData.length === 0) {
        showToast('Semua unit layanan untuk tanggal ini sudah diproses', 'info');
        return;
      }

      // 6. Group data by unit_layanan
      const grouped = filteredPasienData.reduce((acc: { [key: string]: GroupedPasien }, pasien) => {
        const unit = pasien.unit_layanan || 'TANPA UNIT';
        if (!acc[unit]) {
          acc[unit] = {
            unit_layanan: unit,
            total_jumlah: 0,
            jumlah_pasien: 0,
            rekaman_ids: []
          };
        }
        acc[unit].total_jumlah += pasien.jumlah_bersih || 0;
        acc[unit].jumlah_pasien += 1;
        
        if (!acc[unit].rekaman_ids.includes(pasien.rekaman_harian_id)) {
          acc[unit].rekaman_ids.push(pasien.rekaman_harian_id);
        }
        
        return acc;
      }, {} as { [key: string]: GroupedPasien });

      const result: GroupedPasien[] = Object.values(grouped);
      setGroupedPasien(result);
      
      if (result.length > 0) {
        setShowPilihRekamanModal(true);
        showToast(`Ditemukan ${result.length} unit layanan untuk tanggal ${formatTanggal(tanggalCari)}`, 'info');
      } else {
        showToast('Tidak ditemukan data unit layanan baru untuk diproses', 'info');
      }

    } catch (error: any) {
      console.error('💥 Error in fetchAndGroupPasienData:', error);
      showToast('Terjadi kesalahan saat mengambil data rekaman', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  // --- FUNGSI UNTUK MEMILIH UNIT ---
  const handlePilihUnit = (unit: GroupedPasien) => {
    setSelectedUnits(prev => {
      const isSelected = prev.find(u => u.unit_layanan === unit.unit_layanan);
      if (isSelected) {
        return prev.filter(u => u.unit_layanan !== unit.unit_layanan);
      } else {
        // Hanya boleh pilih satu unit
        return [unit];
      }
    });
  };

  // --- FUNGSI KONFIRMASI PEMILIHAN UNIT ---
  const handleKonfirmasiPilihUnit = () => {
    if (selectedUnits.length === 0) {
      showToast('Pilih satu unit layanan', 'warning');
      return;
    }

    const selectedUnit = selectedUnits[0];
    const deskripsiBaru = `Terima dari Kasir Setoran ${selectedUnit.unit_layanan} tanggal ${formatTanggal(tanggal)}`;
    
    setDeskripsi(deskripsiBaru);
    setJumlah(selectedUnit.total_jumlah.toString());
    setIsDataFromPopup(true);
    
    // Generate nomor bukti baru
    setNomorBukti(generateNomorBukti());
    
    setShowPilihRekamanModal(false);
    showToast(`Berhasil memilih unit ${selectedUnit.unit_layanan}`, 'success');
  };

  // --- HANDLERS ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!periodeId || !tanggal || !deskripsi || !jumlah) {
      showToast("Harap lengkapi semua field yang wajib", "warning");
      return;
    }

    const jumlahNumber = parseFloat(jumlah.replace(/\./g, ''));
    if (jumlahNumber <= 0 || isNaN(jumlahNumber)) {
      showToast("Jumlah pendapatan harus lebih dari nol", "warning");
      return;
    }

    setIsLoading(true);

    const dataToSubmit = {
      periode_id: periodeId,
      tanggal: tanggal,
      deskripsi: deskripsi.trim(),
      jumlah: jumlahNumber,
      nomor_bukti: nomorBukti.trim() || null,
    };

    try {
      if (isEdit && formId) {
        const { error } = await supabase
          .from("bas_pendapatan")
          .update(dataToSubmit)
          .eq("id", formId);
        if (error) throw error;
        showToast("Data berhasil diubah", "success");
      } else {
        const { error } = await supabase
          .from("bas_pendapatan")
          .insert(dataToSubmit);
        if (error) throw error;
        showToast("Data pendapatan berhasil disimpan", "success");

        console.log('Data pendapatan disimpan tanpa mengubah status rekaman_harian');
      }

      await fetchPendapatan(selectedYear);
      handleCloseModal();
    } catch (error: any) {
      console.error("Error saving data:", error);
      showToast(`Gagal menyimpan data: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    if (!selectedPendapatan) return;
    
    setFormId(selectedPendapatan.id);
    setPeriodeId(selectedPendapatan.periode_id);
    setTanggal(selectedPendapatan.tanggal);
    setDeskripsi(selectedPendapatan.deskripsi);
    setJumlah(selectedPendapatan.jumlah.toString());
    setNomorBukti(selectedPendapatan.nomor_bukti || '');
    setIsEdit(true);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!selectedPendapatan) return;

    const isConfirmed = await showConfirm({
      title: "Hapus Data?",
      message: "Anda yakin ingin menghapus data pendapatan ini?",
      confirmText: "Ya, Hapus",
    });

    if (!isConfirmed) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("bas_pendapatan")
        .delete()
        .eq("id", selectedPendapatan.id);
      if (error) throw error;

      showToast("Data berhasil dihapus", "success");
      await fetchPendapatan(selectedYear);
      setSelectedPendapatan(null);
    } catch (error: any) {
      console.error("Error deleting data:", error);
      showToast(`Gagal menghapus: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = () => {
    setFormId(null);
    setPeriodeId("");
    setTanggal("");
    setDeskripsi("");
    setJumlah("");
    setNomorBukti(generateNomorBukti());
    setIsEdit(false);
    setShowPilihRekamanModal(false);
    setGroupedPasien([]);
    setSelectedUnits([]);
    setIsDataFromPopup(false);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    if (!isEdit) {
      setIsDataFromPopup(false);
    }
  };

  const handleClosePilihRekamanModal = () => {
    setShowPilihRekamanModal(false);
  };

  const handleRowClick = (pendapatan: Pendapatan) => {
    if (selectedPendapatan?.id === pendapatan.id) {
      setSelectedPendapatan(null);
    } else {
      setSelectedPendapatan(pendapatan);
    }
  };

  const handleJumlahChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\./g, '');
    if (/^\d*$/.test(value)) {
      setJumlah(value);
    }
  };

  const handleTanggalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTanggal = e.target.value;
    setTanggal(newTanggal);
  };

  const handleSearchClick = () => {
    if (tanggal && !isEdit) {
      fetchAndGroupPasienData(tanggal);
    }
  };

  useEffect(() => {
    if (selectedYear) {
      setIsLoading(true);
      Promise.all([fetchPeriodeAktif(selectedYear), fetchPendapatan(selectedYear)])
        .finally(() => setIsLoading(false));
    } else {
      setPendapatanList([]);
      setPeriodeAktifOptions([]);
    }
  }, [selectedYear]);

  const isActionDisabled = !selectedPendapatan;
  const displayJumlah = jumlah ? formatAngka(parseFloat(jumlah.replace(/\./g, '')) || 0) : '';

  return (
    <div className={pageStyles.container}>
      <h2 className={pageStyles.header}>Pencatatan Pendapatan (Tahun {selectedYear})</h2>
      
      {/* Tombol Aksi */}
      <div className={pageStyles.buttonContainer}>
        <button
          onClick={handleOpenModal}
          disabled={periodeAktifOptions.length === 0}
          className={periodeAktifOptions.length === 0 ? styles.buttonDisabled : styles.rekamButton}
        >
          <FaPlus /> Tambah Pendapatan
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

        {periodeAktifOptions.length === 0 && selectedYear && (
          <span style={{ 
            color: '#dc2626', 
            margin: '0 0 0 12px', 
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center'
          }}>
            ⚠️ Tidak ada periode TERBUKA yang tersedia untuk Tahun {selectedYear}
          </span>
        )}
      </div>

      {/* Modal Pilih Unit Layanan */}
      {showPilihRekamanModal && groupedPasien.length > 0 && (
        <PilihRekamanModal 
          onClose={handleClosePilihRekamanModal}
          onConfirm={handleKonfirmasiPilihUnit}
          confirmText="Pilih"
        >
          <div style={{ 
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header Modal */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1rem',
              paddingBottom: '0.5rem',
              borderBottom: '2px solid #e5e7eb',
              flexShrink: 0
            }}>
              <h3 style={{ 
                margin: 0, 
                color: '#1f2937',
                fontSize: '1.2rem',
                fontWeight: 'bold'
              }}>
                Pilih Unit Layanan - {formatTanggal(tanggal)}
              </h3>
            </div>
            
            {/* Tabel Unit Layanan */}
            <table className={pageStyles.table}>
              <thead className={pageStyles.tableHead}>
                <tr>
                  <th style={{ width: "10%", textAlign: "center" }}>Pilih</th>
                  <th style={{ width: "45%" }}>Unit Layanan</th>
                  <th style={{ width: "20%", textAlign: 'center' }}>Jumlah Pasien</th>
                  <th style={{ width: "25%", textAlign: 'right' }}>Total Jumlah</th>
                </tr>
              </thead>
              <tbody className={pageStyles.tableBody}>
                {groupedPasien.map((unit, index) => {
                  const isSelected = selectedUnits.find(u => u.unit_layanan === unit.unit_layanan);
                  return (
                    <tr 
                      key={unit.unit_layanan}
                      className={`${pageStyles.tableRow} ${isSelected ? pageStyles.selected : ""}`}
                      onClick={() => handlePilihUnit(unit)}
                    >
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={!!isSelected}
                          onChange={() => handlePilihUnit(unit)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '16px',
                            height: '16px',
                            cursor: 'pointer'
                          }}
                        />
                      </td>
                      <td>{unit.unit_layanan}</td>
                      <td style={{ textAlign: 'center' }}>{unit.jumlah_pasien}</td>
                      <td style={{ textAlign: 'right' }}>
                        {formatAngka(unit.total_jumlah)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PilihRekamanModal>
      )}

      {/* Modal Input Form Pendapatan */}
      {showModal && (
        <Modal onClose={handleCloseModal}>
          <form onSubmit={handleSubmit}>
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>
              {isEdit ? "Ubah" : "Tambah"} Pendapatan
            </h3>
            <hr style={{ 
              border: "0", 
              height: "1px", 
              backgroundColor: "#e5e7eb", 
              margin: "1rem 0 1.5rem 0" 
            }} />
            
            <div className={pageStyles.modalForm}>

              {/* Nomor Bukti */}
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Nomor Bukti</label>
                <input
                  type="text"
                  value={nomorBukti}
                  onChange={(e) => setNomorBukti(e.target.value)}
                  className={pageStyles.formInput}
                  placeholder="Nomor bukti otomatis"
                />
              </div>

              {/* Periode */}
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Periode *</label>
                <select
                  value={periodeId}
                  onChange={(e) => {
                    setPeriodeId(e.target.value);
                    setIsDataFromPopup(false);
                  }}
                  required
                  disabled={isEdit || isDataFromPopup}
                  className={pageStyles.formInput}
                  style={isEdit || isDataFromPopup ? { 
                    backgroundColor: '#f3f4f6', 
                    cursor: 'not-allowed' 
                  } : {}}
                >
                  <option value="">-- Pilih Periode --</option>
                  {periodeAktifOptions.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nama_periode} 
                    </option>
                  ))}
                </select>
              </div>

              {/* Tanggal */}
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Tanggal *</label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => {
                    setTanggal(e.target.value);
                    setIsDataFromPopup(false);
                  }}
                  required
                  className={pageStyles.formInput}
                  style={{ 
                    backgroundColor: isDataFromPopup ? '#f3f4f6' : 'white',
                    cursor: isDataFromPopup ? 'not-allowed' : 'text'
                  }}
                  disabled={isEdit || isDataFromPopup}
                />
              </div>

              {/* Tombol Cari */}
              <div style={{}}>
                <button
                  type="button"
                  onClick={handleSearchClick}
                  disabled={!tanggal || isEdit || isDataFromPopup || isSearching}
                  className={`${styles.rekamButton} ${pageStyles.actionButton}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    opacity: (!tanggal || isEdit || isDataFromPopup) ? 0.6 : 1,
                    cursor: (!tanggal || isEdit || isDataFromPopup) ? 'not-allowed' : 'pointer'
                  }}
                  >
                  {isSearching ? (
  <>
    <FaSearch />
    Cari
    <div className={loadingStyles.dotContainer} style={{ marginLeft: '4px' }}>
      <div className={`${loadingStyles.dot} ${loadingStyles['dot-1']}`} />
      <div className={`${loadingStyles.dot} ${loadingStyles['dot-2']}`} />
      <div className={`${loadingStyles.dot} ${loadingStyles['dot-3']}`} />
    </div>
  </>
) : (
  <>
    <FaSearch />
    Cari
  </>
)}
                </button>
              </div>

              {/* Deskripsi */}
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Deskripsi *</label>
                <textarea
                  value={deskripsi}
                  onChange={(e) => {
                    setDeskripsi(e.target.value);
                    setIsDataFromPopup(false);
                  }}
                  required
                  className={pageStyles.formInput}
                  style={{ 
                    minHeight: '80px', 
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    backgroundColor: isDataFromPopup ? '#f3f4f6' : 'white',
                    cursor: isDataFromPopup ? 'not-allowed' : 'text'
                  }}
                  placeholder="Masukkan deskripsi pendapatan..."
                  disabled={isDataFromPopup}
                />
              </div>
              
              {/* Jumlah */}
              <div className={pageStyles.formGroup}>
                <label className={pageStyles.formLabel}>Jumlah (Rp) *</label>
                <input
                  type="text"
                  value={displayJumlah}
                  onChange={(e) => {
                    handleJumlahChange(e);
                    setIsDataFromPopup(false);
                  }}
                  required
                  placeholder="0"
                  className={pageStyles.formInput}
                  style={{ 
                    textAlign: 'right',
                    backgroundColor: isDataFromPopup ? '#f3f4f6' : 'white',
                    cursor: isDataFromPopup ? 'not-allowed' : 'text'
                  }}
                  disabled={isDataFromPopup}
                />
              </div>
              
            </div>

            <div className={pageStyles.formActions}>
              <button 
                type="button" 
                onClick={handleCloseModal} 
                className={pageStyles.formCancel}
                disabled={isLoading}
              >
                Batal
              </button>
              <button 
                type="submit" 
                className={styles.rekamButton}
                disabled={isLoading}
              >
                {isLoading ? "Menyimpan..." : (isEdit ? "Ubah" : "Simpan")}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Tabel Data Pendapatan */}
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
                <th style={{ width: "3%", textAlign: "center" }}>No.</th>
                <th style={{ width: "10%" }}>Nomor Bukti</th>
                <th style={{ width: "10%" }}>Periode</th>
                <th style={{ width: "10%" }}>Tanggal</th>
                <th style={{ width: "40%" }}>Deskripsi</th>
                <th style={{ width: "20%", textAlign: "right", paddingRight: "10rem"}}>Jumlah</th>
              </tr>
            </thead>
            <tbody className={pageStyles.tableBody}>
              {pendapatanList.length > 0 ? (
                pendapatanList.map((item, index) => (
                  <tr 
                    key={item.id} 
                    onClick={() => handleRowClick(item)} 
                    className={`${pageStyles.tableRow} ${selectedPendapatan?.id === item.id ? pageStyles.selected : ""}`}
                  >
                    <td style={{ textAlign: "center" }}>{index + 1}</td>
                    <td>{item.nomor_bukti || '-'}</td>
                    <td>{item.bas_periode?.nama_periode}</td> 
                    <td>{formatTanggal(item.tanggal)}</td>
                    <td>{item.deskripsi}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', paddingRight: "10rem" }}>
                      {formatAngka(item.jumlah)}
                    </td>
                    
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className={pageStyles.tableEmpty}>
                    {isLoading ? "Memuat data..." : `Belum ada data pendapatan untuk Tahun ${selectedYear}`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Section */}
      <div className={pageStyles.detailContainerSPPR}>
        <div className={pageStyles.detailHeaderSPPR}>Detail Data Pendapatan</div>
        {selectedPendapatan ? (
          <div className={pageStyles.detailContentSPPR}>
            <div className={pageStyles.detailItemSPPR}>
              <div className={pageStyles.detailLabelSPPR}>Nomor Bukti</div>
              <div className={pageStyles.detailValueSPPR}>: {selectedPendapatan.nomor_bukti || '-'}</div>
            </div>
            <div className={pageStyles.detailItemSPPR}>
              <div className={pageStyles.detailLabelSPPR}>Periode</div>
              <div className={pageStyles.detailValueSPPR}>: {selectedPendapatan.bas_periode?.nama_periode}</div>
            </div>
            <div className={pageStyles.detailItemSPPR}>
              <div className={pageStyles.detailLabelSPPR}>Tanggal</div>
              <div className={pageStyles.detailValueSPPR}>: {formatTanggal(selectedPendapatan.tanggal)}</div>
            </div>
            <div className={pageStyles.detailItemSPPR}>
              <div className={pageStyles.detailLabelSPPR}>Deskripsi</div>
              <div className={pageStyles.detailValueSPPR}>: {selectedPendapatan.deskripsi}</div>
            </div>
            <div className={pageStyles.detailItemSPPR}>
              <div className={pageStyles.detailLabelSPPR}>Jumlah</div>
              <div className={pageStyles.detailValueSPPR}>: Rp {formatAngka(selectedPendapatan.jumlah)}</div>
            </div>
            
          </div>
        ) : (
          <div className={pageStyles.tableEmpty}>Pilih data pendapatan untuk melihat detail</div>
        )}
      </div>
    </div>
  );
};

export default PendapatanPage;