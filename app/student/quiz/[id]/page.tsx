'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, Trophy, RotateCcw, BookOpen, Clock, AlertTriangle, Sparkles } from 'lucide-react';
import StudentBottomNav from '@/components/shared/StudentBottomNav';
import StudentSidebar from '@/components/shared/StudentSidebar';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';
import { useAccessibilityStore } from '@/lib/store/accessibility-store';
import { useQuizVoice } from '@/lib/hooks/useQuizVoice';

type AnswerState = { answered: boolean; selected: number; correct: boolean };
const DURASI_KUIS = 5 * 60; // 5 menit dalam detik

interface Soal {
  id: string;
  pertanyaan: string;
  pilihan: string[];
  jawaban_benar: number;
  penjelasan: string;
}

export default function QuizPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [materialJudul, setMaterialJudul] = useState('');
  const [quizId, setQuizId] = useState<string | null>(null);
  const [soal, setSoal] = useState<Soal[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({});
  const [showResult, setShowResult] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DURASI_KUIS);
  const [timeUp, setTimeUp] = useState(false);
  const [generatingRemedial, setGeneratingRemedial] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const { mode } = useAccessibilityStore();
  const isVoiceMode = mode === 'tunanetra' || mode === 'both';
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function loadQuiz() {
      const { data: material } = await supabase
        .from('materials').select('judul').eq('id', id).single();
      setMaterialJudul(material?.judul || '');

      const { data: quiz } = await supabase
        .from('quizzes').select('id').eq('material_id', id).maybeSingle();
      if (!quiz) { setLoading(false); return; }
      setQuizId(quiz.id);

      const { data: questions } = await supabase
        .from('quiz_questions')
        .select('id, pertanyaan, pilihan, jawaban_benar, penjelasan')
        .eq('quiz_id', quiz.id);
      setSoal(questions || []);
      setLoading(false);
    }
    loadQuiz();
  }, [id]);

  // ── Timer 5 menit ──
  useEffect(() => {
    if (loading || soal.length === 0 || showResult) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setTimeUp(true);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, soal.length, showResult]);

  const handleTimeUp = useCallback(async () => {
    setShowResult(true);
    await saveQuizResult();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelect = useCallback((optionIdx: number) => {
    if (answersRef.current[currentIdx]?.answered || timeUp) return;
    if (isVoiceMode) {
      // Mode voice: hanya sorot, kunci baru terjadi saat "lanjut"
      setSelectedIdx(optionIdx);
      return;
    }
    const correct = optionIdx === soal[currentIdx].jawaban_benar;
    setAnswers(prev => ({ ...prev, [currentIdx]: { answered: true, selected: optionIdx, correct } }));
  }, [currentIdx, timeUp, isVoiceMode, soal]);

  const handleVoiceLanjut = useCallback((selIdx: number) => {
    const s = soal[currentIdx];
    if (!s) return;
    const correct = selIdx === s.jawaban_benar;
    // Tulis ke ref DULU: saveQuizResult() di handleNext membaca answersRef.current
    // pada tick yang sama, sebelum re-render sempat menyinkronkan ref.
    const newAnswers = {
      ...answersRef.current,
      [currentIdx]: { answered: true, selected: selIdx, correct },
    };
    answersRef.current = newAnswers;
    setAnswers(newAnswers);
    setSelectedIdx(null);
    handleNext();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soal, currentIdx]); // handleNext stabil per render; currentIdx sudah di deps

  const score = Object.values(answers).filter(a => a.correct).length;
  const percentage = soal.length > 0 ? Math.round((score / soal.length) * 100) : 0;
  const lulus = percentage >= 70;

  const { triggerLanjut } = useQuizVoice({
    enabled: isVoiceMode,
    soal,
    currentIdx,
    selectedIdx,
    showResult,
    timeLeft,
    totalDurasi: DURASI_KUIS,
    percentage,
    materialJudul,
    onSelect: handleSelect,
    onLanjut: handleVoiceLanjut,
  });

  const saveQuizResult = async () => {
    const finalAnswers = answersRef.current;
    const score = Object.values(finalAnswers).filter(a => a.correct).length;
    const pct = Math.round((score / soal.length) * 100);

    if (quizId) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('quiz_attempts').insert({
          student_id: user.id,
          quiz_id: quizId,
          skor: pct,
          lulus: pct >= 70,
        });
        await supabase.from('student_material_progress').upsert({
          student_id: user.id,
          material_id: id,
          progress: 100,
          skor_terakhir: pct,
        }, { onConflict: 'student_id,material_id' });
      }
    }
    return pct;
  };

  const handleNext = async () => {
    if (currentIdx < soal.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setShowResult(true);
      await saveQuizResult();
    }
  };

  const handleStartRemedial = async () => {
    setGeneratingRemedial(true);
    const score = Object.values(answers).filter(a => a.correct).length;
    const pct = Math.round((score / soal.length) * 100);

    try {
      const res = await fetch('/api/generate-materi/generate-remedial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId: id, quizId, skorAwal: pct }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.push(`/student/remedial/${data.attemptId}`);
    } catch (err: any) {
      alert('Gagal membuat soal remedial: ' + err.message);
      setGeneratingRemedial(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setSelectedIdx(null);
    setCurrentIdx(0);
    setShowResult(false);
    setShowReview(false);
    setTimeLeft(DURASI_KUIS);
    setTimeUp(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (soal.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-3">Kuis tidak tersedia untuk materi ini</p>
          <Link href="/student/learn" className="text-blue-600 hover:underline text-sm">← Kembali ke Katalog</Link>
        </div>
      </div>
    );
  }

  const currentSoal = soal[currentIdx];
  const currentAnswer = answers[currentIdx];
  const isWarningTime = timeLeft <= 60 && timeLeft > 0;

  if (showResult) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <StudentSidebar />
        <main className="flex-1 sm:ml-60 pb-20 sm:pb-4 flex items-center justify-center p-4">
          <div className="w-full max-w-sm space-y-5">
            {timeUp && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
                <AlertTriangle size={15} /> Waktu habis! Kuis otomatis diselesaikan.
              </div>
            )}

            <Card className="border-0 shadow-lg overflow-hidden">
              <div className={cn("p-8 text-center",
                percentage >= 80 ? "bg-gradient-to-br from-emerald-500 to-emerald-600" :
                percentage >= 70 ? "bg-gradient-to-br from-blue-600 to-blue-700" :
                "bg-gradient-to-br from-amber-500 to-amber-600"
              )}>
                <Trophy size={36} className="text-white mx-auto mb-3" />
                <div className="text-7xl font-bold text-white mb-2">{percentage}</div>
                <p className="text-white/80 text-sm">dari 100 nilai</p>
                <p className="text-white font-semibold mt-2">
                  {lulus ? (percentage >= 80 ? "Luar biasa! 🎉" : "Lulus! 👍") : "Belum Lulus 😔"}
                </p>
              </div>
              <CardContent className="p-5">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{score}</p>
                    <p className="text-xs text-emerald-600">Benar</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-red-500">{soal.length - score}</p>
                    <p className="text-xs text-red-500">Salah</p>
                  </div>
                </div>

                {!lulus && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                    <p className="text-xs text-amber-800">
                      Nilai kamu di bawah 70. Yuk coba kuis remedial dengan soal yang disesuaikan untuk membantu kamu memahami materi ini lebih baik!
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  {!lulus ? (
                    <button onClick={handleStartRemedial} disabled={generatingRemedial}
                      className="w-full flex items-center justify-center gap-2 h-11 bg-amber-600 text-white rounded-xl font-semibold text-sm hover:bg-amber-700 transition-colors disabled:opacity-60">
                      {generatingRemedial ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Menyiapkan soal remedial...</>
                      ) : (
                        <><Sparkles size={15} />Mulai Kuis Remedial</>
                      )}
                    </button>
                  ) : (
                    <Link href={`/student/learn/${id}`}
                      className="w-full flex items-center justify-center gap-2 h-11 bg-blue-800 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors">
                      <BookOpen size={15} /> Lanjut ke Materi
                    </Link>
                  )}
                  <button onClick={() => setShowReview(true)}
                    className="w-full h-11 border border-slate-200 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-50">
                    Lihat Jawaban
                  </button>
                  <button onClick={handleRetry}
                    className="w-full flex items-center justify-center gap-2 h-11 text-slate-500 text-sm">
                    <RotateCcw size={14} /> Ulangi Kuis Ini
                  </button>
                </div>
              </CardContent>
            </Card>

            {showReview && (
              <div className="space-y-3">
                <h2 className="font-semibold text-slate-900 text-sm">Review Jawaban</h2>
                {soal.map((s, idx) => {
                  const ans = answers[idx];
                  const isCorrect = ans?.correct;
                  return (
                    <Card key={s.id} className={cn("border-0 shadow-sm", isCorrect ? "ring-1 ring-emerald-200" : "ring-1 ring-red-200")}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2 mb-2">
                          {isCorrect ? <CheckCircle size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" /> : <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />}
                          <p className="text-sm font-medium text-slate-800">Soal {idx + 1}: {s.pertanyaan}</p>
                        </div>
                        <div className="ml-6 space-y-1">
                          <p className="text-xs text-slate-500">Jawaban kamu: <span className={isCorrect ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>{ans ? s.pilihan[ans.selected] : 'Tidak dijawab'}</span></p>
                          {!isCorrect && <p className="text-xs text-emerald-600">Jawaban benar: <span className="font-medium">{s.pilihan[s.jawaban_benar]}</span></p>}
                          <p className="text-xs text-slate-400 italic">{s.penjelasan}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>
        <StudentBottomNav />
        <AccessibilityBar />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <StudentSidebar />
      <main className="flex-1 sm:ml-60 pb-20 sm:pb-4">
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center gap-3">
          <Link href={`/student/learn/${id}`} className="text-slate-600 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1">
            <p className="text-xs text-blue-600 font-medium">Kuis: {materialJudul}</p>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={((currentIdx + (currentAnswer?.answered ? 1 : 0)) / soal.length) * 100} className="h-1.5 flex-1" />
              <span className="text-xs text-slate-500 flex-shrink-0">{currentIdx + 1}/{soal.length}</span>
            </div>
          </div>
          {/* Timer */}
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0",
            isWarningTime ? "bg-red-100 text-red-700 animate-pulse" : "bg-blue-50 text-blue-700"
          )}>
            <Clock size={13} />
            {formatTime(timeLeft)}
          </div>
        </div>
        <div className="p-4 space-y-5 max-w-lg mx-auto">
          <div className="flex gap-1.5">
            {soal.map((_, idx) => (
              <div key={idx} className={cn("flex-1 h-1.5 rounded-full transition-all",
                idx < currentIdx ? answers[idx]?.correct ? "bg-emerald-400" : "bg-red-400"
                : idx === currentIdx ? "bg-blue-600" : "bg-slate-200")} />
            ))}
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">Soal {currentIdx + 1} dari {soal.length}</p>
              <p className="text-base font-semibold text-slate-900 leading-relaxed">{currentSoal.pertanyaan}</p>
            </CardContent>
          </Card>
          <div className="space-y-2.5">
            {currentSoal.pilihan.map((pilihan, optIdx) => {
              const isSelected = currentAnswer?.selected === optIdx ||
                (isVoiceMode && !currentAnswer?.answered && selectedIdx === optIdx);
              const isCorrect = optIdx === currentSoal.jawaban_benar;
              const showFeedback = currentAnswer?.answered;
              return (
                <button key={optIdx} onClick={() => handleSelect(optIdx)} disabled={showFeedback}
                  className={cn("w-full text-left p-4 rounded-xl border-2 transition-all text-sm font-medium",
                    !showFeedback && "hover:border-blue-300 hover:bg-blue-50",
                    !showFeedback && !isSelected && "border-slate-200 bg-white text-slate-700",
                    !showFeedback && isSelected && "border-blue-500 bg-blue-50 text-blue-800",
                    showFeedback && isCorrect && "border-emerald-500 bg-emerald-50 text-emerald-800",
                    showFeedback && isSelected && !isCorrect && "border-red-500 bg-red-50 text-red-800",
                    showFeedback && !isSelected && !isCorrect && "border-slate-100 bg-slate-50 text-slate-400",
                  )}>
                  <div className="flex items-center gap-3">
                    <span className={cn("w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border-2",
                      showFeedback && isCorrect ? "border-emerald-500 bg-emerald-500 text-white"
                      : showFeedback && isSelected && !isCorrect ? "border-red-500 bg-red-500 text-white"
                      : isSelected ? "border-blue-500 bg-blue-500 text-white" : "border-slate-300 text-slate-500")}>
                      {showFeedback && isCorrect ? '✓' : showFeedback && isSelected && !isCorrect ? '✗' : String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="flex-1">{pilihan}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {currentAnswer?.answered && (
            <div className={cn("rounded-xl p-4", currentAnswer.correct ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200")}>
              <div className="flex items-start gap-2">
                {currentAnswer.correct ? <CheckCircle size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" /> : <XCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />}
                <div>
                  <p className={`text-sm font-semibold mb-1 ${currentAnswer.correct ? 'text-emerald-800' : 'text-red-800'}`}>
                    {currentAnswer.correct ? 'Benar! Bagus sekali!' : 'Kurang tepat'}
                  </p>
                  <p className="text-xs text-slate-600">{currentSoal.penjelasan}</p>
                </div>
              </div>
            </div>
          )}
          {currentAnswer?.answered && (
            <button onClick={handleNext}
              className="w-full h-12 bg-blue-800 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors">
              {currentIdx < soal.length - 1 ? 'Soal Berikutnya →' : 'Lihat Hasil Kuis'}
            </button>
          )}
          {isVoiceMode && selectedIdx !== null && !currentAnswer?.answered && (
            <button onClick={triggerLanjut}
              className="w-full h-12 bg-blue-800 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
              aria-label="Kunci jawaban dan lanjut ke soal berikutnya">
              {currentIdx < soal.length - 1 ? 'Kunci Jawaban & Lanjut →' : 'Kunci Jawaban & Lihat Hasil'}
            </button>
          )}
        </div>
      </main>
      <StudentBottomNav />
      <AccessibilityBar />
    </div>
  );
}