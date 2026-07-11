-- =====================================================================
--  Ajuan Pendampingan — tabel tutor_requests
--  Spec: docs/superpowers/specs/2026-07-10-ajuan-pendampingan-design.md
--
--  Jalankan di Supabase → SQL Editor. Urutan blok penting.
--  Blok 0 hanya memeriksa; tidak mengubah apa pun.
-- =====================================================================


-- ── BLOK 0 — PERIKSA DULU (tidak mengubah apa pun) ───────────────────
-- Pastikan kolom id pada profiles & materials bertipe uuid, dan
-- profiles punya kolom role. Kalau hasilnya bukan uuid, BERHENTI dan
-- laporkan hasilnya sebelum menjalankan blok berikutnya.

select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'profiles'  and column_name in ('id', 'role')) or
    (table_name = 'materials' and column_name in ('id', 'created_by'))
  )
order by table_name, column_name;

-- Harapan:
--   materials | created_by | uuid
--   materials | id         | uuid
--   profiles  | id         | uuid
--   profiles  | role       | text


-- ── BLOK 1 — BUAT TABEL ──────────────────────────────────────────────

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


-- ── BLOK 2 — INDEKS ──────────────────────────────────────────────────
-- Indeks unik parsial: satu siswa hanya boleh punya SATU ajuan
-- berstatus 'menunggu' per materi. Inilah yang menegakkan aturan
-- anti-klik-ganda di level database — penting karena tombolnya juga
-- bisa dipicu perintah suara yang kadang terdengar dua kali.

create unique index tutor_requests_satu_menunggu
  on public.tutor_requests (student_id, material_id)
  where status = 'menunggu';

create index tutor_requests_teacher_status
  on public.tutor_requests (teacher_id, status);


-- ── BLOK 3 — ROW LEVEL SECURITY ──────────────────────────────────────
-- Tanpa blok ini, tabel akan terbuka bagi siapa pun yang punya anon key.

alter table public.tutor_requests enable row level security;

-- Siswa: hanya ajuannya sendiri.
create policy "siswa lihat ajuan sendiri" on public.tutor_requests
  for select using (student_id = auth.uid());

create policy "siswa buat ajuan sendiri" on public.tutor_requests
  for insert with check (student_id = auth.uid());

-- Guru: ajuan yang ditujukan padanya, atau yang masih terbuka
-- (teacher_id null = materi tanpa pembuat).
create policy "guru lihat ajuan relevan" on public.tutor_requests
  for select using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'teacher')
    and (teacher_id = auth.uid() or teacher_id is null)
  );

-- Guru merespons; with check memaksa ia mengklaim ajuan atas namanya.
create policy "guru respons ajuan relevan" on public.tutor_requests
  for update
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'teacher')
    and (teacher_id = auth.uid() or teacher_id is null)
  )
  with check (teacher_id = auth.uid());


-- ── BLOK 4 — VERIFIKASI ──────────────────────────────────────────────
-- Jalankan setelah blok 1–3. Ketiganya harus mengembalikan baris.

-- 4a. RLS harus aktif (rowsecurity = true)
select relname, relrowsecurity as rls_aktif
from pg_class
where relname = 'tutor_requests';

-- 4b. Harus ada 4 policy
select policyname, cmd
from pg_policies
where tablename = 'tutor_requests'
order by policyname;

-- 4c. Harus ada 2 indeks buatan kita (+ primary key)
select indexname
from pg_indexes
where tablename = 'tutor_requests'
order by indexname;

-- 4d. Constraint jadwal wajib harus menolak baris ini.
--     Harapan: ERROR "tutor_requests_jadwal_wajib". Kalau BERHASIL
--     masuk, constraint-nya tidak terpasang — jangan lanjut.
--     (Hapus komentar untuk mencobanya, lalu rollback.)
-- begin;
--   insert into public.tutor_requests (student_id, material_id, status, jadwal)
--   select p.id, m.id, 'dijadwalkan', null
--   from public.profiles p, public.materials m
--   where p.role = 'student' limit 1;
-- rollback;


-- =====================================================================
--  ROLLBACK — hanya bila perlu membatalkan semuanya.
--  Menghapus tabel ikut menghapus indeks & policy-nya.
-- =====================================================================
-- drop table if exists public.tutor_requests;
