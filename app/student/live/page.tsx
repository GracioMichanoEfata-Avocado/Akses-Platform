'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Radio, Clock, Users, FileText, Contrast, X } from 'lucide-react';
import StudentSidebar from '@/components/shared/StudentSidebar';
import StudentBottomNav from '@/components/shared/StudentBottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useDataChannel,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { cn } from '@/lib/utils/cn';
import NoiseFilterSetup from '@/components/live/NoiseFilterSetup';
import { useAccessibilityStore } from '@/lib/store/accessibility-store';
import { FILTER_KONTRAS_VIDEO } from '@/lib/accessibility/material-features';

// Audio lebih jernih untuk yang mendengarkan (mis. siswa tunanetra): kurangi
// gema & suara latar, dan seimbangkan volume otomatis. Noise-cancellation
// Krisp yang lebih kuat dipasang lewat <NoiseFilterSetup /> di bawah.
const AUDIO_CAPTURE_OPTIONS = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

// ─── Cuma menerima data channel, TIDAK merender UI apapun. Harus di dalam
// <LiveKitRoom> karena pakai useDataChannel, tapi diteruskan ke state induk
// lewat callback supaya panel visualnya bisa dirender DI LUAR area yang
// diberi filter CSS — filter pada elemen jadi containing block baru untuk
// anak `position: fixed`, yang merusak posisi panel kalau tetap bersarang
// di dalam elemen yang difilter. ─────────────────────────────────────────
function CaptionReceiver({ onCaption }: { onCaption: (text: string, isFinal: boolean) => void }) {
  useDataChannel('caption', (msg) => {
    const raw = new TextDecoder().decode(msg.payload);
    try {
      const { text, isFinal } = JSON.parse(raw);
      if (typeof text === 'string' && text.trim().length > 0) onCaption(text, !!isFinal);
    } catch {
      // Payload tak terduga — abaikan daripada merusak transkrip.
    }
  });
  return null;
}

// ─── Panel Transkrip/Subtitle real-time — dirender di luar area video yang
// difilter, selalu tampil supaya siswa tunarungu bisa mengikuti ucapan guru
// secara real-time. Baris final tersimpan permanen di `captions`; `liveCaption`
// cuma pratinjau kalimat yang masih berjalan (tumbuh kata demi kata), supaya
// tetap terasa real-time tanpa membuat satu baris transkrip per kata. ─────
function TranscriptPanel({
  captions,
  liveCaption,
  open,
  onClose,
}: {
  captions: string[];
  liveCaption: string;
  open: boolean;
  onClose: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [captions, liveCaption]);

  return (
    // Di bawah `sm` panel ini selebar layar penuh, jadi kalau selalu tampil ia
    // menutupi seluruh video BESERTA kontrol LiveKit (mute/keluar) — siswa jadi
    // terkunci di dalam kelas. Karena itu di HP panel digeser keluar layar
    // sampai dibuka lewat tombol "Transkrip" di header. Dari `md` ke atas panel
    // punya kolom sendiri (`md:mr-80` pada video stage) sehingga selalu tampil.
    // `invisible` (bukan cuma translate) dipakai supaya saat tertutup panel
    // benar-benar keluar dari urutan tab & pembacaan screen reader.
    <div
      className={cn(
        'fixed top-14 bottom-0 right-0 w-full md:w-80 bg-white border-l border-slate-200 z-30 flex flex-col shadow-2xl transition-transform duration-200 md:transition-none',
        open ? 'translate-x-0' : 'translate-x-full invisible md:translate-x-0 md:visible'
      )}
      aria-label="Transkrip live"
    >
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-100 flex-shrink-0 text-xs font-semibold text-blue-700">
        <FileText size={13} /> Transkrip Live
        <button
          onClick={onClose}
          className="md:hidden ml-auto p-1 -mr-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          aria-label="Tutup transkrip"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {captions.length === 0 && !liveCaption ? (
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
            {liveCaption && (
              <div className="flex gap-2.5 text-xs text-slate-400 italic leading-relaxed pb-2.5">
                <span className="text-slate-300 flex-shrink-0 font-mono mt-0.5">
                  <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                </span>
                <span>{liveCaption}</span>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  );
}

// ─── Halaman Utama Live Class Murid ──────────────────────────────────────
export default function StudentLivePage() {
  const router = useRouter();
  const { highContrast } = useAccessibilityStore();
  // Filter kontras video di live ikut menyala kalau toggle "Kontras Tinggi"
  // global aktif — tombol di header tetap bisa dipakai murid untuk
  // mematikan/menyalakan filter ini khusus untuk sesi live saja (sama
  // seperti tombol "Filter Kontras" di halaman video materi).
  const [kontrasAktif, setKontrasAktif] = useState(highContrast);
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [availableSessions, setAvailableSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [captions, setCaptions] = useState<string[]>([]);
  const [liveCaption, setLiveCaption] = useState('');
  // Hanya berpengaruh di bawah `md`; dari `md` ke atas panel transkrip selalu
  // tampil di kolomnya sendiri. Lihat <TranscriptPanel />.
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const handleCaption = useCallback((text: string, isFinal: boolean) => {
    if (!isFinal) {
      setLiveCaption(text);
      return;
    }
    setLiveCaption('');
    setCaptions((prev) => (prev[prev.length - 1] === text ? prev : [...prev, text]));
  }, []);

  // Daftar sesi live yang bisa diikuti (bukan langsung auto-join) —
  // biar murid pilih dulu sesi mana yang mau dibuka.
  useEffect(() => {
    const supabase = createClient();

    async function loadSessions() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Belum login'); setLoading(false); return; }

      const { data: sesiPrivat } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('status', 'live')
        .eq('tipe', 'privat')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      const { data: sesiKelas } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('status', 'live')
        .eq('tipe', 'kelas')
        .order('created_at', { ascending: false });

      setAvailableSessions([...(sesiPrivat || []), ...(sesiKelas || [])]);
      setLoading(false);
    }

    loadSessions();
  }, []);

  const handleJoin = async (liveSession: any) => {
    setJoining(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Belum login'); setJoining(false); return; }

      const res = await fetch('/api/livekit-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName: liveSession.room_name }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Gagal masuk ke kelas'); setJoining(false); return; }

      await supabase.from('session_participants').upsert({
        session_id: liveSession.id,
        student_id: user.id,
      });

      setSession(liveSession);
      setToken(data.token);
      setLivekitUrl(data.livekitUrl);
    } finally {
      setJoining(false);
    }
  };

  // Listener real-time: deteksi sesi diakhiri guru
  useEffect(() => {
    if (!session?.id) return;
    const supabase = createClient();
    const channel = supabase
      .channel('live_session_status_' + session.id)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'live_sessions', filter: `id=eq.${session.id}`,
      }, (payload) => {
        if (payload.new.status === 'ended') {
          setToken(null);
          setLivekitUrl(null);
          setSession(null);
          setError('Sesi live telah diakhiri oleh pendamping.');
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.id]);

  // Timer durasi sejak join
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [token]);

  // Escape menutup panel transkrip di HP, supaya kontrol kelas cepat terjangkau lagi.
  useEffect(() => {
    if (!transcriptOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTranscriptOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [transcriptOpen]);

  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
      : `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <StudentSidebar />
        <main className="flex-1 lg:ml-60 pb-20 lg:pb-0 flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="w-9 h-9 border-2 border-blue-300 border-t-blue-700 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Memuat kelas live...</p>
          </div>
        </main>
        <StudentBottomNav />
      </div>
    );
  }

  // ── Belum join sesi manapun: tampilkan daftar sesi live yang tersedia ──
  if (!token || !livekitUrl || !session) {
    return (
      <div className="flex min-h-screen">
        <StudentSidebar />
        <main id="main-content" className="flex-1 lg:ml-60 p-4 pb-20 lg:pb-4 max-w-2xl mx-auto w-full">
          {/* Sengaja tanpa tombol back: navigasi di layar ini sudah dipegang
              <StudentBottomNav /> di bawah lg dan sidebar di lg ke atas, sama
              seperti halaman siswa lainnya. */}
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900 mb-1">Kelas Live</h1>
            <p className="text-sm text-slate-500">Pilih sesi live yang ingin diikuti</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 mb-4">{error}</div>
          )}

          {availableSessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Radio size={28} className="text-slate-400" />
              </div>
              <h2 className="font-bold text-slate-800 mb-2">Tidak Ada Kelas Live</h2>
              <p className="text-slate-500 text-sm">Pendamping belum memulai kelas live saat ini.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableSessions.map((sess) => (
                <Card key={sess.id} className="border-0 shadow-sm">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-11 h-11 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Radio size={18} className="text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                          sess.tipe === 'privat' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                        )}>
                          {sess.tipe === 'privat' ? 'PRIVAT' : 'KELAS'}
                        </span>
                        <div className="flex items-center gap-1 bg-red-600 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
                          <span className="text-white text-[9px] font-bold">LIVE</span>
                        </div>
                      </div>
                      <p className="font-semibold text-slate-800 truncate">{sess.judul}</p>
                      <p className="text-xs text-slate-500">{sess.mata_pelajaran}</p>
                    </div>
                    <button
                      onClick={() => handleJoin(sess)}
                      disabled={joining}
                      className="flex items-center gap-2 bg-blue-800 text-white text-sm px-4 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex-shrink-0"
                    >
                      <Users size={14} />
                      {joining ? 'Masuk...' : 'Gabung'}
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
        {/* Sengaja hanya di layar pilih sesi, TIDAK di dalam ruang meeting —
            di sana bottom nav akan menimpa kontrol mic/kamera/keluar LiveKit. */}
        <StudentBottomNav />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* ── Header meeting ── */}
      <div className="fixed top-0 left-0 right-0 z-40 h-14 bg-slate-900/95 backdrop-blur-sm border-b border-white/5 flex items-center justify-between px-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Diberi latar + label supaya terbaca sebagai tombol. Versi lama
              cuma panah 16px `text-slate-400` di atas latar hampir hitam —
              nyaris tak terlihat, padahal ini satu-satunya jalan keluar siswa
              dari kelas (guru punya tombol "Akhiri Sesi" yang mencolok). */}
          <button
            onClick={() => router.push('/student/dashboard')}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white px-2.5 py-1.5 rounded-lg transition-colors flex-shrink-0"
            aria-label="Keluar dari kelas live"
          >
            <ArrowLeft size={16} />
            <span className="text-xs font-semibold hidden min-[380px]:inline">Keluar</span>
          </button>
          <div className="flex items-center gap-1.5 bg-red-600 px-2.5 py-1 rounded-md flex-shrink-0">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            <span className="text-white text-[11px] font-bold tracking-wide">LIVE</span>
          </div>
          <span className="text-white text-sm font-medium truncate">{session.judul}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setTranscriptOpen((v) => !v)}
            className={cn(
              'md:hidden relative flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors',
              transcriptOpen ? 'bg-white text-slate-900' : 'bg-white/5 text-slate-300 hover:bg-white/10'
            )}
            aria-expanded={transcriptOpen}
            aria-label={transcriptOpen ? 'Tutup transkrip live' : 'Buka transkrip live'}
          >
            <FileText size={13} />
            {/* Penanda ada transkrip baru selagi panel tertutup. */}
            {!transcriptOpen && (captions.length > 0 || liveCaption) && (
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-blue-400 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setKontrasAktif((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors',
              kontrasAktif ? 'bg-white text-slate-900' : 'bg-white/5 text-slate-300 hover:bg-white/10'
            )}
            aria-pressed={kontrasAktif}
            title="Filter Kontras video live"
          >
            <Contrast size={13} />
            <span className="hidden md:inline">Kontras</span>
          </button>
          <div className="hidden md:flex items-center gap-1.5 text-slate-400 text-xs">
            <Clock size={12} />
            {formatElapsed(elapsed)}
          </div>
        </div>
      </div>

      {/* ── Video stage — full tampilan LiveKit, ruang kanan disisakan untuk
          panel transkrip/subtitle ── */}
      <div
        className="flex-1 relative pt-14 md:mr-80"
        style={{ filter: kontrasAktif ? FILTER_KONTRAS_VIDEO : undefined }}
      >
        <div className="absolute inset-0 top-14">
          <LiveKitRoom
            token={token}
            serverUrl={livekitUrl}
            connect={true}
            audio={AUDIO_CAPTURE_OPTIONS}
            video={false}
            data-lk-theme="default"
            onDisconnected={() => setError('Koneksi terputus dari kelas.')}
            className="h-full"
          >
            <VideoConference />
            <RoomAudioRenderer />
            <NoiseFilterSetup />
            {/* CaptionReceiver HARUS di dalam LiveKitRoom karena pakai useDataChannel */}
            <CaptionReceiver onCaption={handleCaption} />
          </LiveKitRoom>
        </div>
      </div>

      {/* Panel transkrip dirender DI LUAR div yang difilter, supaya
          `position: fixed`-nya tidak rusak (filter CSS membuat elemen jadi
          containing block baru untuk anak fixed). */}
      <TranscriptPanel
        captions={captions}
        liveCaption={liveCaption}
        open={transcriptOpen}
        onClose={() => setTranscriptOpen(false)}
      />
    </div>
  );
}
