// Bentuk & waktu tayang slide presentasi. Fungsi murni: keluaran model bahasa
// bisa cacat, dan slide cacat tidak boleh membuat halaman materi blank.

export interface Slide {
  judul: string;
  emojiIkon: string;
  deskripsi: string;
  warna: string;
  /** URL gambar untuk slide yang diupload manual oleh guru (bukan hasil AI). */
  gambarUrl?: string;
  /** Poin-poin ringkas ("diagram teks") pendukung deskripsi, khusus slide hasil AI. */
  poinPenting?: string[];
}

export const EMOJI_DEFAULT = '📘';
export const WARNA_DEFAULT = '#1E40AF';

const HEX_ENAM = /^#[0-9a-fA-F]{6}$/;

const DURASI_MIN = 4000;   // slide pendek tidak boleh berkelebat
const DURASI_MAKS = 20000; // slide panjang tidak boleh terasa macet
const KATA_PER_MENIT = 200;

function teksBersih(nilai: unknown): string {
  return typeof nilai === 'string' ? nilai.trim() : '';
}

/** Mengembalikan hanya slide yang sah. Array kosong berarti "tidak ada slide". */
export function parseSlides(raw: unknown): Slide[] {
  if (!Array.isArray(raw)) return [];

  const keluar: Slide[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;

    const judul = teksBersih((item as any).judul);
    const deskripsi = teksBersih((item as any).deskripsi);
    const gambarUrl = teksBersih((item as any).gambarUrl);
    // Slide sah kalau ada judul, DAN (deskripsi buat narasi ATAU gambar
    // upload manual). Slide gambar manual boleh tanpa deskripsi.
    if (!judul || (!deskripsi && !gambarUrl)) continue;

    const emoji = teksBersih((item as any).emojiIkon);
    const warna = teksBersih((item as any).warna);
    const poinPenting = Array.isArray((item as any).poinPenting)
      ? (item as any).poinPenting.map(teksBersih).filter(Boolean)
      : undefined;

    keluar.push({
      judul,
      deskripsi,
      emojiIkon: emoji || EMOJI_DEFAULT,
      warna: HEX_ENAM.test(warna) ? warna : WARNA_DEFAULT,
      ...(gambarUrl ? { gambarUrl } : {}),
      ...(poinPenting && poinPenting.length > 0 ? { poinPenting } : {}),
    });
  }
  return keluar;
}

/**
 * Lama sebuah slide tampil bila narasi TTS tidak berjalan — misalnya siswa
 * tunarungu, atau browser tanpa dukungan speech synthesis.
 */
export function durasiBaca(teks: string): number {
  const jumlahKata = teks.trim().split(/\s+/).filter(Boolean).length;
  const ms = (jumlahKata / KATA_PER_MENIT) * 60_000;
  return Math.min(DURASI_MAKS, Math.max(DURASI_MIN, Math.round(ms)));
}
