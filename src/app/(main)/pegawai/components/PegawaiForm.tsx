import React from 'react';
import { FormPegawaiData } from '../types';
import { allPangkatPolri, allPangkatAsn } from '../constants';
import styles from "@/styles/button.module.css";
import pageStyles from "@/styles/komponen.module.css";

interface PegawaiFormProps {
  pegawai: FormPegawaiData;
  editId: string | null;
  pangkatOptions: string[];
  golonganOptions: string[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

const PegawaiForm: React.FC<PegawaiFormProps> = ({
  pegawai,
  editId,
  pangkatOptions,
  golonganOptions,
  onClose,
  onSubmit,
  onChange
}) => {
  return (
    <form onSubmit={onSubmit}>
      <h3 style={{ marginTop: 0 }}>{editId ? "Edit Data Pegawai" : "Rekam Pegawai Baru"}</h3>

      <div className={pageStyles.modalForm}>
        <div className={pageStyles.formGroup}>
          <label className={pageStyles.formLabel}>Nama:</label>
          <input
            type="text"
            name="nama"
            value={pegawai.nama}
            onChange={onChange}
            required
            className={pageStyles.formInput}
          />
        </div>

        <div className={pageStyles.formGroup}>
          <label className={pageStyles.formLabel}>Pekerjaan:</label>
          <select
            name="pekerjaan"
            value={pegawai.pekerjaan}
            onChange={onChange}
            required
            className={pageStyles.formSelect}
          >
            <option value="">-- Pilih Pekerjaan --</option>
            <option>Anggota Polri</option>
            <option>ASN</option>
            <option>PPPK</option>
            <option>TKK</option>
            <option>Dokter Mitra</option>
            <option>Tenaga Mitra</option>
          </select>
        </div>

        <div className={pageStyles.formGroup}>
          <label className={pageStyles.formLabel}>Tipe Identitas:</label>
          <input
            type="text"
            name="tipe_identitas"
            value={pegawai.tipe_identitas}
            onChange={onChange}
            readOnly
            disabled
            className={`${pageStyles.formInput} ${pageStyles.readOnly}`}
          />
        </div>

        <div className={pageStyles.formGroup}>
          <label className={pageStyles.formLabel}>NRP / NIP / NIR:</label>
          <input
            type="text"
            name="nrp_nip_nir"
            value={pegawai.nrp_nip_nir}
            onChange={onChange}
            required
            className={pageStyles.formInput}
          />
        </div>

        <div className={pageStyles.formGroup}>
          <label className={pageStyles.formLabel}>Pangkat:</label>
          <select
            name="pangkat"
            value={pegawai.pangkat}
            onChange={onChange}
            required={pegawai.pekerjaan === "Anggota Polri" || pegawai.pekerjaan === "ASN"}
            disabled={pegawai.pekerjaan !== "Anggota Polri" && pegawai.pekerjaan !== "ASN"}
            className={`${pageStyles.formSelect} ${pegawai.pekerjaan !== "Anggota Polri" && pegawai.pekerjaan !== "ASN" ? pageStyles.readOnly : ""}`}
          >
            <option value="">-- Pilih Pangkat --</option>
            {pangkatOptions.map((pangkat) => (
              <option key={pangkat} value={pangkat}>
                {pangkat}
              </option>
            ))}
          </select>
        </div>

        <div className={pageStyles.formGroup}>
          <label className={pageStyles.formLabel}>Golongan:</label>
          <select
            name="golongan"
            value={pegawai.golongan}
            onChange={onChange}
            required={pegawai.pekerjaan === "ASN"}
            disabled={true}
            className={`${pageStyles.formSelect} ${pageStyles.readOnly}`}
          >
            <option value="">-- Terisi Otomatis --</option>
            {golonganOptions.map((golongan) => (
              <option key={golongan} value={golongan}>
                {golongan}
              </option>
            ))}
          </select>
        </div>

        <div className={pageStyles.formGroup}>
          <label className={pageStyles.formLabel}>Jabatan Struktural:</label>
          <input
            type="text"
            name="jabatan_struktural"
            value={pegawai.jabatan_struktural}
            onChange={onChange}
            className={pageStyles.formInput}
          />
        </div>

        <div className={pageStyles.formGroup}>
          <label className={pageStyles.formLabel}>Klasifikasi:</label>
          <select
            name="klasifikasi"
            value={pegawai.klasifikasi}
            onChange={onChange}
            required
            className={pageStyles.formSelect}
          >
            <option value="">-- Pilih Klasifikasi --</option>
            <option>Medis</option>
            <option>Paramedis</option>
            <option>Non Medis</option>
          </select>
        </div>
        
        <div className={pageStyles.formGroup}>
          <label className={pageStyles.formLabel}>Status:</label>
          <select
            name="status"
            value={pegawai.status}
            onChange={onChange}
            required
            className={pageStyles.formSelect}
          >
            <option value="">-- Pilih Status --</option>
            <option>Aktif</option>
            <option>Tidak Aktif</option>
          </select>
        </div>

        <div className={pageStyles.formGroup}>
          <label className={pageStyles.formLabel}>Bank:</label>
          <input
            type="text"
            name="bank"
            value={pegawai.bank}
            onChange={onChange}
            className={pageStyles.formInput}
          />
        </div>

        <div className={pageStyles.formGroup}>
          <label className={pageStyles.formLabel}>No. Rekening:</label>
          <input
            type="text"
            name="no_rekening"
            value={pegawai.no_rekening}
            onChange={onChange}
            className={pageStyles.formInput}
          />
        </div>

        <div className={pageStyles.formGroup}>
          <label className={pageStyles.formLabel}>Nama Rekening:</label>
          <input
            type="text"
            name="nama_rekening"
            value={pegawai.nama_rekening}
            onChange={onChange}
            className={pageStyles.formInput}
          />
        </div>
      </div>

      <div className={pageStyles.formActions}>
        <button
          type="button"
          onClick={onClose}
          className={pageStyles.formCancel}
        >
          Batal
        </button>
        <button
          type="submit"
          className={styles.rekamButton}
        >
          {editId ? "Update" : "Simpan"}
        </button>
      </div>
    </form>
  );
};

export default PegawaiForm;