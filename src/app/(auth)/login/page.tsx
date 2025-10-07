// src/app/(auth)/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import Image from "next/image";
import React from 'react';
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import toast, { Toaster } from 'react-hot-toast';

// Gaya CSS
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
  padding: "2rem",
  borderRadius: "12px",
  boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
  width: "100%",
  maxWidth: "400px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  boxSizing: "border-box",
};

const iconGroupStyle: React.CSSProperties = {
  display: "flex",
  gap: "25px",
  marginBottom: "1rem",
  justifyContent: "center",
};

const headingStyle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: "600",
  color: "#1f2937",
  marginTop: "0",
  textAlign: "center",
};

const descriptionStyle: React.CSSProperties = {
  fontSize: "0.9rem",
  color: "#6b7280",
  marginBottom: "1.5rem",
  textAlign: "center",
};

const formStyle: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.875rem",
  fontWeight: "500",
  color: "#4b5563",
  marginBottom: "0.5rem",
};

const inputWrapperStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  boxSizing: "border-box",
};

const passwordToggleStyle: React.CSSProperties = {
  position: "absolute",
  right: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  cursor: "pointer",
  color: "#6b7280",
};

const buttonGroupStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  marginTop: "1.5rem",
  alignItems: "center",
};

const buttonStyle: React.CSSProperties = {
  flexGrow: 1,
  padding: "12px",
  backgroundColor: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
  transition: "background-color 0.3s",
  opacity: 1,
};

const selectStyle: React.CSSProperties = {
  padding: "12px 10px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "1rem",
  fontWeight: "500",
  color: "#4b5563",
  cursor: "pointer",
  backgroundColor: "#fff",
};

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

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("nama_lengkap")
          .eq("id", user.id)
          .single();

        if (!profile || !profile.nama_lengkap) {
          router.push("/profile");
        } else {
          router.push("/dashboard");
        }
      }
    };
    checkUser();
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      toast.error("Login Gagal.");
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
        toast.success("Login berhasil! Silakan lengkapi data profil Anda.");
        setTimeout(() => {
          setLoading(false); 
          router.push("/profile");
        }, 1500);
      } else {
        toast.success("Login berhasil!");
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
      <Toaster position="top-right" />
      <div style={cardStyle}>
        <div style={iconGroupStyle}>
          <Image
            src="/iconrsbambon.png"
            alt="Icon RS Bambon"
            width={80}
            height={80}
          />
          <Image
            src="/iconkeu.png"
            alt="Icon Keuangan"
            width={80}
            height={80}
          />
        </div>
        
        <h2 style={headingStyle}>KEUANGAN RSB AMBON</h2>
        <p style={descriptionStyle}>Login untuk melanjutkan.</p>

        <form onSubmit={handleAuth} style={formStyle}>
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="email" style={labelStyle}>
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
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
              style={selectStyle}
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
              style={{
                ...buttonStyle,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
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