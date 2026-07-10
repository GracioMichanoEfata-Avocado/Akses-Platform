import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveTeacherId } from '@/lib/tutor/request-state';

// Pelanggaran indeks unik parsial tutor_requests_satu_menunggu:
// satu siswa hanya boleh punya satu ajuan 'menunggu' per materi.
const UNIQUE_VIOLATION = '23505';

export async function POST(req: NextRequest) {
  try {
    const { materialId } = await req.json();
    if (!materialId) {
      return NextResponse.json({ error: 'materialId wajib diisi' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Belum login' }, { status: 401 });
    }

    // teacher_id ditentukan server agar siswa tidak bisa mengarahkan ajuannya
    // ke guru sembarangan.
    const { data: material } = await supabase
      .from('materials')
      .select('created_by')
      .eq('id', materialId)
      .maybeSingle();

    if (!material) {
      return NextResponse.json({ error: 'Materi tidak ditemukan' }, { status: 404 });
    }

    // Pembuat materi belum tentu guru — sebagian materi dibuat akun siswa.
    // resolveTeacherId() mengubahnya jadi ajuan terbuka daripada ajuan yang
    // tak terlihat oleh siapa pun.
    let peranPembuat: string | null = null;
    if (material.created_by) {
      const { data: pembuat } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', material.created_by)
        .maybeSingle();
      peranPembuat = pembuat?.role ?? null;
    }

    const { data: ajuan, error } = await supabase
      .from('tutor_requests')
      .insert({
        student_id: user.id,
        material_id: materialId,
        teacher_id: resolveTeacherId(material.created_by, peranPembuat),
        status: 'menunggu',
      })
      .select('status, jadwal')
      .single();

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return NextResponse.json(
          { error: 'Kamu sudah punya ajuan yang menunggu untuk materi ini.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(ajuan);
  } catch (error: any) {
    console.error('Tutor request error:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server' }, { status: 500 });
  }
}
