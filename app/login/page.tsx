import { redirect } from 'next/navigation';

// Halaman pilihan peran kini berada di root '/'. Rute lama '/login' dialihkan
// agar tautan "Kembali" pada halaman login tetap mendarat di pemilih peran.
export default function LoginRedirect() {
  redirect('/');
}
