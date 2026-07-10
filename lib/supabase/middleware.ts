import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { resolveRedirect } from '@/lib/auth/route-guard';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // PENTING: jangan taruh kode lain di antara createServerClient() dan getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtectedRoute = path.startsWith('/student') || path.startsWith('/teacher');
  const isLoginPage = path.includes('/login');

  if (!user && isProtectedRoute && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = path.startsWith('/teacher') ? '/teacher/login' : '/student/login';
    return NextResponse.redirect(url);
  }

  // Login saja tidak cukup: tanpa cek peran, guru bisa membuka /student/*
  // dan siswa bisa membuka /teacher/* beserta seluruh data siswa di sana.
  // Query dibatasi ke rute terlindungi agar tidak membebani tiap request.
  if (user && isProtectedRoute && !isLoginPage) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const tujuan = resolveRedirect(path, profile?.role);
    if (tujuan) {
      const url = request.nextUrl.clone();
      url.pathname = tujuan;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

// Catatan: `config.matcher` didefinisikan di middleware.ts pada root proyek,
// bukan di sini. Next menganalisisnya secara statis saat build.
