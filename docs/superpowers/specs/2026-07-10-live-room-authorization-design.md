# Otorisasi Ruang Live — `/api/livekit-token`

**Tanggal:** 2026-07-10
**Cakupan:** Menutup lubang otorisasi pada penerbitan token LiveKit. Route berhenti mempercayai data dari klien dan memverifikasi ke database bahwa pemanggil berhak masuk ruang yang dimintanya.

Ini adalah **potong 1 dari tiga** pekerjaan yang disepakati saat brainstorming fitur "Ajuan Pendampingan". Potong 1 murni perbaikan bug keamanan dan berdiri sendiri — tidak menambah fitur, tidak menyentuh skema database.

**Di luar cakupan (dicatat untuk nanti):**
- **Potong 2 — Ajuan Pendampingan.** Tabel `tutor_requests`, tombol siswa berbasis status, kartu ajuan di dashboard guru, notifikasi balik ke siswa. Butuh SQL manual di Supabase.
- **Potong 3 — Sesi privat.** Kolom `tipe` dan `student_id` pada `live_sessions`; halaman live siswa memilih sesi privat miliknya sebelum kelas umum; `authorizeRoomAccess` diperluas untuk mengenali sesi privat. Bergantung pada potong 1.
- **Penyempitan izin token** (`canPublish`, `canPublishData`). Lihat "Yang sengaja tidak diubah".
- **Cek peran di `lib/supabase/middleware.ts`.** Middleware hanya memeriksa user login, bukan `role`, sehingga akun siswa bisa membuka `/teacher/*`. Sudah tercatat sebagai ditunda di `2026-07-09-fixes-batch-design.md`; tetap ditunda.

---

## Gejala

Tidak ada gejala yang terlihat pengguna. Ini lubang yang hanya tampak saat membaca kode.

`app/api/livekit-token/route.ts` menerima `roomName`, `participantName`, dan `isTeacher` dari body request, memeriksa bahwa pemanggil sudah login, lalu langsung menerbitkan `AccessToken` untuk ruang itu.

Akibatnya, setiap akun yang sudah login dapat:

1. **Masuk ruang mana pun** yang nama ruangnya diketahui atau ditebak. `room_name` dibentuk dari judul sesi (`app/teacher/create-session/page.tsx:49`), jadi tidak acak dan bisa ditebak.
2. **Mengaku bernama siapa pun.** `participantName` dipakai apa adanya sebagai nama tampilan di ruangan, sehingga siswa dapat muncul dengan nama gurunya.
3. `isTeacher` dikirim klien dan saat ini tidak dipakai sama sekali di route — nilainya diabaikan. Field ini menyesatkan pembaca dan harus dihapus.

Lubang ini sudah ada sekarang, bahkan tanpa fitur tutorial privat. Ia menjadi kritis begitu potong 3 dikerjakan, karena sesi privat satu lawan satu akan bisa dimasuki siswa lain.

## Akar masalah

Route memperlakukan body request sebagai sumber kebenaran untuk tiga hal yang seluruhnya sudah tersedia di sisi server: identitas pemanggil (dari sesi Supabase), perannya (dari `profiles.role`), dan sesi yang bersangkutan (dari `live_sessions.room_name`).

## Perbaikan

### 1. Fungsi murni `authorizeRoomAccess`

**File baru:** `lib/live/room-access.ts`
**Test baru:** `lib/live/room-access.test.ts`

Keputusan izin ditarik keluar dari route agar dapat di-unit-test tanpa jaringan maupun Supabase, mengikuti pola `lib/voice/*.ts` yang sudah ada di repo.

```ts
export interface LiveSessionRow {
  guru_id: string;
  status: string;          // 'scheduled' | 'live' | 'ended'
  room_name: string;
}

export type Peran = 'teacher' | 'student';

export interface AccessResult {
  allowed: boolean;
  reason: string;          // alasan penolakan; string kosong bila diizinkan
}

export function authorizeRoomAccess(
  session: LiveSessionRow | null,
  userId: string,
  peran: Peran
): AccessResult;
```

Aturan, diperiksa berurutan:

| Kondisi | Hasil |
|---|---|
| `session` null (ruang tak dikenal) | tolak — "Ruang tidak ditemukan" |
| peran `teacher` dan `session.guru_id === userId` | izinkan |
| peran `teacher` dan `guru_id` bukan dirinya | tolak — "Anda bukan pengajar sesi ini" |
| peran `student` dan `session.status === 'live'` | izinkan |
| peran `student` dan status selain `live` | tolak — "Sesi belum dimulai" |

Guru diizinkan pada status apa pun — termasuk `scheduled` — karena `startSession()` di `app/teacher/actions/page.tsx` mengambil token tepat setelah menyetel status menjadi `live`, dan mengizinkan `scheduled` menghilangkan ketergantungan pada urutan itu. Guru dari sesi yang sudah `ended` juga masih boleh; tidak ada kerugian, dan ruangnya sudah kosong.

### 2. Route memakai fungsi itu

**File:** `app/api/livekit-token/route.ts`

Perubahan:

1. Body request hanya menerima `roomName`. Hapus `participantName` dan `isTeacher` dari destructuring.
2. Setelah `getUser()`, ambil profil pemanggil: `supabase.from('profiles').select('nama, role').eq('id', user.id).single()`. Bila profil tidak ada, kembalikan 403.
3. Ambil sesi: `supabase.from('live_sessions').select('guru_id, status, room_name').eq('room_name', roomName).maybeSingle()`.
4. Panggil `authorizeRoomAccess(session, user.id, profile.role)`. Bila `allowed` bernilai false, kembalikan `403` dengan `{ error: reason }`.
5. Nama peserta pada `AccessToken` diambil dari `profile.nama`, bukan dari body.

Sisa route — pembacaan `LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET`, `addGrant`, `toJwt()`, bentuk respons `{ token, livekitUrl }` — tidak berubah.

### 3. Pemanggil berhenti mengirim field yang tidak dipakai

**File:** `app/teacher/actions/page.tsx` (fungsi `getToken`, ~baris 258)
**File:** `app/student/live/page.tsx` (dalam `init()`, ~baris 238)

Keduanya mengirim `body: JSON.stringify({ roomName, participantName, isTeacher })`. Sisakan `{ roomName }` saja.

Kedua pemanggil berbeda nasib soal `profiles.nama`:

- Di `app/teacher/actions/page.tsx`, `profile.nama` masih dipakai untuk `setTeacherName()` dan ditampilkan di UI. Pertahankan pengambilannya.
- Di `app/student/live/page.tsx`, `profile.nama` **hanya** dipakai sebagai `participantName`. Setelah field itu hilang, variabelnya menganggur. Hapus sekalian query `profiles` di `init()` — halaman siswa tidak lagi perlu tahu namanya sendiri, karena route yang menentukannya.

## Yang sengaja tidak diubah

Izin di dalam token (`canPublish`, `canSubscribe`, `canPublishData`) dibiarkan apa adanya untuk semua peran. Mempersempitnya masuk akal secara keamanan — siswa tidak perlu `canPublishData`, dan idealnya tidak boleh mempublikasikan video — tetapi:

- Siswa saat ini mempublikasikan audio untuk bertanya (`audio={true}` pada `LiveKitRoom` di `app/student/live/page.tsx`).
- Panel transkrip siswa membaca kanal data `caption`; membatasi `canPublishData` perlu diverifikasi tidak memutus penerimaan, bukan hanya pengiriman.

Menggabungkannya dengan perubahan otorisasi akan mengaburkan penyebab bila ada regresi. Dicatat sebagai pekerjaan terpisah.

## Konsekuensi yang diketahui

- **Sesi dengan `guru_id` tidak cocok akan menolak gurunya.** Data hasil seeding yang `guru_id`-nya menunjuk akun lain membuat guru yang login tertolak dari ruang itu. Ini perilaku yang benar, tetapi bisa mengagetkan saat pengujian manual.
- **Siswa tidak bisa lagi mengambil token untuk sesi `scheduled`.** Sebelumnya bisa, meski halaman live siswa memang hanya mencari sesi berstatus `live`, jadi tidak ada alur yang rusak.
- Route ini melakukan dua query tambahan per pemanggilan (profil dan sesi). Token diambil sekali per bergabung ke ruang, bukan per detik, jadi biayanya tidak berarti.

## Kriteria sukses

**Unit test** (`npx vitest run lib/live/room-access.test.ts`) mencakup kelima baris tabel aturan di atas, ditambah sesi `ended` untuk gurunya sendiri (diizinkan).

**Verifikasi statis:**
- `npx tsc --noEmit` tidak menambah error baru.
- `npm run build` sukses.
- `grep -rn "isTeacher" app lib` tidak menghasilkan apa pun.
- `grep -rn "participantName" app` hanya muncul di dalam route token, tidak lagi di pemanggilnya.

**Verifikasi manual (dev server, dua browser):**
- Guru membuat sesi, menekan Mulai, masuk ruang, caption berjalan seperti sebelumnya.
- Siswa membuka Kelas Live saat sesi berstatus `live` → berhasil masuk, transkrip dan tanya jawab berjalan.
- Siswa membuka Kelas Live saat tidak ada sesi `live` → melihat layar "Tidak Ada Kelas Live" seperti sebelumnya, bukan error mentah.
- Memanggil `POST /api/livekit-token` dengan `roomName` karangan memakai cookie siswa → dijawab `403` dengan pesan "Ruang tidak ditemukan", bukan token.
- Nama peserta yang tampil di ruang LiveKit adalah nama pada `profiles.nama`, bukan nilai yang dikirim dari browser.
