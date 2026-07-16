'use client';

import { useEffect, useRef } from 'react';
import { useLocalParticipant } from '@livekit/components-react';
import { LocalAudioTrack } from 'livekit-client';

// Pasang noise-cancellation Krisp ke mic siapapun yang sedang aktif bicara
// (guru atau murid) — begitu mic-nya nyala. Tidak menampilkan apapun, cuma
// efek samping. Harus dirender di dalam <LiveKitRoom>.
//
// @livekit/krisp-noise-filter diimpor dinamis (bukan di atas file) karena
// menyentuh API browser (Worker) di level modul — kalau diimpor statis,
// Next.js gagal saat prerender halaman ini di server (tidak ada `Worker`
// di Node.js).
export default function NoiseFilterSetup() {
  const { microphoneTrack, isMicrophoneEnabled } = useLocalParticipant();
  const appliedRef = useRef<MediaStreamTrack | null>(null);

  useEffect(() => {
    const track = microphoneTrack?.track;
    if (!isMicrophoneEnabled || !track || !(track instanceof LocalAudioTrack)) return;
    if (appliedRef.current === track.mediaStreamTrack) return;
    const targetTrack = track.mediaStreamTrack;

    import('@livekit/krisp-noise-filter')
      .then(({ KrispNoiseFilter }) => track.setProcessor(KrispNoiseFilter()))
      .then(() => { appliedRef.current = targetTrack; })
      .catch((err) => {
        // Gagal pasang (mis. WASM gagal dimuat) bukan error fatal — mic tetap
        // jalan tanpa noise filter, cuma tidak seoptimal seharusnya.
        console.warn('Krisp noise filter gagal dipasang:', err);
      });
  }, [isMicrophoneEnabled, microphoneTrack]);

  return null;
}
