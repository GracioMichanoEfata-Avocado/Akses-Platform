'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, MessageSquare, Send, Check, Mic, MicOff, Video, VideoOff, Radio } from 'lucide-react';
import TeacherSidebar from '@/components/shared/TeacherSidebar';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useDataChannel,
  useRoomContext,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { cn } from '@/lib/utils/cn';

// ─── Tombol kirim caption (subtitle real-time ke murid) ──────────────────
function CaptionSender({ sessionId }: { sessionId: string }) {
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

      // Kirim ke murid lewat data channel LiveKit
      send(new TextEncoder().encode(text), { reliable: true });
      setCaption(text);

      // Kalau final, simpan juga ke database
      if (result.isFinal) {
        await supabase.from('session_transcripts').insert({
          session_id: sessionId,
          isi: text,
        });
      }
    };

    rec.onend = () => {
      if (isListening) rec.start(); // auto restart
    };

    setRecognition(rec);
  }, [sessionId]);

  const toggleListening = () => {
    if (!recognition) {
      alert('Browser lo tidak mendukung Speech Recognition. Coba pakai Chrome.');
      return;
    }
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          onClick={toggleListening}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
            isListening
              ? 'bg-red-100 text-red-700 border-2 border-red-300 animate-pulse'
              : 'bg-blue-50 text-blue-700 border-2 border-blue-200 hover:bg-blue-100'
          )}
        >
          <Mic size={14} />
          {isListening ? 'Stop Caption' : 'Mulai Caption Otomatis'}
        </button>
        {isListening && <span className="text-xs text-red-500">● Merekam suara...</span>}
      </div>
      {caption && (
        <div className="bg-slate-50 rounded-lg p-2 text-xs text-slate-600 border border-slate-200">
          <span className="text-slate-400 mr-1">Caption terkirim:</span>{caption}
        </div>
      )}
    </div>
  );
}

// ─── Panel Q&A Guru ───────────────────────────────────────────────────────
function QAPanel({ sessionId }: { sessionId: string }) {
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
        event: '*',
        schema: 'public',
        table: 'session_questions',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          // Fetch lengkap dengan profil siswa
          supabase
            .from('session_questions')
            .select('*, profiles(nama, avatar, avatar_color)')
            .eq('id', payload.new.id)
            .single()
            .then(({ data }) => {
              if (data) setQuestions(prev => [...prev, data]);
            });
        } else if (payload.eventType === 'UPDATE') {
          setQuestions(prev => prev.map(q => q.id === payload.new.id ? { ...q, ...payload.new } : q));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const handleAnswer = async (questionId: string) => {
    const answer = answers[questionId];
    if (!answer?.trim()) return;
    setSending(prev => ({ ...prev, [questionId]: true }));

    await supabase
      .from('session_questions')
      .update({ terjawab: true, jawaban: answer.trim() })
      .eq('id', questionId);

    setSending(prev => ({ ...prev, [questionId]: false }));
    setAnswers(prev => ({ ...prev, [questionId]: '' }));
  };

  const unanswered = questions.filter(q => !q.terjawab);
  const answered = questions.filter(q => q.terjawab);

  return (
    <div className="space-y-3 overflow-y-auto max-h-80">
      {unanswered.length === 0 && answered.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-4">Belum ada pertanyaan dari siswa</p>
      )}
      {unanswered.map((q) => (
        <div key={q.id} className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
              style={{ backgroundColor: q.profiles?.avatar_color || '#1E40AF' }}
            >
              {q.profiles?.avatar || '?'}
            </div>
            <span className="text-xs font-medium text-slate-700">{q.profiles?.nama || 'Siswa'}</span>
            <span className="text-[10px] text-slate-400 ml-auto">baru</span>
          </div>
          <p className="text-sm text-slate-800 mb-2">{q.pertanyaan}</p>
          <div className="flex gap-2">
            <input
              value={answers[q.id] || ''}
              onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
              placeholder="Tulis jawaban..."
              className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
              onKeyDown={e => e.key === 'Enter' && handleAnswer(q.id)}
            />
            <button
              onClick={() => handleAnswer(q.id)}
              disabled={!answers[q.id]?.trim() || sending[q.id]}
              className="px-3 py-1.5 bg-blue-700 text-white text-xs rounded-lg disabled:opacity-40 flex items-center gap-1"
            >
              <Check size={12} /> Jawab
            </button>
          </div>
        </div>
      ))}
      {answered.map((q) => (
        <div key={q.id} className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 opacity-70">
          <p className="text-xs text-slate-600 mb-1">{q.pertanyaan}</p>
          <p className="text-xs text-emerald-700">✓ {q.jawaban}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Halaman Utama Live Class Guru ────────────────────────────────────────
export default function TeacherLivePage() {
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [teacherName, setTeacherName] = useState('Pendamping');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Belum login'); setLoading(false); return; }

      const { data: profile } = await supabase
        .from('profiles').select('nama').eq('id', user.id).single();
      setTeacherName(profile?.nama || 'Pendamping');

      // Cari sesi live milik guru ini
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
        await getToken(liveSession, profile?.nama || 'Pendamping');
      }

      setLoading(false);
    }

    init();
  }, []);

  const getToken = async (sess: any, name: string) => {
    const res = await fetch('/api/livekit-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName: sess.room_name,
        participantName: name,
        isTeacher: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setToken(data.token);
    setLivekitUrl(data.livekitUrl);
  };

  const startSession = async (sess: any) => {
    const supabase = createClient();
    await supabase
      .from('live_sessions')
      .update({ status: 'live' })
      .eq('id', sess.id);
    setSession({ ...sess, status: 'live' });
    setSessionStarted(true);
    await getToken(sess, teacherName);
  };

  const endSession = async () => {
    if (!session) return;
    const supabase = createClient();
    await supabase
      .from('live_sessions')
      .update({ status: 'ended' })
      .eq('id', session.id);
    setToken(null);
    setSessionStarted(false);
    setSession(null);
    alert('Sesi live telah diakhiri.');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <TeacherSidebar />
        <main className="flex-1 sm:ml-60 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-emerald-300 border-t-emerald-700 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Memuat sesi...</p>
          </div>
        </main>
      </div>
    );
  }

  // Belum ada sesi live — tampilkan daftar sesi terjadwal
  if (!sessionStarted || !token) {
    return <SessionSelector
      teacherName={teacherName}
      onStart={startSession}
      error={error}
    />;
  }

  return (
    <div className="flex min-h-screen bg-slate-900">
      <TeacherSidebar />
      <main className="flex-1 sm:ml-60 flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="live" className="text-xs animate-pulse">● LIVE</Badge>
            <span className="text-white text-sm font-medium truncate max-w-[200px]">{session?.judul}</span>
          </div>
          <button
            onClick={endSession}
            className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700"
          >
            Akhiri Sesi
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Video */}
          <div className="flex-1 relative">
            <LiveKitRoom
              token={token}
              serverUrl={livekitUrl!}
              connect={true}
              audio={true}
              video={true}
            >
              <VideoConference />
              <RoomAudioRenderer />
              {/* Caption sender — guru bicara, subtitle terkirim ke murid */}
              <div className="absolute bottom-20 left-4 right-4 z-20">
                <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm">
                  <CardContent className="p-3">
                    <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                      <Zap size={12} className="text-yellow-500" />
                      Caption Otomatis (dikirim ke murid)
                    </p>
                    <CaptionSender sessionId={session.id} />
                  </CardContent>
                </Card>
              </div>
            </LiveKitRoom>
          </div>

          {/* Panel Q&A */}
          <div className="w-72 bg-white border-l border-slate-200 p-4 flex flex-col">
            <h3 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
              <MessageSquare size={14} className="text-blue-700" />
              Pertanyaan Siswa
            </h3>
            <QAPanel sessionId={session.id} />
          </div>
        </div>
      </main>
      <AccessibilityBar />
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
            <p className="text-slate-400 text-xs mt-1">Buat sesi baru lewat menu "Buat Sesi".</p>
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
                    onClick={async () => {
                      setStarting(sess.id);
                      await onStart(sess);
                      setStarting(null);
                    }}
                    disabled={starting === sess.id}
                    className="flex items-center gap-2 bg-emerald-700 text-white text-sm px-4 py-2 rounded-xl hover:bg-emerald-800 disabled:opacity-50"
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