'use client';

import { useState } from 'react';
import { Volume2, VolumeX, ZoomIn, ZoomOut, Sun, RotateCcw, Accessibility, X } from 'lucide-react';
import { useAccessibilityStore, FontSize } from '@/lib/store/accessibility-store';
import { cn } from '@/lib/utils/cn';

const FONT_SIZES: { label: string; value: FontSize }[] = [
  { label: 'A', value: 'normal' },
  { label: 'A+', value: 'besar' },
  { label: 'A++', value: 'sangat-besar' },
];

export default function AccessibilityBar() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    ttsEnabled, setTtsEnabled,
    fontSize, setFontSize,
    highContrast, setHighContrast,
    resetToDefault,
  } = useAccessibilityStore();

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 right-4 z-50 w-12 h-12 bg-blue-800 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:bottom-4"
        aria-label="Buka panel aksesibilitas"
        aria-expanded={isOpen}
      >
        <Accessibility size={20} />
      </button>

      {/* Panel */}
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-36 right-4 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 sm:bottom-20",
            "animate-fade-in"
          )}
          role="dialog"
          aria-label="Panel Aksesibilitas"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <Accessibility size={16} className="text-blue-700" />
              Aksesibilitas
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded"
              aria-label="Tutup panel aksesibilitas"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4">
            {/* TTS Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {ttsEnabled ? (
                  <Volume2 size={16} className="text-blue-700" />
                ) : (
                  <VolumeX size={16} className="text-slate-400" />
                )}
                <span className="text-sm font-medium text-slate-700">
                  Baca Teks (TTS)
                </span>
              </div>
              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-blue-500",
                  ttsEnabled ? "bg-blue-600" : "bg-slate-200"
                )}
                role="switch"
                aria-checked={ttsEnabled}
                aria-label={ttsEnabled ? "Matikan Text-to-Speech" : "Aktifkan Text-to-Speech"}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow",
                    ttsEnabled ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* Font Size */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ZoomIn size={16} className="text-slate-500" />
                <span className="text-sm font-medium text-slate-700">Ukuran Teks</span>
              </div>
              <div className="flex gap-2">
                {FONT_SIZES.map((fs) => (
                  <button
                    key={fs.value}
                    onClick={() => setFontSize(fs.value)}
                    className={cn(
                      "flex-1 h-9 rounded-lg border-2 text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-blue-500",
                      fontSize === fs.value
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-600 hover:border-blue-300"
                    )}
                    aria-label={`Ukuran font ${fs.label}`}
                    aria-pressed={fontSize === fs.value}
                  >
                    {fs.label}
                  </button>
                ))}
              </div>
            </div>

            {/* High Contrast */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun size={16} className="text-slate-500" />
                <span className="text-sm font-medium text-slate-700">Kontras Tinggi</span>
              </div>
              <button
                onClick={() => setHighContrast(!highContrast)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-blue-500",
                  highContrast ? "bg-blue-600" : "bg-slate-200"
                )}
                role="switch"
                aria-checked={highContrast}
                aria-label={highContrast ? "Matikan kontras tinggi" : "Aktifkan kontras tinggi"}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow",
                    highContrast ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* Reset */}
            <button
              onClick={resetToDefault}
              className="w-full flex items-center justify-center gap-2 h-9 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Reset aksesibilitas ke pengaturan default"
            >
              <RotateCcw size={14} />
              Reset ke Default
            </button>
          </div>
        </div>
      )}
    </>
  );
}
