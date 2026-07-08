// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { extractMainContent } from './content-read';

beforeEach(() => { document.body.innerHTML = ''; });

describe('extractMainContent', () => {
  it('membaca teks di dalam <main> saja', () => {
    document.body.innerHTML = `
      <nav>Menu Beranda</nav>
      <main>
        <h1>Fotosintesis</h1>
        <p>Tumbuhan membuat makanan dari cahaya.</p>
      </main>
    `;
    const teks = extractMainContent(document.body);
    expect(teks).toContain('Fotosintesis');
    expect(teks).toContain('Tumbuhan membuat makanan dari cahaya.');
    expect(teks).not.toContain('Menu Beranda');
  });

  it('melewati tombol, nav, aside, sr-only, dan aria-hidden', () => {
    document.body.innerHTML = `
      <main>
        <p>Isi materi.</p>
        <button>Simpan</button>
        <aside>Sidebar info</aside>
        <span class="sr-only">Khusus screen reader</span>
        <span aria-hidden="true">Ikon dekоratif</span>
      </main>
    `;
    const teks = extractMainContent(document.body);
    expect(teks).toContain('Isi materi.');
    expect(teks).not.toContain('Simpan');
    expect(teks).not.toContain('Sidebar info');
    expect(teks).not.toContain('screen reader');
  });

  it('menggabung beberapa blok dengan pemisah titik', () => {
    document.body.innerHTML = `<main><h1>Judul</h1><p>Paragraf.</p></main>`;
    expect(extractMainContent(document.body)).toBe('Judul. Paragraf.');
  });

  it('fallback ke root bila tidak ada <main>', () => {
    document.body.innerHTML = `<div><p>Tanpa main.</p></div>`;
    expect(extractMainContent(document.body)).toContain('Tanpa main.');
  });

  it('mengembalikan string kosong bila tidak ada konten teks', () => {
    document.body.innerHTML = `<main><button>Klik</button></main>`;
    expect(extractMainContent(document.body)).toBe('');
  });

  it('menggabung teks inline dalam satu blok tanpa titik sisipan', () => {
    document.body.innerHTML = `<main><p>Jawaban yang <b>benar</b> adalah B.</p></main>`;
    expect(extractMainContent(document.body)).toBe('Jawaban yang benar adalah B.');
  });

  it('melewati elemen dengan atribut hidden', () => {
    document.body.innerHTML = `<main><p>Isi.</p><div hidden>Rahasia</div></main>`;
    const teks = extractMainContent(document.body);
    expect(teks).toContain('Isi.');
    expect(teks).not.toContain('Rahasia');
  });

  it('melewati elemen di dalam data-voice-ignore', () => {
    document.body.innerHTML = `<main><p>Ada.</p><div data-voice-ignore>Kontrol suara</div></main>`;
    const teks = extractMainContent(document.body);
    expect(teks).toContain('Ada.');
    expect(teks).not.toContain('Kontrol suara');
  });
});
