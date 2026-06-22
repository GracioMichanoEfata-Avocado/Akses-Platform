'use client';

import { useState, useEffect } from 'react';
import { Volume2, Eye, ZoomIn, Sun, RotateCcw, Award, BookOpen, Clock } from 'lucide-react';
import StudentBottomNav from '@/components/shared/StudentBottomNav';
import StudentSidebar from '@/components/shared/StudentSidebar';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { useAccessibilityStore, FontSize, DisabilitasMode } from '@/lib/store/accessibility-store';
import students from '@/lib/mock-data/students.json';
import materials from '@/lib/mock-data/materials.json';
import { cn } from '@/lib/utils/cn';

const student = students[0];
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
  const {
    mode, setMode,
    fontSize, setFontSize,
    highContrast, setHighContrast,
    ttsEnabled, setTtsEnabled,
    subtitleEnabled, setSubtitleEnabled,
    ttsRate, setTtsRate,
    resetToDefault,
  } = useAccessibilityStore();

  const accessedMaterials = materials.filter(m => student.materiDiakses.includes(m.id));

  return (
    <div className="flex min-h-screen bg-slate-50">
      <StudentSidebar />

      <main id="main-content" className="flex-1 sm:ml-60 pb-20 sm:pb-4">
        {/* Top bar */}
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-slate-900">Profil Saya</h1>
        </div>

        <div className="p-4 max-w-2xl mx-auto space-y-4">
          {/* Profile Card */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-blue-800 to-blue-600 h-20" />
            <CardContent className="p-4 pt-0 -mt-10">
              <div className="flex items-end gap-3 mb-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg border-4 border-white"
                  style={{ backgroundColor: student.avatarColor }}
                  role="img"
                  aria-label={`Avatar ${student.nama}`}
                >
                  {student.avatar}
                </div>
                <div className="pb-1">
                  <h2 className="font-bold text-slate-900 text-lg leading-tight">{student.nama}</h2>
                  <p className="text-slate-500 text-sm">{student.kelas}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="default" className="text-xs">🎓 Siswa</Badge>
                <Badge variant={student.disabilitas === 'tunanetra' ? 'tunanetra' : student.disabilitas === 'tunarungu' ? 'tunarungu' : 'destructive'} className="text-xs">
                  {student.disabilitas === 'tunanetra' ? '👁️ Tunanetra' : student.disabilitas === 'tunarungu' ? '👂 Tunarungu' : '♿ Keduanya'}
                </Badge>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">Progress Keseluruhan</span>
                  <span className="text-blue-700 font-bold">{student.progress}%</span>
                </div>
                <Progress value={student.progress} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="accessibility">
            <TabsList className="w-full h-auto p-1 grid grid-cols-3 gap-1">
              <TabsTrigger value="accessibility" className="text-xs">Aksesibilitas</TabsTrigger>
              <TabsTrigger value="history" className="text-xs">Riwayat</TabsTrigger>
              <TabsTrigger value="achievements" className="text-xs">Pencapaian</TabsTrigger>
            </TabsList>

            {/* Accessibility Tab */}
            <TabsContent value="accessibility" className="space-y-4 mt-4">
              {/* Mode */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-slate-900 text-sm mb-3">Mode Aksesibilitas</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {MODES.map(m => (
                      <button
                        key={m.value}
                        onClick={() => setMode(m.value)}
                        className={cn(
                          "p-3 rounded-xl border-2 text-left transition-all focus-visible:ring-2 focus-visible:ring-blue-500",
                          mode === m.value ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:border-blue-300"
                        )}
                        aria-pressed={mode === m.value}
                      >
                        <span className="text-lg">{m.icon}</span>
                        <p className="text-xs font-semibold text-slate-800 mt-1">{m.label}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Feature Toggles */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-4">
                  <h3 className="font-semibold text-slate-900 text-sm">Fitur Aksesibilitas</h3>

                  {[
                    { icon: Volume2, label: 'Text-to-Speech (TTS)', desc: 'Bacakan teks secara otomatis', value: ttsEnabled, set: setTtsEnabled, color: 'text-purple-600' },
                    { icon: Eye, label: 'Subtitle Otomatis', desc: 'Tampilkan teks pada video & live', value: subtitleEnabled, set: setSubtitleEnabled, color: 'text-blue-600' },
                    { icon: Sun, label: 'Kontras Tinggi', desc: 'Latar hitam, teks putih', value: highContrast, set: setHighContrast, color: 'text-amber-600' },
                  ].map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <div key={feature.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon size={16} className={feature.color} />
                          <div>
                            <p className="text-sm font-medium text-slate-700">{feature.label}</p>
                            <p className="text-xs text-slate-500">{feature.desc}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => feature.set(!feature.value)}
                          className={cn(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-blue-500",
                            feature.value ? "bg-blue-600" : "bg-slate-200"
                          )}
                          role="switch"
                          aria-checked={feature.value}
                          aria-label={`${feature.value ? 'Matikan' : 'Aktifkan'} ${feature.label}`}
                        >
                          <span className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow",
                            feature.value ? "translate-x-6" : "translate-x-1"
                          )} />
                        </button>
                      </div>
                    );
                  })}

                  {/* Font Size */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <ZoomIn size={16} className="text-slate-500" />
                      <p className="text-sm font-medium text-slate-700">Ukuran Teks</p>
                    </div>
                    <div className="flex gap-2">
                      {FONT_SIZES.map(fs => (
                        <button
                          key={fs.value}
                          onClick={() => setFontSize(fs.value)}
                          className={cn(
                            "flex-1 py-2 rounded-xl border-2 text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-blue-500",
                            fontSize === fs.value ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"
                          )}
                          aria-pressed={fontSize === fs.value}
                        >
                          {fs.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* TTS Speed */}
                  {ttsEnabled && (
                    <div>
                      <div className="flex justify-between mb-2">
                        <p className="text-sm font-medium text-slate-700">Kecepatan TTS</p>
                        <span className="text-xs text-blue-600 font-medium">{ttsRate}x</span>
                      </div>
                      <Slider
                        min={0.5}
                        max={2}
                        step={0.1}
                        value={[ttsRate]}
                        onValueChange={([v]) => setTtsRate(v)}
                        aria-label="Kecepatan Text-to-Speech"
                      />
                      <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>Lambat</span>
                        <span>Cepat</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={resetToDefault}
                    className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <RotateCcw size={14} />
                    Reset ke Default
                  </button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="mt-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-slate-900 text-sm mb-3 flex items-center gap-2">
                    <BookOpen size={15} className="text-blue-700" />
                    Riwayat Belajar
                  </h3>
                  <div className="space-y-3">
                    {accessedMaterials.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                          style={{ backgroundColor: m.thumbnailColor + '20' }}
                        >
                          {m.thumbnailEmoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{m.judul}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Progress value={m.progress} className="h-1.5 flex-1" />
                            <span className="text-xs text-slate-400">{m.progress}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 flex-shrink-0">
                          <Clock size={11} />
                          <span className="text-xs">{m.durasi}m</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Achievements Tab */}
            <TabsContent value="achievements" className="mt-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-slate-900 text-sm mb-3 flex items-center gap-2">
                    <Award size={15} className="text-amber-500" />
                    Pencapaian
                  </h3>
                  {student.prestasi.length > 0 ? (
                    <div className="space-y-2">
                      {student.prestasi.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                          <span className="text-xl" aria-hidden="true">🏆</span>
                          <p className="text-sm font-medium text-amber-900">{p}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">🎯</div>
                      <p className="text-slate-500 text-sm">Belum ada pencapaian</p>
                      <p className="text-slate-400 text-xs mt-1">Terus belajar untuk meraih pencapaian!</p>
                    </div>
                  )}
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
