import { useEffect, useRef, useCallback, RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { speak, isTTSSpeaking, onTTSEnd } from './useTalkback';
import { createClient } from '@/lib/supabase/client';
import type { PageVoiceCommand } from '@/components/accessibility/TalkbackProvider';

const STATIC_COMMANDS = [
  { keywords: ['beranda', 'dashboard', 'home', 'utama', 'awal'], route: '/student/dashboard', konfirmasi: 'Membuka beranda.' },
  { keywords: ['belajar', 'materi', 'pelajaran', 'katalog', 'daftar materi'], route: '/student/learn', konfirmasi: 'Membuka halaman materi.' },
  { keywords: ['live', 'kelas live', 'kelas', 'langsung'], route: '/student/live', konfirmasi: 'Membuka kelas live.' },
  { keywords: ['notifikasi', 'pemberitahuan', 'notif'], route: '/student/notifications', konfirmasi: 'Membuka notifikasi.' },
  { keywords: ['profil', 'akun', 'pengaturan'], route: '/student/profile', konfirmasi: 'Membuka profil.' },
];

let materialCache: { keywords: string[]; route: string; konfirmasi: string }[] = [];
let lastFetch = 0;

async function fetchMaterials() {
  if (Date.now() - lastFetch < 5 * 60 * 1000 && materialCache.length > 0) return materialCache;
  try {
    const supabase = createClient();
    const { data } = await supabase.from('materials').select('id, judul, mata_pelajaran');
    materialCache = (data || []).map(m => ({
      keywords: [
        m.judul.toLowerCase(),
        m.judul.split(':')[0].trim().toLowerCase(),
        m.judul.split(' ')[0].toLowerCase(),
        m.mata_pelajaran.toLowerCase(),
      ].filter((k, i, arr) => k.length > 2 && arr.indexOf(k) === i),
      route: `/student/learn/${m.id}`,
      konfirmasi: `Membuka materi ${m.judul}.`,
    }));
    lastFetch = Date.now();
    return materialCache;
  } catch { return []; }
}

export function useVoiceNavigation(
  aktif: boolean,
  pageCommandsRef: RefObject<PageVoiceCommand[]>
) {
  const router = useRouter();
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const cooldownRef = useRef(false);

  const processCommand = useCallback(async (transcript: string) => {
    if (cooldownRef.current) return;
    const lower = transcript.toLowerCase().trim();

    // Stop
    if (['stop', 'berhenti', 'diam', 'hentikan'].some(k => lower.includes(k))) {
      speak('Navigasi suara dihentikan.', 'interrupt');
      cooldownRef.current = true;
      isListeningRef.current = false;
      recognitionRef.current?.stop();
      return;
    }

    // Bantuan
    if (['bantuan', 'help', 'apa saja', 'perintah'].some(k => lower.includes(k))) {
      const pageCmds = pageCommandsRef.current || [];
      const pageHelp = pageCmds.length > 0
        ? ` Di halaman ini tersedia: ${pageCmds.map(c => c.label).join(', ')}.`
        : '';
      speak(`Ucapkan nama menu: Beranda, Belajar, Kelas Live, Notifikasi, Profil.${pageHelp} Atau ucapkan nama materi langsung.`, 'interrupt');
      return;
    }

    // ── 1. Perintah halaman aktif (tombol, aksi) ──
    const pageCmds = pageCommandsRef.current || [];
    for (const cmd of pageCmds) {
      if (cmd.keywords.some(k => lower.includes(k.toLowerCase()))) {
        cooldownRef.current = true;
        speak(`${cmd.label}.`, 'interrupt');
        setTimeout(() => {
          cmd.action();
          setTimeout(() => { cooldownRef.current = false; }, 2000);
        }, 600);
        return;
      }
    }

    // ── 2. Navigasi menu utama ──
    for (const cmd of STATIC_COMMANDS) {
      if (cmd.keywords.some(k => lower.includes(k))) {
        cooldownRef.current = true;
        speak(cmd.konfirmasi, 'interrupt');
        setTimeout(() => {
          window.location.href = cmd.route;
        }, 1200);
        return;
      }
    }

    // ── 3. Materi dari database ──
    const mats = await fetchMaterials();
    for (const mat of mats) {
      if (mat.keywords.some(k => lower.includes(k))) {
        cooldownRef.current = true;
        speak(mat.konfirmasi, 'interrupt');
        setTimeout(() => {
          window.location.href = mat.route;
        }, 1200);
        return;
      }
    }
  }, [router, pageCommandsRef]);

  const start = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || isListeningRef.current) return;

    const rec = new SR();
    rec.lang = 'id-ID';
    rec.continuous = true;
    rec.interimResults = false;
    rec.maxAlternatives = 3;

    rec.onresult = (event: any) => {
      if (isTTSSpeaking() || cooldownRef.current) return;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          processCommand(event.results[i][0].transcript);
        }
      }
    };

    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed') {
        speak('Izin mikrofon ditolak. Aktifkan mikrofon di pengaturan browser.', 'interrupt');
        isListeningRef.current = false;
      }
    };

    rec.onend = () => {
      if (!isListeningRef.current) return;
      if (isTTSSpeaking()) {
        onTTSEnd(() => setTimeout(() => { if (isListeningRef.current) { try { rec.start(); } catch {} } }, 300));
      } else {
        setTimeout(() => { if (isListeningRef.current) { try { rec.start(); } catch {} } }, 300);
      }
    };

    rec.start();
    recognitionRef.current = rec;
    isListeningRef.current = true;
    fetchMaterials(); // pre-fetch
  }, [processCommand]);

  const stop = useCallback(() => {
    isListeningRef.current = false;
    cooldownRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  useEffect(() => {
    if (aktif) start();
    else stop();
    return () => stop();
  }, [aktif, start, stop]);

  return { start, stop };
}