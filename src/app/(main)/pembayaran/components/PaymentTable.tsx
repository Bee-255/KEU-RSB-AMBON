// src/app/(main)/pembayaran/components/PaymentTable.tsx

"use client";


import React from "react";

import pageStyles from "@/styles/komponen.module.css";

import loadingStyles from "@/styles/loading.module.css";


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

interface PaymentTableProps {

payments: PaymentType[];

selectedPayment: PaymentType | null;

onPaymentSelect: (payment: PaymentType) => void;

isLoading: boolean;

startIndex: number;

formatAngka: (angka: number | string | null | undefined) => string;

}


const PaymentTable: React.FC<PaymentTableProps> = ({

payments = [],

selectedPayment,

onPaymentSelect,

isLoading,

startIndex,

formatAngka

}) => {

const getStatusBadge = (status: string) => {

const statusClass = status === 'DISETUJUI' ? pageStyles.statusApproved :

status === 'DITOLAK' ? pageStyles.statusRejected :

pageStyles.statusNew;

return <span className={statusClass}>{status}</span>;

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

<th style={{ width: "5%" }}>No.</th>

<th style={{ width: "10%" }}>Periode</th>

<th style={{ width: "25%" }}>Periode Pembayaran</th>

<th style={{ width: "10%" }}>Jumlah Pegawai</th>

<th style={{ width: "12%", textAlign: "right" }}>Jumlah Bruto</th>

<th style={{ width: "12%", textAlign: "right" }}>Jumlah PPh21</th>

<th style={{ width: "12%", textAlign: "right" }}>Jumlah Netto</th>

<th style={{ width: "14%" }}>Status</th>

</tr>

</thead>

<tbody className={pageStyles.tableBody}>

{payments.length > 0 ? (

payments.map((payment, index) => (

<tr

key={payment.id}

onClick={() => onPaymentSelect(payment)}

className={`${pageStyles.tableRow} ${

selectedPayment?.id === payment.id ? pageStyles.selected : ""

}`}

>

<td>{startIndex + index + 1}</td>

<td>{payment.periode}</td>

<td>{payment.periode_pembayaran}</td>

<td>{payment.jumlah_pegawai}</td>

<td style={{ textAlign: "right" }}>{formatAngka(payment.jumlah_bruto)}</td>

<td style={{ textAlign: "right" }}>{formatAngka(payment.jumlah_pph21)}</td>

<td style={{ textAlign: "right" }}>{formatAngka(payment.jumlah_netto)}</td>

<td>{getStatusBadge(payment.status)}</td>

</tr>

))

) : (

<tr>

<td

colSpan={8}

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