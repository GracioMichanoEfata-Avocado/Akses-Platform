'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Contrast, ChevronDown, ChevronUp, CheckCircle, Circle, Users, BookOpen, Maximize } from 'lucide-react';
import StudentBottomNav from '@/components/shared/StudentBottomNav';
import StudentSidebar from '@/components/shared/StudentSidebar';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAccessibilityStore } from '@/lib/store/accessibility-store';
import { fiturUntukMode, FILTER_KONTRAS_VIDEO } from '@/lib/accessibility/material-features';
import SlideshowPlayer from '@/components/student/SlideshowPlayer';
import { parseSlides, Slide } from '@/lib/slides/slide-data';
import { createClient } from '@/lib/supabase/client';
import { speak, speakLong, stopSpeaking, isTTSSpeaking } from '@/lib/hooks/useTalkback';
import { useTalkbackContext, PageVoiceCommand } from '@/components/accessibility/TalkbackProvider';
import { describeRequestState, TutorRequestRow } from '@/lib/tutor/request-state';
import { formatDateShort } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';

interface Langkah {
  id: string;
  urutan: number;
  judul: string;
  deskripsi: string;
  selesai: boolean;
}

interface MaterialDetail {
  id: string;
  judul: string;
  mata_pelajaran: string;
  mode: 'audio' | 'visual' | 'both';
  thumbnail_color: string;
  thumbnail_emoji: string;
  transkrip: string;
  video_url: string | null;
  slides: Slide[];
  langkah: Langkah[];
}

export default function MaterialDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { mode, highContrast, ttsEnabled } = useAccessibilityStore();
  const fitur = fiturUntukMode(mode);
  const { registerPageCommands, clearPageCommands, registerStopHandler, clearStopHandler, isAktif } = useTalkbackContext();
  // Filter kontras video ikut menyala kalau toggle "Kontras Tinggi" global
  // (dari halaman setup) aktif — tombol di bawah tetap bisa dipakai untuk
  // mematikan/menyalakan filter ini khusus untuk video ini saja.
  const [kontrasAktif, setKontrasAktif] = useState(highContrast);

  const [material, setMaterial] = useState<MaterialDetail | null>(null);
  const [loadingMaterial, setLoadingMaterial] = useState(true);
  const [ajuan, setAjuan] = useState<TutorRequestRow | null>(null);
  const [mengirimAjuan, setMengirimAjuan] = useState(false);
  const [errorAjuan, setErrorAjuan] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTTSPlaying, setIsTTSPlaying] = useState(false);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [highlightedWord, setHighlightedWord] = useState(-1);
  const ttsWordsRef = useRef<string[]>([]);
  const wordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ttsPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Video player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function loadMaterial() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: materialData, error } = await supabase
        .from('materials')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !materialData) {
        setLoadingMaterial(false);
        return;
      }

      const { data: stepsData } = await supabase
        .from('material_steps')
        .select('*')
        .eq('material_id', id)
        .order('urutan', { ascending: true });

      if (user) {
        // Ajuan pendampingan terakhir untuk materi ini; menentukan wajah tombol.
        const { data: ajuanTerakhir } = await supabase
          .from('tutor_requests')
          .select('status, jadwal')
          .eq('student_id', user.id)
          .eq('material_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        setAjuan((ajuanTerakhir as TutorRequestRow) ?? null);
      }

      let completedStepIds: Set<number> = new Set();
      if (user) {
        // progress disimpan sebagai persentase per materi; untuk langkah
        // yang sudah ditandai selesai kita pakai progress siswa di materi ini
        const { data: progressData } = await supabase
          .from('student_material_progress')
          .select('progress')
          .eq('student_id', user.id)
          .eq('material_id', id)
          .maybeSingle();

        const progress = progressData?.progress ?? 0;
        const totalSteps = stepsData?.length ?? 0;
        const doneCount = Math.round((progress / 100) * totalSteps);
        (stepsData || []).forEach((s, idx) => {
          if (idx < doneCount) completedStepIds.add(s.urutan);
        });
      }

      setMaterial({
        id: materialData.id,
        judul: materialData.judul,
        mata_pelajaran: materialData.mata_pelajaran,
        mode: materialData.mode,
        thumbnail_color: materialData.thumbnail_color,
        thumbnail_emoji: materialData.thumbnail_emoji,
        transkrip: materialData.transkrip || '',
        video_url: materialData.video_url || null,
        slides: parseSlides(materialData.slides),
        langkah: (stepsData || []).map((s) => ({
          id: s.id,
          urutan: s.urutan,
          judul: s.judul,
          deskripsi: s.deskripsi,
          selesai: completedStepIds.has(s.urutan),
        })),
      });
      setLoadingMaterial(false);
    }

    loadMaterial();

    return () => {
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
      if (wordTimerRef.current) clearInterval(wordTimerRef.current);
      if (ttsPollRef.current) clearInterval(ttsPollRef.current);
    };
  }, [id]);

  // ── Voice command: umumkan pilihan yang BENAR-BENAR ada di materi ini
  // (video, audio deskripsi, kuis, minta pendamping), lalu daftarkan supaya
  // bisa diklik dengan menyebut namanya. "Stop" untuk video/audio (yang
  // durasinya panjang) didaftarkan diam-diam lewat registerStopHandler —
  // sengaja TIDAK disebut dalam pengumuman di atas. ──
  useEffect(() => {
    if (!isAktif || !material) return;

    type Pilihan = { label: string; keywords: string[]; action: () => void };
    const pilihan: Pilihan[] = [];

    if (material.video_url) {
      pilihan.push({ label: 'Video Materi', keywords: ['video materi', 'video'], action: toggleVideo });
    }
    if (ttsEnabled && material.transkrip.trim()) {
      pilihan.push({ label: 'Audio Deskripsi', keywords: ['audio deskripsi', 'audio', 'deskripsi'], action: handleTTS });
    }
    pilihan.push({
      label: 'Kuis',
      keywords: ['kuis', 'mulai kuis', 'lanjut ke kuis'],
      action: () => router.push(`/student/quiz/${material.id}`),
    });
    if (!describeRequestState(ajuan).disabled) {
      pilihan.push({ label: 'Minta Pendamping', keywords: ['minta pendamping', 'pendamping'], action: handleMintaPendamping });
    }

    const commands: PageVoiceCommand[] = pilihan.map((p) => ({
      keywords: p.keywords,
      label: p.label,
      action: p.action,
    }));
    registerPageCommands(commands);

    registerStopHandler(() => {
      // Cek state DOM/global langsung (bukan state React yang bisa basi di
      // closure ini) — video & audio sama-sama bisa dihentikan tanpa mematikan
      // navigasi suara.
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setVideoPlaying(false);
      }
      if (isTTSSpeaking()) {
        stopTTS();
      }
    });

    const timer = setTimeout(() => {
      speak(`Silakan pilih, ${pilihan.map((p) => p.label).join(', ')}.`, 'interrupt');
    }, 800);

    return () => {
      clearTimeout(timer);
      clearPageCommands();
      clearStopHandler();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAktif, material, ttsEnabled, ajuan]);

  const toggleVideo = () => {
    if (!videoRef.current) return;
    if (videoPlaying) {
      videoRef.current.pause();
      setVideoPlaying(false);
    } else {
      videoRef.current.play();
      setVideoPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoMuted;
    setVideoMuted(!videoMuted);
  };

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (loadingMaterial) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-700 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Memuat materi...</p>
        </div>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-3">Materi tidak ditemukan</p>
          <Link href="/student/learn" className="text-blue-600 hover:underline text-sm">
            ← Kembali ke Katalog
          </Link>
        </div>
      </div>
    );
  }

  const words = material.transkrip.split(/\s+/);

  const stopTTS = () => {
    stopSpeaking();
    setIsTTSPlaying(false);
    setHighlightedWord(-1);
    if (wordTimerRef.current) clearInterval(wordTimerRef.current);
    if (ttsPollRef.current) clearInterval(ttsPollRef.current);
  };

  const handleTTS = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (isTTSPlaying) {
      stopTTS();
      return;
    }

    // Audio disalurkan lewat speak() dari useTalkback, bukan window.speech-
    // Synthesis mentah: speak() memilih suara Indonesia dari getVoices() (lang
    // 'id-ID' mentah bisa sunyi bila suara id tak terpasang) dan menandai
    // isSpeakingGlobal agar mik voice-nav tak menangkap narasinya sendiri.
    ttsWordsRef.current = words;
    let wordIdx = 0;
    // Selaras dengan rate tetap speak() (0.95); highlight hanya perkiraan.
    const msPerWord = (60 / (0.95 * 150)) * 1000;

    setIsTTSPlaying(true);
    setHighlightedWord(0);

    wordTimerRef.current = setInterval(() => {
      wordIdx++;
      if (wordIdx >= ttsWordsRef.current.length) {
        clearInterval(wordTimerRef.current!);
        setHighlightedWord(-1);
      } else {
        setHighlightedWord(wordIdx);
      }
    }, msPerWord);

    // speakLong memecah transkrip per kalimat: satu utterance panjang sering
    // gagal berbunyi di Chrome, sementara narasi menu yang pendek aman.
    speakLong(material.transkrip);

    // Deteksi akhir dgn polling isTTSSpeaking() — pola sama seperti
    // SlideshowPlayer; slot onTTSEnd tunggal diperebutkan voice-nav.
    // Jeda awal memberi waktu utterance mulai (onstart async) agar poll tak
    // langsung membaca "belum bicara" dan berhenti seketika.
    setTimeout(() => {
      ttsPollRef.current = setInterval(() => {
        if (!isTTSSpeaking()) {
          setIsTTSPlaying(false);
          setHighlightedWord(-1);
          if (wordTimerRef.current) clearInterval(wordTimerRef.current);
          if (ttsPollRef.current) clearInterval(ttsPollRef.current);
        }
      }, 400);
    }, 900);
  };

  const tombolAjuan = describeRequestState(ajuan);

  const handleMintaPendamping = async () => {
    if (mengirimAjuan) return;
    setMengirimAjuan(true);
    setErrorAjuan(null);
    try {
      const res = await fetch('/api/tutor-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId: material.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorAjuan(data.error);
        speak(data.error, 'interrupt');
        return;
      }
      setAjuan(data as TutorRequestRow);
      speak('Ajuan pendampingan terkirim ke guru.', 'interrupt');
    } catch {
      const pesan = 'Gagal mengirim ajuan. Periksa koneksi internet.';
      setErrorAjuan(pesan);
      speak(pesan, 'interrupt');
    } finally {
      setMengirimAjuan(false);
    }
  };

  const completedSteps = material.langkah.filter(l => l.selesai).length;
  const overallProgress = Math.round((completedSteps / material.langkah.length) * 100);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <StudentSidebar />

      <main id="main-content" className="flex-1 sm:ml-60 pb-20 sm:pb-8">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center gap-3">
          <Link
            href="/student/learn"
            className="text-slate-600 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Kembali ke katalog materi"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-blue-600 font-medium">{material.mata_pelajaran}</p>
            <h1 className="text-sm font-semibold text-slate-900 truncate">{material.judul}</h1>
          </div>
        </div>

        <div className="p-4 space-y-4 max-w-2xl mx-auto">
          {/* Filter super kontras — cuma muncul kalau toggle "Kontras Tinggi"
              global aktif (bukan berdasarkan mode disabilitas). Diterapkan
              pada kontainer player, jadi ikut mengenai <video> begitu materi
              bervideo ada, tanpa kode tambahan. */}
          {highContrast && (
            <button
              onClick={() => setKontrasAktif(v => !v)}
              className={cn(
                'w-full flex items-center justify-center gap-2 h-11 rounded-xl font-medium text-sm border-2 transition-all focus-visible:ring-2 focus-visible:ring-blue-500',
                kontrasAktif
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              )}
              aria-pressed={kontrasAktif}
            >
              <Contrast size={15} aria-hidden="true" />
              {kontrasAktif ? 'Matikan Kontras' : 'Filter Kontras'}
            </button>
          )}

          {/* Player Area */}
          {(material as any).video_url ? (
            // ── VIDEO PLAYER ──
            <div
              ref={videoContainerRef}
              className="relative rounded-2xl overflow-hidden shadow-sm bg-black group"
              style={{ minHeight: '220px', filter: kontrasAktif ? FILTER_KONTRAS_VIDEO : undefined }}
            >
              <video
                ref={videoRef}
                src={(material as any).video_url}
                className="w-full max-h-[60vh] object-contain"
                onPlay={() => setVideoPlaying(true)}
                onPause={() => setVideoPlaying(false)}
                onEnded={() => setVideoPlaying(false)}
                playsInline
              />
              {/* Custom Controls */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={toggleVideo}
                  className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  aria-label={videoPlaying ? 'Pause video' : 'Play video'}
                >
                  {videoPlaying
                    ? <Pause size={16} />
                    : <Play size={16} className="ml-0.5" />
                  }
                </button>
                <button
                  onClick={toggleMute}
                  className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  aria-label={videoMuted ? 'Unmute' : 'Mute'}
                >
                  {videoMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <div className="flex-1" />
                <button
                  onClick={toggleFullscreen}
                  className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  aria-label="Fullscreen"
                >
                  <Maximize size={16} />
                </button>
              </div>
              {/* Play button overlay saat belum play */}
              {!videoPlaying && (
                <button
                  onClick={toggleVideo}
                  className="absolute inset-0 flex items-center justify-center"
                  aria-label="Putar video"
                >
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                    <Play size={28} className="text-white ml-1" />
                  </div>
                </button>
              )}
            </div>
          ) : material.slides.length > 0 ? (
            // ── PRESENTASI SLIDE (materi hasil AI, tanpa video) ──
            <SlideshowPlayer slides={material.slides} kontrasAktif={kontrasAktif} />
          ) : (
            // ── PLAYER EMOJI (materi tanpa video maupun slide) ──
            <div
              className="glow-tint relative rounded-2xl overflow-hidden shadow-sm"
              style={{
                backgroundColor: material.thumbnail_color + '20',
                minHeight: '180px',
                filter: kontrasAktif ? FILTER_KONTRAS_VIDEO : undefined,
                '--glow-color': material.thumbnail_color,
              } as React.CSSProperties}
              role="region"
              aria-label="Area player materi"
            >
              <div className="flex items-center justify-center h-44 text-6xl">
                {material.thumbnail_emoji}
              </div>

            {/* Play overlay */}
            <div className="absolute inset-0 flex items-end p-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-slate-50 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label={isPlaying ? "Jeda video" : "Putar video"}
                aria-pressed={isPlaying}
              >
                {isPlaying ? <Pause size={20} className="text-blue-800" /> : <Play size={20} className="text-blue-800" />}
              </button>
            </div>
          </div>
          )}

          {/* Audio deskriptif — cuma muncul kalau toggle "Teks ke Suara" global
              aktif, di luar cabang player agar materi bervideo juga
              mendapatkannya saat toggle-nya nyala. */}
          {ttsEnabled && (
            <button
              onClick={handleTTS}
              disabled={!material.transkrip.trim()}
              className={cn(
                "w-full flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-sm shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50",
                isTTSPlaying
                  ? "bg-amber-500 text-white"
                  : "bg-white text-blue-800 border-2 border-blue-100 hover:bg-blue-50"
              )}
              aria-label={isTTSPlaying ? "Hentikan pembacaan teks" : "Putar audio deskriptif"}
              aria-pressed={isTTSPlaying}
            >
              {isTTSPlaying ? <VolumeX size={16} /> : <Volume2 size={16} />}
              {isTTSPlaying ? 'Hentikan' : 'Putar Audio'}
            </button>
          )}

          {/* Teks materi. Bagi tunarungu ia berperan sebagai panel transkrip —
              di sinilah subtitle bertimestamp akan dipasang setelah ada video. */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-900 text-sm">
                  {fitur.panelTranskrip ? '📝 Transkrip Materi' : '📝 Deskripsi Materi'}
                </h2>
                {isTTSPlaying && (
                  <Badge variant="warning" className="text-[10px] animate-pulse">Sedang Dibacakan</Badge>
                )}
              </div>
              <p
                className={cn(
                  'text-sm text-slate-700 leading-relaxed',
                  fitur.panelTranskrip && 'max-h-72 overflow-y-auto pr-1'
                )}
                aria-live="polite"
              >
                {words.map((word, idx) => (
                  <span
                    key={idx}
                    className={cn(
                      "transition-all",
                      highlightedWord === idx ? "tts-word-highlight" : ""
                    )}
                    aria-current={highlightedWord === idx ? "true" : undefined}
                  >
                    {word}{' '}
                  </span>
                ))}
              </p>
            </CardContent>
          </Card>

          {/* Langkah-langkah */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <BookOpen size={15} className="text-blue-700" />
                  Langkah Pembelajaran
                </h2>
                <span className="text-xs text-slate-500">{completedSteps}/{material.langkah.length} selesai</span>
              </div>

              <Progress value={overallProgress} className="h-2 mb-4" />

              <div className="space-y-2">
                {material.langkah.map((langkah, idx) => (
                  <div key={langkah.id} className="border border-slate-100 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedStep(expandedStep === langkah.id ? null : langkah.id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left"
                      aria-expanded={expandedStep === langkah.id}
                      aria-controls={`step-content-${langkah.id}`}
                    >
                      {langkah.selesai ? (
                        <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" aria-hidden="true" />
                      ) : (
                        <Circle size={18} className="text-slate-300 flex-shrink-0" aria-hidden="true" />
                      )}
                      <span className="flex-1 text-sm font-medium text-slate-800">
                        <span className="text-slate-400 mr-1">Langkah {idx + 1}:</span>
                        {langkah.judul}
                      </span>
                      {expandedStep === langkah.id ? (
                        <ChevronUp size={16} className="text-slate-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
                      )}
                    </button>
                    {expandedStep === langkah.id && (
                      <div
                        id={`step-content-${langkah.id}`}
                        className="px-4 pb-3 pt-1 text-sm text-slate-600 leading-relaxed border-t border-slate-50"
                      >
                        {langkah.deskripsi}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href={`/student/quiz/${material.id}`}
              className="flex items-center justify-center gap-2 h-12 bg-blue-800 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Lanjut ke kuis materi ini"
            >
              Lanjut ke Kuis
            </Link>
            <button
              onClick={handleMintaPendamping}
              disabled={tombolAjuan.disabled || mengirimAjuan}
              className="flex items-center justify-center gap-2 h-12 border-2 border-slate-200 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 disabled:hover:bg-transparent"
            >
              <Users size={15} />
              {mengirimAjuan ? 'Mengirim...' : tombolAjuan.label}
            </button>
          </div>

          {/* Keterangan status ajuan — dibaca juga oleh screen reader */}
          {(tombolAjuan.keterangan || errorAjuan) && (
            <p
              className={cn('text-xs text-center', errorAjuan ? 'text-red-600' : 'text-slate-500')}
              aria-live="polite"
            >
              {errorAjuan || tombolAjuan.keterangan}
              {!errorAjuan && ajuan?.status === 'dijadwalkan' && ajuan.jadwal && (
                <> Jadwal: {formatDateShort(ajuan.jadwal)}, pukul{' '}
                  {new Date(ajuan.jadwal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB.
                </>
              )}
            </p>
          )}
        </div>
      </main>

      <StudentBottomNav />
      <AccessibilityBar />
    </div>
  );
}