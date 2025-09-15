import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";
import Swal from "sweetalert2";
import { useState, useEffect } from "react";

export default function Layout({ children, fullName }) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState("");
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Yakin ingin keluar?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, logout",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      await supabase.auth.signOut();
      router.push("/");
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      const options = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      };
      setCurrentTime(date.toLocaleString('id-ID', options));
    };

    updateTime();
    const timerId = setInterval(updateTime, 1000);

    return () => clearInterval(timerId);
  }, []);

  // Mendefinisikan style untuk tombol navigasi aktif
  const activeStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    border: "none",
    borderLeft: "4px solid #2563eb",
    color: "#000",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "0.8rem",
    padding: "0.25rem 0.5rem 0.25rem 0.5rem",
    margin: "0 -1rem",
  };

  // Mendefinisikan style untuk tombol navigasi tidak aktif
  const inactiveStyle = {
    background: "none",
    border: "none",
    color: "#000",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "0.8rem",
    padding: "0.3rem 0.8rem",
    margin: "0 -1rem",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", fontFamily: "sf pro" }}>
      
      {/* Header Utama dengan dua warna yang berbeda */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "stretch",
          flexShrink: 0,
          position: "relative",
        }}
      >
        {/* Bagian Kiri Header: Dashboard */}
        <div 
          style={{
            backgroundColor: "#113372",
            color: "white",
            padding: "1rem 2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "200px", 
            flexShrink: 0,
            boxSizing: "border-box",
          }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "600", color: "#fff" }}>
            Dashboard
          </h1>
        </div>
        
        {/* Tombol Toggle */}
        <div 
            style={{
                position: "absolute",
                left: "200px",
                top: "50%",
                transform: "translate(-50%, -50%)",
                backgroundColor: "white",
                width: "30px",
                height: "30px",
                borderRadius: "4px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 4,
            }}
        >
            <button
                onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                style={{
                background: "none",
                border: "none",
                color: "#000",
                fontSize: "2rem",
                cursor: "pointer",
                padding: 0,
                transform: "translateY(-1px)",
                }}
            >
                {isSidebarVisible ? "‹" : "›"}
            </button>
        </div>
        
        {/* Bagian Kanan Header: Selamat Datang, Waktu, dan Logout */}
        <div 
          style={{
            backgroundColor: "#2563eb",
            color: "white",
            padding: "1rem 2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexGrow: 1, 
            gap: "2rem",
            boxSizing: "border-box",
          }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: "400" }}>Selamat datang, {fullName || ""}</span>
            <span style={{ fontSize: "0.8rem", opacity: 0.8 }}>{currentTime}</span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 16px",
              background: "#fff",
              color: "#2563eb",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Bagian Bawah Header */}
      <div style={{ flex: 1, display: "flex" }}>
        
        {/* Sidebar */}
        <aside
          style={{
            width: isSidebarVisible ? "200px" : "0",
            backgroundColor: "#E1E7EF",
            color: "#000",
            display: "flex",
            flexDirection: "column",
            transition: "width 0.3s ease",
            overflow: "hidden",
            flexShrink: 0,
            padding: "1rem",
            boxSizing: "border-box",
          }}
        >
          <nav style={{ display: "flex", flexDirection: "column", gap: "0rem" }}>
            <button
              onClick={() => router.push("/dashboard")}
              style={router.pathname === "/dashboard" ? activeStyle : inactiveStyle}
            >
              Beranda
            </button>
            <button
              onClick={() => router.push("/pegawai")}
              style={router.pathname === "/pegawai" ? activeStyle : inactiveStyle}
            >
              Pegawai
            </button>
            <button
              onClick={() => router.push("/pencatatan-pasien")}
              style={router.pathname === "/pencatatan-pasien" ? activeStyle : inactiveStyle}
            >
              Pencatatan Pasien
            </button>
          </nav>
        </aside>

        {/* Konten Utama */}
        <main style={{ flex: 1, padding: "2rem", backgroundColor: "#F3F4F6" }}>
          {children}
        </main>
      </div>
    </div>
  );
}