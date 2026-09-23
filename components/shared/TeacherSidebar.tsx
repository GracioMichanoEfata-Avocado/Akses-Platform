'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { teacherNavItems, isTeacherNavActive } from '@/lib/constants/teacher-nav';
import { useProfileName } from '@/lib/hooks/useProfileName';
import { cn } from '@/lib/utils/cn';

export default function TeacherSidebar() {
  const pathname = usePathname();
  const nama = useProfileName();

  return (
    <aside
      className="hidden lg:flex flex-col w-60 min-h-screen bg-white border-r border-slate-200 fixed left-0 top-0 z-30"
      aria-label="Sidebar navigasi guru"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
        <div className="w-9 h-9 bg-blue-800 rounded-xl flex items-center justify-center">
          <GraduationCap size={20} className="text-white" />
        </div>
        <div>
          <span className="font-bold text-blue-900 text-lg leading-none">AKSES</span>
          <p className="text-xs text-slate-500 leading-none mt-0.5">Dashboard Guru</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Menu guru">
        {teacherNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = isTeacherNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium group",
                isActive
                  ? "bg-blue-50 text-blue-800"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                size={18}
                className={cn(
                  isActive ? "text-blue-700" : "text-slate-400 group-hover:text-slate-600"
                )}
                aria-hidden="true"
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Teacher info */}
      <div className="px-4 py-4 border-t border-slate-100">
        <div className="bg-emerald-50 rounded-xl p-3">
          <p className="text-xs text-emerald-700 font-medium">Mode Guru</p>
          <p className="text-xs text-slate-500 mt-0.5">{nama || 'Guru'}</p>
        </div>
      </div>
    </aside>
  );
}
