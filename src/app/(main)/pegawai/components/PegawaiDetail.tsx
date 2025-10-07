import React from 'react';
import { PegawaiData } from '../types';
import pageStyles from "@/styles/komponen.module.css";
import loadingStyles from "@/styles/loading.module.css";

interface PegawaiDetailProps {
  selectedPegawai: PegawaiData | null;
  isDetailLoading?: boolean; // Tambahkan prop untuk loading state
}

const PegawaiDetail: React.FC<PegawaiDetailProps> = ({ 
  selectedPegawai, 
  isDetailLoading = false 
}) => {
  return (
    <div className={pageStyles.detailContainer}>
      <div className={pageStyles.detailHeader}>Detail Data Pegawai</div>
      {isDetailLoading ? (
        <div className={pageStyles.detailContent} style={{ position: 'relative', minHeight: '160px' }}>
          <div className={pageStyles.tableOverlay}>
            <div className={loadingStyles.dotContainer}>
              <div className={`${loadingStyles.dot} ${loadingStyles['dot-1']}`} />
              <div className={`${loadingStyles.dot} ${loadingStyles['dot-2']}`} />
              <div className={`${loadingStyles.dot} ${loadingStyles['dot-3']}`} />
            </div>
          </div>
        </div>
      ) : selectedPegawai ? (
        <div className={pageStyles.detailContent}>
          <div className={pageStyles.detailItem}>
            <div className={pageStyles.detailLabel}>Nama</div>
            <div className={pageStyles.detailValue}>: {selectedPegawai.nama}</div>
          </div>
          <div className={pageStyles.detailItem}>
            <div className={pageStyles.detailLabel}>Pekerjaan</div>
            <div className={pageStyles.detailValue}>: {selectedPegawai.pekerjaan}</div>
          </div>
          <div className={pageStyles.detailItem}>
            <div className={pageStyles.detailLabel}>Tipe Identitas</div>
            <div className={pageStyles.detailValue}>: {selectedPegawai.tipe_identitas}</div>
          </div>
          <div className={pageStyles.detailItem}>
            <div className={pageStyles.detailLabel}>NRP / NIP / NIR</div>
            <div className={pageStyles.detailValue}>: {selectedPegawai.nrp_nip_nir}</div>
          </div>
          <div className={pageStyles.detailItem}>
            <div className={pageStyles.detailLabel}>Klasifikasi</div>
            <div className={pageStyles.detailValue}>: {selectedPegawai.klasifikasi}</div>
          </div>
          <div className={pageStyles.detailItem}>
            <div className={pageStyles.detailLabel}>Pangkat</div>
            <div className={pageStyles.detailValue}>: {selectedPegawai.pangkat}</div>
          </div>
          <div className={pageStyles.detailItem}>
            <div className={pageStyles.detailLabel}>Golongan</div>
            <div className={pageStyles.detailValue}>: {selectedPegawai.golongan}</div>
          </div>
          <div className={pageStyles.detailItem}>
            <div className={pageStyles.detailLabel}>Jabatan Struktural</div>
            <div className={pageStyles.detailValue}>: {selectedPegawai.jabatan_struktural}</div>
          </div>
          <div className={pageStyles.detailItem}>
            <div className={pageStyles.detailLabel}>Status</div>
            <div className={pageStyles.detailValue}>: {selectedPegawai.status}</div>
          </div>
          <div className={pageStyles.detailItem}>
            <div className={pageStyles.detailLabel}>Bank</div>
            <div className={pageStyles.detailValue}>: {selectedPegawai.bank}</div>
          </div>
          <div className={pageStyles.detailItem}>
            <div className={pageStyles.detailLabel}>No. Rekening</div>
            <div className={pageStyles.detailValue}>: {selectedPegawai.no_rekening}</div>
          </div>
          <div className={pageStyles.detailItem}>
            <div className={pageStyles.detailLabel}>Nama Rekening</div>
            <div className={pageStyles.detailValue}>: {selectedPegawai.nama_rekening}</div>
          </div>
        </div>
      ) : (
        <div className={pageStyles.tableEmpty}>Data Pegawai Belum Dipilih</div>
      )}
    </div>
  );
};

export default PegawaiDetail;