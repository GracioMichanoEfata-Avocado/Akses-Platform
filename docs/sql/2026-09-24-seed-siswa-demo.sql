-- =====================================================================
--  Seed siswa demo — tambah 5 siswa selain Alex
--  Konteks: database hanya berisi 1 siswa (alex@akses.id), sehingga
--  halaman pemantauan guru (dashboard, daftar siswa, laporan) sepi.
--  Script ini membuat 5 akun siswa lengkap: akun login, profil,
--  disabilitas, pengaturan aksesibilitas, progress per materi, dan
--  riwayat kuis.
--
--  Semua akun: kata sandi demo1234.
--  Idempoten: aman dijalankan ulang (akun yang sudah ada tidak dibuat
--  ulang, data profil/progress diperbarui, riwayat kuis diganti).
--
--  PRASYARAT: jalankan dulu 2026-09-24-pemantauan-guru.sql, kalau
--  tidak, progress siswa tetap tampil 0% di sisi guru.
--
--  Jalankan di Supabase → SQL Editor.
-- =====================================================================


-- ── BLOK 1 — BUAT AKUN, PROFIL, DAN PENGATURAN ───────────────────────
do $$
declare
  s record;
  uid uuid;
begin
  for s in
    select * from (values
      -- email,             nama,              avatar, warna,     disabilitas, kelas,     catatan,                                          streak, menit, font,     kontras, tts,   subtitle
      ('sari@akses.id',  'Sari Dewi',       'SD', '#7C3AED', 'tunarungu', 'X IPA 1', 'Memerlukan subtitle dan konten visual yang jelas', 12, 520, 'normal', false, false, true),
      ('budi@akses.id',  'Budi Santoso',    'BS', '#059669', 'both',      'X IPA 2', 'Memerlukan semua fitur aksesibilitas aktif',       3,  180, 'besar',  true,  true,  true),
      ('fitri@akses.id', 'Fitri Handayani', 'FH', '#DC2626', 'tunarungu', 'X IPS 1', 'Aktif dan mandiri, hanya butuh subtitle',          21, 680, 'normal', false, false, true),
      ('agus@akses.id',  'Agus Riyanto',    'AR', '#D97706', 'tunanetra', 'X IPA 2', 'Perlu pendampingan untuk materi matematika',       4,  250, 'besar',  true,  true,  false),
      ('maya@akses.id',  'Maya Silitonga',  'MS', '#0891B2', 'tunarungu', 'X IPS 1', 'Suka konten interaktif dan animasi visual',        9,  390, 'normal', false, false, true)
    ) as t(email, nama, avatar, warna, disabilitas, kelas, catatan, streak, menit, font, kontras, tts, subtitle)
  loop
    select id into uid from auth.users where email = s.email;

    if uid is null then
      uid := gen_random_uuid();

      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
        s.email, extensions.crypt('demo1234', extensions.gen_salt('bf')),
        now(), '{"provider":"email","providers":["email"]}',
        jsonb_build_object('nama', s.nama, 'role', 'student'),
        now(), now(),
        '', '', '', ''
      );

      insert into auth.identities (
        id, user_id, provider_id, provider, identity_data,
        last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), uid, uid::text, 'email',
        jsonb_build_object('sub', uid::text, 'email', s.email, 'email_verified', true),
        now(), now(), now()
      );
    end if;

    -- Upsert: menimpa baris yang mungkin sudah dibuat trigger handle_new_user.
    insert into public.profiles (id, role, nama, email, avatar, avatar_color)
    values (uid, 'student', s.nama, s.email, s.avatar, s.warna)
    on conflict (id) do update set
      role = excluded.role, nama = excluded.nama, email = excluded.email,
      avatar = excluded.avatar, avatar_color = excluded.avatar_color;

    insert into public.student_profiles (id, disabilitas, kelas, catatan, streak_hari, waktu_belajar_menit)
    values (uid, s.disabilitas, s.kelas, s.catatan, s.streak, s.menit)
    on conflict (id) do update set
      disabilitas = excluded.disabilitas, kelas = excluded.kelas, catatan = excluded.catatan,
      streak_hari = excluded.streak_hari, waktu_belajar_menit = excluded.waktu_belajar_menit;

    insert into public.accessibility_settings (id, font_size, high_contrast, tts_enabled, subtitle_enabled, updated_at)
    values (uid, s.font, s.kontras, s.tts, s.subtitle, now())
    on conflict (id) do update set
      font_size = excluded.font_size, high_contrast = excluded.high_contrast,
      tts_enabled = excluded.tts_enabled, subtitle_enabled = excluded.subtitle_enabled,
      updated_at = excluded.updated_at;
  end loop;
end $$;


-- ── BLOK 2 — PROGRESS PER MATERI & RIWAYAT KUIS ──────────────────────
-- Materi dicocokkan lewat awalan judul, bukan UUID, supaya tetap jalan
-- walau ID materi berbeda antar-lingkungan.
-- Mengikuti alur aplikasi: kuis yang sudah dikerjakan → progress 100 +
-- skor_terakhir + satu baris quiz_attempts (lulus bila skor ≥ 70).
-- Materi yang masih dipelajari → progress parsial, tanpa skor/kuis.
-- Satu statement (CTE) — SQL Editor Supabase bisa menjalankan tiap
-- statement di sesi terpisah, jadi temp table tidak bisa diandalkan.
with seed as (
  select p.id as student_id, m.id as material_id, v.progress, v.skor::int as skor,
         now() - (v.hari_lalu || ' days')::interval as waktu
  from (values
    ('sari@akses.id',  'Kimia',    100, 92,   1),
    ('sari@akses.id',  'Fisika',   100, 88,   3),
    ('sari@akses.id',  'Sejarah',   60, null, 0),
    ('budi@akses.id',  'Kimia',    100, 50,   2),
    ('budi@akses.id',  'Fisika',    40, null, 5),
    ('fitri@akses.id', 'Kimia',    100, 96,   0),
    ('fitri@akses.id', 'Fisika',   100, 90,   2),
    ('fitri@akses.id', 'Sejarah',  100, 92,   4),
    ('fitri@akses.id', 'Memahami',  80, null, 1),
    ('agus@akses.id',  'Sejarah',  100, 65,   2),
    ('agus@akses.id',  'Memahami',  25, null, 6),
    ('maya@akses.id',  'Fisika',   100, 82,   1),
    ('maya@akses.id',  'Kimia',     75, null, 3)
  ) as v(email, judul_awal, progress, skor, hari_lalu)
  join public.profiles p on p.email = v.email
  join public.materials m on m.judul ilike v.judul_awal || '%'
),
upsert_progress as (
  insert into public.student_material_progress (student_id, material_id, progress, skor_terakhir, updated_at)
  select student_id, material_id, progress, skor, waktu from seed
  on conflict (student_id, material_id) do update set
    progress = excluded.progress, skor_terakhir = excluded.skor_terakhir, updated_at = excluded.updated_at
  returning 1
),
-- Riwayat kuis diganti total untuk siswa seed supaya tidak dobel saat dijalankan ulang.
hapus_kuis_lama as (
  delete from public.quiz_attempts
  where student_id in (select distinct student_id from seed)
  returning 1
)
insert into public.quiz_attempts (student_id, quiz_id, skor, lulus, tanggal)
select s.student_id, q.id, s.skor, s.skor >= 70, s.waktu
from seed s
join lateral (
  select id from public.quizzes where material_id = s.material_id limit 1
) q on true
where s.skor is not null;


-- ── BLOK 3 — VERIFIKASI ──────────────────────────────────────────────
-- Harus muncul 6 siswa (Alex + 5 baru) dengan rata-rata progress-nya.
select p.nama, p.email, sp.disabilitas, sp.kelas,
       count(smp.id) as jumlah_materi,
       coalesce(round(avg(smp.progress)), 0) as rata_progress
from public.profiles p
left join public.student_profiles sp on sp.id = p.id
left join public.student_material_progress smp on smp.student_id = p.id
where p.role = 'student'
group by p.nama, p.email, sp.disabilitas, sp.kelas
order by p.nama;


-- =====================================================================
--  ROLLBACK — hapus 5 siswa demo beserta semua datanya.
--  (Bila FK ke auth.users bukan ON DELETE CASCADE, hapus dulu baris di
--  quiz_attempts, student_material_progress, accessibility_settings,
--  student_profiles, profiles untuk email-email ini.)
-- =====================================================================
-- delete from auth.users
-- where email in ('sari@akses.id','budi@akses.id','fitri@akses.id','agus@akses.id','maya@akses.id');
