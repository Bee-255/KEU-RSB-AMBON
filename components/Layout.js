// components/Layout.js

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Swal from "sweetalert2";
import { supabase } from "@/utils/supabaseClient";

export default function Layout({ children, fullName }) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState("");
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  
  const [openFolder, setOpenFolder] = useState(null);
  const [isRekamActive, setIsRekamActive] = useState(false);

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

  useEffect(() => {
    if (router.pathname.startsWith('/pegawai') || router.pathname.startsWith('/pencatatanpasien')) {
      setOpenFolder('rekam');
      setIsRekamActive(true);
    }
  }, [router.pathname]);

  const handleRekamToggle = () => {
    if (openFolder === 'rekam') {
      setOpenFolder(null);
      setTimeout(() => {
        setIsRekamActive(false);
      }, 150);
    } else {
      setIsRekamActive(true);
      setOpenFolder('rekam');
    }
  };

  // --- Gaya Navigasi ---
  const baseMenuItemStyle = {
    background: "none",
    border: "none",
    color: "#000",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "0.8rem",
    padding: "0.2rem 0.5rem 0.2rem 0.5rem",
    margin: "0rem",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    width: "100%",
    boxSizing: "border-box",
  };

  const activeStyle = { 
    ...baseMenuItemStyle,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderLeft: "4px solid #2563eb", 
  };

  const inactiveStyle = {
    ...baseMenuItemStyle,
    backgroundColor: "#E1E7EF",
    borderLeft: "4px solid transparent",
  };

  const folderIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#4A5568">
      <path d="M22 6c0-1.103-.897-2-2-2h-7.164a2 2 0 0 1-1.517-.703L11 2.375A2 2 0 0 0 9.483 2H4c-1.103 0-2 .897-2 2v16c0 1.103.897 2 2 2h18c1.103 0 2-.897 2-2V8c0-1.103-.897-2-2-2z"></path>
    </svg>
  );

  const fileIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A5568" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
    </svg>
  );

  const arrowIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  );

  const handleDashboardClick = () => {
    router.push("/dashboard");
    setOpenFolder(null);
    setIsRekamActive(false);
  };
  
  const isRekamOpen = openFolder === 'rekam';

  return (
    <div style={{ }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "stretch",
          flexShrink: 0,
          position: "fixed",
          top: "0",
          left: "0",
          width: "100%",
          zIndex: 1000, 
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
            cursor: "pointer",
          }}
          onClick={handleDashboardClick}
        >
          <h1 style={{ 
            margin: 0, 
            fontSize: "1.5rem", 
            fontWeight: "600", 
            color: "#fff",
            cursor: "pointer"
          }}>
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
                width: "25px",
                height: "25px",
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
      
      {/* Perubahan: Sidebar sekarang fixed */}
      <aside
          style={{
            width: "200px",
            backgroundColor: "#E1E7EF",
            color: "#000",
            display: "flex",
            flexDirection: "column",
            transition: "left 0.3s ease",
            overflow: "hidden",
            flexShrink: 0,
            padding: "0",
            boxSizing: "border-box",
            position: "fixed",
            top: "64px",
            bottom: "0",
            left: isSidebarVisible ? "0" : "-200px",
            zIndex: 500,
          }}
      >
        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0rem",
            padding: "1rem 0"
          }}
        >
          {/* Rekam (Folder) */}
          <div
            onClick={handleRekamToggle}
            style={isRekamActive ? activeStyle : inactiveStyle}
          >
            <span style={{ fontSize: "0.9rem" }}>{folderIcon}</span> Rekam
            <span style={{
              display: 'inline-block',
              marginLeft: "auto",
              width: "1em",
              height: "1em",
              transform: isRekamOpen ? 'rotate(-180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease-in-out',
            }}>
              {arrowIcon}
            </span>
          </div>

          {/* Sub-menu (Pegawai & Pencatatan Pasien) */}
          <div 
            style={{
              maxHeight: isRekamOpen ? '200px' : '0',
              overflow: 'hidden',
              transition: 'max-height 0.2s',
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "0rem" }}>
              <button
                onClick={() => router.push("/pegawai")}
                style={router.pathname === "/pegawai" ? {...activeStyle, paddingLeft: "1rem"} : {...inactiveStyle, paddingLeft: "1rem"}}
              >
                <span style={{ fontSize: "0.9rem" }}>{fileIcon}</span> Pegawai
              </button>
              <button
                onClick={() => router.push("/pencatatanpasien")}
                style={router.pathname === "/pencatatanpasien" ? {...activeStyle, paddingLeft: "1rem"} : {...inactiveStyle, paddingLeft: "1rem"}}
              >
                <span style={{ fontSize: "0.9rem" }}>{fileIcon}</span> Pencatatan Pasien
              </button>
              <button
                onClick={() => router.push("/sppr")}
                style={router.pathname === "/sppr" ? {...activeStyle, paddingLeft: "1rem"} : {...inactiveStyle, paddingLeft: "1rem"}}
              >
                <span style={{ fontSize: "0.9rem" }}>{fileIcon}</span> SPPR
              </button>
            </div>
          </div>
        </nav>
      </aside>
      
      {/* Main content */}
      <main 
        style={{ 
          flex: 1, 
          padding: "1rem 2rem", 
          backgroundColor: "#F3F4F6",
          overflowY: "auto",
          marginLeft: isSidebarVisible ? "200px" : "0",
          paddingTop: "64px", 
          transition: "margin-left 0.3s cubic-bezier(.4,0,.2,1)",
          zIndex: 3,
        }}
      >
        {children}
      </main>
    </div>
  );
}