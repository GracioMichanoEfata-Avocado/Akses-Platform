'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, X, Plus, Trash2, Check, Video, Image as ImageIcon, Save,
} from 'lucide-react';
import TeacherSidebar from '@/components/shared/TeacherSidebar';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';
import BackButton from '@/components/shared/BackButton';

interface KuisItem {
  pertanyaan: string;
  opsi: [string, string, string, string];
  jawabanBenar: number;
  penjelasan: string;
}

const KUIS_KOSONG = (): KuisItem => ({
  pertanyaan: '',
  opsi: ['', '', '', ''],
  jawabanBenar: 0,
  penjelasan: '',
});

// ─── Halaman "Upload Manual": guru isi semua sendiri (judul, deskripsi,
// kuis, slide, video) — tanpa bantuan AI sama sekali. ─────────────────────
export default function UploadManualPage() {
  const [judul, setJudul] = useState('');
  const [mataPelajaran, setMataPelajaran] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [kuis, setKuis] = useState<KuisItem[]>([]);

  const [slideFiles, setSlideFiles] = useState<File[]>([]);
  const [slideCaptions, setSlideCaptions] = useState<string[]>([]);
  const slideInputRef = useRef<HTMLInputElement>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview URL dibuat sekali per file (bukan tiap render) dan dibersihkan
  // saat file berganti/dihapus, supaya tidak bocor object URL.
  const slidePreviewUrls = useMemo(
    () => slideFiles.map((f) => URL.createObjectURL(f)),
    [slideFiles]
  );
  useEffect(() => {
    return () => slidePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [slidePreviewUrls]);

  const handleSlideFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setSlideFiles((prev) => [...prev, ...files]);
    setSlideCaptions((prev) => [...prev, ...files.map(() => '')]);
    e.target.value = '';
  };

  const handleRemoveSlideFile = (idx: number) => {
    setSlideFiles((prev) => prev.filter((_, i) => i !== idx));
    setSlideCaptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSlideCaptionChange = (idx: number, value: string) => {
    setSlideCaptions((prev) => prev.map((c, i) => (i === idx ? value : c)));
  };

  const addQuestion = () => setKuis((prev) => [...prev, KUIS_KOSONG()]);
  const removeQuestion = (idx: number) => setKuis((prev) => prev.filter((_, i) => i !== idx));
  const updateQuestion = (idx: number, patch: Partial<KuisItem>) => {
    setKuis((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };
  const updateOption = (soalIdx: number, optIdx: number, value: string) => {
    setKuis((prev) => prev.map((q, i) => {
      if (i !== soalIdx) return q;
      const opsi = [...q.opsi] as [string, string, string, string];
      opsi[optIdx] = value;
      return { ...q, opsi };
    }));
  };

  const hasContent = judul.trim().length > 0;
  const kuisLengkap = kuis.every((q) => q.pertanyaan.trim() && q.opsi.every((o) => o.trim()));

  const handleSave = async () => {
    if (!hasContent || saving) return;
    if (kuis.length > 0 && !kuisLengkap) {
      alert('Semua soal kuis harus punya pertanyaan dan 4 opsi terisi (atau hapus soal yang belum lengkap).');
      return;
    }
    setSaving(true);
    setError(null);
    setProgress(5);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Belum login'); setSaving(false); return; }

      // ── Upload slide (kalau ada) ──
      const slides: { judul: string; emojiIkon: string; deskripsi: string; warna: string; gambarUrl: string }[] = [];
      for (let i = 0; i < slideFiles.length; i++) {
        const f = slideFiles[i];
        const ext = f.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${i}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('materi-slides')
          .upload(fileName, f, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          setError(`Gagal upload gambar slide ${i + 1}: ${uploadError.message}`);
          setSaving(false);
          return;
        }

        const { data: urlData } = supabase.storage.from('materi-slides').getPublicUrl(fileName);
        slides.push({
          judul: slideCaptions[i]?.trim() || `Slide ${i + 1}`,
          emojiIkon: '🖼️',
          deskripsi: slideCaptions[i]?.trim() || '',
          warna: '#1E40AF',
          gambarUrl: urlData.publicUrl,
        });
        setProgress(5 + Math.round(((i + 1) / Math.max(slideFiles.length, 1)) * 40));
      }

      // ── Upload video (kalau ada) ──
      let videoUrl: string | null = null;
      if (videoFile) {
        const ext = videoFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('videos')
          .upload(fileName, videoFile, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          setError('Gagal upload video: ' + uploadError.message);
          setSaving(false);
          return;
        }
        const { data: urlData } = supabase.storage.from('videos').getPublicUrl(fileName);
        videoUrl = urlData.publicUrl;
      }
      setProgress(60);

      // ── Simpan materi ──
      const { data: savedMaterial, error: matError } = await supabase
        .from('materials')
        .insert({
          judul: judul.trim(),
          mata_pelajaran: mataPelajaran.trim() || 'Umum',
          deskripsi: deskripsi.trim() || `Materi: ${judul.trim()}`,
          mode: 'both',
          thumbnail_color: '#1E40AF',
          thumbnail_emoji: videoUrl ? '🎬' : slides.length > 0 ? '🖼️' : '📘',
          video_url: videoUrl,
          slides: slides.length > 0 ? slides : null,
          transkrip: deskripsi.trim(),
          created_by: user.id,
        })
        .select()
        .single();

      if (matError || !savedMaterial) {
        setError('Gagal menyimpan materi: ' + (matError?.message || 'kesalahan tak dikenal'));
        setSaving(false);
        return;
      }
      setProgress(80);

      // ── Simpan kuis (kalau ada) ──
      if (kuis.length > 0) {
        const { data: savedQuiz } = await supabase
          .from('quizzes')
          .insert({ material_id: savedMaterial.id, judul: `Kuis: ${judul.trim()}` })
          .select()
          .single();

        if (savedQuiz) {
          await supabase.from('quiz_questions').insert(
            kuis.map((soal) => ({
              quiz_id: savedQuiz.id,
              pertanyaan: soal.pertanyaan.trim(),
              pilihan: soal.opsi,
              jawaban_benar: soal.jawabanBenar,
              penjelasan: soal.penjelasan.trim(),
            }))
          );
        }
      }
      setProgress(95);

      // Kirim notifikasi ke semua siswa
      await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          judul: 'Materi Baru Tersedia!',
          isi: `Materi baru "${judul.trim()}" telah ditambahkan. Yuk pelajari sekarang!`,
          tipe: 'materi_baru',
          link: `/student/learn/${savedMaterial.id}`,
        }),
      });

      setProgress(100);
      setSaved(true);
      setSaving(false);
    } catch (err: any) {
      setError('Error: ' + err.message);
      setSaving(false);
    }
  };

  const handleReset = () => {
    setJudul(''); setMataPelajaran(''); setDeskripsi(''); setKuis([]);
    setSlideFiles([]); setSlideCaptions([]); setVideoFile(null);
    setSaved(false); setProgress(0); setError(null);
  };

  if (saved) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <TeacherSidebar />
        <main className="flex-1 sm:ml-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
            <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Check size={28} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Materi Tersimpan!</h2>
            <p className="text-sm text-slate-500 mb-6">&quot;{judul}&quot; sudah bisa diakses siswa, dan bisa kamu edit lagi kapan saja lewat Kelola Materi.</p>
            <div className="space-y-2">
              <Link href="/teacher/materials" className="block w-full h-11 bg-blue-800 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center">
                Buka Kelola Materi
              </Link>
              <button onClick={handleReset} className="w-full h-11 border border-slate-200 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-50">
                Tambah Materi Manual Lagi
              </button>
            </div>
          </div>
        </main>
        <AccessibilityBar />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <TeacherSidebar />
      <main id="main-content" className="flex-1 sm:ml-60 pb-24">
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center gap-2">
          <BackButton
            href="/teacher/materials"
            confirmMessage={hasContent ? 'Yakin mau keluar? Perubahan yang belum disimpan akan hilang.' : undefined}
          />
          <h1 className="font-bold text-slate-900">Upload Manual</h1>
        </div>

        <div className="p-4 max-w-2xl mx-auto space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
          )}

          {/* ── Info Dasar ── */}
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="font-semibold text-slate-900">Info Materi</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Judul Materi</label>
              <input
                type="text"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="Contoh: Ekosistem Laut"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mata Pelajaran</label>
              <input
                type="text"
                value={mataPelajaran}
                onChange={(e) => setMataPelajaran(e.target.value)}
                placeholder="Contoh: Biologi"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Deskripsi Materi</label>
              <textarea
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                rows={4}
                placeholder="Jelaskan materi ini... (juga dipakai untuk fitur Putar Audio siswa tunanetra)"
                className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* ── Kuis Manual ── */}
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Kuis ({kuis.length} soal)</h2>
            </div>
            {kuis.length === 0 && (
              <p className="text-xs text-slate-400">Belum ada soal. Kuis boleh dikosongkan kalau materi ini memang tidak punya kuis.</p>
            )}
            {kuis.map((soal, soalIdx) => (
              <div key={soalIdx} className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-full">Soal {soalIdx + 1}</span>
                  <button
                    onClick={() => removeQuestion(soalIdx)}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium"
                    aria-label={`Hapus soal ${soalIdx + 1}`}
                  >
                    <Trash2 size={14} /> Hapus Soal
                  </button>
                </div>
                <textarea
                  value={soal.pertanyaan}
                  onChange={(e) => updateQuestion(soalIdx, { pertanyaan: e.target.value })}
                  placeholder="Tulis pertanyaan..."
                  rows={2}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  aria-label={`Pertanyaan soal ${soalIdx + 1}`}
                />
                <div className="space-y-2">
                  {soal.opsi.map((opsi, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`jawaban-benar-${soalIdx}`}
                        checked={soal.jawabanBenar === optIdx}
                        onChange={() => updateQuestion(soalIdx, { jawabanBenar: optIdx })}
                        aria-label={`Tandai opsi ${String.fromCharCode(65 + optIdx)} sebagai jawaban benar`}
                      />
                      <input
                        type="text"
                        value={opsi}
                        onChange={(e) => updateOption(soalIdx, optIdx, e.target.value)}
                        placeholder={`Opsi ${String.fromCharCode(65 + optIdx)}`}
                        className="flex-1 h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label={`Teks opsi ${String.fromCharCode(65 + optIdx)} soal ${soalIdx + 1}`}
                      />
                    </div>
                  ))}
                  <p className="text-[11px] text-slate-400 pl-6">Pilih radio di samping opsi yang benar.</p>
                </div>
                <input
                  type="text"
                  value={soal.penjelasan}
                  onChange={(e) => updateQuestion(soalIdx, { penjelasan: e.target.value })}
                  placeholder="Penjelasan jawaban (opsional)"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={`Penjelasan jawaban soal ${soalIdx + 1}`}
                />
              </div>
            ))}
            <button
              onClick={addQuestion}
              className="flex items-center gap-1.5 text-sm text-blue-700 hover:text-blue-800 font-medium"
            >
              <Plus size={16} /> Tambah Soal
            </button>
          </div>

          {/* ── Upload Slide ── */}
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <ImageIcon size={18} className="text-emerald-600" />
              <h2 className="font-semibold text-slate-900">Slide (PPT)</h2>
            </div>
            <p className="text-xs text-slate-500">Upload gambar slide (export dari PowerPoint/Canva), boleh banyak sekaligus. Opsional.</p>

            <div
              onClick={() => slideInputRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center cursor-pointer transition-all border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/50"
            >
              <ImageIcon size={28} className="text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-700">Klik untuk pilih gambar slide</p>
              <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP — Maks 10MB per gambar</p>
            </div>
            <input
              ref={slideInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleSlideFilesChange}
              className="sr-only"
            />

            {slideFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500">{slideFiles.length} gambar dipilih (urutan = urutan slide)</p>
                {slideFiles.map((_, i) => (
                  <div key={i} className="flex items-center gap-2 border border-slate-200 rounded-xl p-2">
                    <span className="text-xs font-mono text-slate-400 w-5 text-center flex-shrink-0">{i + 1}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={slidePreviewUrls[i]} alt="" className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                    <input
                      value={slideCaptions[i] || ''}
                      onChange={(e) => handleSlideCaptionChange(i, e.target.value)}
                      placeholder={`Judul & narasi slide ${i + 1} (opsional, akan dibacakan)`}
                      className="flex-1 min-w-0 text-xs border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                    <button
                      onClick={() => handleRemoveSlideFile(i)}
                      className="p-1.5 rounded-full bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-500 flex-shrink-0"
                      aria-label={`Hapus gambar slide ${i + 1}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Upload Video ── */}
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Video size={18} className="text-purple-600" />
              <h2 className="font-semibold text-slate-900">Video</h2>
            </div>
            <p className="text-xs text-slate-500">Opsional — kalau materi ini punya rekaman video penjelasan.</p>

            <div
              onClick={() => videoInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-6 flex flex-col items-center cursor-pointer transition-all',
                videoFile ? 'border-purple-400 bg-purple-50' : 'border-slate-300 hover:border-purple-400 hover:bg-purple-50/50'
              )}
            >
              {videoFile ? (
                <div className="flex items-center gap-3 w-full">
                  <Video size={28} className="text-purple-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{videoFile.name}</p>
                    <p className="text-xs text-slate-400">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setVideoFile(null); }}
                    className="p-1.5 rounded-full bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-500">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <Video size={28} className="text-slate-400 mb-2" />
                  <p className="text-sm font-medium text-slate-700">Klik untuk pilih video</p>
                  <p className="text-xs text-slate-400 mt-1">MP4, MOV, AVI — Maks 500MB</p>
                </>
              )}
            </div>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setVideoFile(f); }}
              className="sr-only"
            />
          </div>

          {saving && (
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Menyimpan materi...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-blue-700 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!hasContent || saving}
            className={cn(
              'w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all',
              hasContent && !saving
                ? 'bg-blue-800 text-white hover:bg-blue-700 shadow-lg shadow-blue-800/20'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            )}
          >
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Menyimpan...</>
            ) : (
              <><Save size={16} />Simpan Materi</>
            )}
          </button>
        </div>
      </main>
      <AccessibilityBar />
    </div>
  );
}
