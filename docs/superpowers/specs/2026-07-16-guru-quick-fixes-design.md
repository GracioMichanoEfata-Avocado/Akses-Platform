# Batch Fixes — T1 (transkrip live hilang), Onboarding leftover, Nama siswa di sidebar

**Tanggal:** 2026-07-16
**Cakupan:** Lanjutan dari `2026-07-09-fixes-batch-design.md`, yang saat itu menyisakan T1 (transkrip live) sebagai item ditunda. Tiga perbaikan kecil dan terisolasi; tidak ada ketergantungan antar-fix.

**Di luar cakupan (dicatat untuk nanti, akan jadi paket terpisah):**
- Audit voice-command coverage menyeluruh di semua halaman murid (paket besar berikutnya, sudah disepakati urutannya dengan user).
- Rombak katalog materi berbasis disabilitas (STT subtitle tunarungu, toggle filter kontras tunanetra, cakupan audio, mode "keduanya").
- Notifikasi real-time guru saat murid klik "Minta Pendamping".

---

## T1 — Transkrip live: tidak muncul sama sekali + rombak jadi subtitle di layar video

**Revisi 2026-07-16 (setelah user kirim mockup):** desain awal (bubble mengambang + tab "Transkrip" terpisah di sidebar) diganti sesuai arahan user — transkrip harus tampil sebagai **subtitle permanen di atas area video** (seperti Zoom/Meet), muncul untuk **semua orang tanpa syarat mode aksesibilitas**, dan panel kanan disederhanakan jadi **cuma Tanya Jawab** (tab "Transkrip"/"Caption" dihapus dari sidebar).

### Gejala
1. Saat sesi live berlangsung, tidak ada transkrip/caption yang muncul sama sekali, baik di sisi guru maupun murid.
2. Tampilan yang diinginkan: teks hasil dikte guru muncul sebagai baris subtitle di bagian bawah area video (persis seperti closed caption pada video call), terlihat oleh guru maupun murid — bukan disembunyikan di tab sidebar.

### Akar masalah (kenapa selama ini kosong)
1. **Sisi murid — listener data channel digating oleh `subtitleEnabled`.** Di `app/student/live/page.tsx:411-413`, `LiveCaptionOverlay` — satu-satunya tempat yang memanggil `useDataChannel('caption', ...)` — hanya dirender bila `subtitleEnabled` true. Karena `setMode()` di `lib/store/accessibility-store.ts` cuma set `subtitleEnabled: true` otomatis untuk mode tunarungu/both, siswa tunanetra (default `subtitleEnabled: false`) tidak pernah subscribe ke data channel → transkrip kosong selamanya untuk mereka.
2. **Sisi guru — tidak ada `onerror` handler di `SpeechRecognition`.** Di `CaptionTab` (`app/teacher/actions/page.tsx`, baris ~33-54), bila mic permission ditolak atau recognition gagal, tidak ada indikasi apapun — terlihat seperti fitur tidak berfungsi.
3. **Sisi guru — caption sendiri tidak pernah ditampilkan di atas video guru**, cuma di kotak kecil dalam tab sidebar yang terpisah dari area video.

### Perbaikan

**A. Komponen `LiveSubtitleBar` — subtitle permanen di bawah area video, tanpa syarat mode.**
- Buat komponen kecil bersama (mis. `components/live/LiveSubtitleBar.tsx`) yang menampilkan bar semi-transparan gelap di bagian bawah area `<LiveKitRoom>`, teks besar-terbaca, menampilkan baris caption terkini. **Tidak digating oleh `subtitleEnabled`** apapun — selalu tampil untuk siapapun yang ada di kelas live, guru maupun murid, semua mode aksesibilitas. Ini otomatis menuntaskan bug T1.1 (transkrip kosong untuk tunanetra) karena tidak ada lagi kondisi yang menyembunyikan listener-nya.
- **Sisi murid** (`app/student/live/page.tsx`): ganti `LiveCaptionOverlay` (bubble atas + auto-hide 6 detik) dengan `LiveSubtitleBar` yang selalu mount di dalam `<LiveKitRoom>` dan selalu subscribe `useDataChannel('caption', ...)`. Toggle "Bacakan caption otomatis" (`ttsLive`, tombol TTS di header) tetap dipertahankan sebagai fitur terpisah, opsional, dan tetap bisa ditoggle murid manapun.
- **Sisi guru** (`app/teacher/actions/page.tsx`): render `LiveSubtitleBar` yang sama di dalam `<LiveKitRoom>`, menampilkan `caption` (state hasil dikte lokal) langsung — tidak perlu lewat data channel karena guru adalah sumbernya.
- Riwayat caption lama (`history`/`session_transcripts`) **tidak lagi ditampilkan live** sebagai daftar di sidebar (lihat poin C) — tetap disimpan ke tabel `session_transcripts` untuk keperluan lain (catatan sesi), sesuai perilaku yang sudah ada, hanya tidak dirender sebagai panel scroll saat sesi berlangsung.

**B. Kontrol mulai/berhenti caption (guru) pindah ke dekat subtitle bar.**
- Sebelumnya tombol "Mulai/Hentikan Caption Otomatis" ada di dalam tab sidebar "Caption". Karena tab itu dihapus (poin C), pindahkan tombol ini jadi kontrol kecil mengambang menempel di `LiveSubtitleBar` sisi guru (mis. ikon mic kecil di ujung bar) — tetap fungsi yang sama (`toggleListening`), cuma posisinya pindah ke atas video, bukan di sidebar.

**C. Sederhanakan panel kanan jadi cuma Tanya Jawab (kedua sisi).**
- **Guru** (`app/teacher/actions/page.tsx`): hapus tab switcher "Caption"/"Tanya Jawab" — sidebar kanan langsung render `QATab` saja, tanpa tab bar.
- **Murid** (`app/student/live/page.tsx`): hapus `TranscriptTab` dan tab switcher "Transkrip"/"Tanya Jawab" — sidebar kanan langsung render `QuestionTab` saja, tanpa tab bar. State `captions`/`activeTab` yang jadi tidak terpakai ikut dihapus.

**D. Tambah `onerror` handler (guru).**
- **File:** `app/teacher/actions/page.tsx`, dalam `CaptionTab`
- Tambahkan:
  ```ts
  rec.onerror = (e: any) => {
    if (e.error === 'not-allowed') {
      alert('Izin mikrofon ditolak. Aktifkan mikrofon di pengaturan browser lalu coba lagi.');
    }
    setIsListening(false);
  };
  ```
- Ikuti pola yang sama dengan `rec.onerror` yang sudah ada di `lib/hooks/useVoiceNavigation.ts:160-165` (konsisten dengan bagian aplikasi lain).

**Catatan `subtitleEnabled` (store):** field ini tetap ada di `accessibility-store.ts` (masih dipakai di `app/student/profile/page.tsx` untuk menampilkan setting), hanya **tidak lagi dipakai untuk gating** apapun di halaman live. Tidak ada perubahan pada store itu sendiri.

### Kriteria sukses
- Siapapun (guru atau murid, mode apapun) yang masuk kelas live saat guru mengaktifkan caption: melihat subtitle berjalan di bagian bawah area video secara real-time.
- Guru melihat subtitle dari dikte suaranya sendiri langsung di atas video-nya (bukan hanya di kotak kecil terpisah).
- Panel kanan pada kedua sisi hanya berisi Tanya Jawab — tidak ada tab "Transkrip"/"Caption" lagi.
- Guru yang menekan tombol mulai caption dan menolak izin mikrofon melihat pesan error yang jelas, bukan tombol yang terlihat tidak berfungsi.

---

## Onboarding — bersihkan sisa referensi

### Konteks
Halaman `app/teacher/onboarding/page.tsx` **sudah dihapus** di batch sebelumnya (T2, 2026-07-09) bersama link navigasinya di `TeacherSidebar.tsx`. Yang tersisa sekarang hanyalah folder `app/teacher/onboarding/` kosong (tanpa `page.tsx`, tidak ter-route) dan penyebutan "Onboarding 3-Step" di `README.md` yang sudah tidak sesuai kenyataan.

### Perbaikan
- Hapus folder kosong `app/teacher/onboarding/` (tidak berisi apa-apa, hanya sisa).
- Perbarui `README.md`: hapus/ubah baris yang menyebut "Onboarding 3-Step" dan entri `onboarding/` di tree struktur proyek, supaya dokumentasi tidak menyesatkan.

### Kriteria sukses
- Tidak ada lagi folder `app/teacher/onboarding/` di repo.
- `README.md` tidak lagi menyebut fitur onboarding yang tidak ada.

---

## Nama siswa tidak sinkron di `StudentSidebar`

### Gejala
Label "Mode Siswa" di sidebar murid selalu menampilkan **"Alex Pratama"**, tidak berubah walau siswa sudah edit profil.

### Akar masalah
`components/shared/StudentSidebar.tsx:71` menampilkan string hardcode `"Alex Pratama"` — ini persis bug yang sama dengan T3 (nama guru) di batch sebelumnya, tapi belum pernah diperbaiki untuk sisi murid.

### Perbaikan
Terapkan pola yang identik dengan perbaikan `TeacherSidebar` (T3, 2026-07-09):
- **File:** `components/shared/StudentSidebar.tsx`
- Tambah `'use client'` (cek sudah ada), tambah state `nama`, `useEffect` yang fetch sekali saat mount:
  ```ts
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data } = await supabase.from('profiles').select('nama').eq('id', user.id).single();
    setNama(data?.nama ?? '');
  }
  ```
- Render `nama` (fallback "Siswa" saat loading/null) menggantikan `"Alex Pratama"` di baris 71.
- **Keamanan:** data yang dibaca milik user login sendiri (`id = user.id`); tidak menambah risiko akses silang guru/murid (dijaga di middleware + RLS, bukan di komponen ini).

### Kriteria sukses
- Sidebar murid menampilkan nama siswa yang login (bukan "Alex Pratama").
- Setelah edit nama di `/student/profile/edit` lalu kembali/refresh, sidebar menampilkan nama baru.

---

## Verifikasi keseluruhan
- `npx tsc --noEmit` — tidak ada error baru terkait file yang disentuh.
- `npm run build` — sukses.
- Uji manual: (T1) sesi live — subtitle muncul di bawah video untuk guru & murid (mode apapun), panel kanan cuma Tanya Jawab di kedua sisi, guru dapat pesan error saat mic ditolak; (Onboarding) folder hilang, README bersih; (Sidebar murid) nama ter-update setelah edit profil.
