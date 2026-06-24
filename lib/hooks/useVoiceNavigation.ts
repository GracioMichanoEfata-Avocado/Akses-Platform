import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAccessibilityStore } from '@/lib/store/accessibility-store';
import { speak, isTTSSpeaking, onTTSEnd } from './useTalkback';
import { createClient } from '@/lib/supabase/client';

interface DynamicCommand {
  keywords: string[];
  route: string;
  konfirmasi: string;
}

// Perintah navigasi menu utama
const STATIC_COMMANDS: DynamicCommand[] = [
  { keywords: ['beranda', 'dashboard', 'home', 'utama', 'awal'], route: '/student/dashboard', konfirmasi: 'Membuka beranda.' },
  { keywords: ['belajar', 'materi', 'pelajaran', 'katalog', 'daftar materi'], route: '/student/learn', konfirmasi: 'Membuka halaman materi belajar.' },
  { keywords: ['live', 'kelas live', 'kelas', 'langsung', 'siaran'], route: '/student/live', konfirmasi: 'Membuka kelas live.' },
  { keywords: ['notifikasi', 'pemberitahuan', 'notif'], route: '/student/notifications', konfirmasi: 'Membuka notifikasi.' },
  { keywords: ['profil', 'akun', 'pengaturan'], route: '/student/profile', konfirmasi: 'Membuka profil saya.' },
];

// Cache materi supaya ga fetch ulang tiap render
let materialCommandsCache: DynamicCommand[] = [];
let lastFetchTime = 0;

async function fetchMaterialCommands(): Promise<DynamicCommand[]> {
  // Cache selama 5 menit
  if (Date.now() - lastFetchTime < 5 * 60 * 1000 && materialCommandsCache.length > 0) {
    return materialCommandsCache;
  }

  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('materials')
      .select('id, judul, mata_pelajaran')
      .order('created_at', { ascending: false });

    materialCommandsCache = (data || []).map(m => ({
      keywords: [
        m.judul.toLowerCase(),
        // Kata pertama dari judul saja (misal "Ekosistem" dari "Ekosistem Laut")
        m.judul.split(':')[0].trim().toLowerCase(),
        m.judul.split(' ')[0].toLowerCase(),
        m.mata_pelajaran.toLowerCase(),
      ].filter((k, i, arr) => arr.indexOf(k) === i), // deduplicate
      route: `/student/learn/${m.id}`,
      konfirmasi: `Membuka materi ${m.judul}.`,
    }));

    lastFetchTime = Date.now();
    return materialCommandsCache;
  } catch {
    return [];
  }
}

export function useVoiceNavigation(aktif: boolean) {
  const router = useRouter();
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const cooldownRef = useRef(false); // Cegah double-trigger

  const pauseWhileSpeaking = useCallback((cb: () => void) => {
    if (isTTSSpeaking()) {
      // Tunggu TTS selesai dulu baru jalankan
      onTTSEnd(cb);
    } else {
      cb();
    }
  }, []);

  const processCommand = useCallback(async (transcript: string) => {
    if (cooldownRef.current) return; // Masih cooldown, skip
    const lower = transcript.toLowerCase().trim();

    // Perintah stop
    if (['stop', 'berhenti', 'diam', 'hentikan'].some(k => lower.includes(k))) {
      speak('Navigasi suara dihentikan.', 'interrupt');
      stopRecognition();
      return;
    }

    // Perintah bantuan
    if (['bantuan', 'help', 'apa saja', 'menu apa', 'perintah'].some(k => lower.includes(k))) {
      speak('Ucapkan nama menu: Beranda, Belajar, Kelas Live, Notifikasi, Profil. Atau ucapkan nama materi langsung untuk membukanya.', 'interrupt');
      return;
    }

    // Cek perintah menu utama dulu
    for (const cmd of STATIC_COMMANDS) {
      if (cmd.keywords.some(k => lower.includes(k))) {
        cooldownRef.current = true;
        speak(cmd.konfirmasi, 'interrupt');
        setTimeout(() => {
          router.push(cmd.route);
          // Reset cooldown setelah navigasi + delay
          setTimeout(() => { cooldownRef.current = false; }, 3000);
        }, 800);
        return;
      }
    }

    // Cek perintah materi dinamis
    const materialCmds = await fetchMaterialCommands();
    for (const cmd of materialCmds) {
      if (cmd.keywords.some(k => k.length > 2 && lower.includes(k))) {
        cooldownRef.current = true;
        speak(cmd.konfirmasi, 'interrupt');
        setTimeout(() => {
          router.push(cmd.route);
          setTimeout(() => { cooldownRef.current = false; }, 3000);
        }, 800);
        return;
      }
    }

  }, [router]);

  const startRecognition = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || isListeningRef.current) return;

    const recognition = new SR();
    recognition.lang = 'id-ID';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: any) => {
      // KUNCI: Jangan proses kalau TTS lagi ngomong (cegah feedback loop)
      if (isTTSSpeaking()) return;
      if (cooldownRef.current) return;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          processCommand(event.results[i][0].transcript);
        }
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error === 'not-allowed') {
        speak('Izin mikrofon ditolak. Aktifkan mikrofon di pengaturan browser.', 'interrupt');
        isListeningRef.current = false;
      }
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        // Restart setelah TTS selesai ngomong (bukan langsung)
        pauseWhileSpeaking(() => {
          setTimeout(() => {
            if (isListeningRef.current) {
              try { recognition.start(); } catch {}
            }
          }, 500);
        });
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    isListeningRef.current = true;

    // Pre-fetch materi supaya siap dipakai
    fetchMaterialCommands();
  }, [processCommand, pauseWhileSpeaking]);

  const stopRecognition = useCallback(() => {
    isListeningRef.current = false;
    cooldownRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  useEffect(() => {
    if (aktif) {
      startRecognition();
    } else {
      stopRecognition();
    }
    return () => stopRecognition();
  }, [aktif, startRecognition, stopRecognition]);

  return { startRecognition, stopRecognition };
}