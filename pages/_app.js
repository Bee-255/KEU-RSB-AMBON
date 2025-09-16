import "../styles/globals.css";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import Layout from "../components/Layout";

function MyApp({ Component, pageProps }) {
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("nama_lengkap")
          .eq("id", user.id)
          .single();
        if (profile) {
          setFullName(profile.nama_lengkap);
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '24px' }}>
        Loading...
      </div>
    );
  }

  return (
    <Layout fullName={fullName}>
      <Component {...pageProps} />
    </Layout>
  );
}

export default MyApp;