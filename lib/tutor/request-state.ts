// Memetakan status ajuan pendampingan menjadi tampilan tombol.
// Fungsi murni: tanpa DOM, tanpa jaringan, tanpa tanggal — format tanggal
// bergantung zona waktu dan dirender terpisah oleh komponen.

export type TutorStatus = 'menunggu' | 'dijadwalkan' | 'ditolak';

export interface TutorRequestRow {
  status: TutorStatus;
  jadwal: string | null; // ISO string
}

export interface TombolAjuan {
  label: string;
  disabled: boolean;
  keterangan: string; // ditampilkan di layar dan dibacakan TTS
}

// Label awal sengaja "Minta Pendamping", bukan "Ajukan Pendampingan":
// scanClickables menyusun kata kunci suara dari teks tombol, jadi siswa
// mengucapkan persis yang tertulis.
const AWAL: TombolAjuan = {
  label: 'Minta Pendamping',
  disabled: false,
  keterangan: '',
};

const PER_STATUS: Record<TutorStatus, TombolAjuan> = {
  menunggu: {
    label: 'Menunggu Persetujuan',
    disabled: true,
    keterangan: 'Ajuanmu sudah terkirim. Menunggu guru merespons.',
  },
  dijadwalkan: {
    label: 'Sesi Dijadwalkan',
    disabled: true,
    keterangan: 'Guru menyetujui ajuanmu.',
  },
  ditolak: {
    label: 'Ajukan Ulang',
    disabled: false,
    keterangan: 'Guru belum bisa mendampingi. Kamu boleh mengajukan lagi.',
  },
};

export function describeRequestState(req: TutorRequestRow | null): TombolAjuan {
  if (!req) return AWAL;
  // Status asing (mis. nilai baru di database) jangan sampai membuat tombol
  // macet nonaktif tanpa jalan keluar; perlakukan seperti belum mengajukan.
  return PER_STATUS[req.status] ?? AWAL;
}

// materials.created_by tidak dijamin berisi guru: sebagian materi dibuat oleh
// akun siswa. Menyalinnya mentah-mentah ke teacher_id membuat ajuan tak terlihat
// oleh guru mana pun — policy RLS guru mensyaratkan teacher_id = auth.uid()
// atau null. Kembalikan null (ajuan terbuka) bila pembuatnya bukan guru.
export function resolveTeacherId(
  createdBy: string | null | undefined,
  createdByRole: string | null | undefined
): string | null {
  if (!createdBy) return null;
  return createdByRole === 'teacher' ? createdBy : null;
}
