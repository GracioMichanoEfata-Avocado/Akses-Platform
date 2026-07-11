import { describe, it, expect } from 'vitest';
import { describeRequestState, resolveTeacherId } from './request-state';

describe('describeRequestState', () => {
  it('belum pernah mengajukan: tombol aktif, tanpa keterangan', () => {
    const t = describeRequestState(null);
    expect(t.label).toBe('Minta Pendamping');
    expect(t.disabled).toBe(false);
    expect(t.keterangan).toBe('');
  });

  it('menunggu: tombol nonaktif', () => {
    const t = describeRequestState({ status: 'menunggu', jadwal: null });
    expect(t.label).toBe('Menunggu Persetujuan');
    expect(t.disabled).toBe(true);
    expect(t.keterangan).not.toBe('');
  });

  it('dijadwalkan: tombol nonaktif', () => {
    const t = describeRequestState({ status: 'dijadwalkan', jadwal: '2026-07-12T09:00:00Z' });
    expect(t.label).toBe('Sesi Dijadwalkan');
    expect(t.disabled).toBe(true);
    expect(t.keterangan).not.toBe('');
  });

  it('ditolak: boleh mengajukan ulang', () => {
    const t = describeRequestState({ status: 'ditolak', jadwal: null });
    expect(t.label).toBe('Ajukan Ulang');
    expect(t.disabled).toBe(false);
    expect(t.keterangan).not.toBe('');
  });

  it('hanya keadaan awal yang keterangannya kosong', () => {
    const berketerangan = (['menunggu', 'dijadwalkan', 'ditolak'] as const).map(status =>
      describeRequestState({ status, jadwal: status === 'dijadwalkan' ? '2026-07-12T09:00:00Z' : null })
    );
    expect(berketerangan.every(t => t.keterangan.length > 0)).toBe(true);
  });

  it('status tak dikenal diperlakukan seperti belum mengajukan', () => {
    // Jaring pengaman: status baru di database tidak boleh membuat tombol
    // hilang atau macet nonaktif tanpa jalan keluar.
    const t = describeRequestState({ status: 'entah' as any, jadwal: null });
    expect(t.disabled).toBe(false);
  });
});

describe('resolveTeacherId', () => {
  it('memakai pembuat materi bila ia memang guru', () => {
    expect(resolveTeacherId('guru-1', 'teacher')).toBe('guru-1');
  });

  it('materi tanpa pembuat menghasilkan ajuan terbuka', () => {
    expect(resolveTeacherId(null, null)).toBeNull();
    expect(resolveTeacherId(undefined, undefined)).toBeNull();
  });

  it('pembuat yang ternyata siswa menghasilkan ajuan terbuka', () => {
    // Data nyata: sebagian materials.created_by menunjuk ke akun siswa.
    // Menyalinnya ke teacher_id membuat ajuan tak terlihat oleh guru.
    expect(resolveTeacherId('siswa-1', 'student')).toBeNull();
  });

  it('peran tak dikenal diperlakukan sebagai bukan guru', () => {
    expect(resolveTeacherId('entah-1', 'admin')).toBeNull();
    expect(resolveTeacherId('entah-2', null)).toBeNull();
  });
});
