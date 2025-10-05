// src/app/(main)/dashboard/page.tsx
'use client';

import React, { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import pageStyles from "@/styles/komponen.module.css";
import loadingStyles from "@/styles/loading.module.css";

// Fungsi utilitas format angka Indonesia
const formatDate = (dateString: string | null) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatted = date.toLocaleDateString('id-ID', options);
  return formatted.replace(/\//g, '-');
};

const formatRupiah = (number: number | string | null) => {
  if (number === null || number === undefined || number === "") return "-";
  const num = typeof number === 'string' ? parseFloat(number.replace(/\./g, '')) : number;
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

interface Rekapitulasi {
  id: string;
  tanggal: string;
  nama_user: string;
  total_pembayaran: number;
  status: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [belumTutupList, setBelumTutupList] = useState<Rekapitulasi[]>([]);
  const [belumSetorList, setBelumSetorList] = useState<Rekapitulasi[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchUserAndData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const role = profiles?.role;
      setUserRole(role);

      const today = new Date().toISOString().split('T')[0];

      // Kueri untuk transaksi dengan status "BARU" yang belum ditutup sebelum hari ini
      const { data: dataBelumTutup, error: errorBelumTutup } = await supabase
        .from("rekaman_harian")
        .select("id, tanggal, total_pembayaran, nama_user, status") // **PERBAIKAN DI SINI**
        .eq("status", "BARU")
        .lt("tanggal", today)
        .order("tanggal", { ascending: true });
      
      if (errorBelumTutup) {
        console.error("Error fetching 'Belum Tutup' list:", errorBelumTutup);
      } else {
        setBelumTutupList(dataBelumTutup as Rekapitulasi[]);
      }

      // Kueri untuk transaksi dengan status "TUTUP" yang belum disetor sebelum hari ini
      if (role === "Owner" || role === "Admin" || role === "Operator") {
        const { data: dataBelumSetor, error: errorBelumSetor } = await supabase
          .from("rekaman_harian")
          .select("id, tanggal, total_pembayaran, nama_user, status") // **PERBAIKAN DI SINI**
          .eq("status", "TUTUP")
          .lt("tanggal", today)
          .order("tanggal", { ascending: true });

        if (errorBelumSetor) {
          console.error("Error fetching 'Belum Setor' list:", errorBelumSetor);
        } else {
          setBelumSetorList(dataBelumSetor as Rekapitulasi[]);
        }
      }

      setLoading(false);
    };

    fetchUserAndData();
  }, [router]);

  if (loading) {
    return (
      <div className={loadingStyles.loadingContainer}>
        <div className={loadingStyles.dotContainer}>
          <div className={`${loadingStyles.dot} ${loadingStyles['dot-1']}`} />
          <div className={`${loadingStyles.dot} ${loadingStyles['dot-2']}`} />
          <div className={`${loadingStyles.dot} ${loadingStyles['dot-3']}`} />
        </div>
        <p className={loadingStyles.loadingText}></p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className={pageStyles.container}>
      <h2 className={pageStyles.header}>Beranda</h2>
        <div className={pageStyles.detailContainer}>
          <div className={pageStyles.detailHeader}>TO DO LIST</div>
          <div style={{ padding: '1rem' }}>
              {/* === Tampilan untuk role Kasir === */}
              {userRole === "Kasir" && (
                <>
                  {belumTutupList.length > 0 ? (
                      <div className={pageStyles.tableContainer}>
                          <h4 style={{ marginBottom: "0.5rem" }}>Pencatatan Belum Ditutup:</h4>
                          <table className={pageStyles.table}>
                              <thead className={pageStyles.tableHead}>
                                  <tr>
                                      <th style={{ width: "25%" }}>Tanggal</th>
                                      <th style={{ width: "25%" }}>Total Pembayaran</th>
                                      <th style={{ width: "15%" }}>Status</th>
                                  </tr>
                              </thead>
                              <tbody className={pageStyles.tableBody}>
                                  {belumTutupList.map(item => (
                                      <tr key={item.id} className={pageStyles.tableRow}>
                                          <td>{formatDate(item.tanggal)}</td>
                                          <td style={{ textAlign: "right" }}>{formatRupiah(item.total_pembayaran)}</td>
                                          <td>{item.status}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  ) : (
                      <div className={pageStyles.tableEmpty}>
                          Kasir terbaik, semua transaksi sudah ditutup tepat waktu. 👍
                      </div>
                  )}
                </>
              )}

              {/* === Tampilan untuk role Owner, Admin, Operator === */}
              {(userRole === "Owner" || userRole === "Admin" || userRole === "Operator") && (
                <>
                  {/* Tabel 1: Pencatatan Kasir yang Belum Ditutup */}
                  {belumTutupList.length > 0 && (
                      <div className={pageStyles.tableContainer}>
                          <h4 style={{ marginBottom: "0.5rem", marginLeft: "1rem" }}>Pencatatan Kasir yang Belum Ditutup:</h4>
                          <table className={pageStyles.table}>
                              <thead className={pageStyles.tableHead}>
                                  <tr>
                                      <th style={{ width: "20%" }}>Tanggal</th>
                                      <th style={{ width: "20%" }}>Nama User</th>
                                      <th style={{ width: "20%", textAlign: "right" }}>Total Pembayaran</th>
                                      <th style={{ width: "15%" }}>Status</th>
                                  </tr>
                              </thead>
                              <tbody className={pageStyles.tableBody}>
                                  {belumTutupList.map(item => (
                                      <tr key={item.id} className={pageStyles.tableRow}>
                                          <td>{formatDate(item.tanggal)}</td>
                                          <td>{item.nama_user}</td>
                                          <td style={{ textAlign: "right" }}>{formatRupiah(item.total_pembayaran)}</td>
                                          <td>{item.status}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  )}
                  
                  {/* Tabel 2: Pencatatan Pasien yang Belum Disetor */}
                  {belumSetorList.length > 0 && (
                      <div className={pageStyles.tableContainer} style={{ marginTop: "1rem" }}>
                          <h4 style={{ marginBottom: "0.5rem", marginLeft: "1rem" }}>Pencatatan Pasien yang Belum Disetor:</h4>
                          <table className={pageStyles.table}>
                              <thead className={pageStyles.tableHead}>
                                  <tr>
                                      <th style={{ width: "20%" }}>Tanggal</th>
                                      <th style={{ width: "20%" }}>Nama User</th>
                                      <th style={{ width: "20%", textAlign: "right" }}>Total Pembayaran</th>
                                      <th style={{ width: "15%" }}>Status</th>
                                  </tr>
                              </thead>
                              <tbody className={pageStyles.tableBody}>
                                  {belumSetorList.map(item => (
                                      <tr key={item.id} className={pageStyles.tableRow}>
                                          <td>{formatDate(item.tanggal)}</td>
                                          <td>{item.nama_user}</td>
                                          <td style={{ textAlign: "right" }}>{formatRupiah(item.total_pembayaran)}</td>
                                          <td>{item.status}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  )}

                  {/* Pesan motivasi jika semua tugas selesai */}
                  {belumTutupList.length === 0 && belumSetorList.length === 0 && (
                      <div className={pageStyles.tableEmpty}>
                          Semua transaksi telah diselesaikan dengan baik! ✅
                      </div>
                  )}
                </>
              )}
          </div>
      </div>
    </div>
  );
}