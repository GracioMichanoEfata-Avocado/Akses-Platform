'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Send, Check, Mic, MicOff, Radio, ArrowLeft, Clock, Users, FileText, PhoneOff } from 'lucide-react';
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

// ─── Tab Q&A Guru ─────────────────────────────────────────────────────────
function QATab({ sessionId }: { sessionId: string }) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from('session_questions')
      .select('*, profiles(nama, avatar, avatar_color)')
      .eq('session_id', sessionId)
      .order('waktu', { ascending: true })
      .then(({ data }) => setQuestions(data || []));

    const channel = supabase
      .channel('teacher_qa_' + sessionId)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'session_questions', filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          supabase.from('session_questions').select('*, profiles(nama, avatar, avatar_color)')
            .eq('id', payload.new.id).single()
            .then(({ data }) => { if (data) setQuestions(prev => [...prev, data]); });
        } else if (payload.eventType === 'UPDATE') {
          setQuestions(prev => prev.map(q => q.id === payload.new.id ? { ...q, ...payload.new } : q));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleAnswer = async (questionId: string) => {
    const answer = answers[questionId];
    if (!answer?.trim()) return;
    setSending(prev => ({ ...prev, [questionId]: true }));
    await supabase.from('session_questions').update({ terjawab: true, jawaban: answer.trim() }).eq('id', questionId);
    setSending(prev => ({ ...prev, [questionId]: false }));
    setAnswers(prev => ({ ...prev, [questionId]: '' }));
  };

  const unanswered = questions.filter(q => !q.terjawab);
  const answered = questions.filter(q => q.terjawab);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
      {unanswered.length === 0 && answered.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          <MessageSquare size={28} className="text-slate-300 mb-2" />
          <p className="text-xs text-slate-400">Belum ada pertanyaan dari siswa</p>
        </div>
      )}
      {unanswered.map((q) => (
        <div key={q.id} className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
              style={{ backgroundColor: q.profiles?.avatar_color || '#1E40AF' }}>
              {q.profiles?.avatar || '?'}
            </div>
            <span className="text-xs font-medium text-slate-700">{q.profiles?.nama || 'Siswa'}</span>
          </div>
          <p className="text-sm text-slate-800 mb-2">{q.pertanyaan}</p>
          <div className="flex gap-2">
            <input
              value={answers[q.id] || ''}
              onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
              placeholder="Tulis jawaban..."
              className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              onKeyDown={e => e.key === 'Enter' && handleAnswer(q.id)}
            />
            <button
              onClick={() => handleAnswer(q.id)}
              disabled={!answers[q.id]?.trim() || sending[q.id]}
              className="px-3 py-2 bg-blue-700 text-white text-xs rounded-lg disabled:opacity-40 flex items-center gap-1 hover:bg-blue-800 transition-colors flex-shrink-0"
            >
              <Check size={12} /> Jawab
            </button>
          </div>
        </div>
      ))}
      {answered.map((q) => (
        <div key={q.id} className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 opacity-75">
          <p className="text-xs text-slate-600 mb-1.5">{q.pertanyaan}</p>
          <p className="text-xs text-emerald-700 pt-1.5 border-t border-emerald-200">✓ {q.jawaban}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Halaman Utama Live Class Guru ────────────────────────────────────────
export default function TeacherLivePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [teacherName, setTeacherName] = useState('Pendamping');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<'caption' | 'qa'>('caption');
  const [showSidebar, setShowSidebar] = useState(true);
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
            onClick={() => setShowSidebar(v => !v)}
            className={cn(
              'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors',
              showSidebar ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'
            )}
          >
            <Users size={13} />
            <span className="hidden sm:inline">Panel</span>
          </button>
          <button
            onClick={endSession}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors"
          >
            <PhoneOff size={13} />
            Akhiri Sesi
          </button>
        </div>
      </div>

      {/* ── Video stage + CaptionTab (harus di dalam LiveKitRoom) ── */}
      <div className={cn("flex-1 relative pt-14 transition-all duration-200", showSidebar ? "sm:mr-80" : "")}>
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
            {/* CaptionTab HARUS di dalam LiveKitRoom karena pakai useDataChannel */}
            {showSidebar && activeTab === 'caption' && (
              <div className="fixed top-[calc(3.5rem+48px)] bottom-0 right-0 w-full sm:w-80 flex flex-col z-20">
                <CaptionTab sessionId={session.id} />
              </div>
            )}
          </LiveKitRoom>
        </div>
      </div>

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