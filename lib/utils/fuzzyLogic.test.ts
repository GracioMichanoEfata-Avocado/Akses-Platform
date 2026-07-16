import { describe, it, expect } from 'vitest';
import { hitungFuzzyRemedial, perluRemedial, PASSING_GRADE } from './fuzzyLogic';

describe('hitungFuzzyRemedial', () => {
  it('nilai 0 (kasus tepi plateau) tetap sangat_mudah, bukan jatuh ke default', () => {
    expect(hitungFuzzyRemedial(0).tingkat).toBe('sangat_mudah');
  });

  it('nilai sangat rendah -> sangat_mudah', () => {
    expect(hitungFuzzyRemedial(10).tingkat).toBe('sangat_mudah');
    expect(hitungFuzzyRemedial(35).tingkat).toBe('sangat_mudah');
  });

  it('nilai menengah (gagal, bukan gagal parah) -> mudah', () => {
    expect(hitungFuzzyRemedial(50).tingkat).toBe('mudah');
  });

  it('nilai mendekati lulus -> sedang', () => {
    expect(hitungFuzzyRemedial(65).tingkat).toBe('sedang');
    expect(hitungFuzzyRemedial(69).tingkat).toBe('sedang');
  });

  it('derajat keanggotaan selalu antara 0 dan 1', () => {
    for (let nilai = 0; nilai <= 100; nilai += 5) {
      const { derajatKeanggotaan } = hitungFuzzyRemedial(nilai);
      for (const derajat of Object.values(derajatKeanggotaan)) {
        expect(derajat).toBeGreaterThanOrEqual(0);
        expect(derajat).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('perluRemedial', () => {
  it('nilai di bawah standar lulus (70) perlu remedial', () => {
    expect(perluRemedial(69)).toBe(true);
    expect(perluRemedial(0)).toBe(true);
  });

  it('nilai standar lulus ke atas tidak perlu remedial', () => {
    expect(perluRemedial(70)).toBe(false);
    expect(perluRemedial(100)).toBe(false);
  });

  it('PASSING_GRADE konsisten dengan 70', () => {
    expect(PASSING_GRADE).toBe(70);
  });
});
