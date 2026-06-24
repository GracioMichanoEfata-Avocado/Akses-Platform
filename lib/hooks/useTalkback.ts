import { useEffect, useCallback } from 'react';
import { useAccessibilityStore } from '@/lib/store/accessibility-store';

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speak(text: string, priority: 'normal' | 'interrupt' = 'normal') {
  if (typeof window === 'undefined') return;
  if (!window.speechSynthesis) return;

  if (priority === 'interrupt') {
    window.speechSynthesis.cancel();
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'id-ID';
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // Coba cari suara Indonesia
  const voices = window.speechSynthesis.getVoices();
  const idVoice = voices.find(v => v.lang.startsWith('id'));
  if (idVoice) utterance.voice = idVoice;

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window !== 'undefined') {
    window.speechSynthesis?.cancel();
  }
}

// Hook untuk auto-narasi saat halaman dibuka
export function useTalkback(narasiHalaman: string, deps: any[] = []) {
  const { mode, ttsEnabled } = useAccessibilityStore();
  const isTunanetra = mode === 'tunanetra' || mode === 'both';

  useEffect(() => {
    if (!isTunanetra && !ttsEnabled) return;
    if (!narasiHalaman) return;

    // Delay sedikit biar halaman selesai render
    const timer = setTimeout(() => {
      speak(narasiHalaman, 'interrupt');
    }, 600);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTunanetra, ttsEnabled, ...deps]);
}