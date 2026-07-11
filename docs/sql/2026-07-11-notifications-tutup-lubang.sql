-- =====================================================================
--  Notifikasi — tutup lubang keamanan + bersihkan sampah tes
--
--  Temuan: policy "authenticated can insert notifications" (auth.role() =
--  'authenticated') mengizinkan SIAPA PUN yang login menyisipkan
--  notifikasi untuk siapa pun. Terbukti: akun siswa berhasil mengirim
--  notifikasi ke akun lain (201). Ini lubang spam/abuse.
--
--  Policy "guru kirim notifikasi ke siapa pun" sudah cukup dan benar:
--  hanya guru yang boleh mengirim ke siswa. Tidak ada alur yang
--  membutuhkan siswa menyisipkan notifikasi, jadi policy longgar itu
--  dibuang.
--
--  Jalankan di Supabase → SQL Editor (peran postgres, mem-bypass RLS).
-- =====================================================================


-- ── BLOK 1 — TUTUP LUBANG ────────────────────────────────────────────
drop policy if exists "authenticated can insert notifications" on public.notifications;


-- ── BLOK 2 — BERSIHKAN SAMPAH TES ────────────────────────────────────
-- Baris-baris dari sesi diagnosa. Aman dihapus.
delete from public.notifications
where judul in ('probe', 'probe2', 'spam dari siswa', 'Uji final policy',
                'self-insert', 'uji2', 'UJI', 'Uji policy notifikasi', 'uji GURU->siswa');


-- ── BLOK 3 — VERIFIKASI ──────────────────────────────────────────────
-- 3a. Policy insert yang tersisa hanya "guru kirim notifikasi ke siapa pun".
select policyname, cmd, permissive
from pg_policies
where tablename = 'notifications' and cmd = 'INSERT'
order by policyname;

-- 3b. Sisa notifikasi (harusnya tinggal yang asli, tanpa 'probe'/'uji').
select user_id, judul, tipe, created_at
from public.notifications
order by created_at desc;
