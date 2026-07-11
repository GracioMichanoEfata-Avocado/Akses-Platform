import { describe, it, expect } from 'vitest';
import { resolveRedirect } from './route-guard';

describe('resolveRedirect — rute publik', () => {
  it('membiarkan rute di luar /student dan /teacher', () => {
    expect(resolveRedirect('/', 'teacher')).toBeNull();
    expect(resolveRedirect('/login', 'student')).toBeNull();
    expect(resolveRedirect('/api/tutor-request', 'student')).toBeNull();
  });

  it('membiarkan halaman login walau sudah punya sesi peran lain', () => {
    // Guru harus bisa membuka /student/login untuk berganti akun.
    expect(resolveRedirect('/student/login', 'teacher')).toBeNull();
    expect(resolveRedirect('/teacher/login', 'student')).toBeNull();
  });
});

describe('resolveRedirect — peran cocok', () => {
  it('siswa bebas di rute siswa', () => {
    expect(resolveRedirect('/student/dashboard', 'student')).toBeNull();
    expect(resolveRedirect('/student/quiz/abc', 'student')).toBeNull();
  });

  it('guru bebas di rute guru', () => {
    expect(resolveRedirect('/teacher/dashboard', 'teacher')).toBeNull();
    expect(resolveRedirect('/teacher/students/xyz', 'teacher')).toBeNull();
  });
});

describe('resolveRedirect — peran silang', () => {
  it('guru di rute siswa dipulangkan ke dashboard guru', () => {
    expect(resolveRedirect('/student/dashboard', 'teacher')).toBe('/teacher/dashboard');
    expect(resolveRedirect('/student/learn/abc', 'teacher')).toBe('/teacher/dashboard');
  });

  it('siswa di rute guru dipulangkan ke dashboard siswa', () => {
    expect(resolveRedirect('/teacher/dashboard', 'student')).toBe('/student/dashboard');
    expect(resolveRedirect('/teacher/report', 'student')).toBe('/student/dashboard');
  });
});

describe('resolveRedirect — peran tidak diketahui', () => {
  it('mengarahkan ke pemilihan peran, bukan meloloskan', () => {
    expect(resolveRedirect('/student/dashboard', null)).toBe('/login');
    expect(resolveRedirect('/teacher/dashboard', undefined)).toBe('/login');
    expect(resolveRedirect('/student/dashboard', 'admin')).toBe('/login');
  });

  it('tidak mengunci rute publik meski perannya tak diketahui', () => {
    // Kalau /login ikut dialihkan ke /login, terjadi loop tak berujung.
    expect(resolveRedirect('/login', null)).toBeNull();
    expect(resolveRedirect('/', null)).toBeNull();
    expect(resolveRedirect('/student/login', null)).toBeNull();
  });
});
