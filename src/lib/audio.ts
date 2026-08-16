let sharedAudioCtx: AudioContext | null = null;
let masterBusInput: GainNode | null = null;
let masterBusLimiter: DynamicsCompressorNode | null = null;
let ambientBusInput: GainNode | null = null;
let binauralBusInput: GainNode | null = null;
let activePCMSource: AudioBufferSourceNode | null = null;
let currentPlaybackId = 0;

function ensureMasterChain(ctx: AudioContext) {
  if (masterBusInput && masterBusLimiter) return;

  masterBusInput = ctx.createGain();
  masterBusLimiter = ctx.createDynamicsCompressor();
  masterBusLimiter.threshold.setValueAtTime(-22, ctx.currentTime);
  masterBusLimiter.knee.setValueAtTime(14, ctx.currentTime);
  masterBusLimiter.ratio.setValueAtTime(2, ctx.currentTime);
  masterBusLimiter.attack.setValueAtTime(0.006, ctx.currentTime);
  masterBusLimiter.release.setValueAtTime(0.18, ctx.currentTime);
  masterBusInput.gain.setValueAtTime(1, ctx.currentTime);
  masterBusInput.connect(masterBusLimiter);
  masterBusLimiter.connect(ctx.destination);
}

/**
 * Utility to get or create a shared AudioContext singleton.
 * Call this during user interactions to ensure it's in a running state.
 */
export function getSharedAudioContext(): AudioContext {
  if (typeof window === 'undefined') {
    throw new Error('AudioContext is only available in the browser');
  }

  if (!sharedAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    sharedAudioCtx = new AudioContextClass({ latencyHint: 'playback' });
    ensureMasterChain(sharedAudioCtx);
  }

  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(err => console.warn("[Audio] Failed to resume shared AudioContext:", err));
  }

  return sharedAudioCtx;
}

/** BgMusicPlayer master gain multiplier (user slider × this value). */
export const AMBIENT_MASTER_GAIN_SCALE = 1.36;

/** HTML5 audio element gain when routed through Web Audio (2× previous loudness). */
export const BGM_HTML_GAIN_SCALE = 2;

/** Default binaural oscillator gain — tuned against ambient bus ducking. */
export const DEFAULT_BINAURAL_GAIN = 0.055;

const AMBIENT_BUS_IDLE_GAIN = 0.72;
const AMBIENT_BUS_DUCKED_GAIN = 0.36;
const BINAURAL_BUS_GAIN = 0.92;
const MIX_BUS_RAMP_SEC = 0.85;

let binauralMixActive = false;

function rampBusGain(bus: GainNode, target: number, rampSec: number = MIX_BUS_RAMP_SEC) {
  const ctx = getSharedAudioContext();
  const now = ctx.currentTime;
  bus.gain.cancelScheduledValues(now);
  bus.gain.setValueAtTime(bus.gain.value, now);
  bus.gain.linearRampToValueAtTime(target, now + rampSec);
}

/** Lowers ambient bus while binaural beats play so both layers stay audible. */
export function setBinauralMixActive(active: boolean): void {
  binauralMixActive = active;
  const ambientBus = getAmbientAudioBus();
  rampBusGain(ambientBus, active ? AMBIENT_BUS_DUCKED_GAIN : AMBIENT_BUS_IDLE_GAIN);
}

export function isBinauralMixActive(): boolean {
  return binauralMixActive;
}

export function getMasterAudioBus(): GainNode {
  const ctx = getSharedAudioContext();
  ensureMasterChain(ctx);
  return masterBusInput!;
}

export function getAmbientAudioBus(): GainNode {
  const ctx = getSharedAudioContext();
  ensureMasterChain(ctx);
  if (!ambientBusInput) {
    ambientBusInput = ctx.createGain();
    ambientBusInput.gain.setValueAtTime(
      binauralMixActive ? AMBIENT_BUS_DUCKED_GAIN : AMBIENT_BUS_IDLE_GAIN,
      ctx.currentTime,
    );
    ambientBusInput.connect(masterBusInput!);
  }
  return ambientBusInput;
}

export function getBinauralAudioBus(): GainNode {
  const ctx = getSharedAudioContext();
  ensureMasterChain(ctx);
  if (!binauralBusInput) {
    binauralBusInput = ctx.createGain();
    binauralBusInput.gain.setValueAtTime(BINAURAL_BUS_GAIN, ctx.currentTime);
    binauralBusInput.connect(masterBusInput!);
  }
  return binauralBusInput;
}

export type NoiseColor = 'white' | 'pink' | 'brown';

export function createSeamlessNoiseBuffer(
  ctx: AudioContext,
  type: NoiseColor,
  seconds: number = 8,
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const bufferSize = Math.floor(sampleRate * seconds);
  const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);

  if (type === 'white') {
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  } else if (type === 'pink') {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.055;
      b6 = white * 0.115926;
    }
  } else {
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.015 * white) / 1.015;
      lastOut = data[i];
      data[i] *= 2.8;
    }
  }

  const fadeSamples = Math.floor(sampleRate * 0.35);
  for (let i = 0; i < fadeSamples; i++) {
    const alpha = i / fadeSamples;
    const fadeCurve = alpha * alpha * (3 - 2 * alpha);
    data[i] = data[i] * fadeCurve + data[bufferSize - fadeSamples + i] * (1 - fadeCurve);
  }

  return buffer;
}

export function createLoopingNoiseSource(
  ctx: AudioContext,
  type: NoiseColor,
  seconds: number = 8,
): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = createSeamlessNoiseBuffer(ctx, type, seconds);
  source.loop = true;
  return source;
}

/**
 * Physically stops any currently playing raw PCM source.
 */
export function stopRawPCM() {
  currentPlaybackId++;
  if (activePCMSource) {
    try {
      activePCMSource.stop();
    } catch (e) {
      // already stopped or not started
    }
    activePCMSource = null;
  }
}

/**
 * Utility to play raw PCM 16-bit audio data at a specific sample rate.
 */
export async function playRawPCM(base64: string, sampleRate: number = 24000): Promise<void> {
  try {
    // Stop any existing PCM playback first
    stopRawPCM();
    const activePlaybackId = currentPlaybackId;

    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert raw PCM 16-bit (little-endian) to float32
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    // Use shared AudioContext to prevent autoplay restriction issues in async callbacks
    const audioCtx = getSharedAudioContext();
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    
    if (activePlaybackId !== currentPlaybackId) {
      return; // Aborted
    }
    
    const audioBuffer = audioCtx.createBuffer(1, float32Array.length, sampleRate);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    
    activePCMSource = source;
    
    return new Promise((resolve) => {
      source.onended = () => {
        if (activePCMSource === source) {
          activePCMSource = null;
        }
        // Do not close the shared context, just resolve
        resolve();
      };
      source.start();
    });
  } catch (error) {
    console.error('[AudioPlayer] Failed to play PCM:', error);
    throw error;
  }
}

/**
 * Utility to play base64 compressed audio (e.g. mp3) using the shared AudioContext.
 * This is 100% immune to browser autoplay restrictions that block HTMLAudioElement
 * when played asynchronously after a fetch request.
 */
export async function playCompressedAudio(base64: string): Promise<void> {
  try {
    // Stop any existing raw PCM source
    stopRawPCM();
    const activePlaybackId = currentPlaybackId;

    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const audioCtx = getSharedAudioContext();
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    if (activePlaybackId !== currentPlaybackId) {
      return; // Aborted
    }

    // Decode the compressed audio (mp3/aac/etc) ArrayBuffer
    // slice(0) is used to prevent issues if buffer is consumed
    const decodedBuffer = await audioCtx.decodeAudioData(bytes.buffer.slice(0));

    if (activePlaybackId !== currentPlaybackId) {
      return; // Aborted
    }

    const source = audioCtx.createBufferSource();
    source.buffer = decodedBuffer;
    source.connect(audioCtx.destination);

    activePCMSource = source;

    return new Promise((resolve) => {
      source.onended = () => {
        if (activePCMSource === source) {
          activePCMSource = null;
        }
        resolve();
      };
      source.start();
    });
  } catch (error) {
    console.error('[AudioPlayer] Failed to play compressed audio:', error);
    throw error;
  }
}

// --- TTS HTML5 Audio (continues when screen is locked / app backgrounded) ---

const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAA=';

let ttsAudioEl: HTMLAudioElement | null = null;
let ttsBlobUrl: string | null = null;
let ttsPlaybackId = 0;
let ttsShouldBePlaying = false;
let ttsKeepAliveEl: HTMLAudioElement | null = null;

function revokeTTSBlobUrl() {
  if (ttsBlobUrl) {
    URL.revokeObjectURL(ttsBlobUrl);
    ttsBlobUrl = null;
  }
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

function pcm16ToWavBlob(bytes: Uint8Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = bytes.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  new Uint8Array(buffer, 44).set(bytes);

  return new Blob([buffer], { type: 'audio/wav' });
}

function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function startTTSKeepAlive() {
  if (typeof window === 'undefined') return;
  try {
    if (!ttsKeepAliveEl) {
      ttsKeepAliveEl = new Audio(SILENT_WAV_DATA_URI);
      ttsKeepAliveEl.loop = true;
      ttsKeepAliveEl.volume = 0.001;
      ttsKeepAliveEl.setAttribute('playsinline', 'true');
    }
    if (ttsKeepAliveEl.paused) {
      ttsKeepAliveEl.play().catch(() => {});
    }
  } catch {
    // best-effort iOS background keep-alive
  }
}

function stopTTSKeepAlive() {
  if (!ttsKeepAliveEl) return;
  try {
    ttsKeepAliveEl.pause();
    ttsKeepAliveEl.currentTime = 0;
  } catch {
    // ignore
  }
}

export function getTTSAudioElement(): HTMLAudioElement {
  if (typeof window === 'undefined') {
    throw new Error('HTMLAudioElement is only available in the browser');
  }
  if (!ttsAudioEl) {
    ttsAudioEl = new Audio();
    ttsAudioEl.preload = 'auto';
    ttsAudioEl.setAttribute('playsinline', 'true');
    ttsAudioEl.setAttribute('webkit-playsinline', 'true');
  }
  return ttsAudioEl;
}

/** Call synchronously during a user gesture before async TTS fetch. */
export function primeTTSAudioElement(): void {
  if (typeof window === 'undefined') return;
  try {
    const audio = getTTSAudioElement();
    if (!audio.src || audio.src === window.location.href) {
      audio.src = SILENT_WAV_DATA_URI;
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
      }).catch(() => {});
    }
  } catch {
    // ignore priming failures
  }
}

export function isTTSAudioPlaying(): boolean {
  return ttsShouldBePlaying && !!ttsAudioEl && !ttsAudioEl.paused && !ttsAudioEl.ended;
}

export function resumeTTSAudioIfNeeded(): void {
  if (!ttsShouldBePlaying || !ttsAudioEl) return;
  if (ttsAudioEl.paused && !ttsAudioEl.ended) {
    ttsAudioEl.play().catch(() => {});
    startTTSKeepAlive();
  }
}

export function stopTTSAudio(): void {
  ttsPlaybackId++;
  ttsShouldBePlaying = false;
  stopTTSKeepAlive();
  revokeTTSBlobUrl();

  if (ttsAudioEl) {
    try {
      ttsAudioEl.pause();
      ttsAudioEl.removeAttribute('src');
      ttsAudioEl.load();
    } catch {
      // ignore
    }
  }
}

/** Stops both HTML5 TTS playback and legacy Web Audio TTS sources. */
export function stopTTSPlayback(): void {
  stopTTSAudio();
  stopRawPCM();
}

export async function playTTSAudio(
  base64: string,
  encoding: string = 'mp3',
  sampleRate: number = 24000,
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('TTS playback is only available in the browser');
  }

  stopTTSAudio();
  const activePlaybackId = ttsPlaybackId;
  const bytes = base64ToBytes(base64);

  const blob =
    encoding === 'pcm'
      ? pcm16ToWavBlob(bytes, sampleRate)
      : new Blob([bytes], { type: 'audio/mpeg' });

  if (activePlaybackId !== ttsPlaybackId) return;

  revokeTTSBlobUrl();
  ttsBlobUrl = URL.createObjectURL(blob);

  const audio = getTTSAudioElement();
  audio.src = ttsBlobUrl;
  ttsShouldBePlaying = true;
  startTTSKeepAlive();

  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('pause', onPause);
    };

    const finish = () => {
      if (activePlaybackId !== ttsPlaybackId) return;
      ttsShouldBePlaying = false;
      stopTTSKeepAlive();
      cleanup();
      resolve();
    };

    const onEnded = () => finish();

    const onError = () => {
      if (activePlaybackId !== ttsPlaybackId) return;
      ttsShouldBePlaying = false;
      stopTTSKeepAlive();
      cleanup();
      reject(new Error('[AudioPlayer] TTS HTMLAudioElement playback failed'));
    };

    const onPause = () => {
      if (activePlaybackId !== ttsPlaybackId || !ttsShouldBePlaying) return;
      if (document.visibilityState === 'hidden' && !audio.ended) return;
      if (!audio.ended && audio.currentTime > 0) {
        ttsShouldBePlaying = false;
        stopTTSKeepAlive();
        cleanup();
        resolve();
      }
    };

    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('pause', onPause);

    audio.play().catch((err) => {
      onError();
      reject(err);
    });
  });
}

let ttsLifecycleInitialized = false;

export function initTTSAudioLifecycle(): void {
  if (ttsLifecycleInitialized || typeof window === 'undefined') return;
  ttsLifecycleInitialized = true;

  const handleResume = () => {
    if (document.visibilityState === 'hidden') return;
    resumeTTSAudioIfNeeded();
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      handleResume();
    }
  });
  window.addEventListener('pageshow', handleResume);
  window.addEventListener('focus', handleResume);
}


