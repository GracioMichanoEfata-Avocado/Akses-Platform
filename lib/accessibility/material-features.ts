// Memetakan mode disabilitas menjadi fitur yang muncul di halaman materi.
// Fungsi murni: import tipe saja, tidak menyentuh store maupun DOM.

import type { DisabilitasMode } from '@/lib/store/accessibility-store';

// Catatan: tombol "Putar Audio" sengaja TIDAK ada di sini — ia tidak digating
// oleh mode disabilitas, melainkan langsung oleh toggle "Teks ke Suara"
// (ttsEnabled) di lib/store/accessibility-store.ts. Lihat pemakaiannya di
// app/student/learn/[id]/page.tsx.
export interface FiturMateri {
  /** Toggle filter super kontras pada area player. */
  filterKontras: boolean;
  /** Teks materi ditampilkan sebagai panel transkrip, bukan deskripsi biasa. */
  panelTranskrip: boolean;
}

const STANDAR: FiturMateri = {
  filterKontras: false,
  panelTranskrip: false,
};

// Filter CSS untuk "Kontras Tinggi" pada video/slide materi. BUKAN hitam-putih
// (grayscale) — melainkan warna dinaikkan lebih vivid/tersaturasi dan tajam,
// seperti video sensorik ber-highlight warna cerah di atas latar gelap.
// `drop-shadow` menambah glow/bloom lembut di sekeliling frame supaya terasa
// "high resolution" tanpa terlalu menyilaukan. Catatan teknis: filter CSS
// hanya bisa diterapkan ke seluruh frame video/slide sekaligus — tidak bisa
// menyorot glow di objek tertentu di dalam video, karena itu bagian dari
// piksel video itu sendiri, bukan elemen terpisah yang bisa ditarget CSS.
export const FILTER_KONTRAS_VIDEO =
  'saturate(1.75) contrast(1.25) brightness(1.05) drop-shadow(0 0 14px rgba(255,255,255,0.25))';

export function fiturUntukMode(mode: DisabilitasMode): FiturMateri {
  const netra = mode === 'tunanetra' || mode === 'both';
  const rungu = mode === 'tunarungu' || mode === 'both';

  // Mode asing jatuh ke tampilan standar: jangan memunculkan kontrol
  // aksesibilitas secara tak sengaja bagi pengguna yang tidak memintanya.
  if (!netra && !rungu) return STANDAR;

  return {
    filterKontras: netra,
    panelTranskrip: rungu,
  };
}
