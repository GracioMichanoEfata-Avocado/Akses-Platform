import { describe, it, expect } from 'vitest';
import { fiturUntukMode } from './material-features';

describe('fiturUntukMode', () => {
  it('tunanetra: filter kontras, tanpa panel transkrip', () => {
    const f = fiturUntukMode('tunanetra');
    expect(f.filterKontras).toBe(true);
    expect(f.panelTranskrip).toBe(false);
  });

  it('tunarungu: panel transkrip, tanpa filter kontras', () => {
    const f = fiturUntukMode('tunarungu');
    expect(f.filterKontras).toBe(false);
    expect(f.panelTranskrip).toBe(true);
  });

  it('both: semua fitur keluar', () => {
    const f = fiturUntukMode('both');
    expect(f.filterKontras).toBe(true);
    expect(f.panelTranskrip).toBe(true);
  });

  it('none: tampilan standar tanpa kontrol aksesibilitas', () => {
    const f = fiturUntukMode('none');
    expect(f.filterKontras).toBe(false);
    expect(f.panelTranskrip).toBe(false);
  });

  it('mode tak dikenal jatuh ke tampilan standar', () => {
    // Nilai baru di store tidak boleh memunculkan kontrol secara tak sengaja.
    const f = fiturUntukMode('entah' as any);
    expect(f.filterKontras).toBe(false);
    expect(f.panelTranskrip).toBe(false);
  });

  it('both adalah gabungan tunanetra dan tunarungu', () => {
    const netra = fiturUntukMode('tunanetra');
    const rungu = fiturUntukMode('tunarungu');
    const both = fiturUntukMode('both');
    for (const k of ['filterKontras', 'panelTranskrip'] as const) {
      expect(both[k]).toBe(netra[k] || rungu[k]);
    }
  });

  it('audio deskriptif tidak lagi di-gate: tidak ada field-nya', () => {
    // Tombol "Putar Audio" tersedia untuk semua mode, jadi bukan urusan
    // fungsi ini. Field yang nilainya selalu true hanya menyesatkan.
    expect('audioDeskriptif' in fiturUntukMode('none')).toBe(false);
  });
});
