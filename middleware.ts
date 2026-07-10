// Next.js hanya mengeksekusi middleware yang berada di root proyek (atau src/).
// Logikanya tinggal di lib/supabase/middleware.ts; file ini yang menghidupkannya.
// Sebelum file ini ada, middleware TIDAK PERNAH berjalan: rute /student/* dan
// /teacher/* terbuka bagi siapa pun, termasuk pengunjung yang belum login.
export { middleware } from '@/lib/supabase/middleware';

// config wajib berupa literal di file ini — Next menganalisisnya secara statis
// saat build, bukan saat runtime, jadi tidak bisa di-reexport.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
