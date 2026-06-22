'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ArrowRight, Upload, User, BookOpen } from 'lucide-react';
import TeacherSidebar from '@/components/shared/TeacherSidebar';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils/cn';

type Step = 1 | 2 | 3;

const MATA_PELAJARAN = ['Matematika', 'Fisika', 'Kimia', 'Biologi', 'Bahasa Indonesia', 'Sejarah', 'Geografi', 'Seni Budaya', 'Informatika', 'IPA'];
const KEBUTUHAN_LIST = [
  { id: 'tunanetra', label: 'Tunanetra', desc: 'Butuh TTS, navigasi keyboard, deskripsi audio', icon: '👁️' },
  { id: 'tunarungu', label: 'Tunarungu', desc: 'Butuh subtitle, konten visual, transkrip', icon: '👂' },
  { id: 'motorik', label: 'Gangguan Motorik', desc: 'Butuh navigasi keyboard penuh', icon: '🦽' },
  { id: 'kognitif', label: 'Kesulitan Belajar', desc: 'Butuh tampilan sederhana, panduan visual', icon: '🧠' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [nama, setNama] = useState('');
  const [mapel, setMapel] = useState<string[]>([]);
  const [kebutuhan, setKebutuhan] = useState<string[]>([]);
  const [hasUpload, setHasUpload] = useState(false);

  const stepProgress = ((step - 1) / 2) * 100;

  const steps = [
    { num: 1, label: 'Info Profil', icon: User },
    { num: 2, label: 'Kebutuhan Siswa', icon: BookOpen },
    { num: 3, label: 'Upload Materi', icon: Upload },
  ];

  const handleNext = () => {
    if (step < 3) setStep((prev) => (prev + 1) as Step);
    else router.push('/teacher/dashboard');
  };

  const toggleMapel = (m: string) => {
    setMapel(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const toggleKebutuhan = (k: string) => {
    setKebutuhan(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <TeacherSidebar />

      <main id="main-content" className="flex-1 sm:ml-60 pb-4">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3">
          <h1 className="font-bold text-slate-900">Onboarding Guru</h1>
          <div className="flex items-center gap-3 mt-2">
            <Progress value={stepProgress + 33} className="h-2 flex-1" />
            <span className="text-xs text-slate-500 flex-shrink-0">Langkah {step} dari 3</span>
          </div>
        </div>

        <div className="p-4 max-w-lg mx-auto space-y-5">
          {/* Step Indicators */}
          <div className="flex items-center gap-2" aria-label="Progress onboarding">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              const done = step > s.num;
              const active = step === s.num;
              return (
                <div key={s.num} className="flex items-center flex-1">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                    done ? "bg-emerald-500" : active ? "bg-blue-800" : "bg-slate-200"
                  )}>
                    {done ? (
                      <Check size={14} className="text-white" />
                    ) : (
                      <Icon size={14} className={active ? "text-white" : "text-slate-400"} />
                    )}
                  </div>
                  <div className="ml-2 flex-1">
                    <p className={cn("text-xs font-medium", active ? "text-blue-800" : done ? "text-emerald-600" : "text-slate-400")}>
                      {s.label}
                    </p>
                  </div>
                  {idx < 2 && <div className={cn("h-0.5 w-4 flex-shrink-0 mx-1", step > s.num ? "bg-emerald-300" : "bg-slate-200")} />}
                </div>
              );
            })}
          </div>

          {/* Step 1: Profil */}
          {step === 1 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div>
                  <h2 className="font-semibold text-slate-900 mb-1">Info Profil Guru</h2>
                  <p className="text-sm text-slate-500">Lengkapi data profil Anda sebagai pengajar</p>
                </div>

                <div>
                  <label htmlFor="nama" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Nama Lengkap
                  </label>
                  <input
                    id="nama"
                    type="text"
                    value={nama}
                    onChange={e => setNama(e.target.value)}
                    placeholder="Masukkan nama lengkap"
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Mata Pelajaran yang Diajarkan
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {MATA_PELAJARAN.map(m => (
                      <button
                        key={m}
                        onClick={() => toggleMapel(m)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                          mapel.includes(m)
                            ? "bg-blue-800 text-white border-blue-800"
                            : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                        )}
                        aria-pressed={mapel.includes(m)}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Kebutuhan Siswa */}
          {step === 2 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div>
                  <h2 className="font-semibold text-slate-900 mb-1">Kenali Kebutuhan Siswa</h2>
                  <p className="text-sm text-slate-500">Pilih tipe kebutuhan siswa yang akan Anda ajar</p>
                </div>

                <div className="space-y-3">
                  {KEBUTUHAN_LIST.map(k => (
                    <button
                      key={k.id}
                      onClick={() => toggleKebutuhan(k.id)}
                      className={cn(
                        "w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3 focus-visible:ring-2 focus-visible:ring-blue-500",
                        kebutuhan.includes(k.id)
                          ? "border-blue-600 bg-blue-50"
                          : "border-slate-200 hover:border-blue-300"
                      )}
                      aria-pressed={kebutuhan.includes(k.id)}
                    >
                      <span className="text-2xl flex-shrink-0" aria-hidden="true">{k.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">{k.label}</p>
                        <p className="text-xs text-slate-500">{k.desc}</p>
                      </div>
                      {kebutuhan.includes(k.id) && (
                        <Check size={16} className="text-blue-600 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-blue-700">
                    💡 Platform akan menyesuaikan template sesi dan rekomendasi fitur berdasarkan pilihan Anda
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Upload Materi */}
          {step === 3 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div>
                  <h2 className="font-semibold text-slate-900 mb-1">Upload Materi Pertama</h2>
                  <p className="text-sm text-slate-500">Upload materi pertama Anda untuk mulai mengajar</p>
                </div>

                <button
                  onClick={() => setHasUpload(true)}
                  className={cn(
                    "w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 transition-all",
                    hasUpload
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/50"
                  )}
                  aria-label="Upload atau drag & drop file materi"
                >
                  {hasUpload ? (
                    <>
                      <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Check size={24} className="text-white" />
                      </div>
                      <p className="font-semibold text-emerald-700">Materi berhasil diupload!</p>
                      <p className="text-xs text-emerald-600">Ekosistem_Laut.pdf • 2.4 MB</p>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Upload size={24} className="text-blue-600" />
                      </div>
                      <p className="font-semibold text-slate-700">Drag & Drop file di sini</p>
                      <p className="text-xs text-slate-500">PDF, Video, Audio — Maks 50MB</p>
                      <div className="px-4 py-2 bg-blue-800 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
                        Pilih File
                      </div>
                    </>
                  )}
                </button>

                {hasUpload && (
                  <div className="bg-blue-50 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-blue-900">Fitur aksesibilitas akan ditambahkan:</p>
                    <div className="space-y-1">
                      {['Subtitle otomatis (AI)', 'Audio deskriptif', 'Transkripsi teks'].map(f => (
                        <div key={f} className="flex items-center gap-2">
                          <Check size={12} className="text-emerald-500" />
                          <span className="text-xs text-blue-700">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <button
            onClick={handleNext}
            className="w-full h-12 bg-blue-800 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={step < 3 ? "Lanjut ke langkah berikutnya" : "Selesai dan masuk ke dashboard"}
          >
            {step < 3 ? 'Lanjut' : 'Mulai Mengajar'}
            <ArrowRight size={18} />
          </button>
        </div>
      </main>

      <AccessibilityBar />
    </div>
  );
}
