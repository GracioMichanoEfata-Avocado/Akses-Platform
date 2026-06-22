'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight, BookOpen, Radio, Clock, TrendingUp, Calendar } from 'lucide-react';
import StudentBottomNav from '@/components/shared/StudentBottomNav';
import StudentSidebar from '@/components/shared/StudentSidebar';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { createClient } from '@/lib/supabase/client';

function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-36 bg-slate-200 rounded-2xl" />
      <div className="h-8 bg-slate-200 rounded-lg w-48" />
      <div className="grid grid-cols-3 gap-3">
        {[1,2,3].map(i => <div key={i} className="h-28 bg-slate-200 rounded-xl" />)}
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState('');
  const [progress, setProgress] = useState(0);
  const [materials, setMaterials] = useState<any[]>([]);
  const [liveSession, setLiveSession] = useState<any>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });

  useEffect(() => {
    const supabase = createClient();

    async function loadDashboard() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Profil siswa
      const { data: profile } = await supabase
        .from('profiles').select('nama').eq('id', user.id).single();
      setStudentName(profile?.nama || 'Siswa');

      // Progress rata-rata
      const { data: progressData } = await supabase
        .from('student_material_progress')
        .select('progress')
        .eq('student_id', user.id);
      const avg = progressData && progressData.length > 0
        ? Math.round(progressData.reduce((s, p) => s + p.progress, 0) / progressData.length)
        : 0;
      setProgress(avg);

      // Materi terbaru (3)
      const { data: materialsData } = await supabase
        .from('materials')
        .select('id, judul, mata_pelajaran, mode, thumbnail_color, thumbnail_emoji, durasi')
        .order('created_at', { ascending: false })
        .limit(3);
      setMaterials(materialsData || []);

      // Sesi yang sedang live
      const { data: live } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('status', 'live')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setLiveSession(live);

      // Jadwal sesi mendatang
      const today = new Date().toISOString().slice(0, 10);
      const { data: upcoming } = await supabase
        .from('live_sessions')
        .select('id, judul, tanggal, waktu, status, mata_pelajaran')
        .neq('status', 'ended')
        .gte('tanggal', today)
        .order('tanggal', { ascending: true })
        .limit(3);
      setUpcomingSessions(upcoming || []);

      setLoading(false);
    }

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <StudentSidebar />
        <main className="flex-1 sm:ml-60 p-4 pb-24"><DashboardSkeleton /></main>
        <StudentBottomNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <StudentSidebar />

      <main id="main-content" className="flex-1 sm:ml-60 pb-20 sm:pb-4">
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:hidden">
            <div className="w-8 h-8 bg-blue-800 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">A</span>
            </div>
            <span className="font-bold text-blue-900">AKSES</span>
          </div>
          <div className="hidden sm:block" />
          <div />
        </div>

        <div className="p-4 space-y-5 max-w-2xl mx-auto sm:max-w-3xl">
          {/* Hero Greeting */}
          <div className="bg-gradient-to-br from-blue-800 to-blue-600 rounded-2xl p-5 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
            <p className="text-blue-200 text-sm mb-1">{today}</p>
            <h1 className="text-2xl font-bold mb-3">Halo, {studentName}! 👋</h1>
            <div className="bg-white/15 rounded-xl p-3 backdrop-blur-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Progress Belajar</span>
                <span className="text-lg font-bold">{progress}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div className="bg-white rounded-full h-2 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          {/* Live Session Banner */}
          {liveSession && (
            <Link href="/student/live">
              <div className="bg-red-600 rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-red-200 cursor-pointer hover:bg-red-700 transition-colors">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Radio size={20} className="text-white animate-pulse" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold text-sm">Kelas Live Sedang Berlangsung!</p>
                  <p className="text-red-200 text-xs truncate">{liveSession.judul}</p>
                </div>
                <Badge variant="live" className="text-xs animate-pulse flex-shrink-0">● LIVE</Badge>
              </div>
            </Link>
          )}

          {/* Jadwal Sesi */}
          <section aria-labelledby="jadwal-heading">
            <div className="flex items-center justify-between mb-3">
              <h2 id="jadwal-heading" className="font-semibold text-slate-900 flex items-center gap-2">
                <Calendar size={16} className="text-blue-700" />
                Jadwal Mendatang
              </h2>
            </div>
            {upcomingSessions.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-3">Belum ada jadwal sesi mendatang</p>
            ) : (
              <div className="space-y-2">
                {upcomingSessions.map(sess => (
                  <div key={sess.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3 shadow-sm">
                    <div className={`w-2 h-10 rounded-full flex-shrink-0 ${sess.status === 'live' ? 'bg-red-500' : 'bg-blue-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{sess.judul}</p>
                      <p className="text-xs text-slate-500">{sess.tanggal} • {sess.waktu?.slice(0,5)} WIB</p>
                    </div>
                    <Badge variant={sess.status === 'live' ? 'live' : 'default'} className="text-[10px] flex-shrink-0">
                      {sess.status === 'live' ? '● LIVE' : 'Terjadwal'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Materi Terbaru */}
          <section aria-labelledby="materi-heading">
            <div className="flex items-center justify-between mb-3">
              <h2 id="materi-heading" className="font-semibold text-slate-900 flex items-center gap-2">
                <BookOpen size={16} className="text-blue-700" />
                Materi Terbaru
              </h2>
              <Link href="/student/learn" className="text-xs text-blue-600 font-medium hover:underline">
                Lihat semua
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {materials.map(m => (
                <Link key={m.id} href={`/student/learn/${m.id}`}>
                  <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                    <div
                      className="w-full h-16 rounded-lg flex items-center justify-center text-2xl mb-2"
                      style={{ backgroundColor: (m.thumbnail_color || '#1E40AF') + '18' }}
                    >
                      {m.thumbnail_emoji || '📘'}
                    </div>
                    <p className="text-xs font-semibold text-slate-800 leading-tight line-clamp-2">{m.judul}</p>
                    <p className="text-[10px] text-blue-600 mt-1">{m.mata_pelajaran}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>

      <StudentBottomNav />
      <AccessibilityBar />
    </div>
  );
}