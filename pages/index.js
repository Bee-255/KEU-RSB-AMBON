import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState("error");
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const router = useRouter();

  // Redirect user jika sudah login
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
          router.push("/PencatatanPasien");
        }
      }
    };
    checkUser();
  }, [router]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    let authResponse;
    if (isRegisterMode) {
      // Registrasi
      authResponse = await supabase.auth.signUp({
        email,
        password,
      });
    } else {
      // Login
      authResponse = await supabase.auth.signInWithPassword({
        email,
        password,
      });
    }

    setLoading(false);
    const { data, error } = authResponse;

    if (error) {
      setMsgType("error");
      // ✅ Perbaikan: Tangani pesan error spesifik dari Supabase
      if (error.message.includes("User already registered")) {
        setMessage("Email ini sudah terdaftar. Silakan login.");
      } else {
        setMessage(error.message || "Terjadi kesalahan!");
      }
    } else {
      setMsgType("success");
      setMessage(isRegisterMode ? "Registrasi berhasil! Silakan lengkapi profil Anda." : "Login berhasil! 🎉");

      if (isRegisterMode) {
        // Jika registrasi, buat profil kosong
        if (data.user) {
          await supabase.from("profiles").insert([{ id: data.user.id, nama_lengkap: "", pekerjaan: "" }]);
        }
        router.push("/profile");
      } else {
        // Cek profil setelah login
        const { data: profile } = await supabase
          .from("profiles")
          .select("nama_lengkap")
          .eq("id", data.user.id)
          .single();
        
        if (!profile || !profile.nama_lengkap) {
          router.push("/profile");
        } else {
          router.push("/PencatatanPasien");
        }
      }
    }
  };

  return (
    <div style={containerStyle}>
      {/* Bagian Kiri: Logo dan Deskripsi */}
      <div style={leftPanelStyle}>
        <div style={contentStyle}>
          <img src="/logo.svg" alt="Logo" style={logoStyle} />
          <h2 style={titleStyle}>Aplikasi Keuangan</h2>
          <p style={subtitleStyle}>Kelola keuanganmu dengan mudah</p>
        </div>
      </div>

      {/* Bagian Kanan: Form Login/Register */}
      <div style={rightPanelStyle}>
        <h1 style={greetingStyle}>Selamat datang</h1>
        <p style={subGreetingStyle}>Silakan {isRegisterMode ? "daftar" : "login"} untuk melanjutkan.</p>

        <form onSubmit={handleAuth} style={formStyle}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? "Memuat..." : (isRegisterMode ? "Daftar" : "Login")}
          </button>
        </form>

        {message && (
          <div style={{ ...messageStyle, backgroundColor: msgType === "error" ? "#fee2e2" : "#dcfce7", color: msgType === "error" ? "#b91c1c" : "#166534" }}>
            {message}
          </div>
        )}

        <p style={switchModeStyle}>
          {isRegisterMode ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
          <button
            onClick={() => setIsRegisterMode(!isRegisterMode)}
            style={switchButtonStyle}
            disabled={loading}
          >
            {isRegisterMode ? "Login" : "Daftar"}
          </button>
        </p>
      </div>
    </div>
  );
}

// Gaya (Styles)
const containerStyle = {
  display: "flex",
  height: "100vh",
  fontFamily: "SF Pro, -apple-system, BlinkMacSystemFont, sans-serif",
};

const leftPanelStyle = {
  flex: 1,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "linear-gradient(135deg, #2563eb, #1e40af)",
  color: "white",
  padding: "2rem",
};

const contentStyle = {
  textAlign: "center",
};

const logoStyle = {
  width: "120px",
  marginBottom: "1rem",
};

const titleStyle = {
  fontSize: "1.8rem",
  fontWeight: "bold",
  margin: "0",
};

const subtitleStyle = {
  marginTop: "0.5rem",
  fontSize: "1rem",
  opacity: "0.9",
};

const rightPanelStyle = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  padding: "2rem",
  backgroundColor: "#f9fafb",
};

const greetingStyle = {
  fontSize: "2rem",
  marginBottom: "1rem",
};

const subGreetingStyle = {
  marginBottom: "2rem",
  color: "#555",
};

const formStyle = {
  width: "100%",
  maxWidth: "320px",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "1rem",
  borderRadius: "8px",
  border: "1px solid #ddd",
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  backgroundColor: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
  transition: "background-color 0.3s",
};

const messageStyle = {
  marginTop: "1rem",
  padding: "10px",
  borderRadius: "8px",
  width: "100%",
  maxWidth: "320px",
  textAlign: "center",
  fontSize: "0.9rem",
  fontWeight: "500",
};

const switchModeStyle = {
  marginTop: "1rem",
  color: "#555",
  textAlign: "center",
};

const switchButtonStyle = {
  color: "#2563eb",
  textDecoration: "none",
  border: "none",
  background: "none",
  cursor: "pointer",
  padding: "0",
  fontWeight: "600",
};