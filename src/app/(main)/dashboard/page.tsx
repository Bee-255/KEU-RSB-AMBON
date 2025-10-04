// src/app/(main)/dashboard/page.tsx
'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", backgroundColor: "#F3F4F6", minHeight: "100vh" }}>
        <p>Memuat data...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div style={{ padding: "2rem", backgroundColor: "#F3F4F6", minHeight: "100vh" }}>
      <h1>Beranda</h1>
      <p>Selamat datang, **{user.user_metadata.full_name || user.email}**</p>
      <p>Pilih menu di sebelah kiri untuk mulai mengelola data.</p>
    </div>
  );
}