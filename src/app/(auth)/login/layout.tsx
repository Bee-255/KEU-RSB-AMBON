// src/app/(auth)/layout.tsx
import { ReactNode } from "react";
import Image from "next/image";
// Menggunakan NotificationProvider yang Anda kirimkan
import { NotificationProvider } from "@/lib/usekeuNotification"; 

interface AuthLayoutProps {
  children: ReactNode;
}

const responsiveStyles = `
  body {
    margin: 0;
    padding: 0;
  }
  .full-screen-wrapper {
    margin: 0;
    padding: 0;
    min-height: 100vh;
    box-sizing: border-box;
  }
  .container {
    display: flex;
    height: 100vh;
    font-family: 'Inter', sans-serif;
  }
  .left-panel {
    flex: 1; 
    display: flex;
    justify-content: flex-start; /* Mengatur alignment ke kiri */
    align-items: center;
    background-color: #FCFCFC;
  }
  .right-panel {
    flex: 1; 
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 2rem 10rem;
    background-color: #f9fafb;
    text-align: center;
  }
  .image-container {
    width: 100%;
    max-height: 100vh;
    overflow: visible;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .photo-style {
    width: 100%; 
    height: 100%;
    object-fit: contain;
    margin-right: -20px; 
    margin-left: 100px; /* Tambahkan margin kiri untuk menggeser foto ke kanan */
  }
  @media (max-width: 768px) {
    .container {
      flex-direction: column;
      height: auto;
      min-height: 100vh;
    }
    .left-panel {
      display: none;
    }
    .right-panel {
      flex: 1;
      width: 100%;
      padding: 1.5rem;
    }
    .right-panel-title {
      margin-top: 2rem;
    }
  }
  @media (min-width: 769px) and (max-width: 1024px) {
    .left-panel {
      flex: 0.5;
    }
    .right-panel {
      flex: 0.5;
      padding: 1.5rem;
    }
    .image-container {
      width: 100%;
      height: 100%;
    }
  }
`;

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    // Pembungkus NotificationProvider ditambahkan di sini
    <NotificationProvider> 
      <style dangerouslySetInnerHTML={{ __html: responsiveStyles }} />
      <div className="full-screen-wrapper">
        <div className="container">
          <div className="left-panel">
            <div className="image-container">
              <Image
                src="/fotodepan.jpeg"
                alt="Foto Depan"
                className="photo-style"
                width={700} 
                height={900} 
                sizes="(max-width: 768px) 0vw, 50vw"
                priority
              />
            </div>
          </div>
          <div className="right-panel">
            {children}
          </div>
        </div>
      </div>
    </NotificationProvider> // Akhir dari NotificationProvider
  );
}