'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Radio, Clock, Users } from 'lucide-react';
import StudentSidebar from '@/components/shared/StudentSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { cn } from '@/lib/utils/cn';

// ─── Halaman Utama Live Class Murid ──────────────────────────────────────
// Sementara disederhanakan jadi full tampilan LiveKit saja (tanpa panel
// Tanya Jawab/Transkrip custom) — LiveKit sudah punya fitur chat sendiri.
export default function StudentLivePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [availableSessions, setAvailableSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

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
        <main className="flex-1 sm:ml-60 flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="w-9 h-9 border-2 border-blue-300 border-t-blue-700 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Memuat kelas live...</p>
          </div>
        </main>
      </div>
    );
  }

  // ── Belum join sesi manapun: tampilkan daftar sesi live yang tersedia ──
  if (!token || !livekitUrl || !session) {
    return (
      <div className="flex min-h-screen">
        <StudentSidebar />
        <main className="flex-1 sm:ml-60 p-4 max-w-2xl mx-auto w-full">
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
        <div className="hidden sm:flex items-center gap-1.5 text-slate-400 text-xs flex-shrink-0">
          <Clock size={12} />
          {formatElapsed(elapsed)}
        </div>
      </div>

      {/* ── Video stage — full tampilan LiveKit (sementara tanpa panel custom) ── */}
      <div className="flex-1 relative pt-14">
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
          </LiveKitRoom>
        </div>
      </div>
    </div>
  );
}
