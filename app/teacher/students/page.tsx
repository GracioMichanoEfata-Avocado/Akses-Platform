'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users, ChevronRight } from 'lucide-react';
import TeacherSidebar from '@/components/shared/TeacherSidebar';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { createClient } from '@/lib/supabase/client';
import { getDisabilitasLabel, getDisabilitasBadgeColor } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';
import BackButton from '@/components/shared/BackButton';

type FilterType = 'all' | 'tunanetra' | 'tunarungu' | 'both' | 'none';

interface StudentRow {
  id: string;
  nama: string;
  avatar: string;
  avatar_color: string;
  disabilitas: string;
  progress: number;
}

export default function StudentsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function loadStudents() {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nama, avatar, avatar_color, student_profiles(disabilitas)')
        .eq('role', 'student');

      const rows: StudentRow[] = [];
      for (const p of profiles || []) {
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
        });
      }
      setStudents(rows);
      setLoading(false);
    }
    loadStudents();
  }, []);

  const filtered = students.filter(s => {
    const matchSearch = search === '' || s.nama.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || s.disabilitas === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="flex min-h-screen bg-slate-50">
      <TeacherSidebar />
      <main id="main-content" className="flex-1 sm:ml-60 pb-4">
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3">
          <h1 className="font-bold text-slate-900 flex items-center gap-2">
            <BackButton href="/teacher/dashboard" />
            <Users size={18} className="text-blue-700" />
            Manajemen Siswa
          </h1>
        </div>
        <div className="p-4 space-y-4 max-w-3xl mx-auto">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="search" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari siswa..."
              className="w-full h-11 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {([
              { value: 'all', label: 'Semua' },
              { value: 'tunanetra', label: '👁️ Tunanetra' },
              { value: 'tunarungu', label: '👂 Tunarungu' },
              { value: 'both', label: '♿ Keduanya' },
            ] as { value: FilterType; label: string }[]).map(opt => (
              <button key={opt.value} onClick={() => setFilter(opt.value)}
                className={cn("flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  filter === opt.value ? "bg-blue-800 text-white border-blue-800" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300")}>
                {opt.label}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500">{filtered.length} siswa ditemukan</p>
              <div className="space-y-2">
                {filtered.length === 0 && (
                  <p className="text-center text-slate-400 text-sm py-8">Belum ada siswa terdaftar</p>
                )}
                {filtered.map(s => (
                  <Card key={s.id} className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
                    onClick={() => router.push(`/teacher/students/${s.id}`)}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ backgroundColor: s.avatar_color }}>
                        {s.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-slate-900 truncate">{s.nama}</p>
                          <Badge className={cn("text-[10px] flex-shrink-0", getDisabilitasBadgeColor(s.disabilitas))}>
                            {getDisabilitasLabel(s.disabilitas)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={s.progress} className="h-1.5 flex-1" />
                          <span className="text-xs font-bold text-blue-700 flex-shrink-0">{s.progress}%</span>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <AccessibilityBar />
    </div>
  );
}