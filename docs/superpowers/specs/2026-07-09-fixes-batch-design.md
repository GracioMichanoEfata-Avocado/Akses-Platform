# Batch Fixes — S1 (bounce login), T3 (nama guru), T2 (hapus onboarding)

**Tanggal:** 2026-07-09
**Cakupan:** Tiga perbaikan kecil dan terisolasi yang disepakati untuk dikerjakan lebih dulu sebelum item besar (katalog materi berbasis disabilitas, verifikasi kuis suara, transkrip live). Masing-masing berdiri sendiri; tidak ada ketergantungan antar-fix.

**Di luar cakupan (dicatat untuk nanti):**
- **Audit pemisahan akses guru vs murid** (RLS Supabase + cek role di `middleware.ts`). Disepakati ditunda; hanya dicatat, tidak dikerjakan di batch ini.
- S2 (rombak katalog), S3 (verifikasi kuis suara), T1 (transkrip live).

---

## S1 — Pilih tunanetra/keduanya kepental balik ke login + minta izin mic & kamera

### Gejala
Setelah login siswa, pada layar setup aksesibilitas, memilih mode **Tunanetra** atau **Keduanya** lalu menekan "Simpan & Lanjutkan" menyebabkan: (a) muncul permintaan izin **mikrofon dan kamera**, dan (b) pengguna terpental kembali ke halaman login siswa.

### Akar masalah
Di `app/student/login/page.tsx`, `handleSaveSetup()` memutar narasi selamat datang memakai **`window.speechSynthesis.speak()` langsung** (baris ~95–104), bukan lewat `speak()` dari `lib/hooks/useTalkback`.

Konsekuensinya:
1. `router.push('/student/dashboard')` mengaktifkan `TalkbackProvider` → `useVoiceNavigation` mulai mendengar (izin **mic**).
2. Guard anti-dengar-sendiri di `useVoiceNavigation` (`rec.onresult` bail bila `isTTSSpeaking()`) hanya mengenali TTS yang diputar via `speak()`. Karena narasi selamat datang diputar di luar jalur itu, `isTTSSpeaking()` bernilai `false` saat narasi berbunyi.
3. Mikrofon menangkap frasa **"Kelas Live"** yang ada di teks narasi → cocok dengan `STATIC_COMMANDS` → `window.location.href = '/student/live'`.
4. Halaman live memakai LiveKit → memicu permintaan izin **kamera + mic**; hard-navigation itu juga membuat middleware sempat tidak melihat sesi (race cookie SSR) → redirect balik ke `/student/login`.

### Perbaikan
Salurkan narasi selamat datang lewat `speak()` dari `lib/hooks/useTalkback` (fungsi yang sama dipakai voice-nav), sehingga `isTTSSpeaking()` bernilai `true` selama narasi dan guard menekan input mic. Voice-nav baru memproses perintah setelah narasi selesai.

- **File:** `app/student/login/page.tsx`
- **Perubahan:** Ganti blok `new SpeechSynthesisUtterance(...)` + `window.speechSynthesis.speak(...)` di `handleSaveSetup` dengan pemanggilan `speak(welcomeText, 'interrupt')`. Impor `speak` dari `@/lib/hooks/useTalkback`. Pertahankan teks narasi dan kondisi `isTunanetra`.
- **Catatan:** `speak()` sudah menangani pemilihan voice `id-ID` dan rate; tidak perlu logika `getVoices()` manual lagi. Verifikasi perilaku ini saat baca `useTalkback.ts` sebelum menghapus.

### Kriteria sukses
- Login siswa → pilih **Keduanya** → "Simpan & Lanjutkan" → mendarat di `/student/dashboard` dan tetap di sana.
- Hanya izin **mikrofon** yang diminta (untuk voice-nav). **Tidak** ada permintaan izin kamera.
- Narasi selamat datang terdengar penuh tanpa memicu navigasi liar ke Kelas Live.
- Mode **Tidak Ada** tetap seperti sebelumnya (tanpa suara, tanpa mic).

---

## T3 — Nama guru di sidebar tidak ikut ter-update saat edit profil

### Gejala
Mengedit profil guru memperbarui data di dashboard, tetapi label di kotak "Mode Guru" pada sidebar tetap menampilkan nama lama.

### Akar masalah
`components/shared/TeacherSidebar.tsx:73` menampilkan string **hardcode** `"Bu Sari Dewi"`, tidak pernah membaca data profil.

### Perbaikan
Jadikan `TeacherSidebar` mengambil nama guru yang **sedang login** dari tabel `profiles`, mengikuti pola yang sudah dipakai `app/teacher/profile/page.tsx`:

```ts
const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  const { data } = await supabase.from('profiles').select('nama').eq('id', user.id).single();
  setNama(data?.nama ?? '');
}
```

- **File:** `components/shared/TeacherSidebar.tsx`
- **Perubahan:** Tambah `'use client'` sudah ada; tambah state `nama`, `useEffect` fetch sekali saat mount, render `nama` (fallback teks netral mis. "Guru" saat loading/null) menggantikan `"Bu Sari Dewi"` di baris 73.
- **Keamanan/pemisahan:** Data yang dibaca adalah milik user yang login sendiri (`id = user.id`). Murid tidak pernah me-render `TeacherSidebar` dan `middleware.ts` memblok murid dari rute `/teacher/*`; pemisahan akses tetap dijaga di middleware + RLS, bukan di komponen ini. Fix ini tidak menambah risiko akses silang.

### Kriteria sukses
- Sidebar guru menampilkan nama guru yang login (bukan "Bu Sari Dewi").
- Setelah edit nama di `/teacher/profile/edit` lalu kembali/refresh, sidebar menampilkan nama baru.

---

## T2 — Hapus menu & halaman onboarding guru

### Konteks
`app/teacher/onboarding/page.tsx` adalah **wizard demo tanpa persistensi**: seluruh input (nama, mata pelajaran, kebutuhan, "upload") hanya state lokal; tidak ada koneksi Supabase; tombol akhir hanya `router.push('/teacher/dashboard')`. Fungsi aslinya sudah tersedia dan berfungsi di menu lain: ganti nama/profil di `/teacher/profile/edit`, upload materi di `/teacher/upload-materi`. Menghapusnya tidak menghilangkan fungsi apa pun.

Referensi ke onboarding hanya ada di dua tempat (hasil grep): link di `TeacherSidebar.tsx` dan halaman itu sendiri. Tidak ada redirect otomatis ke onboarding.

### Perbaikan
1. Hapus item `{ href: '/teacher/onboarding', label: 'Onboarding', icon: UserPlus }` dari array `navItems` di `components/shared/TeacherSidebar.tsx`. Hapus juga impor ikon `UserPlus` bila tidak lagi terpakai.
2. Hapus folder rute `app/teacher/onboarding/` (file `page.tsx`).

### Kriteria sukses
- Menu "Onboarding" hilang dari sidebar guru.
- Membuka `/teacher/onboarding` menghasilkan 404 (rute tidak ada lagi).
- Tidak ada import/referensi yang menggantung; `npx tsc --noEmit` tidak menambah error baru; `npm run build` sukses.

---

## Verifikasi keseluruhan
- `npx tsc --noEmit` — tidak ada error baru terkait file yang disentuh.
- `npm run build` — sukses.
- Uji manual singkat: (S1) alur login siswa mode Keduanya; (T3) tampilan nama sidebar guru + setelah edit; (T2) menu hilang & URL 404.
