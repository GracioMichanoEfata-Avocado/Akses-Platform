# Sesi Privat — persetujuan ajuan membuka ruang video satu lawan satu

**Tanggal:** 2026-07-10
**Cakupan:** Persetujuan guru atas ajuan pendampingan sekaligus membuat sesi live bertipe privat. Hanya siswa pengaju dan gurunya yang bisa masuk ruangnya.

Ini **potong 3 dari tiga**, dan bergantung pada keduanya:
- Potong 1 — `2026-07-10-live-room-authorization-design.md` (selesai). Menyediakan `authorizeRoomAccess()` yang di sini diperluas.
- Potong 2 — `2026-07-10-ajuan-pendampingan-design.md` (selesai). Menyediakan `tutor_requests`.

**Di luar cakupan (dicatat untuk nanti):**
- **Memperketat policy `select` pada `live_sessions`.** Setiap siswa terautentikasi masih bisa membaca seluruh baris, termasuk `room_name` sesi privat orang lain. Itu tidak membuatnya bisa masuk — token ditolak di route. Mengubah policy yang sedang dipakai halaman lain berisiko memunculkan layar kosong tanpa error.
- **Ruang terbuka otomatis pada jamnya.** Sesi privat tetap harus dimulai guru lewat Aksi Aktual.
- **Perbaikan `/api/send-notification`.** Ditunda; lihat koreksi di spec potong 2. Siswa tidak akan menerima notifikasi "sesi dimulai".
- Guru membatalkan atau menjadwalkan ulang sesi privat.

---

## Keadaan sekarang

Persetujuan ajuan hanya mengubah `tutor_requests.status` menjadi `dijadwalkan` dan mengisi `jadwal`. Siswa melihat tanggal dan jamnya di halaman materi. Tidak ada ruang video yang dibuat.

`app/student/live/page.tsx` mengambil sesi dengan `.eq('status','live')`, urut terbaru, ambil satu — **tanpa penyaringan siapa pun**. Selama semua sesi bersifat kelas umum, itu bukan kebocoran, hanya pemilihan yang naif. Begitu sesi privat ada, ia menjadi kebocoran: siswa lain yang membuka Kelas Live akan masuk ke sesi privat yang sedang berlangsung.

`app/teacher/actions/page.tsx:422` (`SessionSelector`) menampilkan semua sesi `scheduled` milik guru yang login dan menyediakan tombol Mulai. Sesi privat akan muncul di sana **tanpa perubahan kode pada halaman itu**, asalkan barisnya ada dan `guru_id`-nya benar.

## Model data

### Perubahan `live_sessions`

`tipe` diberi default `'kelas'` agar semua baris lama tetap sah tanpa migrasi data.

`tutor_request_id` dibuat unik supaya persetujuan yang terkirim dua kali — misalnya karena jaringan diulang — tidak menghasilkan dua ruang untuk satu ajuan.

**SQL yang harus dijalankan manual di Supabase SQL Editor.** Naskahnya di `docs/sql/2026-07-10-sesi-privat.sql`.

```sql
alter table public.live_sessions
  add column tipe text not null default 'kelas'
    check (tipe in ('kelas', 'privat')),
  add column student_id uuid references public.profiles(id) on delete cascade,
  add column tutor_request_id uuid unique
    references public.tutor_requests(id) on delete set null;

-- Sesi privat wajib punya siswa; sesi kelas wajib tidak punya.
alter table public.live_sessions
  add constraint live_sessions_privat_punya_siswa
  check (
    (tipe = 'privat' and student_id is not null) or
    (tipe = 'kelas'  and student_id is null)
  );

create index live_sessions_student_status
  on public.live_sessions (student_id, status);
```

### RLS

Tidak berubah. Pemeriksaan pada 2026-07-10 menunjukkan RLS `live_sessions` **sudah aktif**: anon membaca nol baris, akun siswa membaca semua baris. Policy `insert` yang ada sudah dipakai `create-session` oleh guru, jadi penyisipan sesi privat oleh guru memakai jalur yang sama.

Kerahasiaan sesi privat **tidak** bergantung pada policy `select`, melainkan pada penolakan token di `/api/livekit-token`.

## Komponen

### 1. `authorizeRoomAccess` diperluas

**File:** `lib/live/room-access.ts`
**Test:** `lib/live/room-access.test.ts`

`LiveSessionRow` bertambah dua field:

```ts
export interface LiveSessionRow {
  guru_id: string;
  status: string;
  room_name: string;
  tipe: 'kelas' | 'privat';
  student_id: string | null;
}
```

Aturan baru, menggantikan baris "siswa" pada tabel potong 1:

| Kondisi | Hasil |
|---|---|
| `session` null | tolak — "Ruang tidak ditemukan" |
| `teacher` dan `guru_id === userId` | izinkan |
| `teacher` dan bukan pengajarnya | tolak — "Anda bukan pengajar sesi ini" |
| `student` dan `status !== 'live'` | tolak — "Sesi belum dimulai" |
| `student`, `live`, `tipe === 'kelas'` | izinkan |
| `student`, `live`, `tipe === 'privat'`, `student_id === userId` | izinkan |
| `student`, `live`, `tipe === 'privat'`, siswa lain | tolak — "Sesi ini khusus siswa lain" |

Urutan penting: status diperiksa sebelum tipe, supaya siswa yang salah tidak bisa membedakan "sesi privat orang lain belum mulai" dari "aku tidak diundang".

### 2. Route token membaca kolom baru

**File:** `app/api/livekit-token/route.ts`

`.select('guru_id, status, room_name')` menjadi `.select('guru_id, status, room_name, tipe, student_id')`. Tidak ada perubahan lain; keputusannya tetap di fungsi murni.

### 3. Persetujuan membuat sesi

**File:** `components/teacher/TutorRequestCard.tsx`

Setelah update `tutor_requests` berhasil dan mengembalikan tepat satu baris, sisipkan `live_sessions`:

```ts
await supabase.from('live_sessions').insert({
  judul: `Pendampingan: ${materi}`,
  guru_id: user.id,
  mata_pelajaran: 'Pendampingan',
  tanggal,                       // dari isian guru
  waktu: `${waktu}:00`,
  durasi: 60,
  status: 'scheduled',
  topik: `Sesi pendampingan privat untuk ${namaSiswa}`,
  mode: 'both',
  room_name: `privat-${crypto.randomUUID().slice(0, 12)}`,
  tipe: 'privat',
  student_id: row.student_id,
  tutor_request_id: row.id,
});
```

Urutannya sengaja: ajuan diperbarui **lebih dulu**, karena `.eq('status','menunggu')` di sanalah yang mencegah dua guru merespons bersamaan. Bila penyisipan sesi gagal setelah ajuan berhasil diperbarui, tampilkan error yang menyebut bahwa jadwal tersimpan tetapi ruang gagal dibuat. Tidak ada transaksi lintas-tabel dari klien; kegagalan ini harus terlihat, bukan disembunyikan.

Aksi **Tolak** tidak membuat sesi.

### 4. Halaman live siswa memilih sesi

**File:** `app/student/live/page.tsx`

Ganti query tunggal dengan dua langkah:

```ts
const { data: privat } = await supabase
  .from('live_sessions').select('*')
  .eq('status', 'live').eq('tipe', 'privat').eq('student_id', user.id)
  .order('created_at', { ascending: false }).limit(1).maybeSingle();

const liveSession = privat ?? (await supabase
  .from('live_sessions').select('*')
  .eq('status', 'live').eq('tipe', 'kelas')
  .order('created_at', { ascending: false }).limit(1).maybeSingle()).data;
```

Sesi privat menang atas kelas umum. Bila keduanya tidak ada, layar "Tidak Ada Kelas Live" tampil seperti sekarang.

Saat sesi privat, header menampilkan judulnya (`Pendampingan: …`), sehingga siswa tahu ia berada di ruang yang benar. Tidak ada perubahan pada panel transkrip maupun tanya jawab.

## Konsekuensi yang diketahui

- **Guru tetap harus menekan Mulai.** Sesi privat berstatus `scheduled` sampai guru membukanya lewat Aksi Aktual. Jadwal jam 09.00 tidak membuka ruang sendiri.
- **Siswa tidak diberi tahu saat ruangnya dibuka**, karena notifikasi masih mati. Ia harus membuka Kelas Live dan mencoba.
- **Ajuan yang sudah `dijadwalkan` sebelum potong 3 tidak punya sesi.** Ada satu di database (materi Ekosistem Laut). Hapus atau abaikan; ia hanya menampilkan jadwal.
- `mata_pelajaran` diisi `'Pendampingan'`, bukan mata pelajaran materinya, agar sesi privat mudah dibedakan di daftar guru.

## Kriteria sukses

**Unit test** (`npx vitest run lib/live/room-access.test.ts`) mencakup ketujuh baris tabel aturan, termasuk siswa lain yang ditolak dari sesi privat dan siswa pengaju yang diterima.

**Verifikasi statis:**
- `npx tsc --noEmit` tidak menambah error baru.
- `npm run build` sukses.

**Verifikasi lawan Supabase nyata** (dengan cookie siswa & guru, pola yang dipakai di potong 1 dan 2):
- Guru menyetujui ajuan → tepat satu baris `live_sessions` bertipe `privat` dengan `student_id` benar.
- Menyetujui ajuan yang sama dua kali tidak menghasilkan dua sesi (`tutor_request_id` unik).
- `POST /api/livekit-token` untuk `room_name` sesi privat itu:
  - memakai cookie siswa pengaju, sesi `live` → **200 dengan token**.
  - memakai cookie siswa pengaju, sesi masih `scheduled` → **403 "Sesi belum dimulai"**.
  - memakai cookie guru pemiliknya → **200**.
- `insert live_sessions` dengan `tipe: 'privat'` tanpa `student_id` → ditolak constraint.

**Verifikasi manual:**
- Guru: Aksi Aktual menampilkan "Pendampingan: …" di daftar sesi terjadwal; tekan Mulai; masuk ruang.
- Siswa pengaju: buka Kelas Live → masuk ruang privat, header bertulis "Pendampingan: …".
- Siswa pengaju saat ada juga kelas umum yang `live` → tetap masuk ruang privatnya, bukan kelas umum.
