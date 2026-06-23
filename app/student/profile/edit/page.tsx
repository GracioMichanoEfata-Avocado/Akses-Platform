'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Check, AlertCircle } from 'lucide-react';
import StudentBottomNav from '@/components/shared/StudentBottomNav';
import StudentSidebar from '@/components/shared/StudentSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';

const AVATAR_COLORS = [
  '#1E40AF', '#0891B2', '#059669', '#7C3AED',
  '#DB2777', '#DC2626', '#D97706', '#65A30D',
];

const DISABILITAS_OPTIONS = [
  { value: 'none', label: 'Tidak Ada', icon: '👤' },
  { value: 'tunanetra', label: 'Tunanetra', icon: '👁️' },
  { value: 'tunarungu', label: 'Tunarungu', icon: '👂' },
  { value: 'both', label: 'Keduanya', icon: '♿' },
];

export default function EditStudentProfilePage() {
  const router = useRouter();
  const [nama, setNama] = useState('');
  const [avatarColor, setAvatarColor] = useState('#1E40AF');
  const [disabilitas, setDisabilitas] = useState('none');
  const [kelas, setKelas] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/student/login'); return; }
      const { data: profile } = await supabase
        .from('profiles')
        .select('*, student_profiles(disabilitas, kelas)')
        .eq('id', user.id).single();
      if (profile) {
        setNama(profile.nama || '');
        setAvatarColor(profile.avatar_color || '#1E40AF');
        setDisabilitas((profile.student_profiles as any)?.disabilitas || 'none');
        setKelas((profile.student_profiles as any)?.kelas || '');
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    if (!nama.trim()) { setError('Nama tidak boleh kosong'); return; }
    setSaving(true); setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const initial = nama.trim().charAt(0).toUpperCase();
    const { error: e1 } = await supabase.from('profiles')
      .update({ nama: nama.trim(), avatar: initial, avatar_color: avatarColor })
      .eq('id', user.id);
    const { error: e2 } = await supabase.from('student_profiles')
      .update({ disabilitas, kelas: kelas.trim() || null })
      .eq('id', user.id);

    if (e1 || e2) { setError('Gagal menyimpan: ' + (e1?.message || e2?.message)); setSaving(false); return; }
    setSaved(true);
    setTimeout(() => router.push('/student/profile'), 1200);
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-700 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <StudentSidebar />
      <main className="flex-1 sm:ml-60 pb-20 sm:pb-4">
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600">
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-bold text-slate-900">Edit Profil</h1>
        </div>

        <div className="p-4 max-w-lg mx-auto space-y-4">
          {saved && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
              <Check size={15} /> Profil berhasil disimpan!
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          {/* Preview Avatar */}
          <div className="flex flex-col items-center py-4">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-2"
              style={{ backgroundColor: avatarColor }}>
              {nama.charAt(0).toUpperCase() || '?'}
            </div>
            <p className="text-xs text-slate-500">Preview avatar</p>
          </div>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Lengkap</label>
                <input value={nama} onChange={e => setNama(e.target.value)}
                  placeholder="Nama lengkap kamu"
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Kelas</label>
                <input value={kelas} onChange={e => setKelas(e.target.value)}
                  placeholder="Contoh: 7A, 8B, 10 IPA 1"
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Warna Avatar</label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_COLORS.map(color => (
                    <button key={color} onClick={() => setAvatarColor(color)}
                      className={cn('w-9 h-9 rounded-xl transition-all', avatarColor === color && 'ring-2 ring-offset-2 ring-blue-500 scale-110')}
                      style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <label className="block text-sm font-medium text-slate-700 mb-3">Kebutuhan Aksesibilitas</label>
              <div className="grid grid-cols-2 gap-2">
                {DISABILITAS_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setDisabilitas(opt.value)}
                    className={cn('flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium',
                      disabilitas === opt.value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-blue-300')}>
                    <span>{opt.icon}</span><span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <button onClick={handleSave} disabled={saving || saved}
            className="w-full h-12 bg-blue-800 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Menyimpan...</>
              : saved ? <><Check size={16} />Tersimpan!</> : 'Simpan Perubahan'}
          </button>
        </div>
      </main>
      <StudentBottomNav />
    </div>
  );
}
