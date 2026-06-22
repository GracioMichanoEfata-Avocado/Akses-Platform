'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Radio, User, Bell } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const navItems = [
  { href: '/student/dashboard', label: 'Beranda', icon: Home },
  { href: '/student/learn', label: 'Belajar', icon: BookOpen },
  { href: '/student/live', label: 'Live', icon: Radio },
  { href: '/student/notifications', label: 'Notifikasi', icon: Bell },
  { href: '/student/profile', label: 'Profil', icon: User },
];

export default function StudentBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 sm:hidden"
      aria-label="Navigasi bawah siswa"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-0",
                isActive
                  ? "text-blue-700"
                  : "text-slate-400 hover:text-slate-600"
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-colors",
                isActive ? "bg-blue-50" : ""
              )}>
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  aria-hidden="true"
                />
              </div>
              <span className={cn(
                "text-[10px] font-medium truncate",
                isActive ? "text-blue-700" : "text-slate-400"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
