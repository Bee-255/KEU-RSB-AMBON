import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Swal from "sweetalert2";
import { supabase } from "@/utils/supabaseClient";

export default function Layout({ children, fullName }) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState("");
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [openFolder, setOpenFolder] = useState(null);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Yakin ingin keluar?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, logout",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error.message);
        Swal.fire("Gagal Logout", "Terjadi kesalahan saat mencoba keluar.", "error");
      } else {
        router.push("/");
      }
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

  // Hanya satu menu aktif: beranda atau rekam
  const isHomeActive = openFolder === null && router.pathname === '/dashboard';
  const isRekamOpen = openFolder === 'rekam';

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

  const folderIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 6c0-1.103-.897-2-2-2h-7.164a2 2 0 0 1-1.517-.703L11 2.375A2 2 0 0 0 9.483 2H4c-1.103 0-2 .897-2 2v16c0 1.103.897 2 2 2h18c1.103 0 2-.897 2-2V8c0-1.103-.897-2-2-2z"></path>
    </svg>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", fontFamily: "sf pro" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "stretch",
          flexShrink: 0,
          position: "relative",
          zIndex: 10,
        }}
      >
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
                  fontFamily: "Arial Rounded MT Bold, Arial Rounded, sans-serif",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%", 
                  height: "100%",
                }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "100%",
                  transform: isSidebarVisible ? "rotate(45deg)" : "rotate(160deg)",
                  transition: "transform 0.3s ease",
                }}
              >
                {isSidebarVisible ? "×" : "+"}
              </div>
            </button>
        </div>
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
      <div 
        style={{ 
          flex: 1, 
          display: "flex",
          overflowY: "hidden",
        }}
      >
        <aside
          style={{
            width: "200px",
            backgroundColor: "#E1E7EF",
            color: "#000",
            display: "flex",
            flexDirection: "column",
            transition: "width 0.3s ease",
            overflow: "hidden",
            flexShrink: 0,
            padding: "1rem",
            boxSizing: "border-box",
            position: "relative",
            zIndex: 2,
          }}
        >
          <nav
            style={{
              display: isSidebarVisible ? "flex" : "none",
              flexDirection: "column",
              gap: "0rem",
            }}
          >
            {/* Beranda */}
            <button
              onClick={() => {
                router.push("/dashboard");
                setOpenFolder(null); // Hanya beranda yang aktif
              }}
              style={isHomeActive ? activeStyle : inactiveStyle}
            >
              Beranda
            </button>

            {/* Rekam (Folder) */}
            <div
              onClick={() => {
                setOpenFolder(isRekamOpen ? null : 'rekam'); // Hanya rekam yang aktif
              }}
              style={{
                ...(isRekamOpen ? activeStyle : inactiveStyle),
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.9rem" }}>{folderIcon}</span> Rekam
              </span>
              <span style={{
                fontSize: "1.2rem",
                marginLeft: "auto",
                paddingRight: "0.5rem",
                fontWeight: "600",
                color: "#2563eb",
                userSelect: "none",
              }}>
                {isRekamOpen ? "−" : "+"}
              </span>
            </div>

            {/* Sub-menu (Pegawai & Pencatatan Pasien) */}
            {isRekamOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0rem", paddingLeft: "1.5rem" }}>
                <button
                  onClick={() => router.push("/pegawai")}
                  style={router.pathname === "/pegawai" ? activeStyle : inactiveStyle}
                >
                  Pegawai
                </button>
                <button
                  onClick={() => router.push("/pencatatanpasien")}
                  style={router.pathname === "/pencatatanpasien" ? activeStyle : inactiveStyle}
                >
                  Pencatatan Pasien
                </button>
              </div>
            )}
          </nav>
        </aside>
        <main 
          style={{ 
            flex: 1, 
            padding: "2rem", 
            backgroundColor: "#F3F4F6",
            overflowY: "auto",
            marginLeft: isSidebarVisible ? "0" : "-200px",
            transition: "margin-left 0.3s cubic-bezier(.4,0,.2,1)",
            zIndex: 3,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}