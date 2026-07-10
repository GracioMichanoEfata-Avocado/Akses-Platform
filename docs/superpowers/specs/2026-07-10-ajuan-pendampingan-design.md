# Ajuan Pendampingan — siswa mengajukan, guru menyetujui & menjadwalkan

**Tanggal:** 2026-07-10
**Cakupan:** Menghidupkan tombol "Minta Pendamping" di halaman detail materi siswa. Siswa mengajukan pendampingan, guru melihatnya di dashboard, menyetujui sambil mengisi tanggal & jam atau menolaknya, dan siswa mendapat notifikasi balik.

Ini **potong 2 dari tiga**. Potong 1 (otorisasi ruang live) sudah selesai — lihat `2026-07-10-live-room-authorization-design.md`.

**Di luar cakupan (dicatat untuk nanti):**
- **Potong 3 — sesi privat.** Persetujuan guru belum membuat ruang video. Jadwalnya nyata dan terlihat kedua pihak, tapi belum ada tombol "Masuk Sesi". Menyusul: kolom `tipe` dan `student_id` pada `live_sessions`, pemilihan sesi di halaman live siswa, dan perluasan `authorizeRoomAccess`.
- Guru membatalkan atau menjadwalkan ulang ajuan yang sudah `dijadwalkan`.
- Riwayat ajuan bagi siswa. Siswa hanya melihat ajuan terakhirnya per materi.

---

## Keadaan sekarang

`app/student/learn/[id]/page.tsx:473` merender tombol berlabel "Minta Pendamping" dengan `aria-label="Minta bantuan pendamping"`. Tombol itu **tidak punya `onClick`** — diklik, tidak terjadi apa-apa. Tidak ada tabel, route, maupun layar guru yang berhubungan dengannya.

Guru tidak punya halaman notifikasi sama sekali. Notifikasi hanya mengalir satu arah, ke siswa, lewat tabel `notifications` dan halaman `/student/notifications`.

## Model data

### Tabel baru `tutor_requests`

Satu baris = satu ajuan. Statusnya hanya tiga: `menunggu`, `dijadwalkan`, `ditolak`. Persetujuan dan penjadwalan adalah satu kejadian, bukan dua, jadi tidak ada status `disetujui` tersendiri.

`teacher_id` diisi dari `materials.created_by`. Bila materi tidak punya pembuat — misalnya materi bawaan hasil seeding — kolomnya `null`, yang berarti "terbuka untuk guru mana pun", dan guru pertama yang merespons mengklaimnya.

**SQL yang harus dijalankan manual di Supabase SQL Editor.** Repo ini tidak menyimpan file migrasi; skema dikelola lewat dashboard.

```sql
create table public.tutor_requests (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id)  on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  teacher_id  uuid          references public.profiles(id)  on delete set null,
  status      text not null default 'menunggu'
                check (status in ('menunggu', 'dijadwalkan', 'ditolak')),
  jadwal      timestamptz,
  created_at  timestamptz not null default now(),

  -- Jadwal wajib ada begitu ajuan dinyatakan dijadwalkan.
  constraint tutor_requests_jadwal_wajib
    check (status <> 'dijadwalkan' or jadwal is not null)
);

-- Satu siswa hanya boleh punya SATU ajuan berstatus 'menunggu' per materi.
-- Ini yang menegakkan aturan anti-klik-ganda di level database, bukan di UI.
create unique index tutor_requests_satu_menunggu
  on public.tutor_requests (student_id, material_id)
  where status = 'menunggu';

create index tutor_requests_teacher_status
  on public.tutor_requests (teacher_id, status);

alter table public.tutor_requests enable row level security;

-- Siswa: hanya ajuannya sendiri.
create policy "siswa lihat ajuan sendiri" on public.tutor_requests
  for select using (student_id = auth.uid());

create policy "siswa buat ajuan sendiri" on public.tutor_requests
  for insert with check (student_id = auth.uid());

-- Guru: ajuan yang ditujukan padanya, atau yang masih terbuka.
create policy "guru lihat ajuan relevan" on public.tutor_requests
  for select using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'teacher')
    and (teacher_id = auth.uid() or teacher_id is null)
  );

-- Guru merespons; sekaligus mengklaim ajuan terbuka atas namanya.
create policy "guru respons ajuan relevan" on public.tutor_requests
  for update
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'teacher')
    and (teacher_id = auth.uid() or teacher_id is null)
  )
  with check (teacher_id = auth.uid());
```

Indeks unik parsial itu penting bagi mode suara: kalaupun pengenalan suara salah dengar dan mengirim dua kali, insert kedua ditolak database, bukan bergantung pada tombol yang keburu nonaktif.

### Tabel yang tidak berubah

`notifications` dipakai apa adanya (`user_id`, `judul`, `isi`, `tipe`, `link`, `dibaca`, `created_at`). Tidak ada kolom baru.

**Asumsi yang belum bisa saya verifikasi:** RLS `notifications` mengizinkan seorang guru menyisipkan baris dengan `user_id` milik siswa. Ini sudah diandalkan oleh `/api/send-notification` yang dipakai `create-session` dan `upload-materi`, jadi presedennya ada. Bila ternyata tidak, aksi setujui/tolak akan gagal terang-terangan dengan pesan error, bukan diam-diam.

## Arah aliran notifikasi

Sengaja **satu arah saja: ke siswa.**

Guru tidak dikirimi notifikasi, karena ia melihat ajuannya langsung di kartu dashboard. Mengirim notifikasi ke guru berarti membangun halaman notifikasi guru yang belum ada, demi informasi yang sudah tampil di layar yang sama.

Siswa dikirimi notifikasi saat ajuannya direspons, memakai `/api/send-notification` dengan `targetUserIds: [studentId]`, `tipe: 'sistem'`, dan `link: '/student/learn/<materialId>'`.

`tipe: 'sistem'` dipilih dengan sadar: `NotifIcon` di `app/student/notifications/page.tsx:31` memetakan tipe yang tidak dikenal ke `sistem`, dan saya tidak bisa melihat apakah kolom `tipe` punya `CHECK constraint` di Supabase. Memakai nilai yang sudah terbukti dipakai menghilangkan risiko itu sepenuhnya.

## Komponen

### 1. Fungsi murni `describeRequestState`

**File baru:** `lib/tutor/request-state.ts`
**Test baru:** `lib/tutor/request-state.test.ts`

Memetakan status ajuan menjadi tampilan tombol. Tanpa DOM, tanpa jaringan, tanpa tanggal — mengikuti pola `lib/voice/*.ts` dan `lib/live/room-access.ts`.

```ts
export type TutorStatus = 'menunggu' | 'dijadwalkan' | 'ditolak';

export interface TutorRequestRow {
  status: TutorStatus;
  jadwal: string | null;   // ISO string
}

export interface TombolAjuan {
  label: string;
  disabled: boolean;
  keterangan: string;   // ditampilkan di layar dan dibacakan TTS
}

export function describeRequestState(req: TutorRequestRow | null): TombolAjuan;
```

| `req` | `label` | `disabled` | `keterangan` |
|---|---|---|---|
| `null` | Minta Pendamping | `false` | *(kosong)* |
| `status: 'menunggu'` | Menunggu Persetujuan | `true` | Ajuanmu sudah terkirim. Menunggu guru merespons. |
| `status: 'dijadwalkan'` | Sesi Dijadwalkan | `true` | Guru menyetujui ajuanmu. |
| `status: 'ditolak'` | Ajukan Ulang | `false` | Guru belum bisa mendampingi. Kamu boleh mengajukan lagi. |

Tanggal **tidak** masuk ke fungsi ini. Formatnya bergantung zona waktu, yang membuat unit test rapuh. Tanggal dirender terpisah oleh komponen memakai `formatDateShort` dari `lib/utils/formatters.ts`.

Label tetap "Minta Pendamping" untuk keadaan awal, bukan "Ajukan Pendampingan". Alasannya perintah suara: `scanClickables` menyusun kata kuncinya dari teks tombol, sehingga siswa dapat mengucapkan "minta pendamping" persis seperti yang tertulis.

### 2. Route `POST /api/tutor-request`

**File baru:** `app/api/tutor-request/route.ts`

Menerima `{ materialId }`. Segalanya yang lain ditentukan server.

1. `getUser()`; bila tidak ada → 401.
2. Baca `materials` → `judul`, `created_by`. Bila materi tidak ada → 404.
3. Insert `tutor_requests` dengan `student_id = user.id`, `material_id`, `teacher_id = created_by` (boleh `null`), `status = 'menunggu'`.
4. Bila Postgres mengembalikan kode **`23505`** (pelanggaran indeks unik), balas **409** dengan `{ error: 'Kamu sudah punya ajuan yang menunggu untuk materi ini.' }`.
5. Sukses → 200 dengan baris ajuan yang dibuat.

Route ini ada — alih-alih insert langsung dari klien — untuk dua alasan: `teacher_id` ditentukan server sehingga siswa tidak bisa mengarahkan ajuannya ke guru sembarangan, dan pelanggaran indeks unik diterjemahkan di satu tempat menjadi kalimat Indonesia yang bisa dibacakan TTS.

### 3. Aksi guru — tanpa route baru

Guru menyetujui atau menolak **langsung lewat klien Supabase**, karena RLS sudah menegakkan siapa boleh mengubah apa, dan `with check (teacher_id = auth.uid())` memaksa pengklaiman ajuan terbuka.

Setujui:
```ts
await supabase.from('tutor_requests')
  .update({ status: 'dijadwalkan', jadwal: isoJadwal, teacher_id: user.id })
  .eq('id', requestId);
```
Tolak:
```ts
await supabase.from('tutor_requests')
  .update({ status: 'ditolak', jadwal: null, teacher_id: user.id })
  .eq('id', requestId);
```

**Kedua aksi wajib menyertakan `teacher_id: user.id`,** termasuk Tolak. Klausa `with check (teacher_id = auth.uid())` pada policy update akan menolak perubahan bila kolomnya dibiarkan `null` pada ajuan terbuka. Menghilangkannya dari salah satu aksi membuat penolakan ajuan terbuka gagal tanpa sebab yang jelas.

Klausa `.eq('id', requestId)` sebaiknya ditemani `.eq('status', 'menunggu')` agar dua guru yang menekan tombol hampir bersamaan tidak saling menimpa: yang kalah cepat memperbarui nol baris, dan UI-nya memuat ulang daftar.

Sesudahnya, kirim notifikasi ke siswa lewat `/api/send-notification` yang sudah ada. Tidak perlu route baru untuk sesuatu yang sudah dilakukan `create-session` dan `upload-materi` dengan cara yang sama.

### 4. Tombol siswa

**File:** `app/student/learn/[id]/page.tsx`

Saat memuat materi, ambil juga ajuan terakhir siswa untuk materi itu:
```ts
supabase.from('tutor_requests')
  .select('status, jadwal')
  .eq('student_id', user.id).eq('material_id', id)
  .order('created_at', { ascending: false }).limit(1).maybeSingle();
```

Tombol dirender dari `describeRequestState(ajuan)`. Saat `disabled`, `scanClickables` melewatinya (`lib/voice/dom-scan.ts` membuang elemen `disabled`), sehingga perintah suara "minta pendamping" ikut hilang tanpa kode tambahan — konsisten dengan tombol Putar Audio yang sudah memakai mekanisme yang sama.

Setelah klik: kirim, lalu perbarui state lokal dan bacakan hasilnya lewat `speak()` — `'Ajuan pendampingan terkirim ke guru.'` bila sukses, atau pesan error dari server bila gagal. `speak()` diimpor dari `@/lib/hooks/useTalkback`, pola yang sama dipakai `app/student/login/page.tsx`.

Bila status `dijadwalkan`, tampilkan tanggal & jamnya di bawah tombol memakai `formatDateShort`.

### 5. Kartu ajuan di dashboard guru

**File baru:** `components/teacher/TutorRequestCard.tsx`
**File:** `app/teacher/dashboard/page.tsx` — sisipkan kartunya di bawah blok greeting.

Komponen terpisah, bukan ditanam di halaman dashboard, karena `app/teacher/dashboard/page.tsx` sudah panjang dan kartu ini punya state sendiri (daftar ajuan, isian tanggal & jam, status pengiriman).

Membaca ajuan `menunggu` yang relevan, beserta nama siswa dan judul materi:
```ts
supabase.from('tutor_requests')
  .select('id, created_at, student_id, material_id, profiles!student_id(nama), materials(judul)')
  .eq('status', 'menunggu')
  .order('created_at', { ascending: false });
```
RLS sudah menyaring ke ajuan miliknya atau yang terbuka, jadi tidak perlu klausa `teacher_id` di query.

Tanda `!student_id` wajib ada. `tutor_requests` punya **dua** foreign key ke `profiles` — `student_id` dan `teacher_id` — sehingga PostgREST tidak bisa menebak relasi mana yang dimaksud dan akan menolak `profiles(nama)` polos dengan error relasi ambigu. Bila petunjuk nama kolom ternyata tidak diterima oleh versi PostgREST pada proyek ini, alternatifnya adalah menyebut nama constraint-nya (`profiles!tutor_requests_student_id_fkey(nama)`), atau mengambil nama siswa lewat query `profiles` terpisah.

Tiap baris menampilkan nama siswa, judul materi, dan waktu ajuan. Dua tombol: **Setujui** — membuka isian `<input type="date">` dan `<input type="time">` lalu tombol konfirmasi — dan **Tolak**. Bila tidak ada ajuan, kartunya tidak dirender sama sekali agar dashboard tidak dipenuhi kotak kosong.

## Konsekuensi yang diketahui

- **Kunci anti-klik-ganda hidup di database, bukan di layar.** Siswa yang me-refresh halaman akan melihat tombol "Menunggu Persetujuan" karena ajuannya dibaca ulang, bukan karena state lokal. Ini lebih kuat dari yang disepakati saat brainstorming.
- **Ajuan terbuka bisa direbut.** Bila `teacher_id` bernilai `null`, guru mana pun bisa merespons lebih dulu. Guru kedua yang menekan Setujui akan mengubah baris yang statusnya sudah bukan `menunggu`; daftarnya perlu dimuat ulang setelah tiap aksi agar tidak menampilkan ajuan basi.
- **Materi tanpa `created_by` mengirim ajuan ke semua guru sekaligus.** Sesuai keputusan brainstorming: lebih baik terlihat banyak orang daripada hilang.
- Halaman detail materi bertambah satu query per pemuatan.

## Kriteria sukses

**Unit test** (`npx vitest run lib/tutor/request-state.test.ts`) mencakup keempat baris tabel `describeRequestState`, termasuk bahwa `keterangan` kosong hanya pada keadaan awal.

**Verifikasi statis:**
- `npx tsc --noEmit` tidak menambah error baru.
- `npm run build` sukses.

**Verifikasi manual** (butuh SQL di atas sudah dijalankan):
- Siswa membuka materi, menekan Minta Pendamping → tombol berubah jadi "Menunggu Persetujuan" dan nonaktif. Refresh halaman → tetap "Menunggu Persetujuan".
- Menekan tombol dua kali beruntun tidak membuat dua baris di `tutor_requests`.
- Memanggil `POST /api/tutor-request` dua kali dengan `materialId` sama memakai cookie siswa → panggilan kedua dijawab `409`.
- Guru membuka dashboard → melihat kartu Ajuan Pendampingan berisi nama siswa dan judul materi.
- Guru menekan Setujui, mengisi tanggal & jam → ajuan hilang dari kartu; siswa melihat "Sesi Dijadwalkan" beserta tanggalnya dan menerima notifikasi di `/student/notifications`.
- Guru menekan Tolak → siswa melihat "Ajukan Ulang" dan dapat mengajukan lagi.
- **Mode tunanetra:** ucapkan "minta pendamping" → tombol terklik, terdengar "Ajuan pendampingan terkirim ke guru." Setelah itu ucapkan "apa saja" → "Minta Pendamping" **tidak** lagi disebut sebagai tombol tersedia, karena sudah `disabled`.
- Siswa lain yang membuka materi yang sama melihat tombol dalam keadaan awal, bukan "Menunggu Persetujuan".
