'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Pencil, BookOpen, Calendar, Users, BarChart2 } from 'lucide-react';
import TeacherSidebar from '@/components/shared/TeacherSidebar';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { useRoleStore } from '@/lib/store/role-store';

export default function TeacherProfilePage() {
  const router = useRouter();
  const { setLoggedIn, setRole } = useRoleStore();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ totalMateri: 0, totalSesi: 0, totalSiswa: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/teacher/login'); return; }

      const { data: p } = await supabase
        .from('profiles')
        .select('*, teacher_profiles(mata_pelajaran, kelas)')
        .eq('id', user.id).single();
      setProfile(p);

      const [{ count: totalMateri }, { count: totalSesi }, { count: totalSiswa }] = await Promise.all([
        supabase.from('materials').select('*', { count: 'exact', head: true }).eq('created_by', user.id),
        supabase.from('live_sessions').select('*', { count: 'exact', head: true }).eq('guru_id', user.id),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      ]);

      setStats({ totalMateri: totalMateri || 0, totalSesi: totalSesi || 0, totalSiswa: totalSiswa || 0 });
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setLoggedIn(false);
    setRole('student');
    router.push('/teacher/login');
  };

  if (loading) return (
    <div className="flex min-h-screen">
      <TeacherSidebar />
      <main className="flex-1 sm:ml-60 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-300 border-t-emerald-700 rounded-full animate-spin" />
      </main>
    </div>
  );

  const mataPelajaran = profile?.teacher_profiles?.mata_pelajaran || [];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <TeacherSidebar />
      <main className="flex-1 sm:ml-60 pb-4">
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-slate-900">Profil Pendamping</h1>
          <div className="flex items-center gap-2">
            <Link href="/teacher/profile/edit"
              className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors">
              <Pencil size={12} /> Edit Profil
            </Link>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700">
              <LogOut size={13} /> Keluar
            </button>
          </div>
        </div>

        <div className="p-4 max-w-lg mx-auto space-y-4">
          {/* Profile Card */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-700 to-emerald-500 h-24" />
            <CardContent className="p-4 pt-0 -mt-12">
              <div className="flex items-end gap-3 mb-4">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg border-4 border-white"
                  style={{ backgroundColor: profile?.avatar_color || '#059669' }}>
                  {profile?.avatar || profile?.nama?.charAt(0) || '?'}
                </div>
                <div className="pb-1">
                  <h2 className="font-bold text-slate-900 text-lg leading-tight">{profile?.nama || 'Pendamping'}</h2>
                  <p className="text-slate-500 text-sm">{profile?.email}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <Badge className="text-xs bg-emerald-100 text-emerald-700 border-0">🎓 Pendamping</Badge>
                {mataPelajaran.map((m: string) => (
                  <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Materi Dibuat', value: stats.totalMateri, icon: <BookOpen size={14} className="text-blue-600" /> },
                  { label: 'Sesi Live', value: stats.totalSesi, icon: <Calendar size={14} className="text-purple-600" /> },
                  { label: 'Total Siswa', value: stats.totalSiswa, icon: <Users size={14} className="text-emerald-600" /> },
                ].map(stat => (
                  <div key={stat.label} className="bg-slate-50 rounded-xl p-3 text-center">
                    <div className="flex justify-center mb-1">{stat.icon}</div>
                    <p className="text-xl font-bold text-slate-800">{stat.value}</p>
                    <p className="text-[10px] text-slate-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-2">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Menu Cepat</h3>
              {[
                { href: '/teacher/materials', icon: <BookOpen size={15} className="text-blue-600" />, label: 'Kelola Materi', desc: 'Lihat, edit, hapus materi' },
                { href: '/teacher/report', icon: <BarChart2 size={15} className="text-purple-600" />, label: 'Laporan Aksesibilitas', desc: 'Pantau progress siswa' },
                { href: '/teacher/students', icon: <Users size={15} className="text-emerald-600" />, label: 'Manajemen Siswa', desc: 'Lihat semua siswa' },
              ].map(item => (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
      <AccessibilityBar />
    </div>
  );
}