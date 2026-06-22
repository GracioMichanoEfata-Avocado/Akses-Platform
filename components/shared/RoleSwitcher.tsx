'use client';

import { useRouter } from 'next/navigation';
import { useRoleStore } from '@/lib/store/role-store';
import { GraduationCap, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function RoleSwitcher() {
  const { role, setRole } = useRoleStore();
  const router = useRouter();

  const switchRole = (newRole: 'student' | 'teacher') => {
    setRole(newRole);
    if (newRole === 'student') {
      router.push('/student/dashboard');
    } else {
      router.push('/teacher/dashboard');
    }
  };

  return (
    <div
      className="flex items-center bg-slate-100 rounded-xl p-1 gap-1"
      role="group"
      aria-label="Switcher peran pengguna"
    >
      <button
        onClick={() => switchRole('student')}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
          role === 'student'
            ? "bg-white text-blue-800 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        )}
        aria-pressed={role === 'student'}
        aria-label="Beralih ke mode siswa"
      >
        <BookOpen size={13} aria-hidden="true" />
        Siswa
      </button>
      <button
        onClick={() => switchRole('teacher')}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
          role === 'teacher'
            ? "bg-white text-emerald-700 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        )}
        aria-pressed={role === 'teacher'}
        aria-label="Beralih ke mode guru"
      >
        <GraduationCap size={13} aria-hidden="true" />
        Guru
      </button>
    </div>
  );
}
