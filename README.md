# AKSES - Akses Edukasi Setara

> **Platform belajar digital inklusif untuk penyandang disabilitas sensorik di Indonesia**

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38BDF8?logo=tailwindcss)](https://tailwindcss.com)
[![Status](https://img.shields.io/badge/Status-In%20Development-orange)]()

---

## Overview

**AKSES** (Akses Edukasi Setara) adalah platform pembelajaran digital yang dirancang dari bawah ke atas untuk memastikan setiap siswa terlepas dari keterbatasan sensorik mereka yaitu mendapatkan pengalaman belajar yang setara, bermartabat, dan efektif. Platform ini menempatkan aksesibilitas bukan sebagai fitur tambahan, melainkan sebagai filosofi utama desain produk.

Di Indonesia, lebih dari 22 juta jiwa hidup dengan disabilitas (Susenas 2020), namun platform edukasi digital yang ada hampir seluruhnya dirancang untuk pengguna tanpa keterbatasan. Akibatnya, siswa tunanetra dan tunarungu terpaksa belajar dari materi yang tidak dapat mereka akses secara penuh video tanpa subtitle, teks tanpa dukungan audio, dan antarmuka yang tidak kompatibel dengan teknologi bantu.

AKSES menjawab tantangan ini dengan menyediakan dua jalur pembelajaran yang terpersonalisasi: **jalur audio** untuk siswa tunanetra (didukung Text-to-Speech berbasis Web Speech API dengan sorotan kata real-time) dan **jalur visual** untuk siswa tunarungu (dengan subtitle otomatis pada sesi live). Guru dilengkapi dasbor analitik aksesibilitas yang memungkinkan mereka memantau keterlibatan siswa berkebutuhan khusus secara individual, menjadikan AKSES bukan hanya alat belajar, tetapi juga ekosistem pendidikan inklusif yang komprehensif.

---

## Problem Statement

### Tantangan Aksesibilitas dalam Edukasi Digital

Mayoritas platform Learning Management System (LMS) yang ada saat ini baik global maupun lokal dirancang dengan asumsi bahwa pengguna dapat melihat dan mendengar secara normal. Ini menciptakan beberapa permasalahan nyata:

| Masalah | Dampak pada Siswa |
|---------|-------------------|
| Konten video tanpa subtitle atau teks alternatif | Siswa tunarungu tidak dapat mengikuti materi berbasis video |
| Teks panjang tanpa dukungan pembacaan otomatis | Siswa tunanetra harus mengandalkan screen reader pihak ketiga yang tidak terintegrasi |
| Antarmuka dengan kontras warna rendah | Pengguna dengan low vision mengalami kelelahan visual yang mempercepat kelelahan kognitif |
| Ukuran font yang tidak dapat disesuaikan | Siswa dengan gangguan penglihatan parsial kesulitan membaca konten |
| Tidak ada profil aksesibilitas yang tersimpan | Pengguna harus mengatur ulang preferensi di setiap sesi |
| Guru tidak memiliki visibilitas terhadap kebutuhan khusus siswa | Tidak ada intervensi yang tepat waktu ketika siswa mengalami hambatan belajar |

Solusi eksisting seperti menggunakan screen reader pihak ketiga atau subtitle otomatis dari platform video bersifat fragmentatif, tidak terintegrasi, dan mengharuskan siswa melakukan konfigurasi teknis yang kompleks sebelum mereka bahkan dapat mulai belajar.

---

## Solution

AKSES mengintegrasikan aksesibilitas langsung ke dalam lapisan aplikasi sehingga tidak memerlukan konfigurasi eksternal apapun. Pendekatan kunci platform ini:

1. **Setup aksesibilitas di titik masuk (login)** — Setiap pengguna mendefinisikan profil disabilitas mereka satu kali saat pertama login; pengaturan disimpan secara persisten dan diterapkan otomatis ke seluruh platform.
2. **Konten adaptif berdasarkan mode** — Setiap materi dikategorikan sebagai `audio`, `visual`, atau `keduanya`, sehingga sistem dapat merekomendasikan konten yang paling sesuai dengan profil pengguna.
3. **TTS terintegrasi dengan sorotan kata** — Bukan sekadar pembaca teks, TTS AKSES menyorot setiap kata secara sinkron saat dibacakan, membantu siswa tunanetra mengikuti alur konten.
4. **Kelas live dengan transkrip real-time** — Siswa tunarungu dapat mengikuti sesi langsung melalui transkrip yang diperbarui setiap 2,5 detik, dilengkapi panel tanya-jawab berbasis teks.
5. **Dasbor laporan aksesibilitas untuk guru** — Guru mendapatkan visibilitas penuh terhadap penggunaan fitur aksesibilitas per siswa, dilengkapi alert proaktif untuk siswa yang belum mengaktifkan fitur bantu apapun.
6. **AI content generation** — Guru dapat mengunggah materi teks dan platform secara otomatis menghasilkan ringkasan, poin kunci, kuis, visualisasi, dan audio deskripsi yang aksesibel.

---

## Key Features

### Fitur Siswa

| Fitur | Deskripsi | Manfaat untuk Pengguna |
|-------|-----------|------------------------|
| **Login + Setup Aksesibilitas 2-Step** | Alur login terintegrasi dengan pemilihan mode disabilitas, ukuran font, TTS, subtitle, dan kontras tinggi | Personalisasi pengalaman dari menit pertama tanpa konfigurasi teknis |
| **Dashboard Belajar** | Ringkasan progress mingguan, alert sesi live aktif, materi yang sedang dipelajari, rekomendasi berbasis mode aksesibilitas, dan jadwal kelas | Satu titik informasi terpadu untuk memulai setiap sesi belajar |
| **Katalog Materi dengan Filter** | 10 materi lintas mata pelajaran (Biologi, IPA, Matematika, Bahasa Indonesia, Fisika, Sejarah, Kimia, Geografi, Seni Budaya, Informatika) dengan filter per mode aksesibilitas dan pencarian real-time | Menemukan materi yang tepat dengan cepat, tersaring berdasarkan kemampuan akses |
| **Media Player Adaptif** | Pemutar materi dengan toggle mode audio/visual, TTS dengan sorotan kata per kata, accordion langkah belajar, dan progress tracker per langkah | Pengalaman belajar yang dapat dikontrol sepenuhnya oleh siswa |
| **Text-to-Speech dengan Word Highlight** | Pembacaan teks menggunakan Web Speech API bahasa Indonesia, dengan sorotan visual pada setiap kata yang sedang dibacakan secara sinkron | Membantu siswa tunanetra mengikuti konten sekaligus meningkatkan pemahaman bagi semua siswa |
| **Kelas Live dengan Transkrip Real-time** | Simulasi kelas langsung dengan subtitle/transkrip yang diperbarui otomatis, panel interaksi cepat (bookmark topik), dan sistem tanya-jawab berbasis teks | Siswa tunarungu dapat berpartisipasi penuh dalam sesi live |
| **Kuis Interaktif** | Soal pilihan ganda dengan feedback penjelasan per soal, progress tracking, dan skor akhir | Penilaian mandiri yang aksesibel tanpa tekanan waktu |
| **Profil & Pengaturan Aksesibilitas** | Tampilan profil dengan riwayat kuis, prestasi, streak belajar, dan pengaturan aksesibilitas yang dapat diubah kapan saja | Kontrol penuh atas pengalaman platform tanpa perlu restart |
| **Notifikasi** | Panel notifikasi dengan badge unread count untuk informasi sesi baru, kuis, dan pengumuman | Tidak ada informasi penting yang terlewat |
| **Floating Accessibility Bar** | Panel aksesibilitas mengambang yang selalu tersedia di seluruh halaman untuk toggle TTS, ubah ukuran font, aktifkan kontras tinggi, dan reset ke default | Penyesuaian aksesibilitas instan tanpa navigasi ke pengaturan |
| **AI-Generated Content dari Pendamping** | Konten yang dihasilkan guru melalui fitur AI upload tersedia di katalog sebagai "Dari Pendamping" | Materi tambahan yang selalu aksesibel dan disesuaikan kebutuhan kelas |

### Fitur Guru

| Fitur | Deskripsi | Manfaat untuk Pengguna |
|-------|-----------|------------------------|
| **Dashboard Guru** | Overview total siswa, siswa aktif, sesi bulan ini, progress individual siswa dengan badge disabilitas, dan jadwal sesi mendatang | Visibilitas penuh terhadap kondisi kelas dari satu halaman |
| **Manajemen Siswa** | Daftar seluruh siswa dengan filter dan pencarian, dialog detail per siswa (progress, riwayat kuis, aktivitas 7 hari, catatan kebutuhan khusus) | Pemantauan individual yang terinformasi |
| **Upload Materi + AI Processing** | Guru mengunggah teks materi; sistem AI menghasilkan secara otomatis: judul, ringkasan, poin utama, kuis 5 soal, visualisasi, dan audio deskripsi | Pembuatan konten aksesibel yang efisien tanpa keahlian teknis |
| **Buat Sesi Live** | Form pembuatan sesi dengan preview aksesibilitas, pilihan mode (audio/visual/keduanya), daftar peserta, dan informasi waktu | Perencanaan sesi yang mempertimbangkan kebutuhan aksesibilitas dari awal |
| **Panel Aksi Live** | Halaman untuk menjawab pertanyaan siswa secara real-time selama sesi berlangsung | Fasilitasi diskusi inklusif dalam kelas live |
| **Laporan Aksesibilitas** | Analitik penggunaan fitur aksesibilitas per fitur dan per siswa, SMART progress tracker, alert siswa yang belum menggunakan fitur bantu, dan ekspor laporan PDF | Data berbasis bukti untuk pengambilan keputusan pedagogis |
| **Onboarding 3-Step** | Alur orientasi untuk guru baru yang memandu setup akun dan pemahaman fitur platform | Onboarding yang terstruktur dan efisien |

---

## User Journey

### Alur Siswa Tunanetra (Jalur Audio)

```
1. Login → Memilih mode "Tunanetra" → TTS & kontras tinggi aktif otomatis
2. Dashboard → Melihat alert sesi live + rekomendasi materi audio
3. Katalog → Filter "Tunanetra (Audio)" → Memilih materi "Tata Surya"
4. Player → Mengaktifkan TTS → Mendengarkan narasi dengan sorotan kata
5. Live Class → Mengikuti via transkrip real-time → Mengirim pertanyaan via teks
6. Kuis → Menjawab soal pilihan ganda → Mendapat penjelasan per jawaban
7. Profil → Melihat streak 7 hari & prestasi yang diraih
```

### Alur Siswa Tunarungu (Jalur Visual)

```
1. Login → Memilih mode "Tunarungu" → Subtitle aktif otomatis
2. Dashboard → Melihat jadwal kelas & materi visual terbaru
3. Katalog → Filter "Tunarungu (Visual)" → Memilih materi bergambar/diagram
4. Player → Mode visual → Membaca langkah-langkah dalam accordion
5. Live Class → Mengikuti via subtitle/transkrip → Berinteraksi via Q&A panel
6. Profil → Menyesuaikan ukuran font & preferensi tampilan
```

### Alur Guru

```
1. Onboarding → Setup profil → Memahami fitur platform
2. Dashboard → Review progress siswa → Identifikasi siswa yang perlu perhatian
3. Upload Materi → Input teks → AI generate konten aksesibel → Publish ke siswa
4. Buat Sesi Live → Isi form → Pilih mode aksesibilitas → Jadwalkan
5. Sesi Live → Jawab pertanyaan siswa real-time via panel aksi
6. Laporan → Review penggunaan fitur aksesibilitas → Identifikasi siswa tanpa fitur bantu → Kirim pengingat
```

---

## Screenshots / Demo

<img width="1901" height="811" alt="image" src="https://github.com/user-attachments/assets/3d2eb244-8e24-4b57-83af-3b6f694d4802" />
<img width="1905" height="864" alt="image" src="https://github.com/user-attachments/assets/634308f6-e6c1-4562-9303-8d7afc533797" />
>Login dengan pemilihan mode disabilitas dan pengaturan aksesibilitas

<img width="1916" height="873" alt="image" src="https://github.com/user-attachments/assets/127f4293-8973-41ba-8e1f-f997b7e45f6a" />
>Dashboard dengan progress mingguan, alert live, dan rekomendasi materi

<img width="1918" height="871" alt="image" src="https://github.com/user-attachments/assets/68d446fc-8e07-4c2d-a3ef-b0ab502dd761" />
>Katalog 10 materi dengan filter mode aksesibilitas dan pencarian

<img width="1917" height="874" alt="image" src="https://github.com/user-attachments/assets/48a0ae6a-7882-4d6d-b203-2a4b2add99a3" />
>Dashboard guru dengan progress siswa dan jadwal sesi

<img width="1912" height="873" alt="image" src="https://github.com/user-attachments/assets/b7fac32b-0fdb-432a-8696-b56c5e233b58" />
>Laporan penggunaan fitur aksesibilitas per siswa dan per fitur

<img width="1916" height="872" alt="image" src="https://github.com/user-attachments/assets/5b09dd0b-eed5-4d6c-bb42-6223937b2eaf" />
>Fitur upload materi dengan AI content generation

---

## Tech Stack

### Frontend

| Teknologi | Versi | Peran |
|-----------|-------|-------|
| [Next.js](https://nextjs.org) | 14.2.29 | Framework React dengan App Router untuk routing berbasis file dan SSR |
| [React](https://react.dev) | 18.x | Library UI komponen |
| [TypeScript](https://www.typescriptlang.org) | 5.x | Type safety dan developer experience |
| [Tailwind CSS](https://tailwindcss.com) | 3.4.x | Utility-first CSS framework |

### State Management

| Teknologi | Versi | Peran |
|-----------|-------|-------|
| [Zustand](https://zustand-demo.pmnd.rs) | 4.5.2 | State management global dengan middleware `persist` untuk penyimpanan ke localStorage |

### UI Components

| Teknologi | Versi | Peran |
|-----------|-------|-------|
| [Radix UI](https://www.radix-ui.com) | Various | Komponen UI headless yang aksesibel (Avatar, Dialog, Progress, Slider, Switch, Tabs, Accordion, Label, Select, Toast, Tooltip) |
| [Lucide React](https://lucide.dev) | 0.400.x | Icon library |
| [class-variance-authority](https://cva.style) | 0.7.x | Variant-based component styling |
| [clsx](https://github.com/lukeed/clsx) + [tailwind-merge](https://github.com/dcastil/tailwind-merge) | Latest | Conditional className utilities |

### Browser APIs

| API | Peran |
|-----|-------|
| Web Speech API (`window.speechSynthesis`) | Text-to-Speech dengan dukungan bahasa Indonesia (id-ID) |
| localStorage | Persistensi pengaturan aksesibilitas pengguna antar sesi |

### Backend & Database

> Platform ini saat ini beroperasi sebagai **frontend-only prototype** dengan mock data JSON.

| Data | Format | Lokasi |
|------|--------|--------|
| Data materi (10 materi) | JSON | `lib/mock-data/materials.json` |
| Data siswa | JSON | `lib/mock-data/students.json` |
| Data guru | JSON | `lib/mock-data/teachers.json` |
| Data sesi | JSON | `lib/mock-data/sessions.json` |

### Development Tools

| Alat | Peran |
|------|-------|
| ESLint + eslint-config-next | Linting dan code quality |
| PostCSS + Autoprefixer | CSS processing |
| Inter (Google Fonts) | Typography utama |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AKSES Platform                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─── App Router (Next.js 14) ───────────────────────┐  │
│  │                                                   │  │
│  │  /login          → Unified login (student/teacher)│  │
│  │  /student/*      → Student portal (6 pages)       │  │
│  │  /teacher/*      → Teacher portal (7 pages)       │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                          │                              │
│  ┌─── State Layer (Zustand) ─────────────────────────┐  │
│  │                                                   │  │
│  │  accessibility-store  → mode, TTS, fontSize,      │  │
│  │  (persisted to        highContrast, subtitles      │  │
│  │   localStorage)                                   │  │
│  │  role-store           → current role (student /   │  │
│  │                         teacher), login status    │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                          │                              │
│  ┌─── Accessibility Layer ───────────────────────────┐  │
│  │                                                   │  │
│  │  Web Speech API → TTS dengan word highlighting    │  │
│  │  CSS Variables  → --font-scale (1x / 1.2x / 1.4x)│  │
│  │  CSS Classes    → body.high-contrast              │  │
│  │  Skip Links     → #main-content anchor            │  │
│  │  ARIA           → roles, live regions, labels     │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                          │                              │
│  ┌─── Data Layer (Mock) ─────────────────────────────┐  │
│  │                                                   │  │
│  │  materials.json  → 10 materi lintas mapel         │  │
│  │  students.json   → Data siswa + progress          │  │
│  │  teachers.json   → Data guru + stats              │  │
│  │  sessions.json   → Jadwal & live sessions         │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Alur data aksesibilitas:**
1. Pengguna memilih profil disabilitas saat login
2. `accessibility-store` menyimpan preferensi ke localStorage
3. `AccessibilityBar` (floating, tersedia di semua halaman) memungkinkan perubahan kapan saja
4. Perubahan `highContrast` dan `fontSize` diterapkan langsung ke DOM via CSS class dan CSS variable
5. Komponen halaman membaca state dari store untuk menampilkan TTS controls, subtitle, dsb.

---

## Repository Structure

```
project_AKSES/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (metadata, skip link, font)
│   ├── page.tsx                  # Root redirect → /login
│   ├── globals.css               # Global styles, high-contrast mode, animations
│   ├── login/                    # Unified login page
│   ├── student/
│   │   ├── login/                # Student login + accessibility setup (2-step)
│   │   ├── dashboard/            # Student dashboard
│   │   ├── learn/
│   │   │   ├── page.tsx          # Material catalog with search & filter
│   │   │   ├── [id]/page.tsx     # Material player (TTS, accordion steps, quiz)
│   │   │   └── ai-content/[id]/  # AI-generated content viewer
│   │   ├── live/                 # Live class (transcript, Q&A)
│   │   ├── quiz/[id]/            # Interactive quiz
│   │   ├── profile/              # Profile & accessibility settings tabs
│   │   └── notifications/        # Notification center
│   └── teacher/
│       ├── login/                # Teacher login
│       ├── dashboard/            # Teacher dashboard
│       ├── students/
│       │   ├── page.tsx          # Student list management
│       │   └── [id]/page.tsx     # Individual student detail
│       ├── onboarding/           # 3-step teacher onboarding
│       ├── create-session/       # Create live session form
│       ├── upload-materi/        # Material upload + AI processing
│       ├── actions/              # Live session action panel
│       └── report/               # Accessibility analytics report
│
├── components/
│   ├── accessibility/
│   │   └── AccessibilityBar.tsx  # Floating accessibility control panel
│   ├── shared/
│   │   ├── StudentBottomNav.tsx  # Mobile bottom navigation (student)
│   │   ├── StudentSidebar.tsx    # Desktop sidebar (student)
│   │   ├── TeacherSidebar.tsx    # Desktop sidebar (teacher)
│   │   └── RoleSwitcher.tsx      # Role switcher component
│   └── ui/                       # Reusable UI primitives
│       ├── button.tsx
│       ├── card.tsx
│       ├── badge.tsx
│       ├── progress.tsx
│       ├── switch.tsx
│       ├── tabs.tsx
│       ├── avatar.tsx
│       ├── slider.tsx
│       └── dialog.tsx
│
├── lib/
│   ├── mock-data/                # Static JSON data
│   │   ├── materials.json        # 10 learning materials
│   │   ├── students.json         # Student profiles + progress
│   │   ├── teachers.json         # Teacher profiles
│   │   └── sessions.json         # Session schedules
│   ├── store/
│   │   ├── accessibility-store.ts # Zustand store (persisted)
│   │   └── role-store.ts          # Role & auth state
│   ├── hooks/
│   │   └── useAccessibility.ts    # Accessibility hook
│   └── utils/
│       ├── cn.ts                  # className utility
│       └── formatters.ts          # Data formatting helpers
│
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

---

## Installation

### Prerequisites

- [Node.js](https://nodejs.org) v18 atau lebih baru
- npm v9 atau lebih baru

### Clone Repository

```bash
git clone https://github.com/guzelaz23/project_AKSES.git
cd project_AKSES
```

### Install Dependencies

```bash
npm install
```

### Environment Setup

Platform ini saat ini tidak memerlukan environment variables karena beroperasi sebagai frontend-only dengan mock data. Tidak diperlukan file `.env`.

> **TODO:** Tambahkan `.env.local` setup ketika backend/API diintegrasikan.

### Run Locally

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

> Jika port 3000 sudah dipakai, Next.js otomatis beralih ke port 3001. Perhatikan output terminal.

### Build for Production

```bash
npm run build
npm start
```

### Lint

```bash
npm run lint
```

---

## Usage

### Akun Demo

Platform menyediakan akun demo yang dapat digunakan langsung tanpa registrasi:

| Role | Email | Cara Masuk |
|------|-------|------------|
| Siswa | `alex@akses.id` | Klik tombol **"Masuk dengan Akun Demo"** di halaman login |
| Guru | Login via `/teacher/login` | Gunakan data demo yang tersedia |

### Alur Penggunaan Siswa

1. Buka `/student/login`
2. Klik "Masuk dengan Akun Demo" atau isi email + password
3. Pilih profil disabilitas dan preferensi aksesibilitas
4. Klik "Simpan & Lanjutkan" → diarahkan ke dashboard
5. Jelajahi materi di `/student/learn`, ikuti kelas live di `/student/live`
6. Gunakan tombol aksesibilitas (ikon ♿) di pojok kanan bawah untuk mengubah preferensi kapan saja

### Alur Penggunaan Guru

1. Buka `/teacher/dashboard`
2. Monitor progress siswa dan jadwal sesi
3. Upload materi baru via `/teacher/upload-materi`
4. Buat sesi live via `/teacher/create-session`
5. Pantau laporan aksesibilitas via `/teacher/report`

---

## Accessibility Impact

### Target Pengguna

| Kelompok | Kebutuhan | Solusi AKSES |
|----------|-----------|--------------|
| **Siswa Tunanetra** | Konten yang dapat didengarkan, tanpa ketergantungan pada visual | TTS terintegrasi dengan sorotan kata, materi audio, navigasi keyboard-friendly |
| **Siswa Tunarungu** | Konten visual yang kaya, teks alternatif untuk audio | Subtitle live real-time, Q&A berbasis teks, materi visual dengan deskripsi teks |
| **Siswa Low Vision** | Kontras tinggi, ukuran font besar | High contrast mode, 3 level ukuran font (1x / 1.2x / 1.4x) |
| **Semua Siswa** | Pengalaman belajar yang konsisten dan dapat dipersonalisasi | Preferensi tersimpan persisten, UI responsif mobile-first |

### Standar Aksesibilitas yang Diterapkan

- **ARIA landmarks** (`role="main"`, `aria-labelledby`, `aria-live`, `role="log"`)
- **Skip link** ke konten utama (`#main-content`) untuk navigasi keyboard
- **`aria-pressed`** pada semua toggle dan pilihan
- **`role="alert"` + `aria-live="polite"`** untuk notifikasi sesi live
- **`role="progressbar"` dengan `aria-valuenow/min/max`** pada semua progress bar
- **Label eksplisit** pada semua elemen interaktif (`aria-label`)
- **Focus-visible rings** pada semua elemen yang dapat difokus keyboard

### Social Impact

AKSES memposisikan aksesibilitas sebagai hak dasar, bukan keistimewaan. Dengan menyematkan kebutuhan siswa berkebutuhan khusus ke dalam inti desain produk bukan sebagai fitur tambahan platform ini mendorong standar baru untuk EdTech inklusif di Indonesia. Laporan aksesibilitas yang diberikan kepada guru juga mendorong perubahan perilaku pedagogis: ketika guru dapat melihat data, mereka lebih cenderung mengambil tindakan proaktif untuk mendukung siswa mereka.

---

## Future Enhancements

Berdasarkan arsitektur dan fitur saat ini, berikut adalah roadmap pengembangan yang realistis:

| Fase | Fitur | Justifikasi |
|------|-------|-------------|
| **v1.0** | Integrasi backend nyata (API + database) | Platform saat ini menggunakan mock data; backend diperlukan untuk multi-user, persistensi data, dan autentikasi sesungguhnya |
| **v1.0** | Autentikasi JWT / OAuth (Google) | Mendukung login nyata dengan keamanan standar industri |
| **v1.1** | TTS dengan kontrol kecepatan & pitch via UI | Slider kecepatan/pitch sudah ada di store, perlu diekspos ke UI |
| **v1.1** | Video player dengan subtitle embedded | Mendukung materi berbasis video yang saat ini hanya teks/audio |
| **v1.2** | Notifikasi push (sesi live, kuis baru) | Memastikan siswa tidak melewatkan sesi mendatang |
| **v1.2** | Mode offline (Service Worker / PWA) | Siswa di daerah dengan koneksi terbatas tetap bisa belajar |
| **v2.0** | AI yang sesungguhnya (integrasi LLM API) | Menggantikan mock AI dengan generasi konten yang dinamis dan adaptif |
| **v2.0** | Braille display support | Kompatibilitas dengan perangkat braille hardware untuk siswa tunanetra |
| **v2.1** | Analitik pembelajaran adaptif | Rekomendasi materi yang berubah berdasarkan performa dan pola belajar real |
| **v2.1** | Multi-bahasa (Inggris, bahasa daerah) | Memperluas jangkauan ke siswa non-Indonesia |
| **v3.0** | Marketplace materi guru | Guru dapat berbagi dan memonetisasi konten aksesibel yang mereka buat |
| **v3.0** | SDK aksesibilitas open-source | Memungkinkan platform EdTech lain mengadopsi komponen aksesibilitas AKSES |

---

## Contributors

| Kontributor | Role |
|-------------|------|
| [@guzelaz23](https://github.com/guzelaz23) | Product Owner, UI/UX Designer, Frontend Developer |

---

<p align="center">
  <strong>AKSES</strong> - Karena setiap siswa berhak atas pendidikan yang setara.
</p>
