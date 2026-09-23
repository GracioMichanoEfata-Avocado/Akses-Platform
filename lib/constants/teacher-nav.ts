import { Home, Users, PlusCircle, Zap, BarChart2, Sparkles, BookOpen, UserCircle } from 'lucide-react';

// Satu-satunya sumber daftar menu guru. Dipakai bareng oleh TeacherSidebar
// (layar sm ke atas) dan TeacherMobileNav (drawer di bawah sm), supaya menu
// di HP tidak pernah ketinggalan saat ada halaman guru baru ditambahkan.
export const teacherNavItems = [
  { href: '/teacher/dashboard', label: 'Dashboard', icon: Home },
  { href: '/teacher/students', label: 'Siswa Saya', icon: Users },
  { href: '/teacher/materials', label: 'Kelola Materi', icon: BookOpen },
  { href: '/teacher/upload-materi', label: 'Upload Materi AI', icon: Sparkles },
  { href: '/teacher/create-session', label: 'Buat Sesi', icon: PlusCircle },
  { href: '/teacher/actions', label: 'Aksi Aktual', icon: Zap },
  { href: '/teacher/report', label: 'Laporan', icon: BarChart2 },
  { href: '/teacher/profile', label: 'Profil Saya', icon: UserCircle },
];

export function isTeacherNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/');
}
