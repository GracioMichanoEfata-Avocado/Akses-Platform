import { useEffect, useRef, MutableRefObject, RefObject } from 'react';
import { usePathname } from 'next/navigation';
import { scanClickables, ScannedCommand } from '@/lib/voice/dom-scan';
import { speak } from './useTalkback';
import type { PageVoiceCommand } from '@/components/accessibility/TalkbackProvider';

// Narasi otomatis per halaman (dipindah dari TalkbackProvider).
export const PAGE_NARASI: Record<string, string> = {
  '/student/dashboard': 'Beranda. Halaman ini menampilkan jadwal kelas dan materi terbaru.',
  '/student/learn': 'Katalog Materi. Tersedia daftar materi belajar.',
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

  // ── Pengumuman sekali per halaman (narasi + ringkas ≤5 tombol) ──
  const prevPath = useRef('');
  useEffect(() => {
    if (!aktif) return;
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;

    const timer = setTimeout(() => {
      // Halaman ber-perintah-khusus (mis. kuis) memiliki alur suaranya sendiri.
      if ((pageCommandsRef.current?.length ?? 0) > 0) return;

      const narasi =
        Object.entries(PAGE_NARASI).find(
          ([p]) => pathname === p || pathname.startsWith(p + '/')
        )?.[1] || '';

      const labels = (scannedRef.current || []).slice(0, 5).map(c => c.label);
      const tombol = labels.length
        ? ` Tombol tersedia: ${labels.join(
            ', '
          )}. Katakan apa saja untuk daftar lengkap, atau bacakan untuk mendengar isi halaman.`
        : '';

      const teks = (narasi + tombol).trim();
      if (teks) speak(teks, 'interrupt');
    }, 800);

    return () => clearTimeout(timer);
  }, [pathname, aktif, scannedRef, pageCommandsRef]);
}
