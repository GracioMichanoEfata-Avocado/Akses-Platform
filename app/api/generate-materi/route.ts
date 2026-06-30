import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    // Pastikan guru sudah login
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Belum login' }, { status: 401 });
    }

    const formData = await req.formData();
    const text = formData.get('text') as string | null;
    const file = formData.get('file') as File | null;

    let materiText = text || '';
    let pdfParts: any[] = [];

    if (file && file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      pdfParts.push({
        inlineData: {
          data: base64,
          mimeType: 'application/pdf',
        },
      });
    } else if (file && file.type === 'text/plain') {
      materiText = await file.text();
    }

    if (!materiText && pdfParts.length === 0) {
      return NextResponse.json({ error: 'Tidak ada konten materi' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API belum dikonfigurasi' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `${materiText ? `Berikut adalah materi pelajaran:\n\n${materiText}\n\n` : ''}Berdasarkan materi di atas, buat konten pembelajaran yang inklusif untuk platform AKSES (platform belajar untuk siswa dengan disabilitas sensorik tunanetra dan tunarungu).

Buat dalam format JSON yang HANYA berisi JSON, tanpa penjelasan tambahan, tanpa markdown, tanpa backtick:
{
  "judul": "judul materi yang menarik dan deskriptif",
  "ringkasan": "ringkasan 3-4 kalimat yang jelas dan mudah dipahami",
  "poinUtama": ["poin 1", "poin 2", "poin 3", "poin 4", "poin 5", "poin 6"],
  "kuis": [
    {
      "pertanyaan": "pertanyaan yang jelas",
      "opsi": ["opsi A", "opsi B", "opsi C", "opsi D"],
      "jawabanBenar": 0,
      "penjelasan": "penjelasan mengapa jawaban ini benar"
    }
  ],
  "visualisasi": [
    {
      "judul": "nama konsep",
      "emojiIkon": "emoji relevan",
      "deskripsi": "deskripsi visual 2-3 kalimat",
      "warna": "#hexcolor"
    }
  ],
  "audioDeskripsi": "narasi audio panjang minimal 200 kata yang menjelaskan seluruh materi secara detail dan ramah untuk siswa tunanetra"
}

Ketentuan:
- Buat tepat 5 soal kuis dengan tingkat kesulitan bervariasi
- Buat 3 visualisasi konsep utama
- audioDeskripsi harus sangat detail karena ini untuk siswa tunanetra
- Semua teks dalam Bahasa Indonesia
- jawabanBenar adalah index (0-3) dari array opsi
- Warna hex yang menarik dan kontras tinggi
- HANYA balas dengan JSON, tidak ada teks lain sama sekali`;

    const parts: any[] = [...pdfParts, { text: prompt }];
    const result = await model.generateContent(parts);
    const rawText = result.response.text();

    // Parse JSON
    let generated;
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      generated = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: 'AI gagal menghasilkan format yang benar. Coba lagi.' }, { status: 500 });
    }

    // Simpan materi ke database Supabase
    const { data: savedMaterial, error: materialError } = await supabase
      .from('materials')
      .insert({
        judul: generated.judul,
        mata_pelajaran: generated.judul,
        deskripsi: generated.ringkasan,
        mode: 'both',
        transkrip: generated.audioDeskripsi,
        thumbnail_color: generated.visualisasi?.[0]?.warna || '#1E40AF',
        thumbnail_emoji: generated.visualisasi?.[0]?.emojiIkon || '📘',
        is_ai_generated: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (materialError) {
      console.error('Error simpan material:', materialError);
      return NextResponse.json({ result: generated, saved: false });
    }

    // Simpan langkah dari poinUtama
    if (generated.poinUtama?.length > 0) {
      await supabase.from('material_steps').insert(
        generated.poinUtama.map((poin: string, idx: number) => ({
          material_id: savedMaterial.id,
          urutan: idx + 1,
          judul: `Poin ${idx + 1}`,
          deskripsi: poin,
        }))
      );
    }

    // Simpan kuis
    if (generated.kuis?.length > 0) {
      const { data: savedQuiz } = await supabase
        .from('quizzes')
        .insert({ material_id: savedMaterial.id, judul: `Kuis: ${generated.judul}` })
        .select()
        .single();

      if (savedQuiz) {
        await supabase.from('quiz_questions').insert(
          generated.kuis.map((soal: any) => ({
            quiz_id: savedQuiz.id,
            pertanyaan: soal.pertanyaan,
            pilihan: soal.opsi,
            jawaban_benar: soal.jawabanBenar,
            penjelasan: soal.penjelasan,
          }))
        );
      }
    }

    return NextResponse.json({ result: generated, saved: true, materialId: savedMaterial.id });

  } catch (error: any) {
    console.error('Generate materi error:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server' }, { status: 500 });
  }
}