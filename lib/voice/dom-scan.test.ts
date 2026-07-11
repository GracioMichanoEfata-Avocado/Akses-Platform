// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { scanClickables } from './dom-scan';

function setBody(html: string) {
  document.body.innerHTML = html;
  return document.body;
}

beforeEach(() => { document.body.innerHTML = ''; });

describe('scanClickables', () => {
  it('mengambil label dari teks tombol dan href link', () => {
    const root = setBody(`
      <button>Keluar</button>
      <a href="/x">Edit Profil</a>
    `);
    const cmds = scanClickables(root);
    expect(cmds.map(c => c.label)).toEqual(['Keluar', 'Edit Profil']);
  });

  it('memprioritaskan aria-label di atas teks', () => {
    const root = setBody(`<button aria-label="Tutup dialog">X</button>`);
    expect(scanClickables(root)[0].label).toBe('Tutup dialog');
  });

  it('membuang emoji/simbol di tepi teks', () => {
    const root = setBody(`<a href="/e">✏️ Edit Profil</a>`);
    expect(scanClickables(root)[0].label).toBe('Edit Profil');
  });

  it('melewati elemen disabled, aria-hidden, dan di dalam data-voice-ignore', () => {
    const root = setBody(`
      <button disabled>Simpan</button>
      <button aria-hidden="true">Sembunyi</button>
      <div data-voice-ignore><button>Mic</button></div>
      <button>Bergabung</button>
    `);
    expect(scanClickables(root).map(c => c.label)).toEqual(['Bergabung']);
  });

  it('melewati elemen tanpa nama', () => {
    const root = setBody(`<button></button><button>Lanjut</button>`);
    expect(scanClickables(root).map(c => c.label)).toEqual(['Lanjut']);
  });

  it('men-dedup label sama (case-insensitive), ambil pertama', () => {
    const root = setBody(`<button>Hapus</button><button>hapus</button>`);
    const cmds = scanClickables(root);
    expect(cmds).toHaveLength(1);
    expect(cmds[0].label).toBe('Hapus');
  });

  it('label satu kata pendek memakai matchType word', () => {
    const root = setBody(`<button>Ya</button><button>Edit Profil</button>`);
    const cmds = scanClickables(root);
    expect(cmds.find(c => c.label === 'Ya')!.matchType).toBe('word');
    expect(cmds.find(c => c.label === 'Edit Profil')!.matchType).toBe('includes');
  });

  it('keywords berisi nama penuh dan kata >2 huruf', () => {
    const root = setBody(`<button>Edit Profil</button>`);
    expect(scanClickables(root)[0].keywords).toEqual(['edit profil', 'edit', 'profil']);
  });

  it('mencakup role=button dan role=tab', () => {
    const root = setBody(`
      <div role="button">Putar</div>
      <div role="tab">Aksesibilitas</div>
    `);
    expect(scanClickables(root).map(c => c.label)).toEqual(['Putar', 'Aksesibilitas']);
  });
});
