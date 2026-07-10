import { describe, it, expect } from 'vitest';
import { authorizeRoomAccess, LiveSessionRow } from './room-access';

const GURU = 'guru-1';
const SISWA = 'siswa-1';

function sesi(over: Partial<LiveSessionRow> = {}): LiveSessionRow {
  return { guru_id: GURU, status: 'live', room_name: 'room-x', ...over };
}

describe('authorizeRoomAccess', () => {
  it('menolak ruang yang tidak punya sesi', () => {
    const hasil = authorizeRoomAccess(null, SISWA, 'student');
    expect(hasil.allowed).toBe(false);
    expect(hasil.reason).toBe('Ruang tidak ditemukan');
  });

  it('mengizinkan guru masuk sesi miliknya sendiri', () => {
    expect(authorizeRoomAccess(sesi(), GURU, 'teacher').allowed).toBe(true);
  });

  it('mengizinkan guru masuk sesinya yang belum dimulai', () => {
    expect(authorizeRoomAccess(sesi({ status: 'scheduled' }), GURU, 'teacher').allowed).toBe(true);
  });

  it('mengizinkan guru masuk sesinya yang sudah berakhir', () => {
    expect(authorizeRoomAccess(sesi({ status: 'ended' }), GURU, 'teacher').allowed).toBe(true);
  });

  it('menolak guru lain yang bukan pengajar sesi itu', () => {
    const hasil = authorizeRoomAccess(sesi(), 'guru-2', 'teacher');
    expect(hasil.allowed).toBe(false);
    expect(hasil.reason).toBe('Anda bukan pengajar sesi ini');
  });

  it('mengizinkan siswa masuk sesi yang sedang live', () => {
    expect(authorizeRoomAccess(sesi(), SISWA, 'student').allowed).toBe(true);
  });

  it('menolak siswa pada sesi yang belum dimulai', () => {
    const hasil = authorizeRoomAccess(sesi({ status: 'scheduled' }), SISWA, 'student');
    expect(hasil.allowed).toBe(false);
    expect(hasil.reason).toBe('Sesi belum dimulai');
  });

  it('menolak siswa pada sesi yang sudah berakhir', () => {
    expect(authorizeRoomAccess(sesi({ status: 'ended' }), SISWA, 'student').allowed).toBe(false);
  });

  it('tidak meloloskan siswa hanya karena id-nya sama dengan guru_id', () => {
    // Peran diambil dari profiles.role, bukan disimpulkan dari kecocokan id.
    const hasil = authorizeRoomAccess(sesi({ guru_id: SISWA, status: 'scheduled' }), SISWA, 'student');
    expect(hasil.allowed).toBe(false);
  });

  it('memberi reason kosong saat diizinkan', () => {
    expect(authorizeRoomAccess(sesi(), GURU, 'teacher').reason).toBe('');
  });
});
