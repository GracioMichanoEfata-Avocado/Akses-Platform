import { useEffect } from 'react';
import { useTalkbackContext, PageVoiceCommand } from '@/components/accessibility/TalkbackProvider';
import { speak } from './useTalkback';

/**
 * Hook untuk mendaftarkan perintah suara spesifik di sebuah halaman.
 * Gunakan di komponen halaman untuk menambahkan voice command tombol-tombol di halaman itu.
 *
 * Contoh pemakaian:
 * usePageVoiceCommands([
 *   { keywords: ['putar', 'audio', 'play'], label: 'Putar Audio', action: () => handlePlayAudio() },
 *   { keywords: ['kuis', 'mulai kuis'], label: 'Mulai Kuis', action: () => router.push('/quiz') },
 * ]);
 */
export function usePageVoiceCommands(commands: PageVoiceCommand[]) {
  const { registerPageCommands, clearPageCommands, isAktif } = useTalkbackContext();

  useEffect(() => {
    if (!isAktif) return;
    registerPageCommands(commands);

    // Narasi tombol yang tersedia saat halaman dimuat
    if (commands.length > 0) {
      const labels = commands.map(c => c.label).join(', ');
      setTimeout(() => {
        speak(`Perintah suara tersedia: ${labels}.`, 'normal');
      }, 2000);
    }

    return () => clearPageCommands();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAktif]);
}