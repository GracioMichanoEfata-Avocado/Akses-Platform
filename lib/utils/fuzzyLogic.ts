/**
 * Sistem Fuzzy Logic untuk menentukan tingkat kesulitan soal remedial
 * berdasarkan nilai kuis siswa.
 *
 * Menggunakan Mamdani Fuzzy Inference dengan 3 himpunan fuzzy:
 * - Gagal Parah (0-40)
 * - Gagal (41-60)  
 * - Hampir Lulus (61-69)
 *
 * Output: tingkat kesulitan soal remedial (sangat_mudah, mudah, sedang)
 */

export type TingkatRemedial = 'sangat_mudah' | 'mudah' | 'sedang';

interface FuzzyResult {
  tingkat: TingkatRemedial;
  derajatKeanggotaan: {
    gagalParah: number;
    gagal: number;
    hampirLulus: number;
  };
  deskripsi: string;
}

// ── Fungsi keanggotaan trapesium ──
// Guard batas pakai "<"/">" (bukan "<="/">=") supaya plateau yang menyentuh
// tepi (mis. a === b === 0, seperti himpunan "Gagal Parah") tetap bernilai
// keanggotaan 1 persis di titik itu, bukan 0.
function trapesium(x: number, a: number, b: number, c: number, d: number): number {
  if (x < a || x > d) return 0;
  if (x >= b && x <= c) return 1;
  if (x > a && x < b) return (x - a) / (b - a);
  if (x > c && x < d) return (d - x) / (d - c);
  return 0;
}

export function hitungFuzzyRemedial(nilai: number): FuzzyResult {
  // Himpunan fuzzy untuk nilai siswa
  const gagalParah = trapesium(nilai, 0, 0, 25, 45);
  const gagal = trapesium(nilai, 30, 45, 55, 65);
  const hampirLulus = trapesium(nilai, 55, 62, 69, 70);

  // Tentukan kategori dominan
  const maxDerajat = Math.max(gagalParah, gagal, hampirLulus);

  let tingkat: TingkatRemedial;
  let deskripsi: string;

  if (maxDerajat === gagalParah && gagalParah > 0) {
    tingkat = 'sangat_mudah';
    deskripsi = 'Nilai jauh di bawah standar. Soal remedial dibuat sangat mudah dengan penjelasan konsep dasar.';
  } else if (maxDerajat === hampirLulus && hampirLulus > 0) {
    tingkat = 'sedang';
    deskripsi = 'Nilai mendekati standar lulus. Soal remedial dibuat tingkat sedang untuk menguatkan pemahaman.';
  } else {
    tingkat = 'mudah';
    deskripsi = 'Nilai di bawah standar. Soal remedial dibuat mudah dengan fokus pada konsep kunci.';
  }

  return {
    tingkat,
    derajatKeanggotaan: { gagalParah, gagal, hampirLulus },
    deskripsi,
  };
}

// Threshold passing grade
export const PASSING_GRADE = 70;

export function perluRemedial(nilai: number): boolean {
  return nilai < PASSING_GRADE;
}
