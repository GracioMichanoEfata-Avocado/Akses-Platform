'use client';

import { useState, useEffect } from 'react';
import { Volume2, Eye, ZoomIn, Sun, RotateCcw, LogOut, Camera, Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StudentBottomNav from '@/components/shared/StudentBottomNav';
import StudentSidebar from '@/components/shared/StudentSidebar';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { useAccessibilityStore, FontSize, DisabilitasMode } from '@/lib/store/accessibility-store';
import { useRoleStore } from '@/lib/store/role-store';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';

const MODES: { value: DisabilitasMode; label: string; icon: string }[] = [
  { value: 'tunanetra', label: 'Tunanetra', icon: '👁️' },
  { value: 'tunarungu', label: 'Tunarungu', icon: '👂' },
  { value: 'both', label: 'Keduanya', icon: '♿' },
  { value: 'none', label: 'Tidak Ada', icon: '👤' },
];

const FONT_SIZES: { value: FontSize; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'besar', label: 'Besar' },
  { value: 'sangat-besar', label: 'Sangat Besar' },
];

const AVATAR_COLORS = [
  '#1E40AF','#0891B2','#059669','#7C3AED','#DB2777','#D97706','#DC2626','#4F46E5',
];

export default function ProfilePage() {
  const router = useRouter();
  const { mode, setMode, fontSize, setFontSize, highContrast, setHighContrast,
    ttsEnabled, setTtsEnabled, subtitleEnabled, setSubtitleEnabled, ttsRate, setTtsRate, resetToDefault } = useAccessibilityStore();
  const { setLoggedIn, setRole } = useRoleStore();

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ progress: 0, materiSelesai: 0, totalMateri: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Edit profile state
  const [editNama, setEditNama] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editColor, setEditColor] = useState('#1E40AF');
  const [editKelas, setEditKelas] = useState('');
  const [editDisabilitas, setEditDisabilitas] = useState<DisabilitasMode>('none');

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: p } = await supabase
        .from('profiles')
        .select('*, student_profiles(disabilitas, kelas)')
        .eq('id', user.id).single();
      setProfile(p);
      setEditNama(p?.nama || '');
      setEditAvatar(p?.avatar || p?.nama?.charAt(0) || '');
      setEditColor(p?.avatar_color || '#1E40AF');
      setEditKelas(p?.student_profiles?.kelas || '');
      setEditDisabilitas(p?.student_profiles?.disabilitas || 'none');

      const { data: progressData } = await supabase.from('student_material_progress').select('progress').eq('student_id', user.id);
      const { count: totalMateri } = await supabase.from('materials').select('*', { count: 'exact', head: true });
      const avg = progressData && progressData.length > 0
        ? Math.round(progressData.reduce((s, x) => s + x.progress, 0) / progressData.length) : 0;
      const selesai = progressData?.filter(p => p.progress === 100).length || 0;
      setStats({ progress: avg, materiSelesai: selesai, totalMateri: totalMateri || 0 });
      setLoading(false);
    }
    load();
  }, []);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from('profiles').update({
      nama: editNama.trim(),
      avatar: editAvatar.trim() || editNama.trim().charAt(0),
      avatar_color: editColor,
    }).eq('id', profile.id);

    await supabase.from('student_profiles').upsert({
      id: profile.id,
      disabilitas: editDisabilitas,
      kelas: editKelas.trim(),
    });

    setProfile((p: any) => ({ ...p, nama: editNama, avatar: editAvatar, avatar_color: editColor }));
    setMode(editDisabilitas);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setLoggedIn(false);
    setRole('student');
    router.push('/student/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <StudentSidebar />
        <main className="flex-1 sm:ml-60 p-4 pb-24">
          <div className="space-y-4 animate-pulse">
            <div className="h-40 bg-slate-200 rounded-2xl" />
            <div className="h-32 bg-slate-200 rounded-2xl" />
          </div>
        </main>
        <StudentBottomNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <StudentSidebar />
      <main className="flex-1 sm:ml-60 pb-20 sm:pb-4">
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-slate-900">Profil Saya</h1>
          <div className="flex items-center gap-2">
            <Link href="/student/profile/edit"
              className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors">
              ✏️ Edit Profil
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700">
              <LogOut size={13} /> Keluar
            </button>
          </div>
        </div>

        <div className="p-4 max-w-2xl mx-auto space-y-4">
          {/* Profile Card */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-blue-800 to-blue-600 h-20" />
            <CardContent className="p-4 pt-0 -mt-10">
              <div className="flex items-end gap-3 mb-4">
                <div className="glow-tint w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg border-4 border-white"
                  style={{ backgroundColor: editColor, '--glow-color': editColor } as React.CSSProperties}>
                  {editAvatar || editNama.charAt(0) || '?'}
                </div>
                <div className="pb-1 flex-1">
                  <h2 className="font-bold text-slate-900 text-lg">{profile?.nama}</h2>
                  <p className="text-slate-500 text-sm">{profile?.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'Progress', value: `${stats.progress}%` },
                  { label: 'Selesai', value: stats.materiSelesai },
                  { label: 'Total Materi', value: stats.totalMateri },
                ].map(s => (
                  <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-blue-700">{s.value}</p>
                    <p className="text-[10px] text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>
              <Progress value={stats.progress} className="h-2" />
            </CardContent>
          </Card>

          <Tabs defaultValue="profil">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="profil">Edit Profil</TabsTrigger>
              <TabsTrigger value="aksesibilitas">Aksesibilitas</TabsTrigger>
              <TabsTrigger value="kebutuhan">Kebutuhan</TabsTrigger>
            </TabsList>

            {/* ── TAB EDIT PROFIL ── */}
            <TabsContent value="profil" className="space-y-3 mt-3">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block">Nama Lengkap</label>
                    <input value={editNama} onChange={e => setEditNama(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block">Inisial Avatar (1-2 huruf)</label>
                    <input value={editAvatar} onChange={e => setEditAvatar(e.target.value.slice(0, 2).toUpperCase())}
                      maxLength={2}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-2 block">Warna Avatar</label>
                    <div className="flex gap-2 flex-wrap">
                      {AVATAR_COLORS.map(c => (
                        <button key={c} onClick={() => setEditColor(c)}
                          className={cn('w-8 h-8 rounded-xl transition-all', editColor === c && 'ring-2 ring-offset-2 ring-slate-400')}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block">Kelas</label>
                    <input value={editKelas} onChange={e => setEditKelas(e.target.value)}
                      placeholder="Contoh: 7A, 10 IPA 1"
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <button onClick={handleSaveProfile} disabled={saving}
                    className="w-full h-11 bg-blue-800 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50">
                    {saving ? <><Loader2 size={15} className="animate-spin" />Menyimpan...</>
                      : saved ? <><Check size={15} />Tersimpan!</>
                      : 'Simpan Perubahan'}
                  </button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── TAB AKSESIBILITAS ── */}
            <TabsContent value="aksesibilitas" className="space-y-3 mt-3">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-4">
                  {[
                    { label: 'Text-to-Speech', desc: 'Bacakan teks untuk tunanetra', icon: <Volume2 size={15} className="text-blue-700" />, value: ttsEnabled, set: setTtsEnabled },
                    { label: 'Subtitle Live', desc: 'Caption real-time di kelas live', icon: <Eye size={15} className="text-blue-700" />, value: subtitleEnabled, set: setSubtitleEnabled },
                    { label: 'Kontras Tinggi', desc: 'Warna lebih tegas dan kontras', icon: <Sun size={15} className="text-blue-700" />, value: highContrast, set: setHighContrast },
                  ].map(f => (
                    <div key={f.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">{f.icon}
                        <div>
                          <p className="text-sm font-medium text-slate-700">{f.label}</p>
                          <p className="text-xs text-slate-500">{f.desc}</p>
                        </div>
                      </div>
                      <button onClick={() => f.set(!f.value)}
                        className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', f.value ? 'bg-blue-600' : 'bg-slate-200')}>
                        <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow', f.value ? 'translate-x-6' : 'translate-x-1')} />
                      </button>
                    </div>
                  ))}
                  {ttsEnabled && (
                    <div>
                      <p className="text-xs text-slate-500 mb-2">Kecepatan TTS: {ttsRate}x</p>
                      <Slider value={[ttsRate]} onValueChange={([v]) => setTtsRate(v)} min={0.5} max={2} step={0.1} />
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <ZoomIn size={15} className="text-blue-700" />
                    <p className="text-sm font-medium text-slate-700">Ukuran Font</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {FONT_SIZES.map(f => (
                      <button key={f.value} onClick={() => setFontSize(f.value)}
                        className={cn('py-2 rounded-xl text-xs font-medium border-2 transition-all',
                          fontSize === f.value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600')}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <button onClick={resetToDefault}
                className="w-full flex items-center justify-center gap-2 h-11 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50">
                <RotateCcw size={14} /> Reset ke Default
              </button>
            </TabsContent>

            {/* ── TAB KEBUTUHAN ── */}
            <TabsContent value="kebutuhan" className="mt-3">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium text-slate-700">Pilih jenis kebutuhan aksesibilitas:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {MODES.map(m => (
                      <button key={m.value} onClick={() => setEditDisabilitas(m.value)}
                        className={cn('flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium',
                          editDisabilitas === m.value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600')}>
                        <span>{m.icon}</span><span>{m.label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">Klik &quot;Simpan Perubahan&quot; di tab Edit Profil untuk menyimpan pilihan ini.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <StudentBottomNav />
      <AccessibilityBar />
    </div>
  );
}