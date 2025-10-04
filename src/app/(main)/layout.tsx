// src/app/(main)/layout.tsx
'use client';

import { useState, useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Swal from "sweetalert2";
import { supabase } from "@/utils/supabaseClient";
import { FaFolder, FaFile, FaAngleLeft, FaAngleDown, FaSignOutAlt } from "react-icons/fa";
import { Session, AuthChangeEvent } from '@supabase/supabase-js';

// Definisikan tipe untuk props
interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState<string>("");
  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(true);
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setFullName(user.user_metadata?.full_name || user.email || "");
        setLoading(false);
      } else {
        router.push('/login');
      }
    };
    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (!session) {
          router.push('/login');
        }
      }
    );

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [router]);

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
      }
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      const options: Intl.DateTimeFormatOptions = {
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
    if (pathname.startsWith('/pejabatkeuangan') || pathname.startsWith('/daftarakun')) {
      setOpenFolder('administrasi');
    } else if (pathname.startsWith('/pegawai') || pathname.startsWith('/pencatatanpasien') || pathname.startsWith('/sppr') || pathname.startsWith('/jurnalumum')) {
      setOpenFolder('rekam');
    } else {
      setOpenFolder(null);
    }
  }, [pathname]);

  const handleAdminToggle = () => {
    setOpenFolder(openFolder === 'administrasi' ? null : 'administrasi');
  };

  const handleRekamToggle = () => {
    setOpenFolder(openFolder === 'rekam' ? null : 'rekam');
  };

  const baseMenuItemStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    color: "#4A5568", 
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
    fontWeight: "normal", 
  };

  const activeStyle: React.CSSProperties = { 
    ...baseMenuItemStyle,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderLeft: "4px solid #2563eb",
    color: "#000",
    fontWeight: "600",
  };

  const inactiveStyle: React.CSSProperties = {
    ...baseMenuItemStyle,
    backgroundColor: "#E1E7EF",
    borderLeft: "4px solid #E1E7EF",
  };
  
  const hoverStyle: React.CSSProperties = { 
    ...baseMenuItemStyle,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderLeft: "4px solid rgba(255, 255, 255, 0.5)", 
    color: "#4A5568",
    fontWeight: "normal",
  };

  const handleDashboardClick = () => {
    router.push("/dashboard");
    setOpenFolder(null);
  };
  
  const isAdminOpen = openFolder === 'administrasi';
  const isRekamOpen = openFolder === 'rekam';
  const isActive = (path: string) => pathname === path;

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
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
          boxShadow: "0 4px 6px -1px rgba(210, 32, 32, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
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
                  fontFamily: "'Inter', sans-serif",
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
                  transform: isSidebarVisible ? "rotate(-360deg)" : "rotate(-180deg)",
                  transition: "transform 0.3s ease",
                }}
              >
                <FaAngleLeft strokeWidth={4}/>
              </div>
            </button>
        </div>
        <div 
          style={{
            backgroundColor: "#2563eb",
            color: "white",
            padding: "0.5rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexGrow: 1, 
            gap: "2rem",
            boxSizing: "border-box",
          }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: "400" }}>Selamat datang, {fullName}</span>
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
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </header>
      
      <div style={{ display: "flex", flexGrow: 1, paddingTop: "50px" }}>
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
              boxSizing: "border-box",
              position: "fixed",
              top: "50px",
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
              padding: "1.5rem 0"
            }}
          >
            {/* Administrasi (Folder) */}
            <div
              onClick={handleAdminToggle}
              onMouseEnter={() => setHoveredItem('administrasi')}
              onMouseLeave={() => setHoveredItem(null)}
              style={
                isAdminOpen ? activeStyle : (hoveredItem === 'administrasi' ? hoverStyle : inactiveStyle)
              }
            >
              <span style={{ fontSize: "0.9rem" }}>
                <FaFolder color={isAdminOpen ? '#2563eb' : '#4A5568'}/>
              </span> Administrasi
              <span style={{
                display: 'inline-block',
                marginLeft: "auto",
                width: "1em",
                height: "1em",
                transform: isAdminOpen ? 'rotate(-180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease-in-out',
              }}>
                <FaAngleDown strokeWidth={4} color="#4A5568" />
              </span>
            </div>

            {/* Sub-menu Administrasi */}
            <div 
              style={{
                maxHeight: isAdminOpen ? '200px' : '0',
                overflow: 'hidden',
                transition: 'max-height 0.2s',
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "0rem" }}>
                <button
                  onClick={() => router.push("/pejabatkeuangan")}
                  onMouseEnter={() => setHoveredItem('pejabatkeuangan')}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={
                    isActive("/pejabatkeuangan") ? 
                    {...activeStyle, paddingLeft: "1rem"} : 
                    (hoveredItem === 'pejabatkeuangan' ? {...hoverStyle, paddingLeft: "1rem"} : {...inactiveStyle, paddingLeft: "1rem"})
                  }
                >
                  <span style={{ fontSize: "0.9rem" }}>
                    <FaFile color={isActive("/pejabatkeuangan") ? '#2563eb' : '#4A5568'} />
                  </span> Pejabat Keuangan
                </button>
                <button
                  onClick={() => router.push("/daftarakun")}
                  onMouseEnter={() => setHoveredItem('daftarakun')}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={
                    isActive("/daftarakun") ? 
                    {...activeStyle, paddingLeft: "1rem"} : 
                    (hoveredItem === 'daftarakun' ? {...hoverStyle, paddingLeft: "1rem"} : {...inactiveStyle, paddingLeft: "1rem"})
                  }
                >
                  <span style={{ fontSize: "0.9rem" }}>
                    <FaFile color={isActive("/daftarakun") ? '#2563eb' : '#4A5568'} />
                  </span> Daftar Akun
                </button>
              </div>
            </div>
            
            {/* Rekam (Folder) */}
            <div
              onClick={handleRekamToggle}
              onMouseEnter={() => setHoveredItem('rekam')}
              onMouseLeave={() => setHoveredItem(null)}
              style={
                isRekamOpen ? activeStyle : (hoveredItem === 'rekam' ? hoverStyle : inactiveStyle)
              }
            >
              <span style={{ fontSize: "0.9rem" }}>
                <FaFolder color={isRekamOpen ? '#2563eb' : '#4A5568'}  />
              </span> Rekam
              <span style={{
                display: 'inline-block',
                marginLeft: "auto",
                width: "1em",
                height: "1em",
                transform: isRekamOpen ? 'rotate(-180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease-in-out',
              }}>
                <FaAngleDown strokeWidth={4} color="#4A5568" />
              </span>
            </div>

            {/* Sub-menu */}
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
                  onMouseEnter={() => setHoveredItem('pegawai')}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={
                    isActive("/pegawai") ? 
                    {...activeStyle, paddingLeft: "1rem"} : 
                    (hoveredItem === 'pegawai' ? {...hoverStyle, paddingLeft: "1rem"} : {...inactiveStyle, paddingLeft: "1rem"})
                  }
                >
                  <span style={{ fontSize: "0.9rem" }}>
                    <FaFile color={isActive("/pegawai") ? '#2563eb' : '#4A5568'} />
                  </span> Pegawai
                </button>
                <button
                  onClick={() => router.push("/pencatatanpasien")}
                  onMouseEnter={() => setHoveredItem('pencatatanpasien')}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={
                    isActive("/pencatatanpasien") ? 
                    {...activeStyle, paddingLeft: "1rem"} : 
                    (hoveredItem === 'pencatatanpasien' ? {...hoverStyle, paddingLeft: "1rem"} : {...inactiveStyle, paddingLeft: "1rem"})
                  }
                >
                  <span style={{ fontSize: "0.9rem" }}>
                    <FaFile color={isActive("/pencatatanpasien") ? '#2563eb' : '#4A5568'} />
                  </span> Pencatatan Pasien
                </button>
                <button
                  onClick={() => router.push("/sppr")}
                  onMouseEnter={() => setHoveredItem('sppr')}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={
                    isActive("/sppr") ? 
                    {...activeStyle, paddingLeft: "1rem"} : 
                    (hoveredItem === 'sppr' ? {...hoverStyle, paddingLeft: "1rem"} : {...inactiveStyle, paddingLeft: "1rem"})
                  }
                >
                  <span style={{ fontSize: "0.9rem" }}>
                    <FaFile color={isActive("/sppr") ? '#2563eb' : '#4A5568'} />
                  </span> SPPR
                </button>
                <button
                  onClick={() => router.push("/jurnalumum")}
                  onMouseEnter={() => setHoveredItem('jurnalumum')}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={
                    isActive("/jurnalumum") ? 
                    {...activeStyle, paddingLeft: "1rem"} : 
                    (hoveredItem === 'jurnalumum' ? {...hoverStyle, paddingLeft: "1rem"} : {...inactiveStyle, paddingLeft: "1rem"})
                  }
                >
                  <span style={{ fontSize: "0.9rem" }}>
                    <FaFile color={isActive("/jurnalumum") ? '#2563eb' : '#4A5568'} />
                  </span> Pencatatan Transaksi
                </button>
              </div>
            </div>
          </nav>
        </aside>
        
        <main 
          style={{ 
            flex: 1, 
            backgroundColor: "#F3F4F6",
            overflowY: "auto",
            marginLeft: isSidebarVisible ? "200px" : "0px",
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