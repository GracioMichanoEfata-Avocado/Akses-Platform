import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { pcmBase64ToWavBase64, sampleRateFromMimeType } from '@/lib/audio/pcm-to-wav';

// SDK @google/generative-ai yang dipakai project ini belum mendukung model
// audio-output, jadi panggil REST endpoint Gemini TTS langsung.
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

async function synthesize(text: string, apiKey: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`TTS gagal (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const part = data?.candidates?.[0]?.content?.parts?.[0];
  const pcmBase64: string | undefined = part?.inlineData?.data;
  if (!pcmBase64) throw new Error('Respons TTS tidak berisi audio.');

  const sampleRate = sampleRateFromMimeType(part.inlineData.mimeType);
  const wavBase64 = pcmBase64ToWavBase64(pcmBase64, sampleRate);
  return `data:audio/wav;base64,${wavBase64}`;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Belum login' }, { status: 401 });
    }

    const { texts } = await req.json();
    if (!Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json({ error: 'Tidak ada teks narasi' }, { status: 400 });
    }
    if (texts.length > 20) {
      return NextResponse.json({ error: 'Terlalu banyak slide untuk digenerate sekaligus (maks 20).' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API belum dikonfigurasi' }, { status: 500 });
    }

    // Berurutan (bukan Promise.all): TTS lebih gampang kena rate limit
    // dibanding generate teks biasa kalau ditembak sekaligus untuk semua slide.
    const audios: string[] = [];
    for (const text of texts as string[]) {
      let lastErr: any = null;
      let ok = false;
      for (let attempt = 0; attempt < 3 && !ok; attempt++) {
        try {
          audios.push(await synthesize(String(text || '.').slice(0, 2000), apiKey));
          ok = true;
        } catch (e: any) {
          lastErr = e;
          const overload = /503|overloaded|high demand|unavailable|429/i.test(e?.message || '');
          if (!overload && attempt === 0) break;
          await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
        }
      }
      if (!ok) throw lastErr || new Error('Gagal generate audio narasi.');
    }

    return NextResponse.json({ audios });
  } catch (error: any) {
    console.error('Generate narration audio error:', error);
    return NextResponse.json({ error: error.message || 'Gagal generate audio narasi' }, { status: 500 });
  }
}
