import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";
import Head from "next/head"; // Import Head dari Next.js

const fullScreenWrapperStyle = {
  margin: '0',
  padding: '0',
  minHeight: '100vh',
  boxSizing: 'border-box',
};

// Menambahkan gaya responsif dengan media queries di sini
const responsiveStyles = `
  .container {
    display: flex;
    height: 100vh;
    font-family: 'Inter', sans-serif;
  }

  /* Gaya untuk layar besar (default, di atas 768px) */
  .left-panel {
    flex: 0.6;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #FDFDFD;
    color: #333;
    padding: 0;
  }

  .right-panel {
    flex: 0.4;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 2rem;
    background-color: #f9fafb;
    text-align: center;
  }

  /* Media Query untuk layar kecil (ponsel, di bawah 768px) */
  @media (max-width: 768px) {
    .container {
      flex-direction: column; /* Mengubah arah menjadi kolom */
    }
    
    .left-panel, .right-panel {
      flex: 1; /* Setiap panel mengambil seluruh lebar */
      width: 100%;
      min-height: 50vh; /* Setengah layar untuk setiap panel */
    }

    .left-panel {
        display: none; /* Menyembunyikan panel gambar di mode potret mobile */
    }

    .right-panel {
        padding: 1.5rem;
    }

    .greeting-text {
      font-size: 1.5rem; /* Ukuran font lebih kecil */
      margin-bottom: 0.5rem;
    }
    
    .sub-greeting-text {
      font-size: 0.9rem;
      margin-bottom: 1.5rem;
    }

    .icon-group {
      margin-top: -30px; /* Geser ikon sedikit ke atas */
    }
  }

  /* Media Query untuk lanskap tablet (768px - 1024px) */
  @media (min-width: 769px) and (max-width: 1024px) {
    .right-panel {
      padding: 1rem;
    }
  }
`;

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
      authResponse = await supabase.auth.signUp({
        email,
        password,
      });
    } else {
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
        setMessage("Email atau password yang Anda masukkan salah.");
      }
    } else {
      setMsgType("success");
      setMessage(isRegisterMode ? "Registrasi berhasil! Silakan lengkapi profil Anda." : "Login berhasil!");

      if (isRegisterMode) {
        if (data.user) {
          await supabase.from("profiles").insert([{ id: data.user.id, nama_lengkap: "", pekerjaan: "" }]);
        }
        router.push("/profile");
      } else {
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
    <>
      <Head>
        <style dangerouslySetInnerHTML={{ __html: responsiveStyles }} />
      </Head>
      <div style={fullScreenWrapperStyle}>
        <div className="container">
          <div className="left-panel">
            <div style={imageContainerStyle}>
              <img src="/fotodepan.jpeg" alt="Foto Depan" style={photoStyle} />
            </div>
          </div>

          <div className="right-panel">
            <h2 style={rightPanelTitleStyle}>KEUANGAN RSB AMBON</h2>
            <div className="icon-group">
              <img src="/iconrsbambon.png" alt="Icon RS Bambon" style={smallLogoStyle} />
              <img src="/iconkeu.png" alt="Icon Keuangan" style={smallLogoStyle} />
            </div>
            
            <h1 className="greeting-text">Selamat datang</h1>
            <p className="sub-greeting-text">Silakan {isRegisterMode ? "daftar" : "login"} untuk melanjutkan.</p>
            
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
            
            <p className="switch-mode">
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
    </>
  );
}

// Gaya (Styles)
// Catatan: Gaya ini akan di override oleh media query di atas
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

const rightPanelTitleStyle = {
  fontSize: "1.2rem",
  fontWeight: "bold",
  textTransform: "uppercase",
  color: "#000",
  marginBottom: "10px",
  textAlign: "center",
};

const smallLogoStyle = {
  width: "80px",
  height: "auto",
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

const switchButtonStyle = {
  color: "#2563eb",
  textDecoration: "none",
  border: "none",
  background: "none",
  cursor: "pointer",
  padding: "0",
  fontWeight: "600",
};