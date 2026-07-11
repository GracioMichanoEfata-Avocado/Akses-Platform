-- =====================================================================
--  Notifikasi — izinkan siswa menghapus notifikasinya sendiri
--
--  Tabel notifications tidak punya policy DELETE, sehingga tombol hapus
--  (ikon tempat sampah) di /student/notifications gagal diam-diam:
--  RLS menolak (0 baris terhapus, tanpa error), notifikasi hilang dari
--  layar lalu muncul lagi saat refresh.
--
--  Jalankan di Supabase → SQL Editor.
-- =====================================================================

create policy "users delete own notifications" on public.notifications
  for delete
  using (auth.uid() = user_id);

-- Verifikasi: harus muncul policy DELETE baru.
select policyname, cmd from pg_policies
where tablename = 'notifications' and cmd = 'DELETE';
