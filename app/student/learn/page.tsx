'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Clock, BookOpen, Filter, Sparkles } from 'lucide-react';
import StudentBottomNav from '@/components/shared/StudentBottomNav';
import StudentSidebar from '@/components/shared/StudentSidebar';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { createClient } from '@/lib/supabase/client';

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

type FilterMode = 'all' | 'audio' | 'visual' | 'both';

const filterOptions: { value: FilterMode; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'audio', label: 'Tunanetra (Audio)' },
  { value: 'visual', label: 'Tunarungu (Visual)' },
  { value: 'both', label: 'Audio & Visual' },
];

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

export default function LearnPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
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

  const filtered = materials.filter((m) => {
    const matchSearch =
      search === '' ||
      m.judul.toLowerCase().includes(search.toLowerCase()) ||
      m.mata_pelajaran.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || m.mode === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="flex min-h-screen bg-slate-50">
      <StudentSidebar />

      <main id="main-content" className="flex-1 sm:ml-60 pb-20 sm:pb-4">
        {/* Top Bar */}
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-slate-900 flex items-center gap-2">
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

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" role="group" aria-label="Filter mode aksesibilitas">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  filter === opt.value
                    ? 'bg-blue-800 text-white border-blue-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                }`}
                aria-pressed={filter === opt.value}
                aria-label={`Filter: ${opt.label}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Filter size={14} />
            <span>{filtered.length} materi ditemukan</span>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <MaterialCardSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-slate-500 font-medium">Materi tidak ditemukan</p>
              <p className="text-slate-400 text-sm mt-1">Coba kata kunci atau filter yang berbeda</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map((m) => (
                <Link key={m.id} href={`/student/learn/${m.id}`} className="block">
                  <Card className="hover:shadow-md transition-all card-hover border-0 shadow-sm h-full">
                    <CardContent className="p-3">
                      {/* Thumbnail */}
                      <div
                        className="w-full h-24 rounded-xl flex items-center justify-center text-3xl mb-3 relative"
                        style={{ backgroundColor: m.thumbnail_color + '18' }}
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

                      {/* Badges */}
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        <Badge
                          variant={m.mode === 'audio' ? 'audio' : m.mode === 'visual' ? 'visual' : 'secondary'}
                          className="text-[10px] px-1.5"
                        >
                          {m.mode === 'audio' ? '🔊' : m.mode === 'visual' ? '👁️' : '⚡'}
                          {' '}
                          {m.mode === 'audio' ? 'Audio' : m.mode === 'visual' ? 'Visual' : 'Keduanya'}
                        </Badge>
                      </div>

                      {/* Title */}
                      <p className="text-xs font-semibold text-slate-800 leading-tight mb-1 line-clamp-2">
                        {m.judul}
                      </p>

                      {/* Meta */}
                      <p className="text-[10px] text-blue-600 font-medium mb-2">{m.mata_pelajaran}</p>

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
              ))}
            </div>
          )}
        </div>
      </main>

      <StudentBottomNav />
      <AccessibilityBar />
    </div>
  );
}
