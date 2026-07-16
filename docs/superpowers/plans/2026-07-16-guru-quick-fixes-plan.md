# Guru Quick Fixes (Transkrip Live Subtitle, Onboarding Cleanup, Nama Siswa) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the live-class transcript show up as a persistent on-video subtitle bar for everyone (any accessibility mode), simplify both live-class sidebars to Q&A-only, surface mic errors to the teacher, remove the leftover empty onboarding route, and sync the student's displayed name.

**Architecture:** One new small presentational component (`LiveSubtitleBar`) is shared by the teacher and student live pages. Each page keeps its own small "controller" component (still required to live inside `<LiveKitRoom>` because it uses `useDataChannel`) that owns the speech-recognition/data-channel wiring and renders `LiveSubtitleBar` with the current caption text. The `subtitleEnabled` accessibility-store field stops gating anything on the live pages (it stays untouched in the store itself — `app/student/profile/page.tsx` still reads it).

**Tech Stack:** Next.js 14 (App Router), TypeScript, `@livekit/components-react` (`useDataChannel`, `LiveKitRoom`), Tailwind, `lucide-react` icons, Supabase JS client, Vitest (only for pure-function tests — this repo has no React component render tests; see Global Constraints).

## Global Constraints

- No automated tests exist for React components in this codebase (`grep` across the repo shows only pure-function `.test.ts` files under `lib/`, all using `// @vitest-environment jsdom` with plain DOM APIs — no `@testing-library/react`, not a devDependency). Do **not** introduce component-render tests as part of this plan; verify UI changes via `npx tsc --noEmit`, `npm run build`, and manual browser testing, matching the precedent in `docs/superpowers/specs/2026-07-09-fixes-batch-design.md`.
- Keep all UI copy in Indonesian, matching the surrounding code.
- Do not modify `lib/store/accessibility-store.ts` — `subtitleEnabled` stays defined there for other consumers (`app/student/profile/page.tsx`).
- Keep saving finalized captions to `session_transcripts` from the teacher side (unchanged behavior) even though they're no longer rendered as a live list.
- Follow existing patterns: `cn()` from `@/lib/utils/cn` for conditional classNames, `lucide-react` for icons, `'use client'` at top of client components.

---

## Task 1: Create shared `LiveSubtitleBar` component

**Files:**
- Create: `components/live/LiveSubtitleBar.tsx`

**Interfaces:**
- Produces: `LiveSubtitleBar({ text, controls }: { text: string; controls?: React.ReactNode })` — default export. Renders `null` when both `text` is falsy/empty **and** `controls` is not provided (so the bar only ever appears when there's something to show or something to control). Otherwise renders a full-width dark bar pinned to the bottom of its nearest `relative`/`absolute`-positioned ancestor, showing `text` on the left and `controls` (if any) on the right.
- Consumes: nothing from other tasks (this is the first task).

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { ReactNode } from 'react';

export default function LiveSubtitleBar({
  text,
  controls,
}: {
  text: string;
  controls?: ReactNode;
}) {
  if (!text && !controls) return null;

  return (
    <div className="absolute bottom-0 inset-x-0 z-30 bg-black/75 backdrop-blur-sm px-4 py-3 flex items-center gap-3 min-h-[3rem]">
      <p className="flex-1 text-white text-sm sm:text-base leading-relaxed">
        {text}
      </p>
      {controls}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors (this is a brand-new, self-contained file — any error means a typo in the code above).

- [ ] **Step 3: Commit**

```bash
git add components/live/LiveSubtitleBar.tsx
git commit -m "feat: add shared LiveSubtitleBar component for live-class captions"
```

---

## Task 2: Wire always-on subtitle bar into the student live page, remove the Transkrip tab

**Files:**
- Modify: `app/student/live/page.tsx`

**Interfaces:**
- Consumes: `LiveSubtitleBar` from Task 1 (`import LiveSubtitleBar from '@/components/live/LiveSubtitleBar';`).
- Produces: nothing consumed by later tasks (student and teacher pages are independent).

### Context

Today, `app/student/live/page.tsx` has a `LiveCaptionOverlay` function (a floating bubble that auto-hides after 6s, gated behind `subtitleEnabled`) and a `TranscriptTab` (a scrollable log in the sidebar, fed by a `captions` array state that only ever gets populated when `LiveCaptionOverlay` is mounted). Because `subtitleEnabled` defaults to `false` for tunanetra-only students, neither ever renders for them — this is the root cause of "transkrip live tidak muncul". We're replacing both with one always-mounted `StudentCaptionBar` that uses the shared `LiveSubtitleBar`, and simplifying the sidebar to Q&A-only.

- [ ] **Step 1: Replace the `LiveCaptionOverlay` function with `StudentCaptionBar`**

Find this block near the top of the file (currently lines 18-69):

```tsx
// ─── Caption mengambang di atas video (tidak menutupi kontrol bawah) ─────
function LiveCaptionOverlay({
  ttsEnabled,
  ttsRate,
  onNewCaption,
}: {
  ttsEnabled: boolean;
  ttsRate: number;
  onNewCaption: (text: string) => void;
}) {
  const [caption, setCaption] = useState('');
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpokenRef = useRef('');

  useDataChannel('caption', (msg) => {
    const text = new TextDecoder().decode(msg.payload);
    setCaption(text);
    setVisible(true);
    onNewCaption(text);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 6000);

    if (ttsEnabled && typeof window !== 'undefined' && window.speechSynthesis) {
      if (text !== lastSpokenRef.current && text.length > 5) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID';
        utterance.rate = ttsRate;
        window.speechSynthesis.speak(utterance);
        lastSpokenRef.current = text;
      }
    }
  });

  if (!visible || !caption) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none px-4 w-full flex justify-center">
      <div className="bg-black/80 backdrop-blur-sm text-white text-sm rounded-2xl px-5 py-3 max-w-lg text-center leading-relaxed shadow-2xl border border-white/10">
        {ttsEnabled && (
          <div className="flex items-center justify-center gap-1.5 mb-1.5">
            <Volume2 size={11} className="text-blue-300" />
            <span className="text-[10px] text-blue-300 font-medium uppercase tracking-wide">Sedang dibacakan</span>
          </div>
        )}
        {caption}
      </div>
    </div>
  );
}
```

Replace it with:

```tsx
// ─── Subtitle live (selalu aktif, tanpa syarat mode aksesibilitas) ───────
function StudentCaptionBar({ ttsEnabled, ttsRate }: { ttsEnabled: boolean; ttsRate: number }) {
  const [caption, setCaption] = useState('');
  const lastSpokenRef = useRef('');

  useDataChannel('caption', (msg) => {
    const text = new TextDecoder().decode(msg.payload);
    setCaption(text);

    if (ttsEnabled && typeof window !== 'undefined' && window.speechSynthesis) {
      if (text !== lastSpokenRef.current && text.length > 5) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID';
        utterance.rate = ttsRate;
        window.speechSynthesis.speak(utterance);
        lastSpokenRef.current = text;
      }
    }
  });

  return <LiveSubtitleBar text={caption} />;
}
```

Note this drops the `visible`/`timerRef` auto-hide (real subtitles just show the latest line until replaced) and the `onNewCaption` callback (no longer needed — see Step 3).

- [ ] **Step 2: Delete the `TranscriptTab` function**

Find and delete this whole block (currently lines 71-99):

```tsx
// ─── Panel Transkripsi (tab tersendiri di sidebar) ───────────────────────
function TranscriptTab({ captions }: { captions: string[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [captions]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
      {captions.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          <FileText size={28} className="text-slate-300 mb-2" />
          <p className="text-xs text-slate-400">Transkripsi akan muncul di sini saat pendamping berbicara...</p>
        </div>
      ) : (
        <>
          {captions.map((c, i) => (
            <div key={i} className="flex gap-2.5 text-xs text-slate-700 leading-relaxed pb-2.5 border-b border-slate-100 last:border-0">
              <span className="text-slate-300 flex-shrink-0 font-mono mt-0.5">{String(i + 1).padStart(2, '0')}</span>
              <span>{c}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Remove now-unused state from `StudentLivePage`**

In the `StudentLivePage` function, find:

```tsx
  const { subtitleEnabled, ttsRate } = useAccessibilityStore();
```

Replace with:

```tsx
  const { ttsRate } = useAccessibilityStore();
```

Find:

```tsx
  const [activeTab, setActiveTab] = useState<'transcript' | 'qa'>('transcript');
```

Delete this line entirely.

Find:

```tsx
  const [captions, setCaptions] = useState<string[]>([]);
```

Delete this line entirely.

Find:

```tsx
  const handleNewCaption = useCallback((text: string) => {
    if (text.length > 8) {
      setCaptions(prev => (prev[prev.length - 1] === text ? prev : [...prev, text]));
    }
  }, []);
```

Delete this block entirely.

- [ ] **Step 4: Update imports**

Find:

```tsx
import { useState, useEffect, useRef, useCallback } from 'react';
```

Replace with:

```tsx
import { useState, useEffect, useRef } from 'react';
```

(`useCallback` is no longer used anywhere else in this file after Step 3.)

Find:

```tsx
import { Send, Users, Volume2, VolumeX, FileText, MessageSquare, ArrowLeft, Radio, Clock } from 'lucide-react';
```

Replace with:

```tsx
import { Send, Users, Volume2, VolumeX, MessageSquare, ArrowLeft, Radio, Clock } from 'lucide-react';
```

Add the new import (near the other local imports, e.g. right after `StudentSidebar`):

```tsx
import LiveSubtitleBar from '@/components/live/LiveSubtitleBar';
```

- [ ] **Step 5: Render `StudentCaptionBar` unconditionally inside `LiveKitRoom`**

Find:

```tsx
          <LiveKitRoom
            token={token}
            serverUrl={livekitUrl}
            connect={true}
            audio={true}
            video={false}
            data-lk-theme="default"
            onDisconnected={() => setError('Koneksi terputus dari kelas.')}
            className="h-full"
          >
            <VideoConference />
            <RoomAudioRenderer />
            {subtitleEnabled && (
              <LiveCaptionOverlay ttsEnabled={ttsLive} ttsRate={ttsRate} onNewCaption={handleNewCaption} />
            )}
          </LiveKitRoom>
```

Replace with:

```tsx
          <LiveKitRoom
            token={token}
            serverUrl={livekitUrl}
            connect={true}
            audio={true}
            video={false}
            data-lk-theme="default"
            onDisconnected={() => setError('Koneksi terputus dari kelas.')}
            className="h-full"
          >
            <VideoConference />
            <RoomAudioRenderer />
            {/* Subtitle bar HARUS di dalam LiveKitRoom karena pakai useDataChannel */}
            <StudentCaptionBar ttsEnabled={ttsLive} ttsRate={ttsRate} />
          </LiveKitRoom>
```

- [ ] **Step 6: Simplify the sidebar to Q&A-only**

Find:

```tsx
      {/* ── Sidebar panel (tab Transkripsi / Tanya Jawab) ── */}
      {showSidebar && (
        <div className="fixed top-14 bottom-0 right-0 w-full sm:w-80 bg-white border-l border-slate-200 z-30 flex flex-col shadow-2xl">
          {/* Tabs */}
          <div className="flex border-b border-slate-100 flex-shrink-0">
            <button
              onClick={() => setActiveTab('transcript')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors border-b-2",
                activeTab === 'transcript' ? "text-blue-700 border-blue-700" : "text-slate-400 border-transparent hover:text-slate-600"
              )}
            >
              <FileText size={13} /> Transkrip
              {captions.length > 0 && (
                <span className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded-full">{captions.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('qa')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors border-b-2",
                activeTab === 'qa' ? "text-blue-700 border-blue-700" : "text-slate-400 border-transparent hover:text-slate-600"
              )}
            >
              <MessageSquare size={13} /> Tanya Jawab
            </button>
          </div>

          {/* Tab content */}
          {activeTab === 'transcript'
            ? <TranscriptTab captions={captions} />
            : <QuestionTab sessionId={session.id} />
          }
        </div>
      )}
```

Replace with:

```tsx
      {/* ── Sidebar panel: Tanya Jawab ── */}
      {showSidebar && (
        <div className="fixed top-14 bottom-0 right-0 w-full sm:w-80 bg-white border-l border-slate-200 z-30 flex flex-col shadow-2xl">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-100 flex-shrink-0 text-xs font-semibold text-blue-700">
            <MessageSquare size={13} /> Tanya Jawab
          </div>
          <QuestionTab sessionId={session.id} />
        </div>
      )}
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors. If you see "cannot find name 'captions'" or similar, you missed one of the removals in Steps 1-3 — search the file for `captions`, `activeTab`, `TranscriptTab`, `LiveCaptionOverlay`, `handleNewCaption` and confirm zero remaining references.

- [ ] **Step 8: Manual verification**

Run: `npm run dev`, open two browser windows/profiles — one logged in as the teacher (start a live session), one as a student in **tunanetra** mode (default `subtitleEnabled: false`). Confirm:
- The student sees the subtitle bar at the bottom of the video area once the teacher starts dictating (previously this was completely blank for tunanetra).
- The sidebar shows only "Tanya Jawab" — no tab switcher, no "Transkrip" option.

- [ ] **Step 9: Commit**

```bash
git add app/student/live/page.tsx
git commit -m "fix: transkrip live tampil untuk semua mode via subtitle bar, sederhanakan sidebar jadi Tanya Jawab"
```

---

## Task 3: Wire always-on subtitle bar into the teacher live page, add mic-error handling, remove the Caption tab

**Files:**
- Modify: `app/teacher/actions/page.tsx`

**Interfaces:**
- Consumes: `LiveSubtitleBar` from Task 1.
- Produces: nothing consumed by later tasks.

### Context

`CaptionTab` currently renders a start/stop button, the current caption, and a scrollable history log, all inside a sidebar tab that's only shown when `activeTab === 'caption'`. We're replacing it with `TeacherCaptionBar`, which uses `LiveSubtitleBar` to show the teacher's own dictated line directly over their video, with the start/stop mic button embedded as the bar's `controls`. The sidebar becomes Q&A-only, matching Task 2's student-side change. `session_transcripts` inserts on `isFinal` are kept (dropped only the in-memory `history` list used for the on-screen log, which is no longer shown live).

- [ ] **Step 1: Replace the `CaptionTab` function with `TeacherCaptionBar`**

Find this whole block (currently lines 19-110):

```tsx
// ─── Tab Caption Otomatis (kontrol speech-to-text guru) ──────────────────
function CaptionTab({ sessionId }: { sessionId: string }) {
  const { send } = useDataChannel('caption');
  const [caption, setCaption] = useState('');
  const [recognition, setRecognition] = useState<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.lang = 'id-ID';
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = async (event: any) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;

      send(new TextEncoder().encode(text), { reliable: true });
      setCaption(text);

      if (result.isFinal) {
        await supabase.from('session_transcripts').insert({ session_id: sessionId, isi: text });
        setHistory(prev => [...prev, text]);
      }
    };

    rec.onend = () => { if (isListening) rec.start(); };
    setRecognition(rec);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const toggleListening = () => {
    if (!recognition) {
      alert('Browser Anda tidak mendukung Speech Recognition. Gunakan Chrome.');
      return;
    }
    if (isListening) { recognition.stop(); setIsListening(false); }
    else { recognition.start(); setIsListening(true); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-100">
        <button
          onClick={toggleListening}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors',
            isListening ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-blue-700 text-white hover:bg-blue-800'
          )}
        >
          {isListening ? <MicOff size={15} /> : <Mic size={15} />}
          {isListening ? 'Hentikan Caption' : 'Mulai Caption Otomatis'}
        </button>
        {isListening && (
          <div className="flex items-center gap-1.5 justify-center mt-2 text-red-600 text-xs">
            <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
            Merekam suara...
          </div>
        )}
      </div>

      {caption && (
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
          <p className="text-[10px] text-blue-500 font-semibold uppercase mb-1">Caption terkirim sekarang</p>
          <p className="text-sm text-blue-900">{caption}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <FileText size={28} className="text-slate-300 mb-2" />
            <p className="text-xs text-slate-400">Riwayat caption akan muncul di sini.</p>
          </div>
        ) : (
          history.map((h, i) => (
            <div key={i} className="flex gap-2.5 text-xs text-slate-700 leading-relaxed pb-2.5 border-b border-slate-100 last:border-0">
              <span className="text-slate-300 flex-shrink-0 font-mono mt-0.5">{String(i + 1).padStart(2, '0')}</span>
              <span>{h}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

Replace with:

```tsx
// ─── Subtitle live guru: dikte suara -> data channel + subtitle sendiri ──
function TeacherCaptionBar({ sessionId }: { sessionId: string }) {
  const { send } = useDataChannel('caption');
  const [caption, setCaption] = useState('');
  const [recognition, setRecognition] = useState<any>(null);
  const [isListening, setIsListening] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.lang = 'id-ID';
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = async (event: any) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;

      send(new TextEncoder().encode(text), { reliable: true });
      setCaption(text);

      if (result.isFinal) {
        await supabase.from('session_transcripts').insert({ session_id: sessionId, isi: text });
      }
    };

    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed') {
        alert('Izin mikrofon ditolak. Aktifkan mikrofon di pengaturan browser lalu coba lagi.');
      }
      setIsListening(false);
    };

    rec.onend = () => { if (isListening) rec.start(); };
    setRecognition(rec);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const toggleListening = () => {
    if (!recognition) {
      alert('Browser Anda tidak mendukung Speech Recognition. Gunakan Chrome.');
      return;
    }
    if (isListening) { recognition.stop(); setIsListening(false); }
    else { recognition.start(); setIsListening(true); }
  };

  return (
    <LiveSubtitleBar
      text={caption}
      controls={
        <button
          onClick={toggleListening}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex-shrink-0',
            isListening ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-blue-700 text-white hover:bg-blue-800'
          )}
        >
          {isListening ? <MicOff size={14} /> : <Mic size={14} />}
          {isListening ? 'Hentikan' : 'Mulai Caption'}
        </button>
      }
    />
  );
}
```

- [ ] **Step 2: Update imports**

Find:

```tsx
import { MessageSquare, Send, Check, Mic, MicOff, Radio, ArrowLeft, Clock, Users, FileText, PhoneOff } from 'lucide-react';
```

Replace with:

```tsx
import { MessageSquare, Send, Check, Mic, MicOff, Radio, ArrowLeft, Clock, Users, PhoneOff } from 'lucide-react';
```

(`FileText` was only used by the deleted history-log empty-state; nothing else in this file uses it.)

Add the new import (near `TeacherSidebar`/`AccessibilityBar`):

```tsx
import LiveSubtitleBar from '@/components/live/LiveSubtitleBar';
```

- [ ] **Step 3: Remove the `activeTab` state from `TeacherLivePage`**

Find:

```tsx
  const [activeTab, setActiveTab] = useState<'caption' | 'qa'>('caption');
```

Delete this line entirely.

- [ ] **Step 4: Render `TeacherCaptionBar` unconditionally inside `LiveKitRoom`**

Find:

```tsx
          <LiveKitRoom
            token={token}
            serverUrl={livekitUrl!}
            connect={true}
            audio={true}
            video={true}
            className="h-full"
          >
            <VideoConference />
            <RoomAudioRenderer />
            {/* CaptionTab HARUS di dalam LiveKitRoom karena pakai useDataChannel */}
            {showSidebar && activeTab === 'caption' && (
              <div className="fixed top-[calc(3.5rem+48px)] bottom-0 right-0 w-full sm:w-80 flex flex-col z-20">
                <CaptionTab sessionId={session.id} />
              </div>
            )}
          </LiveKitRoom>
```

Replace with:

```tsx
          <LiveKitRoom
            token={token}
            serverUrl={livekitUrl!}
            connect={true}
            audio={true}
            video={true}
            className="h-full"
          >
            <VideoConference />
            <RoomAudioRenderer />
            {/* Subtitle bar HARUS di dalam LiveKitRoom karena pakai useDataChannel */}
            <TeacherCaptionBar sessionId={session.id} />
          </LiveKitRoom>
```

- [ ] **Step 5: Simplify the sidebar to Q&A-only**

Find:

```tsx
      {/* ── Sidebar panel ── */}
      {showSidebar && (
        <div className="fixed top-14 bottom-0 right-0 w-full sm:w-80 bg-white border-l border-slate-200 z-30 flex flex-col shadow-2xl">
          <div className="flex border-b border-slate-100 flex-shrink-0">
            <button
              onClick={() => setActiveTab('caption')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors border-b-2",
                activeTab === 'caption' ? "text-blue-700 border-blue-700" : "text-slate-400 border-transparent hover:text-slate-600"
              )}
            >
              <Mic size={13} /> Caption
            </button>
            <button
              onClick={() => setActiveTab('qa')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors border-b-2",
                activeTab === 'qa' ? "text-blue-700 border-blue-700" : "text-slate-400 border-transparent hover:text-slate-600"
              )}
            >
              <MessageSquare size={13} /> Tanya Jawab
            </button>
          </div>

          {/* Caption dirender di dalam LiveKitRoom (di atas), sidebar ini hanya untuk QA */}
          {activeTab === 'caption' ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-slate-400 text-center px-4">Panel caption aktif di area video</p>
            </div>
          ) : (
            <QATab sessionId={session.id} />
          )}
        </div>
      )}
```

Replace with:

```tsx
      {/* ── Sidebar panel: Tanya Jawab ── */}
      {showSidebar && (
        <div className="fixed top-14 bottom-0 right-0 w-full sm:w-80 bg-white border-l border-slate-200 z-30 flex flex-col shadow-2xl">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-100 flex-shrink-0 text-xs font-semibold text-blue-700">
            <MessageSquare size={13} /> Tanya Jawab
          </div>
          <QATab sessionId={session.id} />
        </div>
      )}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors. If you see "cannot find name 'activeTab'" or "'CaptionTab' is not defined", search the file for leftover references to `activeTab` or `CaptionTab` and remove them.

- [ ] **Step 7: Manual verification**

Run: `npm run dev`, log in as the teacher, start a live session, click "Mulai Caption" (now shown as a small button on the subtitle bar over the video) and dictate. Confirm:
- The teacher's own dictated text appears live in the subtitle bar over their video.
- The sidebar shows only "Tanya Jawab" — no "Caption" tab.
- Deny microphone permission (or test in a browser without mic access) and confirm an alert explains the mic was denied, instead of the button silently doing nothing.

- [ ] **Step 8: Commit**

```bash
git add app/teacher/actions/page.tsx
git commit -m "fix: transkrip live guru jadi subtitle di atas video, tambah error mic, sederhanakan sidebar jadi Tanya Jawab"
```

---

## Task 4: Remove the leftover empty onboarding folder and stale README references

**Files:**
- Delete: `app/teacher/onboarding/` (empty directory, no files inside)
- Modify: `README.md`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Remove the empty directory**

Run: `rmdir "app/teacher/onboarding"` (PowerShell) or `rm -r "app/teacher/onboarding"` (bash) — confirm first with `ls app/teacher/onboarding` that it is empty before removing, since an empty directory holds no git history to lose.

- [ ] **Step 2: Remove the feature-table row in `README.md`**

Find this line (around line 82):

```
| **Onboarding 3-Step** | Alur orientasi untuk guru baru yang memandu setup akun dan pemahaman fitur platform | Onboarding yang terstruktur dan efisien |
```

Delete this line entirely.

- [ ] **Step 3: Fix the "Alur Guru" user-journey code block in `README.md`**

Find (around line 111-119):

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
```

Replace the first line of that code block:

```
1. Onboarding → Setup profil → Memahami fitur platform
```

with:

```
1. Setup profil di halaman Profil → Memahami fitur platform
```

(Keep lines 2-6 unchanged — this only removes the mention of a nonexistent "Onboarding" step while keeping the numbering intact.)

- [ ] **Step 4: Remove the tree-structure line in `README.md`**

Find (around line 283):

```
│       ├── onboarding/           # 3-step teacher onboarding
```

Delete this line entirely.

- [ ] **Step 5: Verify no other "onboarding" references remain**

Run: `grep -ri onboarding README.md app -r` (or equivalent search)
Expected: no output (no remaining matches anywhere in `README.md` or `app/`).

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: hapus referensi onboarding guru yang tidak ada implementasinya"
```

(Note: the deleted empty directory has no content for git to track, so nothing needs to be `git add`ed for its removal — `git status` will simply show it's gone.)

---

## Task 5: Sync the student's displayed name in `StudentSidebar`

**Files:**
- Modify: `components/shared/StudentSidebar.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/client` (already used elsewhere in this codebase, e.g. `components/shared/TeacherSidebar.tsx`).
- Produces: nothing consumed by later tasks.

### Context

`StudentSidebar.tsx:71` hard-codes `"Alex Pratama"`. This mirrors a bug already fixed on the teacher side (`TeacherSidebar.tsx`, see `docs/superpowers/specs/2026-07-09-fixes-batch-design.md`, item T3) — apply the identical pattern here.

- [ ] **Step 1: Add `'use client'`, state, and the fetch effect**

Find the top of the file:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Radio, User, Bell, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
```

Replace with:

```tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Radio, User, Bell, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { createClient } from '@/lib/supabase/client';
```

Find:

```tsx
export default function StudentSidebar() {
  const pathname = usePathname();
```

Replace with:

```tsx
export default function StudentSidebar() {
  const pathname = usePathname();
  const [nama, setNama] = useState('Siswa');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('nama').eq('id', user.id).single().then(({ data }) => {
        if (data?.nama) setNama(data.nama);
      });
    });
  }, []);
```

- [ ] **Step 2: Render the fetched name**

Find (around line 71):

```tsx
          <p className="text-xs text-slate-500 mt-0.5">Alex Pratama</p>
```

Replace with:

```tsx
          <p className="text-xs text-slate-500 mt-0.5">{nama}</p>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, log in as a student, go to `/student/profile/edit`, change the display name, save, then check any page with `StudentSidebar` (e.g. `/student/dashboard`). Confirm the sidebar shows the updated name (not "Alex Pratama").

- [ ] **Step 5: Commit**

```bash
git add components/shared/StudentSidebar.tsx
git commit -m "fix: sinkronkan nama siswa di sidebar dengan data profil, hapus hardcode Alex Pratama"
```

---

## Final verification (after all 5 tasks)

- [ ] Run `npx tsc --noEmit` — zero errors.
- [ ] Run `npm run build` — succeeds.
- [ ] Run `npm test` (vitest) — all existing tests still pass (this plan doesn't touch any file under `lib/`, so no test should be affected, but confirm nothing broke).
