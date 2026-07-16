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

// Dipakai saat "Lihat Pembahasan" dipilih. Sengaja HANYA membacakan soal yang
// jawabannya salah beserta penjelasannya — soal yang sudah benar tidak perlu
// diulang, cukup fokus ke yang perlu dipelajari lagi.
export function buildReviewSpeech(
  soal: QuizSoal[],
  answers: Record<number, { selected: number; correct: boolean }>
): string {
  // Soal yang belum dijawab (mis. waktu habis) dihitung sebagai salah juga,
  // bukan dilewati — siswa tetap perlu tahu jawaban yang benar.
  const salah = soal
    .map((s, idx) => ({ s, idx, ans: answers[idx] }))
    .filter(({ ans }) => !ans || !ans.correct);

  if (salah.length === 0) {
    return 'Semua jawaban Anda benar. Kerja bagus!';
  }

  const bagian = salah.map(({ s, idx, ans }) => {
    const hurufBenar = HURUF_PILIHAN[s.jawaban_benar];
    if (!ans) {
      return `Soal ${idx + 1}: ${s.pertanyaan}. Anda belum menjawab. Jawaban yang benar adalah ${hurufBenar}: ${s.pilihan[s.jawaban_benar]}. ${s.penjelasan}`;
    }
    const hurufAnda = HURUF_PILIHAN[ans.selected];
    return `Soal ${idx + 1}: ${s.pertanyaan}. Jawaban Anda ${hurufAnda}, kurang tepat. Jawaban yang benar adalah ${hurufBenar}: ${s.pilihan[s.jawaban_benar]}. ${s.penjelasan}`;
  });

  return `Berikut pembahasan soal yang belum tepat. ${bagian.join(' ')}`;
}
