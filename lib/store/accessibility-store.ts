'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DisabilitasMode = 'tunanetra' | 'tunarungu' | 'both' | 'none';
export type FontSize = 'normal' | 'besar' | 'sangat-besar';
// Sub-tipe tunanetra — dipilih tambahan saat mode 'tunanetra' atau 'both'.
export type TunanetraSubtype = 'blurry' | 'scotoma' | 'low-contrast' | 'total';

interface AccessibilityState {
  mode: DisabilitasMode;
  tunanetraSubtype: TunanetraSubtype | null;
  splitEnabled: boolean;
  fontSize: FontSize;
  fontScale: number;
  highContrast: boolean;
  ttsEnabled: boolean;
  ttsRate: number;
  ttsPitch: number;
  subtitleEnabled: boolean;
  isSetupDone: boolean;

  setMode: (mode: DisabilitasMode) => void;
  setTunanetraSubtype: (subtype: TunanetraSubtype) => void;
  setSplitEnabled: (value: boolean) => void;
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

// Preset per sub-tipe tunanetra. `subtitleEnabled` di sini dipakai apa adanya
// untuk mode 'tunanetra'; untuk mode 'both' dipaksa true (syarat tunarungu),
// lihat setTunanetraSubtype.
const TUNANETRA_SUBTYPE_PRESETS: Record<TunanetraSubtype, {
  fontSize: FontSize; highContrast: boolean; subtitleEnabled: boolean; ttsEnabled: boolean; splitEnabled: boolean;
}> = {
  blurry: { fontSize: 'besar', highContrast: true, subtitleEnabled: true, ttsEnabled: false, splitEnabled: false },
  scotoma: { fontSize: 'normal', highContrast: false, subtitleEnabled: true, ttsEnabled: false, splitEnabled: true },
  'low-contrast': { fontSize: 'normal', highContrast: true, subtitleEnabled: true, ttsEnabled: false, splitEnabled: false },
  total: { fontSize: 'normal', highContrast: false, subtitleEnabled: false, ttsEnabled: true, splitEnabled: false },
};

const DEFAULT_STATE = {
  mode: 'none' as DisabilitasMode,
  tunanetraSubtype: null as TunanetraSubtype | null,
  splitEnabled: false,
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
        if (mode === 'tunanetra' || mode === 'both') {
          set({ mode });
          // Kalau sub-tipe tunanetra sudah pernah dipilih sebelumnya, terapkan
          // lagi presetnya di bawah aturan mode yang baru (mis. syarat subtitle
          // tunarungu ikut dipaksa aktif saat pindah ke 'both').
          const { tunanetraSubtype } = get();
          if (tunanetraSubtype) get().setTunanetraSubtype(tunanetraSubtype);
        } else if (mode === 'tunarungu') {
          set({
            mode, tunanetraSubtype: null, splitEnabled: false,
            ttsEnabled: false, subtitleEnabled: true, highContrast: false,
          });
        } else {
          set({
            mode, tunanetraSubtype: null, splitEnabled: false,
            ttsEnabled: false, subtitleEnabled: false, highContrast: false,
          });
        }
      },

      setTunanetraSubtype: (subtype) => {
        const preset = TUNANETRA_SUBTYPE_PRESETS[subtype];
        const { mode } = get();
        // Mode 'both' = syarat tunanetra + tunarungu: subtitle selalu aktif
        // apapun sub-tipenya, karena itu syarat tunarungu.
        const subtitleEnabled = mode === 'both' ? true : preset.subtitleEnabled;
        const fontScale = FONT_SCALE_MAP[preset.fontSize];
        set({
          tunanetraSubtype: subtype,
          fontSize: preset.fontSize,
          fontScale,
          highContrast: preset.highContrast,
          subtitleEnabled,
          ttsEnabled: preset.ttsEnabled,
          splitEnabled: preset.splitEnabled,
        });
        if (typeof document !== 'undefined') {
          document.documentElement.style.setProperty('--font-scale', String(fontScale));
        }
      },

      setSplitEnabled: (value) => set({ splitEnabled: value }),

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
        tunanetraSubtype: state.tunanetraSubtype,
        splitEnabled: state.splitEnabled,
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
