// src/app/(main)/pembayaran/components/PaymentTable.tsx
"use client";

import React from "react";
import pageStyles from "@/styles/komponen.module.css";
import loadingStyles from "@/styles/loading.module.css";
import Paginasi from '@/components/paginasi';

// Import interface dari file utama
import { PaymentType } from '../page';

// Interface untuk menampung nilai Total
export interface PaymentTotals {
  totalBruto: number;
  totalPph21: number;
  totalPotongan: number; 
  totalNetto: number;
}

// Interface untuk pagination
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}

// Interface untuk props komponen PaymentTable
export interface PaymentTableProps {
  payments: PaymentType[];
  selectedPayment: PaymentType | null;
  onPaymentSelect: (payment: PaymentType) => void; 
  isLoading: boolean;
  startIndex: number;
  formatAngka: (angka: number | string | null | undefined, shouldRound?: boolean) => string; 
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  paymentTotals: PaymentTotals; 
  // Tambahkan props pagination
  paginationProps?: PaginationProps;
  showPagination?: boolean;
}

const PaymentTable: React.FC<PaymentTableProps> = ({
  payments = [],
  selectedPayment,
  onPaymentSelect,
  isLoading,
  startIndex,
  formatAngka,
  expandedIds,
  toggleExpand,
  paymentTotals,
  paginationProps,
  showPagination = false,
}) => {
  const getStatusBadge = (status: PaymentType["status"]) => {
    const statusClass = status === 'DISETUJUI' ? pageStyles.statusApproved :
                       pageStyles.statusNew; 
    return <span className={statusClass}>{status}</span>;
  };

  const handleRowClick = (payment: PaymentType) => {
    onPaymentSelect(payment);
  };
  
  // PERBAIKAN: Sesuaikan dengan struktur tabel yang baru (tanpa kolom icon)
  // Total kolom sekarang: 9 kolom (No, Periode, Uraian, Jml Pegawai, Bruto, PPh21, Potongan, Netto, Status)
  const COL_SPAN_FOR_EMPTY_ROW = 9; // Diperbaiki dari 10 menjadi 9
  const COL_SPAN_FOR_TOTAL_LABEL = 4; // Diperbaiki dari 5 menjadi 4 (No + Periode + Uraian + Jml Pegawai)

  return (
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
              <th style={{ width: "9%" }}>Periode</th>
              <th style={{ width: "17%" }}>Uraian Pembayaran</th>
              <th style={{ width: "7%" }}>Jml Pegawai</th>
              <th style={{ width: "11%", textAlign: "right" }}>Jumlah Bruto</th>
              <th style={{ width: "11%", textAlign: "right" }}>Jumlah PPh21</th>
              <th style={{ width: "11%", textAlign: "right" }}>Jumlah Potongan</th>
              <th style={{ width: "11%", textAlign: "right" }}>Jumlah Netto</th>
              <th style={{ width: "17%" }}>Status</th>
            </tr>
          </thead>
          <tbody className={pageStyles.tableBody}>
            {payments.length > 0 ? (
              payments.map((payment, index) => {
                const isExpanded = expandedIds.has(payment.id);
                const isRowSelected = selectedPayment?.id === payment.id;

                return (
                  <tr 
                    key={payment.id} 
                    onClick={() => handleRowClick(payment)} 
                    className={`${pageStyles.tableRow} ${isRowSelected ? pageStyles.selected : ""}`}
                  >
                    <td style={{textAlign: "center" }}>{startIndex + index + 1}</td>
                    <td>{payment.periode}</td>
                    <td>{payment.uraian_pembayaran}</td>
                    <td style={{ textAlign: "right" }}>{payment.jumlah_pegawai}</td>
                    <td style={{ textAlign: "right" }}>{formatAngka(payment.jumlah_bruto, true)}</td>
                    <td style={{ textAlign: "right" }}>{formatAngka(payment.jumlah_pph21, true)}</td>
                    <td style={{ textAlign: "right" }}>{formatAngka(payment.jumlah_potongan, true)}</td>
                    <td style={{ textAlign: "right" }}>{formatAngka(payment.jumlah_netto, true)}</td>
                    <td>{getStatusBadge(payment.status)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td 
                  colSpan={COL_SPAN_FOR_EMPTY_ROW}
                  className={pageStyles.tableEmpty}
                  style={{ padding: '1rem 0' }}
                >
                  {isLoading ? "" : "Tidak ada data pembayaran yang ditemukan."}
                </td>
              </tr>
            )}
          </tbody>
          
          {/* Table Footer untuk Total - DIPERBAIKI */}
          {payments.length > 0 && (
            <tfoot className={pageStyles.tableHead}>
              <tr>
                {/* PERBAIKAN: colSpan sekarang 4 (sesuai COL_SPAN_FOR_TOTAL_LABEL baru) */}
                <th colSpan={COL_SPAN_FOR_TOTAL_LABEL} style={{ textAlign: 'right', fontWeight: 'bold', paddingRight: '1rem' }}>
                    TOTAL KESELURUHAN
                </th>
                
                {/* Kolom Jumlah Bruto (dengan pembulatan) */}
                <th style={{ textAlign: 'right', fontWeight: 'bold' }}>
                    {formatAngka(paymentTotals.totalBruto, true)} 
                </th>
                
                {/* Kolom Jumlah PPh21 (dengan pembulatan) */}
                <th style={{ textAlign: 'right', fontWeight: 'bold' }}>
                    {formatAngka(paymentTotals.totalPph21, true)}
                </th>

                {/* Kolom Jumlah Potongan (dengan pembulatan) */}
                <th style={{ textAlign: 'right', fontWeight: 'bold' }}>
                    {formatAngka(paymentTotals.totalPotongan, true)}
                </th>
                
                {/* Kolom Jumlah Netto (dengan pembulatan) */}
                <th style={{ textAlign: 'right', fontWeight: 'bold' }}>
                    {formatAngka(paymentTotals.totalNetto, true)}
                </th>
                
                
                <th></th>
              </tr>
            </tfoot>
          )}
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

export default PaymentTable;