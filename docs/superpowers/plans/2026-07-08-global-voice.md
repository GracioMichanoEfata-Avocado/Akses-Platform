# Global Voice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan suara global lintas-halaman untuk mode tunanetra/keduanya: auto-scan tombol di layar (bisa diklik via suara tanpa pendaftaran manual) + perintah "bacakan" untuk membacakan isi konten utama halaman.

**Architecture:** Dua fungsi murni (`scanClickables`, `extractMainContent`) yang bisa di-unit-test dengan jsdom; satu hook `useAutoVoiceScan` yang menjalankan MutationObserver (Live) dan mengumumkan tombol sekali per halaman; integrasi ke `useVoiceNavigation` (perintah baru + pencocokan tombol scan) dan `TalkbackProvider` (wiring + `data-voice-ignore`).

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Vitest + jsdom (baru), Web Speech API (sudah ada di `useTalkback`).

## Global Constraints

- Fitur hanya aktif saat mode aksesibilitas ∈ {`tunanetra`, `both`} **dan** voice-nav ON **dan** bukan `/student/login`. Pengguna non-tunanetra tidak boleh terpengaruh sama sekali.
- Bahasa TTS & label: Indonesia. Suara memakai `speak(text, priority)` dari `lib/hooks/useTalkback.ts`.
- Pencocokan suara memakai `matchesKeyword(transcript, keyword, matchType)` dari `lib/voice/keyword-match.ts` (`MatchType = 'includes' | 'word'`).
- Halaman yang punya perintah suara khusus (`pageCommandsRef` tidak kosong, mis. kuis) **dikecualikan**: tidak diumumkan tombolnya & tombol scan tidak dicocokkan.
- Ikuti pola file test yang ada: `import { describe, it, expect } from 'vitest'`. Test DOM memakai pragma `// @vitest-environment jsdom` di baris pertama file.
- Perintah test tunggal: `npx vitest run <path>`.

---

### Task 1: `scanClickables` — pemindai tombol (fungsi murni)

**Files:**
- Create: `lib/voice/dom-scan.ts`
- Test: `lib/voice/dom-scan.test.ts`
- Modify: `package.json` (tambah devDependency `jsdom`)

**Interfaces:**
- Consumes: `MatchType` dari `lib/voice/keyword-match.ts`.
- Produces:
  - `interface ScannedCommand { label: string; keywords: string[]; matchType: MatchType; el: HTMLElement }`
  - `function scanClickables(root: HTMLElement): ScannedCommand[]` — filter berbasis atribut saja (visibilitas layout ditangani pemanggil).

- [ ] **Step 1: Pasang jsdom sebagai devDependency**

Run:
```bash
npm install -D jsdom
```
Expected: `jsdom` muncul di `devDependencies` `package.json`, install sukses.

- [ ] **Step 2: Tulis test yang gagal**

Buat `lib/voice/dom-scan.test.ts`:
```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { scanClickables } from './dom-scan';

function setBody(html: string) {
  document.body.innerHTML = html;
  return document.body;
}

beforeEach(() => { document.body.innerHTML = ''; });

describe('scanClickables', () => {
  it('mengambil label dari teks tombol dan href link', () => {
    const root = setBody(`
      <button>Keluar</button>
      <a href="/x">Edit Profil</a>
    `);
    const cmds = scanClickables(root);
    expect(cmds.map(c => c.label)).toEqual(['Keluar', 'Edit Profil']);
  });

  it('memprioritaskan aria-label di atas teks', () => {
    const root = setBody(`<button aria-label="Tutup dialog">X</button>`);
    expect(scanClickables(root)[0].label).toBe('Tutup dialog');
  });

  it('membuang emoji/simbol di tepi teks', () => {
    const root = setBody(`<a href="/e">✏️ Edit Profil</a>`);
    expect(scanClickables(root)[0].label).toBe('Edit Profil');
  });

  it('melewati elemen disabled, aria-hidden, dan di dalam data-voice-ignore', () => {
    const root = setBody(`
      <button disabled>Simpan</button>
      <button aria-hidden="true">Sembunyi</button>
      <div data-voice-ignore><button>Mic</button></div>
      <button>Bergabung</button>
    `);
    expect(scanClickables(root).map(c => c.label)).toEqual(['Bergabung']);
  });

  it('melewati elemen tanpa nama', () => {
    const root = setBody(`<button></button><button>Lanjut</button>`);
    expect(scanClickables(root).map(c => c.label)).toEqual(['Lanjut']);
  });

  it('men-dedup label sama (case-insensitive), ambil pertama', () => {
    const root = setBody(`<button>Hapus</button><button>hapus</button>`);
    const cmds = scanClickables(root);
    expect(cmds).toHaveLength(1);
    expect(cmds[0].label).toBe('Hapus');
  });

  it('label satu kata pendek memakai matchType word', () => {
    const root = setBody(`<button>Ya</button><button>Edit Profil</button>`);
    const cmds = scanClickables(root);
    expect(cmds.find(c => c.label === 'Ya')!.matchType).toBe('word');
    expect(cmds.find(c => c.label === 'Edit Profil')!.matchType).toBe('includes');
  });

  it('keywords berisi nama penuh dan kata >2 huruf', () => {
    const root = setBody(`<button>Edit Profil</button>`);
    expect(scanClickables(root)[0].keywords).toEqual(['edit profil', 'edit', 'profil']);
  });

  it('mencakup role=button dan role=tab', () => {
    const root = setBody(`
      <div role="button">Putar</div>
      <div role="tab">Aksesibilitas</div>
    `);
    expect(scanClickables(root).map(c => c.label)).toEqual(['Putar', 'Aksesibilitas']);
  });
});
```

- [ ] **Step 3: Jalankan test, pastikan GAGAL**

Run: `npx vitest run lib/voice/dom-scan.test.ts`
Expected: FAIL — `scanClickables` belum ada / module tidak ditemukan.

- [ ] **Step 4: Implementasi `dom-scan.ts`**

Buat `lib/voice/dom-scan.ts`:
```ts
import type { MatchType } from './keyword-match';

export interface ScannedCommand {
  label: string;
  keywords: string[];
  matchType: MatchType;
  el: HTMLElement;
}

const SELECTOR =
  'button, a[href], [role="button"], [role="tab"], input[type="button"], input[type="submit"]';

// Rapikan teks: satukan whitespace, buang simbol/emoji di tepi, potong ~60 char.
function cleanName(raw: string): string {
  const collapsed = raw.replace(/\s+/g, ' ').trim();
  const trimmed = collapsed
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/[^\p{L}\p{N}]+$/u, '');
  return trimmed.slice(0, 60).trim();
}

function accessibleName(el: HTMLElement): string {
  const aria = el.getAttribute('aria-label');
  if (aria && aria.trim()) return cleanName(aria);
  const text = el.textContent || '';
  const cleaned = cleanName(text);
  if (cleaned) return cleaned;
  const title = el.getAttribute('title');
  if (title && title.trim()) return cleanName(title);
  return '';
}

function isSkipped(el: HTMLElement): boolean {
  if (el.hasAttribute('disabled')) return true;
  if (el.getAttribute('aria-hidden') === 'true') return true;
  if (el.hasAttribute('hidden')) return true;
  if (el.closest('[data-voice-ignore],[aria-hidden="true"],[hidden]')) return true;
  return false;
}

function buildKeywords(name: string): string[] {
  const lower = name.toLowerCase();
  const words = lower.split(/\s+/).filter(w => w.length > 2);
  return [lower, ...words].filter((k, i, arr) => arr.indexOf(k) === i);
}

function pickMatchType(name: string): MatchType {
  const words = name.trim().split(/\s+/);
  if (words.length === 1 && words[0].length <= 3) return 'word';
  return 'includes';
}

export function scanClickables(root: HTMLElement): ScannedCommand[] {
  const els = Array.from(root.querySelectorAll<HTMLElement>(SELECTOR));
  const out: ScannedCommand[] = [];
  const seen = new Set<string>();

  for (const el of els) {
    if (isSkipped(el)) continue;
    const label = accessibleName(el);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      label,
      keywords: buildKeywords(label),
      matchType: pickMatchType(label),
      el,
    });
  }
  return out;
}
```

- [ ] **Step 5: Jalankan test, pastikan LULUS**

Run: `npx vitest run lib/voice/dom-scan.test.ts`
Expected: PASS semua.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lib/voice/dom-scan.ts lib/voice/dom-scan.test.ts
git commit -m "feat: scanClickables - pindai tombol layar jadi perintah suara"
```

---

### Task 2: `extractMainContent` — pembaca konten utama (fungsi murni)

**Files:**
- Create: `lib/voice/content-read.ts`
- Test: `lib/voice/content-read.test.ts`

**Interfaces:**
- Produces: `function extractMainContent(root: HTMLElement): string` — teks di dalam `<main>` (fallback `root`), lewati kontrol/nav/aside/sr-only/aria-hidden, gabung antar-blok dengan `. `.

- [ ] **Step 1: Tulis test yang gagal**

Buat `lib/voice/content-read.test.ts`:
```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { extractMainContent } from './content-read';

beforeEach(() => { document.body.innerHTML = ''; });

describe('extractMainContent', () => {
  it('membaca teks di dalam <main> saja', () => {
    document.body.innerHTML = `
      <nav>Menu Beranda</nav>
      <main>
        <h1>Fotosintesis</h1>
        <p>Tumbuhan membuat makanan dari cahaya.</p>
      </main>
    `;
    const teks = extractMainContent(document.body);
    expect(teks).toContain('Fotosintesis');
    expect(teks).toContain('Tumbuhan membuat makanan dari cahaya.');
    expect(teks).not.toContain('Menu Beranda');
  });

  it('melewati tombol, nav, aside, sr-only, dan aria-hidden', () => {
    document.body.innerHTML = `
      <main>
        <p>Isi materi.</p>
        <button>Simpan</button>
        <aside>Sidebar info</aside>
        <span class="sr-only">Khusus screen reader</span>
        <span aria-hidden="true">Ikon dekоratif</span>
      </main>
    `;
    const teks = extractMainContent(document.body);
    expect(teks).toContain('Isi materi.');
    expect(teks).not.toContain('Simpan');
    expect(teks).not.toContain('Sidebar info');
    expect(teks).not.toContain('screen reader');
  });

  it('menggabung beberapa blok dengan pemisah titik', () => {
    document.body.innerHTML = `<main><h1>Judul</h1><p>Paragraf.</p></main>`;
    expect(extractMainContent(document.body)).toBe('Judul. Paragraf.');
  });

  it('fallback ke root bila tidak ada <main>', () => {
    document.body.innerHTML = `<div><p>Tanpa main.</p></div>`;
    expect(extractMainContent(document.body)).toContain('Tanpa main.');
  });

  it('mengembalikan string kosong bila tidak ada konten teks', () => {
    document.body.innerHTML = `<main><button>Klik</button></main>`;
    expect(extractMainContent(document.body)).toBe('');
  });
});
```

- [ ] **Step 2: Jalankan test, pastikan GAGAL**

Run: `npx vitest run lib/voice/content-read.test.ts`
Expected: FAIL — `extractMainContent` belum ada.

- [ ] **Step 3: Implementasi `content-read.ts`**

Buat `lib/voice/content-read.ts`:
```ts
const SKIP_SELECTOR =
  'button, a, input, textarea, select, nav, aside, [aria-hidden="true"], [data-voice-ignore], .sr-only';

function walk(node: Node, out: string[]): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 3 /* TEXT_NODE */) {
      const t = (child.textContent || '').replace(/\s+/g, ' ').trim();
      if (t) out.push(t);
    } else if (child.nodeType === 1 /* ELEMENT_NODE */) {
      const el = child as HTMLElement;
      if (el.matches(SKIP_SELECTOR)) continue;
      if (el.hasAttribute('hidden')) continue;
      walk(el, out);
    }
  }
}

export function extractMainContent(root: HTMLElement): string {
  const main = root.querySelector('main') || root;
  const out: string[] = [];
  walk(main, out);
  return out.join('. ').trim();
}
```

- [ ] **Step 4: Jalankan test, pastikan LULUS**

Run: `npx vitest run lib/voice/content-read.test.ts`
Expected: PASS semua.

- [ ] **Step 5: Commit**

```bash
git add lib/voice/content-read.ts lib/voice/content-read.test.ts
git commit -m "feat: extractMainContent - ambil teks konten utama untuk dibacakan"
```

---

### Task 3: Hook `useAutoVoiceScan` — MutationObserver + pengumuman sekali/halaman

**Files:**
- Create: `lib/hooks/useAutoVoiceScan.ts`

**Interfaces:**
- Consumes: `scanClickables`, `ScannedCommand` (Task 1); `speak` (`lib/hooks/useTalkback.ts`); `PageVoiceCommand` (`components/accessibility/TalkbackProvider.tsx`).
- Produces:
  - `const PAGE_NARASI: Record<string, string>` (diekspor — dipindah dari TalkbackProvider).
  - `function useAutoVoiceScan(aktif: boolean, scannedRef: MutableRefObject<ScannedCommand[]>, pageCommandsRef: RefObject<PageVoiceCommand[]>): void`

**Catatan:** Hook ini di-drive DOM/observer, diuji manual (Task 6), bukan unit test — ikuti pola hook lain di repo (`useVoiceNavigation` tidak punya unit test).

- [ ] **Step 1: Implementasi `useAutoVoiceScan.ts`**

Buat `lib/hooks/useAutoVoiceScan.ts`:
```ts
import { useEffect, useRef, MutableRefObject, RefObject } from 'react';
import { usePathname } from 'next/navigation';
import { scanClickables, ScannedCommand } from '@/lib/voice/dom-scan';
import { speak } from './useTalkback';
import type { PageVoiceCommand } from '@/components/accessibility/TalkbackProvider';

// Narasi otomatis per halaman (dipindah dari TalkbackProvider).
export const PAGE_NARASI: Record<string, string> = {
  '/student/dashboard': 'Beranda. Halaman ini menampilkan jadwal kelas dan materi terbaru.',
  '/student/learn': 'Katalog Materi. Tersedia daftar materi belajar.',
  '/student/live': 'Kelas Live.',
  '/student/notifications': 'Notifikasi.',
  '/student/profile': 'Profil Saya.',
};

export function useAutoVoiceScan(
  aktif: boolean,
  scannedRef: MutableRefObject<ScannedCommand[]>,
  pageCommandsRef: RefObject<PageVoiceCommand[]>
) {
  const pathname = usePathname();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Live scan via MutationObserver ──
  useEffect(() => {
    if (!aktif) {
      scannedRef.current = [];
      return;
    }
    const rescan = () => {
      // Filter visibilitas layout di runtime (offsetParent tak andal di jsdom).
      scannedRef.current = scanClickables(document.body).filter(
        c => c.el.offsetParent !== null
      );
    };
    rescan();
    const obs = new MutationObserver(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(rescan, 400);
    });
    obs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'aria-hidden', 'hidden'],
    });
    return () => {
      obs.disconnect();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [aktif, scannedRef]);

  // ── Pengumuman sekali per halaman (narasi + ringkas ≤5 tombol) ──
  const prevPath = useRef('');
  useEffect(() => {
    if (!aktif) return;
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;

    const timer = setTimeout(() => {
      // Halaman ber-perintah-khusus (mis. kuis) memiliki alur suaranya sendiri.
      if ((pageCommandsRef.current?.length ?? 0) > 0) return;

      const narasi =
        Object.entries(PAGE_NARASI).find(
          ([p]) => pathname === p || pathname.startsWith(p + '/')
        )?.[1] || '';

      const labels = (scannedRef.current || []).slice(0, 5).map(c => c.label);
      const tombol = labels.length
        ? ` Tombol tersedia: ${labels.join(
            ', '
          )}. Katakan apa saja untuk daftar lengkap, atau bacakan untuk mendengar isi halaman.`
        : '';

      const teks = (narasi + tombol).trim();
      if (teks) speak(teks, 'interrupt');
    }, 800);

    return () => clearTimeout(timer);
  }, [pathname, aktif, scannedRef, pageCommandsRef]);
}
```

- [ ] **Step 2: Pastikan typecheck lolos**

Run: `npx tsc --noEmit`
Expected: Tidak ada error terkait `useAutoVoiceScan.ts` (error lain yang sudah ada sebelumnya di repo diabaikan bila tak berhubungan).

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/useAutoVoiceScan.ts
git commit -m "feat: useAutoVoiceScan - live scan tombol + pengumuman sekali/halaman"
```

---

### Task 4: Integrasi ke `useVoiceNavigation` — perintah "bacakan"/"apa saja" + pencocokan tombol scan

**Files:**
- Modify: `lib/hooks/useVoiceNavigation.ts`

**Interfaces:**
- Consumes: `ScannedCommand` (Task 1), `extractMainContent` (Task 2), `matchesKeyword` (sudah ada).
- Produces: signatur baru `useVoiceNavigation(aktif: boolean, pageCommandsRef: RefObject<PageVoiceCommand[]>, scannedRef: RefObject<ScannedCommand[]>)`.

- [ ] **Step 1: Tambah import**

Di `lib/hooks/useVoiceNavigation.ts`, setelah baris import `matchesKeyword` (baris ~6), tambahkan:
```ts
import { extractMainContent } from '@/lib/voice/content-read';
import type { ScannedCommand } from '@/lib/voice/dom-scan';
```

- [ ] **Step 2: Ubah signatur hook untuk menerima `scannedRef`**

Ganti definisi fungsi (baris ~39-42):
```ts
export function useVoiceNavigation(
  aktif: boolean,
  pageCommandsRef: RefObject<PageVoiceCommand[]>
) {
```
menjadi:
```ts
export function useVoiceNavigation(
  aktif: boolean,
  pageCommandsRef: RefObject<PageVoiceCommand[]>,
  scannedRef: RefObject<ScannedCommand[]>
) {
```

- [ ] **Step 3: Ganti blok "Bantuan" agar menyertakan tombol scan + tambah perintah "bacakan"**

Ganti blok bantuan yang ada (baris ~61-69):
```ts
    // Bantuan
    if (['bantuan', 'help', 'apa saja', 'perintah'].some(k => lower.includes(k))) {
      const pageCmds = pageCommandsRef.current || [];
      const pageHelp = pageCmds.length > 0
        ? ` Di halaman ini tersedia: ${pageCmds.map(c => c.label).join(', ')}.`
        : '';
      speak(`Ucapkan nama menu: Beranda, Belajar, Kelas Live, Notifikasi, Profil.${pageHelp} Atau ucapkan nama materi langsung.`, 'interrupt');
      return;
    }
```
menjadi:
```ts
    // Bantuan / daftar tombol
    if (['bantuan', 'help', 'apa saja', 'apa aja', 'tombol apa', 'perintah'].some(k => lower.includes(k))) {
      const pageCmds = pageCommandsRef.current || [];
      const scanned = scannedRef.current || [];
      const labels = [...pageCmds.map(c => c.label), ...scanned.map(c => c.label)]
        .filter((l, i, arr) => arr.findIndex(x => x.toLowerCase() === l.toLowerCase()) === i);
      if (labels.length > 0) {
        speak(`Tombol tersedia: ${labels.join(', ')}. Atau ucapkan nama menu: Beranda, Belajar, Kelas Live, Notifikasi, Profil.`, 'interrupt');
      } else {
        speak('Ucapkan nama menu: Beranda, Belajar, Kelas Live, Notifikasi, Profil. Atau ucapkan nama materi langsung.', 'interrupt');
      }
      return;
    }

    // Bacakan konten utama halaman
    if (['bacakan', 'baca halaman', 'baca konten', 'bacakan konten', 'bacakan halaman'].some(k => lower.includes(k))) {
      const teks = extractMainContent(document.body);
      speak(teks || 'Tidak ada konten untuk dibacakan di halaman ini.', 'interrupt');
      return;
    }
```

- [ ] **Step 4: Tambah pencocokan tombol hasil scan setelah menu statis**

Di `processCommand`, setelah loop `STATIC_COMMANDS` (baris ~86-95) dan sebelum blok materi (`// ── 3. Materi dari database ──`), sisipkan:
```ts
    // ── Tombol hasil auto-scan (skip bila halaman punya perintah khusus) ──
    if ((pageCommandsRef.current?.length ?? 0) === 0) {
      for (const cmd of (scannedRef.current || [])) {
        if (cmd.keywords.some(k => matchesKeyword(lower, k, cmd.matchType))) {
          cooldownRef.current = true;
          speak(`Membuka ${cmd.label}.`, 'interrupt');
          setTimeout(() => {
            try { cmd.el.click(); } catch {}
            setTimeout(() => { cooldownRef.current = false; }, 2000);
          }, 600);
          return;
        }
      }
    }
```

- [ ] **Step 5: Tambah `scannedRef` ke dependency `processCommand`**

Ganti array dependency `useCallback` `processCommand` (baris ~109) dari:
```ts
  }, [router, pageCommandsRef]);
```
menjadi:
```ts
  }, [router, pageCommandsRef, scannedRef]);
```

- [ ] **Step 6: Pastikan test lama masih lulus & typecheck**

Run: `npx vitest run` lalu `npx tsc --noEmit`
Expected: Test lama PASS. Typecheck: `useVoiceNavigation` sekarang wajib 3 argumen — akan muncul error di `TalkbackProvider.tsx` (pemanggil lama) sampai Task 5. Itu diharapkan; error hanya boleh di `TalkbackProvider.tsx`.

- [ ] **Step 7: Commit**

```bash
git add lib/hooks/useVoiceNavigation.ts
git commit -m "feat: voice nav - perintah bacakan/apa saja + klik tombol hasil scan"
```

---

### Task 5: Wiring di `TalkbackProvider` — panggil hook, `data-voice-ignore`, pindahkan narasi

**Files:**
- Modify: `components/accessibility/TalkbackProvider.tsx`

**Interfaces:**
- Consumes: `useAutoVoiceScan`, `PAGE_NARASI` (Task 3), `ScannedCommand` (Task 1), signatur baru `useVoiceNavigation` (Task 4).

- [ ] **Step 1: Tambah import & hapus `PAGE_NARASI` lokal**

Di `components/accessibility/TalkbackProvider.tsx`:

Tambahkan import (dekat import `useVoiceNavigation`, baris ~7):
```ts
import { useAutoVoiceScan } from '@/lib/hooks/useAutoVoiceScan';
import type { ScannedCommand } from '@/lib/voice/dom-scan';
```

Hapus const `PAGE_NARASI` lokal (baris ~10-17) — sekarang tinggal di `useAutoVoiceScan.ts`.

- [ ] **Step 2: Hapus effect narasi otomatis lama**

Hapus blok effect "Narasi otomatis saat pindah halaman" (baris ~81-94, mulai `const prevPathRef = useRef('');` sampai `}, [pathname, isAktif]);`). Fungsi ini kini ditangani `useAutoVoiceScan` (digabung dengan pengumuman tombol). Import `usePathname` tetap dipakai untuk `isLoginPage`.

- [ ] **Step 3: Buat `scannedRef` dan panggil `useAutoVoiceScan`**

Setelah deklarasi `pageCommandsRef` (baris ~66), tambahkan:
```ts
  const scannedRef = useRef<ScannedCommand[]>([]);
```

Ganti baris pemanggilan `useVoiceNavigation` (baris ~118):
```ts
  useVoiceNavigation(isVoiceNavAktif && isAktif && !isLoginPage, pageCommandsRef);
```
menjadi:
```ts
  useAutoVoiceScan(isVoiceNavAktif && isAktif && !isLoginPage, scannedRef, pageCommandsRef);
  useVoiceNavigation(isVoiceNavAktif && isAktif && !isLoginPage, pageCommandsRef, scannedRef);
```

- [ ] **Step 4: Tandai kontrol melayang dengan `data-voice-ignore`**

Pada `<div>` kontainer kontrol melayang (baris ~134), tambahkan atribut `data-voice-ignore`:
```tsx
      <div data-voice-ignore className="fixed bottom-20 sm:bottom-6 right-4 z-50 flex flex-col gap-2 items-end">
```

- [ ] **Step 5: Typecheck lolos penuh**

Run: `npx tsc --noEmit`
Expected: Tidak ada error terkait file voice (error pra-eksisting yang tak berhubungan diabaikan).

- [ ] **Step 6: Commit**

```bash
git add components/accessibility/TalkbackProvider.tsx
git commit -m "feat: wire global voice - useAutoVoiceScan, data-voice-ignore, pindah narasi"
```

---

### Task 6: Verifikasi manual (Chrome) + build

**Files:** (tidak ada perubahan kode; verifikasi perilaku)

- [ ] **Step 1: Build produksi lolos**

Run: `npm run build`
Expected: Build sukses tanpa error.

- [ ] **Step 2: Jalankan semua unit test**

Run: `npx vitest run`
Expected: Semua PASS (`dom-scan`, `content-read`, `quiz-speech`, `keyword-match`).

- [ ] **Step 3: Uji manual mode tunanetra (dev server)**

Run: `npm run dev`, buka Chrome, set mode aksesibilitas = Tunanetra, voice-nav ON. Verifikasi:
- [ ] Buka **Profil** → terdengar narasi + "Tombol tersedia: …".
- [ ] Ucap **"keluar"** → tombol Keluar terklik (logout).
- [ ] Ucap **"bacakan"** → isi konten utama terbaca; ucap **"stop"** → berhenti.
- [ ] Ucap **"apa saja"** → daftar tombol lengkap terbaca.
- [ ] Buka halaman dengan elemen dinamis (mis. tab/toggle di Profil) → tombol baru bisa diucapkan (uji Live).
- [ ] Buka **Kuis** → intro & perintah A/B/C/D/lanjut jalan normal; **tidak** ada pengumuman "Tombol tersedia".
- [ ] Kontrol mic/stop melayang **tidak** ikut terbaca sebagai tombol.

- [ ] **Step 4: Uji regресi mode non-tunanetra**

- [ ] Set mode = Tidak Ada → tidak ada suara, tidak ada MutationObserver aktif, perilaku UI persis seperti sebelumnya.

- [ ] **Step 5: Commit catatan verifikasi (opsional)**

Bila ada penyesuaian kecil dari hasil uji manual, commit terpisah dengan pesan deskriptif.

---

## Catatan & Batasan Diketahui

- **Ambiguitas "edit profil" vs menu "profil":** menu statis dicek sebelum tombol scan, jadi "edit profil" (mengandung "profil") akan membuka menu Profil, bukan tombol Edit. Ini konsekuensi urutan prioritas yang disepakati di spec (§5.5). Diterima untuk v1.
- **Visibilitas layout** hanya difilter di runtime browser (`offsetParent`), tidak di unit test.
- **`<main>` menyertakan header** (mis. "Profil Saya"): teks header ikut terbaca saat "bacakan"; tombol di header tetap dilewati.
