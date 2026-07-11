// Memetakan mode disabilitas menjadi fitur yang muncul di halaman materi.
// Fungsi murni: import tipe saja, tidak menyentuh store maupun DOM.

import type { DisabilitasMode } from '@/lib/store/accessibility-store';

// Catatan: tombol "Putar Audio" sengaja TIDAK ada di sini. Ia tersedia untuk
// semua mode, termasuk 'none' — membacakan deskripsi materi berguna bagi siapa
// pun, bukan hanya tunanetra.
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
