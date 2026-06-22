'use client';

import { useCallback, useEffect } from 'react';
import { useAccessibilityStore } from '@/lib/store/accessibility-store';

export function useAccessibility() {
  const store = useAccessibilityStore();

  useEffect(() => {
    store.applyToDOM();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speakText = useCallback((text: string) => {
    if (!store.ttsEnabled) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = store.ttsRate;
    utterance.pitch = store.ttsPitch;
    window.speechSynthesis.speak(utterance);
  }, [store.ttsEnabled, store.ttsRate, store.ttsPitch]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const isSpeaking = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return false;
    return window.speechSynthesis.speaking;
  }, []);

  return {
    ...store,
    speakText,
    stopSpeaking,
    isSpeaking,
  };
}

export function useTTS(text: string) {
  const { ttsEnabled, ttsRate, ttsPitch } = useAccessibilityStore();

  const speak = useCallback(() => {
    if (!ttsEnabled) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = ttsRate;
    utterance.pitch = ttsPitch;
    window.speechSynthesis.speak(utterance);
  }, [text, ttsEnabled, ttsRate, ttsPitch]);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { speak, stop, isEnabled: ttsEnabled };
}
