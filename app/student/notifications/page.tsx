'use client';

import { useState, useEffect } from 'react';
import { Bell, BookOpen, Radio, MessageSquare, CheckCircle, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import StudentBottomNav from '@/components/shared/StudentBottomNav';
import StudentSidebar from '@/components/shared/StudentSidebar';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';
import BackButton from '@/components/shared/BackButton';

interface Notif {
  id: string;
  judul: string;
  isi: string;
  tipe: string;
  dibaca: boolean;
  link: string | null;
  created_at: string;
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'Baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 172800) return 'Kemarin';
  return `${Math.floor(diff / 86400)} hari lalu`;
}

function NotifIcon({ tipe }: { tipe: string }) {
  const map: Record<string, { bg: string; icon: JSX.Element }> = {
    sesi_baru: { bg: 'bg-red-100', icon: <Radio size={16} className="text-red-600" /> },
    materi_baru: { bg: 'bg-blue-100', icon: <BookOpen size={16} className="text-blue-600" /> },
    materi_update: { bg: 'bg-amber-100', icon: <BookOpen size={16} className="text-amber-600" /> },
    jawaban_qa: { bg: 'bg-emerald-100', icon: <MessageSquare size={16} className="text-emerald-600" /> },
    sistem: { bg: 'bg-slate-100', icon: <Bell size={16} className="text-slate-600" /> },
  };
  const item = map[tipe] || map.sistem;
  return (
    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', item.bg)}>
      {item.icon}
    </div>
  );
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'semua' | 'belum'>('semua');

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      setNotifs(data || []);
      setLoading(false);

      // Nama channel unik per-mount: mencegah tabrakan "cannot add callbacks
      // after subscribe()" saat StrictMode menjalankan effect dua kali dan
      // channel bernama sama dipakai ulang dalam keadaan sudah subscribe.
      channel = supabase
        .channel('notif_' + user.id + '_' + Date.now())
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          setNotifs(prev => [payload.new as Notif, ...prev]);
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          setNotifs(prev => prev.map(n => n.id === payload.new.id ? payload.new as Notif : n));
        })
        .subscribe();

      // Bila effect sudah dibersihkan sebelum subscribe selesai (race async),
      // langsung lepas channel yang terlanjur dibuat.
      if (cancelled) { supabase.removeChannel(channel); channel = null; }
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const markRead = async (id: string) => {
    const supabase = createClient();
    await supabase.from('notifications').update({ dibaca: true }).eq('id', id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, dibaca: true } : n));
  };

  const markAllRead = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notifications').update({ dibaca: true }).eq('user_id', user.id).eq('dibaca', false);
    setNotifs(prev => prev.map(n => ({ ...n, dibaca: true })));
  };

  const deleteNotif = async (id: string) => {
    const supabase = createClient();
    // .select() mengembalikan baris yang benar-benar terhapus. Tanpa policy
    // DELETE, RLS menolak diam-diam (200, 0 baris, tanpa error), jadi memeriksa
    // error saja tidak cukup: hanya perbarui state bila ada baris yang hilang.
    const { data } = await supabase.from('notifications').delete().eq('id', id).select();
    if (!data || data.length === 0) return;
    setNotifs(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifs.filter(n => !n.dibaca).length;
  const filtered = filter === 'belum' ? notifs.filter(n => !n.dibaca) : notifs;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <StudentSidebar />
      <main className="flex-1 sm:ml-60 pb-20 sm:pb-4">
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-slate-900 flex items-center gap-2">
            <BackButton href="/student/dashboard" />
            <Bell size={18} className="text-blue-700" />
            Notifikasi
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </h1>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline font-medium">
              Tandai Semua Dibaca
            </button>
          )}
        </div>

        <div className="p-4 max-w-2xl mx-auto space-y-4">
          {/* Filter */}
          <div className="flex gap-2">
            {(['semua', 'belum'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn('px-4 py-2 rounded-full text-xs font-semibold transition-all',
                  filter === f ? 'bg-blue-800 text-white' : 'bg-white text-slate-600 border border-slate-200')}>
                {f === 'semua' ? 'Semua' : `Belum Dibaca (${unreadCount})`}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-blue-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Bell size={36} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">
                {filter === 'belum' ? 'Semua notifikasi sudah dibaca' : 'Belum ada notifikasi'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(n => (
                <div key={n.id}
                  className={cn('bg-white rounded-xl border p-4 flex items-start gap-3 transition-all group',
                    n.dibaca ? 'border-slate-100' : 'border-blue-100 bg-blue-50/30')}>
                  <NotifIcon tipe={n.tipe} />
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { if (!n.dibaca) markRead(n.id); }}>
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-sm font-semibold', n.dibaca ? 'text-slate-700' : 'text-slate-900')}>{n.judul}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{timeAgo(n.created_at)}</span>
                        {!n.dibaca && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.isi}</p>
                    {n.link && (
                      <Link href={n.link} onClick={() => markRead(n.id)}
                        className="text-xs text-blue-600 font-medium mt-1.5 inline-block hover:underline">
                        Lihat →
                      </Link>
                    )}
                  </div>
                  <button onClick={() => deleteNotif(n.id)}
                    className="p-1 text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <StudentBottomNav />
      <AccessibilityBar />
    </div>
  );
}