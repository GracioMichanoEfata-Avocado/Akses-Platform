import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { roomName, participantName, isTeacher } = await req.json();

    if (!roomName || !participantName) {
      return NextResponse.json({ error: 'roomName dan participantName wajib diisi' }, { status: 400 });
    }

    // Pastikan user sudah login
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Belum login' }, { status: 401 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'LiveKit belum dikonfigurasi' }, { status: 500 });
    }

    // Buat token dengan izin sesuai peran
    const at = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: participantName,
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