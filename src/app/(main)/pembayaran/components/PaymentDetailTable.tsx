// src/app/(main)/pembayaran/components/PaymentDetailTable.tsx
import React from 'react';
import pageStyles from "@/styles/komponen.module.css";
import loadingStyles from "@/styles/loading.module.css";
import Paginasi from '@/components/paginasi'; // IMPORT PAGINASI

// Import interface dari file utama
import { PaymentDetailType } from '../page';

// Interface untuk props pagination
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}

interface PaymentDetailTableProps {
  details: PaymentDetailType[];
  selectedDetails: string[];
  onSelectionChange: (selected: string[]) => void;
  onEdit: (detail: PaymentDetailType) => void;
  isLoading: boolean;
  canEdit: boolean; 
  startIndex: number;
  formatAngka: (angka: number | string | null | undefined, shouldRound?: boolean) => string;
  // Tambahkan props pagination
  paginationProps?: PaginationProps;
  showPagination?: boolean;
}

const PaymentDetailTable: React.FC<PaymentDetailTableProps> = ({ 
  details = [], 
  selectedDetails, 
  onSelectionChange, 
  onEdit,
  isLoading, 
  startIndex,
  formatAngka,
  // Tambahkan props baru
  paginationProps,
  showPagination = false,
}) => {

  const handleRowClick = (id: string) => {
    if (selectedDetails.includes(id)) {
      onSelectionChange(selectedDetails.filter(sId => sId !== id));
    } else {
      onSelectionChange([id]); 
    }
  };

  const colCount = 11; 

  return (
    <div className={pageStyles.detailtableContainer}>
      <div className={pageStyles.tableWrapper}>
        
        {/* Loading Overlay */}
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
              <th style={{ width: "5%", textAlign: 'center' }}>No.</th>
              <th style={{ width: "10%" }}>NRP/NIP</th>
              <th style={{ width: "15%" }}>Nama</th>
              <th style={{ width: "10%" }}>Pekerjaan</th>
              <th style={{ width: "5%" }}>Klasifikasi</th>
              <th style={{ width: "10%", textAlign: 'right' }}>Bruto (Rp)</th>
              <th style={{ width: "7%", textAlign: 'right' }}>PPH21 (%)</th>
              <th style={{ width: "10%", textAlign: 'right' }}>PPH21 (Rp)</th>
              <th style={{ width: "10%", textAlign: 'right' }}>Potongan (Rp)</th> 
              <th style={{ width: "10%", textAlign: 'right' }}>Netto (Rp)</th>
              <th style={{ width: "15%" }}>Bank</th> 
            </tr>
          </thead>
          <tbody className={pageStyles.tableBody}>
            {details.length > 0 ? (
              details.map((detail, index) => (
                <tr
                  key={detail.id}
                  onClick={() => handleRowClick(detail.id)} 
                  className={`${pageStyles.tableRow} ${selectedDetails.includes(detail.id) ? pageStyles.selected : ""}`} 
                >
                  
                  <td style={{ textAlign: 'center' }}>{startIndex + index + 1}</td>
                  <td>{detail.nrp_nip_nir}</td>
                  <td>{detail.nama}</td>
                  <td>{detail.pekerjaan}</td>
                  <td>{detail.klasifikasi}</td>
                  <td style={{ textAlign: 'right' }}>{formatAngka(detail.jumlah_bruto, true)}</td>
                  <td style={{ textAlign: 'right' }}>{(detail.pph21_persen * 100).toFixed(2)}%</td> 
                  <td style={{ textAlign: 'right' }}>{formatAngka(detail.jumlah_pph21, true)}</td>
                  <td style={{ textAlign: 'right' }}>{formatAngka(detail.potongan, true)}</td>
                  <td style={{ textAlign: 'right' }}>{formatAngka(detail.jumlah_netto, true)}</td>
                  <td>{detail.bank}</td>
                  
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={colCount} className={pageStyles.tableEmpty}>
                  {isLoading ? "" : "Tidak ada data detail pembayaran yang ditemukan untuk periode ini."}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Tambahkan Pagination di dalam wrapper yang sama */}
        {showPagination && paginationProps && (
          <div style={{ 
            paddingBottom: '1rem',
            position: 'relative',
            zIndex: 1 
          }}>
            <Paginasi 
              currentPage={paginationProps.currentPage}
              totalPages={paginationProps.totalPages}
              totalItems={paginationProps.totalItems}
              itemsPerPage={paginationProps.itemsPerPage}
              onPageChange={paginationProps.onPageChange}
              onItemsPerPageChange={paginationProps.onItemsPerPageChange}
            />
          </div>
        )}
        
      </div> 
    </div>
  );
};

export default PaymentDetailTable;