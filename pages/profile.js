import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";

export default function Profile() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  // Ubah nama state dari 'nik' menjadi 'nrpNipNir'
  const [nrpNipNir, setNrpNipNir] = useState("");
  const [pekerjaan, setPekerjaan] = useState("Anggota Polri");
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getUserProfile = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setEmail(user.email);
        
        // Ambil data profil, termasuk nama lengkap, nrp_nip_nir, dan peran
        const { data: profile } = await supabase
          .from("profiles")
          .select("nama_lengkap, nrp_nip_nir, pekerjaan, role")
          .eq("id", user.id)
          .single();

        if (profile) {
          setFullName(profile.nama_lengkap);
          setNrpNipNir(profile.nrp_nip_nir);
          setPekerjaan(profile.pekerjaan);
          setUserRole(profile.role);
        }
      } else {
        router.push("/");
      }
      setLoading(false);
    };
    getUserProfile();
  }, [router]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      nama_lengkap: fullName,
      nrp_nip_nir: nrpNipNir, // Gunakan nama kolom yang baru
      pekerjaan,
      role: userRole || "Operator"
    });

    setLoading(false);

    if (error) {
      alert("Gagal menyimpan profil: " + error.message);
    } else {
      alert("Profil berhasil disimpan!");
      router.push("/dashboard");
    }
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      fontFamily: "SF Pro, sans-serif"
    }}>
      <form onSubmit={handleSaveProfile}
        style={{
          background: "#fff",
          padding: "2rem",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "400px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
        }}
      >
        <h2 style={{ marginBottom: "1rem", textAlign: "center" }}>Lengkapi Profil</h2>

        <label>Email</label>
        <input
          type="email"
          value={email}
          readOnly
          style={{ width: "100%", padding: "10px", marginBottom: "1rem", borderRadius: "8px", border: "1px solid #ddd" }}
        />

        <label>Nama Lengkap</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          style={{ width: "100%", padding: "10px", marginBottom: "1rem", borderRadius: "8px", border: "1px solid #ddd" }}
        />

        <label>NIK / NRP</label>
        <input
          type="text"
          value={nrpNipNir} // Gunakan nama state yang baru
          onChange={(e) => setNrpNipNir(e.target.value)} // Gunakan setter yang baru
          required
          style={{ width: "100%", padding: "10px", marginBottom: "1rem", borderRadius: "8px", border: "1px solid #ddd" }}
        />

        <label>Pekerjaan</label>
        <select
          value={pekerjaan}
          onChange={(e) => setPekerjaan(e.target.value)}
          style={{ width: "100%", padding: "10px", marginBottom: "1rem", borderRadius: "8px", border: "1px solid #ddd" }}
        >
          <option value="Anggota Polri">Anggota Polri</option>
          <option value="ASN">ASN</option>
          <option value="TKK">TKK</option>
        </select>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontWeight: "600",
            cursor: "pointer"
          }}
        >
          {loading ? "Menyimpan..." : "Simpan"}
        </button>
      </form>
    </div>
  );
}