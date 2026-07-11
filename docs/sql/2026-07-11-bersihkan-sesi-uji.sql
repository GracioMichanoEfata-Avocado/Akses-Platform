-- =====================================================================
--  Bersihkan sesi privat & ajuan hasil pengujian
--
--  Selama diagnosa, beberapa live_sessions privat "Pendampingan: UJI" /
--  "Pendampingan: mekanisme" tercipta dan menaut ke tutor_requests nyata
--  lewat tutor_request_id (unik). Akibatnya saat guru menyetujui ajuan
--  itu di UI, insert sesi kedua ditolak (23505) -> alert "ruang video
--  gagal dibuat".
--
--  Skrip ini menghapus sesi uji dan mengembalikan ajuan ke 'menunggu'
--  agar bisa disetujui ulang dari UI dengan bersih.
--
--  Jalankan di Supabase → SQL Editor.
-- =====================================================================


-- ── BLOK 1 — HAPUS SESI PRIVAT UJI ───────────────────────────────────
delete from public.live_sessions
where tipe = 'privat'
  and judul in ('Pendampingan: UJI', 'Pendampingan: mekanisme', 'x');


-- ── BLOK 2 — KEMBALIKAN AJUAN KE 'MENUNGGU' ──────────────────────────
-- Semua ajuan 'dijadwalkan' saat ini berasal dari pengujian; kembalikan
-- agar muncul lagi di kartu dashboard guru dan bisa disetujui bersih.
update public.tutor_requests
set status = 'menunggu', jadwal = null, teacher_id = null
where status = 'dijadwalkan';


-- ── BLOK 3 — VERIFIKASI ──────────────────────────────────────────────
-- 3a. Tidak ada lagi sesi privat uji.
select count(*) as sesi_privat_tersisa
from public.live_sessions where tipe = 'privat';

-- 3b. Ajuan kembali menunggu.
select id, status, jadwal from public.tutor_requests order by created_at desc;
