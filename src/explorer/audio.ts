/**
 * Notas de voz sin límite de tiempo: la grabación se corta en segmentos
 * independientes que se transcriben uno a uno mientras sigues hablando.
 * Archivos de audio largos se trocean en el navegador (WAV 16 kHz mono).
 */
export interface SegmentRecorder { stop: () => Promise<void>; elapsed: () => number }

export async function startSegmentedRecording(onSegment: (blob: Blob, index: number) => void, segmentMs = 60_000): Promise<SegmentRecorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
  const started = Date.now();
  let index = 0;
  let active = true;
  let current: MediaRecorder | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let finish: (() => void) | null = null;
  const next = () => {
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const parts: Blob[] = [];
    rec.ondataavailable = (e) => { if (e.data.size) parts.push(e.data); };
    rec.onstop = () => {
      if (parts.length) onSegment(new Blob(parts, { type: rec.mimeType || mime || 'audio/webm' }), index++);
      if (active) next();
      else { stream.getTracks().forEach((t) => t.stop()); finish?.(); }
    };
    rec.start();
    current = rec;
    timer = setTimeout(() => rec.state === 'recording' && rec.stop(), segmentMs);
  };
  next();
  return {
    elapsed: () => Date.now() - started,
    stop: () => new Promise<void>((resolve) => {
      active = false;
      finish = resolve;
      if (timer) clearTimeout(timer);
      if (current && current.state === 'recording') current.stop();
      else { stream.getTracks().forEach((t) => t.stop()); resolve(); }
    }),
  };
}

function encodeWav(samples: Float32Array, rate: number): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
  return new Blob([buf], { type: 'audio/wav' });
}

/** Trocea un archivo de audio en segmentos WAV de `minutes` minutos (16 kHz, mono). */
export async function splitAudioFile(file: Blob, minutes = 8): Promise<Blob[]> {
  if (file.size < 18 * 1024 * 1024) return [file];
  const ctx = new OfflineAudioContext(1, 16000, 16000);
  const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
  const rate = 16000;
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * rate), rate);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const mono = (await offline.startRendering()).getChannelData(0);
  const size = minutes * 60 * rate;
  const out: Blob[] = [];
  for (let i = 0; i < mono.length; i += size) out.push(encodeWav(mono.subarray(i, i + size), rate));
  return out;
}

type SpeechRec = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null };

export function browserDictationAvailable(): boolean {
  return typeof window !== 'undefined' && !!((window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);
}

/** Dictado del navegador (sin proveedor). Se reinicia solo para no tener límite de tiempo. */
export function startBrowserDictation(onFinal: (text: string) => void, onInterim: (text: string) => void, onError: (msg: string) => void): () => void {
  const W = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
  const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
  if (!Ctor) { onError('Este navegador no ofrece dictado por voz'); return () => {}; }
  let active = true;
  let rec: SpeechRec | null = null;
  const start = () => {
    rec = new Ctor();
    rec.lang = 'es-ES';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) onFinal(r[0].transcript.trim());
        else interim += r[0].transcript;
      }
      onInterim(interim);
    };
    rec.onerror = (e) => { if (e.error !== 'no-speech' && e.error !== 'aborted') onError(e.error); };
    rec.onend = () => { if (active) start(); };
    rec.start();
  };
  start();
  return () => { active = false; rec?.stop(); };
}
