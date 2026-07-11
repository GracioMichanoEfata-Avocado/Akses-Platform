// Mengambil objek JSON dari keluaran model bahasa yang mungkin kotor:
// terbungkus pagar markdown, didahului kalimat pengantar, atau diikuti prosa.
// Fungsi murni agar bisa diuji tanpa memanggil model.

export function extractJson<T = any>(raw: string): T {
  const teks = (raw ?? '').trim();
  if (!teks) throw new Error('Respons AI kosong.');

  // Buang pagar markdown bila ada.
  const tanpaPagar = teks.replace(/```json/gi, '').replace(/```/g, '').trim();

  // Coba parse langsung dulu (kasus paling umum: JSON murni).
  try {
    return JSON.parse(tanpaPagar) as T;
  } catch {
    // Lanjut ke ekstraksi kurung.
  }

  // Ambil dari kurung buka pertama sampai kurung tutup terakhir. Menangani
  // kalimat pengantar/penutup di luar objek. Tidak menangani JSON terpotong
  // di tengah — itu masalah batas token, bukan pembungkusan.
  const mulai = tanpaPagar.indexOf('{');
  const selesai = tanpaPagar.lastIndexOf('}');
  if (mulai === -1 || selesai === -1 || selesai <= mulai) {
    throw new Error('Tidak ada objek JSON dalam respons AI.');
  }

  return JSON.parse(tanpaPagar.slice(mulai, selesai + 1)) as T;
}
