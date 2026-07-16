# Batch Fixes — T1 (transkrip live hilang), Onboarding leftover, Nama siswa di sidebar

**Tanggal:** 2026-07-16
**Cakupan:** Lanjutan dari `2026-07-09-fixes-batch-design.md`, yang saat itu menyisakan T1 (transkrip live) sebagai item ditunda. Tiga perbaikan kecil dan terisolasi; tidak ada ketergantungan antar-fix.

**Di luar cakupan (dicatat untuk nanti, akan jadi paket terpisah):**
- Audit voice-command coverage menyeluruh di semua halaman murid (paket besar berikutnya, sudah disepakati urutannya dengan user).
- Rombak katalog materi berbasis disabilitas (STT subtitle tunarungu, toggle filter kontras tunanetra, cakupan audio, mode "keduanya").
- Notifikasi real-time guru saat murid klik "Minta Pendamping".

---

## T1 — Transkrip live tidak muncul sama sekali (guru & murid)

### Gejala
Saat sesi live berlangsung, tidak ada transkrip/caption yang muncul, baik di sisi guru maupun murid.

### Akar masalah
Ada dua penyebab independen yang bertumpuk:

1. **Sisi murid — listener data channel digating oleh `subtitleEnabled`.**
   Di `app/student/live/page.tsx:411-413`, komponen `LiveCaptionOverlay` — satu-satunya tempat yang memanggil `useDataChannel('caption', ...)`, yaitu listener yang menerima teks caption dari guru — hanya dirender jika `subtitleEnabled` bernilai `true`:
   ```tsx
   {subtitleEnabled && (
     <LiveCaptionOverlay ttsEnabled={ttsLive} ttsRate={ttsRate} onNewCaption={handleNewCaption} />
   )}
   ```
   Di `lib/store/accessibility-store.ts`, `setMode()` hanya meng-set `subtitleEnabled: true` otomatis untuk mode `tunarungu`/`both`. Untuk siswa **tunanetra** (default `subtitleEnabled: false`), `LiveCaptionOverlay` tidak pernah ter-mount → `useDataChannel` tidak pernah subscribe → `onNewCaption` tidak pernah dipanggil → state `captions` di `StudentLivePage` tetap kosong selamanya → `TranscriptTab` (panel di sidebar, yang seharusnya berguna untuk **semua** mode, bukan cuma tunarungu) ikut kosong.

2. **Sisi guru — tidak ada `onerror` handler di `SpeechRecognition`.**
   Di `app/teacher/actions/page.tsx` fungsi `CaptionTab`, instance `SpeechRecognition` (baris ~33-54) tidak memiliki `rec.onerror`. Bila mic permission ditolak, atau browser menghentikan recognition karena alasan lain (`audio-capture`, `network`, dll.), guru menekan "Mulai Caption Otomatis" tapi tidak terjadi apa-apa dan tidak ada indikasi kenapa — terlihat seperti fitur "tidak ada", padahal recognition gagal secara senyap.

### Perbaikan

**A. Pisahkan listener data channel dari kondisi render overlay (murid).**
- **File:** `app/student/live/page.tsx`
- Pindahkan pemanggilan `useDataChannel('caption', ...)` ke komponen yang **selalu** dirender di dalam `<LiveKitRoom>` (tidak bergantung pada `subtitleEnabled`), sehingga `handleNewCaption` — dan karenanya state `captions` yang dipakai `TranscriptTab` — selalu terisi untuk **semua** mode aksesibilitas.
- Tetap gating **tampilan bubble overlay + auto-TTS** (efek visual/suara di atas video) di balik `subtitleEnabled`, karena itu memang didesain sebagai fitur tambahan untuk tunarungu/keduanya — bukan dihapus, cuma dipisah dari listener-nya.
- Pendekatan konkret: pecah `LiveCaptionOverlay` jadi dua bagian — hook/komponen kecil tanpa UI yang selalu mount dan memanggil `useDataChannel` + `onNewCaption`, dan bagian render bubble yang menerima `caption`/`visible` sebagai props dan hanya dirender bila `subtitleEnabled`. Cara termudah: render komponen listener selalu, teruskan `subtitleEnabled` sebagai prop ke dalamnya untuk memutuskan apakah bubble+TTS ditampilkan, alih-alih membungkus seluruh komponen dengan `{subtitleEnabled && ...}` di parent.

**B. Tambah `onerror` handler (guru).**
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

### Kriteria sukses
- Siswa mode **tunanetra** (tanpa mengubah pengaturan subtitle) yang masuk kelas live dan guru mengaktifkan caption: panel **Transkrip** di sidebar terisi teks berjalan, sama seperti mode tunarungu/keduanya.
- Bubble caption mengambang di atas video (dan auto-TTS-nya) **tetap** hanya muncul untuk mode tunarungu/keduanya — perilaku ini tidak berubah.
- Guru yang menekan "Mulai Caption Otomatis" dan menolak izin mikrofon melihat pesan error yang jelas, bukan tombol yang terlihat tidak berfungsi.

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
- Uji manual: (T1) sesi live dengan siswa mode tunanetra melihat transkrip terisi + guru dapat pesan error saat mic ditolak; (Onboarding) folder hilang, README bersih; (Sidebar murid) nama ter-update setelah edit profil.
