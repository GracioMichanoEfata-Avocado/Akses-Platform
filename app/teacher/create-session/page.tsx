'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Calendar, Clock, Check, Upload, Eye } from 'lucide-react';
import TeacherSidebar from '@/components/shared/TeacherSidebar';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

const MATA_PELAJARAN = ['Biologi', 'IPA', 'Matematika', 'Fisika', 'Kimia', 'Bahasa Indonesia', 'Sejarah'];

export default function CreateSessionPage() {
  const router = useRouter();
  const [judul, setJudul] = useState('');
  const [mapel, setMapel] = useState('');
  const [tanggal, setTanggal] = useState('2026-05-06');
  const [waktu, setWaktu] = useState('10:00');
  const [subtitle, setSubtitle] = useState(true);
  const [audioDeskriptif, setAudioDeskriptif] = useState(true);
  const [hasFile, setHasFile] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => router.push('/teacher/dashboard'), 1500);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <TeacherSidebar />

      <main id="main-content" className="flex-1 sm:ml-60 pb-4">
        {/* Top bar */}
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-slate-900 flex items-center gap-2">
            <PlusCircle size={18} className="text-blue-700" />
            Buat Sesi Ajar
          </h1>
        </div>

        <div className="p-4 max-w-lg mx-auto space-y-4">
          {saved ? (
            <div className="text-center py-16 animate-fade-in">
              <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-emerald-700 mb-2">Sesi Berhasil Dijadwalkan!</h2>
              <p className="text-slate-500 text-sm">Mengalihkan ke dashboard...</p>
            </div>
          ) : (
            <>
              {/* Form */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <h2 className="font-semibold text-slate-900">Detail Sesi</h2>

                  <div>
                    <label htmlFor="judul" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Judul Sesi <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="judul"
                      type="text"
                      value={judul}
                      onChange={e => setJudul(e.target.value)}
                      placeholder="Contoh: Kelas Live Ekosistem Laut"
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      aria-required="true"
                    />
                  </div>

                  <div>
                    <label htmlFor="mapel" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Mata Pelajaran
                    </label>
                    <select
                      id="mapel"
                      value={mapel}
                      onChange={e => setMapel(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Pilih mata pelajaran</option>
                      {MATA_PELAJARAN.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="tanggal" className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                        <Calendar size={13} />
                        Tanggal
                      </label>
                      <input
                        id="tanggal"
                        type="date"
                        value={tanggal}
                        onChange={e => setTanggal(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="waktu" className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                        <Clock size={13} />
                        Waktu
                      </label>
                      <input
                        id="waktu"
                        type="time"
                        value={waktu}
                        onChange={e => setWaktu(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Upload */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5 space-y-3">
                  <h2 className="font-semibold text-slate-900">Upload Materi</h2>
                  <button
                    onClick={() => setHasFile(true)}
                    className={cn(
                      "w-full border-2 border-dashed rounded-2xl p-6 flex flex-col items-center gap-2 transition-all",
                      hasFile ? "border-emerald-400 bg-emerald-50" : "border-slate-300 hover:border-blue-400"
                    )}
                    aria-label="Upload materi sesi"
                  >
                    {hasFile ? (
                      <>
                        <Check size={24} className="text-emerald-500" />
                        <p className="text-sm font-semibold text-emerald-700">Materi_Biologi.pdf • 3.2 MB</p>
                      </>
                    ) : (
                      <>
                        <Upload size={24} className="text-slate-400" />
                        <p className="text-sm font-semibold text-slate-700">Drag & Drop atau Klik untuk Upload</p>
                        <p className="text-xs text-slate-400">PDF, Video, Audio — Maks 50MB</p>
                      </>
                    )}
                  </button>
                </CardContent>
              </Card>

              {/* Accessibility Toggles */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <h2 className="font-semibold text-slate-900">Fitur Aksesibilitas</h2>

                  {[
                    { label: 'Aktifkan Subtitle Otomatis', desc: 'AI akan membuat subtitle untuk video/live', value: subtitle, set: setSubtitle, icon: '📝' },
                    { label: 'Aktifkan Audio Deskriptif', desc: 'Narasi audio untuk konten visual', value: audioDeskriptif, set: setAudioDeskriptif, icon: '🔊' },
                  ].map(f => (
                    <div key={f.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg" aria-hidden="true">{f.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-slate-700">{f.label}</p>
                          <p className="text-xs text-slate-500">{f.desc}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => f.set(!f.value)}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                          f.value ? "bg-blue-600" : "bg-slate-200"
                        )}
                        role="switch"
                        aria-checked={f.value}
                        aria-label={`${f.value ? 'Matikan' : 'Aktifkan'} ${f.label}`}
                      >
                        <span className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow",
                          f.value ? "translate-x-6" : "translate-x-1"
                        )} />
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Preview */}
              {showPreview && (
                <Card className="border-0 shadow-sm ring-1 ring-blue-200 animate-fade-in">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-blue-900 text-sm mb-3 flex items-center gap-2">
                      <Eye size={14} />
                      Preview Aksesibilitas
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <div className={cn("w-2 h-2 rounded-full", subtitle ? "bg-emerald-500" : "bg-slate-300")} />
                        <span className="text-slate-600">Subtitle otomatis: {subtitle ? 'Aktif' : 'Tidak aktif'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className={cn("w-2 h-2 rounded-full", audioDeskriptif ? "bg-emerald-500" : "bg-slate-300")} />
                        <span className="text-slate-600">Audio deskriptif: {audioDeskriptif ? 'Aktif' : 'Tidak aktif'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-slate-600">Navigasi keyboard: Selalu aktif</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="h-12 border-2 border-slate-200 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                  aria-label="Pratinjau aksesibilitas sesi"
                >
                  <Eye size={15} />
                  Preview
                </button>
                <button
                  onClick={handleSave}
                  disabled={!judul}
                  className="h-12 bg-blue-800 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  aria-label="Simpan dan jadwalkan sesi"
                >
                  <Check size={15} />
                  Simpan & Jadwalkan
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      <AccessibilityBar />
    </div>
  );
}
