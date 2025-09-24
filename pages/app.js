import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";

// Perbaikan: Tambahkan gaya untuk menghapus margin dan padding bawaan browser
const fullScreenWrapperStyle = {
  margin: '0px',
  padding: '0px',
  minHeight: '100%',
};

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
          router.push("/dashboard");
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
    if (error.message.includes("User already registered")) {
      setMessage("Email ini sudah terdaftar. Silakan login.");
    } else {
      // ✅ Perubahan di sini: Mengganti pesan error menjadi pesan kustom
      setMessage("Email atau password yang Anda masukkan salah.");
    }
  }
 else {
      setMsgType("success");
      setMessage(isRegisterMode ? "Registrasi berhasil! Silakan lengkapi profil Anda." : "Login berhasil!");

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
          router.push("/dashboard");
        }
      }
    }
  };

  return (
    <div style={fullScreenWrapperStyle}>
      <div style={containerStyle}>
        {/* Bagian Kiri: Tampilkan Foto */}
        <div style={leftPanelStyle}>
          <div style={imageContainerStyle}>
            <img src="/fotodepan.jpeg" alt="Foto Depan" style={photoStyle} />
          </div>
        </div>

        {/* Bagian Kanan: Form Login/Register */}
        <div style={rightPanelStyle}>
          

          {/* Logo iconkeu.png di atas tulisan "Selamat datang" */}
          <div style={iconGroupStyle}>
            <img src="/iconrsbambon.png" alt="Icon RS Bambon" style={smallLogoStyle} />
            <img src="/iconkeu.png" alt="Icon Keuangan" style={smallLogoStyle} />
          </div>

          {/* ✅ Perubahan di sini: Teks dipindahkan dan ditambahkan gaya */}
          <h2 style={rightPanelTitleStyle}>KEUANGAN RSB AMBON</h2>

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
            <button
              type="submit"
              disabled={loading}
              style={{
                ...buttonStyle,
                backgroundColor: isRegisterMode ? "#10b981" : "#2563eb",
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
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
    </div>
  );
}

// Gaya (Styles)
const containerStyle = {
  display: "flex",
  height: "100vh",
  fontFamily: "inter, sans-serif",
};

// ---
// Gaya panel kiri yang sudah diubah
const leftPanelStyle = {
  flex: 0.6,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "#FDFDFD",
  color: "#333",
  padding: "0",
};

const imageContainerStyle = {
  width: "90%",
  height: "90%",
  overflow: "hidden",
};

const photoStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};
// ---

const rightPanelStyle = {
  flex: 0.4,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  padding: "2rem",
  backgroundColor: "#f9fafb",
};

// ✅ Gaya baru untuk tulisan di panel kanan
const rightPanelTitleStyle = {
  fontSize: "1.2rem",
  fontWeight: "bold",
  textTransform: "uppercase",
  color: "#000", // Warna biru
  marginBottom: "10px",
  textAlign: "center",
};

const iconGroupStyle = {
  display: "flex",
  gap: "15px",
  marginBottom: "20px",
};

const smallLogoStyle = {
  width: "80px",
  height: "auto",
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
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
  transition: "background-color 0.3s",
  color: "white",
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