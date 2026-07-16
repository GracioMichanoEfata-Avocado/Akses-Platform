import { useEffect } from 'react';
import { useAccessibilityStore } from '@/lib/store/accessibility-store';

// State global untuk track apakah TTS lagi ngomong
let isSpeakingGlobal = false;
let lastSpokeEndAt = 0; // timestamp TTS terakhir berhenti bicara
let onSpeakEnd: (() => void) | null = null;
let longStop = false; // penanda untuk menghentikan speakLong di tengah jalan

export function isTTSSpeaking() {
  return isSpeakingGlobal;
}

// Hasil SpeechRecognition sering baru muncul beberapa ratus milidetik SETELAH
// TTS sebenarnya berhenti bicara (mic keburu "dengar" ekor suaranya sendiri,
// baru diproses browser belakangan). Guard yang cuma cek isTTSSpeaking() pada
// saat itu juga bisa kebobolan. Tambahkan jeda aman setelah bicara selesai.
export function isTTSSpeakingOrRecentlyEnded(graceMs = 900) {
  return isSpeakingGlobal || (Date.now() - lastSpokeEndAt) < graceMs;
}

export function onTTSEnd(cb: () => void) {
  onSpeakEnd = cb;
}

export function speak(text: string, priority: 'normal' | 'interrupt' = 'normal') {
  if (typeof window === 'undefined') return;
  if (!window.speechSynthesis) return;

  if (priority === 'interrupt') {
    window.speechSynthesis.cancel();
  } else if (isSpeakingGlobal) {
    return; // Jangan interrupt kalau priority normal
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

  utterance.onstart = () => { isSpeakingGlobal = true; };
  utterance.onend = () => {
    isSpeakingGlobal = false;
    lastSpokeEndAt = Date.now();
    onSpeakEnd?.();
    onSpeakEnd = null;
  };
  utterance.onerror = () => {
    isSpeakingGlobal = false;
    lastSpokeEndAt = Date.now();
    onSpeakEnd?.();
    onSpeakEnd = null;
  };

  window.speechSynthesis.speak(utterance);
}

// Membacakan teks panjang dengan memecahnya per kalimat lalu mengantrikannya
// satu per satu. speechSynthesis Chrome sering gagal berbunyi pada satu
// utterance yang sangat panjang; potongan pendek aman. Memilih suara Indonesia
// dan menjaga isSpeakingGlobal seperti speak(), agar voice-nav tetap selaras.
export function speakLong(text: string, onDone?: () => void) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  longStop = false;

  const potongan = (text.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g) || [text])
    .map(s => s.trim())
    .filter(Boolean);
  if (potongan.length === 0) { onDone?.(); return; }

  let i = 0;
  isSpeakingGlobal = true;

  const berikut = () => {
    if (longStop || i >= potongan.length) {
      isSpeakingGlobal = false;
      lastSpokeEndAt = Date.now();
      onDone?.();
      return;
    }
    const u = new SpeechSynthesisUtterance(potongan[i]);
    u.lang = 'id-ID';
    u.rate = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find(v => v.lang.startsWith('id'));
    if (idVoice) u.voice = idVoice;
    u.onend = () => { i++; berikut(); };
    u.onerror = () => { i++; berikut(); };
    window.speechSynthesis.speak(u);
  };

  berikut();
}

export function stopSpeaking() {
  if (typeof window !== 'undefined') {
    longStop = true; // hentikan antrean speakLong agar tak lanjut ke potongan berikutnya
    window.speechSynthesis?.cancel();
    isSpeakingGlobal = false;
    lastSpokeEndAt = Date.now();
  }
}

// Hook untuk auto-narasi saat halaman dibuka
export function useTalkback(narasiHalaman: string, deps: any[] = []) {
  const { mode, ttsEnabled } = useAccessibilityStore();
  const isTunanetra = mode === 'tunanetra' || mode === 'both';

  useEffect(() => {
    if (!isTunanetra && !ttsEnabled) return;
    if (!narasiHalaman) return;

    const timer = setTimeout(() => {
      speak(narasiHalaman, 'interrupt');
    }, 600);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTunanetra, ttsEnabled, ...deps]);
}