# Batch Fixes Implementation Plan — S1 / T3 / T2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memperbaiki tiga masalah terisolasi: (S1) memilih tunanetra/keduanya menyebabkan bounce ke login + prompt kamera; (T3) nama guru di sidebar hardcode dan tak ikut ter-update; (T2) menghapus menu & halaman onboarding guru yang berupa demo kosong.

**Architecture:** Ketiga perbaikan berdiri sendiri, tidak ada ketergantungan antar-task. S1 menyalurkan narasi selamat datang lewat `speak()` (useTalkback) agar guard anti-dengar-sendiri aktif. T3 mengambil nama guru dari `profiles` milik user yang login. T2 menghapus satu item nav + folder rute.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Supabase JS client, Web Speech API (`lib/hooks/useTalkback.ts`).

## Global Constraints

- Bahasa TTS & UI: Indonesia.
- TTS memakai `speak(text, priority)` dari `lib/hooks/useTalkback.ts`; `priority ∈ {'normal','interrupt'}`. Guard anti-dengar-sendiri di `useVoiceNavigation` bergantung pada `isTTSSpeaking()` yang HANYA bernilai true untuk utterance yang diputar via `speak()`.
- Nama guru diambil dari kolom `profiles.nama` untuk `id = user.id` (user yang sedang login), memakai `createClient()` dari `@/lib/supabase/client`.
- Voice-nav auto-aktif saat mode `tunanetra`/`both` (perilaku `TalkbackProvider` yang sudah ada); tunanetra tidak perlu memencet tombol. Izin mic adalah dialog bawaan browser yang wajib & sekali — tidak dihapus.
- Tidak ada unit test untuk komponen/halaman/hook browser-driven di repo ini; verifikasi lewat `npx tsc --noEmit`, `npm run build`, dan uji manual — ikuti pola plan sebelumnya (`2026-07-08-global-voice.md` Task 6).
- Pesan commit berbahasa Indonesia, diakhiri baris `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: T2 — Hapus menu & halaman onboarding guru

**Files:**
- Modify: `components/shared/TeacherSidebar.tsx` (array `navItems` baris 8–18; impor ikon baris 5)
- Delete: `app/teacher/onboarding/page.tsx` (dan folder `app/teacher/onboarding/`)

**Interfaces:**
- Consumes: —
- Produces: — (tidak ada ekspor baru; hanya penghapusan)

- [ ] **Step 1: Hapus item nav onboarding**

Di `components/shared/TeacherSidebar.tsx`, hapus baris item onboarding dari array `navItems`:
```ts
  { href: '/teacher/onboarding', label: 'Onboarding', icon: UserPlus },
```
Sehingga `navItems` menjadi (urutan lain tetap):
```ts
const navItems = [
  { href: '/teacher/dashboard', label: 'Dashboard', icon: Home },
  { href: '/teacher/students', label: 'Siswa Saya', icon: Users },
  { href: '/teacher/materials', label: 'Kelola Materi', icon: BookOpen },
  { href: '/teacher/upload-materi', label: 'Upload Materi AI', icon: Sparkles },
  { href: '/teacher/create-session', label: 'Buat Sesi', icon: PlusCircle },
  { href: '/teacher/actions', label: 'Aksi Aktual', icon: Zap },
  { href: '/teacher/report', label: 'Laporan', icon: BarChart2 },
  { href: '/teacher/profile', label: 'Profil Saya', icon: UserCircle },
];
```

- [ ] **Step 2: Hapus impor ikon `UserPlus` yang tak lagi terpakai**

Di baris impor `lucide-react` (baris 5), hapus `UserPlus` dari daftar. Baris menjadi:
```ts
import { Home, Users, PlusCircle, Zap, BarChart2, GraduationCap, Sparkles, BookOpen, UserCircle } from 'lucide-react';
```

- [ ] **Step 3: Hapus folder rute onboarding**

Run:
```bash
git rm app/teacher/onboarding/page.tsx
```
Expected: file terhapus dari index git. Bila folder `app/teacher/onboarding/` menjadi kosong, git otomatis mengabaikannya (git tidak melacak folder kosong).

- [ ] **Step 4: Pastikan tak ada referensi menggantung**

Run:
```bash
grep -rn "teacher/onboarding\|UserPlus" app components lib --include=*.ts --include=*.tsx
```
Expected: TIDAK ada hasil (semua referensi onboarding & `UserPlus` sudah hilang).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: Tidak ada error baru terkait `TeacherSidebar.tsx` atau rute onboarding.

- [ ] **Step 6: Commit**

```bash
git add components/shared/TeacherSidebar.tsx
git commit -m "chore: hapus menu & halaman onboarding guru (demo kosong tanpa persistensi)"
```
(`git rm` di Step 3 sudah men-stage penghapusan `page.tsx`.)

---

### Task 2: T3 — Nama guru di sidebar diambil dinamis dari profil

**Files:**
- Modify: `components/shared/TeacherSidebar.tsx`

**Interfaces:**
- Consumes: `createClient` dari `@/lib/supabase/client`; kolom `profiles.nama`.
- Produces: — (perubahan internal komponen; tidak ada ekspor baru)

- [ ] **Step 1: Tambah impor React hooks & Supabase client**

Di `components/shared/TeacherSidebar.tsx`, ubah impor:
```ts
import Link from 'next/link';
import { usePathname } from 'next/navigation';
```
menjadi (tambah `useEffect`, `useState`, dan `createClient`):
```ts
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
```

- [ ] **Step 2: Tambah state & fetch nama guru di dalam komponen**

Di dalam `export default function TeacherSidebar()`, tepat setelah `const pathname = usePathname();`, tambahkan:
```ts
  const [nama, setNama] = useState('');

  useEffect(() => {
    const supabase = createClient();
    async function loadNama() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('nama')
        .eq('id', user.id)
        .single();
      if (data?.nama) setNama(data.nama);
    }
    loadNama();
  }, []);
```

- [ ] **Step 3: Render nama dinamis menggantikan hardcode**

Ganti blok "Teacher info" (baris ~70–75) yang berisi `"Bu Sari Dewi"`:
```tsx
      {/* Teacher info */}
      <div className="px-4 py-4 border-t border-slate-100">
        <div className="bg-emerald-50 rounded-xl p-3">
          <p className="text-xs text-emerald-700 font-medium">Mode Guru</p>
          <p className="text-xs text-slate-500 mt-0.5">Bu Sari Dewi</p>
        </div>
      </div>
```
menjadi:
```tsx
      {/* Teacher info */}
      <div className="px-4 py-4 border-t border-slate-100">
        <div className="bg-emerald-50 rounded-xl p-3">
          <p className="text-xs text-emerald-700 font-medium">Mode Guru</p>
          <p className="text-xs text-slate-500 mt-0.5">{nama || 'Guru'}</p>
        </div>
      </div>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: Tidak ada error baru terkait `TeacherSidebar.tsx`.

- [ ] **Step 5: Uji manual**

Run: `npm run dev`, login sebagai guru, buka `/teacher/dashboard`.
Verifikasi:
- [ ] Kotak "Mode Guru" menampilkan nama guru yang login (bukan "Bu Sari Dewi"); saat loading singkat tampil "Guru".
- [ ] Buka `/teacher/profile/edit`, ubah nama, simpan, muat ulang halaman → sidebar menampilkan nama baru.

- [ ] **Step 6: Commit**

```bash
git add components/shared/TeacherSidebar.tsx
git commit -m "fix: nama guru di sidebar diambil dari profil login, bukan hardcode"
```

---

### Task 3: S1 — Narasi selamat datang via speak() + selaraskan teks (hentikan bounce & prompt kamera)

**Files:**
- Modify: `app/student/login/page.tsx` (impor + `handleSaveSetup`, blok welcome baris ~93–105)

**Interfaces:**
- Consumes: `speak` dari `@/lib/hooks/useTalkback` — signatur `speak(text: string, priority?: 'normal' | 'interrupt')`.
- Produces: — (perubahan internal; tidak ada ekspor baru)

- [ ] **Step 1: Tambah impor `speak`**

Di `app/student/login/page.tsx`, setelah impor `createClient` (baris 9), tambahkan:
```ts
import { speak } from '@/lib/hooks/useTalkback';
```

- [ ] **Step 2: Ganti blok welcome agar memakai `speak()` dan teks yang selaras**

Di `handleSaveSetup`, ganti blok welcome yang ada:
```ts
    // Welcome talkback untuk tunanetra
    const isTunanetra = mode === 'tunanetra' || mode === 'both';
    if (isTunanetra && typeof window !== 'undefined' && window.speechSynthesis) {
      const welcomeText = `Halo! Selamat datang di AKSES, platform belajar inklusif. Saya akan memandu Anda. Menu yang tersedia adalah: Beranda, Belajar, Kelas Live, Notifikasi, dan Profil. Ucapkan nama menu untuk berpindah halaman, atau ketuk tombol mikrofon di pojok kanan bawah layar untuk mengaktifkan navigasi suara.`;
      const utterance = new SpeechSynthesisUtterance(welcomeText);
      utterance.lang = 'id-ID';
      utterance.rate = 0.9;
      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find(v => v.lang.startsWith('id'));
      if (idVoice) utterance.voice = idVoice;
      window.speechSynthesis.cancel();
      setTimeout(() => window.speechSynthesis.speak(utterance), 500);
    }
```
menjadi:
```ts
    // Welcome talkback untuk tunanetra — WAJIB lewat speak() agar isTTSSpeaking()
    // true selama narasi, sehingga voice-nav tidak menangkap kata di narasi
    // (mis. "Kelas Live") dan memicu navigasi liar → prompt kamera + bounce login.
    const isTunanetra = mode === 'tunanetra' || mode === 'both';
    if (isTunanetra) {
      const welcomeText = `Halo! Selamat datang di AKSES, platform belajar inklusif. Navigasi suara aktif otomatis. Bila diminta, izinkan akses mikrofon. Setelah itu, ucapkan nama menu untuk berpindah halaman. Menu yang tersedia: Beranda, Belajar, Kelas Live, Notifikasi, dan Profil.`;
      setTimeout(() => speak(welcomeText, 'interrupt'), 500);
    }
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: Tidak ada error baru terkait `app/student/login/page.tsx`. (Impor `SpeechSynthesisUtterance` manual sudah tak dipakai; pastikan tak ada variabel menggantung `utterance`/`idVoice`/`voices`.)

- [ ] **Step 4: Uji manual (Chrome, mode Keduanya)**

Run: `npm run dev`. Login siswa, di layar setup pilih **Keduanya**, tekan **Simpan & Lanjutkan**.
Verifikasi:
- [ ] Mendarat di `/student/dashboard` dan **tetap di sana** (tidak terpental ke `/student/login`).
- [ ] Muncul prompt izin **mikrofon** bawaan browser (sekali) — **tidak** ada prompt kamera.
- [ ] Setujui mikrofon → indikator "Mendengarkan..." muncul; narasi selamat datang terdengar penuh **tanpa** melompat ke Kelas Live.
- [ ] Ucap "profil" → berpindah ke halaman Profil (voice-nav berfungsi normal).
- [ ] Ulangi login dengan mode **Tidak Ada** → tidak ada suara, tidak ada prompt mic/kamera, langsung ke dashboard.

- [ ] **Step 5: Commit**

```bash
git add app/student/login/page.tsx
git commit -m "fix: narasi welcome via speak() - stop bounce login & prompt kamera saat pilih tunanetra"
```

---

### Task 4: Verifikasi akhir (build)

**Files:** (tidak ada perubahan kode)

- [ ] **Step 1: Typecheck penuh**

Run: `npx tsc --noEmit`
Expected: Tidak ada error baru dari ketiga file yang disentuh.

- [ ] **Step 2: Build produksi**

Run: `npm run build`
Expected: Build sukses. Rute `/teacher/onboarding` **tidak** lagi muncul di daftar rute; rute lain tetap ada.

- [ ] **Step 3: (opsional) Commit catatan bila ada penyesuaian kecil dari uji manual**

Bila ada perbaikan kecil hasil uji manual, commit terpisah dengan pesan deskriptif.

---

## Catatan & Batasan Diketahui

- **Izin mic tidak dapat dihilangkan:** Web Speech API mewajibkan izin mikrofon dari browser untuk mendengar perintah. Target fix adalah izin **sekali** + auto-aktif, bukan menghilangkan prompt.
- **Race cookie SSR:** Bila bounce ke login masih terjadi sesekali pada mode **Tidak Ada** juga (bukan spesifik tunanetra), itu isu terpisah (sinkronisasi sesi Supabase SSR) di luar cakupan S1 — S1 hanya menghilangkan penyebab yang dipicu narasi suara. Bila teramati saat uji, catat sebagai temuan baru, jangan perluas task ini.
- **Audit pemisahan akses guru/murid (RLS + middleware role)** sengaja tidak dikerjakan di batch ini; dicatat untuk plan terpisah.
