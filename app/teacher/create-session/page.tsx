'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Calendar, Clock, Check, AlertCircle } from 'lucide-react';
import TeacherSidebar from '@/components/shared/TeacherSidebar';
import AccessibilityBar from '@/components/accessibility/AccessibilityBar';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';
import BackButton from '@/components/shared/BackButton';
import { MATA_PELAJARAN } from '@/lib/constants/subjects';

export default function CreateSessionPage() {
  const router = useRouter();
  const [judul, setJudul] = useState('');
  const [mapel, setMapel] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [waktu, setWaktu] = useState('09:00');
  const [durasi, setDurasi] = useState('60');
  const [topik, setTopik] = useState('');
  const [subtitle, setSubtitle] = useState(true);
  const [audioDeskriptif, setAudioDeskriptif] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teacherNama, setTeacherNama] = useState('Pendamping');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('nama').eq('id', user.id).single()
          .then(({ data }) => { if (data) setTeacherNama(data.nama); });
      }
    });
  }, []);

  const handleSave = async () => {
    if (!judul.trim()) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Belum login'); setSaving(false); return; }

    // Buat room_name unik dari judul + timestamp
    const roomName = 'room-' + judul.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 30) + '-' + Date.now().toString().slice(-6);

    const { error: dbError } = await supabase.from('live_sessions').insert({
      judul: judul.trim(),
      guru_id: user.id,
      mata_pelajaran: mapel || 'Umum',
      tanggal,
      waktu: waktu + ':00',
      durasi: parseInt(durasi) || 60,
      status: 'scheduled',
      topik: topik.trim() || null,
      mode: subtitle && audioDeskriptif ? 'both' : audioDeskriptif ? 'audio' : 'visual',
      room_name: roomName,
    });

    if (dbError) {
      setError('Gagal menyimpan sesi: ' + dbError.message);
      setSaving(false);
      return;
    }

    // Kirim notifikasi ke semua siswa
    await fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        judul: 'Sesi Live Baru Dijadwalkan!',
        isi: `${teacherNama} menjadwalkan kelas "${judul.trim()}" pada ${tanggal} pukul ${waktu} WIB.`,
        tipe: 'sesi_baru',
        link: '/student/live',
      }),
    });

    setSaved(true);
    setTimeout(() => router.push('/teacher/dashboard'), 1500);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <TeacherSidebar />

      <main id="main-content" className="flex-1 sm:ml-60 pb-4">
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3">
          <h1 className="font-bold text-slate-900 flex items-center gap-2">
            <BackButton href="/teacher/dashboard" />
            <PlusCircle size={18} className="text-blue-700" />
            Buat Sesi Ajar
          </h1>
        </div>

        <div className="p-4 max-w-lg mx-auto space-y-4">
          {saved ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-emerald-700 mb-2">Sesi Berhasil Dijadwalkan!</h2>
              <p className="text-slate-500 text-sm">Mengalihkan ke dashboard...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle size={15} className="shrink-0" />
                  {error}
                </div>
              )}

              {/* Detail Sesi */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <h2 className="font-semibold text-slate-900">Detail Sesi</h2>

                  <div>
                    <label htmlFor="judul" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Judul Sesi <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="judul"
                      type="text"
                      value={judul}
                      onChange={e => setJudul(e.target.value)}
                      placeholder="Contoh: Kelas Live Ekosistem Laut"
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="mapel" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Mata Pelajaran
                    </label>
                    <select
                      id="mapel"
                      value={mapel}
                      onChange={e => setMapel(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Pilih mata pelajaran</option>
                      {MATA_PELAJARAN.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="topik" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Topik / Deskripsi Singkat
                    </label>
                    <input
                      id="topik"
                      type="text"
                      value={topik}
                      onChange={e => setTopik(e.target.value)}
                      placeholder="Contoh: Membahas rantai makanan di laut dalam"
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="tanggal" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Tanggal
                      </label>
                      <input
                        id="tanggal"
                        type="date"
                        value={tanggal}
                        onChange={e => setTanggal(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="waktu" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Waktu
                      </label>
                      <input
                        id="waktu"
                        type="time"
                        value={waktu}
                        onChange={e => setWaktu(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="durasi" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Durasi (menit)
                    </label>
                    <select
                      id="durasi"
                      value={durasi}
                      onChange={e => setDurasi(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="30">30 menit</option>
                      <option value="45">45 menit</option>
                      <option value="60">60 menit</option>
                      <option value="90">90 menit</option>
                      <option value="120">120 menit</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* Fitur Aksesibilitas */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <h2 className="font-semibold text-slate-900">Fitur Aksesibilitas</h2>
                  {[
                    { label: 'Aktifkan Subtitle Otomatis', desc: 'Caption real-time dari suara guru untuk siswa tunarungu', value: subtitle, set: setSubtitle, icon: '📝' },
                    { label: 'Aktifkan Audio Deskriptif', desc: 'Narasi audio untuk konten visual (siswa tunanetra)', value: audioDeskriptif, set: setAudioDeskriptif, icon: '🔊' },
                  ].map(f => (
                    <div key={f.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg" aria-hidden="true">{f.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-slate-700">{f.label}</p>
                          <p className="text-xs text-slate-500">{f.desc}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => f.set(!f.value)}
                        className={cn(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                          f.value ? 'bg-blue-600' : 'bg-slate-200'
                        )}
                        role="switch"
                        aria-checked={f.value}
                      >
                        <span className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow',
                          f.value ? 'translate-x-6' : 'translate-x-1'
                        )} />
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => router.back()}
                  className="h-12 border-2 border-slate-200 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={!judul.trim() || saving}
                  className="h-12 bg-blue-800 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Menyimpan...</>
                  ) : (
                    <><Check size={15} /> Simpan & Jadwalkan</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
      <AccessibilityBar />
    </div>
  );
}