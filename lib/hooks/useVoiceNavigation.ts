import { useEffect, useRef, useCallback, RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { speak, isTTSSpeaking, isTTSSpeakingOrRecentlyEnded, onTTSEnd } from './useTalkback';
import { createClient } from '@/lib/supabase/client';
import type { PageVoiceCommand } from '@/components/accessibility/TalkbackProvider';
import { matchesKeyword } from '@/lib/voice/keyword-match';
import { extractMainContent } from '@/lib/voice/content-read';
import type { ScannedCommand } from '@/lib/voice/dom-scan';

// Hasil pengenalan suara tidak pernah menyertakan tanda baca (titik dua,
// koma, dst), sedangkan judul materi di database sering berformat "Mata
// Pelajaran: Deskripsi". Normalisasi keduanya (buang tanda baca, rapikan
// spasi) sebelum dibandingkan, supaya perbandingan substring tidak gagal
// gara-gara karakter yang memang tidak mungkin terucap.
function normalisasiUcapan(s: string): string {
  return s.toLowerCase().replace(/[.,:;!?'"()\-–—/\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

const STOP_KEYWORDS = ['stop', 'berhenti', 'diam', 'hentikan'];

const STATIC_COMMANDS = [
  { keywords: ['beranda', 'dashboard', 'home', 'utama', 'awal'], route: '/student/dashboard', konfirmasi: 'Membuka beranda.' },
  { keywords: ['belajar', 'materi', 'pelajaran', 'katalog', 'daftar materi'], route: '/student/learn', konfirmasi: 'Membuka halaman materi.' },
  { keywords: ['live', 'kelas live', 'kelas', 'langsung'], route: '/student/live', konfirmasi: 'Membuka kelas live.' },
  { keywords: ['notifikasi', 'pemberitahuan', 'notif'], route: '/student/notifications', konfirmasi: 'Membuka notifikasi.' },
  { keywords: ['profil', 'akun', 'pengaturan'], route: '/student/profile', konfirmasi: 'Membuka profil.' },
];

let materialCache: { judulLower: string; keywords: string[]; route: string; konfirmasi: string }[] = [];
let lastFetch = 0;

async function fetchMaterials() {
  if (Date.now() - lastFetch < 5 * 60 * 1000 && materialCache.length > 0) return materialCache;
  try {
    const supabase = createClient();
    const { data } = await supabase.from('materials').select('id, judul, mata_pelajaran');
    materialCache = (data || []).map(m => ({
      // Judul lengkap dipisah dari keywords lain — dicek terpisah lebih dulu
      // di processCommand (prioritas tertinggi), supaya menyebut judul utuh
      // SELALU membuka materinya meski judulnya mengandung nama mata
      // pelajaran yang juga jadi kata kunci filter halaman Belajar (mis.
      // "Fisika: Siklus Air dan Cuaca" mengandung kata "fisika").
      judulLower: normalisasiUcapan(m.judul),
      keywords: [
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
  pageCommandsRef: RefObject<PageVoiceCommand[]>,
  scannedRef: RefObject<ScannedCommand[]>,
  stopHandlerRef?: RefObject<(() => void) | null>
) {
  const router = useRouter();
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const cooldownRef = useRef(false);

  const processCommand = useCallback(async (transcript: string) => {
    if (cooldownRef.current) return;
    const lower = transcript.toLowerCase().trim();

    // Stop — kalau halaman aktif daftar stop khusus (mis. hentikan video/
    // audio yang lagi jalan), pakai itu dan JANGAN matikan navigasi suara.
    // Baru kalau tidak ada, jatuh ke arti lama: matikan seluruh navigasi suara.
    if (STOP_KEYWORDS.some(k => lower.includes(k))) {
      if (stopHandlerRef?.current) {
        stopHandlerRef.current();
        return;
      }
      speak('Navigasi suara dihentikan.', 'interrupt');
      cooldownRef.current = true;
      isListeningRef.current = false;
      recognitionRef.current?.stop();
      return;
    }

    // ── Judul lengkap materi — prioritas TERTINGGI setelah stop, di atas
    // perintah halaman/filter. Judul penuh (mis. "Fisika: Siklus Air dan
    // Cuaca") sering mengandung nama mata pelajaran yang juga jadi kata
    // kunci filter (mis. "fisika") — kalau filter dicek duluan, menyebut
    // judul lengkap tidak akan pernah membuka materinya, malah cuma
    // menerapkan filter mata pelajarannya saja. Dibandingkan dalam bentuk
    // ternormalisasi (tanpa tanda baca) karena ucapan tidak pernah punya
    // tanda titik dua seperti format judul "Mata Pelajaran: Deskripsi".
    const lowerTanpaTandaBaca = normalisasiUcapan(transcript);
    const matsAwal = await fetchMaterials();
    for (const mat of matsAwal) {
      if (mat.judulLower.length > 4 && lowerTanpaTandaBaca.includes(mat.judulLower)) {
        cooldownRef.current = true;
        speak(mat.konfirmasi, 'interrupt');
        setTimeout(() => {
          router.push(mat.route);
          setTimeout(() => { cooldownRef.current = false; }, 2000);
        }, 1200);
        return;
      }
    }

    // ── 1. Perintah halaman aktif (tombol, aksi) ── dicek sebelum
    // bantuan/bacakan generik di bawah, karena kata kunci perintah halaman
    // (mis. "ada materi apa aja") bisa mengandung frasa yang sama dengan
    // trigger generik (mis. "apa aja") — kalau generik dicek duluan, perintah
    // spesifik halaman itu tidak akan pernah tercapai/ke-trigger.
    const pageCmds = pageCommandsRef.current || [];
    for (const cmd of pageCmds) {
      if (cmd.keywords.some(k => matchesKeyword(lower, k, cmd.matchType ?? 'includes'))) {
        cooldownRef.current = true;
        speak(`${cmd.label}.`, 'interrupt');
        setTimeout(() => {
          cmd.action();
          setTimeout(() => { cooldownRef.current = false; }, 2000);
        }, 600);
        return;
      }
    }

    // Bantuan / daftar tombol
    if (['bantuan', 'help', 'apa saja', 'apa aja', 'tombol apa', 'perintah'].some(k => lower.includes(k))) {
      const scanned = scannedRef.current || [];
      const labels = [...pageCmds.map(c => c.label), ...scanned.map(c => c.label)]
        .filter((l, i, arr) => arr.findIndex(x => x.toLowerCase() === l.toLowerCase()) === i);
      if (labels.length > 0) {
        speak(`Tombol tersedia: ${labels.join(', ')}. Atau ucapkan nama menu: Beranda, Belajar, Kelas Live, Notifikasi, Profil.`, 'interrupt');
      } else {
        speak('Ucapkan nama menu: Beranda, Belajar, Kelas Live, Notifikasi, Profil. Atau ucapkan nama materi langsung.', 'interrupt');
      }
      return;
    }

    // Bacakan konten utama halaman
    if (['bacakan', 'baca halaman', 'baca konten', 'bacakan konten', 'bacakan halaman'].some(k => lower.includes(k))) {
      const teks = extractMainContent(document.body);
      speak(teks || 'Tidak ada konten untuk dibacakan di halaman ini.', 'interrupt');
      return;
    }

    // ── 2. Navigasi menu utama ──
    for (const cmd of STATIC_COMMANDS) {
      if (cmd.keywords.some(k => lower.includes(k))) {
        cooldownRef.current = true;
        speak(cmd.konfirmasi, 'interrupt');
        setTimeout(() => {
          // router.push (bukan window.location.href): navigasi SPA biasa,
          // tidak me-reload/remount seluruh halaman. Hard reload sebelumnya
          // me-reset ref "sudah diumumkan di halaman ini" di useAutoVoiceScan,
          // sehingga narasi halaman terucap lagi, kedengar mic lagi, pindah
          // lagi — looping tanpa henti.
          router.push(cmd.route);
          setTimeout(() => { cooldownRef.current = false; }, 2000);
        }, 1200);
        return;
      }
    }

    // ── Tombol hasil auto-scan (skip bila halaman punya perintah khusus) ──
    if ((pageCommandsRef.current?.length ?? 0) === 0) {
      for (const cmd of (scannedRef.current || [])) {
        if (cmd.keywords.some(k => matchesKeyword(lower, k, cmd.matchType))) {
          cooldownRef.current = true;
          speak(`Membuka ${cmd.label}.`, 'interrupt');
          setTimeout(() => {
            try { cmd.el.click(); } catch {}
            setTimeout(() => { cooldownRef.current = false; }, 2000);
          }, 600);
          return;
        }
      }
    }

    // ── 3. Materi dari database ──
    const mats = await fetchMaterials();
    for (const mat of mats) {
      if (mat.keywords.some(k => lower.includes(k))) {
        cooldownRef.current = true;
        speak(mat.konfirmasi, 'interrupt');
        setTimeout(() => {
          router.push(mat.route);
          setTimeout(() => { cooldownRef.current = false; }, 2000);
        }, 1200);
        return;
      }
    }
  }, [router, pageCommandsRef, scannedRef, stopHandlerRef]);

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
      if (cooldownRef.current) return;
      // Grace period setelah TTS berhenti bicara: hasil pengenalan suara
      // sering baru muncul beberapa ratus ms SETELAH audio TTS benar-benar
      // selesai (mic sempat "dengar" ekor suaranya sendiri). Selama TTS masih
      // bicara/baru saja selesai, SEMUA hasil diabaikan KECUALI kata "stop"
      // dkk — supaya user tetap bisa menghentikan video/audio yang panjang
      // meski lagi diputar, tanpa membuka celah mic salah dengar ucapan TTS
      // sendiri untuk perintah lain.
      const sedangBicara = isTTSSpeakingOrRecentlyEnded();
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (!event.results[i].isFinal) continue;
        const transcript = event.results[i][0].transcript;
        if (sedangBicara) {
          const lower = transcript.toLowerCase();
          if (STOP_KEYWORDS.some(k => lower.includes(k))) {
            processCommand(transcript);
          }
          continue;
        }
        processCommand(transcript);
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