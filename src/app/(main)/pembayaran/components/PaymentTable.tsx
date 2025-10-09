// src/app/(main)/pembayaran/components/PaymentTable.tsx
"use client";

import React from "react";
import pageStyles from "@/styles/komponen.module.css";
import loadingStyles from "@/styles/loading.module.css";
import { FaChevronDown, FaChevronRight } from 'react-icons/fa'; // Import ikon untuk expand/collapse

// Interface untuk tipe data PaymentType (Baris Rekap)
interface PaymentType {
  id: string;
  periode: string;
  periode_pembayaran: string;
  jumlah_pegawai: number;
  jumlah_bruto: number;
  jumlah_pph21: number;
  jumlah_netto: number;
  status: "BARU" | "DISETUJUI" | "DITOLAK";
  created_at: string;
}

// Interface untuk props komponen PaymentTable
export interface PaymentTableProps { // Pastikan ini di-export jika diimpor di file lain
  payments: PaymentType[];
  // Perubahan: Mengganti Promise<void> di page.tsx dengan void di sini (sesuai cara pemanggilan di handlePaymentSelect)
  selectedPayment: PaymentType | null;
  onPaymentSelect: (payment: PaymentType) => Promise<void>; // Diperbaiki agar sesuai dengan tipe di page.tsx
  isLoading: boolean;
  startIndex: number;
  formatAngka: (angka: number | string | null | undefined) => string; 
  // 👇 PROPS BARU DITAMBAHKAN UNTUK MENGATASI ERROR TS2322
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
}

const PaymentTable: React.FC<PaymentTableProps> = ({
  payments = [],
  selectedPayment,
  onPaymentSelect,
  isLoading,
  startIndex,
  formatAngka,
  // 👇 PROPS BARU DIDEKONSTRUKSI
  expandedIds,
  toggleExpand,
}) => {
  const getStatusBadge = (status: string) => {
    const statusClass = status === 'DISETUJUI' ? pageStyles.statusApproved : 
                       status === 'DITOLAK' ? pageStyles.statusRejected : 
                       pageStyles.statusNew;
    return <span className={statusClass}>{status}</span>;
  };

  const handleRowClick = (payment: PaymentType) => {
    // 1. Pilih/deselect baris utama
    onPaymentSelect(payment);
    // 2. Kelola state expand/collapse
    toggleExpand(payment.id); 
  };
  
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
              <th style={{ width: "2%" }}></th> {/* Kolom untuk Expand/Collapse */}
              <th style={{ width: "5%" }}>No.</th>
              <th style={{ width: "10%" }}>Periode</th>
              <th style={{ width: "23%" }}>Periode Pembayaran</th>
              <th style={{ width: "10%" }}>Jumlah Pegawai</th>
              <th style={{ width: "12%", textAlign: "right" }}>Jumlah Bruto</th>
              <th style={{ width: "12%", textAlign: "right" }}>Jumlah PPh21</th>
              <th style={{ width: "12%", textAlign: "right" }}>Jumlah Netto</th>
              <th style={{ width: "14%" }}>Status</th>
            </tr>
          </thead>
          <tbody className={pageStyles.tableBody}>
            {payments.length > 0 ? (
              payments.map((payment, index) => {
                const isExpanded = expandedIds.has(payment.id);
                return (
                  <tr 
                    key={payment.id} 
                    onClick={() => handleRowClick(payment)} // Menggunakan fungsi baru
                    className={`${pageStyles.tableRow} ${
                      selectedPayment?.id === payment.id ? pageStyles.selected : ""
                    }`}
                  >
                    {/* Kolom Expand/Collapse */}
                    <td onClick={(e) => { e.stopPropagation(); toggleExpand(payment.id); }} style={{ cursor: 'pointer' }}>
                        {isExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                    </td>
                    
                    <td>{startIndex + index + 1}</td>
                    <td>{payment.periode}</td>
                    <td>{payment.periode_pembayaran}</td>
                    <td>{payment.jumlah_pegawai}</td>
                    <td style={{ textAlign: "right" }}>{formatAngka(payment.jumlah_bruto)}</td>
                    <td style={{ textAlign: "right" }}>{formatAngka(payment.jumlah_pph21)}</td>
                    <td style={{ textAlign: "right" }}>{formatAngka(payment.jumlah_netto)}</td>
                    <td>{getStatusBadge(payment.status)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td 
                  colSpan={9} // Colspan disesuaikan menjadi 9 (ditambah 1 kolom expand)
                  className={pageStyles.tableEmpty}
                  style={{ padding: '1rem 0' }}
                >
                  {isLoading ? "" : "Tidak ada data pembayaran yang ditemukan."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentTable;