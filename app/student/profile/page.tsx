'use client';

import { useState, useEffect } from 'react';
import { Volume2, Eye, ZoomIn, Sun, RotateCcw, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
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

export default function ProfilePage() {
  const router = useRouter();
  const { mode, setMode, fontSize, setFontSize, highContrast, setHighContrast,
    ttsEnabled, setTtsEnabled, subtitleEnabled, setSubtitleEnabled, ttsRate, setTtsRate, resetToDefault } = useAccessibilityStore();
  const { setLoggedIn, setRole } = useRoleStore();

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ progress: 0, materiSelesai: 0, totalMateri: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: p } = await supabase.from('profiles').select('*, student_profiles(disabilitas, kelas)').eq('id', user.id).single();
      setProfile(p);

      const { data: progressData } = await supabase.from('student_material_progress').select('progress').eq('student_id', user.id);
      const { count: totalMateri } = await supabase.from('materials').select('*', { count: 'exact', head: true });
      const avg = progressData && progressData.length > 0
        ? Math.round(progressData.reduce((s, x) => s + x.progress, 0) / progressData.length) : 0;
      const selesai = progressData?.filter(p => p.progress === 100).length || 0;
      setStats({ progress: avg, materiSelesai: selesai, totalMateri: totalMateri || 0 });
      setLoading(false);
    }
    loadProfile();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setLoggedIn(false);
    setRole(null);
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

  const disabilitas = profile?.student_profiles?.disabilitas || 'none';

  return (
    <div className="flex min-h-screen bg-slate-50">
      <StudentSidebar />
      <main id="main-content" className="flex-1 sm:ml-60 pb-20 sm:pb-4">
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-slate-900">Profil Saya</h1>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700">
            <LogOut size={13} /> Keluar
          </button>
        </div>

        <div className="p-4 max-w-2xl mx-auto space-y-4">
          {/* Profile Card */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-blue-800 to-blue-600 h-20" />
            <CardContent className="p-4 pt-0 -mt-10">
              <div className="flex items-end gap-3 mb-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg border-4 border-white"
                  style={{ backgroundColor: profile?.avatar_color || '#1E40AF' }}>
                  {profile?.avatar || profile?.nama?.charAt(0) || '?'}
                </div>
                <div className="pb-1">
                  <h2 className="font-bold text-slate-900 text-lg leading-tight">{profile?.nama || 'Siswa'}</h2>
                  <p className="text-slate-500 text-sm">{profile?.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="default" className="text-xs">🎓 Siswa</Badge>
                {disabilitas !== 'none' && (
                  <Badge className="text-xs">
                    {disabilitas === 'tunanetra' ? '👁️ Tunanetra' : disabilitas === 'tunarungu' ? '👂 Tunarungu' : '♿ Keduanya'}
                  </Badge>
                )}
              </div>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'Progress', value: `${stats.progress}%` },
                  { label: 'Selesai', value: stats.materiSelesai },
                  { label: 'Total Materi', value: stats.totalMateri },
                ].map(stat => (
                  <div key={stat.label} className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-blue-700">{stat.value}</p>
                    <p className="text-[10px] text-slate-500">{stat.label}</p>
                  </div>
                ))}
              </div>
              <Progress value={stats.progress} className="h-2" />
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="aksesibilitas">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="aksesibilitas">Aksesibilitas</TabsTrigger>
              <TabsTrigger value="kebutuhan">Kebutuhan</TabsTrigger>
            </TabsList>

            <TabsContent value="aksesibilitas" className="space-y-3 mt-3">
              {/* TTS */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Volume2 size={16} className="text-blue-700" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">Text-to-Speech</p>
                        <p className="text-xs text-slate-500">Bacakan teks untuk tunanetra</p>
                      </div>
                    </div>
                    <button onClick={() => setTtsEnabled(!ttsEnabled)}
                      className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        ttsEnabled ? "bg-blue-600" : "bg-slate-200")}>
                      <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow",
                        ttsEnabled ? "translate-x-6" : "translate-x-1")} />
                    </button>
                  </div>
                  {ttsEnabled && (
                    <div>
                      <p className="text-xs text-slate-500 mb-2">Kecepatan: {ttsRate}x</p>
                      <Slider value={[ttsRate]} onValueChange={([v]) => setTtsRate(v)} min={0.5} max={2} step={0.1} className="w-full" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Subtitle */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye size={16} className="text-blue-700" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">Subtitle Live</p>
                        <p className="text-xs text-slate-500">Caption real-time di kelas live</p>
                      </div>
                    </div>
                    <button onClick={() => setSubtitleEnabled(!subtitleEnabled)}
                      className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        subtitleEnabled ? "bg-blue-600" : "bg-slate-200")}>
                      <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow",
                        subtitleEnabled ? "translate-x-6" : "translate-x-1")} />
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Font Size */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <ZoomIn size={16} className="text-blue-700" />
                    <p className="text-sm font-medium text-slate-700">Ukuran Font</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {FONT_SIZES.map(f => (
                      <button key={f.value} onClick={() => setFontSize(f.value)}
                        className={cn("py-2 rounded-xl text-xs font-medium border-2 transition-all",
                          fontSize === f.value ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600")}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* High Contrast */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sun size={16} className="text-blue-700" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">Kontras Tinggi</p>
                        <p className="text-xs text-slate-500">Warna lebih tegas dan kontras</p>
                      </div>
                    </div>
                    <button onClick={() => setHighContrast(!highContrast)}
                      className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        highContrast ? "bg-blue-600" : "bg-slate-200")}>
                      <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow",
                        highContrast ? "translate-x-6" : "translate-x-1")} />
                    </button>
                  </div>
                </CardContent>
              </Card>

              <button onClick={resetToDefault}
                className="w-full flex items-center justify-center gap-2 h-11 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50">
                <RotateCcw size={14} /> Reset ke Default
              </button>
            </TabsContent>

            <TabsContent value="kebutuhan" className="mt-3">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium text-slate-700 mb-3">Pilih jenis kebutuhan aksesibilitas:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {MODES.map(m => (
                      <button key={m.value} onClick={() => setMode(m.value)}
                        className={cn("flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium",
                          mode === m.value ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:border-blue-300")}>
                        <span>{m.icon}</span>
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>
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
