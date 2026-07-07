'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Users, ArrowLeft, AlertCircle } from 'lucide-react';
import { useRoleStore } from '@/lib/store/role-store';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function TeacherLoginPage() {
  const router = useRouter();
  const { setLoggedIn, setRole, setTeacherId } = useRoleStore();
  const [email, setEmail] = useState('guru@akses.id');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (!profile || profile.role !== 'teacher') {
        await supabase.auth.signOut();
        setError('Akun ini bukan akun pendamping/guru. Gunakan halaman login siswa.');
        return;
      }

      setTeacherId(data.user.id);
      setRole('teacher');
      setLoggedIn(true);
      router.push('/teacher/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('Tidak dapat terhubung ke server. Periksa koneksi internet atau konfigurasi aplikasi, lalu coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Back button */}
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-blue-200 hover:text-white text-sm mb-6 transition-colors"
          aria-label="Kembali ke halaman pilih peran"
        >
          <ArrowLeft size={16} />
          Kembali
        </Link>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Users size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Masuk Pendamping</h1>
          <p className="text-blue-200 text-sm mt-1">Dashboard pengelolaan siswa</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-1">Masuk ke Akun</h2>
          <p className="text-slate-500 text-sm mb-6">Kelola siswa dan upload materi pembelajaran</p>

          <form onSubmit={handleLogin} className="space-y-4" aria-label="Form login pendamping">
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
              <label htmlFor="teacher-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <input
                id="teacher-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="guru@akses.id"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-50"
                required
                aria-required="true"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="teacher-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  id="teacher-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full h-11 pl-4 pr-11 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-50"
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
              className="w-full h-12 bg-emerald-700 text-white rounded-xl font-semibold text-sm hover:bg-emerald-600 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-60 flex items-center justify-center gap-2"
              aria-label="Masuk sebagai pendamping"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Masuk...
                </>
              ) : (
                'Masuk sebagai Pendamping'
              )}
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