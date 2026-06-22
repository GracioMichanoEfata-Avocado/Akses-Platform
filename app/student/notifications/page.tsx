'use client';

import { useState } from 'react';
import { Bell, BookOpen, Radio, MessageSquare, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import StudentBottomNav from '@/components/shared/StudentBottomNav';
import StudentSidebar from '@/components/shared/StudentSidebar';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

const notifications = [
  {
    id: 'n1',
    type: 'live',
    title: 'Kelas Live Dimulai!',
    message: 'Bu Sari Dewi telah memulai kelas Biologi: Interaksi Real-Time Ekosistem Laut',
    time: '5 menit lalu',
    read: false,
    link: '/student/live',
  },
  {
    id: 'n2',
    type: 'quiz',
    title: 'Kuis Tersedia',
    message: 'Kuis baru untuk materi "Tata Surya: Mengenal Planet-Planet" telah tersedia',
    time: '1 jam lalu',
    read: false,
    link: '/student/quiz/m2',
  },
  {
    id: 'n3',
    type: 'message',
    title: 'Pesan dari Bu Sari',
    message: 'Jangan lupa kerjakan latihan soal ekosistem ya! Nilai minimum 70 untuk lulus modul ini.',
    time: '2 jam lalu',
    read: false,
    link: '/student/learn/m1',
  },
  {
    id: 'n4',
    type: 'material',
    title: 'Materi Baru Ditambahkan',
    message: 'Pak Budi Hartono menambahkan materi baru: "Kimia: Reaksi Asam dan Basa"',
    time: 'Kemarin',
    read: true,
    link: '/student/learn/m7',
  },
  {
    id: 'n5',
    type: 'quiz',
    title: 'Hasil Kuis Tersedia',
    message: 'Kamu mendapatkan nilai 80/100 pada kuis Ekosistem Laut. Selamat!',
    time: 'Kemarin',
    read: true,
    link: '/student/quiz/m1',
  },
  {
    id: 'n6',
    type: 'message',
    title: 'Pengumuman Kelas',
    message: 'Jadwal kelas live Matematika diubah ke Selasa, 6 Mei 2026 pukul 10:00 WIB',
    time: '2 hari lalu',
    read: true,
    link: '/student/live',
  },
  {
    id: 'n7',
    type: 'material',
    title: 'Materi Perlu Diulang',
    message: 'Berdasarkan hasil kuis, disarankan mengulang materi "Fisika: Siklus Air"',
    time: '3 hari lalu',
    read: true,
    link: '/student/learn/m5',
  },
];

const typeConfig: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  live: { icon: Radio, color: 'text-red-600', bg: 'bg-red-100' },
  quiz: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  message: { icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-100' },
  material: { icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-100' },
};

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState(notifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = notifs.filter(n => !n.read).length;
  const displayed = filter === 'unread' ? notifs.filter(n => !n.read) : notifs;

  const markAllRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <StudentSidebar />

      <main id="main-content" className="flex-1 sm:ml-60 pb-20 sm:pb-4">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center gap-3">
          <Link href="/student/dashboard" className="text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 sm:hidden" aria-label="Kembali">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 flex items-center gap-2">
            <Bell size={18} className="text-blue-700" />
            <h1 className="font-bold text-slate-900">Notifikasi</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-blue-600 font-medium hover:underline"
              aria-label="Tandai semua notifikasi sebagai sudah dibaca"
            >
              Tandai Semua Dibaca
            </button>
          )}
        </div>

        <div className="p-4 max-w-2xl mx-auto space-y-4">
          {/* Filter */}
          <div className="flex gap-2" role="group" aria-label="Filter notifikasi">
            {(['all', 'unread'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-semibold border transition-all",
                  filter === f
                    ? "bg-blue-800 text-white border-blue-800"
                    : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                )}
                aria-pressed={filter === f}
              >
                {f === 'all' ? 'Semua' : `Belum Dibaca (${unreadCount})`}
              </button>
            ))}
          </div>

          {/* Notifications */}
          {displayed.length === 0 ? (
            <div className="text-center py-12">
              <Bell size={36} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Tidak ada notifikasi</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayed.map((notif) => {
                const config = typeConfig[notif.type];
                const Icon = config.icon;
                return (
                  <Link
                    key={notif.id}
                    href={notif.link}
                    onClick={() => markRead(notif.id)}
                    className="block"
                  >
                    <Card className={cn(
                      "border-0 shadow-sm hover:shadow-md transition-all card-hover cursor-pointer",
                      !notif.read && "ring-1 ring-blue-200 bg-blue-50/50"
                    )}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", config.bg)}>
                            <Icon size={18} className={config.color} aria-hidden="true" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={cn(
                                "text-sm font-semibold text-slate-900 leading-tight",
                                !notif.read && "text-blue-900"
                              )}>
                                {notif.title}
                              </p>
                              <span className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5">{notif.time}</span>
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{notif.message}</p>
                          </div>
                          {!notif.read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" aria-label="Belum dibaca" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <StudentBottomNav />
      <AccessibilityBar />
    </div>
  );
}
