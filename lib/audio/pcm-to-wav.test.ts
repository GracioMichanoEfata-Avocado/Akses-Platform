import { describe, it, expect } from 'vitest';
import { pcmBase64ToWavBase64, sampleRateFromMimeType } from './pcm-to-wav';

describe('pcmBase64ToWavBase64', () => {
  it('menghasilkan header RIFF/WAVE 44 byte di depan data PCM apa adanya', () => {
    const pcm = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
    const wavBase64 = pcmBase64ToWavBase64(pcm.toString('base64'), 24000, 1, 16);
    const wav = Buffer.from(wavBase64, 'base64');

    expect(wav.length).toBe(44 + pcm.length);
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
    expect(wav.toString('ascii', 12, 16)).toBe('fmt ');
    expect(wav.toString('ascii', 36, 40)).toBe('data');
    // Data PCM di ekor tidak boleh berubah sedikit pun.
    expect(wav.subarray(44)).toEqual(pcm);
  });

  it('menulis sample rate, channel, dan bit depth ke header fmt', () => {
    const pcm = Buffer.from([0, 0]);
    const wav = Buffer.from(pcmBase64ToWavBase64(pcm.toString('base64'), 16000, 2, 16), 'base64');

    expect(wav.readUInt16LE(22)).toBe(2); // channels
    expect(wav.readUInt32LE(24)).toBe(16000); // sample rate
    expect(wav.readUInt16LE(34)).toBe(16); // bits per sample
  });

  it('menulis ukuran RIFF dan data chunk yang benar', () => {
    const pcm = Buffer.alloc(100, 7);
    const wav = Buffer.from(pcmBase64ToWavBase64(pcm.toString('base64'), 24000, 1, 16), 'base64');

    expect(wav.readUInt32LE(4)).toBe(36 + 100);
    expect(wav.readUInt32LE(40)).toBe(100);
  });

  it('PCM kosong tetap menghasilkan header WAV yang valid', () => {
    const wav = Buffer.from(pcmBase64ToWavBase64('', 24000, 1, 16), 'base64');
    expect(wav.length).toBe(44);
    expect(wav.readUInt32LE(40)).toBe(0);
  });
});

describe('sampleRateFromMimeType', () => {
  it('mengekstrak rate dari mimeType Gemini TTS', () => {
    expect(sampleRateFromMimeType('audio/L16;codec=pcm;rate=24000')).toBe(24000);
    expect(sampleRateFromMimeType('audio/L16;codec=pcm;rate=16000')).toBe(16000);
  });

  it('jatuh ke fallback kalau mimeType tidak mengandung rate', () => {
    expect(sampleRateFromMimeType('audio/wav')).toBe(24000);
    expect(sampleRateFromMimeType(undefined)).toBe(24000);
    expect(sampleRateFromMimeType(undefined, 22050)).toBe(22050);
  });
});
