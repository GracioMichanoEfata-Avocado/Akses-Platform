'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface BackButtonProps {
  /** Tujuan navigasi. Kalau kosong, pakai router.back() (riwayat browser). */
  href?: string;
  /** Kalau diisi, tampilkan konfirmasi dulu sebelum benar-benar keluar. */
  confirmMessage?: string;
  /** Tema gelap untuk halaman dark (live, dsb). */
  dark?: boolean;
  className?: string;
  label?: string;
}

export default function BackButton({ href, confirmMessage, dark, className, label = 'Kembali' }: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    if (href) router.push(href);
    else router.back();
  };

  return (
    <button
      onClick={handleClick}
      aria-label={label}
      className={className || cn(
        'p-1.5 rounded-lg transition-colors flex-shrink-0',
        dark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      )}
    >
      <ArrowLeft size={18} />
    </button>
  );
}
