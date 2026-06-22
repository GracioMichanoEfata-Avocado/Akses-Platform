'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Play, Square, Volume2 } from 'lucide-react';
import StudentBottomNav from '@/components/shared/StudentBottomNav';
import StudentSidebar from '@/components/shared/StudentSidebar';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

interface KuisItem {
  pertanyaan: string;
  opsi: string[];
  jawabanBenar: number;
  penjelasan: string;
}

interface VisualisasiItem {
  judul: string;
  emojiIkon: string;
  deskripsi: string;
  warna: string;
}

interface LibraryItem {
  judul: string;
  ringkasan: string;
  poinUtama: string[];
  kuis: KuisItem[];
  visualisasi: VisualisasiItem[];
  audioDeskripsi: string;
  savedAt: string;
}

type TabType = 'materi' | 'kuis' | 'visualisasi';

export default function AIContentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<LibraryItem | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('materi');

  // Kuis state
  const [answered, setAnswered] = useState<Record<number, number>>({});
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    const library: LibraryItem[] = JSON.parse(localStorage.getItem('akses-library') || '[]');
    const idx = parseInt(id, 10);
    if (isNaN(idx) || !library[idx]) {
      router.replace('/student/learn');
      return;
    }
    setItem(library[idx]);
  }, [id, router]);

  if (!item) return null;

  const totalSoal = item.kuis.length;
  const answered_count = Object.keys(answered).length;
  const benarCount = Object.entries(answered).filter(([soalIdx, pilihan]) =>
    item.kuis[parseInt(soalIdx)]?.jawabanBenar === pilihan
  ).length;

  const handleJawab = (soalIdx: number, opsiIdx: number) => {
    if (answered[soalIdx] !== undefined) return;
    setAnswered((prev) => ({ ...prev, [soalIdx]: opsiIdx }));
  };

  const handleFinish = () => setShowResult(true);
  const handleRetry = () => { setAnswered({}); setShowResult(false); };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <StudentSidebar />

      <main id="main-content" className="flex-1 sm:ml-60 pb-20 sm:pb-4">
        {/* Top bar */}
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push('/student/learn')}
            className="text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Kembali ke halaman belajar"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{item.judul}</p>
            <Badge className="text-[10px] bg-purple-100 text-purple-700 mt-0.5">AI Generated</Badge>
          </div>
        </div>

        <div className="p-4 max-w-3xl mx-auto space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl" role="tablist" aria-label="Tab konten materi AI">
            {([
              { id: 'materi', label: 'Materi' },
              { id: 'kuis', label: `Kuis (${totalSoal})` },
              { id: 'visualisasi', label: 'Visualisasi' },
            ] as { id: TabType; label: string }[]).map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={activeTab === t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                  activeTab === t.id
                    ? 'bg-white text-blue-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Tab Materi ── */}
          {activeTab === 'materi' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h1 className="text-xl font-bold text-slate-900 mb-3">{item.judul}</h1>
                <p className="text-sm text-slate-600 leading-relaxed">{item.ringkasan}</p>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h2 className="font-semibold text-slate-900 mb-3">Poin Utama</h2>
                <ul className="space-y-2">
                  {item.poinUtama.map((poin, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      {poin}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Audio player */}
              {item.audioDeskripsi && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Volume2 size={16} className="text-blue-700" />
                    <p className="text-sm font-semibold text-blue-900">Dengarkan Narasi</p>
                  </div>
                  <p className="text-xs text-blue-600 mb-3">Narasi audio oleh pendamping untuk siswa tunanetra</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const utter = new SpeechSynthesisUtterance(item.audioDeskripsi);
                        utter.lang = 'id-ID';
                        window.speechSynthesis.speak(utter);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-800 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                      aria-label="Putar narasi audio materi"
                    >
                      <Play size={14} /> Putar
                    </button>
                    <button
                      onClick={() => window.speechSynthesis.cancel()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                      aria-label="Stop narasi audio"
                    >
                      <Square size={14} /> Stop
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab Kuis ── */}
          {activeTab === 'kuis' && (
            <div className="space-y-4">
              {showResult ? (
                <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                  <div className="text-5xl mb-4">{benarCount >= totalSoal * 0.8 ? '🎉' : '📚'}</div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">{benarCount} / {totalSoal}</h2>
                  <p className="text-slate-500 mb-1">Jawaban Benar</p>
                  <p className="text-sm font-medium mb-6">
                    {benarCount >= totalSoal * 0.8 ? (
                      <span className="text-emerald-600">Hebat! Kamu lulus kuis ini!</span>
                    ) : (
                      <span className="text-amber-600">Pelajari lagi materi untuk hasil lebih baik.</span>
                    )}
                  </p>
                  <button
                    onClick={handleRetry}
                    className="px-6 py-2.5 bg-blue-800 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                    aria-label="Ulangi kuis dari awal"
                  >
                    Ulangi Kuis
                  </button>
                </div>
              ) : (
                <>
                  {item.kuis.map((soal, soalIdx) => {
                    const userAnswer = answered[soalIdx];
                    const isDone = userAnswer !== undefined;
                    return (
                      <div key={soalIdx} className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
                        <p className="text-xs font-bold text-blue-700">Soal {soalIdx + 1}</p>
                        <p className="text-sm font-semibold text-slate-900">{soal.pertanyaan}</p>
                        <div className="space-y-2">
                          {soal.opsi.map((opsi, opsiIdx) => {
                            let style = 'border-slate-200 bg-white text-slate-700';
                            if (isDone) {
                              if (opsiIdx === soal.jawabanBenar) {
                                style = 'border-emerald-400 bg-emerald-50 text-emerald-800';
                              } else if (opsiIdx === userAnswer) {
                                style = 'border-red-300 bg-red-50 text-red-700';
                              }
                            }
                            return (
                              <button
                                key={opsiIdx}
                                onClick={() => handleJawab(soalIdx, opsiIdx)}
                                disabled={isDone}
                                className={cn(
                                  'w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                                  style,
                                  !isDone && 'hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                                )}
                                aria-label={`Pilih opsi ${String.fromCharCode(65 + opsiIdx)}: ${opsi}`}
                              >
                                <span className="text-xs font-bold mr-2 opacity-50">{String.fromCharCode(65 + opsiIdx)}.</span>
                                {opsi}
                              </button>
                            );
                          })}
                        </div>
                        {isDone && (
                          <div className={cn(
                            'p-3 rounded-xl text-xs',
                            userAnswer === soal.jawabanBenar ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                          )}>
                            <span className="font-bold">
                              {userAnswer === soal.jawabanBenar ? '✓ Benar! ' : '✗ Kurang tepat. '}
                            </span>
                            {soal.penjelasan}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {answered_count === totalSoal && (
                    <button
                      onClick={handleFinish}
                      className="w-full py-3.5 bg-blue-800 text-white rounded-2xl font-semibold text-sm hover:bg-blue-700 transition-colors"
                      aria-label="Lihat hasil kuis"
                    >
                      Lihat Hasil Kuis
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Tab Visualisasi ── */}
          {activeTab === 'visualisasi' && (
            <div className="space-y-4">
              {item.visualisasi.map((vis, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden"
                >
                  <div
                    className="w-full h-24 flex items-center justify-center gap-3"
                    style={{ backgroundColor: vis.warna + '20' }}
                    aria-hidden="true"
                  >
                    <span className="text-4xl">{vis.emojiIkon}</span>
                    <span className="text-lg font-bold" style={{ color: vis.warna }}>{vis.judul}</span>
                  </div>
                  <div className="p-5">
                    <p className="text-sm text-slate-700 leading-relaxed">{vis.deskripsi}</p>
                    <button
                      onClick={() => {
                        const utter = new SpeechSynthesisUtterance(`${vis.judul}. ${vis.deskripsi}`);
                        utter.lang = 'id-ID';
                        window.speechSynthesis.speak(utter);
                      }}
                      className="mt-3 flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 transition-colors"
                      aria-label={`Dengarkan penjelasan ${vis.judul}`}
                    >
                      <Volume2 size={14} /> Dengarkan
                    </button>
                  </div>
                </div>
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
