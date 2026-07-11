'use client';

import Link from 'next/link';
import { GraduationCap, Users } from 'lucide-react';

export default function RoleSelectionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
          <GraduationCap size={32} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white">AKSES</h1>
        <p className="text-blue-200 text-sm mt-1">Akses Edukasi Setara</p>
      </div>

      {/* Role Cards */}
      <div className="w-full max-w-sm space-y-4">
        <p className="text-center text-blue-200 text-sm font-medium mb-6">Masuk sebagai:</p>

        <Link href="/student/login" aria-label="Login sebagai siswa, akses materi belajar adaptif">
          <div className="bg-white rounded-2xl p-6 flex items-center gap-5 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all cursor-pointer group">
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
              <GraduationCap size={28} className="text-blue-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Saya Siswa</h2>
              <p className="text-sm text-slate-500 mt-0.5">Akses materi belajar adaptif</p>
            </div>
          </div>
        </Link>

        <Link href="/teacher/login" aria-label="Login sebagai pendamping, kelola siswa dan upload materi">
          <div className="bg-white rounded-2xl p-6 flex items-center gap-5 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all cursor-pointer group mt-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
              <Users size={28} className="text-emerald-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Saya Pendamping</h2>
              <p className="text-sm text-slate-500 mt-0.5">Kelola siswa & upload materi</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Footer */}
      <p className="text-center text-blue-200 text-xs mt-10">
        Platform inklusif untuk penyandang disabilitas sensorik
      </p>
    </div>
  );
}
