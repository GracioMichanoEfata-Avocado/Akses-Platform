import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authorizeRoomAccess, Peran } from '@/lib/live/room-access';

export async function POST(req: NextRequest) {
  try {
    const { roomName } = await req.json();

    if (!roomName) {
      return NextResponse.json({ error: 'roomName wajib diisi' }, { status: 400 });
    }

    // Pastikan user sudah login
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Belum login' }, { status: 401 });
    }

    // Peran & nama diambil dari server, bukan dari body request: klien tidak
    // boleh menentukan siapa dirinya maupun muncul dengan nama orang lain.
    const { data: profile } = await supabase
      .from('profiles')
      .select('nama, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profil tidak ditemukan' }, { status: 403 });
    }

    const { data: session } = await supabase
      .from('live_sessions')
      .select('guru_id, status, room_name, tipe, student_id')
      .eq('room_name', roomName)
      .maybeSingle();

    const izin = authorizeRoomAccess(session, user.id, profile.role as Peran);
    if (!izin.allowed) {
      return NextResponse.json({ error: izin.reason }, { status: 403 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'LiveKit belum dikonfigurasi' }, { status: 500 });
    }

    // Buat token dengan izin sesuai peran
    const at = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: profile.nama,
      ttl: '4h', // token berlaku 4 jam
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,        // bisa kirim audio/video
      canSubscribe: true,      // bisa terima audio/video dari peserta lain
      canPublishData: true,    // bisa kirim data (subtitle, pertanyaan)
    });

    const token = await at.toJwt();
    const livekitUrl = process.env.LIVEKIT_URL;

    return NextResponse.json({ token, livekitUrl });
  } catch (error: any) {
    console.error('LiveKit token error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
