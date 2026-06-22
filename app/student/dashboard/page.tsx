'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight, BookOpen, Radio, Clock, Star, TrendingUp, Calendar } from 'lucide-react';
import StudentBottomNav from '@/components/shared/StudentBottomNav';
import StudentSidebar from '@/components/shared/StudentSidebar';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import materials from '@/lib/mock-data/materials.json';
import sessions from '@/lib/mock-data/sessions.json';

const student = {
  nama: 'Alex Pratama',
  kelas: 'X IPA 1',
  progress: 72,
  weeklyProgress: 60,
};

function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-32 bg-slate-200 rounded-2xl" />
      <div className="h-8 bg-slate-200 rounded-lg w-48" />
      <div className="grid grid-cols-3 gap-3">
        {[1,2,3].map(i => <div key={i} className="h-28 bg-slate-200 rounded-xl" />)}
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const liveSession = sessions.find(s => s.status === 'live');
  const recentMaterials = materials.slice(0, 3);
  const recommendedMaterials = materials.filter(m => m.mode === 'audio').slice(0, 3);

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <StudentSidebar />
        <main className="flex-1 sm:ml-60 p-4 pb-24">
          <DashboardSkeleton />
        </main>
        <StudentBottomNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <StudentSidebar />

      <main id="main-content" className="flex-1 sm:ml-60 pb-20 sm:pb-4">
        {/* Top bar */}
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-800 rounded-lg flex items-center justify-center sm:hidden">
              <span className="text-white font-bold text-xs">A</span>
            </div>
            <span className="font-bold text-blue-900 sm:hidden">AKSES</span>
          </div>
        </div>

        <div className="p-4 space-y-5 max-w-2xl mx-auto sm:max-w-3xl">
          {/* Hero Greeting */}
          <div className="bg-gradient-to-br from-blue-800 to-blue-600 rounded-2xl p-5 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="absolute bottom-0 right-8 w-20 h-20 bg-white/5 rounded-full translate-y-8" />
            <p className="text-blue-200 text-sm mb-1">{today}</p>
            <h1 className="text-2xl font-bold mb-3">Halo, {student.nama}! 👋</h1>
            <p className="text-blue-100 text-sm mb-4">Semangat belajar hari ini!</p>

            {/* Weekly Progress */}
            <div className="bg-white/15 rounded-xl p-3 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} />
                  <span className="text-sm font-medium">Progress Minggu Ini</span>
                </div>
                <span className="text-lg font-bold">{student.weeklyProgress}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-amber-400 h-2 rounded-full transition-all duration-700"
                  style={{ width: `${student.weeklyProgress}%` }}
                  role="progressbar"
                  aria-valuenow={student.weeklyProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progress minggu ini ${student.weeklyProgress}%`}
                />
              </div>
              <p className="text-blue-200 text-xs mt-1">3 dari 5 materi selesai minggu ini</p>
            </div>
          </div>

          {/* Live Session Alert */}
          {liveSession && (
            <Link href="/student/live">
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-center gap-3 hover:bg-red-100 transition-colors cursor-pointer"
                role="alert"
                aria-live="polite"
              >
                <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0 live-indicator">
                  <Radio size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="live" className="text-[10px] px-2 py-0.5">LIVE</Badge>
                    <span className="text-xs text-slate-500">{liveSession.mataPelajaran}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 truncate">{liveSession.judul}</p>
                  <p className="text-xs text-slate-500">{liveSession.guru}</p>
                </div>
                <ChevronRight size={18} className="text-red-400 flex-shrink-0" />
              </div>
            </Link>
          )}

          {/* Lanjutkan Belajar */}
          <section aria-labelledby="lanjutkan-heading">
            <div className="flex items-center justify-between mb-3">
              <h2 id="lanjutkan-heading" className="font-semibold text-slate-900 flex items-center gap-2">
                <BookOpen size={16} className="text-blue-700" />
                Lanjutkan Belajar
              </h2>
              <Link href="/student/learn" className="text-xs text-blue-600 font-medium hover:underline">
                Lihat semua
              </Link>
            </div>

            <div className="space-y-3">
              {recentMaterials.map((m) => (
                <Link key={m.id} href={`/student/learn/${m.id}`}>
                  <Card className="hover:shadow-md transition-all card-hover border-0 shadow-sm">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ backgroundColor: m.thumbnailColor + '20' }}
                        aria-hidden="true"
                      >
                        {m.thumbnailEmoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant={m.mode as 'audio' | 'visual' | 'both'} className="text-[10px]">
                            {m.mode === 'audio' ? '🔊 Audio' : m.mode === 'visual' ? '👁️ Visual' : '🔊 Audio & Visual'}
                          </Badge>
                        </div>
                        <p className="text-sm font-semibold text-slate-800 truncate">{m.judul}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={m.progress} className="h-1.5 flex-1" />
                          <span className="text-xs text-slate-500 flex-shrink-0">{m.progress}%</span>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          {/* Rekomendasi */}
          <section aria-labelledby="rekomendasi-heading">
            <div className="flex items-center justify-between mb-3">
              <h2 id="rekomendasi-heading" className="font-semibold text-slate-900 flex items-center gap-2">
                <Star size={16} className="text-amber-500" />
                Rekomendasi Untukmu
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recommendedMaterials.map((m) => (
                <Link key={m.id} href={`/student/learn/${m.id}`}>
                  <Card className="hover:shadow-md transition-all card-hover border-0 shadow-sm h-full">
                    <CardContent className="p-3">
                      <div
                        className="w-full h-20 rounded-xl flex items-center justify-center text-3xl mb-3"
                        style={{ backgroundColor: m.thumbnailColor + '15' }}
                        aria-hidden="true"
                      >
                        {m.thumbnailEmoji}
                      </div>
                      <Badge variant={m.mode as 'audio' | 'visual'} className="text-[10px] mb-1">
                        {m.mode === 'audio' ? '🔊 Audio' : '👁️ Visual'}
                      </Badge>
                      <p className="text-sm font-semibold text-slate-800 leading-tight mb-1">{m.judul}</p>
                      <div className="flex items-center gap-1 text-slate-400">
                        <Clock size={11} />
                        <span className="text-xs">{m.durasi} menit</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          {/* Jadwal Hari Ini */}
          <section aria-labelledby="jadwal-heading">
            <div className="flex items-center gap-2 mb-3">
              <h2 id="jadwal-heading" className="font-semibold text-slate-900 flex items-center gap-2">
                <Calendar size={16} className="text-blue-700" />
                Jadwal Kelas Hari Ini
              </h2>
            </div>
            <div className="space-y-2">
              {sessions.filter(s => s.status !== 'done').slice(0, 2).map((sess) => (
                <div key={sess.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
                  <div className={`w-2 h-10 rounded-full flex-shrink-0 ${sess.status === 'live' ? 'bg-red-500' : 'bg-blue-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{sess.judul}</p>
                    <p className="text-xs text-slate-500">{sess.guru} • {sess.waktu} WIB</p>
                  </div>
                  <Badge variant={sess.status === 'live' ? 'live' : 'default'} className="flex-shrink-0 text-[10px]">
                    {sess.status === 'live' ? 'LIVE' : 'Terjadwal'}
                  </Badge>
                </div>
              ))}
            </div>
          </section>

          {/* Butuh Bantuan */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
            <p className="text-sm font-semibold text-blue-900 mb-1">Butuh bantuan khusus?</p>
            <p className="text-xs text-blue-600 mb-3">Tim pendamping kami siap membantu kapan saja</p>
            <button
              className="bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Hubungi pendamping aksesibilitas"
            >
              Hubungi Pendamping
            </button>
          </div>
        </div>
      </main>

      <StudentBottomNav />
      <AccessibilityBar />
    </div>
  );
}
