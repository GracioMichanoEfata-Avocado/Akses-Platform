'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Kontras tinggi & Mode Split hanya boleh tampil di halaman aplikasi murid
// yang sudah melewati setup (dashboard, belajar, live, dst) — bukan di layar
// pilih peran ("Masuk sebagai"), bukan di form login guru/murid manapun.
// Halaman itu sendiri (TalkbackProvider / app/student/login/page.tsx) yang
// bertanggung jawab menyalakannya kembali di tempat yang tepat.
export default function ContrastGuard() {
  const pathname = usePathname();

  useEffect(() => {
    const isStudentAppPage = pathname.startsWith('/student') && !pathname.startsWith('/student/login');
    if (!isStudentAppPage && typeof document !== 'undefined') {
      document.body.classList.remove('high-contrast');
      document.body.classList.remove('split-mode');
    }
  }, [pathname]);

  return null;
}
