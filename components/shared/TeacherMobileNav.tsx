'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, GraduationCap } from 'lucide-react';
import { teacherNavItems, isTeacherNavActive } from '@/lib/constants/teacher-nav';
import { useProfileName } from '@/lib/hooks/useProfileName';
import { cn } from '@/lib/utils/cn';

// Navigasi guru untuk layar di bawah `lg`, di mana <TeacherSidebar /> disembunyikan.
// Dipasang sebagai anak pertama di dalam header sticky tiap halaman guru:
// tombolnya ikut mengalir di header, sedangkan drawer-nya dirender lewat portal
// ke <body>.
//
// Portal itu WAJIB, bukan pilihan gaya: header halaman guru memakai
// `backdrop-blur-sm`, dan `backdrop-filter` membuat elemen jadi containing block
// baru untuk anak `position: fixed` — drawer yang bersarang di dalamnya akan
// menempel ke header, bukan ke viewport. Portal juga melepaskan drawer dari
// stacking context header (`z-20`) supaya bisa menimpa sidebar & konten.
export default function TeacherMobileNav() {
  const pathname = usePathname();
  const nama = useProfileName();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Tutup drawer begitu pindah halaman, supaya tidak menghalangi halaman tujuan.
  useEffect(() => setIsOpen(false), [pathname]);

  // Layar melebar ke >= lg (rotasi HP/tablet, resize window) sementara drawer
  // terbuka: drawer ikut `lg:hidden` jadi hilang dari layar, tapi state-nya
  // masih terbuka dan kunci scroll di <body> ikut tertinggal — halaman jadi
  // terkunci tanpa ada UI untuk melepasnya. Jadi paksa tutup di titik itu.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => {
      if (mq.matches) setIsOpen(false);
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Escape untuk menutup + kunci scroll latar selama drawer terbuka.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="lg:hidden p-1.5 -ml-1.5 rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 flex-shrink-0"
        aria-label="Buka menu navigasi guru"
        aria-expanded={isOpen}
      >
        <Menu size={20} />
      </button>

      {mounted && isOpen && createPortal(
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-50 bg-slate-900/50"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div
            className="fixed left-0 top-0 bottom-0 z-50 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col animate-slide-in"
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi guru"
          >
            {/* Logo + tutup */}
            <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
              <div className="w-9 h-9 bg-blue-800 rounded-xl flex items-center justify-center flex-shrink-0">
                <GraduationCap size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-blue-900 text-lg leading-none">AKSES</span>
                <p className="text-xs text-slate-500 leading-none mt-0.5">Dashboard Guru</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 flex-shrink-0"
                aria-label="Tutup menu navigasi"
              >
                <X size={18} />
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Menu guru">
              {teacherNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = isTeacherNavActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-medium',
                      isActive
                        ? 'bg-blue-50 text-blue-800'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon
                      size={18}
                      className={isActive ? 'text-blue-700' : 'text-slate-400'}
                      aria-hidden="true"
                    />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Info guru */}
            <div className="px-4 py-4 border-t border-slate-100">
              <div className="bg-emerald-50 rounded-xl p-3">
                <p className="text-xs text-emerald-700 font-medium">Mode Guru</p>
                <p className="text-xs text-slate-500 mt-0.5">{nama || 'Guru'}</p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
