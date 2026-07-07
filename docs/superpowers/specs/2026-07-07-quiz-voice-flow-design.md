# Quiz Voice Flow — Design Spec

**Tanggal:** 2026-07-07
**Status:** Disetujui untuk implementasi
**Scope:** Fitur voice command untuk halaman kuis (`app/student/quiz/[id]/page.tsx`), khusus mode aksesibilitas tunanetra/keduanya.

## 1. Latar Belakang

Platform AKSES punya sistem voice navigation (`useVoiceNavigation` + `TalkbackProvider`) yang aktif saat mode aksesibilitas = `tunanetra` atau `both`. Saat ini halaman kuis belum terhubung ke sistem suara sama sekali. Siswa tunanetra tidak bisa mengerjakan kuis secara mandiri: soal tidak dibacakan, pilihan tidak bisa dipilih via suara, timer tidak terdengar, dan nilai tidak diumumkan.

Spec ini adalah **pekerjaan ① dari 3** yang dipecah dari permintaan besar:
- **③ (spec ini):** Quiz voice flow — dikerjakan pertama.
- **② (terpisah):** Global voice — auto-scan tombol + "bacakan konten".
- **① (terpisah):** Bug fix penuh — izin mic/kamera bikin kepental ke login (soal kamera perlu direproduksi).

## 2. Tujuan & Kriteria Sukses

Siswa tunanetra dapat menyelesaikan satu kuis dari awal sampai nilai keluar **tanpa melihat layar**:

1. Saat masuk kuis, instruksi + soal pertama dibacakan otomatis.
2. Bisa memilih jawaban A/B/C/D via suara, dan **menggantinya** sebelum dikunci.
3. Bilang "lanjut" → jawaban dikunci → feedback benar/salah + jawaban benar + penjelasan dibacakan → otomatis pindah soal.
4. Timer mengingatkan sisa waktu tiap 1 menit via suara.
5. Saat nilai keluar, nilai + pesan lulus/gagal dibacakan.
6. Perilaku siswa **non-tunanetra tidak berubah sama sekali**.

## 3. Batasan (Non-Goals)

- Tidak mengubah UI visual kuis untuk pengguna awas.
- Tidak menangani perbaikan penuh bug kamera/login (① — terpisah). Spec ini hanya menambah **guard minimal**: voice-nav tidak aktif di `/student/login` supaya kuis bisa dites.
- Tidak menyentuh alur remedial selain membacakan ajakan mencoba remedial saat gagal.

## 4. Arsitektur

### 4.1 Hook baru: `lib/hooks/useQuizVoice.ts`

Satu hook yang mengumpulkan seluruh logika suara kuis, dipanggil dari `quiz/[id]/page.tsx`. Menggunakan `speak()`, `onTTSEnd()` (dari `useTalkback`) dan `registerPageCommands()` (dari `TalkbackContext`). Aktif hanya jika `mode` ∈ {`tunanetra`, `both`}.

**Input (props):**
- `soal: Soal[]`, `currentIdx: number`, `showResult: boolean`, `timeLeft: number`
- `selectedIdx: number | null`, `lockedAnswer: AnswerState | undefined`
- `materialJudul: string`, `percentage: number`
- callbacks: `onSelect(idx)`, `onLanjut()`, `isTunanetra: boolean`

**Tanggung jawab:**
- Membacakan soal saat `currentIdx` berubah (dan instruksi awal di soal pertama).
- Mendaftarkan perintah suara A/B/C/D + "lanjut" + "ulangi".
- Mengumumkan sisa waktu tiap kelipatan menit.
- Mengumumkan nilai saat `showResult` menjadi true.

### 4.2 Fungsi murni (dapat di-unit-test)

Diletakkan di `lib/voice/quiz-speech.ts`:
- `buildQuestionSpeech(soal, index, total, withIntro): string` — merangkai teks "Soal nomor X … Pilihan A: … B: …".
- `buildFeedbackSpeech(soal, selectedIdx): string` — "Benar!…" / "Kurang tepat. Jawaban yang benar…" + penjelasan.
- `buildTimeReminder(secondsLeft): string | null` — kembalikan teks hanya di kelipatan 60 detik (>0), selain itu `null`.
- `buildScoreSpeech(percentage, materialJudul): string` — pesan lulus (≥70) / gagal (<70).

### 4.3 Perubahan state di `quiz/[id]/page.tsx`

Tambah state transient `selectedIdx: number | null` (pilihan yang belum dikunci) **khusus mode voice**.

- Mode voice: `handleSelect` via suara set `selectedIdx` saja (belum `answered`). "lanjut" mengunci: tulis ke `answers[currentIdx]`, jalankan feedback, lalu `handleNext`.
- Mode non-voice: alur lama dipertahankan — klik pilihan langsung `answered:true` (kunci instan). Tidak ada perubahan perilaku.

Guard: perintah "lanjut" saat `selectedIdx === null` (belum memilih) → ditolak, suara: "Anda belum memilih jawaban. Katakan A, B, C, atau D." Tetap di soal.

### 4.4 Perubahan infrastruktur voice

**a. Word-level matching untuk `PageVoiceCommand`.**
`PageVoiceCommand` ditambah field opsional `matchType?: 'includes' | 'word'` (default `'includes'`). Di `useVoiceNavigation.processCommand`, saat mencocokkan page command:
- `'includes'` (default) → perilaku lama (`lower.includes(keyword)`).
- `'word'` → cocok hanya bila keyword muncul sebagai kata utuh (`lower.split(/\s+/).includes(keyword)`).

Perintah A/B/C/D memakai `matchType: 'word'` supaya huruf "a" tidak cocok dengan sembarang kata. (Tanpa ini, `.includes('a')` cocok dengan hampir semua transkrip — bug.)

**b. Guard login.**
Di `TalkbackProvider`, voice navigation tidak diaktifkan saat `pathname` diawali `/student/login`. Ini prasyarat agar memilih tunanetra di layar setup tidak memicu bug kepental (①).

## 5. Alur Detail

### 5.1 Masuk kuis / pindah soal
`currentIdx` berubah → `buildQuestionSpeech`. Di soal pertama `withIntro=true`:
> "Kuis dimulai, ada N soal. Katakan A, B, C, atau D untuk menjawab. Katakan 'lanjut' untuk pindah soal, atau 'ulangi' untuk mendengar soal lagi. Soal nomor 1. [pertanyaan]. Pilihan A: [..]. B: [..]. C: [..]. D: [..]."

Soal berikutnya tanpa intro.

### 5.2 Memilih jawaban
Ucapan "A"/"pilihan a"/"jawaban a" (dan B/C/D) → `onSelect(idx)` set `selectedIdx`. Konfirmasi: "Pilihan A dipilih." Bisa diucap ulang huruf lain untuk mengganti.

### 5.3 "lanjut"
- Jika `selectedIdx === null` → tolak (lihat 4.3).
- Jika sudah memilih → kunci jawaban → `buildFeedbackSpeech` dibacakan:
  - Benar: "Benar! Jawaban Anda tepat. [penjelasan]"
  - Salah: "Kurang tepat. Jawaban yang benar adalah [huruf]: [teks]. [penjelasan]"
- `onTTSEnd` → `handleNext` (pindah soal / ke hasil). Reset `selectedIdx = null`.

### 5.4 "ulangi"
Bacakan ulang `buildQuestionSpeech(withIntro=false)` untuk soal saat ini.

### 5.5 Timer
Tiap detik `timeLeft` turun. Saat `buildTimeReminder(timeLeft)` mengembalikan teks (kelipatan 60, >0), diucapkan: "Waktu tersisa 4 menit." Diucapkan dengan prioritas `normal` agar tidak memotong pembacaan soal secara kasar.

### 5.6 Nilai keluar
`showResult` menjadi true → `buildScoreSpeech`:
- ≥70: "Selamat, nilai Anda [X]. Anda telah menyelesaikan kelas [judul materi]."
- <70: "Maaf, nilai Anda [X]. Nilai quiz belum mencukupi. Anda bisa mencoba kuis remedial."

Ambang lulus mengikuti kode yang ada: `pct >= 70`.

## 6. File yang Disentuh

| File | Aksi |
|---|---|
| `lib/voice/quiz-speech.ts` | **Baru** — fungsi murni pembentuk teks |
| `lib/hooks/useQuizVoice.ts` | **Baru** — hook orkestrasi suara kuis |
| `app/student/quiz/[id]/page.tsx` | Edit — state `selectedIdx`, panggil hook, cabang mode voice |
| `components/accessibility/TalkbackProvider.tsx` | Edit — field `matchType`, guard `/student/login` |
| `lib/hooks/useVoiceNavigation.ts` | Edit — dukung `matchType: 'word'` |

## 7. Rencana Testing

**Unit test** (`lib/voice/quiz-speech.test.ts`) — tanpa mic:
- `buildQuestionSpeech` menyertakan intro hanya saat `withIntro=true`; format huruf A–D benar.
- `buildFeedbackSpeech` benar untuk jawaban benar & salah; menyebut jawaban benar saat salah.
- `buildTimeReminder` mengembalikan teks hanya di 240/180/120/60 detik; `null` di antaranya dan di 0.
- `buildScoreSpeech` pilih pesan lulus/gagal di ambang 70 (69→gagal, 70→lulus).

**Manual (Chrome)** — full flow: masuk kuis dengar instruksi+soal, pilih & ganti jawaban, "lanjut" dengar feedback + pindah, dengar pengingat menit, dengar nilai akhir. Verifikasi mode non-tunanetra tidak berubah.

## 8. Risiko & Catatan

- **Akurasi STT huruf tunggal.** "A/B/C/D" bisa ditranskrip beragam (mis. "ah", "be", "de"). Sediakan sinonim keyword per huruf; jika masih meleset, opsi lanjutan: dukung ucapan isi pilihan (di luar scope v1).
- **Testing terhambat bug ①.** Guard login (4.4b) cukup untuk masuk mode tunanetra tanpa kepental. Investigasi kamera penuh tetap terpisah.
- **Ambang lulus** memakai `>=70` sesuai kode; jika kebijakan berubah ke strict `>70`, sesuaikan `buildScoreSpeech` dan `saveQuizResult`.
