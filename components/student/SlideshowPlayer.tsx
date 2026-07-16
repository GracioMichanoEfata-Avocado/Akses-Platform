'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';
import { speak, stopSpeaking, isTTSSpeaking } from '@/lib/hooks/useTalkback';
import { Slide, durasiBaca } from '@/lib/slides/slide-data';
import { cn } from '@/lib/utils/cn';
import { FILTER_KONTRAS_VIDEO } from '@/lib/accessibility/material-features';

interface Props {
  slides: Slide[];
  kontrasAktif: boolean;
}

export default function SlideshowPlayer({ slides, kontrasAktif }: Props) {
  const [idx, setIdx] = useState(0);
  const [berjalan, setBerjalan] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const bersihkanTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const berhenti = useCallback(() => {
    bersihkanTimer();
    stopSpeaking();
    setBerjalan(false);
  }, [bersihkanTimer]);

  useEffect(() => () => { bersihkanTimer(); stopSpeaking(); }, [bersihkanTimer]);

  // Narasi + pergantian slide otomatis saat berjalan.
  //
  // Menunggu selesainya TTS dengan polling isTTSSpeaking(), bukan onTTSEnd():
  // slot callback onTTSEnd tunggal dan diperebutkan logika restart recognition
  // di useVoiceNavigation. Pola yang sama dipakai useQuizVoice.waitTTSEnd().
  //
  // Bila TTS tidak pernah menyala — siswa tunarungu, atau browser tanpa
  // speech synthesis — jatuh ke perkiraan waktu baca.
  useEffect(() => {
    if (!berjalan) return;
    const slide = slides[idx];
    if (!slide) return;

    bersihkanTimer();
    speak(`${slide.judul}. ${slide.deskripsi}`, 'interrupt');

    const lanjut = () => {
      bersihkanTimer();
      if (idx < slides.length - 1) {
        setIdx(i => i + 1);
      } else {
        setIdx(0);
        setBerjalan(false);
      }
    };

    // Beri waktu utterance mulai; onstart bersifat asinkron.
    timerRef.current = setTimeout(() => {
      if (!isTTSSpeaking()) {
        timerRef.current = setTimeout(lanjut, durasiBaca(slide.deskripsi));
        return;
      }
      intervalRef.current = setInterval(() => {
        if (!isTTSSpeaking()) lanjut();
      }, 300);
    }, 700);

    return bersihkanTimer;
  }, [berjalan, idx, slides, bersihkanTimer]);

  const pindah = (ke: number) => {
    berhenti();
    setIdx(Math.max(0, Math.min(slides.length - 1, ke)));
  };

  const slide = slides[idx];
  if (!slide) return null;

  return (
    <div className="space-y-3">
      {/* Area slide — filter kontras dipasang di sini, sejajar dengan
          kontainer player lain di halaman materi. */}
      <div
        className="glow-tint relative rounded-2xl overflow-hidden shadow-sm"
        style={{
          backgroundColor: slide.warna + '20',
          filter: kontrasAktif ? FILTER_KONTRAS_VIDEO : undefined,
          '--glow-color': slide.warna,
        } as React.CSSProperties}
        role="region"
        aria-label={`Slide ${idx + 1} dari ${slides.length}: ${slide.judul}`}
      >
        <div className="flex flex-col items-center justify-center h-52 gap-3 px-4">
          <span className="text-6xl" aria-hidden="true">{slide.emojiIkon}</span>
          <h3 className="text-base font-bold text-slate-900 text-center">{slide.judul}</h3>
        </div>

        {/* Penanda posisi */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5" aria-hidden="true">
          {slides.map((_, i) => (
            <span
              key={i}
              className={cn('w-1.5 h-1.5 rounded-full transition-all', i === idx ? 'bg-slate-800 w-4' : 'bg-slate-400/60')}
            />
          ))}
        </div>
      </div>

      {/* Caption — selalu tampil. Inilah nilainya bagi siswa tunarungu, dan
          ia sinkron dengan sendirinya karena kita yang mengatur pergantian. */}
      <div className="bg-slate-900 text-white rounded-xl px-4 py-3" aria-live="polite">
        <p className="text-sm leading-relaxed text-center">{slide.deskripsi}</p>
      </div>

      {/* Kontrol. Label dipilih agar tidak menyerobot perintah suara tombol lain
          di halaman ini: scanClickables mencocokkan substring dan tombol yang
          lebih dulu di DOM menang. "Putar" akan menelan "putar deskripsi
          materi" milik tombol Putar Audio; "Lanjut" akan menelan "lanjut ke
          kuis". Karena itu: Mainkan Slide, Berikutnya, Sebelumnya. */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => pindah(idx - 1)}
          disabled={idx === 0}
          className="h-11 px-4 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1.5"
        >
          <ChevronLeft size={15} aria-hidden="true" /> Sebelumnya
        </button>

        <button
          onClick={() => (berjalan ? berhenti() : setBerjalan(true))}
          className="flex-1 h-11 rounded-xl bg-blue-800 text-white text-sm font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          {berjalan ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
          {berjalan ? 'Jeda Slide' : 'Mainkan Slide'}
        </button>

        <button
          onClick={() => pindah(idx + 1)}
          disabled={idx === slides.length - 1}
          className="h-11 px-4 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1.5"
        >
          Berikutnya <ChevronRight size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
