'use client';

import { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Plus, Pencil, Trash2, Video, X, Check, Search, AlertCircle, FileText, Loader2,
  Sparkles, Upload, Image as ImageIcon,
} from 'lucide-react';
import Link from 'next/link';
import TeacherSidebar from '@/components/shared/TeacherSidebar';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';
import { Slide, parseSlides } from '@/lib/slides/slide-data';
import BackButton from '@/components/shared/BackButton';

interface Material {
  id: string;
  judul: string;
  mata_pelajaran: string;
  deskripsi: string;
  mode: string;
  thumbnail_color: string;
  thumbnail_emoji: string;
  video_url: string | null;
  transkrip: string | null;
  is_ai_generated: boolean;
  created_at: string;
  slides: unknown;
}

interface KuisItem {
  id?: string;
  pertanyaan: string;
  opsi: [string, string, string, string];
  jawabanBenar: number;
  penjelasan: string;
}

const KUIS_KOSONG = (): KuisItem => ({ pertanyaan: '', opsi: ['', '', '', ''], jawabanBenar: 0, penjelasan: '' });

export default function TeacherMaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Material>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingVideoId, setUploadingVideoId] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [transcribingId, setTranscribingId] = useState<string | null>(null);
  const [expandedTranscriptId, setExpandedTranscriptId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Edit slide & kuis (dimuat terpisah cuma saat materi tertentu dibuka edit)
  const [editSlides, setEditSlides] = useState<Slide[]>([]);
  const [editNewSlideFiles, setEditNewSlideFiles] = useState<File[]>([]);
  const [editQuiz, setEditQuiz] = useState<KuisItem[]>([]);
  const [editQuizId, setEditQuizId] = useState<string | null>(null);
  const [loadingEditExtra, setLoadingEditExtra] = useState(false);
  const editSlideInputRef = useRef<HTMLInputElement>(null);

  // Pakai ref buat nyimpen target ID upload — bukan state, biar langsung tersedia pas file dipilih
  const uploadTargetRef = useRef<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadMaterials(); }, []);

  const loadMaterials = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('materials')
      .select('id, judul, mata_pelajaran, deskripsi, mode, thumbnail_color, thumbnail_emoji, video_url, transkrip, is_ai_generated, created_at, slides')
      .order('created_at', { ascending: false });
    setMaterials(data || []);
    setLoading(false);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // ── EDIT ──
  const handleStartEdit = async (m: Material) => {
    setEditingId(m.id);
    setEditData({ judul: m.judul, mata_pelajaran: m.mata_pelajaran, deskripsi: m.deskripsi, mode: m.mode });
    setEditSlides(parseSlides(m.slides));
    setEditNewSlideFiles([]);
    setEditQuiz([]);
    setEditQuizId(null);
    setLoadingEditExtra(true);

    const supabase = createClient();
    const { data: quiz } = await supabase
      .from('quizzes').select('id').eq('material_id', m.id).maybeSingle();
    if (quiz) {
      setEditQuizId(quiz.id);
      const { data: questions } = await supabase
        .from('quiz_questions')
        .select('id, pertanyaan, pilihan, jawaban_benar, penjelasan')
        .eq('quiz_id', quiz.id);
      setEditQuiz((questions || []).map((q) => ({
        id: q.id,
        pertanyaan: q.pertanyaan,
        opsi: q.pilihan as [string, string, string, string],
        jawabanBenar: q.jawaban_benar,
        penjelasan: q.penjelasan || '',
      })));
    }
    setLoadingEditExtra(false);
  };

  const handleRemoveEditSlide = (idx: number) => {
    setEditSlides((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleEditSlideCaption = (idx: number, value: string) => {
    setEditSlides((prev) => prev.map((s, i) => (i === idx ? { ...s, judul: value, deskripsi: value } : s)));
  };

  const handleAddEditSlideFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) setEditNewSlideFiles((prev) => [...prev, ...files]);
    e.target.value = '';
  };

  const addEditQuestion = () => setEditQuiz((prev) => [...prev, KUIS_KOSONG()]);
  const removeEditQuestion = (idx: number) => setEditQuiz((prev) => prev.filter((_, i) => i !== idx));
  const updateEditQuestion = (idx: number, patch: Partial<KuisItem>) => {
    setEditQuiz((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };
  const updateEditOption = (soalIdx: number, optIdx: number, value: string) => {
    setEditQuiz((prev) => prev.map((q, i) => {
      if (i !== soalIdx) return q;
      const opsi = [...q.opsi] as [string, string, string, string];
      opsi[optIdx] = value;
      return { ...q, opsi };
    }));
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const kuisLengkap = editQuiz.every((q) => q.pertanyaan.trim() && q.opsi.every((o) => o.trim()));
    if (editQuiz.length > 0 && !kuisLengkap) {
      showToast('Semua soal kuis harus punya pertanyaan dan 4 opsi terisi (atau hapus soal yang belum lengkap).');
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Upload gambar slide baru (kalau ada), gabung dengan slide lama yang tersisa
    let finalSlides = [...editSlides];
    if (editNewSlideFiles.length > 0 && user) {
      for (let i = 0; i < editNewSlideFiles.length; i++) {
        const f = editNewSlideFiles[i];
        const ext = f.name.split('.').pop();
        const fileName = `${user.id}/${editingId}-${Date.now()}-${i}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('materi-slides')
          .upload(fileName, f, { cacheControl: '3600', upsert: false });
        if (uploadError) {
          showToast(`Gagal upload gambar slide baru: ${uploadError.message}`);
          setSaving(false);
          return;
        }
        const { data: urlData } = supabase.storage.from('materi-slides').getPublicUrl(fileName);
        finalSlides.push({
          judul: `Slide ${finalSlides.length + 1}`,
          emojiIkon: '🖼️',
          deskripsi: '',
          warna: '#1E40AF',
          gambarUrl: urlData.publicUrl,
        });
      }
    }

    const { error } = await supabase.from('materials')
      .update({
        judul: editData.judul,
        mata_pelajaran: editData.mata_pelajaran,
        deskripsi: editData.deskripsi,
        mode: editData.mode,
        slides: finalSlides.length > 0 ? finalSlides : null,
      })
      .eq('id', editingId);

    if (error) {
      showToast('Gagal menyimpan: ' + error.message);
      setSaving(false);
      return;
    }

    // Kuis: hapus soal lama lalu tulis ulang dari state edit (lebih sederhana
    // & aman daripada diff per-soal satu-satu).
    let quizId = editQuizId;
    if (!quizId && editQuiz.length > 0) {
      const { data: newQuiz } = await supabase
        .from('quizzes').insert({ material_id: editingId, judul: `Kuis: ${editData.judul}` }).select().single();
      quizId = newQuiz?.id || null;
    }
    if (quizId) {
      await supabase.from('quiz_questions').delete().eq('quiz_id', quizId);
      if (editQuiz.length > 0) {
        await supabase.from('quiz_questions').insert(
          editQuiz.map((q) => ({
            quiz_id: quizId,
            pertanyaan: q.pertanyaan.trim(),
            pilihan: q.opsi,
            jawaban_benar: q.jawabanBenar,
            penjelasan: q.penjelasan.trim(),
          }))
        );
      }
    }

    setMaterials(prev => prev.map(m => m.id === editingId ? { ...m, ...editData, slides: finalSlides } as Material : m));
    showToast('Materi berhasil diperbarui!');
    setEditingId(null);
    setSaving(false);
  };

  // ── HAPUS ──
  const handleDelete = async (id: string) => {
    const supabase = createClient();
    const mat = materials.find(m => m.id === id);
    if (mat?.video_url) {
      const path = mat.video_url.split('/videos/')[1];
      if (path) await supabase.storage.from('videos').remove([path]);
    }
    const { error } = await supabase.from('materials').delete().eq('id', id);
    if (error) showToast('Gagal menghapus: ' + error.message);
    else {
      setMaterials(prev => prev.filter(m => m.id !== id));
      showToast('Materi berhasil dihapus.');
    }
    setDeletingId(null);
  };

  // ── UPLOAD VIDEO ──
  const handleVideoUpload = async (file: File, materialId: string) => {
    setUploadingVideoId(materialId);
    setVideoProgress(10);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploadingVideoId(null); return; }

    const ext = file.name.split('.').pop();
    const fileName = `${user.id}/${materialId}-${Date.now()}.${ext}`;
    setVideoProgress(35);

    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      showToast('Gagal upload video: ' + uploadError.message);
      setUploadingVideoId(null);
      setVideoProgress(0);
      return;
    }
    setVideoProgress(75);

    const { data: urlData } = supabase.storage.from('videos').getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    await supabase.from('materials').update({ video_url: publicUrl }).eq('id', materialId);
    setVideoProgress(100);
    setMaterials(prev => prev.map(m => m.id === materialId ? { ...m, video_url: publicUrl } : m));
    showToast('✅ Video berhasil diupload! Klik "Buat Transkripsi" untuk generate otomatis.');
    setTimeout(() => { setUploadingVideoId(null); setVideoProgress(0); }, 800);
  };

  // ── AUTO TRANSKRIPSI PAKAI GEMINI ──
  const handleAutoTranscribe = async (materialId: string, videoUrl: string) => {
    setTranscribingId(materialId);
    showToast('Membuat transkripsi otomatis... harap tunggu.');
    try {
      const res = await fetch('/api/transcribe-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId, videoUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat transkripsi');

      setMaterials(prev => prev.map(m => m.id === materialId ? { ...m, transkrip: data.transkrip } : m));
      showToast('✅ Transkripsi berhasil dibuat!');
    } catch (err: any) {
      showToast('Gagal: ' + err.message);
    }
    setTranscribingId(null);
  };

  const triggerVideoUpload = (materialId: string) => {
    uploadTargetRef.current = materialId; // simpan di ref, langsung tersedia
    videoInputRef.current?.click();
  };

  const filtered = materials.filter(m =>
    search === '' ||
    m.judul.toLowerCase().includes(search.toLowerCase()) ||
    m.mata_pelajaran.toLowerCase().includes(search.toLowerCase())
  );

  // Kelompokkan per mata pelajaran, section diurutkan A-Z; materi di dalam
  // tiap section tetap urutan terbaru dulu (mengikuti urutan `materials`).
  const groupedBySubject = filtered.reduce<Record<string, Material[]>>((acc, m) => {
    const key = m.mata_pelajaran || 'Umum';
    (acc[key] ||= []).push(m);
    return acc;
  }, {});
  const subjectSections = Object.keys(groupedBySubject).sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex min-h-screen bg-slate-50">
      <TeacherSidebar />
      <main className="flex-1 sm:ml-60 pb-4">
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-slate-900 flex items-center gap-2">
            <BackButton href="/teacher/dashboard" />
            <BookOpen size={18} className="text-blue-700" />
            Kelola Materi ({materials.length})
          </h1>
          <div className="relative">
            <button
              onClick={() => setShowAddMenu((v) => !v)}
              className="flex items-center gap-1.5 bg-blue-800 text-white text-xs px-3 py-2 rounded-xl hover:bg-blue-700 transition-colors"
              aria-haspopup="true"
              aria-expanded={showAddMenu}
            >
              <Plus size={14} /> Tambah Materi
            </button>
            {showAddMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowAddMenu(false)} aria-hidden="true" />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-40 overflow-hidden">
                  <Link
                    href="/teacher/upload-materi"
                    onClick={() => setShowAddMenu(false)}
                    className="flex items-start gap-2.5 px-3.5 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100"
                  >
                    <Sparkles size={16} className="text-blue-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Bantuan AI</p>
                      <p className="text-[11px] text-slate-500">Generate kuis, deskripsi & slide dari teks/PDF</p>
                    </div>
                  </Link>
                  <Link
                    href="/teacher/upload-manual"
                    onClick={() => setShowAddMenu(false)}
                    className="flex items-start gap-2.5 px-3.5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <Upload size={16} className="text-emerald-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Upload Manual</p>
                      <p className="text-[11px] text-slate-500">Isi sendiri kuis, deskripsi, slide & video</p>
                    </div>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="p-4 max-w-3xl mx-auto space-y-4">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="search" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari materi..."
              className="w-full h-11 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Input file video tersembunyi */}
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="sr-only"
            onChange={e => {
              const f = e.target.files?.[0];
              const targetId = uploadTargetRef.current; // baca dari ref, bukan state
              if (f && targetId) handleVideoUpload(f, targetId);
              e.target.value = '';
            }}
          />

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-12">Belum ada materi</p>
          ) : (
            <div className="space-y-6">
              <p className="text-xs text-slate-500">{filtered.length} materi, {subjectSections.length} mata pelajaran</p>
              {subjectSections.map((subjek) => (
                <div key={subjek} className="space-y-3">
                  <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    {subjek}
                    <span className="text-xs font-normal text-slate-400">({groupedBySubject[subjek].length})</span>
                  </h2>
                  <div className="space-y-3">
                    {groupedBySubject[subjek].map(m => (
                <Card key={m.id} className="border-0 shadow-sm overflow-hidden">
                  <CardContent className="p-4">
                    {editingId === m.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">Judul</label>
                            <input value={editData.judul || ''} onChange={e => setEditData(p => ({ ...p, judul: e.target.value }))}
                              className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">Mata Pelajaran</label>
                            <input value={editData.mata_pelajaran || ''} onChange={e => setEditData(p => ({ ...p, mata_pelajaran: e.target.value }))}
                              className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Deskripsi</label>
                          <textarea value={editData.deskripsi || ''} onChange={e => setEditData(p => ({ ...p, deskripsi: e.target.value }))}
                            rows={3} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Mode</label>
                          <select value={editData.mode || 'both'} onChange={e => setEditData(p => ({ ...p, mode: e.target.value }))}
                            className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                            <option value="both">Keduanya</option>
                            <option value="audio">Audio</option>
                            <option value="visual">Visual</option>
                          </select>
                        </div>
                        {loadingEditExtra ? (
                          <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                            <Loader2 size={13} className="animate-spin" /> Memuat slide & kuis...
                          </div>
                        ) : (
                          <>
                            {/* ── Edit Slide ── */}
                            <div className="border-t border-slate-100 pt-3">
                              <label className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                                <ImageIcon size={13} /> Slide ({editSlides.length + editNewSlideFiles.length})
                              </label>
                              <div className="space-y-1.5">
                                {editSlides.map((s, i) => (
                                  <div key={i} className="flex items-center gap-2 border border-slate-200 rounded-lg p-1.5">
                                    {s.gambarUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={s.gambarUrl} alt="" className="w-9 h-9 object-cover rounded flex-shrink-0" />
                                    ) : (
                                      <span className="w-9 h-9 rounded flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: s.warna + '20' }}>{s.emojiIkon}</span>
                                    )}
                                    <input value={s.judul} onChange={e => handleEditSlideCaption(i, e.target.value)}
                                      className="flex-1 min-w-0 h-8 px-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    <button onClick={() => handleRemoveEditSlide(i)} className="p-1 text-slate-400 hover:text-red-500 flex-shrink-0">
                                      <X size={13} />
                                    </button>
                                  </div>
                                ))}
                                {editNewSlideFiles.map((f, i) => (
                                  <div key={`new-${i}`} className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 rounded-lg p-1.5">
                                    <ImageIcon size={16} className="text-emerald-600 flex-shrink-0" />
                                    <span className="flex-1 text-xs text-emerald-700 truncate">{f.name} (baru)</span>
                                    <button onClick={() => setEditNewSlideFiles(prev => prev.filter((_, idx) => idx !== i))} className="p-1 text-slate-400 hover:text-red-500 flex-shrink-0">
                                      <X size={13} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <button onClick={() => editSlideInputRef.current?.click()}
                                className="mt-1.5 flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-800 font-medium">
                                <Plus size={13} /> Tambah Gambar Slide
                              </button>
                              <input ref={editSlideInputRef} type="file" accept="image/*" multiple className="sr-only" onChange={handleAddEditSlideFiles} />
                            </div>

                            {/* ── Edit Kuis ── */}
                            <div className="border-t border-slate-100 pt-3 space-y-2">
                              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                                Kuis ({editQuiz.length} soal)
                              </label>
                              {editQuiz.map((soal, soalIdx) => (
                                <div key={soalIdx} className="border border-slate-200 rounded-lg p-2.5 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full">Soal {soalIdx + 1}</span>
                                    <button onClick={() => removeEditQuestion(soalIdx)} className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-1">
                                      <Trash2 size={11} /> Hapus
                                    </button>
                                  </div>
                                  <textarea value={soal.pertanyaan} onChange={e => updateEditQuestion(soalIdx, { pertanyaan: e.target.value })}
                                    placeholder="Pertanyaan..." rows={2}
                                    className="w-full p-2 rounded-md border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                                  {soal.opsi.map((opsi, optIdx) => (
                                    <div key={optIdx} className="flex items-center gap-1.5">
                                      <input type="radio" name={`edit-jawaban-${m.id}-${soalIdx}`} checked={soal.jawabanBenar === optIdx}
                                        onChange={() => updateEditQuestion(soalIdx, { jawabanBenar: optIdx })} />
                                      <input value={opsi} onChange={e => updateEditOption(soalIdx, optIdx, e.target.value)}
                                        placeholder={`Opsi ${String.fromCharCode(65 + optIdx)}`}
                                        className="flex-1 h-7 px-2 text-xs rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                  ))}
                                  <input value={soal.penjelasan} onChange={e => updateEditQuestion(soalIdx, { penjelasan: e.target.value })}
                                    placeholder="Penjelasan (opsional)"
                                    className="w-full h-7 px-2 text-xs rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                              ))}
                              <button onClick={addEditQuestion} className="flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-800 font-medium">
                                <Plus size={13} /> Tambah Soal
                              </button>
                            </div>
                          </>
                        )}

                        <div className="flex gap-2">
                          <button onClick={handleSaveEdit} disabled={saving}
                            className="flex items-center gap-1.5 bg-blue-800 text-white text-xs px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                            <Check size={13} />{saving ? 'Menyimpan...' : 'Simpan'}
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="flex items-center gap-1.5 border border-slate-200 text-slate-600 text-xs px-4 py-2 rounded-lg hover:bg-slate-50">
                            <X size={13} />Batal
                          </button>
                        </div>
                      </div>
                    ) : deletingId === m.id ? (
                      <div className="flex items-center gap-3">
                        <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-800">Hapus &quot;{m.judul}&quot;?</p>
                          <p className="text-xs text-slate-500">Tindakan ini tidak bisa dibatalkan.</p>
                        </div>
                        <button onClick={() => handleDelete(m.id)}
                          className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700">
                          Ya, Hapus
                        </button>
                        <button onClick={() => setDeletingId(null)}
                          className="text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg">
                          Batal
                        </button>
                      </div>
                    ) : (
                      <div>
                        {/* Header kartu */}
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                            style={{ backgroundColor: (m.thumbnail_color || '#1E40AF') + '20' }}>
                            {m.thumbnail_emoji || '📘'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">{m.judul}</p>
                                <p className="text-xs text-blue-600">{m.mata_pelajaran}</p>
                              </div>
                              <div className="flex gap-1.5 flex-shrink-0">
                                <button onClick={() => triggerVideoUpload(m.id)} disabled={uploadingVideoId === m.id}
                                  title={m.video_url ? 'Ganti video' : 'Tambah video'}
                                  className={cn('p-1.5 rounded-lg transition-colors',
                                    m.video_url ? 'bg-purple-50 text-purple-600 hover:bg-purple-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>
                                  {uploadingVideoId === m.id
                                    ? <Loader2 size={14} className="animate-spin" />
                                    : <Video size={14} />}
                                </button>
                                <button onClick={() => handleStartEdit(m)} title="Edit"
                                  className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                                  <Pencil size={14} />
                                </button>
                                <button onClick={() => setDeletingId(m.id)} title="Hapus"
                                  className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              <Badge variant="secondary" className="text-[10px]">
                                {m.mode === 'audio' ? '🔊 Audio' : m.mode === 'visual' ? '👁️ Visual' : '⚡ Keduanya'}
                              </Badge>
                              {m.is_ai_generated && <Badge variant="secondary" className="text-[10px]">✨ AI</Badge>}
                              {m.video_url && <Badge className="text-[10px] bg-purple-100 text-purple-700 border-0">🎬 Ada Video</Badge>}
                              {m.transkrip && <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-0">📝 Ada Transkripsi</Badge>}
                            </div>
                          </div>
                        </div>

                        {/* Progress bar upload */}
                        {uploadingVideoId === m.id && (
                          <div className="mt-3 px-1">
                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                              <span>Mengupload video...</span>
                              <span>{videoProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2">
                              <div className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${videoProgress}%` }} />
                            </div>
                          </div>
                        )}

                        {/* Bar Transkripsi Otomatis */}
                        {m.video_url && (
                          <div className="mt-3 rounded-xl border border-slate-200 overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50">
                              <div className="flex items-center gap-2">
                                <FileText size={14} className="text-emerald-600" />
                                <span className="text-xs font-semibold text-slate-700">Transkripsi Video</span>
                                {m.transkrip && (
                                  <span className="text-[10px] text-emerald-600 font-medium">● Tersedia</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {m.transkrip && (
                                  <button
                                    onClick={() => setExpandedTranscriptId(expandedTranscriptId === m.id ? null : m.id)}
                                    className="text-[10px] text-blue-600 hover:underline">
                                    {expandedTranscriptId === m.id ? 'Sembunyikan' : 'Lihat'}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleAutoTranscribe(m.id, m.video_url!)}
                                  disabled={transcribingId === m.id}
                                  className={cn(
                                    'flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg font-medium transition-colors',
                                    transcribingId === m.id
                                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                      : m.transkrip
                                      ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  )}>
                                  {transcribingId === m.id
                                    ? <><Loader2 size={10} className="animate-spin" />Memproses...</>
                                    : m.transkrip
                                    ? <><FileText size={10} />Perbarui</>
                                    : <><FileText size={10} />Buat Transkripsi</>
                                  }
                                </button>
                              </div>
                            </div>
                            {/* Isi transkripsi */}
                            {expandedTranscriptId === m.id && m.transkrip && (
                              <div className="px-3 py-3 bg-white border-t border-slate-100 max-h-48 overflow-y-auto">
                                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{m.transkrip}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-5 py-3 rounded-xl shadow-xl z-50 max-w-sm text-center animate-in fade-in">
          {toast}
        </div>
      )}

      <AccessibilityBar />
    </div>
  );
}