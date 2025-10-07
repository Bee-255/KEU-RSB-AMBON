import React from 'react';
import { PegawaiData } from '../types';
import pageStyles from "@/styles/komponen.module.css";
import loadingStyles from "@/styles/loading.module.css";

interface PegawaiTableProps {
  listPegawai: PegawaiData[];
  currentPage: number;
  itemsPerPage: number;
  selectedPegawai: PegawaiData | null;
  isTableLoading: boolean;
  onRowClick: (pegawai: PegawaiData) => void;
}

const PegawaiTable: React.FC<PegawaiTableProps> = ({
  listPegawai,
  currentPage,
  itemsPerPage,
  selectedPegawai,
  isTableLoading,
  onRowClick
}) => {
  return (
    <div className={pageStyles.tableContainer}>
      <div className={pageStyles.tableWrapper}>
        {isTableLoading && (
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
              <th>Pekerjaan</th>
              <th>Pangkat</th>
              <th>NRP / NIP / NIR</th>
              <th>Jabatan Struktural</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody className={pageStyles.tableBody}>
            {listPegawai.length > 0 ? (
              listPegawai.map((p, index) => (
                <tr
                  key={p.id}
                  onClick={() => onRowClick(p)}
                  className={`${pageStyles.tableRow} ${selectedPegawai?.id === p.id ? pageStyles.selected : ""}`}
                >
                  <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                  <td>{p.nama}</td>
                  <td>{p.pekerjaan}</td>
                  <td>{p.pangkat}</td>
                  <td>{p.nrp_nip_nir}</td>
                  <td>{p.jabatan_struktural}</td>
                  <td>{p.status}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className={pageStyles.tableEmpty}>
                  Tidak ada data pegawai yang ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PegawaiTable;