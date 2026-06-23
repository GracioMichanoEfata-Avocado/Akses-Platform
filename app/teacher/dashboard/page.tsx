'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, TrendingUp, Calendar, PlusCircle, ChevronRight } from 'lucide-react';
import TeacherSidebar from '@/components/shared/TeacherSidebar';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { createClient } from '@/lib/supabase/client';
import { getDisabilitasLabel, getDisabilitasBadgeColor } from '@/lib/utils/formatters';

interface StudentRow {
  id: string;
  nama: string;
  avatar: string;
  avatar_color: string;
  disabilitas: string;
  progress: number;
}

interface SessionRow {
  id: string;
  judul: string;
  tanggal: string;
  waktu: string;
  status: string;
  peserta_count: number;
}

interface TeacherStats {
  nama: string;
  mata_pelajaran: string[];
  totalSiswa: number;
  siswaAktif: number;
  sesibulanIni: number;
}

export default function TeacherDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<SessionRow[]>([]);
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });

  useEffect(() => {
    const supabase = createClient();

    async function loadDashboard() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Profil guru
      const { data: profile } = await supabase
        .from('profiles').select('nama').eq('id', user.id).single();
      const { data: teacherProfile } = await supabase
        .from('teacher_profiles').select('mata_pelajaran').eq('id', user.id).single();

      // Semua siswa + progress rata-rata
      const { data: studentProfiles } = await supabase
        .from('profiles')
        .select('id, nama, avatar, avatar_color, student_profiles(disabilitas)')
        .eq('role', 'student');

      const studentRows: StudentRow[] = [];
      for (const s of studentProfiles || []) {
        const { data: progressData } = await supabase
          .from('student_material_progress')
          .select('progress')
          .eq('student_id', s.id);
        const avgProgress = progressData && progressData.length > 0
          ? Math.round(progressData.reduce((sum, p) => sum + p.progress, 0) / progressData.length)
          : 0;
        studentRows.push({
          id: s.id,
          nama: s.nama,
          avatar: s.avatar || s.nama.charAt(0),
          avatar_color: s.avatar_color || '#1E40AF',
          disabilitas: (s.student_profiles as any)?.disabilitas || 'none',
          progress: avgProgress,
        });
      }

      // Sesi live milik guru ini
      const { data: sessions } = await supabase
        .from('live_sessions')
        .select('id, judul, tanggal, waktu, status')
        .eq('guru_id', user.id)
        .neq('status', 'ended')
        .order('tanggal', { ascending: true })
        .limit(3);

      const sessionRows: SessionRow[] = (sessions || []).map(s => ({
        ...s,
        peserta_count: 0,
      }));

      // Hitung sesi bulan ini
      const bulanIni = new Date().toISOString().slice(0, 7);
      const { count: sesiCount } = await supabase
        .from('live_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('guru_id', user.id)
        .gte('tanggal', bulanIni + '-01');

      setStats({
        nama: profile?.nama || 'Pendamping',
        mata_pelajaran: teacherProfile?.mata_pelajaran || [],
        totalSiswa: studentRows.length,
        siswaAktif: studentRows.filter(s => s.progress > 0).length,
        sesibulanIni: sesiCount || 0,
      });
      setStudents(studentRows.slice(0, 5));
      setUpcomingSessions(sessionRows);
      setLoading(false);
    }

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <TeacherSidebar />
        <main className="flex-1 sm:ml-60 p-4">
          <div className="space-y-4 animate-pulse max-w-3xl mx-auto">
            <div className="h-32 bg-slate-200 rounded-2xl" />
            <div className="grid grid-cols-3 gap-3">
              {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-200 rounded-xl" />)}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <TeacherSidebar />

      <main id="main-content" className="flex-1 sm:ml-60 pb-4">
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:hidden">
            <span className="font-bold text-blue-900">AKSES</span>
          </div>
          <div className="hidden sm:block" />
          <div />
        </div>

        <div className="p-4 space-y-5 max-w-3xl mx-auto">
          {/* Greeting */}
          <div className="bg-gradient-to-br from-emerald-700 to-emerald-500 rounded-2xl p-5 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
            <p className="text-emerald-200 text-sm mb-1">{today}</p>
            <h1 className="text-2xl font-bold mb-1">Halo, {stats?.nama}! 👋</h1>
            <p className="text-emerald-100 text-sm mb-4">
              {stats?.mata_pelajaran?.length ? stats.mata_pelajaran.join(' & ') : 'Pendamping AKSES'}
            </p>
            <Link href="/teacher/profile/edit"
              className="inline-flex items-center gap-1.5 text-xs bg-white/20 text-white px-3 py-1.5 rounded-xl hover:bg-white/30 transition-colors mb-4">
              ✏️ Edit Profil
            </Link>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Siswa', value: stats?.totalSiswa ?? 0, icon: '👥' },
                { label: 'Siswa Aktif', value: stats?.siswaAktif ?? 0, icon: '✅' },
                { label: 'Sesi Bulan Ini', value: stats?.sesibulanIni ?? 0, icon: '📅' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
                  <div className="text-xl mb-0.5" aria-hidden="true">{stat.icon}</div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-emerald-200 text-[10px]">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Action */}
          <Link href="/teacher/create-session">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex items-center gap-3 hover:bg-blue-100 transition-colors cursor-pointer">
              <div className="w-10 h-10 bg-blue-800 rounded-xl flex items-center justify-center flex-shrink-0">
                <PlusCircle size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-blue-900 text-sm">Buat Sesi Baru</p>
                <p className="text-blue-600 text-xs">Jadwalkan kelas live atau upload materi</p>
              </div>
              <ChevronRight size={16} className="text-blue-400" />
            </div>
          </Link>

          {/* Student Progress */}
          <section aria-labelledby="progress-heading">
            <div className="flex items-center justify-between mb-3">
              <h2 id="progress-heading" className="font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-700" />
                Progress Siswa
              </h2>
              <Link href="/teacher/students" className="text-xs text-blue-600 font-medium hover:underline">
                Lihat semua
              </Link>
            </div>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                {students.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">Belum ada siswa terdaftar</p>
                )}
                {students.map((s) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: s.avatar_color }}
                      role="img"
                      aria-label={`Avatar ${s.nama}`}
                    >
                      {s.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-800 truncate">{s.nama}</span>
                        <span className="text-xs font-bold text-blue-700 ml-2 flex-shrink-0">{s.progress}%</span>
                      </div>
                      <Progress
                        value={s.progress}
                        className="h-1.5"
                        indicatorClassName={
                          s.progress >= 80 ? "bg-emerald-500" :
                          s.progress >= 50 ? "bg-blue-500" : "bg-amber-500"
                        }
                      />
                    </div>
                    <Badge className={`text-[10px] flex-shrink-0 ${getDisabilitasBadgeColor(s.disabilitas)}`}>
                      {s.disabilitas === 'none' ? '—' : s.disabilitas === 'tunanetra' ? '👁️' : s.disabilitas === 'tunarungu' ? '👂' : '♿'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          {/* Upcoming Sessions */}
          <section aria-labelledby="jadwal-heading">
            <div className="flex items-center gap-2 mb-3">
              <h2 id="jadwal-heading" className="font-semibold text-slate-900 flex items-center gap-2">
                <Calendar size={16} className="text-blue-700" />
                Jadwal Sesi
              </h2>
            </div>
            {upcomingSessions.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Belum ada sesi terjadwal</p>
            )}
            <div className="space-y-2">
              {upcomingSessions.map((sess) => (
                <div key={sess.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3 shadow-sm">
                  <div className={`w-2 h-12 rounded-full flex-shrink-0 ${sess.status === 'live' ? 'bg-red-500' : 'bg-blue-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{sess.judul}</p>
                    <p className="text-xs text-slate-500">{sess.tanggal} • {sess.waktu} WIB</p>
                  </div>
                  <Badge
                    variant={sess.status === 'live' ? 'live' : 'default'}
                    className="flex-shrink-0 text-[10px]"
                  >
                    {sess.status === 'live' ? 'LIVE' : 'Terjadwal'}
                  </Badge>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <AccessibilityBar />
    </div>
  );
}