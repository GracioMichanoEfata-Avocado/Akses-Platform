import { useEffect, useRef, MutableRefObject, RefObject } from 'react';
import { usePathname } from 'next/navigation';
import { scanClickables, ScannedCommand } from '@/lib/voice/dom-scan';
import { speak } from './useTalkback';
import type { PageVoiceCommand } from '@/components/accessibility/TalkbackProvider';

// Narasi otomatis per halaman (dipindah dari TalkbackProvider).
export const PAGE_NARASI: Record<string, string> = {
  '/student/dashboard': 'Halo, selamat datang di AKSES. Berikan perintah suara Anda. Menu: Belajar, Kelas Live, Notifikasi, Profil.',
  '/student/learn': 'Katalog Materi. Sebutkan mata pelajaran, misalnya Matematika atau Fisika, untuk membuka materinya.',
  '/student/live': 'Kelas Live.',
  '/student/notifications': 'Notifikasi.',
  '/student/profile': 'Profil Saya.',
};

export function useAutoVoiceScan(
  aktif: boolean,
  scannedRef: MutableRefObject<ScannedCommand[]>,
  pageCommandsRef: RefObject<PageVoiceCommand[]>
) {
  const pathname = usePathname();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Live scan via MutationObserver ──
  useEffect(() => {
    if (!aktif) {
      scannedRef.current = [];
      return;
    }
    const rescan = () => {
      // Halaman ber-perintah-khusus (mis. kuis) tidak memakai hasil scan;
      // lewati agar mutasi rutin (timer kuis tiap detik) tak memicu scan sia-sia.
      if ((pageCommandsRef.current?.length ?? 0) > 0) return;
      // Filter visibilitas layout di runtime (offsetParent tak andal di jsdom).
      // offsetParent===null menyaring elemen tak terlihat DAN position:fixed
      // (sidebar/bottom-nav) — sengaja: navigasi itu sudah ditangani menu statis.
      scannedRef.current = scanClickables(document.body).filter(
        c => c.el.offsetParent !== null
      );
    };
    rescan();
    const obs = new MutationObserver(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(rescan, 400);
    });
    obs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'aria-hidden', 'hidden'],
    });
    return () => {
      obs.disconnect();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [aktif, scannedRef]);

  // ── Pengumuman sekali per halaman (cuma narasi singkat, tanpa daftar tombol) ──
  const prevPath = useRef('');
  useEffect(() => {
    if (!aktif) return;
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;

    const timer = setTimeout(() => {
      // Halaman ber-perintah-khusus (mis. kuis) memiliki alur suaranya sendiri.
      if ((pageCommandsRef.current?.length ?? 0) > 0) return;

      // Kecocokan PERSIS saja (bukan prefix/startsWith): sebelumnya halaman
      // seperti /student/learn/[id] ikut kebagian narasi /student/learn
      // ("Katalog Materi...") padahal itu bukan halaman katalog. Halaman
      // dinamis yang perlu narasi sendiri (mis. detail materi) mengatur
      // narasinya sendiri-sendiri lewat registerPageCommands.
      const narasi = PAGE_NARASI[pathname] || '';

      if (narasi) speak(narasi, 'interrupt');
    }, 800);

    return () => clearTimeout(timer);
  }, [pathname, aktif, pageCommandsRef]);
}
