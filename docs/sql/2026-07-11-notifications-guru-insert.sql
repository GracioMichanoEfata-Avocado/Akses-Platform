-- =====================================================================
--  Notifikasi — izinkan guru mengirim ke siswa
--  Konteks: /api/send-notification tidak pernah berhasil sejak awal.
--  RLS notifications hanya mengizinkan menulis baris untuk diri sendiri,
--  sehingga guru tidak bisa menyisipkan notifikasi ber-user_id siswa
--  (42501). Notifikasi sesi live, materi baru, dan hasil ajuan
--  pendampingan semuanya gagal diam-diam.
--
--  Jalankan di Supabase → SQL Editor.
-- =====================================================================


-- ── BLOK 0 — LIHAT POLICY YANG ADA (tidak mengubah apa pun) ──────────
select policyname, cmd, with_check
from pg_policies
where tablename = 'notifications'
order by cmd, policyname;


-- ── BLOK 1 — TAMBAH POLICY ───────────────────────────────────────────
-- Policy permissive: di-OR dengan policy yang sudah ada, tidak menimpa.
-- Guru boleh menyisipkan notifikasi untuk user_id siapa pun.
-- Siswa tetap tertolak menulis untuk orang lain — penegakan di lapisan DB,
-- karena /api/send-notification hanya memeriksa "sudah login", bukan peran.

create policy "guru kirim notifikasi ke siapa pun" on public.notifications
  for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'teacher'
    )
  );


-- ── BLOK 2 — VERIFIKASI ──────────────────────────────────────────────
-- Harus muncul policy baru dengan cmd = INSERT.
select policyname, cmd
from pg_policies
where tablename = 'notifications' and policyname = 'guru kirim notifikasi ke siapa pun';


-- =====================================================================
--  ROLLBACK — bila perlu membatalkan.
-- =====================================================================
-- drop policy if exists "guru kirim notifikasi ke siapa pun" on public.notifications;
