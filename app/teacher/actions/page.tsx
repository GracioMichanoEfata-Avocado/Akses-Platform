'use client';

import { useState, useEffect } from 'react';
import { Radio, Clock, PhoneOff, Mic, MicOff, FileText } from 'lucide-react';
import TeacherSidebar from '@/components/shared/TeacherSidebar';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
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

// ─── Panel Transkrip/Subtitle real-time (harus di dalam LiveKitRoom karena
// pakai useDataChannel). Guru dikte lewat mic; teks dikirim ke siswa via
// data channel 'caption' dan disimpan ke session_transcripts. ────────────
function CaptionPanel({ sessionId }: { sessionId: string }) {
  const { send } = useDataChannel('caption');
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

      if (result.isFinal) {
        await supabase.from('session_transcripts').insert({ session_id: sessionId, isi: text });
        setHistory((prev) => [...prev, text]);
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
    <div className="fixed top-14 bottom-0 right-0 w-full sm:w-80 bg-white border-l border-slate-200 z-30 flex flex-col shadow-2xl">
      <div className="p-4 border-b border-slate-100 flex-shrink-0">
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
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <FileText size={28} className="text-slate-300 mb-2" />
            <p className="text-xs text-slate-400">Transkrip akan muncul di sini setelah caption dimulai.</p>
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

// ─── Halaman Utama Live Class Guru ────────────────────────────────────────
// Video full tampilan LiveKit + panel transkrip/subtitle tersendiri (bukan
// Tanya Jawab — itu sudah ditangani chat bawaan LiveKit).
export default function TeacherLivePage() {
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [teacherName, setTeacherName] = useState('Pendamping');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase.from('profiles').select('nama').eq('id', user.id).single();
      setTeacherName(profile?.nama || 'Pendamping');

      const { data: liveSession } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('guru_id', user.id)
        .eq('status', 'live')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (liveSession) {
        setSession(liveSession);
        setSessionStarted(true);
        await getToken(liveSession);
      }
      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [token]);

  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
      : `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const getToken = async (sess: any) => {
    const res = await fetch('/api/livekit-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName: sess.room_name }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setToken(data.token);
    setLivekitUrl(data.livekitUrl);
  };

  const startSession = async (sess: any) => {
    const supabase = createClient();
    await supabase.from('live_sessions').update({ status: 'live' }).eq('id', sess.id);
    setSession({ ...sess, status: 'live' });
    setSessionStarted(true);
    setElapsed(0);
    await getToken(sess);
  };

  const endSession = async () => {
    if (!session) return;
    if (!confirm('Akhiri sesi live ini? Semua siswa akan terputus dari kelas.')) return;
    const supabase = createClient();
    await supabase.from('live_sessions').update({ status: 'ended' }).eq('id', session.id);
    setToken(null);
    setSessionStarted(false);
    setSession(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <TeacherSidebar />
        <main className="flex-1 sm:ml-60 flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="w-9 h-9 border-2 border-emerald-300 border-t-emerald-700 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Memuat sesi...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!sessionStarted || !token) {
    return <SessionSelector teacherName={teacherName} onStart={startSession} error={error} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* ── Header meeting ── */}
      <div className="fixed top-0 left-0 right-0 z-40 h-14 bg-slate-900/95 backdrop-blur-sm border-b border-white/5 flex items-center justify-between px-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 bg-red-600 px-2.5 py-1 rounded-md flex-shrink-0">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            <span className="text-white text-[11px] font-bold tracking-wide">LIVE</span>
          </div>
          <span className="text-white text-sm font-medium truncate">{session?.judul}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 text-slate-400 text-xs">
            <Clock size={12} />
            {formatElapsed(elapsed)}
          </div>
          <button
            onClick={endSession}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors"
          >
            <PhoneOff size={13} />
            Akhiri Sesi
          </button>
        </div>
      </div>

      {/* ── Video stage — ruang kanan disisakan untuk panel transkrip ── */}
      <div className="flex-1 relative pt-14 sm:mr-80">
        <div className="absolute inset-0 top-14">
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
            {/* CaptionPanel HARUS di dalam LiveKitRoom karena pakai useDataChannel */}
            <CaptionPanel sessionId={session.id} />
          </LiveKitRoom>
        </div>
      </div>
    </div>
  );
}

// ─── Pilih sesi yang mau di-live-kan ────────────────────────────────────
function SessionSelector({ teacherName, onStart, error }: {
  teacherName: string;
  onStart: (sess: any) => void;
  error: string | null;
}) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [starting, setStarting] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('live_sessions')
        .select('*')
        .eq('guru_id', user.id)
        .eq('status', 'scheduled')
        .order('tanggal', { ascending: true })
        .then(({ data }) => setSessions(data || []));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen">
      <TeacherSidebar />
      <main className="flex-1 sm:ml-60 p-4 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900 mb-1">Kelas Live</h1>
          <p className="text-sm text-slate-500">Pilih sesi yang ingin dimulai, {teacherName}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 mb-4">{error}</div>
        )}

        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-slate-500 text-sm">Belum ada sesi terjadwal.</p>
            <p className="text-slate-400 text-xs mt-1">Buat sesi baru lewat menu &quot;Buat Sesi&quot;.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((sess) => (
              <Card key={sess.id} className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{sess.judul}</p>
                    <p className="text-xs text-slate-500">{sess.tanggal} • {sess.waktu} WIB • {sess.durasi} menit</p>
                    <p className="text-xs text-blue-600 mt-0.5">{sess.mata_pelajaran}</p>
                  </div>
                  <button
                    onClick={async () => { setStarting(sess.id); await onStart(sess); setStarting(null); }}
                    disabled={starting === sess.id}
                    className="flex items-center gap-2 bg-emerald-700 text-white text-sm px-4 py-2 rounded-xl hover:bg-emerald-800 disabled:opacity-50 flex-shrink-0"
                  >
                    <Radio size={14} />
                    {starting === sess.id ? 'Memulai...' : 'Mulai Live'}
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <AccessibilityBar />
    </div>
  );
}
