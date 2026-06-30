import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Belum login' }, { status: 401 });

    const { materialId, videoUrl } = await req.json();
    if (!materialId || !videoUrl) {
      return NextResponse.json({ error: 'materialId dan videoUrl wajib diisi' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Gemini API belum dikonfigurasi' }, { status: 500 });

    // Download video dari Supabase Storage
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) return NextResponse.json({ error: 'Gagal mengambil video dari storage' }, { status: 500 });

    const videoBuffer = await videoRes.arrayBuffer();
    const videoBase64 = Buffer.from(videoBuffer).toString('base64');

    // Deteksi mime type dari URL
    const ext = videoUrl.split('.').pop()?.toLowerCase() || 'mp4';
    const mimeMap: Record<string, string> = {
      mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo',
      webm: 'video/webm', mkv: 'video/x-matroska',
    };
    const mimeType = mimeMap[ext] || 'video/mp4';

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

    const result = await model.generateContent([
      {
        inlineData: { data: videoBase64, mimeType },
      },
      {
        text: `Kamu adalah asisten transkripsi untuk platform pendidikan inklusif AKSES yang melayani siswa tunanetra dan tunarungu.

Tugas kamu: buat transkripsi lengkap dan deskriptif dari video ini dalam Bahasa Indonesia.

Format transkripsi:
- Tuliskan semua yang diucapkan secara verbatim
- Tambahkan deskripsi visual dalam tanda kurung siku untuk siswa tunanetra, contoh: [Guru menunjuk diagram di papan tulis] [Gambar sel tumbuhan ditampilkan]
- Tambahkan keterangan suara penting: [Suara tepuk tangan] [Musik latar]
- Jika ada teks/tulisan di layar, transkripkan juga: [Teks di layar: "Fotosintesis adalah..."]
- Format paragraf per topik/segmen yang dibahas
- Awali dengan ringkasan singkat 2-3 kalimat tentang isi video

Hasil transkripsi harus detail dan bermanfaat bagi siswa yang tidak bisa menonton video secara visual.`,
      },
    ]);

    const transkrip = result.response.text();

    // Simpan ke database
    const { error } = await supabase
      .from('materials')
      .update({ transkrip })
      .eq('id', materialId);

    if (error) return NextResponse.json({ error: 'Gagal simpan transkripsi: ' + error.message }, { status: 500 });

    return NextResponse.json({ transkrip });

  } catch (error: any) {
    console.error('Transcribe error:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server' }, { status: 500 });
  }
}