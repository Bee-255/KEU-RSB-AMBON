// src/app/(auth)/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import { useKeuNotification } from "@/lib/useKeuNotification"; 
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import Image from "next/image";
import React from 'react';

// --- DEFINISI WARNA ---
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
  minHeight: "100vh", 
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
  marginBottom: "1.5rem",
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
  color: ACCENT_BLUE,
  marginTop: "0.5rem",
  textAlign: "center",
};

const descriptionStyle: React.CSSProperties = {
  fontSize: "1rem",
  color: TEXT_COLOR,
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
  color: ACCENT_BLUE,
};

const buttonGroupStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  marginTop: "2rem",
  alignItems: "center",
  justifyContent: "center", 
  width: "100%", 
};

const copyrightStyle: React.CSSProperties = {
  fontSize: "0.875rem", 
  color: TEXT_COLOR,
  opacity: 0.7,
  textAlign: "center",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  fontSize: "14px",
  backgroundColor: "white",
  boxSizing: "border-box" as const,
};

export default function LoginPage() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const router = useRouter();
  const { showToast } = useKeuNotification(); 
  
  // Fetch available years from database
  useEffect(() => {
    const fetchAvailableYears = async () => {
      try {
        const { data, error } = await supabase
          .from('bas_periode')
          .select('tahun')
          .order('tahun', { ascending: false });

        if (error) {
          console.error("Error fetching years:", error);
          return;
        }

        if (data && data.length > 0) {
          const uniqueYears = Array.from(new Set(data.map(item => item.tahun))).sort((a, b) => b - a);
          setAvailableYears(uniqueYears);
          
          // Set default to current year
          const currentYear = new Date().getFullYear();
          const defaultYear = uniqueYears.includes(currentYear) ? currentYear : uniqueYears[0];
          setSelectedYear(String(defaultYear));
        } else {
          // If no years in database, use current year
          const currentYear = new Date().getFullYear();
          setAvailableYears([currentYear]);
          setSelectedYear(String(currentYear));
        }
      } catch (error) {
        console.error("Error in fetchAvailableYears:", error);
        const currentYear = new Date().getFullYear();
        setAvailableYears([currentYear]);
        setSelectedYear(String(currentYear));
      }
    };

    fetchAvailableYears();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !selectedYear) {
      showToast("Harap lengkapi semua field", "warning");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        showToast("Login Gagal. Cek email dan password Anda.", "error"); 
        setLoading(false);
        return;
      }

      // Update user metadata dengan tahun yang dipilih
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          periode_tahun: selectedYear,
        },
      });

      if (updateError) {
        console.error("Error updating user metadata:", updateError);
      }

      // Get user profile
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
    } catch (error: any) {
      console.error("Login error:", error);
      showToast("Terjadi kesalahan saat login", "error");
      setLoading(false);
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
              required
              className="login-input" 
            />
          </div>
          
          <div style={{ marginBottom: "1rem" }}>
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
                required
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

          {/* Tahun Periode Selection */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label htmlFor="tahun" style={labelStyle}>
              Tahun Periode
            </label>
            <select
              id="tahun"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={selectStyle}
              required
            >
              <option value="">-- Pilih Tahun --</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          
          <div style={buttonGroupStyle}>
            <button
              type="submit"
              disabled={loading}
              className="login-button"
              style={{
                cursor: loading ? "not-allowed" : "pointer",
                width: "100%", 
              }}
            >
              {loading ? "Memuat..." : "Login"}
            </button>
          </div>
        </form>
      </div>
      
      <p style={copyrightStyle}>
        &copy; 2025 KEUANGAN RSB AMBON. All Rights Reserved.
      </p>
    </div>
  );
}