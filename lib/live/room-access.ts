// Keputusan izin masuk ruang LiveKit. Fungsi murni tanpa Supabase/jaringan
// supaya bisa di-unit-test; pemanggil yang mengambil datanya.

export interface LiveSessionRow {
  guru_id: string;
  status: string; // 'scheduled' | 'live' | 'ended'
  room_name: string;
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

  return session.status === 'live' ? IZINKAN : tolak('Sesi belum dimulai');
}
