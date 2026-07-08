# Global Voice — Design Spec

**Tanggal:** 2026-07-08
**Status:** Disetujui untuk implementasi
**Scope:** Fitur suara global lintas-halaman untuk mode aksesibilitas tunanetra/keduanya: (a) auto-scan tombol di layar agar bisa diklik via suara tanpa pendaftaran manual per halaman, dan (b) perintah "bacakan konten" untuk membacakan isi konten utama halaman.

## 1. Latar Belakang

Platform AKSES punya sistem voice navigation (`useVoiceNavigation` + `TalkbackProvider`) yang aktif saat mode aksesibilitas = `tunanetra` atau `both`. Saat ini:

- Navigasi suara hanya mengenal **menu statis** (Beranda, Belajar, Kelas Live, Notifikasi, Profil), **nama materi** dari database, dan **perintah halaman yang didaftarkan manual** lewat `usePageVoiceCommands` / `registerPageCommands`.
- **Tidak ada satu halaman pun** yang benar-benar mendaftarkan tombolnya via `usePageVoiceCommands`. Akibatnya tombol di halaman (mis. "Edit Profil", "Keluar", "Tandai semua dibaca", "Bergabung") **tidak bisa** diklik via suara meski disebut di narasi.
- Belum ada cara membacakan **isi konten** halaman yang sebenarnya; yang ada hanya narasi singkat manual per-halaman (`PAGE_NARASI`).

Spec ini adalah **pekerjaan ② dari 3** yang dipecah dari permintaan besar:
- **③ (selesai):** Quiz voice flow — lihat `2026-07-07-quiz-voice-flow-design.md`.
- **② (spec ini):** Global voice — auto-scan tombol + "bacakan konten".
- **① (terpisah, belum):** Bug fix — izin mic/kamera bikin kepental ke login.

## 2. Tujuan & Kriteria Sukses

Siswa tunanetra dapat mengoperasikan tombol apa pun di layar dan mendengar isi halaman **tanpa melihat layar**, di halaman mana pun, tanpa tiap halaman harus mendaftar manual:

1. Setiap tombol/link yang **terlihat** di layar otomatis bisa diklik dengan mengucapkan namanya (mis. "edit profil", "keluar", "bergabung").
2. Daftar tombol diperbarui **secara live** saat layar berubah (mis. pop-up terbuka) tanpa pendaftaran manual.
3. Saat membuka halaman, sistem membacakan **sekali** narasi halaman + ringkasan ≤5 tombol utama.
4. User bisa bilang **"apa saja"** untuk mendengar daftar tombol lengkap saat itu.
5. User bisa bilang **"bacakan"** untuk mendengar isi konten utama halaman.
6. Halaman yang sudah punya alur suara khusus (mis. kuis) **tidak terganggu** — auto-scan senyap di sana.
7. Perilaku pengguna **non-tunanetra tidak berubah sama sekali**.

## 3. Batasan (Non-Goals)

- Tidak mengubah UI visual untuk pengguna awas.
- Tidak menangani bug kamera/login (① — terpisah).
- Tidak membacakan seluruh teks di layar (menu/sidebar); hanya konten utama (`<main>`).
- Tidak mengumumkan ulang daftar tombol setiap DOM berubah (hanya sekali/halaman + on-demand).
- Tidak menangani input teks via suara (mengisi form) — di luar scope.

## 4. Keputusan Desain (hasil brainstorming)

| Aspek | Keputusan |
|---|---|
| Timing scan tombol | **Live** — MutationObserver, daftar diperbarui diam-diam tiap DOM berubah |
| Isi "bacakan konten" | **Konten utama** — teks di dalam `<main>`, lewati kontrol/nav |
| Pengumuman daftar tombol | **Sekali saat buka halaman** (ringkas ≤5), sisanya on-demand ("apa saja") |
| Halaman ber-perintah-khusus (kuis) | **Dikecualikan** — auto-scan tidak mengumumkan & tidak mencocokkan tombol |

## 5. Arsitektur

### 5.1 File

| File | Aksi | Isi |
|---|---|---|
| `lib/voice/dom-scan.ts` | **Baru** (murni) | `scanClickables(root)` → daftar `ScannedCommand` |
| `lib/voice/content-read.ts` | **Baru** (murni) | `extractMainContent(root)` → string teks konten utama |
| `lib/hooks/useAutoVoiceScan.ts` | **Baru** | MutationObserver + `scannedRef` + pengumuman sekali/halaman |
| `lib/hooks/useVoiceNavigation.ts` | Edit | Perintah "bacakan"/"apa saja"; cocokkan tombol hasil scan |
| `components/accessibility/TalkbackProvider.tsx` | Edit | Panggil `useAutoVoiceScan`; `data-voice-ignore` pada kontrol melayang; teruskan `scannedRef` |
| `lib/voice/dom-scan.test.ts` | **Baru** | Unit test jsdom |
| `lib/voice/content-read.test.ts` | **Baru** | Unit test jsdom |

Semua aktif hanya saat `isAktif` (tunanetra/both) **dan** voice-nav ON **dan** bukan `/student/login`.

### 5.2 `dom-scan.ts`

```ts
export interface ScannedCommand {
  label: string;              // nama tombol yang dibacakan
  keywords: string[];         // kata kunci untuk pencocokan suara
  matchType: 'includes' | 'word';
  el: HTMLElement;            // target klik
}

export function scanClickables(root: HTMLElement): ScannedCommand[];
```

- **Selector:** `button, a[href], [role="button"], [role="tab"], input[type="button"], input[type="submit"]`.
- **Filter keluar:** `disabled`, `aria-hidden="true"`, tak terlihat (`offsetParent === null`), tanpa nama, atau berada di dalam elemen ber-`data-voice-ignore`.
- **Nama** (urut prioritas): `aria-label` → `textContent` (whitespace dirapikan, emoji/simbol non-huruf di tepi dibuang) → `title`. Dipangkas ~60 char.
- **keywords:** nama penuh (lowercase) + kata-kata >2 huruf dari nama.
- **matchType:** `'word'` bila nama ≤1 kata pendek (≤3 huruf) agar tidak salah picu; selain itu `'includes'`.
- **Dedup:** label sama (case-insensitive) → ambil pertama urut DOM.
- Fungsi murni terhadap DOM yang diberi (bisa diuji dengan jsdom).

### 5.3 `content-read.ts`

```ts
export function extractMainContent(root: HTMLElement): string;
```

- Jangkar: `root.querySelector('main')` bila ada, jika tidak `root`.
- Telusuri text node urut DOM. **Lewati** node yang berada di dalam: `button, a, input, textarea, select, nav, aside, [aria-hidden="true"], [data-voice-ignore], .sr-only`, dan elemen dengan `display:none`/`visibility:hidden` (dicek via ancestor, sedapat mungkin di jsdom via atribut/kelas — lihat catatan test 8).
- Rapikan whitespace tiap potongan; buang potongan kosong.
- Gabung antar-blok teks dengan ". " agar TTS memberi jeda.
- Kembalikan string; **kosong** jika tak ada konten (pemanggil mengucapkan "Tidak ada konten untuk dibacakan di halaman ini.").

### 5.4 `useAutoVoiceScan.ts`

Input: `aktif: boolean`, `scannedRef: RefObject<ScannedCommand[]>`, `pageCommandsRef: RefObject<PageVoiceCommand[]>`.

- **MutationObserver** pada `document.body` (`childList`, `subtree`, `attributes: ['disabled','aria-hidden','hidden']`), di-debounce ~400ms → jalankan `scanClickables(document.body)` dan tulis ke `scannedRef.current`. Observer hanya dipasang saat `aktif`.
- **Pengumuman sekali/halaman:** saat `pathname` berubah dan `aktif`, tunggu DOM tenang (~800ms), lalu — **hanya bila `pageCommandsRef` kosong** — ucapkan (prioritas `interrupt`):
  > "`<narasi PAGE_NARASI bila ada>` Tombol tersedia: `<≤5 label pertama>`. Katakan 'apa saja' untuk daftar lengkap, atau 'bacakan' untuk mendengar isi halaman."
  Bila `PAGE_NARASI` tidak ada untuk path itu, mulai langsung dari "Tombol tersedia: …". Bila tak ada tombol sama sekali, lewati bagian tombol.
- Pengumuman ini **menggantikan** narasi otomatis lama di `TalkbackProvider` (lihat 5.6) agar tidak dobel.
- Tidak pernah bersuara lagi saat MutationObserver memperbarui daftar.

### 5.5 Perubahan `useVoiceNavigation.processCommand`

Terima `scannedRef` (via argumen hook). Urutan pencocokan (pertama menang):

1. **stop / berhenti / diam / hentikan** → matikan (perilaku lama).
2. **bantuan / apa saja / tombol apa / perintah** → bacakan daftar: gabungan label perintah halaman terdaftar + label tombol hasil scan saat ini (dedup). Bila keduanya kosong, fallback ke daftar menu statis (perilaku lama).
3. **bacakan / bacakan konten / baca halaman / baca konten / bacakan halaman** → `extractMainContent(document.body)`; ucapkan hasilnya (atau pesan "tidak ada konten").
4. **perintah halaman terdaftar** (`pageCommandsRef`) — prioritas aksi tertinggi (perilaku lama, kuis dll).
5. **menu statis** (`STATIC_COMMANDS`) — perilaku lama.
6. **tombol hasil auto-scan** (`scannedRef`) — **baru**. Di-skip bila `pageCommandsRef` tidak kosong (halaman ber-perintah-khusus). Cocok → `speak("Membuka <label>.", 'interrupt')` + cooldown, lalu `el.click()` (pola serupa perintah halaman).
7. **materi dari database** — perilaku lama.

### 5.6 Perubahan `TalkbackProvider.tsx`

- Panggil `useAutoVoiceScan(isVoiceNavAktif && isAktif && !isLoginPage, scannedRef, pageCommandsRef)` dan buat `scannedRef`.
- Teruskan `scannedRef` ke `useVoiceNavigation(...)`.
- Tambahkan `data-voice-ignore` pada kontainer tombol kontrol melayang (mic/stop/bantuan) agar tak ikut ter-scan/terbaca.
- **Pindahkan** narasi otomatis per-halaman (`PAGE_NARASI` effect saat ini di provider) ke `useAutoVoiceScan` agar digabung dengan pengumuman tombol dan tidak dobel. `PAGE_NARASI` diekspor/diteruskan agar bisa dipakai di hook.
- Panel bantuan visual (opsional) boleh menampilkan label tombol hasil scan; tidak wajib untuk v1.

## 6. Alur Detail

### 6.1 Buka halaman (mode tunanetra, voice-nav ON)
Pindah ke `/student/profile` → DOM tenang → (pageCommands kosong) ucapkan: "Profil Saya. `<narasi>` Tombol tersedia: Edit Profil, Aksesibilitas, Keluar. Katakan 'apa saja' untuk daftar lengkap, atau 'bacakan' untuk mendengar isi halaman."

### 6.2 Klik tombol via suara
Ucap "keluar" → cocok dengan tombol scan berlabel "Keluar" → "Membuka Keluar." → `el.click()`.

### 6.3 Pop-up muncul (Live)
Dialog konfirmasi terbuka dengan tombol "Ya"/"Batal" → MutationObserver memperbarui `scannedRef` (senyap) → user langsung bisa ucap "ya".

### 6.4 "apa saja"
Ucap "apa saja" → bacakan seluruh label tombol saat ini.

### 6.5 "bacakan"
Ucap "bacakan" → `extractMainContent` → bacakan isi `<main>` urut DOM (lewati tombol/nav). "stop" menghentikan.

### 6.6 Halaman kuis
`pageCommandsRef` terisi (A/B/C/D/lanjut) → pengumuman auto-scan dilewati; pencocokan tombol scan dilewati; intro & perintah kuis jalan seperti biasa.

## 7. File yang Disentuh

| File | Aksi |
|---|---|
| `lib/voice/dom-scan.ts` | Baru |
| `lib/voice/content-read.ts` | Baru |
| `lib/hooks/useAutoVoiceScan.ts` | Baru |
| `lib/hooks/useVoiceNavigation.ts` | Edit — terima `scannedRef`, tambah perintah "bacakan"/"apa saja", cocokkan tombol scan |
| `components/accessibility/TalkbackProvider.tsx` | Edit — `scannedRef`, panggil `useAutoVoiceScan`, `data-voice-ignore`, pindah narasi |
| `lib/voice/dom-scan.test.ts` | Baru |
| `lib/voice/content-read.test.ts` | Baru |

## 8. Rencana Testing

**Unit (jsdom):**
- `dom-scan`:
  - Ambil label dari `aria-label` dan dari teks; prioritas aria-label > teks > title.
  - Lewati `disabled`, `aria-hidden="true"`, elemen di dalam `[data-voice-ignore]`.
  - Dedup dua tombol berlabel sama → satu entri.
  - Label 1 kata pendek → `matchType: 'word'`; frasa → `'includes'`.
  - Emoji/simbol di tepi teks dibuang dari label.
  - Catatan: `offsetParent`/visibilitas sulit di jsdom → gunakan penanda yang bisa dites (mis. `hidden`/`aria-hidden`/kelas) dan uji jalur filter berbasis atribut; visibilitas layout diverifikasi manual.
- `content-read`:
  - Teks hanya dari dalam `<main>`; teks di `nav`/`aside`/tombol dilewati.
  - `.sr-only` dan `[aria-hidden="true"]` dilewati.
  - Tanpa `<main>` → fallback ke root.
  - Tak ada konten → string kosong.

**Manual (Chrome), mode tunanetra:**
- Profil: dengar narasi + daftar tombol; "edit profil" → pindah; "bacakan" → dengar isi; "apa saja" → daftar lengkap.
- Halaman dengan pop-up: buka pop-up → ucap tombol pop-up → terklik (uji Live).
- Kuis: intro & A/B/C/D/lanjut tidak terganggu; tidak ada pengumuman tombol auto-scan.
- Mode non-tunanetra: tidak ada perubahan perilaku.

## 9. Risiko & Catatan

- **Berisik saat DOM sering berubah** → dimitigasi: pengumuman hanya sekali/halaman; MutationObserver hanya memperbarui daftar diam-diam (debounce ~400ms).
- **Label ambigu/ganda** → ambil match pertama urut DOM; label pendek pakai `matchType: 'word'`.
- **`<main>` menyertakan header** (mis. "Profil Saya" + tombol Edit) → tombol dilewati saat baca konten; teks header ikut terbaca (wajar sebagai bagian isi halaman).
- **Visibilitas di jsdom** → `offsetParent` tidak andal di jsdom; filter visibilitas layout diuji manual, filter berbasis atribut diuji di unit test.
- **Performa MutationObserver** → debounce + scan ringan; hanya jalan saat mode aktif & voice-nav ON.
- **Konsistensi `<main>`** → semua halaman student saat ini memakai `<main>`; bila ada halaman tanpa `<main>`, `extractMainContent` fallback ke root (lebih ramai tapi tetap berfungsi).
