'use client';

import { useState, useEffect } from 'react';
import { BarChart2, Download, TrendingUp, Users, AlertCircle } from 'lucide-react';
import TeacherSidebar from '@/components/shared/TeacherSidebar';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { createClient } from '@/lib/supabase/client';
import { getDisabilitasBadgeColor } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';

interface StudentStat {
  id: string;
  nama: string;
  avatar: string;
  avatar_color: string;
  disabilitas: string;
  progress: number;
  tts_enabled: boolean;
  subtitle_enabled: boolean;
  high_contrast: boolean;
  font_size: string;
}

export default function ReportPage() {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [students, setStudents] = useState<StudentStat[]>([]);
  const [totalSesi, setTotalSesi] = useState(0);
  const [teacherNama, setTeacherNama] = useState('');

  useEffect(() => {
    const supabase = createClient();
    async function loadReport() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from('profiles').select('nama').eq('id', user.id).single();
      setTeacherNama(profile?.nama || 'Pendamping');

      // Semua siswa + accessibility settings + progress
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nama, avatar, avatar_color, student_profiles(disabilitas)')
        .eq('role', 'student');

      const rows: StudentStat[] = [];
      for (const p of profiles || []) {
        const { data: acc } = await supabase
          .from('accessibility_settings')
          .select('tts_enabled, subtitle_enabled, high_contrast, font_size')
          .eq('id', p.id)
          .maybeSingle();

        const { data: progressData } = await supabase
          .from('student_material_progress')
          .select('progress')
          .eq('student_id', p.id);

        const avg = progressData && progressData.length > 0
          ? Math.round(progressData.reduce((s, x) => s + x.progress, 0) / progressData.length)
          : 0;

        rows.push({
          id: p.id,
          nama: p.nama,
          avatar: p.avatar || p.nama.charAt(0),
          avatar_color: p.avatar_color || '#1E40AF',
          disabilitas: (p.student_profiles as any)?.disabilitas || 'none',
          progress: avg,
          tts_enabled: acc?.tts_enabled || false,
          subtitle_enabled: acc?.subtitle_enabled || false,
          high_contrast: acc?.high_contrast || false,
          font_size: acc?.font_size || 'normal',
        });
      }
      setStudents(rows);

      // Total sesi bulan ini
      const bulanIni = new Date().toISOString().slice(0, 7);
      const { count } = await supabase
        .from('live_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('guru_id', user.id)
        .gte('tanggal', bulanIni + '-01');
      setTotalSesi(count || 0);

      setLoading(false);
    }
    loadReport();
  }, []);

  // Hitung stats dari data asli
  const totalSiswa = students.length;
  const siswaAktif = students.filter(s => s.progress > 0).length;
  const pakaiAksesibilitas = students.filter(s =>
    s.tts_enabled || s.subtitle_enabled || s.high_contrast || s.font_size !== 'normal'
  ).length;
  const avgProgress = totalSiswa > 0
    ? Math.round(students.reduce((sum, s) => sum + s.progress, 0) / totalSiswa)
    : 0;
  const pctAksesibilitas = totalSiswa > 0 ? Math.round((pakaiAksesibilitas / totalSiswa) * 100) : 0;

  const fiturStats = [
    { label: 'Text-to-Speech', icon: '🔊', color: 'bg-purple-500', users: students.filter(s => s.tts_enabled).length },
    { label: 'Subtitle Otomatis', icon: '📝', color: 'bg-blue-500', users: students.filter(s => s.subtitle_enabled).length },
    { label: 'Kontras Tinggi', icon: '☀️', color: 'bg-amber-500', users: students.filter(s => s.high_contrast).length },
    { label: 'Font Besar', icon: '🔡', color: 'bg-pink-500', users: students.filter(s => s.font_size !== 'normal').length },
  ].map(f => ({ ...f, usage: totalSiswa > 0 ? Math.round((f.users / totalSiswa) * 100) : 0 }));

  const siswaNoAksesibilitas = students.filter(s =>
    !s.tts_enabled && !s.subtitle_enabled && !s.high_contrast && s.font_size === 'normal'
  );

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Import jsPDF secara dinamis
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const tanggal = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

      // Header
      doc.setFillColor(30, 64, 175);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('AKSES - Laporan Aksesibilitas', 15, 18);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Pendamping: ${teacherNama}  |  Tanggal: ${tanggal}`, 15, 30);

      // Ringkasan
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Ringkasan Utama', 15, 55);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const ringkasan = [
        `Total Siswa: ${totalSiswa}`,
        `Siswa Aktif (progress > 0): ${siswaAktif}`,
        `Pengguna Fitur Aksesibilitas: ${pakaiAksesibilitas} (${pctAksesibilitas}%)`,
        `Rata-rata Progress Belajar: ${avgProgress}%`,
        `Total Sesi Live Bulan Ini: ${totalSesi}`,
      ];
      ringkasan.forEach((line, i) => {
        doc.text(`• ${line}`, 15, 65 + i * 8);
      });

      // Penggunaan Fitur
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Penggunaan Fitur Aksesibilitas', 15, 115);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      fiturStats.forEach((f, i) => {
        const y = 125 + i * 10;
        doc.text(`${f.label}`, 15, y);
        doc.text(`${f.users} siswa (${f.usage}%)`, 130, y);
        // Bar chart sederhana
        doc.setFillColor(226, 232, 240);
        doc.rect(15, y + 2, 100, 3, 'F');
        doc.setFillColor(30, 64, 175);
        doc.rect(15, y + 2, f.usage, 3, 'F');
      });

      // Progress Individual
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Progress Individual Siswa', 15, 175);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      // Header tabel
      doc.setFillColor(241, 245, 249);
      doc.rect(15, 180, 180, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('Nama', 17, 186);
      doc.text('Disabilitas', 80, 186);
      doc.text('Progress', 130, 186);
      doc.text('TTS', 160, 186);
      doc.text('Subtitle', 175, 186);

      doc.setFont('helvetica', 'normal');
      students.forEach((s, i) => {
        const y = 195 + i * 8;
        if (y > 270) return; // Batas halaman
        if (i % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, y - 5, 180, 8, 'F');
        }
        doc.setTextColor(0, 0, 0);
        doc.text(s.nama.substring(0, 20), 17, y);
        doc.text(s.disabilitas === 'none' ? '-' : s.disabilitas, 80, y);
        doc.text(`${s.progress}%`, 130, y);
        doc.text(s.tts_enabled ? 'Ya' : 'Tidak', 160, y);
        doc.text(s.subtitle_enabled ? 'Ya' : 'Tidak', 175, y);
      });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Laporan dibuat otomatis oleh Platform AKSES | ${tanggal}`, 15, 285);

      doc.save(`Laporan_AKSES_${tanggal.replace(/ /g, '_')}.pdf`);
    } catch (err) {
      alert('Gagal membuat PDF. Pastikan koneksi internet stabil.');
    }
    setDownloading(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <TeacherSidebar />
        <main className="flex-1 sm:ml-60 p-4">
          <div className="space-y-4 animate-pulse max-w-3xl mx-auto">
            <div className="h-40 bg-slate-200 rounded-2xl" />
            <div className="h-32 bg-slate-200 rounded-2xl" />
            <div className="h-48 bg-slate-200 rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <TeacherSidebar />
      <main id="main-content" className="flex-1 sm:ml-60 pb-4">
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3">
          <h1 className="font-bold text-slate-900 flex items-center gap-2">
            <BarChart2 size={18} className="text-blue-700" />
            Laporan Aksesibilitas
          </h1>
        </div>

        <div className="p-4 max-w-3xl mx-auto space-y-5">
          {/* Ringkasan */}
          <div className="bg-gradient-to-br from-blue-800 to-blue-600 rounded-2xl p-5 text-white">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-blue-200 text-xs uppercase font-semibold tracking-wide">Ringkasan Utama</p>
                <p className="text-xl font-bold mt-1">
                  {pctAksesibilitas}% siswa menggunakan fitur aksesibilitas saat belajar
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Siswa', value: totalSiswa },
                { label: 'Siswa Aktif', value: siswaAktif },
                { label: 'Pakai Aksesibilitas', value: pakaiAksesibilitas },
              ].map(stat => (
                <div key={stat.label} className="bg-white/15 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-[10px] text-blue-200">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* SMART Progress */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp size={15} className="text-blue-700" />
                SMART Progress Aksesibilitas
              </h2>
              <div className="space-y-4">
                {[
                  { label: `Spesifik: ${students.filter(s => s.disabilitas !== 'none').length} dari ${totalSiswa} siswa punya kebutuhan aksesibilitas`, done: true },
                  { label: `Terukur: Rata-rata progress belajar ${avgProgress}%`, done: avgProgress > 0 },
                  { label: `Achievable: ${siswaAktif} dari ${totalSiswa} siswa aktif belajar`, done: siswaAktif > 0 },
                  { label: `Relevant: ${fiturStats.filter(f => f.users > 0).length} fitur aksesibilitas aktif digunakan`, done: pakaiAksesibilitas > 0 },
                  { label: `Time-bound: ${totalSesi} sesi live terlaksana bulan ini`, done: totalSesi > 0 },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                      item.done ? "bg-emerald-500" : "bg-slate-200")}>
                      {item.done && <span className="text-white text-[10px]">✓</span>}
                    </div>
                    <p className={cn("text-sm", item.done ? "text-slate-800" : "text-slate-400")}>{item.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Penggunaan Fitur */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <BarChart2 size={15} className="text-blue-700" />
                Penggunaan per Fitur Aksesibilitas
              </h2>
              <div className="space-y-4">
                {fiturStats.map(f => (
                  <div key={f.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{f.icon}</span>
                        <span className="text-sm font-medium text-slate-700">{f.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{f.users} siswa</span>
                        <span className="text-sm font-bold text-blue-700">{f.usage}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div className={`h-2.5 rounded-full transition-all duration-700 ${f.color}`}
                        style={{ width: `${f.usage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Progress Individual */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Users size={15} className="text-blue-700" />
                Progress Individual
              </h2>
              {students.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Belum ada siswa terdaftar</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {students.map(s => (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: s.avatar_color }}>
                        {s.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-xs font-semibold text-slate-800 truncate">{s.nama}</span>
                          <Badge className={cn("text-[9px] flex-shrink-0 px-1", getDisabilitasBadgeColor(s.disabilitas))}>
                            {s.disabilitas === 'tunanetra' ? '👁️' : s.disabilitas === 'tunarungu' ? '👂' : s.disabilitas === 'both' ? '♿' : '—'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Progress value={s.progress} className="h-1.5 flex-1"
                            indicatorClassName={s.progress >= 80 ? "bg-emerald-500" : s.progress >= 50 ? "bg-blue-500" : "bg-amber-500"} />
                          <span className="text-[10px] font-bold text-blue-700 flex-shrink-0">{s.progress}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Siswa belum pakai aksesibilitas */}
          {siswaNoAksesibilitas.length > 0 && (
            <Card className="border-0 shadow-sm ring-1 ring-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-amber-900 text-sm">Siswa Belum Menggunakan Aksesibilitas</h3>
                    <p className="text-xs text-amber-700 mt-0.5">Siswa berikut belum mengaktifkan fitur aksesibilitas apapun</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {siswaNoAksesibilitas.map(s => (
                    <div key={s.id} className="flex items-center gap-2 bg-white rounded-lg p-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: s.avatar_color }}>
                        {s.avatar}
                      </div>
                      <span className="text-sm font-medium text-slate-800 flex-1">{s.nama}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Download PDF */}
          <button onClick={handleDownload} disabled={downloading}
            className="w-full flex items-center justify-center gap-2 h-12 bg-blue-800 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-60">
            {downloading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Membuat PDF...</>
            ) : (
              <><Download size={16} />Unduh Laporan PDF</>
            )}
          </button>
        </div>
      </main>
      <AccessibilityBar />
    </div>
  );
}
