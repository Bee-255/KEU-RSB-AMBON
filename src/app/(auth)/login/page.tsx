// src/app/(auth)/login/page.tsx
"use client";

import { useState, useEffect } from "react";
// ... (imports lainnya)
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import { useKeuNotification } from "@/lib/useKeuNotification"; 
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import Image from "next/image";
import React from 'react';

// --- DEFINISI WARNA (Kembali Simpel Biru-Putih) ---
const ACCENT_BLUE = "#1D4ED8"; 
const TEXT_COLOR = "#374151";

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  width: "100%",
  padding: "1rem",
  boxSizing: "border-box",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  padding: "2.5rem 2rem", 
  borderRadius: "16px", 
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  width: "100%",
  maxWidth: "400px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  boxSizing: "border-box",
};

const iconGroupStyle: React.CSSProperties = {
  display: "flex",
  gap: "15px", 
  marginBottom: "1rem",
  justifyContent: "center",
};

const headingStyle: React.CSSProperties = {
  fontSize: "1.5rem", 
  fontWeight: "700", 
  color: ACCENT_BLUE, // Judul Biru
  marginTop: "0.5rem",
  textAlign: "center",
};

const descriptionStyle: React.CSSProperties = {
  fontSize: "1rem",
  color: TEXT_COLOR, // Deskripsi abu-abu gelap
  marginBottom: "2rem", 
  textAlign: "center",
};

const formStyle: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.875rem", 
  fontWeight: "600",
  color: TEXT_COLOR,
  marginBottom: "0.4rem",
};

const inputWrapperStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
};

const passwordToggleStyle: React.CSSProperties = {
  position: "absolute",
  right: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  cursor: "pointer",
  color: ACCENT_BLUE, // Ikon mata Biru
};

const buttonGroupStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  marginTop: "2rem",
  alignItems: "center",
};

// ... (Logika dan fungsi lainnya tetap sama)

const generateYears = (startYear: number, endYear: number) => {
  const years = [];
  for (let i = startYear; i <= endYear; i++) {
    years.push(i);
  }
  return years;
};

export default function LoginPage() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const router = useRouter();
  const years = generateYears(2020, new Date().getFullYear() + 1);
  const { showToast } = useKeuNotification(); 
  
  // ... (useEffect dan handleAuth tetap sama)
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      showToast("Login Gagal. Cek email dan password Anda.", "error"); 
    } else {
      const { error: sessionError } = await supabase.auth.updateUser({
        data: {
          periode_tahun: selectedYear,
        },
      });

      const { data: profile } = await supabase
        .from("profiles")
        .select("nama_lengkap")
        .eq("id", data.user.id)
        .single();
      
      if (!profile || !profile.nama_lengkap) {
        showToast("Login berhasil! Silakan lengkapi data profil Anda.", "success");
        setTimeout(() => {
          setLoading(false); 
          router.push("/profile");
        }, 1500);
      } else {
        showToast("Login berhasil!", "success");
        setTimeout(() => {
          setLoading(false);
          router.push("/dashboard");
        }, 1500);
      }
    }
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };
  
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={iconGroupStyle}>
          <Image
            src="/iconrsbambon.png"
            alt="Icon RS Bambon"
            width={60} 
            height={60}
          />
          <Image
            src="/iconkeu.png"
            alt="Icon Keuangan"
            width={60} 
            height={60}
          />
        </div>
        
        <h2 style={headingStyle}>KEUANGAN RSB AMBON</h2>
        <p style={descriptionStyle}>Login untuk melanjutkan pekerjaan Anda.</p>

        <form onSubmit={handleAuth} style={formStyle}>
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="email" style={labelStyle}>
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Masukkan email Anda"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input" 
            />
          </div>
          <div style={{ marginBottom: "1.5rem" }}>
            <label htmlFor="password" style={labelStyle}>
              Password
            </label>
            <div style={inputWrapperStyle}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Masukkan password Anda"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input" 
              />
              <span
                style={passwordToggleStyle}
                onClick={handleTogglePassword}
              >
                {showPassword ? <FaRegEye /> : <FaRegEyeSlash />}
              </span>
            </div>
          </div>
          
          <div style={buttonGroupStyle}>

            <select
              name="tahun"
              id="tahun"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="login-select"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            
            <button
              type="submit"
              disabled={loading}
              className="login-button"
              style={{
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Memuat..." : "Login"}
            </button>
            
          </div>
        </form>
      </div>
    </div>
  );
}