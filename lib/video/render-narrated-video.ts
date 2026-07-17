// Merender slide + narasi jadi file video sungguhan, langsung di browser
// guru — tanpa server rendering/ffmpeg. Tiap slide digambar ke <canvas>,
// audio narasinya diputar lewat Web Audio API (muted di elemen <audio> asli
// supaya lolos autoplay-block browser, tapi tetap terekam via routing
// createMediaElementSource), lalu canvas+audio digabung dan direkam pakai
// MediaRecorder. Prosesnya berjalan seiring durasi narasi (real-time),
// bukan instan.

export interface NarratedSlide {
  judul: string;
  emojiIkon: string;
  deskripsi: string;
  warna: string;
  poinPenting?: string[];
}

const CANVAS_W = 1280;
const CANVAS_H = 720;

function wrapAndDrawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ');
  let line = '';
  const lines: string[] = [];
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
}

function drawSlide(ctx: CanvasRenderingContext2D, slide: NarratedSlide) {
  const warna = slide.warna || '#1E40AF';

  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = warna;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.font = '150px sans-serif';
  ctx.fillText(slide.emojiIkon || '📘', CANVAS_W / 2, 260);

  ctx.fillStyle = warna;
  ctx.font = 'bold 46px sans-serif';
  wrapAndDrawText(ctx, slide.judul || '', CANVAS_W / 2, 350, CANVAS_W - 160, 56);

  if (slide.poinPenting && slide.poinPenting.length > 0) {
    ctx.fillStyle = '#1e293b';
    ctx.font = '26px sans-serif';
    ctx.textAlign = 'left';
    let y = 460;
    for (const poin of slide.poinPenting) {
      wrapAndDrawText(ctx, `•  ${poin}`, 140, y, CANVAS_W - 280, 34);
      y += 44;
    }
  }
}

async function playSlideAudio(dataUri: string, destination: MediaStreamAudioDestinationNode, audioCtx: AudioContext) {
  return new Promise<void>((resolve) => {
    const audio = new Audio(dataUri);
    // Muted supaya lolos kebijakan autoplay browser (mustinya baru boleh
    // play() setelah user gesture) — tapi audio yang diroutekan lewat Web
    // Audio API tetap merekam sampel aslinya, bukan yang ter-mute.
    audio.muted = true;

    let source: MediaElementAudioSourceNode | null = null;
    const cleanup = () => {
      try { source?.disconnect(); } catch {}
      resolve();
    };

    audio.onended = cleanup;
    audio.onerror = cleanup;

    try {
      source = audioCtx.createMediaElementSource(audio);
      source.connect(destination);
    } catch {
      cleanup();
      return;
    }

    audio.play().catch(cleanup);
  });
}

/**
 * Merender slide + audio narasi jadi satu file video (webm). Durasi total
 * video sama dengan total durasi audio narasinya (berjalan real-time).
 */
export async function renderNarratedVideo(
  slides: NarratedSlide[],
  audioDataUris: string[],
  onProgress?: (index: number, total: number) => void
): Promise<Blob> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('renderNarratedVideo hanya bisa dijalankan di browser.');
  }
  if (slides.length === 0 || slides.length !== audioDataUris.length) {
    throw new Error('Jumlah slide dan audio narasi tidak sama.');
  }
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Browser ini tidak mendukung perekaman video (MediaRecorder).');
  }

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Browser ini tidak mendukung Canvas 2D.');

  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx: AudioContext = new AudioContextCtor();
  try { await audioCtx.resume(); } catch {}
  const destination = audioCtx.createMediaStreamDestination();

  const videoStream = (canvas as HTMLCanvasElement).captureStream(30);
  const combinedStream = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...destination.stream.getAudioTracks(),
  ]);

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
    ? 'video/webm;codecs=vp9,opus'
    : 'video/webm';
  const recorder = new MediaRecorder(combinedStream, { mimeType });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const recordingDone = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.onerror = (e: any) => reject(e?.error || new Error('Perekaman video gagal.'));
  });

  recorder.start();

  try {
    for (let i = 0; i < slides.length; i++) {
      onProgress?.(i + 1, slides.length);
      drawSlide(ctx, slides[i]);
      await playSlideAudio(audioDataUris[i], destination, audioCtx);
    }
  } finally {
    recorder.stop();
    videoStream.getTracks().forEach((t) => t.stop());
    await audioCtx.close().catch(() => {});
  }

  return recordingDone;
}
