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
