// Gemini TTS mengembalikan audio PCM mentah (16-bit, mono) tanpa header —
// tidak bisa langsung diputar lewat <audio>/elemen browser manapun. Fungsi
// murni ini membungkusnya jadi WAV yang valid dengan menambahkan header
// 44-byte standar di depan data PCM apa adanya.
export function pcmBase64ToWavBase64(
  pcmBase64: string,
  sampleRate = 24000,
  channels = 1,
  bitsPerSample = 16
): string {
  const pcm = Buffer.from(pcmBase64, 'base64');
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const dataSize = pcm.length;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]).toString('base64');
}

/** Ekstrak sample rate dari mimeType Gemini TTS, mis. "audio/L16;codec=pcm;rate=24000". */
export function sampleRateFromMimeType(mimeType: string | undefined, fallback = 24000): number {
  const match = mimeType?.match(/rate=(\d+)/);
  return match ? parseInt(match[1], 10) : fallback;
}
