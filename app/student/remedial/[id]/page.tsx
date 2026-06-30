'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, Trophy, Clock, AlertTriangle, Sparkles } from 'lucide-react';
import StudentBottomNav from '@/components/shared/StudentBottomNav';
import StudentSidebar from '@/components/shared/StudentSidebar';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';

type AnswerState = { answered: boolean; selected: number; correct: boolean };
const DURASI_KUIS = 5 * 60;

const TINGKAT_INFO: Record<string, { label: string; color: string; emoji: string }> = {
  sangat_mudah: { label: 'Sangat Mudah', color: 'bg-emerald-100 text-emerald-700', emoji: '🌱' },
  mudah: { label: 'Mudah', color: 'bg-blue-100 text-blue-700', emoji: '📘' },
  sedang: { label: 'Sedang', color: 'bg-amber-100 text-amber-700', emoji: '📗' },
};

export default function RemedialQuizPage({ params }: { params: { id: string } }) {
  const { id: attemptId } = params;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [materialId, setMaterialId] = useState('');
  const [tingkat, setTingkat] = useState('mudah');
  const [skorAwal, setSkorAwal] = useState(0);
  const [soal, setSoal] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({});
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DURASI_KUIS);
  const [timeUp, setTimeUp] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data } = await supabase
        .from('remedial_attempts')
        .select('*')
        .eq('id', attemptId)
        .single();

      if (!data) { setLoading(false); return; }
      setMaterialId(data.material_id);
      setTingkat(data.tingkat_remedial);
      setSkorAwal(data.skor_awal);
      setSoal(data.soal_remedial || []);
      setLoading(false);
    }
    load();
  }, [attemptId]);

  useEffect(() => {
    if (loading || soal.length === 0 || showResult) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setTimeUp(true);
          finishQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, soal.length, showResult]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const handleSelect = (optionIdx: number) => {
    if (answers[currentIdx]?.answered || timeUp) return;
    const correct = optionIdx === soal[currentIdx].jawabanBenar;
    setAnswers(prev => ({ ...prev, [currentIdx]: { answered: true, selected: optionIdx, correct } }));
  };

  const finishQuiz = useCallback(async () => {
    const finalAnswers = answersRef.current;
    const score = Object.values(finalAnswers).filter(a => a.correct).length;
    const pct = Math.round((score / soal.length) * 100);

    const supabase = createClient();
    await supabase.from('remedial_attempts')
      .update({ skor_remedial: pct, selesai: true })
      .eq('id', attemptId);

    if (pct >= 70) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('student_material_progress').upsert({
          student_id: user.id,
          material_id: materialId,
          progress: 100,
          skor_terakhir: pct,
        }, { onConflict: 'student_id,material_id' });
      }
    }
    setShowResult(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soal.length, attemptId, materialId]);

  const handleNext = async () => {
    if (currentIdx < soal.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      await finishQuiz();
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">
      <div className="w-8 h-8 border-2 border-amber-300 border-t-amber-700 rounded-full animate-spin" />
    </div>;
  }

  if (soal.length === 0) {
    return <div className="flex min-h-screen items-center justify-center">
      <p className="text-slate-500">Soal remedial tidak ditemukan</p>
    </div>;
  }

  const currentSoal = soal[currentIdx];
  const currentAnswer = answers[currentIdx];
  const score = Object.values(answers).filter(a => a.correct).length;
  const percentage = Math.round((score / soal.length) * 100);
  const lulus = percentage >= 70;
  const tingkatInfo = TINGKAT_INFO[tingkat];
  const isWarningTime = timeLeft <= 60 && timeLeft > 0;

  if (showResult) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <StudentSidebar />
        <main className="flex-1 sm:ml-60 pb-20 sm:pb-4 flex items-center justify-center p-4">
          <div className="w-full max-w-sm space-y-5">
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className={cn("p-8 text-center", lulus ? "bg-gradient-to-br from-emerald-500 to-emerald-600" : "bg-gradient-to-br from-amber-500 to-amber-600")}>
                <Trophy size={36} className="text-white mx-auto mb-3" />
                <div className="text-7xl font-bold text-white mb-2">{percentage}</div>
                <p className="text-white/80 text-sm">Kuis Remedial</p>
                <p className="text-white font-semibold mt-2">{lulus ? "Selamat, Lulus! 🎉" : "Masih perlu belajar lagi"}</p>
              </div>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4 text-xs text-slate-500">
                  <span>Nilai awal: {skorAwal}</span>
                  <span>→</span>
                  <span className="font-semibold text-slate-700">Nilai remedial: {percentage}</span>
                </div>
                <div className="space-y-2">
                  <Link href={`/student/learn/${materialId}`}
                    className="w-full flex items-center justify-center gap-2 h-11 bg-blue-800 text-white rounded-xl font-semibold text-sm hover:bg-blue-700">
                    Kembali ke Materi
                  </Link>
                  {!lulus && (
                    <Link href={`/student/quiz/${materialId}`}
                      className="w-full flex items-center justify-center gap-2 h-11 border border-slate-200 text-slate-700 rounded-xl text-sm hover:bg-slate-50">
                      Coba Kuis Utama Lagi
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
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
          <Link href={`/student/learn/${materialId}`} className="text-slate-600 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <Sparkles size={11} className="text-amber-600" />
              <p className="text-xs text-amber-700 font-medium">Kuis Remedial</p>
              <Badge className={cn("text-[9px] px-1.5", tingkatInfo.color)}>{tingkatInfo.emoji} {tingkatInfo.label}</Badge>
            </div>
            <Progress value={((currentIdx + (currentAnswer?.answered ? 1 : 0)) / soal.length) * 100} className="h-1.5 mt-1" />
          </div>
          <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0",
            isWarningTime ? "bg-red-100 text-red-700 animate-pulse" : "bg-blue-50 text-blue-700")}>
            <Clock size={13} />{formatTime(timeLeft)}
          </div>
        </div>

        <div className="p-4 space-y-5 max-w-lg mx-auto">
          <Card className="border-0 shadow-sm bg-amber-50 border-amber-200">
            <CardContent className="p-3 flex items-center gap-2">
              <Sparkles size={14} className="text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-700">Soal disesuaikan dengan AI berdasarkan hasil kuis sebelumnya untuk membantu kamu lebih memahami materi.</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-3">Soal {currentIdx + 1} dari {soal.length}</p>
              <p className="text-base font-semibold text-slate-900 leading-relaxed">{currentSoal.pertanyaan}</p>
            </CardContent>
          </Card>

          <div className="space-y-2.5">
            {currentSoal.opsi.map((pilihan: string, optIdx: number) => {
              const isSelected = currentAnswer?.selected === optIdx;
              const isCorrect = optIdx === currentSoal.jawabanBenar;
              const showFeedback = currentAnswer?.answered;
              return (
                <button key={optIdx} onClick={() => handleSelect(optIdx)} disabled={showFeedback}
                  className={cn("w-full text-left p-4 rounded-xl border-2 transition-all text-sm font-medium",
                    !showFeedback && "hover:border-amber-300 hover:bg-amber-50",
                    !showFeedback && !isSelected && "border-slate-200 bg-white text-slate-700",
                    !showFeedback && isSelected && "border-amber-500 bg-amber-50 text-amber-800",
                    showFeedback && isCorrect && "border-emerald-500 bg-emerald-50 text-emerald-800",
                    showFeedback && isSelected && !isCorrect && "border-red-500 bg-red-50 text-red-800",
                    showFeedback && !isSelected && !isCorrect && "border-slate-100 bg-slate-50 text-slate-400")}>
                  <div className="flex items-center gap-3">
                    <span className={cn("w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border-2",
                      showFeedback && isCorrect ? "border-emerald-500 bg-emerald-500 text-white"
                      : showFeedback && isSelected && !isCorrect ? "border-red-500 bg-red-500 text-white"
                      : isSelected ? "border-amber-500 bg-amber-500 text-white" : "border-slate-300 text-slate-500")}>
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
                    {currentAnswer.correct ? 'Benar!' : 'Kurang tepat'}
                  </p>
                  <p className="text-xs text-slate-600">{currentSoal.penjelasan}</p>
                </div>
              </div>
            </div>
          )}

          {currentAnswer?.answered && (
            <button onClick={handleNext} className="w-full h-12 bg-amber-600 text-white rounded-xl font-semibold text-sm hover:bg-amber-700">
              {currentIdx < soal.length - 1 ? 'Soal Berikutnya →' : 'Lihat Hasil'}
            </button>
          )}
        </div>
      </main>
      <StudentBottomNav />
      <AccessibilityBar />
    </div>
  );
}