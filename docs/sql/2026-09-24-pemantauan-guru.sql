-- =====================================================================
--  Pemantauan siswa — izinkan guru membaca progress & kuis siswa,
--  dan menyimpan catatan pendamping
--  Konteks: halaman guru (dashboard, daftar siswa, laporan, detail
--  siswa) menampilkan progress 0% untuk semua siswa, padahal di akun
--  siswa tertulis 100%. RLS hanya mengizinkan siswa membaca baris
--  miliknya sendiri, sehingga query guru mengembalikan [] tanpa error.
--  Diverifikasi 2026-09-24 dengan akun demo:
--    student_material_progress  alex: 2 baris   guru: 0 baris
--    quiz_attempts              alex: 2 baris   guru: 0 baris
--    update student_profiles    guru: 0 baris terubah
--
--  Jalankan di Supabase → SQL Editor.
-- =====================================================================


-- ── BLOK 0 — LIHAT POLICY YANG ADA (tidak mengubah apa pun) ──────────
select tablename, policyname, cmd, qual
from pg_policies
where tablename in ('student_material_progress', 'quiz_attempts', 'remedial_attempts', 'student_profiles')
order by tablename, cmd, policyname;


-- ── BLOK 1 — POLICY BACA UNTUK GURU ──────────────────────────────────
-- Policy permissive: di-OR dengan policy yang sudah ada, tidak menimpa.
-- Hanya SELECT — guru bisa memantau, tidak bisa mengubah nilai siswa.

create policy "guru lihat progress siswa" on public.student_material_progress
  for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'teacher'));

create policy "guru lihat hasil kuis siswa" on public.quiz_attempts
  for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'teacher'));

create policy "guru lihat remedial siswa" on public.remedial_attempts
  for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'teacher'));


-- ── BLOK 2 — SIMPAN CATATAN PENDAMPING ───────────────────────────────
-- Lewat fungsi, bukan policy UPDATE, supaya guru HANYA bisa mengubah
-- kolom catatan_pendamping — bukan disabilitas, kelas, streak, dst.

create or replace function public.set_catatan_pendamping(p_student_id uuid, p_catatan text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'teacher') then
    raise exception 'Hanya guru yang boleh menyimpan catatan pendamping' using errcode = '42501';
  end if;

  update student_profiles
  set catatan_pendamping = nullif(trim(p_catatan), '')
  where id = p_student_id;

  if not found then
    raise exception 'Siswa tidak ditemukan' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_catatan_pendamping(uuid, text) from public, anon;
grant execute on function public.set_catatan_pendamping(uuid, text) to authenticated;


-- ── BLOK 3 — VERIFIKASI ──────────────────────────────────────────────
-- Harus muncul 3 policy baru (cmd = SELECT) dan 1 fungsi.
select tablename, policyname, cmd
from pg_policies
where policyname in ('guru lihat progress siswa', 'guru lihat hasil kuis siswa', 'guru lihat remedial siswa');

select proname from pg_proc where proname = 'set_catatan_pendamping';


-- =====================================================================
--  ROLLBACK — bila perlu membatalkan.
-- =====================================================================
-- drop policy if exists "guru lihat progress siswa" on public.student_material_progress;
-- drop policy if exists "guru lihat hasil kuis siswa" on public.quiz_attempts;
-- drop policy if exists "guru lihat remedial siswa" on public.remedial_attempts;
-- drop function if exists public.set_catatan_pendamping(uuid, text);
