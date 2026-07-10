import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Belum login' }, { status: 401 });

    const { judul, isi, tipe, link, targetUserIds } = await req.json();

    // Kalau targetUserIds dikasih, kirim ke user tertentu
    // Kalau tidak, kirim ke semua siswa
    let userIds: string[] = targetUserIds || [];

    if (userIds.length === 0) {
      const { data: students } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'student');
      userIds = (students || []).map(s => s.id);
    }

    if (userIds.length === 0) return NextResponse.json({ sent: 0 });

    const notifs = userIds.map(uid => ({
      user_id: uid,
      judul,
      isi,
      tipe: tipe || 'materi_baru',
      link: link || null,
      dibaca: false,
    }));

    const { error } = await supabase.from('notifications').insert(notifs);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ sent: notifs.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
