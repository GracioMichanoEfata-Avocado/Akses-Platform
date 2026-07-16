import { describe, it, expect } from 'vitest';
import {
  buildQuestionSpeech,
  buildFeedbackSpeech,
  buildTimeReminder,
  buildScoreSpeech,
  buildReviewSpeech,
  QuizSoal,
} from './quiz-speech';

const soal: QuizSoal = {
  pertanyaan: 'Berapa hasil 2 tambah 3?',
  pilihan: ['4', '5', '6', '7'],
  jawaban_benar: 1,
  penjelasan: 'Dua ditambah tiga sama dengan lima.',
};

const soal2: QuizSoal = {
  pertanyaan: 'Ibu kota Indonesia?',
  pilihan: ['Bandung', 'Jakarta', 'Surabaya', 'Medan'],
  jawaban_benar: 1,
  penjelasan: 'Jakarta adalah ibu kota Indonesia.',
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

describe('buildReviewSpeech', () => {
  it('semua benar: pesan singkat, tidak menyebut soal satu-satu', () => {
    const text = buildReviewSpeech([soal, soal2], {
      0: { selected: 1, correct: true },
      1: { selected: 1, correct: true },
    });
    expect(text).toContain('Semua jawaban Anda benar');
    expect(text).not.toContain('Soal 1');
  });

  it('cuma membacakan soal yang SALAH, bukan yang benar', () => {
    const text = buildReviewSpeech([soal, soal2], {
      0: { selected: 1, correct: true },
      1: { selected: 0, correct: false },
    });
    expect(text).not.toContain('Berapa hasil 2 tambah 3?');
    expect(text).toContain('Soal 2');
    expect(text).toContain('Ibu kota Indonesia?');
    expect(text).toContain('B: Jakarta');
    expect(text).toContain('Jakarta adalah ibu kota Indonesia.');
  });

  it('soal tidak dijawab dihitung salah juga', () => {
    const text = buildReviewSpeech([soal], {});
    expect(text).toContain('Soal 1');
  });
});
