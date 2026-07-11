-- =====================================================================
--  Presentasi Slide Bernarasi — kolom slides pada materials
--  Spec: docs/superpowers/specs/2026-07-10-slide-bernarasi-design.md
--
--  Jalankan di Supabase → SQL Editor.
--  Tidak menghapus apa pun. Materi lama bernilai NULL dan tetap
--  menampilkan player emoji seperti sebelumnya.
-- =====================================================================


-- ── BLOK 0 — PERIKSA DULU (tidak mengubah apa pun) ───────────────────
-- Pastikan kolom belum ada, agar tidak kena "column already exists".

select count(*) as kolom_slides_sudah_ada
from information_schema.columns
where table_schema='public' and table_name='materials' and column_name='slides';

-- Harapan: 0


-- ── BLOK 1 — TAMBAH KOLOM ────────────────────────────────────────────
-- jsonb, boleh null. Slide selalu dibaca utuh dan berurutan milik satu
-- materi, tidak pernah di-query per baris, jadi tidak perlu tabel sendiri.

alter table public.materials add column slides jsonb;


-- ── BLOK 2 — VERIFIKASI ──────────────────────────────────────────────

-- 2a. Kolomnya muncul dan boleh null.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema='public' and table_name='materials' and column_name='slides';

-- Harapan: slides | jsonb | YES

-- 2b. Semua materi lama bernilai null.
select
  count(*) as total_materi,
  count(slides) as punya_slides
from public.materials;

-- Harapan: total_materi = 15, punya_slides = 0


-- =====================================================================
--  ROLLBACK — hanya bila perlu membatalkan.
--  Menghapus kolom ikut menghapus slide yang sudah ter-generate.
-- =====================================================================
-- alter table public.materials drop column if exists slides;
