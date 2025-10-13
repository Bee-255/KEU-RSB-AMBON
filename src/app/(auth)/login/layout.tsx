// src/app/(auth)/layout.tsx
import { ReactNode } from "react";
import Image from "next/image";
import { NotificationProvider } from "@/lib/useKeuNotification";

interface AuthLayoutProps {
  children: ReactNode;
}

const imageUrl = "/fotodepan.jpeg"; 
// MENGEMBALIKAN WARNA BIRU YANG SEBENARNYA
const ACCENT_BLUE = "#ffffffff"; 
const HOVER_BLUE = "#fefefeff"; 
const LIGHT_GRAY = "#E5E7EB";
const TEXT_COLOR = "#374151";

const customStyles = `
  /* RESET & BASE */
  html, body {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow-x: hidden; 
    overflow-y: hidden; 
    font-family: 'Inter', sans-serif;
  }
  .container {
    display: flex;
    height: 100vh; 
    box-sizing: border-box;
    overflow: hidden;
  }

  /* LEFT PANEL (Desktop/Tablet) - BIRU GRADIENT */
  .left-panel {
    flex: 2; 
    display: flex;
    justify-content: center;
    align-items: center;
    /* WARNA BIRU ASLI KEMBALI */
    background: linear-gradient(135deg, ${ACCENT_BLUE} 0%, ${HOVER_BLUE} 100%); 
    position: relative;
    overflow: hidden;
  }
  .image-container {
    width: 80%; 
    height: 80%; 
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    z-index: 2; 
  }
  .photo-style {
    width: 100%; 
    height: auto; 
    object-fit: contain;
    filter: drop-shadow(0 0 25px rgba(255, 255, 255, 0.4)); 
  }

  /* RIGHT PANEL (Form Login) - PUTIH SOLID DI DESKTOP */
  .right-panel {
    flex: 2; 
    display: flex;
    flex-direction: column;
    justify-content: center; 
    align-items: center; 
    padding: 0; 
    background-color: #FFFFFF; 
    text-align: center;
    position: relative;
    z-index: 10; 
    overflow-y: auto; 
  }
  
  /* Class untuk memastikan form card mengisi area dengan baik */
  .right-panel > div {
    width: 100%;
    height: 100%; 
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2rem; 
    position: relative; /* Penting untuk z-index di mobile */
    z-index: 2; /* Agar konten form berada di atas overlay */
  }

  /* --- GLOBAL CSS UNTUK LOGIN FORM --- */
  
  /* 1. Input Field Style */
  .login-input {
    width: 100%;
    padding: 12px;
    border: 1px solid ${LIGHT_GRAY};
    border-radius: 8px;
    box-sizing: border-box;
    transition: border-color 0.3s, box-shadow 0.3s;
    outline: none; 
    color: ${TEXT_COLOR};
  }
  .login-input:focus {
    border-color: ${ACCENT_BLUE}; 
    box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.2); 
  }

  /* 2. Select Field Style */
  .login-select {
    padding: 12px 10px;
    border: 1px solid ${LIGHT_GRAY};
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    color: ${TEXT_COLOR};
    cursor: pointer;
    background-color: #fff;
    outline: none;
    transition: border-color 0.3s, box-shadow 0.3s;
  }
  .login-select:focus {
    border-color: ${ACCENT_BLUE}; 
    box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.2);
  }

  /* 3. Button Style */
  .login-button {
    flex-grow: 1;
    padding: 12px;
    background-color: ${ACCENT_BLUE}; 
    color: #fff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    transition: background-color 0.3s;
    outline: none;
  }
  .login-button:hover {
    background-color: ${HOVER_BLUE};
  }
  .login-button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
    background-color: ${ACCENT_BLUE}; 
  }
  
  /* --- LOGIKA RESPONSIV (Mobile/Layar Kecil) --- */

  @media (max-width: 768px) {
    html, body { 
      height: auto; 
      overflow-y: auto; 
    }
    .container { 
      flex-direction: column; 
      height: auto; 
      min-height: 100vh; 
      overflow: auto; 
    }
    
    .left-panel { 
      display: none; /* Sembunyikan panel kiri */
    }
    
    .right-panel {
      flex: 1;
      width: 100%;
      min-height: 100vh;
      padding: 0; 
      
      /* **PERBAIKAN UTAMA: GAMBAR JADI BACKGROUND** */
      background-image: url(${imageUrl});
      background-size: contain;
      background-position: center;
      background-repeat: no-repeat;
      background-color: #FFFFFF; /* Fallback */
      position: relative; /* Penting untuk overlay */
      
      /* Centering Form */
      display: flex;
      justify-content: center; 
      align-items: center; 
    }
    
    /* **OVERLAY TRANSPARAN** */
    .right-panel::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        /* Overlay Putih 90% Transparan di atas Gambar Background */
        background: rgba(255, 255, 255, 0.9); 
        z-index: 1; 
    }

    .right-panel > div {
        width: 100%;
        max-width: 100%;
        padding: 1.5rem; /* Padding mobile */
        /* Z-index 2 sudah diset di atas, memastikan form di atas overlay */
    }
  }
  
  /* Tablet / Layar Menengah */
  @media (min-width: 769px) and (max-width: 1024px) {
    .left-panel { flex: 1.5; }
    .right-panel { flex: 2.5; padding: 0; }
    .right-panel > div { padding: 2rem; }
  }
`;

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <NotificationProvider> 
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      <div className="container">
        <div className="left-panel">
          <div className="image-container">
            <Image
              src={imageUrl}
              alt="Foto Depan"
              className="photo-style"
              width={700} 
              height={900} 
              sizes="(max-width: 768px) 0vw, (max-width: 1024px) 30vw, 30vw"
              priority
            />
          </div>
        </div>
        <div className="right-panel">
          {children}
        </div>
      </div>
    </NotificationProvider>
  );
}