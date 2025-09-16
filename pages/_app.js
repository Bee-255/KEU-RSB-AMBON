// pages/_app.js

import { useEffect, useState } from 'react';
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
    return <div>Loading...</div>;
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