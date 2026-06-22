'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DisabilitasMode = 'tunanetra' | 'tunarungu' | 'both' | 'none';
export type FontSize = 'normal' | 'besar' | 'sangat-besar';

interface AccessibilityState {
  mode: DisabilitasMode;
  fontSize: FontSize;
  fontScale: number;
  highContrast: boolean;
  ttsEnabled: boolean;
  ttsRate: number;
  ttsPitch: number;
  subtitleEnabled: boolean;
  isSetupDone: boolean;

  setMode: (mode: DisabilitasMode) => void;
  setFontSize: (size: FontSize) => void;
  setHighContrast: (value: boolean) => void;
  setTtsEnabled: (value: boolean) => void;
  setTtsRate: (rate: number) => void;
  setTtsPitch: (pitch: number) => void;
  setSubtitleEnabled: (value: boolean) => void;
  setSetupDone: (done: boolean) => void;
  resetToDefault: () => void;
  applyToDOM: () => void;
}

const FONT_SCALE_MAP: Record<FontSize, number> = {
  normal: 1,
  besar: 1.2,
  'sangat-besar': 1.4,
};

const DEFAULT_STATE = {
  mode: 'none' as DisabilitasMode,
  fontSize: 'normal' as FontSize,
  fontScale: 1,
  highContrast: false,
  ttsEnabled: false,
  ttsRate: 1,
  ttsPitch: 1,
  subtitleEnabled: true,
  isSetupDone: false,
};

export const useAccessibilityStore = create<AccessibilityState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      setMode: (mode) => {
        set({ mode });
        const s = get();
        if (mode === 'tunanetra' || mode === 'both') {
          set({ ttsEnabled: true });
        }
        if (mode === 'tunarungu' || mode === 'both') {
          set({ subtitleEnabled: true });
        }
      },

      setFontSize: (size) => {
        const fontScale = FONT_SCALE_MAP[size];
        set({ fontSize: size, fontScale });
        if (typeof document !== 'undefined') {
          document.documentElement.style.setProperty('--font-scale', String(fontScale));
        }
      },

      setHighContrast: (value) => {
        set({ highContrast: value });
        if (typeof document !== 'undefined') {
          if (value) {
            document.body.classList.add('high-contrast');
          } else {
            document.body.classList.remove('high-contrast');
          }
        }
      },

      setTtsEnabled: (value) => set({ ttsEnabled: value }),
      setTtsRate: (rate) => set({ ttsRate: rate }),
      setTtsPitch: (pitch) => set({ ttsPitch: pitch }),
      setSubtitleEnabled: (value) => set({ subtitleEnabled: value }),
      setSetupDone: (done) => set({ isSetupDone: done }),

      resetToDefault: () => {
        set(DEFAULT_STATE);
        if (typeof document !== 'undefined') {
          document.body.classList.remove('high-contrast');
          document.documentElement.style.setProperty('--font-scale', '1');
        }
      },

      applyToDOM: () => {
        const { highContrast, fontScale } = get();
        if (typeof document !== 'undefined') {
          if (highContrast) {
            document.body.classList.add('high-contrast');
          } else {
            document.body.classList.remove('high-contrast');
          }
          document.documentElement.style.setProperty('--font-scale', String(fontScale));
        }
      },
    }),
    {
      name: 'akses-accessibility',
      partialize: (state) => ({
        mode: state.mode,
        fontSize: state.fontSize,
        fontScale: state.fontScale,
        highContrast: state.highContrast,
        ttsEnabled: state.ttsEnabled,
        ttsRate: state.ttsRate,
        ttsPitch: state.ttsPitch,
        subtitleEnabled: state.subtitleEnabled,
        isSetupDone: state.isSetupDone,
      }),
    }
  )
);
