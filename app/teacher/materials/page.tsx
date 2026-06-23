'use client';

import { useState, useEffect, useRef } from 'react';
import { BookOpen, Plus, Pencil, Trash2, Video, X, Check, Search, AlertCircle, FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';
import TeacherSidebar from '@/components/shared/TeacherSidebar';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';

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
}

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

  // Pakai ref buat nyimpen target ID upload — bukan state, biar langsung tersedia pas file dipilih
  const uploadTargetRef = useRef<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadMaterials(); }, []);

  const loadMaterials = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('materials')
      .select('id, judul, mata_pelajaran, deskripsi, mode, thumbnail_color, thumbnail_emoji, video_url, transkrip, is_ai_generated, created_at')
      .order('created_at', { ascending: false });
    setMaterials(data || []);
    setLoading(false);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // ── EDIT ──
  const handleStartEdit = (m: Material) => {
    setEditingId(m.id);
    setEditData({ judul: m.judul, mata_pelajaran: m.mata_pelajaran, deskripsi: m.deskripsi, mode: m.mode });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from('materials')
      .update({ judul: editData.judul, mata_pelajaran: editData.mata_pelajaran, deskripsi: editData.deskripsi, mode: editData.mode })
      .eq('id', editingId);
    if (error) showToast('Gagal menyimpan: ' + error.message);
    else {
      setMaterials(prev => prev.map(m => m.id === editingId ? { ...m, ...editData } as Material : m));
      showToast('Materi berhasil diperbarui!');
      setEditingId(null);
    }
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

  return (
    <div className="flex min-h-screen bg-slate-50">
      <TeacherSidebar />
      <main className="flex-1 sm:ml-60 pb-4">
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-slate-900 flex items-center gap-2">
            <BookOpen size={18} className="text-blue-700" />
            Kelola Materi ({materials.length})
          </h1>
          <Link href="/teacher/upload-materi"
            className="flex items-center gap-1.5 bg-blue-800 text-white text-xs px-3 py-2 rounded-xl hover:bg-blue-700 transition-colors">
            <Plus size={14} /> Tambah Materi
          </Link>
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
            <div className="space-y-3">
              <p className="text-xs text-slate-500">{filtered.length} materi</p>
              {filtered.map(m => (
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