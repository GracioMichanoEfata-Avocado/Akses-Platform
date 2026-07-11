-- =====================================================================
--  DIAGNOSA notifications — jalankan, lalu tempel SEMUA hasilnya.
--  Belum mengubah apa pun. Tujuannya melihat kenapa insert guru->siswa
--  masih tertolak padahal policy sudah ditambah.
-- =====================================================================

-- 1. SEMUA policy pada notifications, lengkap dengan permissive/restrictive.
--    Perhatikan kolom "permissive": bila ada yang RESTRICTIVE, itu biang
--    keladinya (di-AND, bukan di-OR).
select policyname, cmd, permissive, roles, qual, with_check
from pg_policies
where tablename = 'notifications'
order by cmd, policyname;

-- 2. Definisi CHECK constraint pada notifications (mengonfirmasi tipe yang
--    diizinkan: terbukti hanya 'materi_baru' dan 'sesi_baru').
select conname, pg_get_constraintdef(oid) as definisi
from pg_constraint
where conrelid = 'public.notifications'::regclass and contype = 'c';
