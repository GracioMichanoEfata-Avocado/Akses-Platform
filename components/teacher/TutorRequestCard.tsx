'use client';

import { useState, useEffect, useCallback } from 'react';
import { HandHeart, Check, X, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { formatDateShort } from '@/lib/utils/formatters';

interface AjuanRow {
  id: string;
  created_at: string;
  student_id: string;
  material_id: string;
  profiles: { nama: string } | null;
  materials: { judul: string } | null;
}

export default function TutorRequestCard() {
  const [ajuan, setAjuan] = useState<AjuanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [membuka, setMembuka] = useState<string | null>(null); // id ajuan yg sedang dijadwalkan
  const [tanggal, setTanggal] = useState('');
  const [waktu, setWaktu] = useState('09:00');
  const [memproses, setMemproses] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // RLS sudah menyaring ke ajuan milik guru ini atau yang masih terbuka,
  // jadi query tidak perlu klausa teacher_id.
  // Tanda !student_id wajib: tutor_requests punya dua FK ke profiles.
  const muat = useCallback(async () => {
    const supabase = createClient();
    const { data, error: e } = await supabase
      .from('tutor_requests')
      .select('id, created_at, student_id, material_id, profiles!student_id(nama), materials(judul)')
      .eq('status', 'menunggu')
      .order('created_at', { ascending: false });

    if (e) setError(e.message);
    setAjuan((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { muat(); }, [muat]);

  const kirimNotifikasi = async (row: AjuanRow, judul: string, isi: string) => {
    await fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        judul,
        isi,
        tipe: 'sistem',
        link: `/student/learn/${row.material_id}`,
        targetUserIds: [row.student_id],
      }),
    });
  };

  // teacher_id WAJIB diisi pada kedua aksi: policy update memakai
  // with check (teacher_id = auth.uid()), jadi ajuan terbuka (teacher_id null)
  // hanya bisa diubah bila sekalian diklaim.
  // .eq('status','menunggu') mencegah dua guru saling menimpa.
  const respons = async (row: AjuanRow, setuju: boolean) => {
    if (memproses) return;
    if (setuju && !tanggal) { setError('Isi tanggal terlebih dahulu.'); return; }
    setMemproses(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMemproses(false); return; }

    const jadwal = setuju ? new Date(`${tanggal}T${waktu}:00`).toISOString() : null;

    const { data: terubah, error: e } = await supabase
      .from('tutor_requests')
      .update({
        status: setuju ? 'dijadwalkan' : 'ditolak',
        jadwal,
        teacher_id: user.id,
      })
      .eq('id', row.id)
      .eq('status', 'menunggu')
      .select('id');

    if (e) {
      setError('Gagal memproses ajuan: ' + e.message);
      setMemproses(false);
      return;
    }

    if (!terubah || terubah.length === 0) {
      setError('Ajuan ini sudah direspons guru lain.');
      setMemproses(false);
      await muat();
      return;
    }

    const materi = row.materials?.judul || 'materi';

    // Sesi dibuat SETELAH ajuan diperbarui: klausa .eq('status','menunggu')
    // di atas yang mencegah dua guru merespons bersamaan. tutor_request_id
    // unik, jadi persetujuan yang terkirim dua kali tidak membuat dua ruang.
    if (setuju) {
      const { error: eSesi } = await supabase.from('live_sessions').insert({
        judul: `Pendampingan: ${materi}`,
        guru_id: user.id,
        mata_pelajaran: 'Pendampingan',
        tanggal,
        waktu: `${waktu}:00`,
        durasi: 60,
        status: 'scheduled',
        topik: `Sesi pendampingan privat untuk ${row.profiles?.nama || 'siswa'}`,
        mode: 'both',
        room_name: `privat-${crypto.randomUUID().slice(0, 12)}`,
        tipe: 'privat',
        student_id: row.student_id,
        tutor_request_id: row.id,
      });

      // Jadwal sudah tersimpan; kegagalan ini harus terlihat, bukan disembunyikan.
      if (eSesi) {
        setError(
          'Jadwal tersimpan, tetapi ruang video gagal dibuat: ' + eSesi.message
        );
        setMemproses(false);
        await muat();
        return;
      }
    }
    await kirimNotifikasi(
      row,
      setuju ? 'Ajuan Pendampingan Disetujui' : 'Ajuan Pendampingan Ditolak',
      setuju
        ? `Guru menyetujui pendampingan untuk materi "${materi}" pada ${formatDateShort(jadwal!)} pukul ${waktu} WIB.`
        : `Guru belum bisa mendampingi materi "${materi}". Kamu boleh mengajukan lagi.`
    );

    setMembuka(null);
    setTanggal('');
    setMemproses(false);
    await muat();
  };

  if (loading || ajuan.length === 0) return null;

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5">
        <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2 mb-3">
          <HandHeart size={15} className="text-amber-600" />
          Ajuan Pendampingan
          <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-full">
            {ajuan.length}
          </span>
        </h2>

        {error && (
          <p className="text-xs text-red-600 mb-3" role="alert">{error}</p>
        )}

        <div className="space-y-2">
          {ajuan.map(row => (
            <div key={row.id} className="border border-slate-100 rounded-xl p-3">
              <p className="text-sm font-medium text-slate-800">
                {row.profiles?.nama || 'Siswa'}
              </p>
              <p className="text-xs text-slate-500 mb-2">
                {row.materials?.judul || 'Materi'} · {formatDateShort(row.created_at)}
              </p>

              {membuka === row.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={tanggal}
                      onChange={e => setTanggal(e.target.value)}
                      aria-label="Tanggal sesi pendampingan"
                      className="h-9 px-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <input
                      type="time"
                      value={waktu}
                      onChange={e => setWaktu(e.target.value)}
                      aria-label="Jam sesi pendampingan"
                      className="h-9 px-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => respons(row, true)}
                      disabled={memproses}
                      className="flex-1 h-9 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-600 disabled:opacity-60 flex items-center justify-center gap-1.5"
                    >
                      <Calendar size={13} /> {memproses ? 'Menyimpan...' : 'Konfirmasi Jadwal'}
                    </button>
                    <button
                      onClick={() => { setMembuka(null); setError(null); }}
                      className="px-3 h-9 border border-slate-200 text-slate-600 rounded-lg text-xs"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setMembuka(row.id); setError(null); }}
                    className="flex-1 h-9 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-600 flex items-center justify-center gap-1.5"
                  >
                    <Check size={13} /> Setujui
                  </button>
                  <button
                    onClick={() => respons(row, false)}
                    disabled={memproses}
                    className="flex-1 h-9 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    <X size={13} /> Tolak
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
