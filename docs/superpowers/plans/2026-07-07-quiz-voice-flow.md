# Quiz Voice Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Siswa tunanetra dapat mengerjakan kuis sepenuhnya via suara: soal dibacakan, jawab/ganti jawaban via ucapan A–D, "lanjut" mengunci + membacakan feedback + pindah soal, pengingat timer tiap menit, dan nilai akhir dibacakan.

**Architecture:** Fungsi murni pembentuk kalimat di `lib/voice/quiz-speech.ts` (unit-tested), pencocokan keyword per-kata di `lib/voice/keyword-match.ts`, orkestrasi di hook baru `lib/hooks/useQuizVoice.ts` yang menumpang sistem `TalkbackProvider`/`useVoiceNavigation` yang sudah ada. Halaman kuis hanya menambah state `selectedIdx` (pilihan belum terkunci, khusus mode voice) — perilaku pengguna non-tunanetra tidak berubah.

**Tech Stack:** Next.js 14 (app router), React 18, Zustand, Web Speech API (SpeechSynthesis + webkitSpeechRecognition), vitest (baru, devDependency).

## Global Constraints

- Ambang lulus: `percentage >= 70` (ikut kode yang ada, jangan diubah).
- Semua teks TTS berbahasa Indonesia.
- Perilaku kuis untuk mode non-tunanetra (`none`/`tunarungu`) TIDAK boleh berubah: klik pilihan tetap langsung mengunci jawaban.
- Mode voice aktif hanya bila `mode === 'tunanetra' || mode === 'both'` (dari `useAccessibilityStore`).
- Jangan pakai `onTTSEnd()` dari `useTalkback` untuk menunggu feedback selesai — slot callback-nya tunggal dan dipakai ulang oleh logika restart recognition di `useVoiceNavigation`. Pakai polling `isTTSSpeaking()`.
- Timer kuis: `DURASI_KUIS = 5 * 60` detik (sudah ada di halaman kuis).

---

### Task 1: Setup vitest + fungsi murni `quiz-speech.ts`

**Files:**
- Modify: `package.json` (tambah devDependency `vitest` + script `test`)
- Create: `lib/voice/quiz-speech.ts`
- Test: `lib/voice/quiz-speech.test.ts`

**Interfaces:**
- Consumes: — (tidak ada dependensi task lain)
- Produces:
  - `interface QuizSoal { pertanyaan: string; pilihan: string[]; jawaban_benar: number; penjelasan: string }`
  - `const HURUF_PILIHAN: string[]` (`['A','B','C','D','E']`)
  - `buildQuestionSpeech(soal: QuizSoal, index: number, total: number, withIntro: boolean): string`
  - `buildFeedbackSpeech(soal: QuizSoal, selectedIdx: number): string`
  - `buildTimeReminder(secondsLeft: number): string | null`
  - `buildScoreSpeech(percentage: number, materialJudul: string): string`

- [ ] **Step 1: Install vitest & tambah script test**

```bash
npm install -D vitest
```

Lalu di `package.json`, tambah di `"scripts"`:

```json
"test": "vitest run"
```

- [ ] **Step 2: Tulis failing test**

Buat `lib/voice/quiz-speech.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  buildQuestionSpeech,
  buildFeedbackSpeech,
  buildTimeReminder,
  buildScoreSpeech,
  QuizSoal,
} from './quiz-speech';

const soal: QuizSoal = {
  pertanyaan: 'Berapa hasil 2 tambah 3?',
  pilihan: ['4', '5', '6', '7'],
  jawaban_benar: 1,
  penjelasan: 'Dua ditambah tiga sama dengan lima.',
};

describe('buildQuestionSpeech', () => {
  it('menyertakan intro hanya saat withIntro=true', () => {
    const withIntro = buildQuestionSpeech(soal, 0, 5, true);
    expect(withIntro).toContain('Kuis dimulai, ada 5 soal');
    expect(withIntro).toContain('Katakan lanjut untuk pindah soal');

    const tanpaIntro = buildQuestionSpeech(soal, 1, 5, false);
    expect(tanpaIntro).not.toContain('Kuis dimulai');
  });

  it('membacakan nomor soal, pertanyaan, dan semua pilihan berhuruf', () => {
    const text = buildQuestionSpeech(soal, 2, 5, false);
    expect(text).toContain('Soal nomor 3');
    expect(text).toContain('Berapa hasil 2 tambah 3?');
    expect(text).toContain('A: 4');
    expect(text).toContain('B: 5');
    expect(text).toContain('C: 6');
    expect(text).toContain('D: 7');
  });
});

describe('buildFeedbackSpeech', () => {
  it('jawaban benar: konfirmasi + penjelasan', () => {
    const text = buildFeedbackSpeech(soal, 1);
    expect(text).toContain('Benar');
    expect(text).toContain('Dua ditambah tiga sama dengan lima.');
    expect(text).not.toContain('Kurang tepat');
  });

  it('jawaban salah: sebut jawaban benar (huruf + isi) + penjelasan', () => {
    const text = buildFeedbackSpeech(soal, 0);
    expect(text).toContain('Kurang tepat');
    expect(text).toContain('B: 5');
    expect(text).toContain('Dua ditambah tiga sama dengan lima.');
  });
});

describe('buildTimeReminder', () => {
  it('mengembalikan teks hanya di kelipatan 60 detik yang > 0', () => {
    expect(buildTimeReminder(240)).toBe('Waktu tersisa 4 menit.');
    expect(buildTimeReminder(60)).toBe('Waktu tersisa 1 menit.');
    expect(buildTimeReminder(239)).toBeNull();
    expect(buildTimeReminder(61)).toBeNull();
    expect(buildTimeReminder(0)).toBeNull();
    expect(buildTimeReminder(-5)).toBeNull();
  });
});

describe('buildScoreSpeech', () => {
  it('lulus di ambang 70 ke atas', () => {
    const text = buildScoreSpeech(70, 'Matematika Dasar');
    expect(text).toContain('Selamat');
    expect(text).toContain('70');
    expect(text).toContain('Matematika Dasar');
  });

  it('gagal di bawah 70', () => {
    const text = buildScoreSpeech(69, 'Matematika Dasar');
    expect(text).toContain('Maaf');
    expect(text).toContain('69');
    expect(text).toContain('belum mencukupi');
    expect(text).toContain('remedial');
  });
});
```

- [ ] **Step 3: Jalankan test, pastikan gagal**

Run: `npx vitest run lib/voice/quiz-speech.test.ts`
Expected: FAIL — "Failed to load ... quiz-speech" (file belum ada).

- [ ] **Step 4: Implementasi minimal**

Buat `lib/voice/quiz-speech.ts`:

```ts
// Fungsi murni pembentuk kalimat TTS untuk kuis (mode tunanetra).
// Tidak menyentuh DOM/window supaya bisa di-unit-test.

export interface QuizSoal {
  pertanyaan: string;
  pilihan: string[];
  jawaban_benar: number;
  penjelasan: string;
}

export const HURUF_PILIHAN = ['A', 'B', 'C', 'D', 'E'];

export function buildQuestionSpeech(
  soal: QuizSoal,
  index: number,
  total: number,
  withIntro: boolean
): string {
  const intro = withIntro
    ? `Kuis dimulai, ada ${total} soal. Katakan A, B, C, atau D untuk menjawab. Anda bisa mengganti jawaban sebelum dikunci. Katakan lanjut untuk pindah soal, atau ulangi untuk mendengar soal lagi. `
    : '';
  const pilihanText = soal.pilihan
    .map((p, i) => `${HURUF_PILIHAN[i]}: ${p}.`)
    .join(' ');
  return `${intro}Soal nomor ${index + 1}. ${soal.pertanyaan}. Pilihan: ${pilihanText}`;
}

export function buildFeedbackSpeech(soal: QuizSoal, selectedIdx: number): string {
  if (selectedIdx === soal.jawaban_benar) {
    return `Benar! Jawaban Anda tepat. ${soal.penjelasan}`;
  }
  const huruf = HURUF_PILIHAN[soal.jawaban_benar];
  return `Kurang tepat. Jawaban yang benar adalah ${huruf}: ${soal.pilihan[soal.jawaban_benar]}. ${soal.penjelasan}`;
}

export function buildTimeReminder(secondsLeft: number): string | null {
  if (secondsLeft <= 0) return null;
  if (secondsLeft % 60 !== 0) return null;
  return `Waktu tersisa ${secondsLeft / 60} menit.`;
}

export function buildScoreSpeech(percentage: number, materialJudul: string): string {
  if (percentage >= 70) {
    return `Selamat, nilai Anda ${percentage}. Anda telah menyelesaikan kelas ${materialJudul}.`;
  }
  return `Maaf, nilai Anda ${percentage}. Nilai kuis belum mencukupi. Anda bisa mencoba kuis remedial.`;
}
```

- [ ] **Step 5: Jalankan test, pastikan lulus**

Run: `npx vitest run lib/voice/quiz-speech.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lib/voice/quiz-speech.ts lib/voice/quiz-speech.test.ts
git commit -m "feat: fungsi murni teks TTS kuis + setup vitest"
```

---

### Task 2: Word-level keyword matching + guard login di infra voice

**Files:**
- Create: `lib/voice/keyword-match.ts`
- Test: `lib/voice/keyword-match.test.ts`
- Modify: `components/accessibility/TalkbackProvider.tsx` (interface `PageVoiceCommand` + guard login)
- Modify: `lib/hooks/useVoiceNavigation.ts` (pakai `matchesKeyword` untuk page commands)

**Interfaces:**
- Consumes: —
- Produces:
  - `type MatchType = 'includes' | 'word'`
  - `matchesKeyword(transcript: string, keyword: string, matchType?: MatchType): boolean`
  - `PageVoiceCommand` mendapat field opsional `matchType?: MatchType` (Task 4 memakainya)

- [ ] **Step 1: Tulis failing test**

Buat `lib/voice/keyword-match.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { matchesKeyword } from './keyword-match';

describe('matchesKeyword mode includes (default)', () => {
  it('substring match seperti perilaku lama', () => {
    expect(matchesKeyword('buka beranda dong', 'beranda')).toBe(true);
    expect(matchesKeyword('jawabannya', 'a', 'includes')).toBe(true); // memang longgar
  });
});

describe('matchesKeyword mode word', () => {
  it('huruf tunggal hanya cocok sebagai kata utuh', () => {
    expect(matchesKeyword('saya pilih a', 'a', 'word')).toBe(true);
    expect(matchesKeyword('a', 'a', 'word')).toBe(true);
    expect(matchesKeyword('apa kabar', 'a', 'word')).toBe(false);
    expect(matchesKeyword('jawabannya', 'a', 'word')).toBe(false);
  });

  it('frasa multi-kata cocok dengan batas kata', () => {
    expect(matchesKeyword('pilihan a dong', 'pilihan a', 'word')).toBe(true);
    expect(matchesKeyword('pilihan apa', 'pilihan a', 'word')).toBe(false);
  });

  it('tidak case-sensitive dan tahan tanda baca', () => {
    expect(matchesKeyword('Lanjut.', 'lanjut', 'word')).toBe(true);
    expect(matchesKeyword('B', 'b', 'word')).toBe(true);
  });

  it('keyword kosong tidak pernah cocok', () => {
    expect(matchesKeyword('apapun', '', 'word')).toBe(false);
    expect(matchesKeyword('apapun', '   ', 'includes')).toBe(false);
  });
});
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `npx vitest run lib/voice/keyword-match.test.ts`
Expected: FAIL — module `./keyword-match` belum ada.

- [ ] **Step 3: Implementasi**

Buat `lib/voice/keyword-match.ts`:

```ts
// Pencocokan keyword transkrip suara.
// 'includes' = substring (perilaku lama); 'word' = kata/frasa utuh berbatas non-huruf,
// supaya keyword pendek seperti "a" tidak cocok dengan sembarang kata.

export type MatchType = 'includes' | 'word';

export function matchesKeyword(
  transcript: string,
  keyword: string,
  matchType: MatchType = 'includes'
): boolean {
  const lower = transcript.toLowerCase();
  const kw = keyword.toLowerCase().trim();
  if (!kw) return false;
  if (matchType === 'includes') return lower.includes(kw);
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, 'u').test(lower);
}
```

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `npx vitest run lib/voice/keyword-match.test.ts`
Expected: PASS.

- [ ] **Step 5: Tambah `matchType` ke `PageVoiceCommand`**

Di `components/accessibility/TalkbackProvider.tsx`, ubah interface (sekitar baris 20):

```ts
import type { MatchType } from '@/lib/voice/keyword-match';

export interface PageVoiceCommand {
  keywords: string[];
  label: string;               // Label yang dibacakan TTS saat bantuan
  action: () => void;          // Fungsi yang dijalankan
  matchType?: MatchType;       // default 'includes' (perilaku lama)
}
```

- [ ] **Step 6: Pakai `matchesKeyword` di `useVoiceNavigation`**

Di `lib/hooks/useVoiceNavigation.ts`, tambah import:

```ts
import { matchesKeyword } from '@/lib/voice/keyword-match';
```

Lalu ganti loop page commands (blok `── 1. Perintah halaman aktif ──`, sekitar baris 71–82) dari:

```ts
    for (const cmd of pageCmds) {
      if (cmd.keywords.some(k => lower.includes(k.toLowerCase()))) {
```

menjadi:

```ts
    for (const cmd of pageCmds) {
      if (cmd.keywords.some(k => matchesKeyword(lower, k, cmd.matchType ?? 'includes'))) {
```

- [ ] **Step 7: Guard login di TalkbackProvider**

Di `components/accessibility/TalkbackProvider.tsx`:

Setelah `const pathname = usePathname();` tambahkan:

```ts
  // Voice nav tidak boleh aktif di halaman login/setup — memicu izin mic prematur
  // dan TTS welcome yang menyebut nama menu tertangkap mic → navigasi liar.
  const isLoginPage = pathname.startsWith('/student/login');
```

Ubah pemanggilan hook (sekitar baris 112) dari:

```ts
  useVoiceNavigation(isVoiceNavAktif && isAktif, pageCommandsRef);
```

menjadi:

```ts
  useVoiceNavigation(isVoiceNavAktif && isAktif && !isLoginPage, pageCommandsRef);
```

Dan ubah render guard (sekitar baris 114) dari:

```ts
  if (!isAktif) return <>{children}</>;
```

menjadi:

```ts
  if (!isAktif || isLoginPage) return <>{children}</>;
```

- [ ] **Step 8: Verifikasi typecheck + semua test**

Run: `npx tsc --noEmit && npx vitest run`
Expected: exit 0, semua test PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/voice/keyword-match.ts lib/voice/keyword-match.test.ts components/accessibility/TalkbackProvider.tsx lib/hooks/useVoiceNavigation.ts
git commit -m "feat: word-level keyword matching + guard voice nav di halaman login"
```

---

### Task 3: Hook `useQuizVoice`

**Files:**
- Create: `lib/hooks/useQuizVoice.ts`

**Interfaces:**
- Consumes:
  - Task 1: `QuizSoal`, `HURUF_PILIHAN`, `buildQuestionSpeech`, `buildFeedbackSpeech`, `buildTimeReminder`, `buildScoreSpeech` dari `@/lib/voice/quiz-speech`
  - Task 2: field `matchType` pada `PageVoiceCommand`
  - Yang sudah ada: `speak`, `isTTSSpeaking` dari `@/lib/hooks/useTalkback`; `useTalkbackContext` dari `@/components/accessibility/TalkbackProvider`
- Produces:
  - `useQuizVoice(opts: UseQuizVoiceOptions): { triggerLanjut: () => void }`
  - `UseQuizVoiceOptions`: `{ enabled: boolean; soal: QuizSoal[]; currentIdx: number; selectedIdx: number | null; showResult: boolean; timeLeft: number; totalDurasi: number; percentage: number; materialJudul: string; onSelect: (idx: number) => void; onLanjut: (selectedIdx: number) => void }`

Catatan perilaku `onLanjut(selectedIdx)`: dipanggil hook SETELAH TTS feedback selesai; halaman bertugas mengunci jawaban + pindah soal (Task 4).

- [ ] **Step 1: Tulis hook**

Buat `lib/hooks/useQuizVoice.ts`:

```ts
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTalkbackContext } from '@/components/accessibility/TalkbackProvider';
import type { PageVoiceCommand } from '@/components/accessibility/TalkbackProvider';
import { speak, isTTSSpeaking } from './useTalkback';
import {
  QuizSoal,
  HURUF_PILIHAN,
  buildQuestionSpeech,
  buildFeedbackSpeech,
  buildTimeReminder,
  buildScoreSpeech,
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
  onSelect: (idx: number) => void;
  onLanjut: (selectedIdx: number) => void;
}

export function useQuizVoice(opts: UseQuizVoiceOptions): { triggerLanjut: () => void } {
  const {
    enabled, soal, currentIdx, selectedIdx, showResult,
    timeLeft, totalDurasi, percentage, materialJudul, onSelect, onLanjut,
  } = opts;
  const { registerPageCommands, clearPageCommands } = useTalkbackContext();

  const selectedIdxRef = useRef(selectedIdx);
  selectedIdxRef.current = selectedIdx;
  const advancingRef = useRef(false); // cegah "lanjut" dobel saat feedback masih dibacakan

  // Tunggu TTS selesai lalu jalankan cb. Sengaja polling isTTSSpeaking(),
  // BUKAN onTTSEnd() — slot callback onTTSEnd tunggal dan dipakai ulang oleh
  // logika restart recognition di useVoiceNavigation (bisa saling timpa).
  const waitTTSEnd = useCallback((cb: () => void) => {
    setTimeout(() => {
      const iv = setInterval(() => {
        if (!isTTSSpeaking()) {
          clearInterval(iv);
          cb();
        }
      }, 300);
    }, 1200); // beri waktu utterance mulai dulu (onstart async)
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
    speak(buildFeedbackSpeech(s, sel), 'interrupt');
    waitTTSEnd(() => {
      advancingRef.current = false;
      onLanjut(sel);
    });
  }, [soal, currentIdx, onLanjut, waitTTSEnd]);

  // ── Baca soal saat masuk kuis / pindah soal ──
  const spokenIdxRef = useRef<number | null>(null);
  useEffect(() => {
    if (!enabled || showResult || soal.length === 0) return;
    if (spokenIdxRef.current === currentIdx) return;
    const withIntro = spokenIdxRef.current === null;
    spokenIdxRef.current = currentIdx;
    const t = setTimeout(() => speakCurrentQuestion(withIntro), 800);
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
  const scoreSpokenRef = useRef(false);
  useEffect(() => {
    if (!enabled || !showResult || scoreSpokenRef.current) return;
    scoreSpokenRef.current = true;
    const t = setTimeout(() => speak(buildScoreSpeech(percentage, materialJudul), 'interrupt'), 800);
    return () => clearTimeout(t);
  }, [enabled, showResult, percentage, materialJudul]);

  // ── Reset saat "Ulangi Kuis" (showResult true → false) ──
  const prevShowResultRef = useRef(false);
  useEffect(() => {
    if (prevShowResultRef.current && !showResult) {
      spokenIdxRef.current = null;   // baca ulang soal 1 (dengan intro)
      scoreSpokenRef.current = false;
    }
    prevShowResultRef.current = showResult;
  }, [showResult]);

  return { triggerLanjut };
}
```

- [ ] **Step 2: Verifikasi typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/useQuizVoice.ts
git commit -m "feat: hook useQuizVoice - orkestrasi suara kuis tunanetra"
```

---

### Task 4: Integrasi ke halaman kuis

**Files:**
- Modify: `app/student/quiz/[id]/page.tsx`

**Interfaces:**
- Consumes: `useQuizVoice`, `UseQuizVoiceOptions` (Task 3); `useAccessibilityStore` dari `@/lib/store/accessibility-store`.
- Produces: — (halaman final).

Perilaku target:
- Mode voice (`tunanetra`/`both`): memilih opsi (via suara ATAU tap) hanya menyorot (`selectedIdx`), belum mengunci. "lanjut" (suara atau tombol) → hook membacakan feedback → `onLanjut` mengunci + pindah.
- Mode non-voice: persis perilaku lama (klik = langsung kunci + feedback visual).

- [ ] **Step 1: Tambah import + state**

Di `app/student/quiz/[id]/page.tsx`, tambah import:

```ts
import { useAccessibilityStore } from '@/lib/store/accessibility-store';
import { useQuizVoice } from '@/lib/hooks/useQuizVoice';
```

Di dalam komponen, setelah deklarasi state yang ada (setelah baris `answersRef.current = answers;`), tambah:

```ts
  const { mode } = useAccessibilityStore();
  const isVoiceMode = mode === 'tunanetra' || mode === 'both';
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
```

- [ ] **Step 2: Pindahkan perhitungan skor ke atas early-return**

Perhitungan `score`/`percentage`/`lulus` saat ini ada SETELAH `if (loading)` return (sekitar baris 189–194). Hook React tidak boleh dipanggil setelah conditional return, dan `useQuizVoice` butuh `percentage`. Pindahkan blok berikut ke ATAS `if (loading)` (hapus dari lokasi lama, jangan dobel):

```ts
  const score = Object.values(answers).filter(a => a.correct).length;
  const percentage = soal.length > 0 ? Math.round((score / soal.length) * 100) : 0;
  const lulus = percentage >= 70;
```

(Variabel `currentSoal`, `currentAnswer`, `isWarningTime` tetap di tempat lama — tidak dibutuhkan hook.)

- [ ] **Step 3: Ubah `handleSelect` + tambah `handleVoiceLanjut`**

Ganti `handleSelect` yang ada:

```ts
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
```

Tambahkan di bawahnya (dipanggil hook SETELAH TTS feedback selesai):

```ts
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
  }, [soal, currentIdx]); // handleNext stabil per render; currentIdx sudah di deps
```

Catatan: `handleNext` sudah ada di halaman dan menangani pindah soal / tampilkan hasil + `saveQuizResult()`. Jika ESLint `react-hooks/exhaustive-deps` protes soal `handleNext`, tambahkan `handleNext` ke deps (aman).

- [ ] **Step 4: Panggil hook**

Setelah `handleVoiceLanjut`, tambah:

```ts
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
```

(Harus sebelum `if (loading)` return — semua hook di atas early return.)

- [ ] **Step 5: UI — sorotan pilihan & tombol kunci di mode voice**

Di render daftar pilihan (sekitar baris 340–342), ubah:

```ts
              const isSelected = currentAnswer?.selected === optIdx;
```

menjadi:

```ts
              const isSelected = currentAnswer?.selected === optIdx ||
                (isVoiceMode && !currentAnswer?.answered && selectedIdx === optIdx);
```

Di bawah blok tombol `handleNext` yang ada (sekitar baris 380–385, blok `{currentAnswer?.answered && (...)}`), tambah tombol untuk mode voice (berguna bagi pengguna `both` yang bisa melihat):

```tsx
          {isVoiceMode && selectedIdx !== null && !currentAnswer?.answered && (
            <button onClick={triggerLanjut}
              className="w-full h-12 bg-blue-800 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
              aria-label="Kunci jawaban dan lanjut ke soal berikutnya">
              {currentIdx < soal.length - 1 ? 'Kunci Jawaban & Lanjut →' : 'Kunci Jawaban & Lihat Hasil'}
            </button>
          )}
```

- [ ] **Step 6: Verifikasi typecheck + build + semua test**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: semua exit 0. Build Next sukses tanpa error.

- [ ] **Step 7: Commit**

```bash
git add app/student/quiz/[id]/page.tsx
git commit -m "feat: kuis via suara untuk tunanetra - pilih/ganti jawaban, lanjut, feedback, timer, nilai"
```

---

### Task 5: Verifikasi manual end-to-end (Chrome)

**Files:** — (tidak ada perubahan kode; jika ada bug, perbaiki lalu commit terpisah)

**Interfaces:** —

- [ ] **Step 1: Jalankan dev server**

```bash
npm run dev
```

Buka `http://localhost:3000/student/login` di Chrome. Login akun siswa, pilih mode **Tunanetra**, simpan.

- [ ] **Step 2: Checklist guard login**

- Saat masih di halaman login/setup: TIDAK muncul tombol mic floating, TIDAK ada prompt izin mic.
- Setelah masuk dashboard: tombol mic muncul, izin mic diminta sekali, tidak "kepental" kembali ke login.

- [ ] **Step 3: Checklist kuis via suara**

Masuk ke satu materi → mulai kuis. Verifikasi berurutan:

1. Instruksi awal + Soal 1 + pilihan A–D dibacakan otomatis.
2. Ucapkan "B" → terdengar "Pilihan B dipilih", opsi B tersorot biru.
3. Ucapkan "A" → pilihan berganti ke A (ganti jawaban bekerja).
4. Ucapkan "lanjut" TANPA memilih di soal berikutnya → ditolak: "Anda belum memilih jawaban...".
5. Ucapkan "ulangi" → soal dibacakan ulang tanpa intro.
6. Ucapkan "lanjut" setelah memilih → feedback benar/salah + jawaban benar + penjelasan dibacakan → otomatis pindah & soal berikut dibacakan.
7. Diamkan sampai menit berganti → "Waktu tersisa 4 menit." terdengar.
8. Selesaikan semua soal → nilai dibacakan: ≥70 "Selamat..." / <70 "Maaf... remedial".
9. Tombol "Kunci Jawaban & Lanjut" tampil saat ada pilihan tersorot, dan berfungsi sama dengan ucapan "lanjut".

- [ ] **Step 4: Checklist regresi non-tunanetra**

Ganti mode ke "Tidak Ada" (profil/setup) → ulangi kuis:
- Klik pilihan → langsung terkunci + feedback visual muncul (perilaku lama).
- Tidak ada suara apa pun; tombol "Kunci Jawaban & Lanjut" tidak muncul.

- [ ] **Step 5: Commit perbaikan (bila ada) & selesai**

Bila menemukan bug saat verifikasi, perbaiki dan commit dengan pesan `fix: ...`. Setelah semua checklist lulus, pekerjaan siap review akhir.
