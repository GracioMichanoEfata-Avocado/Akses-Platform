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

Soal remedial WAJIB berisi TEPAT 5 objek — tidak boleh kurang, tidak boleh lebih. Soal HARUS BERBEDA dari kuis sebelumnya tapi tetap menguji konsep yang sama dari materi ini, dengan tingkat kesulitan tersebut.

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

    // Kadang jumlah soal yang dihasilkan meleset dari 5 walau sudah diminta
    // eksplisit — dicoba ulang beberapa kali sebelum menyerah.
    let generated: any = null;
    let lastErr: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        const rawText = result.response.text();
        const cleaned = rawText.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        if (!Array.isArray(parsed.soal) || parsed.soal.length === 0) {
          throw new Error('AI tidak menghasilkan array soal.');
        }
        if (parsed.soal.length > 5) {
          parsed.soal = parsed.soal.slice(0, 5);
        } else if (parsed.soal.length < 5) {
          throw new Error(`AI cuma menghasilkan ${parsed.soal.length} soal remedial, bukan 5.`);
        }

        generated = parsed;
        lastErr = null;
        break;
      } catch (e: any) {
        lastErr = e;
        if (attempt === 2) break;
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }

    if (lastErr || !generated) {
      console.error('Generate remedial gagal:', lastErr?.message);
      return NextResponse.json(
        { error: 'AI gagal menghasilkan 5 soal remedial yang valid. Coba lagi.' },
        { status: 500 }
      );
    }

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