'use client';

import { useState } from 'react';
import { BarChart2, Download, TrendingUp, Users, AlertCircle } from 'lucide-react';
import TeacherSidebar from '@/components/shared/TeacherSidebar';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import students from '@/lib/mock-data/students.json';
import { getDisabilitasBadgeColor } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';

const FITUR_STATS = [
  { label: 'Text-to-Speech', usage: 87, color: 'bg-purple-500', icon: '🔊', users: 7 },
  { label: 'Subtitle Otomatis', usage: 65, color: 'bg-blue-500', icon: '📝', users: 5 },
  { label: 'Kontras Tinggi', usage: 40, color: 'bg-amber-500', icon: '☀️', users: 3 },
  { label: 'Subtitle Otomatis', usage: 30, color: 'bg-cyan-500', icon: '🔤', users: 2 },
  { label: 'Font Besar', usage: 15, color: 'bg-pink-500', icon: '🔡', users: 1 },
];

const siswaNoAksesibilitas = students.filter(s => s.disabilitas === 'none');

export default function ReportPage() {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => setDownloading(false), 2000);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <TeacherSidebar />

      <main id="main-content" className="flex-1 sm:ml-60 pb-4">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-slate-900 flex items-center gap-2">
            <BarChart2 size={18} className="text-blue-700" />
            Laporan Aksesibilitas
          </h1>
        </div>

        <div className="p-4 max-w-3xl mx-auto space-y-5">
          {/* Ringkasan Utama */}
          <div className="bg-gradient-to-br from-blue-800 to-blue-600 rounded-2xl p-5 text-white">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-blue-200 text-xs uppercase font-semibold tracking-wide">Ringkasan Utama</p>
                <p className="text-xl font-bold mt-1">87% siswa menggunakan fitur aksesibilitas saat belajar mandiri</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Siswa', value: students.length },
                { label: 'Pengguna Aktif', value: students.filter(s => s.progress > 50).length },
                { label: 'Pakai Aksesibilitas', value: students.filter(s => s.disabilitas !== 'none').length },
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
                  { label: 'Spesifik: 87% siswa punya disabilitas tersertifikasi', done: true },
                  { label: 'Terukur: Rata-rata progress belajar 68%', done: true },
                  { label: 'Achievable: 6 dari 8 siswa aktif minggu ini', done: true },
                  { label: 'Relevant: 5 fitur aksesibilitas tersedia & digunakan', done: true },
                  { label: 'Time-bound: Target 100% penggunaan TTS pada Q2 2026', done: false },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                      item.done ? "bg-emerald-500" : "bg-slate-200"
                    )}>
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
                {FITUR_STATS.map((f) => (
                  <div key={f.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base" aria-hidden="true">{f.icon}</span>
                        <span className="text-sm font-medium text-slate-700">{f.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{f.users} siswa</span>
                        <span className="text-sm font-bold text-blue-700">{f.usage}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-700 ${f.color}`}
                        style={{ width: `${f.usage}%` }}
                        role="progressbar"
                        aria-valuenow={f.usage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${f.label}: ${f.usage}%`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Individual Progress */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Users size={15} className="text-blue-700" />
                Progress Individual
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {students.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: s.avatarColor }}
                    >
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
                        <Progress
                          value={s.progress}
                          className="h-1.5 flex-1"
                          indicatorClassName={s.progress >= 80 ? "bg-emerald-500" : s.progress >= 50 ? "bg-blue-500" : "bg-amber-500"}
                        />
                        <span className="text-[10px] font-bold text-blue-700 flex-shrink-0">{s.progress}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Alert: Siswa belum pakai aksesibilitas */}
          {siswaNoAksesibilitas.length > 0 && (
            <Card className="border-0 shadow-sm ring-1 ring-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-amber-900 text-sm">Siswa Belum Menggunakan Aksesibilitas</h3>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Siswa berikut belum mengaktifkan fitur aksesibilitas apapun
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {siswaNoAksesibilitas.map(s => (
                    <div key={s.id} className="flex items-center gap-2 bg-white rounded-lg p-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: s.avatarColor }}
                      >
                        {s.avatar}
                      </div>
                      <span className="text-sm font-medium text-slate-800 flex-1">{s.nama}</span>
                      <button className="text-xs text-blue-600 font-medium hover:underline">
                        Ingatkan
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2 h-12 bg-blue-800 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-60"
            aria-label="Unduh laporan aksesibilitas dalam format PDF"
          >
            {downloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Mengunduh...
              </>
            ) : (
              <>
                <Download size={16} />
                Unduh Laporan PDF
              </>
            )}
          </button>
        </div>
      </main>

      <AccessibilityBar />
    </div>
  );
}
