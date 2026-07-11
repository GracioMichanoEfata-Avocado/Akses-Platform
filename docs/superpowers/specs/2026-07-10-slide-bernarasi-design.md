# Presentasi Slide Bernarasi — pengganti "video" untuk materi hasil AI

**Tanggal:** 2026-07-10
**Cakupan:** Menyimpan `visualisasi` yang sudah dihasilkan Gemini tetapi selama ini dibuang, lalu memutarnya sebagai presentasi slide bernarasi di halaman materi. Caption sinkron dengan sendirinya karena aplikasi yang menentukan pergantian slide.

**Di luar cakupan (dicatat untuk nanti):**
- **Video sungguhan (Veo).** Gemini via `@google/generative-ai` tidak bisa membuat video. Veo hidup di Vertex AI: SDK berbeda, service account, kuota, biaya per detik, generasi bermenit-menit. Dan setelah videonya jadi, subtitle sinkron **tetap** butuh transkrip bertimestamp — pekerjaan subtitle tidak hilang, malah bertambah.
- **Subtitle bertimestamp untuk video yang diupload guru.** Jalur upload + `/api/transcribe-video` sudah ada. Belum ada satu pun materi bervideo (0 dari 15), jadi tidak ada yang bisa diuji.
- **Halaman `/student/learn/ai-content/[id]`.** Ia membaca `localStorage` kunci `akses-library`, yang hanya terisi di browser guru saat generate. Siswa membukanya di browser lain → `localStorage` kosong → dialihkan pergi. Halaman itu tidak pernah bisa dipakai siswa. Bukan bagian pekerjaan ini; dicatat sebagai kode mati yang perlu dihapus atau disambungkan ke database.
- **`/api/send-notification`** masih mati; lihat koreksi di spec Ajuan Pendampingan.

---

## Keadaan sekarang

`/api/generate-materi` menerima PDF atau teks, mengirimnya ke Gemini, dan **sudah** menyimpan otomatis: `materials` (judul, ringkasan, `transkrip` dari `audioDeskripsi`), `material_steps` dari `poinUtama`, serta `quizzes` + `quiz_questions` dari `kuis`. Alur "unggah PDF, AI membuat materi dan kuis" **sudah berjalan**.

Yang hilang hanyalah video. Dan satu hal lagi: Gemini juga mengembalikan `visualisasi`, array objek `{ judul, emojiIkon, deskripsi, warna }`. Route hanya memakai `warna` dan `emojiIkon` **dari elemen pertama** untuk thumbnail (`app/api/generate-materi/route.ts:103-104`). Sisanya dibuang.

`visualisasi` sudah berbentuk slide. Pekerjaannya bukan membuat AI menghasilkan slide, melainkan berhenti membuangnya.

## Model data

### Kolom baru `materials.slides`

`jsonb`, boleh `null`. Ke-15 materi lama bernilai `null` dan tetap menampilkan player emoji seperti sekarang.

```sql
alter table public.materials add column slides jsonb;
```

Naskah lengkap beserta verifikasinya: `docs/sql/2026-07-10-slides.sql`.

Bentuk isinya — sama persis dengan yang sudah dikembalikan Gemini, tanpa transformasi:

```json
[
  { "judul": "Rantai Makanan", "emojiIkon": "🐟", "deskripsi": "Dua sampai tiga kalimat.", "warna": "#1E40AF" }
]
```

Disimpan sebagai `jsonb` dan bukan tabel tersendiri karena slide selalu dibaca utuh, berurutan, milik satu materi, dan tidak pernah di-query per baris.

### Perubahan prompt

Satu baris: `"Buat 3 visualisasi konsep utama"` menjadi 5–6, dan `deskripsi` diminta 3–4 kalimat agar cukup panjang untuk dinarasikan. Bentuk JSON-nya tidak berubah, jadi kode yang sudah ada tetap sah.

Route menyimpan `slides: generated.visualisasi ?? null`.

## Komponen

### 1. `parseSlides` — validasi bentuk (fungsi murni)

**File baru:** `lib/slides/slide-data.ts`
**Test baru:** `lib/slides/slide-data.test.ts`

Keluaran model bahasa bisa cacat: field hilang, tipe salah, array kosong, atau bukan array sama sekali. Slide cacat tidak boleh membuat halaman materi blank.

```ts
export interface Slide {
  judul: string;
  emojiIkon: string;
  deskripsi: string;
  warna: string;
}

/** Mengembalikan hanya slide yang sah. Array kosong berarti "tidak ada slide". */
export function parseSlides(raw: unknown): Slide[];
```

Aturan: `raw` bukan array → `[]`. Elemen bukan objek → dibuang. `judul` atau `deskripsi` kosong/bukan string → elemen dibuang. `emojiIkon` hilang → diisi `'📘'`. `warna` bukan hex enam digit → diisi `'#1E40AF'`.

### 2. `durasiBaca` — lama tampil tanpa TTS (fungsi murni)

**File:** sama.

```ts
export function durasiBaca(teks: string): number; // milidetik
```

Siswa tunarungu tidak mendengar narasi, jadi slide harus berganti berdasarkan perkiraan waktu baca. Asumsi 200 kata per menit, dibatasi minimal 4 detik dan maksimal 20 detik. Batas bawah mencegah slide pendek berkelebat; batas atas mencegah slide macet bila AI mengembalikan paragraf panjang.

### 3. `SlideshowPlayer`

**File baru:** `components/student/SlideshowPlayer.tsx`

Menerima `slides: Slide[]` dan `kontrasAktif: boolean`. Merender area slide (emoji besar di atas latar `warna`), judul, dan **caption berisi `deskripsi` slide yang sedang tampil**.

Kontrol: **Putar** / **Jeda**, **Sebelumnya**, **Berikutnya**.

Saat diputar, narasi slide dibacakan lewat `speak(judul + '. ' + deskripsi, 'interrupt')` dari `lib/hooks/useTalkback` — fungsi yang sama dipakai voice-nav, sehingga `isTTSSpeaking()` bernilai true selama narasi dan mikrofon tidak menangkap suaranya sendiri.

Pergantian slide: polling `isTTSSpeaking()` — pola yang sama sudah dipakai `useQuizVoice.waitTTSEnd()` dan dipilih di sana karena slot `onTTSEnd()` tunggal dan diperebutkan logika restart recognition. Bila TTS tidak pernah menyala (browser tanpa dukungan, atau siswa tunarungu), jatuh ke `durasiBaca(deskripsi)`.

Slide terakhir selesai → berhenti, kembali ke slide pertama, tombol kembali ke "Putar".

**Caption selalu tampil**, untuk semua mode. Itu inti nilainya bagi tunarungu, dan tidak merugikan siapa pun.

**Tidak ada perintah suara halaman yang didaftarkan.** `lib/hooks/useVoiceNavigation.ts:112` berhenti mencocokkan tombol hasil auto-scan begitu sebuah halaman punya perintah khusus; mendaftarkan "putar"/"lanjut" di sini akan mematikan suara untuk "minta pendamping" dan "lanjut ke kuis" di halaman yang sama. `scanClickables` sudah menurunkan kata kunci `putar`, `lanjut`, `sebelumnya` dari teks tombol.

### 4. Halaman materi memilih player

**File:** `app/student/learn/[id]/page.tsx`

Urutan: ada `video_url` → player video (seperti sekarang). Tidak ada video tapi ada `slides` → `SlideshowPlayer`. Keduanya tidak ada → player emoji (seperti sekarang).

`filter: kontrasAktif ? FILTER_KONTRAS : undefined` sudah diterapkan pada kontainer player, jadi slide ikut terfilter tanpa kode tambahan.

## Konsekuensi yang diketahui

- **Materi lama tidak punya slide.** Untuk melihatnya bekerja, guru harus meng-generate materi baru dari PDF. Tidak ada migrasi; `slides` mereka `null`.
- **Panjang narasi bergantung kepatuhan Gemini.** Bila `deskripsi` yang dihasilkan terlalu pendek, slide berganti cepat. Ini soal prompt dan hanya bisa disetel setelah ada satu materi hasil generate sungguhan.
- **Emoji sebagai visual.** Slide-nya bukan gambar, melainkan emoji besar di atas warna latar. Itu yang dihasilkan Gemini hari ini. Menaikkannya ke gambar sungguhan adalah pekerjaan lain.
- Halaman materi bertambah satu kolom yang dibaca; tidak ada query tambahan.

## Kriteria sukses

**Unit test** (`npx vitest run lib/slides`):
- `parseSlides` pada: bukan array, array kosong, elemen bukan objek, `judul` hilang, `deskripsi` bukan string, `emojiIkon` hilang → default, `warna` cacat → default, dan slide sah lolos utuh.
- `durasiBaca` pada: teks pendek → 4000 ms; teks panjang → dibatasi 20000 ms; teks sedang → sebanding panjang.

**Verifikasi statis:** `npx tsc --noEmit` bersih; `npm run build` sukses.

**Verifikasi lawan Supabase nyata:**
- `alter table` sukses; ke-15 materi lama bernilai `slides = null`.
- Generate materi baru dari PDF → baris `materials` punya `slides` berisi 5–6 objek, dan `parseSlides` menerima semuanya.

**Verifikasi manual:**
- Materi lama → player emoji, persis seperti sebelumnya.
- Materi baru → slideshow. Tekan Putar: narasi terdengar, slide berganti sendiri saat narasi selesai, caption ikut berganti.
- Mode tunarungu (suara mati) → slide tetap berganti sendiri berdasarkan waktu baca.
- Mode tunanetra → tombol Filter Kontras mengubah tampilan slide.
- Mode tunanetra, voice-nav aktif → ucapkan "putar" → slideshow berjalan; ucapkan "minta pendamping" → **tetap** berfungsi.
