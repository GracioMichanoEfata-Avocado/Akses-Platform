'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Star, BookOpen, Flame, Mail, AlertCircle } from 'lucide-react';
import TeacherSidebar from '@/components/shared/TeacherSidebar';
import TeacherMobileNav from '@/components/shared/TeacherMobileNav';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { createClient } from '@/lib/supabase/client';
import { getDisabilitasLabel, getDisabilitasBadgeColor } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';

interface StudentDetail {
  nama: string;
  email: string;
  avatar: string;
  avatarColor: string;
  disabilitas: string;
  kelas: string | null;
  catatan: string | null;
  catatanPendamping: string;
  streakHari: number;
  waktuBelajarMenit: number;
}

interface MaterialProgress {
  materialId: string;
  judul: string;
  emoji: string;
  progress: number;
  skorTerakhir: number | null;
  updatedAt: string;
}

interface QuizRow {
  id: string;
  judul: string;
  tanggal: string;
  skor: number;
  lulus: boolean;
}

const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// Jumlah materi yang dikerjakan per hari, 7 hari terakhir (hari ini paling kanan).
function buildActivity(progress: MaterialProgress[]) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return { key: dayKey(d), label: DAY_LABELS[d.getDay()], count: 0 };
  });
  for (const p of progress) {
    const day = days.find((d) => d.key === dayKey(new Date(p.updatedAt)));
    if (day) day.count++;
  }
  return days;
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [progress, setProgress] = useState<MaterialProgress[]>([]);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: profile } = await supabase
        .from('profiles')
        .select('nama, email, avatar, avatar_color, student_profiles(disabilitas, kelas, catatan, catatan_pendamping, streak_hari, waktu_belajar_menit)')
        .eq('id', id)
        .eq('role', 'student')
        .maybeSingle();

      if (!profile) {
        router.replace('/teacher/students');
        return;
      }

      const sp = (profile.student_profiles as any) || {};
      setStudent({
        nama: profile.nama,
        email: profile.email,
        avatar: profile.avatar || profile.nama.charAt(0),
        avatarColor: profile.avatar_color || '#1E40AF',
        disabilitas: sp.disabilitas || 'none',
        kelas: sp.kelas ?? null,
        catatan: sp.catatan ?? null,
        catatanPendamping: sp.catatan_pendamping ?? '',
        streakHari: sp.streak_hari ?? 0,
        waktuBelajarMenit: sp.waktu_belajar_menit ?? 0,
      });
      setCatatan(sp.catatan_pendamping ?? '');

      const [{ data: progressData }, { data: attemptData }] = await Promise.all([
        supabase
          .from('student_material_progress')
          .select('material_id, progress, skor_terakhir, updated_at')
          .eq('student_id', id)
          .order('updated_at', { ascending: false }),
        supabase
          .from('quiz_attempts')
          .select('id, quiz_id, skor, lulus, tanggal')
          .eq('student_id', id)
          .order('tanggal', { ascending: false })
          .limit(10),
      ]);

      const materialIds = (progressData || []).map((p) => p.material_id);
      const quizIds = Array.from(new Set((attemptData || []).map((a) => a.quiz_id)));

      const [{ data: materialsData }, { data: quizData }] = await Promise.all([
        materialIds.length
          ? supabase.from('materials').select('id, judul, thumbnail_emoji').in('id', materialIds)
          : Promise.resolve({ data: [] as { id: string; judul: string; thumbnail_emoji: string | null }[] }),
        quizIds.length
          ? supabase.from('quizzes').select('id, judul').in('id', quizIds)
          : Promise.resolve({ data: [] as { id: string; judul: string }[] }),
      ]);

      setProgress(
        (progressData || []).flatMap((p) => {
          const m = materialsData?.find((x) => x.id === p.material_id);
          if (!m) return [];
          return [{
            materialId: p.material_id,
            judul: m.judul,
            emoji: m.thumbnail_emoji || '📘',
            progress: p.progress,
            skorTerakhir: p.skor_terakhir,
            updatedAt: p.updated_at,
          }];
        })
      );

      setQuizzes(
        (attemptData || []).map((a) => ({
          id: a.id,
          judul: quizData?.find((q) => q.id === a.quiz_id)?.judul || 'Kuis',
          tanggal: a.tanggal,
          skor: a.skor,
          lulus: a.lulus,
        }))
      );

      setLoading(false);
    }
    load();
  }, [id, router]);

  const handleSaveCatatan = async () => {
    setSaving(true);
    setSaveError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc('set_catatan_pendamping', {
      p_student_id: id,
      p_catatan: catatan,
    });
    setSaving(false);
    if (error) {
      console.error('Gagal simpan catatan:', error.message);
      setSaveError('Catatan gagal disimpan. Coba lagi.');
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading || !student) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <TeacherSidebar />
        <main id="main-content" className="flex-1 lg:ml-60 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin" role="status" aria-label="Memuat data siswa" />
        </main>
      </div>
    );
  }

  const activity = buildActivity(progress);
  const maxActivity = Math.max(...activity.map((a) => a.count), 1);
  const skorRataRata = quizzes.length
    ? Math.round(quizzes.reduce((s, q) => s + q.skor, 0) / quizzes.length)
    : null;

  const statCards = [
    {
      label: 'Waktu Belajar',
      value: `${Math.floor(student.waktuBelajarMenit / 60)}j ${student.waktuBelajarMenit % 60}m`,
      icon: Clock,
      color: 'text-blue-700',
      bg: 'bg-blue-50',
    },
    {
      label: 'Rata-rata Skor',
      value: skorRataRata === null ? '–' : `${skorRataRata}`,
      icon: Star,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Materi Selesai',
      value: `${progress.filter((p) => p.progress === 100).length}`,
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

      <main id="main-content" className="flex-1 lg:ml-60 pb-8">
        {/* Top bar */}
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center gap-3">
          <TeacherMobileNav />
          <button
            onClick={() => router.push('/teacher/students')}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm transition-colors flex-shrink-0"
            aria-label="Kembali ke daftar siswa"
          >
            <ArrowLeft size={16} />
            Kembali
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-semibold text-slate-800 truncate">{student.nama}</span>
        </div>

        <div className="p-4 space-y-5 max-w-3xl xl:max-w-5xl mx-auto">
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
                <Badge className={cn('text-xs', getDisabilitasBadgeColor(student.disabilitas as any))}>
                  {getDisabilitasLabel(student.disabilitas as any)}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 text-sm min-w-0">
                <Mail size={13} className="flex-shrink-0" />
                <span className="truncate">{student.email}</span>
              </div>
              {student.kelas && <p className="text-xs text-slate-400 mt-0.5">{student.kelas}</p>}
              {student.catatan && <p className="text-xs text-slate-500 mt-1">{student.catatan}</p>}
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
            <h2 className="font-semibold text-slate-900">Aktivitas 7 Hari Terakhir</h2>
            <p className="text-xs text-slate-400 mb-4">Jumlah materi yang dikerjakan per hari</p>
            <div className="flex items-end gap-2 h-28">
              {activity.map((day) => {
                const heightPct = Math.round((day.count / maxActivity) * 100);
                return (
                  <div key={day.key} className="flex-1 h-full flex flex-col items-center justify-end gap-1">
                    <div
                      className={cn('w-full rounded-t-md transition-all', day.count > 0 ? 'bg-blue-500' : 'bg-slate-100')}
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                      role="img"
                      aria-label={`${day.label}: ${day.count} materi`}
                    />
                    <span className="text-[10px] text-slate-400">{day.label}</span>
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
              {progress.map((pm) => (
                <div key={pm.materialId} className="flex items-center gap-3">
                  <span className="text-xl flex-shrink-0" aria-hidden="true">
                    {pm.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{pm.judul}</p>
                      {pm.skorTerakhir !== null && (
                        <Badge
                          className={cn(
                            'text-[10px] flex-shrink-0 ml-2',
                            pm.skorTerakhir >= 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          )}
                        >
                          Skor {pm.skorTerakhir}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={pm.progress} className="h-1.5 flex-1" />
                      <span className="text-xs text-slate-400 flex-shrink-0">{pm.progress}%</span>
                    </div>
                  </div>
                </div>
              ))}
              {progress.length === 0 && (
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
                  {quizzes.map((kuis) => (
                    <tr key={kuis.id}>
                      <td className="py-2.5 pr-4 text-slate-800 font-medium">{kuis.judul}</td>
                      <td className="py-2.5 pr-4 text-slate-500 text-xs">
                        {new Date(kuis.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
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
              {quizzes.length === 0 && (
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
            {saveError && (
              <div role="alert" className="mt-2 flex items-center gap-2 text-sm text-red-600">
                <AlertCircle size={14} className="shrink-0" />
                {saveError}
              </div>
            )}
            <button
              onClick={handleSaveCatatan}
              disabled={saving}
              className={cn(
                'mt-3 px-5 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60',
                saved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-800 text-white hover:bg-blue-700'
              )}
              aria-label="Simpan catatan pendamping"
            >
              {saved ? '✓ Tersimpan' : saving ? 'Menyimpan...' : 'Simpan Catatan'}
            </button>
          </div>
        </div>
      </main>

      <AccessibilityBar />
    </div>
  );
}
