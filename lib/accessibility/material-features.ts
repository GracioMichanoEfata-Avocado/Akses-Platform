// Memetakan mode disabilitas menjadi fitur yang muncul di halaman materi.
// Fungsi murni: import tipe saja, tidak menyentuh store maupun DOM.

import type { DisabilitasMode } from '@/lib/store/accessibility-store';

export interface FiturMateri {
  /** Tombol "Putar Audio" yang membacakan deskripsi materi. */
  audioDeskriptif: boolean;
  /** Toggle filter super kontras pada area player. */
  filterKontras: boolean;
  /** Teks materi ditampilkan sebagai panel transkrip, bukan deskripsi biasa. */
  panelTranskrip: boolean;
}

const STANDAR: FiturMateri = {
  audioDeskriptif: false,
  filterKontras: false,
  panelTranskrip: false,
};

export function fiturUntukMode(mode: DisabilitasMode): FiturMateri {
  const netra = mode === 'tunanetra' || mode === 'both';
  const rungu = mode === 'tunarungu' || mode === 'both';

  // Mode asing jatuh ke tampilan standar: jangan memunculkan kontrol
  // aksesibilitas secara tak sengaja bagi pengguna yang tidak memintanya.
  if (!netra && !rungu) return STANDAR;

  return {
    audioDeskriptif: netra,
    filterKontras: netra,
    panelTranskrip: rungu,
  };
}
