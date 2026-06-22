'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Radio, Send, Mic, MicOff, VideoOff, Video, Users, Subtitles } from 'lucide-react';
import StudentBottomNav from '@/components/shared/StudentBottomNav';
import StudentSidebar from '@/components/shared/StudentSidebar';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAccessibilityStore } from '@/lib/store/accessibility-store';
import { createClient } from '@/lib/supabase/client';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useRoomContext,
  useParticipants,
  useDataChannel,
} from '@livekit/components-react';
import '@livekit/components-styles';

// ─── Komponen Caption Real-Time (dikirim guru lewat data channel) ─────────
function LiveCaption() {
  const [caption, setCaption] = useState('');
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useDataChannel('caption', (msg) => {
    const text = new TextDecoder().decode(msg.payload);
    setCaption(text);
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 5000);
  });

  if (!visible || !caption) return null;

  return (
    <div className="absolute bottom-16 left-0 right-0 flex justify-center px-4 z-30 pointer-events-none">
      <div className="bg-black/80 text-white text-sm rounded-xl px-4 py-2 max-w-md text-center leading-relaxed">
        {caption}
      </div>
    </div>
  );
}

// ─── Komponen Pertanyaan Real-Time ────────────────────────────────────────
function QuestionPanel({ sessionId, studentName }: { sessionId: string; studentName: string }) {
  const [question, setQuestion] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // Load pertanyaan yang sudah ada
    supabase
      .from('session_questions')
      .select('*')
      .eq('session_id', sessionId)
      .order('waktu', { ascending: true })
      .then(({ data }) => setQuestions(data || []));

    // Subscribe perubahan real-time
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
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-3">
        {questions.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">Belum ada pertanyaan</p>
        )}
        {questions.map((q) => (
          <div key={q.id} className={`rounded-xl p-3 text-xs ${q.terjawab ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'}`}>
            <p className="font-medium text-slate-700 mb-1">{q.pertanyaan}</p>
            {q.terjawab && q.jawaban && (
              <p className="text-emerald-700 mt-1">💬 {q.jawaban}</p>
            )}
            <span className={`text-[10px] ${q.terjawab ? 'text-emerald-500' : 'text-slate-400'}`}>
              {q.terjawab ? '✓ Terjawab' : 'Menunggu jawaban...'}
            </span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Tulis pertanyaan..."
          className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button
          type="submit"
          disabled={!question.trim() || sending}
          className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center disabled:opacity-40 flex-shrink-0"
        >
          <Send size={13} className="text-white" />
        </button>
      </form>
    </div>
  );
}

// ─── Halaman Utama Live Class Murid ──────────────────────────────────────
export default function StudentLivePage() {
  const { subtitleEnabled } = useAccessibilityStore();
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [studentName, setStudentName] = useState('Siswa');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQuestions, setShowQuestions] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      // Ambil profil siswa
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Belum login'); setLoading(false); return; }

      const { data: profile } = await supabase
        .from('profiles').select('nama').eq('id', user.id).single();
      setStudentName(profile?.nama || 'Siswa');

      // Cari sesi yang sedang live
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

      // Minta token LiveKit ke API route
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

      // Catat siswa sebagai peserta
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

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <StudentSidebar />
        <main className="flex-1 sm:ml-60 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-700 rounded-full animate-spin mx-auto mb-3" />
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
        <main className="flex-1 sm:ml-60 flex items-center justify-center p-4">
          <div className="text-center max-w-sm">
            <div className="text-4xl mb-3">📡</div>
            <h2 className="font-bold text-slate-800 mb-2">Tidak Ada Kelas Live</h2>
            <p className="text-slate-500 text-sm">{error || 'Guru belum memulai kelas live.'}</p>
          </div>
        </main>
        <StudentBottomNav />
        <AccessibilityBar />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-900">
      <StudentSidebar />

      <main className="flex-1 sm:ml-60 flex flex-col pb-16 sm:pb-0">
        {/* Header */}
        <div className="bg-slate-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="live" className="text-xs animate-pulse">● LIVE</Badge>
            <span className="text-white text-sm font-medium truncate max-w-[200px]">{session.judul}</span>
          </div>
          <button
            onClick={() => setShowQuestions(v => !v)}
            className="text-slate-300 text-xs flex items-center gap-1 hover:text-white"
          >
            <Users size={14} />
            <span className="hidden sm:inline">Pertanyaan</span>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Video Area */}
          <div className="flex-1 relative">
            <LiveKitRoom
              token={token}
              serverUrl={livekitUrl}
              connect={true}
              audio={true}
              video={false}
              onDisconnected={() => setError('Koneksi terputus dari kelas.')}
            >
              <VideoConference />
              <RoomAudioRenderer />
              {subtitleEnabled && <LiveCaption />}
            </LiveKitRoom>
          </div>

          {/* Panel Pertanyaan */}
          {showQuestions && (
            <div className="w-72 bg-white border-l border-slate-200 p-4 flex flex-col">
              <h3 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <Users size={14} className="text-blue-700" />
                Tanya Jawab
              </h3>
              <QuestionPanel sessionId={session.id} studentName={studentName} />
            </div>
          )}
        </div>
      </main>

      <StudentBottomNav />
      <AccessibilityBar />
    </div>
  );
}