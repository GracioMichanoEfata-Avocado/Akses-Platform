import { describe, it, expect } from 'vitest';
import { authorizeRoomAccess, LiveSessionRow } from './room-access';

const GURU = 'guru-1';
const SISWA = 'siswa-1';
const SISWA_LAIN = 'siswa-2';

function kelas(over: Partial<LiveSessionRow> = {}): LiveSessionRow {
  return { guru_id: GURU, status: 'live', room_name: 'room-x', tipe: 'kelas', student_id: null, ...over };
}

function privat(over: Partial<LiveSessionRow> = {}): LiveSessionRow {
  return { guru_id: GURU, status: 'live', room_name: 'privat-x', tipe: 'privat', student_id: SISWA, ...over };
}

describe('authorizeRoomAccess — ruang & guru', () => {
  it('menolak ruang yang tidak punya sesi', () => {
    const hasil = authorizeRoomAccess(null, SISWA, 'student');
    expect(hasil.allowed).toBe(false);
    expect(hasil.reason).toBe('Ruang tidak ditemukan');
  });

  it('mengizinkan guru masuk sesi miliknya sendiri', () => {
    expect(authorizeRoomAccess(kelas(), GURU, 'teacher').allowed).toBe(true);
  });

  it('mengizinkan guru masuk sesinya yang belum dimulai', () => {
    expect(authorizeRoomAccess(kelas({ status: 'scheduled' }), GURU, 'teacher').allowed).toBe(true);
  });

  it('mengizinkan guru masuk sesinya yang sudah berakhir', () => {
    expect(authorizeRoomAccess(kelas({ status: 'ended' }), GURU, 'teacher').allowed).toBe(true);
  });

  it('mengizinkan guru masuk sesi privat yang ia ajar', () => {
    expect(authorizeRoomAccess(privat(), GURU, 'teacher').allowed).toBe(true);
  });

  it('menolak guru lain yang bukan pengajar sesi itu', () => {
    const hasil = authorizeRoomAccess(privat(), 'guru-2', 'teacher');
    expect(hasil.allowed).toBe(false);
    expect(hasil.reason).toBe('Anda bukan pengajar sesi ini');
  });

  it('memberi reason kosong saat diizinkan', () => {
    expect(authorizeRoomAccess(kelas(), GURU, 'teacher').reason).toBe('');
  });
});

describe('authorizeRoomAccess — siswa di kelas umum', () => {
  it('mengizinkan siswa mana pun masuk kelas yang sedang live', () => {
    expect(authorizeRoomAccess(kelas(), SISWA, 'student').allowed).toBe(true);
    expect(authorizeRoomAccess(kelas(), SISWA_LAIN, 'student').allowed).toBe(true);
  });

  it('menolak siswa pada kelas yang belum dimulai', () => {
    const hasil = authorizeRoomAccess(kelas({ status: 'scheduled' }), SISWA, 'student');
    expect(hasil.allowed).toBe(false);
    expect(hasil.reason).toBe('Sesi belum dimulai');
  });

  it('menolak siswa pada kelas yang sudah berakhir', () => {
    expect(authorizeRoomAccess(kelas({ status: 'ended' }), SISWA, 'student').allowed).toBe(false);
  });
});

describe('authorizeRoomAccess — siswa di sesi privat', () => {
  it('mengizinkan siswa pengaju masuk sesi privatnya', () => {
    expect(authorizeRoomAccess(privat(), SISWA, 'student').allowed).toBe(true);
  });

  it('menolak siswa lain masuk sesi privat', () => {
    const hasil = authorizeRoomAccess(privat(), SISWA_LAIN, 'student');
    expect(hasil.allowed).toBe(false);
    expect(hasil.reason).toBe('Sesi ini khusus siswa lain');
  });

  it('status diperiksa sebelum kepemilikan', () => {
    // Siswa lain tidak boleh membedakan "belum mulai" dari "aku tidak diundang":
    // keduanya harus memberi alasan yang sama saat sesi belum live.
    const lain = authorizeRoomAccess(privat({ status: 'scheduled' }), SISWA_LAIN, 'student');
    const pengaju = authorizeRoomAccess(privat({ status: 'scheduled' }), SISWA, 'student');
    expect(lain.reason).toBe('Sesi belum dimulai');
    expect(pengaju.reason).toBe('Sesi belum dimulai');
  });

  it('sesi privat tanpa student_id tidak meloloskan siapa pun', () => {
    // Constraint database melarangnya, tapi jangan bergantung pada itu saja.
    const hasil = authorizeRoomAccess(privat({ student_id: null }), SISWA, 'student');
    expect(hasil.allowed).toBe(false);
  });

  it('peran diambil dari profiles, bukan disimpulkan dari kecocokan id', () => {
    const hasil = authorizeRoomAccess(privat({ guru_id: SISWA, status: 'scheduled' }), SISWA, 'student');
    expect(hasil.allowed).toBe(false);
  });
});
