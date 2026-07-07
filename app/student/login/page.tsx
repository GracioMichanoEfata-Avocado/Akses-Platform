'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, GraduationCap, Volume2, Subtitles, ZoomIn, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { useAccessibilityStore, DisabilitasMode, FontSize } from '@/lib/store/accessibility-store';
import { useRoleStore } from '@/lib/store/role-store';
import { cn } from '@/lib/utils/cn';
import { createClient } from '@/lib/supabase/client';

type Step = 'login' | 'setup';

const MODES: { value: DisabilitasMode; label: string; desc: string; icon: string }[] = [
  { value: 'tunanetra', label: 'Tunanetra', desc: 'Aktifkan audio & TTS', icon: '👁️' },
  { value: 'tunarungu', label: 'Tunarungu', desc: 'Aktifkan subtitle & visual', icon: '👂' },
  { value: 'both', label: 'Keduanya', desc: 'Semua fitur aksesibilitas', icon: '♿' },
  { value: 'none', label: 'Tidak Ada', desc: 'Mode standar', icon: '👤' },
];

const FONT_SIZES: { value: FontSize; label: string; preview: string }[] = [
  { value: 'normal', label: 'Normal', preview: 'Aa' },
  { value: 'besar', label: 'Besar', preview: 'Aa' },
  { value: 'sangat-besar', label: 'Sangat Besar', preview: 'Aa' },
];

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('alex@akses.id');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { mode, setMode, fontSize, setFontSize, highContrast, setHighContrast, ttsEnabled, setTtsEnabled, setSetupDone } = useAccessibilityStore();
  const { setLoggedIn, setRole, setStudentId } = useRoleStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError || !data.user) {
        setError('Email atau kata sandi salah. Coba lagi.');
        return;
      }

      // Pastikan akun ini memang akun siswa, bukan akun guru
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (!profile || profile.role !== 'student') {
        await supabase.auth.signOut();
        setError('Akun ini bukan akun siswa. Gunakan halaman login pendamping.');
        return;
      }

      setStudentId(data.user.id);
      setStep('setup');
    } catch (err) {
      console.error('Login error:', err);
      setError('Tidak dapat terhubung ke server. Periksa koneksi internet atau konfigurasi aplikasi, lalu coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSetup = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase.from('accessibility_settings').upsert({
        id: user.id,
        font_size: fontSize,
        high_contrast: highContrast,
        tts_enabled: ttsEnabled,
        subtitle_enabled: true,
      });
    }

    setSetupDone(true);
    setLoggedIn(true);
    setRole('student');

    // Welcome talkback untuk tunanetra
    const isTunanetra = mode === 'tunanetra' || mode === 'both';
    if (isTunanetra && typeof window !== 'undefined' && window.speechSynthesis) {
      const welcomeText = `Halo! Selamat datang di AKSES, platform belajar inklusif. Saya akan memandu Anda. Menu yang tersedia adalah: Beranda, Belajar, Kelas Live, Notifikasi, dan Profil. Ucapkan nama menu untuk berpindah halaman, atau ketuk tombol mikrofon di pojok kanan bawah layar untuk mengaktifkan navigasi suara.`;
      const utterance = new SpeechSynthesisUtterance(welcomeText);
      utterance.lang = 'id-ID';
      utterance.rate = 0.9;
      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find(v => v.lang.startsWith('id'));
      if (idVoice) utterance.voice = idVoice;
      window.speechSynthesis.cancel();
      setTimeout(() => window.speechSynthesis.speak(utterance), 500);
    }

    router.push('/student/dashboard');
  };

  if (step === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-800 to-blue-600 p-6 text-white">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                <GraduationCap size={18} />
              </div>
              <span className="font-bold text-lg">AKSES</span>
            </div>
            <h1 className="text-xl font-bold mt-3">Atur Aksesibilitas Anda</h1>
            <p className="text-blue-200 text-sm mt-1">
              Personalisasi pengalaman belajar agar AKSES MDS lebih nyaman dan memuaskan bagi Anda.
            </p>
          </div>

          <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
            {/* Mode Pilihan Utama */}
            <div>
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
                Pilih Mode Utama
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {MODES.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setMode(m.value)}
                    className={cn(
                      "p-3 rounded-2xl border-2 text-left transition-all focus-visible:ring-2 focus-visible:ring-blue-500",
                      mode === m.value
                        ? "border-blue-600 bg-blue-50"
                        : "border-slate-200 hover:border-blue-300"
                    )}
                    aria-pressed={mode === m.value}
                    aria-label={`Pilih mode ${m.label}: ${m.desc}`}
                  >
                    <span className="text-xl">{m.icon}</span>
                    <p className="text-sm font-semibold text-slate-800 mt-1">{m.label}</p>
                    <p className="text-xs text-slate-500">{m.desc}</p>
                    {mode === m.value && (
                      <div className="mt-2 flex items-center gap-1 text-blue-600">
                        <Check size={12} />
                        <span className="text-xs font-medium">Dipilih</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Pengaturan Detail */}
            <div>
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
                Pengaturan Detail
              </h2>

              {/* Ukuran Font */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <ZoomIn size={15} className="text-slate-500" />
                  <label className="text-sm font-medium text-slate-700">Ukuran Teks</label>
                </div>
                <div className="flex gap-2">
                  {FONT_SIZES.map((fs, idx) => (
                    <button
                      key={fs.value}
                      onClick={() => setFontSize(fs.value)}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl border-2 flex flex-col items-center gap-0.5 transition-all focus-visible:ring-2 focus-visible:ring-blue-500",
                        fontSize === fs.value
                          ? "border-blue-600 bg-blue-50"
                          : "border-slate-200 hover:border-blue-300"
                      )}
                      style={{ fontSize: `${0.75 + idx * 0.1}rem` }}
                      aria-pressed={fontSize === fs.value}
                      aria-label={`Ukuran teks ${fs.label}`}
                    >
                      <span className="font-bold text-slate-700">{fs.preview}</span>
                      <span className="text-[10px] text-slate-500">{fs.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* TTS */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 mb-3">
                <div className="flex items-center gap-2">
                  <Volume2 size={16} className="text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Teks ke Suara</p>
                    <p className="text-xs text-slate-500">Bacakan konten secara otomatis</p>
                  </div>
                </div>
                <button
                  onClick={() => setTtsEnabled(!ttsEnabled)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    ttsEnabled ? "bg-blue-600" : "bg-slate-200"
                  )}
                  role="switch"
                  aria-checked={ttsEnabled}
                  aria-label="Toggle Text-to-Speech"
                >
                  <span className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow",
                    ttsEnabled ? "translate-x-6" : "translate-x-1"
                  )} />
                </button>
              </div>

              {/* Subtitle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 mb-3">
                <div className="flex items-center gap-2">
                  <Subtitles size={16} className="text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Subtitle Otomatis</p>
                    <p className="text-xs text-slate-500">Tampilkan teks pada video & live</p>
                  </div>
                </div>
                <button
                  className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 transition-colors"
                  role="switch"
                  aria-checked={true}
                  aria-label="Subtitle aktif"
                >
                  <span className="inline-block h-4 w-4 translate-x-6 transform rounded-full bg-white shadow" />
                </button>
              </div>

              {/* Kontras Tinggi */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-base">☀️</span>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Kontras Tinggi</p>
                    <p className="text-xs text-slate-500">Latar hitam, teks putih</p>
                  </div>
                </div>
                <button
                  onClick={() => setHighContrast(!highContrast)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    highContrast ? "bg-blue-600" : "bg-slate-200"
                  )}
                  role="switch"
                  aria-checked={highContrast}
                  aria-label="Toggle kontras tinggi"
                >
                  <span className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow",
                    highContrast ? "translate-x-6" : "translate-x-1"
                  )} />
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 pt-2 space-y-2">
            <button
              onClick={handleSaveSetup}
              className="w-full h-12 bg-blue-800 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label="Simpan pengaturan dan lanjutkan ke dashboard"
            >
              Simpan & Lanjutkan
              <ArrowRight size={18} />
            </button>
            <button
              onClick={handleSaveSetup}
              className="w-full h-10 text-slate-500 text-sm hover:text-slate-700 transition-colors"
            >
              Lewati, gunakan pengaturan default
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <GraduationCap size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">AKSES</h1>
          <p className="text-blue-200 text-sm mt-1">Akses Edukasi Setara</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-1">Masuk ke Akun</h2>
          <p className="text-slate-500 text-sm mb-6">Selamat datang kembali di platform inklusif kami</p>

          <form onSubmit={handleLogin} className="space-y-4" aria-label="Form login">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@akses.id"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50"
                required
                aria-required="true"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full h-11 pl-4 pr-11 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  aria-label={showPass ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-blue-800 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60 flex items-center justify-center gap-2"
              aria-label="Login ke AKSES"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Masuk...
                </>
              ) : (
                'Masuk'
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center text-xs text-slate-400 bg-white px-3">atau</div>
            </div>

            <button
              type="button"
              onClick={() => { setEmail('alex@akses.id'); setPassword('demo1234'); }}
              className="w-full h-11 border-2 border-blue-200 text-blue-700 rounded-xl font-medium text-sm hover:bg-blue-50 transition-colors"
              aria-label="Isi form dengan akun demo"
            >
              Isi dengan Akun Demo
            </button>
          </form>
        </div>

        <p className="text-center text-blue-200 text-xs mt-6">
          Platform inklusif untuk penyandang disabilitas sensorik
        </p>
      </div>
    </div>
  );
}