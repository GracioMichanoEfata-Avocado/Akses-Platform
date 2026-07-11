import { describe, it, expect } from 'vitest';
import { extractJson } from './extract-json';

describe('extractJson', () => {
  it('mem-parse JSON murni', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('membuang pagar markdown ```json', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('membuang pagar ``` tanpa label', () => {
    expect(extractJson('```\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('mengabaikan kalimat pengantar sebelum objek', () => {
    expect(extractJson('Berikut hasilnya:\n{"a":1}')).toEqual({ a: 1 });
  });

  it('mengabaikan prosa setelah objek', () => {
    expect(extractJson('{"a":1}\n\nSemoga membantu!')).toEqual({ a: 1 });
  });

  it('menangani objek bersarang dan kurung di dalam string', () => {
    const obj = { judul: 'a}b', nested: { x: [1, 2] } };
    expect(extractJson('```json' + JSON.stringify(obj) + '```')).toEqual(obj);
  });

  it('melempar pada respons kosong', () => {
    expect(() => extractJson('')).toThrow();
    expect(() => extractJson('   ')).toThrow();
  });

  it('melempar bila tidak ada objek JSON', () => {
    expect(() => extractJson('maaf, saya tidak bisa membantu')).toThrow();
  });

  it('melempar pada JSON terpotong (batas token), bukan menelan diam-diam', () => {
    expect(() => extractJson('{"a":1,"b":')).toThrow();
  });
});
