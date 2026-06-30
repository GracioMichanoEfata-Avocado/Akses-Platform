'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Users, Volume2, VolumeX, FileText, MessageSquare, ArrowLeft, Radio, Clock } from 'lucide-react';
import StudentSidebar from '@/components/shared/StudentSidebar';
import { useAccessibilityStore } from '@/lib/store/accessibility-store';
import { createClient } from '@/lib/supabase/client';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useDataChannel,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { cn } from '@/lib/utils/cn';

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

// ─── Panel Tanya Jawab (tab tersendiri di sidebar) ───────────────────────
function QuestionTab({ sessionId }: { sessionId: string }) {
  const [question, setQuestion] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from('session_questions')
      .select('*')
      .eq('session_id', sessionId)
      .order('waktu', { ascending: true })
      .then(({ data }) => setQuestions(data || []));

    const channel = supabase
      .channel('session_questions_' + sessionId)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_questions',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setQuestions(prev => [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setQuestions(prev => prev.map(q => q.id === payload.new.id ? payload.new : q));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || sending) return;
    setSending(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('session_questions').insert({
      session_id: sessionId,
      student_id: user.id,
      pertanyaan: question.trim(),
    });

    setQuestion('');
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {questions.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <MessageSquare size={28} className="text-slate-300 mb-2" />
            <p className="text-xs text-slate-400">Belum ada pertanyaan. Tulis pertanyaanmu di bawah!</p>
          </div>
        )}
        {questions.map((q) => (
          <div key={q.id} className={cn(
            "rounded-xl p-3 text-xs",
            q.terjawab ? "bg-emerald-50 border border-emerald-200" : "bg-slate-50 border border-slate-200"
          )}>
            <p className="font-medium text-slate-700 mb-1">{q.pertanyaan}</p>
            {q.terjawab && q.jawaban && (
              <p className="text-emerald-700 mt-1.5 pt-1.5 border-t border-emerald-200">💬 {q.jawaban}</p>
            )}
            <span className={cn("text-[10px] block mt-1.5", q.terjawab ? "text-emerald-500" : "text-slate-400")}>
              {q.terjawab ? '✓ Terjawab' : '⏳ Menunggu jawaban...'}
            </span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} className="flex gap-2 p-3 border-t border-slate-100 bg-white">
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Tulis pertanyaan..."
          className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button
          type="submit"
          disabled={!question.trim() || sending}
          className="w-9 h-9 bg-blue-700 rounded-xl flex items-center justify-center disabled:opacity-40 flex-shrink-0 hover:bg-blue-800 transition-colors"
        >
          <Send size={14} className="text-white" />
        </button>
      </form>
    </div>
  );
}

// ─── Halaman Utama Live Class Murid ──────────────────────────────────────
export default function StudentLivePage() {
  const router = useRouter();
  const { subtitleEnabled, ttsRate } = useAccessibilityStore();
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'transcript' | 'qa'>('transcript');
  const [showSidebar, setShowSidebar] = useState(true);
  const [ttsLive, setTtsLive] = useState(false);
  const [captions, setCaptions] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Belum login'); setLoading(false); return; }

      const { data: profile } = await supabase
        .from('profiles').select('nama').eq('id', user.id).single();

      const { data: liveSession } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('status', 'live')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!liveSession) {
        setError('Tidak ada kelas live yang sedang berlangsung saat ini.');
        setLoading(false);
        return;
      }

      setSession(liveSession);

      const res = await fetch('/api/livekit-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: liveSession.room_name,
          participantName: profile?.nama || 'Siswa',
          isTeacher: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Gagal masuk ke kelas'); setLoading(false); return; }

      await supabase.from('session_participants').upsert({
        session_id: liveSession.id,
        student_id: user.id,
      });

      setToken(data.token);
      setLivekitUrl(data.livekitUrl);
      setLoading(false);
    }

    init();
  }, []);

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

  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
      : `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleNewCaption = useCallback((text: string) => {
    if (text.length > 8) {
      setCaptions(prev => (prev[prev.length - 1] === text ? prev : [...prev, text]));
    }
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <StudentSidebar />
        <main className="flex-1 sm:ml-60 flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="w-9 h-9 border-2 border-blue-300 border-t-blue-700 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Menghubungkan ke kelas...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !token || !livekitUrl || !session) {
    return (
      <div className="flex min-h-screen">
        <StudentSidebar />
        <main className="flex-1 sm:ml-60 flex items-center justify-center p-4 bg-slate-50">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Radio size={28} className="text-slate-400" />
            </div>
            <h2 className="font-bold text-slate-800 mb-2">Tidak Ada Kelas Live</h2>
            <p className="text-slate-500 text-sm">{error || 'Pendamping belum memulai kelas live.'}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* ── Header meeting ── */}
      <div className="fixed top-0 left-0 right-0 z-40 h-14 bg-slate-900/95 backdrop-blur-sm border-b border-white/5 flex items-center justify-between px-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push('/student/dashboard')}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 flex-shrink-0"
            aria-label="Kembali"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-1.5 bg-red-600 px-2.5 py-1 rounded-md flex-shrink-0">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            <span className="text-white text-[11px] font-bold tracking-wide">LIVE</span>
          </div>
          <span className="text-white text-sm font-medium truncate">{session.judul}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 text-slate-400 text-xs">
            <Clock size={12} />
            {formatElapsed(elapsed)}
          </div>
          <button
            onClick={() => setTtsLive(v => !v)}
            className={cn(
              'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors',
              ttsLive ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'
            )}
            title="Bacakan caption otomatis"
          >
            {ttsLive ? <Volume2 size={13} /> : <VolumeX size={13} />}
            <span className="hidden sm:inline">TTS</span>
          </button>
          <button
            onClick={() => setShowSidebar(v => !v)}
            className={cn(
              'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors',
              showSidebar ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'
            )}
          >
            <Users size={13} />
            <span className="hidden sm:inline">Panel</span>
          </button>
        </div>
      </div>

      {/* ── Video stage ── */}
      <div className={cn(
        "flex-1 relative pt-14 transition-all duration-200",
        showSidebar ? "sm:mr-80" : ""
      )}>
        <div className="absolute inset-0 top-14">
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
        </div>
      </div>

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
    </div>
  );
}