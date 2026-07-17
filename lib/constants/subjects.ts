// Daftar mata pelajaran baku — sama dengan yang dipakai guru saat membuat
// sesi live (dulu didefinisikan lokal di create-session). Dipakai juga di
// katalog belajar siswa supaya section mata pelajaran selalu lengkap,
// bahkan untuk mapel yang belum punya materi sama sekali.
export const MATA_PELAJARAN = [
  'Biologi', 'IPA', 'Matematika', 'Fisika', 'Kimia',
  'Bahasa Indonesia', 'Sejarah', 'Geografi', 'Ekonomi', 'Seni Budaya',
];

export const SUBJECT_EMOJI: Record<string, string> = {
  'Biologi': '🧬',
  'IPA': '🔬',
  'Matematika': '🔢',
  'Fisika': '⚛️',
  'Kimia': '🧪',
  'Bahasa Indonesia': '📖',
  'Sejarah': '🏛️',
  'Geografi': '🌍',
  'Ekonomi': '💰',
  'Seni Budaya': '🎨',
};

export function getSubjectEmoji(subjek: string): string {
  return SUBJECT_EMOJI[subjek] || '📘';
}
