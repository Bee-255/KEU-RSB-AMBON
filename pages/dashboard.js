import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";
import Layout from "../components/Layout"; // ✅ Import komponen Layout

export default function Dashboard() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("nama_lengkap")
          .eq("id", user.id)
          .single();
        if (profile) setFullName(profile.nama_lengkap || "");
      } else {
        router.push("/");
      }
    };
    fetchProfile();
  }, [router]);

  return (
    <Layout fullName={fullName}>
      <h1>Beranda</h1>
      <p>Pilih menu di sebelah kiri untuk mulai mengelola data.</p>
    </Layout>
  );
}