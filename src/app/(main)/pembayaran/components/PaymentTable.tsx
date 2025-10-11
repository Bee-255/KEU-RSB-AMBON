// src/app/(main)/pembayaran/components/PaymentTable.tsx
"use client";

import React from "react";
import pageStyles from "@/styles/komponen.module.css";
import loadingStyles from "@/styles/loading.module.css";
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';

// Interface untuk tipe data PaymentType (Baris Rekap)
interface PaymentType {
  id: string;
  periode: string;
  uraian_pembayaran: string;
  jumlah_pegawai: number;
  jumlah_bruto: number;
  jumlah_pph21: number;
  // BARU: Tambahkan jumlah_potongan
  jumlah_potongan: number; 
  // jumlah_netto tetap ada, nilainya dihitung Bruto - PPh21 - Potongan
  jumlah_netto: number; 
  status: "BARU" | "DISETUJUI";
  created_at: string;
}

// BARU: Interface untuk menampung nilai Total
export interface PaymentTotals {
  totalBruto: number;
  totalPph21: number;
  totalPotongan: number; 
  totalNetto: number;
}

// Interface untuk props komponen PaymentTable
export interface PaymentTableProps {
  payments: PaymentType[];
  selectedPayment: PaymentType | null;
  onPaymentSelect: (payment: PaymentType) => void; 
  isLoading: boolean;
  startIndex: number;
  // PERUBAHAN: formatAngka sekarang menerima argumen opsional untuk pembulatan
  formatAngka: (angka: number | string | null | undefined, shouldRound?: boolean) => string; 
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  // BARU: Tambahkan props untuk total
  paymentTotals: PaymentTotals; 
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
  paymentTotals, // Ambil props total
}) => {
  const getStatusBadge = (status: PaymentType["status"]) => {
    const statusClass = status === 'DISETUJUI' ? pageStyles.statusApproved :
                       pageStyles.statusNew; 
    return <span className={statusClass}>{status}</span>;
  };

  const handleRowClick = (payment: PaymentType) => {
    onPaymentSelect(payment);
  };
  
  // Total kolom data numerik adalah 5 (Pegawai, Bruto, PPh21, Potongan, Netto)
  // Total kolom keseluruhan adalah 10 (Icon + No + 3 Label + 5 Data)
  const COL_SPAN_FOR_EMPTY_ROW = 10; 
  const COL_SPAN_FOR_TOTAL_LABEL = 5; // Icon (1) + No (1) + Periode (1) + Uraian Pembayaran (1) + Jml Pegawai (1)

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
              <th style={{ width: "2%" }}></th> 
              <th style={{ width: "4%" }}>No.</th>
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
                    <td>
                      {isExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                    </td> 
                    
                    <td>{startIndex + index + 1}</td>
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
                  colSpan={COL_SPAN_FOR_EMPTY_ROW} // Colspan disesuaikan menjadi 10
                  className={pageStyles.tableEmpty}
                  style={{ padding: '1rem 0' }}
                >
                  {isLoading ? "" : "Tidak ada data pembayaran yang ditemukan."}
                </td>
              </tr>
            )}
          </tbody>
          
          {/* Table Footer untuk Total */}
          {payments.length > 0 && (
            <tfoot className={pageStyles.tableHead}>
              <tr>
                {/* Gabungkan sel untuk label "TOTAL KESELURUHAN" */}
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
                
                {/* Kolom Status (Kosong) */}
                <th></th> 
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default PaymentTable;