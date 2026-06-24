import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAccessibilityStore } from '@/lib/store/accessibility-store';
import { speak } from './useTalkback';

// Peta perintah suara ke rute
const VOICE_COMMANDS: { keywords: string[]; route: string; konfirmasi: string }[] = [
  {
    keywords: ['beranda', 'dashboard', 'home', 'utama', 'awal'],
    route: '/student/dashboard',
    konfirmasi: 'Membuka beranda.',
  },
  {
    keywords: ['belajar', 'materi', 'pelajaran', 'buka materi', 'katalog'],
    route: '/student/learn',
    konfirmasi: 'Membuka halaman materi belajar.',
  },
  {
    keywords: ['live', 'kelas live', 'kelas', 'langsung', 'siaran'],
    route: '/student/live',
    konfirmasi: 'Membuka kelas live.',
  },
  {
    keywords: ['notifikasi', 'pemberitahuan', 'notif'],
    route: '/student/notifications',
    konfirmasi: 'Membuka notifikasi.',
  },
  {
    keywords: ['profil', 'akun', 'saya', 'pengaturan'],
    route: '/student/profile',
    konfirmasi: 'Membuka profil saya.',
  },
];

export function useVoiceNavigation(aktif: boolean) {
  const router = useRouter();
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);

  const processCommand = useCallback((transcript: string) => {
    const lower = transcript.toLowerCase().trim();
    console.log('[Voice Nav] Mendengar:', lower);

    for (const cmd of VOICE_COMMANDS) {
      if (cmd.keywords.some(k => lower.includes(k))) {
        speak(cmd.konfirmasi, 'interrupt');
        setTimeout(() => router.push(cmd.route), 800);
        return true;
      }
    }

    // Perintah stop
    if (['stop', 'berhenti', 'diam', 'hentikan'].some(k => lower.includes(k))) {
      speak('Navigasi suara dihentikan.', 'interrupt');
      stopVoiceNav();
      return true;
    }

    // Perintah bantuan
    if (['bantuan', 'help', 'apa saja', 'menu apa'].some(k => lower.includes(k))) {
      speak('Perintah yang tersedia: Beranda, Belajar, Kelas Live, Notifikasi, Profil. Atau ucapkan Stop untuk menghentikan.', 'interrupt');
      return true;
    }

    return false;
  }, [router]);

  const startVoiceNav = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      speak('Maaf, browser Anda tidak mendukung navigasi suara. Gunakan Google Chrome.', 'interrupt');
      return;
    }

    if (isListeningRef.current) return;

    const recognition = new SR();
    recognition.lang = 'id-ID';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript;
          processCommand(transcript);
        }
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech') {
        console.error('[Voice Nav] Error:', e.error);
      }
    };

    recognition.onend = () => {
      // Auto restart kalau masih aktif
      if (isListeningRef.current) {
        setTimeout(() => {
          try { recognition.start(); } catch {}
        }, 300);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    isListeningRef.current = true;
  }, [processCommand]);

  const stopVoiceNav = useCallback(() => {
    isListeningRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  useEffect(() => {
    if (aktif) {
      startVoiceNav();
    } else {
      stopVoiceNav();
    }
    return () => stopVoiceNav();
  }, [aktif, startVoiceNav, stopVoiceNav]);

  return { startVoiceNav, stopVoiceNav };
}
