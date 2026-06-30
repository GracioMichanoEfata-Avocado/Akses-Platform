import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { hitungFuzzyRemedial } from '@/lib/utils/fuzzyLogic';

const TINGKAT_LABEL: Record<string, string> = {
  sangat_mudah: 'SANGAT MUDAH (level dasar, jawaban hampir eksplisit di pertanyaan, fokus mengingat fakta sederhana)',
  mudah: 'MUDAH (level dasar-menengah, konsep kunci saja, tidak ada jebakan)',
  sedang: 'SEDANG (level menengah, sedikit penalaran tapi masih straightforward)',
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Belum login' }, { status: 401 });

    const { materialId, quizId, skorAwal } = await req.json();
    if (!materialId || skorAwal === undefined) {
      return NextResponse.json({ error: 'materialId dan skorAwal wajib diisi' }, { status: 400 });
    }

    // ── Hitung fuzzy logic untuk tentukan tingkat kesulitan ──
    const fuzzy = hitungFuzzyRemedial(skorAwal);

    // Ambil materi untuk konteks
    const { data: material } = await supabase
      .from('materials')
      .select('judul, deskripsi, transkrip')
      .eq('id', materialId)
      .single();

    if (!material) return NextResponse.json({ error: 'Materi tidak ditemukan' }, { status: 404 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Gemini API belum dikonfigurasi' }, { status: 500 });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Kamu adalah guru yang membuat soal remedial untuk siswa yang belum lulus kuis.

Materi: "${material.judul}"
Deskripsi: ${material.deskripsi}
${material.transkrip ? `Konten: ${material.transkrip.substring(0, 1500)}` : ''}

Siswa mendapat nilai ${skorAwal} dari 100 (standar lulus 70). Berdasarkan analisis fuzzy logic, tingkat kesulitan soal remedial yang harus dibuat adalah: ${TINGKAT_LABEL[fuzzy.tingkat]}.

Buat 5 soal remedial pilihan ganda dalam Bahasa Indonesia dengan tingkat kesulitan tersebut. Soal HARUS BERBEDA dari kuis sebelumnya tapi tetap menguji konsep yang sama dari materi ini.

Balas HANYA dengan JSON, tanpa markdown, tanpa penjelasan:
{
  "soal": [
    {
      "pertanyaan": "pertanyaan yang jelas dan sesuai tingkat kesulitan",
      "opsi": ["opsi A", "opsi B", "opsi C", "opsi D"],
      "jawabanBenar": 0,
      "penjelasan": "penjelasan singkat dan mudah dipahami mengapa jawaban ini benar"
    }
  ]
}`;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    const generated = JSON.parse(cleaned);

    // Simpan attempt remedial ke database
    const { data: attempt, error } = await supabase
      .from('remedial_attempts')
      .insert({
        student_id: user.id,
        material_id: materialId,
        quiz_id: quizId || null,
        skor_awal: skorAwal,
        tingkat_remedial: fuzzy.tingkat,
        soal_remedial: generated.soal,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      attemptId: attempt.id,
      soal: generated.soal,
      tingkatRemedial: fuzzy.tingkat,
      deskripsiFuzzy: fuzzy.deskripsi,
    });

  } catch (error: any) {
    console.error('Generate remedial error:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server' }, { status: 500 });
  }
}