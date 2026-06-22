'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Star, BookOpen, Flame, Mail } from 'lucide-react';
import TeacherSidebar from '@/components/shared/TeacherSidebar';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import studentsData from '@/lib/mock-data/students.json';
import materialsData from '@/lib/mock-data/materials.json';
import { getDisabilitasLabel, getDisabilitasBadgeColor } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';

type Student = typeof studentsData[0];

const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const student = studentsData.find((s) => s.id === id) as Student | undefined;
  const [catatan, setCatatan] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!student) {
      router.replace('/teacher/students');
      return;
    }
    const stored = localStorage.getItem(`akses-catatan-${id}`);
    setCatatan(stored ?? student.catatanPendamping ?? '');
  }, [id, student, router]);

  if (!student) return null;

  const studentMaterials = materialsData.filter((m) =>
    student.materiDiakses.includes(m.id)
  );

  const maxActivity = Math.max(...student.aktivitas7Hari, 1);

  const handleSaveCatatan = () => {
    localStorage.setItem(`akses-catatan-${id}`, catatan);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const statCards = [
    {
      label: 'Waktu Belajar',
      value: `${Math.floor(student.waktuBelajar / 60)}j ${student.waktuBelajar % 60}m`,
      icon: Clock,
      color: 'text-blue-700',
      bg: 'bg-blue-50',
    },
    {
      label: 'Rata-rata Skor',
      value: `${student.skorRataRata}`,
      icon: Star,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Materi Selesai',
      value: `${student.progressMateri.filter((p) => p.progress === 100).length}`,
      icon: BookOpen,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Streak',
      value: `${student.streakHari} hari`,
      icon: Flame,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <TeacherSidebar />

      <main id="main-content" className="flex-1 sm:ml-60 pb-8">
        {/* Top bar */}
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push('/teacher/students')}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm transition-colors"
            aria-label="Kembali ke daftar siswa"
          >
            <ArrowLeft size={16} />
            Kembali
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-semibold text-slate-800 truncate">{student.nama}</span>
        </div>

        <div className="p-4 space-y-5 max-w-3xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
              style={{ backgroundColor: student.avatarColor }}
              role="img"
              aria-label={`Avatar ${student.nama}`}
            >
              {student.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-xl font-bold text-slate-900">{student.nama}</h1>
                <Badge className={cn('text-xs', getDisabilitasBadgeColor(student.disabilitas))}>
                  {getDisabilitasLabel(student.disabilitas)}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                <Mail size={13} />
                <span>{student.email}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{student.kelas}</p>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statCards.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className={cn('rounded-xl p-4', s.bg)}>
                  <Icon size={18} className={cn('mb-2', s.color)} aria-hidden="true" />
                  <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                </div>
              );
            })}
          </div>

          {/* Aktivitas 7 Hari */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900 mb-4">Aktivitas 7 Hari Terakhir</h2>
            <div className="flex items-end gap-2 h-28">
              {student.aktivitas7Hari.map((val, idx) => {
                const heightPct = Math.round((val / maxActivity) * 100);
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-blue-500 rounded-t-md transition-all"
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                      role="img"
                      aria-label={`${DAYS[idx]}: ${val} menit`}
                    />
                    <span className="text-[10px] text-slate-400">{DAYS[idx]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress Per Materi */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <BookOpen size={16} className="text-blue-700" />
              Progress Per Materi
            </h2>
            <div className="space-y-3">
              {student.progressMateri.map((pm) => {
                const materi = materialsData.find((m) => m.id === pm.materiId);
                if (!materi) return null;
                return (
                  <div key={pm.materiId} className="flex items-center gap-3">
                    <span className="text-xl flex-shrink-0" aria-hidden="true">
                      {materi.thumbnailEmoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-slate-800 truncate">{materi.judul}</p>
                        <Badge
                          className={cn(
                            'text-[10px] flex-shrink-0 ml-2',
                            pm.skorTerakhir >= 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          )}
                        >
                          Skor {pm.skorTerakhir}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={pm.progress} className="h-1.5 flex-1" />
                        <span className="text-xs text-slate-400 flex-shrink-0">{pm.progress}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {student.progressMateri.length === 0 && (
                <p className="text-sm text-slate-400">Belum ada materi yang diakses.</p>
              )}
            </div>
          </div>

          {/* Riwayat Kuis */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900 mb-3">Riwayat Kuis</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Riwayat kuis siswa">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                    <th className="pb-2 font-medium">Nama Kuis</th>
                    <th className="pb-2 font-medium">Tanggal</th>
                    <th className="pb-2 font-medium text-center">Skor</th>
                    <th className="pb-2 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {student.riwayatKuis.map((kuis, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 pr-4 text-slate-800 font-medium">{kuis.nama}</td>
                      <td className="py-2.5 pr-4 text-slate-500 text-xs">{kuis.tanggal}</td>
                      <td className="py-2.5 pr-4 text-center font-bold text-slate-700">{kuis.skor}</td>
                      <td className="py-2.5 text-center">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                            kuis.lulus
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-600'
                          )}
                        >
                          {kuis.lulus ? 'Lulus' : 'Remedial'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {student.riwayatKuis.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">Belum ada riwayat kuis.</p>
              )}
            </div>
          </div>

          {/* Catatan Pendamping */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900 mb-3">Catatan Pendamping</h2>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Tulis catatan perkembangan, kebutuhan khusus, atau observasi siswa ini..."
              rows={4}
              className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-slate-50"
              aria-label="Catatan pendamping untuk siswa ini"
            />
            <button
              onClick={handleSaveCatatan}
              className={cn(
                'mt-3 px-5 py-2 rounded-xl text-sm font-semibold transition-colors',
                saved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-800 text-white hover:bg-blue-700'
              )}
              aria-label="Simpan catatan pendamping"
            >
              {saved ? '✓ Tersimpan' : 'Simpan Catatan'}
            </button>
          </div>
        </div>
      </main>

      <AccessibilityBar />
    </div>
  );
}
