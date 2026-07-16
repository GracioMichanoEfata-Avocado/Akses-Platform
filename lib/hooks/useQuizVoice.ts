'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTalkbackContext } from '@/components/accessibility/TalkbackProvider';
import type { PageVoiceCommand } from '@/components/accessibility/TalkbackProvider';
import { speak, isTTSSpeaking } from './useTalkback';
import {
  QuizSoal,
  HURUF_PILIHAN,
  buildQuestionSpeech,
  buildTimeReminder,
  buildScoreSpeech,
  buildReviewSpeech,
} from '@/lib/voice/quiz-speech';

// Variasi transkripsi STT untuk tiap huruf pilihan (id-ID)
const HURUF_UCAPAN: Record<string, string[]> = {
  A: ['a', 'ah'],
  B: ['b', 'be', 'beh'],
  C: ['c', 'ce', 'se'],
  D: ['d', 'de', 'deh'],
  E: ['e', 'eh'],
};

export interface UseQuizVoiceOptions {
  enabled: boolean;
  soal: QuizSoal[];
  currentIdx: number;
  selectedIdx: number | null;
  showResult: boolean;
  timeLeft: number;
  totalDurasi: number;
  percentage: number;
  materialJudul: string;
  answers: Record<number, { selected: number; correct: boolean }>;
  onSelect: (idx: number) => void;
  onLanjut: (selectedIdx: number) => void;
  onReview: () => void;
  onRetry: () => void;
}

export function useQuizVoice(opts: UseQuizVoiceOptions): { triggerLanjut: () => void } {
  const {
    enabled, soal, currentIdx, selectedIdx, showResult,
    timeLeft, totalDurasi, percentage, materialJudul, answers,
    onSelect, onLanjut, onReview, onRetry,
  } = opts;
  const { registerPageCommands, clearPageCommands } = useTalkbackContext();

  const selectedIdxRef = useRef(selectedIdx);
  selectedIdxRef.current = selectedIdx;
  const advancingRef = useRef(false); // cegah "lanjut" dobel saat feedback masih dibacakan
  const timersRef = useRef<{ timeout?: ReturnType<typeof setTimeout>; interval?: ReturnType<typeof setInterval> }>({});
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  // Tunggu TTS selesai lalu jalankan cb. Sengaja polling isTTSSpeaking(),
  // BUKAN onTTSEnd() — slot callback onTTSEnd tunggal dan dipakai ulang oleh
  // logika restart recognition di useVoiceNavigation (bisa saling timpa).
  const waitTTSEnd = useCallback((cb: () => void) => {
    timersRef.current.timeout = setTimeout(() => {
      timersRef.current.interval = setInterval(() => {
        if (!enabledRef.current) {
          clearInterval(timersRef.current.interval);
          timersRef.current.interval = undefined;
          advancingRef.current = false;
          return; // hook went inert mid-advance: abort, do not call cb
        }
        if (!isTTSSpeaking()) {
          clearInterval(timersRef.current.interval);
          timersRef.current.interval = undefined;
          cb();
        }
      }, 300);
    }, 1200); // beri waktu utterance mulai dulu (onstart async)
  }, []);

  useEffect(() => {
    return () => {
      advancingRef.current = false;
      if (timersRef.current.timeout) clearTimeout(timersRef.current.timeout);
      if (timersRef.current.interval) clearInterval(timersRef.current.interval);
    };
  }, []);

  const speakCurrentQuestion = useCallback((withIntro: boolean) => {
    const s = soal[currentIdx];
    if (!s) return;
    speak(buildQuestionSpeech(s, currentIdx, soal.length, withIntro), 'interrupt');
  }, [soal, currentIdx]);

  const triggerLanjut = useCallback(() => {
    if (advancingRef.current) return;
    const sel = selectedIdxRef.current;
    if (sel === null) {
      speak('Anda belum memilih jawaban. Katakan A, B, C, atau D terlebih dahulu.', 'interrupt');
      return;
    }
    const s = soal[currentIdx];
    if (!s) return;
    advancingRef.current = true;
    // Sengaja TIDAK membacakan benar/salah di sini (buildFeedbackSpeech) —
    // koreksi per-soal baru dibacakan nanti lewat "Lihat Pembahasan" setelah
    // kuis selesai, bukan langsung tiap pindah soal.
    const isLast = currentIdx >= soal.length - 1;
    speak(isLast ? 'Baik, menghitung nilai.' : 'Baik, lanjut.', 'interrupt');
    waitTTSEnd(() => {
      advancingRef.current = false;
      onLanjut(sel);
    });
  }, [soal, currentIdx, onLanjut, waitTTSEnd]);

  const spokenIdxRef = useRef<number | null>(null);
  const scoreSpokenRef = useRef(false);

  // ── Reset saat "Ulangi Kuis" (showResult true → false) ──
  const prevShowResultRef = useRef(false);
  useEffect(() => {
    if (prevShowResultRef.current && !showResult) {
      spokenIdxRef.current = null;   // baca ulang soal 1 (dengan intro)
      scoreSpokenRef.current = false;
    }
    prevShowResultRef.current = showResult;
  }, [showResult]);

  // ── Baca soal saat masuk kuis / pindah soal ──
  useEffect(() => {
    if (!enabled || showResult || soal.length === 0) return;
    if (spokenIdxRef.current === currentIdx) return;
    const withIntro = spokenIdxRef.current === null;
    const t = setTimeout(() => {
      spokenIdxRef.current = currentIdx;
      speakCurrentQuestion(withIntro);
    }, 800);
    return () => clearTimeout(t);
  }, [enabled, showResult, soal.length, currentIdx, speakCurrentQuestion]);

  // ── Daftarkan perintah suara: A–D, lanjut, ulangi ──
  useEffect(() => {
    if (!enabled || showResult || soal.length === 0) return;
    const s = soal[currentIdx];
    if (!s) return;

    const commands: PageVoiceCommand[] = s.pilihan.map((_, idx) => {
      const huruf = HURUF_PILIHAN[idx];
      return {
        keywords: [
          ...HURUF_UCAPAN[huruf],
          `pilihan ${huruf.toLowerCase()}`,
          `jawaban ${huruf.toLowerCase()}`,
        ],
        label: `Pilihan ${huruf}`,
        matchType: 'word',
        action: () => {
          onSelect(idx);
          speak(`Pilihan ${huruf} dipilih.`, 'interrupt');
        },
      };
    });

    commands.push({
      keywords: ['lanjut', 'berikutnya', 'selanjutnya', 'next'],
      label: 'Lanjut',
      matchType: 'word',
      action: triggerLanjut,
    });

    commands.push({
      keywords: ['ulangi', 'ulang', 'baca lagi'],
      label: 'Ulangi soal',
      matchType: 'word',
      action: () => speakCurrentQuestion(false),
    });

    registerPageCommands(commands);
    return () => clearPageCommands();
  }, [enabled, showResult, soal, currentIdx, onSelect, triggerLanjut, speakCurrentQuestion, registerPageCommands, clearPageCommands]);

  // ── Pengingat waktu tiap menit (skip menit awal = totalDurasi) ──
  useEffect(() => {
    if (!enabled || showResult) return;
    const msg = buildTimeReminder(timeLeft);
    if (msg && timeLeft < totalDurasi) speak(msg, 'normal');
  }, [enabled, showResult, timeLeft, totalDurasi]);

  // ── Bacakan nilai saat hasil keluar ──
  useEffect(() => {
    if (!enabled || !showResult || scoreSpokenRef.current) return;
    const t = setTimeout(() => {
      scoreSpokenRef.current = true;
      speak(buildScoreSpeech(percentage, materialJudul), 'interrupt');
    }, 800);
    return () => clearTimeout(t);
  }, [enabled, showResult, percentage, materialJudul]);

  // ── Perintah suara di layar hasil: "Lihat Pembahasan" (baca HANYA soal
  // yang salah + penjelasannya) dan "Ulangi Kuis". ──
  useEffect(() => {
    if (!enabled || !showResult) return;

    const commands: PageVoiceCommand[] = [
      {
        keywords: ['lihat pembahasan', 'pembahasan', 'lihat jawaban', 'jawaban'],
        label: 'Lihat Pembahasan',
        action: () => {
          onReview();
          speak(buildReviewSpeech(soal, answers), 'interrupt');
        },
      },
      {
        keywords: ['ulangi kuis', 'ulangi', 'ulang'],
        label: 'Ulangi Kuis',
        action: onRetry,
      },
    ];

    registerPageCommands(commands);
    return () => clearPageCommands();
  }, [enabled, showResult, soal, answers, onReview, onRetry, registerPageCommands, clearPageCommands]);

  return { triggerLanjut };
}
