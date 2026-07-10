// Keputusan izin masuk ruang LiveKit. Fungsi murni tanpa Supabase/jaringan
// supaya bisa di-unit-test; pemanggil yang mengambil datanya.

export interface LiveSessionRow {
  guru_id: string;
  status: string; // 'scheduled' | 'live' | 'ended'
  room_name: string;
  tipe: 'kelas' | 'privat';
  student_id: string | null; // hanya terisi pada sesi privat
}

export type Peran = 'teacher' | 'student';

export interface AccessResult {
  allowed: boolean;
  reason: string; // alasan penolakan; kosong bila diizinkan
}

const IZINKAN: AccessResult = { allowed: true, reason: '' };

function tolak(reason: string): AccessResult {
  return { allowed: false, reason };
}

export function authorizeRoomAccess(
  session: LiveSessionRow | null,
  userId: string,
  peran: Peran
): AccessResult {
  if (!session) return tolak('Ruang tidak ditemukan');

  if (peran === 'teacher') {
    // Guru boleh masuk sesinya sendiri pada status apa pun: mengambil token
    // sebelum status berubah jadi 'live' menghindari balapan di startSession().
    return session.guru_id === userId ? IZINKAN : tolak('Anda bukan pengajar sesi ini');
  }

  // Status diperiksa sebelum kepemilikan: siswa yang tidak diundang tidak boleh
  // bisa membedakan "sesi privat orang lain belum mulai" dari "aku tidak diundang".
  if (session.status !== 'live') return tolak('Sesi belum dimulai');

  if (session.tipe === 'kelas') return IZINKAN;

  // Sesi privat. student_id null seharusnya mustahil (dicegah constraint
  // database), tapi jangan bergantung pada itu saja: null tidak meloloskan.
  return session.student_id && session.student_id === userId
    ? IZINKAN
    : tolak('Sesi ini khusus siswa lain');
}
