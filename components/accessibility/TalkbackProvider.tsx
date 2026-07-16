'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useAccessibilityStore } from '@/lib/store/accessibility-store';
import { speak, stopSpeaking, isTTSSpeaking, onTTSEnd } from '@/lib/hooks/useTalkback';
import { useVoiceNavigation } from '@/lib/hooks/useVoiceNavigation';
import { useAutoVoiceScan } from '@/lib/hooks/useAutoVoiceScan';
import type { ScannedCommand } from '@/lib/voice/dom-scan';
import { Mic, MicOff, VolumeX, HelpCircle } from 'lucide-react';

// ─── Interface untuk perintah per halaman ────────────────────────────────
import type { MatchType } from '@/lib/voice/keyword-match';

export interface PageVoiceCommand {
  keywords: string[];
  label: string;               // Label yang dibacakan TTS saat bantuan
  action: () => void;          // Fungsi yang dijalankan
  matchType?: MatchType;       // default 'includes' (perilaku lama)
}

interface TalkbackContextType {
  isAktif: boolean;
  isVoiceNavAktif: boolean;
  toggleVoiceNav: () => void;
  registerPageCommands: (commands: PageVoiceCommand[]) => void;
  clearPageCommands: () => void;
  // "Stop" khusus halaman aktif (mis. hentikan video/audio yang lagi jalan)
  // — didahulukan dari arti "stop" global (matikan seluruh navigasi suara).
  // Sengaja tidak diumumkan/dipromosikan ke pengguna, cuma tersedia diam-diam.
  registerStopHandler: (fn: () => void) => void;
  clearStopHandler: () => void;
  speakText: (text: string) => void;
}

const TalkbackContext = createContext<TalkbackContextType>({
  isAktif: false,
  isVoiceNavAktif: false,
  toggleVoiceNav: () => {},
  registerPageCommands: () => {},
  clearPageCommands: () => {},
  registerStopHandler: () => {},
  clearStopHandler: () => {},
  speakText: () => {},
});

export function useTalkbackContext() {
  return useContext(TalkbackContext);
}

export default function TalkbackProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Voice nav tidak boleh aktif di halaman login/setup — memicu izin mic prematur
  // dan TTS welcome yang menyebut nama menu tertangkap mic → navigasi liar.
  const isLoginPage = pathname.startsWith('/student/login');
  const { highContrast, fontScale, applyToDOM, splitEnabled, ttsEnabled } = useAccessibilityStore();

  // Talkback & voice command adalah satu paket sistem suara — HANYA aktif
  // kalau toggle "Teks ke Suara" aktif, bukan berdasarkan mode disabilitas.
  // Kalau TTS dimatikan, tidak ada mic, tidak ada navigasi suara sama sekali.
  const isAktif = ttsEnabled;

  // Terapkan kontras tinggi & skala font ke <body> setiap kali berubah
  // (termasuk saat baru di-set otomatis lewat pilihan mode di halaman setup).
  // Dikecualikan di halaman login: kontras baru boleh mulai setelah masuk ke
  // langkah "Atur Aksesibilitas Anda" (ditangani sendiri oleh halaman itu),
  // bukan langsung di form login/kata sandi.
  useEffect(() => {
    if (isLoginPage) return;
    applyToDOM();
  }, [highContrast, fontScale, applyToDOM, isLoginPage]);

  // Mode Split (Dark Spot in the Center): geser konten menjauh dari tengah
  // layar lewat class body, lihat globals.css `.split-mode`.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('split-mode', splitEnabled && !isLoginPage);
  }, [splitEnabled, isLoginPage]);

  // Toggle voice nav — pakai ref supaya tidak di-reset saat re-render/pindah halaman
  const voiceNavUserChoiceRef = useRef<boolean | null>(null); // null = belum pernah dipilih user
  const [isVoiceNavAktif, setIsVoiceNavAktif] = useState(false);

  // Perintah suara dari halaman aktif
  const pageCommandsRef = useRef<PageVoiceCommand[]>([]);
  const scannedRef = useRef<ScannedCommand[]>([]);
  const stopHandlerRef = useRef<(() => void) | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Set voice nav ON otomatis saat TTS aktif (hanya jika user belum pernah toggle)
  useEffect(() => {
    if (isAktif && voiceNavUserChoiceRef.current === null) {
      setIsVoiceNavAktif(true);
    } else if (!isAktif) {
      // Kalau TTS dimatikan, matikan semua
      setIsVoiceNavAktif(false);
      voiceNavUserChoiceRef.current = null;
      stopSpeaking();
    }
  }, [isAktif]);

  // Registrasi perintah dari halaman aktif
  const registerPageCommands = useCallback((commands: PageVoiceCommand[]) => {
    pageCommandsRef.current = commands;
  }, []);

  const clearPageCommands = useCallback(() => {
    pageCommandsRef.current = [];
  }, []);

  const registerStopHandler = useCallback((fn: () => void) => {
    stopHandlerRef.current = fn;
  }, []);

  const clearStopHandler = useCallback(() => {
    stopHandlerRef.current = null;
  }, []);

  const toggleVoiceNav = useCallback(() => {
    const next = !isVoiceNavAktif;
    voiceNavUserChoiceRef.current = next; // Simpan pilihan user
    setIsVoiceNavAktif(next);
    speak(
      next
        ? 'Navigasi suara aktif. Ucapkan nama menu, nama materi, atau nama tombol yang ingin diklik.'
        : 'Navigasi suara dinonaktifkan.',
      'interrupt'
    );
  }, [isVoiceNavAktif]);

  // Teruskan pageCommandsRef ke hook voice navigation
  useAutoVoiceScan(isVoiceNavAktif && isAktif && !isLoginPage, scannedRef, pageCommandsRef);
  useVoiceNavigation(isVoiceNavAktif && isAktif && !isLoginPage, pageCommandsRef, scannedRef, stopHandlerRef);

  if (!isAktif || isLoginPage) return <>{children}</>;

  return (
    <TalkbackContext.Provider value={{
      isAktif,
      isVoiceNavAktif,
      toggleVoiceNav,
      registerPageCommands,
      clearPageCommands,
      registerStopHandler,
      clearStopHandler,
      speakText: speak,
    }}>
      {children}

      {/* ── Floating kontrol ── */}
      <div data-voice-ignore className="fixed bottom-20 sm:bottom-6 right-4 z-50 flex flex-col gap-2 items-end">
        {/* Indikator mendengarkan */}
        {isVoiceNavAktif && (
          <div className="flex items-center gap-2 bg-blue-800 text-white text-xs px-3 py-1.5 rounded-full shadow-lg">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Mendengarkan...
          </div>
        )}

        {/* Panel bantuan */}
        {showHelp && isVoiceNavAktif && (
          <div className="bg-white/98 backdrop-blur-sm rounded-2xl shadow-2xl p-4 w-60 border border-blue-100 text-xs">
            <p className="font-bold text-blue-800 mb-2 flex items-center gap-1">
              <Mic size={11} /> Perintah Suara
            </p>
            <p className="text-slate-500 mb-2 font-semibold">Menu:</p>
            <div className="space-y-1 mb-3">
              {['"Beranda"', '"Belajar"', '"Kelas Live"', '"Notifikasi"', '"Profil"'].map(cmd => (
                <div key={cmd} className="text-slate-700">{cmd}</div>
              ))}
            </div>
            {pageCommandsRef.current.length > 0 && (
              <>
                <p className="text-slate-500 mb-2 font-semibold">Di halaman ini:</p>
                <div className="space-y-1">
                  {pageCommandsRef.current.map((cmd, i) => (
                    <div key={i} className="text-slate-700">&quot;{cmd.label}&quot;</div>
                  ))}
                </div>
              </>
            )}
            <p className="text-slate-400 mt-2 border-t pt-2">&quot;Stop&quot; → matikan suara</p>
          </div>
        )}

        {/* Tombol bantuan */}
        <button onClick={() => {
          setShowHelp(v => !v);
          if (!showHelp) speak('Daftar perintah suara ditampilkan.', 'interrupt');
        }}
          className="w-10 h-10 rounded-full bg-slate-600 hover:bg-slate-700 text-white shadow-xl flex items-center justify-center"
          aria-label="Bantuan perintah suara">
          <HelpCircle size={18} />
        </button>

        {/* Tombol stop TTS */}
        <button onClick={stopSpeaking}
          className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 text-white shadow-xl flex items-center justify-center"
          aria-label="Hentikan narasi">
          <VolumeX size={18} />
        </button>

        {/* Tombol toggle voice nav */}
        <button onClick={toggleVoiceNav}
          className={`w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all ${
            isVoiceNavAktif ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-800 hover:bg-blue-700'
          } text-white`}
          aria-label={isVoiceNavAktif ? 'Matikan navigasi suara' : 'Aktifkan navigasi suara'}>
          {isVoiceNavAktif ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
      </div>
    </TalkbackContext.Provider>
  );
}