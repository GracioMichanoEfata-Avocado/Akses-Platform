// Aturan pemisahan akses guru vs siswa. Fungsi murni agar bisa di-unit-test
// tanpa menjalankan middleware; pemanggil yang mengambil peran dari database.

export const DASHBOARD: Record<'student' | 'teacher', string> = {
  student: '/student/dashboard',
  teacher: '/teacher/dashboard',
};

/**
 * Mengembalikan path tujuan pengalihan, atau null bila request boleh lanjut.
 * `role` adalah profiles.role milik user yang sudah terautentikasi.
 */
export function resolveRedirect(path: string, role: string | null | undefined): string | null {
  const areaSiswa = path.startsWith('/student');
  const areaGuru = path.startsWith('/teacher');
  if (!areaSiswa && !areaGuru) return null;

  // Halaman login harus tetap terbuka: seorang guru perlu bisa membuka
  // /student/login untuk berganti akun. Mengalihkannya membuat pengguna
  // terkunci pada peran yang sedang aktif.
  if (path.includes('/login')) return null;

  if (role === 'student') return areaGuru ? DASHBOARD.student : null;
  if (role === 'teacher') return areaSiswa ? DASHBOARD.teacher : null;

  // Peran hilang atau asing: jangan loloskan ke area mana pun.
  return '/login';
}
