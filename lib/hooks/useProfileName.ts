'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Ambil nama profil user yang sedang login. Dipakai sidebar & drawer guru
// yang sama-sama menampilkan nama di footer menu.
export function useProfileName() {
  const [nama, setNama] = useState('');

  useEffect(() => {
    const supabase = createClient();
    async function loadNama() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('nama')
        .eq('id', user.id)
        .single();
      if (data?.nama) setNama(data.nama);
    }
    loadNama();
  }, []);

  return nama;
}
