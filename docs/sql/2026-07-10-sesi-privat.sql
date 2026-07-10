-- =====================================================================
--  Sesi Privat — kolom tambahan pada live_sessions
--  Spec: docs/superpowers/specs/2026-07-10-sesi-privat-design.md
--
--  Prasyarat: docs/sql/2026-07-10-tutor-requests.sql sudah dijalankan.
--  Jalankan di Supabase → SQL Editor. Blok 0 hanya memeriksa.
--
--  Tidak menghapus apa pun. Baris live_sessions yang sudah ada otomatis
--  bertipe 'kelas' dan tetap sah.
-- =====================================================================


-- ── BLOK 0 — PERIKSA DULU (tidak mengubah apa pun) ───────────────────
-- Pastikan tutor_requests sudah ada dan live_sessions belum punya kolom
-- yang akan kita tambahkan (mencegah error "column already exists").

select
  (select count(*) from information_schema.tables
     where table_schema='public' and table_name='tutor_requests')  as tutor_requests_ada,
  (select count(*) from information_schema.columns
     where table_schema='public' and table_name='live_sessions'
       and column_name in ('tipe','student_id','tutor_request_id'))  as kolom_baru_sudah_ada;

-- Harapan: tutor_requests_ada = 1, kolom_baru_sudah_ada = 0


-- ── BLOK 1 — TAMBAH KOLOM ────────────────────────────────────────────
-- tipe default 'kelas' supaya seluruh baris lama tetap sah tanpa migrasi.
-- tutor_request_id UNIQUE: persetujuan yang tak sengaja terkirim dua kali
-- tidak menghasilkan dua ruang untuk satu ajuan.

alter table public.live_sessions
  add column tipe text not null default 'kelas'
    check (tipe in ('kelas', 'privat')),
  add column student_id uuid references public.profiles(id) on delete cascade,
  add column tutor_request_id uuid unique
    references public.tutor_requests(id) on delete set null;


-- ── BLOK 2 — CONSTRAINT KONSISTENSI ──────────────────────────────────
-- Sesi privat wajib punya siswa; sesi kelas wajib tidak punya.

alter table public.live_sessions
  add constraint live_sessions_privat_punya_siswa
  check (
    (tipe = 'privat' and student_id is not null) or
    (tipe = 'kelas'  and student_id is null)
  );


-- ── BLOK 3 — INDEKS ──────────────────────────────────────────────────
-- Halaman Kelas Live siswa mencari sesi privat miliknya lebih dulu.

create index live_sessions_student_status
  on public.live_sessions (student_id, status);


-- ── BLOK 4 — VERIFIKASI ──────────────────────────────────────────────

-- 4a. Ketiga kolom harus muncul.
select column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_schema='public' and table_name='live_sessions'
  and column_name in ('tipe','student_id','tutor_request_id')
order by column_name;

-- 4b. Baris lama harus otomatis bertipe 'kelas'.
select tipe, count(*) as jumlah
from public.live_sessions
group by tipe;

-- 4c. Constraint harus menolak sesi privat tanpa siswa.
--     Harapan: ERROR "live_sessions_privat_punya_siswa".
--     Kalau justru BERHASIL, constraint-nya tidak terpasang.
--     Dibungkus rollback, jadi tidak meninggalkan jejak.
begin;
  insert into public.live_sessions
    (judul, guru_id, mata_pelajaran, tanggal, waktu, durasi, status, room_name, tipe, student_id)
  select 'UJI CONSTRAINT', p.id, 'Uji', current_date, '09:00:00', 60, 'scheduled',
         'uji-constraint-hapus-aku', 'privat', null
  from public.profiles p where p.role='teacher' limit 1;
rollback;


-- =====================================================================
--  ROLLBACK — hanya bila perlu membatalkan potong 3.
--  Aman: tidak menyentuh data sesi yang sudah ada.
-- =====================================================================
-- alter table public.live_sessions drop constraint if exists live_sessions_privat_punya_siswa;
-- drop index if exists live_sessions_student_status;
-- alter table public.live_sessions
--   drop column if exists tutor_request_id,
--   drop column if exists student_id,
--   drop column if exists tipe;
