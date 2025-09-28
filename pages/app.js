import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from 'next/image';

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

  /* Gaya untuk layar besar (di atas 768px) */
  .left-panel {
    flex: 0.5; /* Diubah: Mengurangi lebar panel kiri */
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #FCFCFC;
  }

  .right-panel {
    flex: 0.5; /* Diubah: Menambah lebar panel kanan */
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding-right: 15rem;
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
    width: 80%;
    height: 100%;
    object-fit: contain;
    margin-right: -120px; /* Menambahkan margin kanan */
}

  .icon-group {
    display: flex;
    gap: 15px;
    margin-bottom: 20px;
  }

  .right-panel-title {
    font-size: 1.5rem;
    font-weight: bold;
    text-transform: uppercase;
    color: #2b3039ff;
    margin-bottom: 10px;
  }

  /* Media Query untuk layar kecil (ponsel, di bawah 768px) */
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
        flex: 1; /* Diperbaiki: Mengambil seluruh lebar */
        width: 100%; /* Diperbaiki: Mengambil seluruh lebar */
        padding: 1.5rem;
    }
    
    .right-panel-title {
      font-size: 1.2rem;
      margin-top: 2rem;
      margin-bottom: 10px;
    }

    .icon-group {
      margin-bottom: 15px;
    }

    .greeting {
      font-size: 2rem;
    }
    
    .sub-greeting {
      font-size: 0.9rem;
      margin-bottom: 1.5rem;
    }

    .form-style {
      width: 100%;
    }
  }

  /* Media Query untuk lanskap tablet (769px - 1024px) */
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

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState("error");
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const router = useRouter();

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
            
            <div className="icon-group">
              <Image
                src="/iconrsbambon.png"
                alt="Icon RS Bambon"
                className="small-logo"
                width={80}
                height={80}
              />
              <Image
                src="/iconkeu.png"
                alt="Icon Keuangan"
                className="small-logo"
                width={80}
                height={80}
              />
            </div>
            
            <h3 className="greeting">KEUANGAN RSB AMBON</h3>
            
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

const formStyle = {
  width: "100%",
  maxWidth: "400px",
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
  maxWidth: "400px",
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