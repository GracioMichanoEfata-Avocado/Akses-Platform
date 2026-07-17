'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Search, Clock, BookOpen, Sparkles, ChevronLeft } from 'lucide-react';
import StudentBottomNav from '@/components/shared/StudentBottomNav';
import StudentSidebar from '@/components/shared/StudentSidebar';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { createClient } from '@/lib/supabase/client';
import { useTalkbackContext, PageVoiceCommand } from '@/components/accessibility/TalkbackProvider';
import { speakLong } from '@/lib/hooks/useTalkback';
import BackButton from '@/components/shared/BackButton';
import { MATA_PELAJARAN, getSubjectEmoji } from '@/lib/constants/subjects';

interface Material {
  id: string;
  judul: string;
  mata_pelajaran: string;
  deskripsi: string;
  durasi: number;
  mode: 'audio' | 'visual' | 'both';
  thumbnail_color: string;
  thumbnail_emoji: string;
  progress: number;
}

interface LibraryItem {
  judul: string;
  ringkasan: string;
  poinUtama: string[];
  savedAt: string;
}

function MaterialCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-3 animate-pulse">
      <div className="w-full h-28 bg-slate-200 rounded-xl mb-3" />
      <div className="h-4 bg-slate-200 rounded w-20 mb-2" />
      <div className="h-5 bg-slate-200 rounded mb-1" />
      <div className="h-4 bg-slate-200 rounded w-32" />
    </div>
  );
}

function MaterialCard({ m }: { m: Material }) {
  return (
    <Link href={`/student/learn/${m.id}`} className="block">
      <Card className="hover:shadow-md transition-all card-hover border-0 shadow-sm h-full">
        <CardContent className="p-3">
          {/* Thumbnail */}
          <div
            className="glow-tint w-full h-24 rounded-xl flex items-center justify-center text-3xl mb-3 relative"
            style={{ backgroundColor: m.thumbnail_color + '18', '--glow-color': m.thumbnail_color } as React.CSSProperties}
            role="img"
            aria-label={`Thumbnail materi ${m.judul}`}
          >
            {m.thumbnail_emoji}
            {m.progress === 100 && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-white text-[10px]">✓</span>
              </div>
            )}
          </div>

          {/* Title */}
          <p className="text-xs font-semibold text-slate-800 leading-tight mb-1 line-clamp-2">
            {m.judul}
          </p>

          {/* Label mata pelajaran */}
          <Badge variant="secondary" className="text-[10px] px-1.5 mb-2">
            {m.mata_pelajaran}
          </Badge>

          <div className="flex items-center gap-1 text-slate-400 mb-2">
            <Clock size={10} />
            <span className="text-[10px]">{m.durasi} menit</span>
          </div>

          {/* Progress */}
          {m.progress > 0 && (
            <div className="mt-auto">
              <Progress value={m.progress} className="h-1.5" />
              <p className="text-[10px] text-slate-400 mt-0.5">{m.progress}% selesai</p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function LearnPage() {
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLibrary, setAiLibrary] = useState<LibraryItem[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  useEffect(() => {
    const lib = JSON.parse(localStorage.getItem('akses-library') || '[]');
    setAiLibrary(lib);

    const supabase = createClient();

    async function loadMaterials() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: materialsData, error } = await supabase
        .from('materials')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Gagal ambil materi:', error.message);
        setLoading(false);
        return;
      }

      let progressMap: Record<string, number> = {};
      if (user) {
        const { data: progressData } = await supabase
          .from('student_material_progress')
          .select('material_id, progress')
          .eq('student_id', user.id);

        progressData?.forEach((p) => {
          progressMap[p.material_id] = p.progress;
        });
      }

      const merged: Material[] = (materialsData || []).map((m) => ({
        id: m.id,
        judul: m.judul,
        mata_pelajaran: m.mata_pelajaran,
        deskripsi: m.deskripsi,
        durasi: m.durasi,
        mode: m.mode,
        thumbnail_color: m.thumbnail_color,
        thumbnail_emoji: m.thumbnail_emoji,
        progress: progressMap[m.id] ?? 0,
      }));

      setMaterials(merged);
      setLoading(false);
    }

    loadMaterials();
  }, []);

  // Section mata pelajaran selalu lengkap (sama seperti daftar saat guru
  // buat sesi live) + mapel lain yang mungkin dipakai materi tapi belum
  // ada di daftar baku, supaya tidak ada materi yang "hilang".
  const materialSubjects = useMemo(
    () => Array.from(new Set(materials.map((m) => m.mata_pelajaran))).sort(),
    [materials]
  );
  const subjects = useMemo(
    () => [...MATA_PELAJARAN, ...materialSubjects.filter((s) => !MATA_PELAJARAN.includes(s))],
    [materialSubjects]
  );

  const searching = search.trim() !== '';
  const searchResults = useMemo(
    () => materials.filter((m) =>
      m.judul.toLowerCase().includes(search.toLowerCase()) ||
      m.mata_pelajaran.toLowerCase().includes(search.toLowerCase())
    ),
    [materials, search]
  );
  const subjectMaterials = useMemo(
    () => selectedSubject ? materials.filter((m) => m.mata_pelajaran === selectedSubject) : [],
    [materials, selectedSubject]
  );

  // Daftar materi yang SEDANG tampil (dipakai voice command "ada materi apa aja"/"ulang").
  const visibleMaterials = useMemo(
    () => searching ? searchResults : selectedSubject ? subjectMaterials : [],
    [searching, searchResults, selectedSubject, subjectMaterials]
  );

  // ── Voice command: sebut mata pelajaran -> buka section-nya; "ada materi
  // apa aja" -> dibacakan satu-satu; "ulang" -> dibacakan lagi; "kembali"/
  // "semua mata pelajaran" -> tutup section, balik ke daftar mata pelajaran. ──
  const { registerPageCommands, clearPageCommands, isAktif } = useTalkbackContext();

  const bacaDaftarMateri = useCallback(() => {
    if (!selectedSubject && !searching) {
      speakLong(`Pilih salah satu mata pelajaran: ${subjects.join(', ')}.`);
      return;
    }
    const label = searching ? 'pencarian ini' : selectedSubject!;
    const teks = visibleMaterials.length > 0
      ? visibleMaterials.map((m, i) => `${i + 1}. ${m.judul}.`).join(' ')
      : `Tidak ada materi untuk ${label}.`;
    speakLong(teks);
  }, [visibleMaterials, selectedSubject, searching, subjects]);

  useEffect(() => {
    if (!isAktif) return;

    const commands: PageVoiceCommand[] = [
      ...subjects.map((subj) => ({
        keywords: [subj.toLowerCase()],
        label: subj,
        action: () => { setSearch(''); setSelectedSubject(subj); },
      })),
      {
        keywords: ['ada materi apa aja', 'ada materi apa saja', 'materi apa aja', 'materi apa saja', 'apa aja materinya', 'apa saja materinya'],
        label: 'Ada materi apa saja',
        action: bacaDaftarMateri,
      },
      {
        keywords: ['ulang', 'ulangi', 'tolong ulang'],
        label: 'Ulangi',
        action: bacaDaftarMateri,
      },
      {
        keywords: ['kembali', 'balik', 'semua mata pelajaran', 'daftar mata pelajaran'],
        label: 'Kembali ke daftar mata pelajaran',
        action: () => { setSearch(''); setSelectedSubject(null); },
      },
    ];

    registerPageCommands(commands);
    return () => clearPageCommands();
  }, [isAktif, subjects, bacaDaftarMateri, registerPageCommands, clearPageCommands]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <StudentSidebar />

      <main id="main-content" className="flex-1 sm:ml-60 pb-20 sm:pb-4">
        {/* Top Bar */}
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-slate-900 flex items-center gap-2">
            <BackButton href="/student/dashboard" />
            <BookOpen size={18} className="text-blue-700" />
            Ekosistem Materi
          </h1>
        </div>

        <div className="p-4 space-y-4 max-w-3xl mx-auto">
          {/* Section: Dari Pendamping */}
          {aiLibrary.length > 0 && (
            <section aria-labelledby="ai-section-heading">
              <div className="flex items-center gap-2 mb-3">
                <h2 id="ai-section-heading" className="font-semibold text-slate-900 flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-600" />
                  Dari Pendamping
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {aiLibrary.map((item, idx) => (
                  <Link key={idx} href={`/student/learn/ai-content/${idx}`}>
                    <Card className="hover:shadow-md transition-all card-hover border-0 shadow-sm h-full">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <Sparkles size={18} className="text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <Badge className="text-[10px] bg-purple-100 text-purple-700 mb-1">AI Generated</Badge>
                            <p className="text-sm font-semibold text-slate-800 leading-tight line-clamp-2">{item.judul}</p>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.ringkasan}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari materi atau mata pelajaran..."
              className="w-full h-11 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Cari materi pembelajaran"
            />
          </div>

          {/* Loading */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <MaterialCardSkeleton key={i} />)}
            </div>
          ) : searching ? (
            <>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <BookOpen size={14} />
                <span>{searchResults.length} materi ditemukan</span>
              </div>
              {searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="text-slate-500 font-medium">Materi tidak ditemukan</p>
                  <p className="text-slate-400 text-sm mt-1">Coba kata kunci yang berbeda</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {searchResults.map((m) => <MaterialCard key={m.id} m={m} />)}
                </div>
              )}
            </>
          ) : !selectedSubject ? (
            <>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <BookOpen size={14} />
                <span>{subjects.length} mata pelajaran</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" role="list" aria-label="Daftar mata pelajaran">
                {subjects.map((subj) => {
                  const count = materials.filter((m) => m.mata_pelajaran === subj).length;
                  return (
                    <button
                      key={subj}
                      onClick={() => setSelectedSubject(subj)}
                      role="listitem"
                      aria-label={`Buka mata pelajaran ${subj}, ${count} materi`}
                      className={`text-left rounded-xl border p-3 transition-all card-hover ${
                        count > 0 ? 'bg-white border-slate-100 hover:shadow-md' : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="w-full h-16 rounded-lg bg-blue-50 flex items-center justify-center text-2xl mb-2">
                        {getSubjectEmoji(subj)}
                      </div>
                      <p className="text-xs font-semibold text-slate-800 leading-tight mb-1">{subj}</p>
                      <p className="text-[10px] text-slate-400">
                        {count > 0 ? `${count} materi` : 'Belum ada materi'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedSubject(null)}
                  className="flex items-center gap-1 text-sm font-semibold text-slate-900 hover:text-blue-700"
                >
                  <ChevronLeft size={16} />
                  <span className="text-xl">{getSubjectEmoji(selectedSubject)}</span>
                  {selectedSubject}
                </button>
                <span className="text-xs text-slate-400">{subjectMaterials.length} materi</span>
              </div>
              {subjectMaterials.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">{getSubjectEmoji(selectedSubject)}</div>
                  <p className="text-slate-500 font-medium">Belum ada materi untuk {selectedSubject}</p>
                  <button onClick={() => setSelectedSubject(null)} className="text-blue-700 text-sm mt-2 hover:underline">
                    ← Pilih mata pelajaran lain
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {subjectMaterials.map((m) => <MaterialCard key={m.id} m={m} />)}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <StudentBottomNav />
      <AccessibilityBar />
    </div>
  );
}
