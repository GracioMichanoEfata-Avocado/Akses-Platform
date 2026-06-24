'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAccessibilityStore } from '@/lib/store/accessibility-store';
import { speak, stopSpeaking } from '@/lib/hooks/useTalkback';
import { useVoiceNavigation } from '@/lib/hooks/useVoiceNavigation';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

// Narasi per halaman
const PAGE_NARASI: Record<string, string> = {
  '/student/dashboard': 'Beranda. Selamat datang di AKSES. Halaman ini menampilkan jadwal kelas, progress belajar, dan materi terbaru. Ucapkan nama menu untuk navigasi.',
  '/student/learn': 'Halaman Materi Belajar. Di sini tersedia daftar materi pelajaran. Anda dapat menelusuri dan memilih materi yang ingin dipelajari.',
  '/student/live': 'Halaman Kelas Live. Di sini Anda dapat bergabung ke kelas yang sedang berlangsung secara langsung.',
  '/student/notifications': 'Halaman Notifikasi. Di sini ditampilkan pemberitahuan terbaru dari guru dan sistem.',
  '/student/profile': 'Halaman Profil. Di sini Anda dapat melihat dan mengubah pengaturan aksesibilitas dan data diri.',
};

interface TalkbackContextType {
  isTalkbackAktif: boolean;
  isVoiceNavAktif: boolean;
  toggleVoiceNav: () => void;
  speakText: (text: string) => void;
}

const TalkbackContext = createContext<TalkbackContextType>({
  isTalkbackAktif: false,
  isVoiceNavAktif: false,
  toggleVoiceNav: () => {},
  speakText: () => {},
});

export function useTalkbackContext() {
  return useContext(TalkbackContext);
}

export default function TalkbackProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { mode, ttsEnabled } = useAccessibilityStore();
  const isTunanetra = mode === 'tunanetra' || mode === 'both';
  const isTalkbackAktif = isTunanetra || ttsEnabled;

  const [isVoiceNavAktif, setIsVoiceNavAktif] = useState(false);
  const prevPathRef = useRef('');

  // Auto voice nav kalau tunanetra
  useEffect(() => {
    if (isTunanetra) {
      setIsVoiceNavAktif(true);
    }
  }, [isTunanetra]);

  useVoiceNavigation(isVoiceNavAktif && isTunanetra);

  // Auto narasi saat pindah halaman
  useEffect(() => {
    if (!isTalkbackAktif) return;
    if (pathname === prevPathRef.current) return;
    prevPathRef.current = pathname;

    // Cari narasi yang cocok
    const narasi = Object.entries(PAGE_NARASI).find(([path]) =>
      pathname === path || pathname.startsWith(path + '/')
    );

    if (narasi) {
      setTimeout(() => speak(narasi[1], 'interrupt'), 700);
    }
  }, [pathname, isTalkbackAktif]);

  const toggleVoiceNav = () => {
    const next = !isVoiceNavAktif;
    setIsVoiceNavAktif(next);
    speak(next ? 'Navigasi suara aktif. Ucapkan nama menu untuk berpindah halaman.' : 'Navigasi suara dinonaktifkan.', 'interrupt');
  };

  if (!isTalkbackAktif) {
    return <>{children}</>;
  }

  return (
    <TalkbackContext.Provider value={{ isTalkbackAktif, isVoiceNavAktif, toggleVoiceNav, speakText: speak }}>
      {children}

      {/* Floating bar kontrol Talkback */}
      <div
        className="fixed bottom-20 sm:bottom-6 right-4 z-50 flex flex-col gap-2 items-end"
        role="region"
        aria-label="Kontrol aksesibilitas suara"
      >
        {/* Indikator voice nav aktif */}
        {isVoiceNavAktif && (
          <div className="flex items-center gap-2 bg-blue-800 text-white text-xs px-3 py-1.5 rounded-full shadow-lg animate-pulse">
            <Mic size={12} />
            <span>Mendengarkan perintah suara...</span>
          </div>
        )}

        {/* Tombol toggle voice nav */}
        <button
          onClick={toggleVoiceNav}
          className={`w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all ${
            isVoiceNavAktif
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-blue-800 hover:bg-blue-700 text-white'
          }`}
          aria-label={isVoiceNavAktif ? 'Matikan navigasi suara' : 'Aktifkan navigasi suara'}
          title={isVoiceNavAktif ? 'Matikan navigasi suara' : 'Aktifkan navigasi suara'}
        >
          {isVoiceNavAktif ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {/* Tombol stop TTS */}
        <button
          onClick={stopSpeaking}
          className="w-12 h-12 rounded-full bg-slate-700 hover:bg-slate-600 text-white shadow-xl flex items-center justify-center"
          aria-label="Hentikan narasi"
          title="Hentikan narasi"
        >
          <VolumeX size={20} />
        </button>
      </div>

      {/* Panel bantuan perintah suara (muncul saat voice nav aktif) */}
      {isVoiceNavAktif && (
        <div
          className="fixed bottom-48 sm:bottom-36 right-4 z-50 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-4 w-52 border border-blue-100"
          role="tooltip"
          aria-label="Daftar perintah suara"
        >
          <p className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-1">
            <Mic size={11} /> Perintah Suara:
          </p>
          <ul className="space-y-1">
            {[
              { cmd: '"Beranda"', desc: '→ Dashboard' },
              { cmd: '"Belajar"', desc: '→ Materi' },
              { cmd: '"Kelas Live"', desc: '→ Live' },
              { cmd: '"Notifikasi"', desc: '→ Notif' },
              { cmd: '"Profil"', desc: '→ Profil' },
              { cmd: '"Stop"', desc: '→ Matikan' },
            ].map(item => (
              <li key={item.cmd} className="flex justify-between text-[10px]">
                <span className="font-semibold text-slate-700">{item.cmd}</span>
                <span className="text-slate-400">{item.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </TalkbackContext.Provider>
  );
}