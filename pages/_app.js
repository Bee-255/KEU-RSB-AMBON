// pages/_app.js

import { useEffect, useState } from 'react';
import 'react-toastify/dist/ReactToastify.css';
import { useRouter } from 'next/router';
import { supabase } from '@/utils/supabaseClient';
import Layout from '@/components/Layout';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const getSessionAndProfile = async () => {
      // 1. Dapatkan sesi pengguna saat ini
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      // 2. Jika ada sesi, ambil data dari tabel 'profiles'
      if (session) {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('nama_lengkap')
          .eq('id', session.user.id)
          .single();

        if (profileData) {
          setUserProfile(profileData);
        } else if (error) {
          console.error("Error fetching user profile:", error);
          setUserProfile(null); // Atur ke null jika ada error
        }
      }
      setLoading(false);
    };

    getSessionAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        // Reset profil jika logout
        if (event === 'SIGNED_OUT') {
          setUserProfile(null);
          router.push('/');
        }
      }
    );

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [router]);

  const fullName = userProfile?.nama_lengkap || '';
  const noLayoutRoutes = ['/', '/login', '/register'];
  const showLayout = session && !noLayoutRoutes.includes(router.pathname);

  if (loading) {
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(255,255,255,0.85)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      flexDirection: "column"
    }}>
      <div style={{
        width: 48,
        height: 48,
        border: "5px solid #2563eb",
        borderTop: "5px solid #e0e7ef",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
        marginBottom: "1rem"
      }} />
      <span style={{ color: "#2563eb", fontWeight: 600, fontSize: "1.1rem", letterSpacing: 1 }}>Loading...</span>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg);}
          100% { transform: rotate(360deg);}
        }
      `}</style>
    </div>
  );
}

  if (showLayout) {
    return (
      <Layout fullName={fullName}>
        <Component {...pageProps} />
      </Layout>
    );
  }

  return <Component {...pageProps} />;
}

export default MyApp;