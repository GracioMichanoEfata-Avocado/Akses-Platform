import { describe, it, expect } from 'vitest';
import { parseSlides, durasiBaca, EMOJI_DEFAULT, WARNA_DEFAULT } from './slide-data';

const sah = { judul: 'Rantai Makanan', emojiIkon: '🐟', deskripsi: 'Dua kalimat.', warna: '#1E40AF' };

describe('parseSlides — bentuk yang tidak sah', () => {
  it('bukan array menghasilkan array kosong', () => {
    expect(parseSlides(null)).toEqual([]);
    expect(parseSlides(undefined)).toEqual([]);
    expect(parseSlides('slide')).toEqual([]);
    expect(parseSlides({ judul: 'x' })).toEqual([]);
  });

  it('array kosong tetap kosong', () => {
    expect(parseSlides([])).toEqual([]);
  });

  it('membuang elemen yang bukan objek', () => {
    expect(parseSlides([sah, null, 'x', 42])).toHaveLength(1);
  });

  it('membuang slide tanpa judul atau deskripsi', () => {
    expect(parseSlides([{ ...sah, judul: '' }])).toEqual([]);
    expect(parseSlides([{ ...sah, judul: '   ' }])).toEqual([]);
    expect(parseSlides([{ ...sah, deskripsi: undefined }])).toEqual([]);
    expect(parseSlides([{ ...sah, deskripsi: 123 }])).toEqual([]);
  });
});

describe('parseSlides — pengisian default', () => {
  it('emoji hilang diisi default', () => {
    expect(parseSlides([{ ...sah, emojiIkon: undefined }])[0].emojiIkon).toBe(EMOJI_DEFAULT);
  });

  it('warna cacat diisi default', () => {
    expect(parseSlides([{ ...sah, warna: 'biru' }])[0].warna).toBe(WARNA_DEFAULT);
    expect(parseSlides([{ ...sah, warna: '#12F' }])[0].warna).toBe(WARNA_DEFAULT);
    expect(parseSlides([{ ...sah, warna: undefined }])[0].warna).toBe(WARNA_DEFAULT);
  });

  it('warna hex enam digit dipertahankan, huruf besar diterima', () => {
    expect(parseSlides([{ ...sah, warna: '#abcdef' }])[0].warna).toBe('#abcdef');
    expect(parseSlides([{ ...sah, warna: '#ABCDEF' }])[0].warna).toBe('#ABCDEF');
  });

  it('slide sah lolos utuh dan urutannya dijaga', () => {
    const dua = [{ ...sah, judul: 'Satu' }, { ...sah, judul: 'Dua' }];
    expect(parseSlides(dua).map(s => s.judul)).toEqual(['Satu', 'Dua']);
  });

  it('judul dan deskripsi dirapikan spasinya', () => {
    const s = parseSlides([{ ...sah, judul: '  Rantai  ', deskripsi: ' isi ' }])[0];
    expect(s.judul).toBe('Rantai');
    expect(s.deskripsi).toBe('isi');
  });
});

describe('durasiBaca', () => {
  it('teks pendek tetap tampil minimal 4 detik', () => {
    expect(durasiBaca('Halo')).toBe(4000);
    expect(durasiBaca('')).toBe(4000);
  });

  it('teks sangat panjang dibatasi 20 detik', () => {
    expect(durasiBaca('kata '.repeat(500))).toBe(20000);
  });

  it('teks sedang sebanding dengan jumlah kata', () => {
    // 200 kata/menit -> 100 kata ≈ 30 detik, tapi dibatasi 20 detik.
    // 40 kata ≈ 12 detik, masih di dalam batas.
    const empatPuluh = durasiBaca('kata '.repeat(40));
    expect(empatPuluh).toBeGreaterThan(4000);
    expect(empatPuluh).toBeLessThan(20000);
    expect(durasiBaca('kata '.repeat(60))).toBeGreaterThan(empatPuluh);
  });
});
