let sharedAudioCtx: AudioContext | null = null;
let masterBusInput: GainNode | null = null;
let masterBusLimiter: DynamicsCompressorNode | null = null;
let ambientBusInput: GainNode | null = null;
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

const AMBIENT_BUS_IDLE_GAIN = 0.72;

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
      AMBIENT_BUS_IDLE_GAIN,
      ctx.currentTime,
    );
    ambientBusInput.connect(masterBusInput!);
  }
  return ambientBusInput;
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

export function pauseTTSAudio(): void {
  ttsShouldBePlaying = false;
  stopTTSKeepAlive();
  if (ttsAudioEl && !ttsAudioEl.paused) {
    try {
      ttsAudioEl.pause();
    } catch {
      // ignore
    }
  }
}

export function resumeTTSAudio(): void {
  if (ttsAudioEl && ttsAudioEl.paused && !ttsAudioEl.ended && ttsAudioEl.src) {
    ttsShouldBePlaying = true;
    startTTSKeepAlive();
    ttsAudioEl.play().catch((err) => console.warn('[Audio] Failed to resume TTS audio:', err));
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
      ttsAudioEl.playbackRate = 1.0;
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

export type TTSEmotionType =
  | 'joy'        // 기쁨, 축하, 설렘, 활기
  | 'calm'       // 평온, 안식, 이완, 치유
  | 'emphasis'   // 강조, 결의, 확신, 통찰
  | 'sadness'    // 슬픔, 위로, 애도, 비움
  | 'mystic'     // 신비, 오라클, 우주, 영혼
  | 'vitality'   // 생체활력, 역동, 에너지
  | 'neutral';   // 기본, 중립

export interface TTSEmotionProfile {
  emotion: TTSEmotionType;
  playbackRate: number;      // 0.85 ~ 1.15
  detune: number;            // Cents (-1200 ~ +1200)
  pitchHzOffset: number;     // Edge TTS / API 호환용
  preservesPitch: boolean;   // HTMLAudio preservesPitch
  label: string;
}

export const TTS_EMOTION_PROFILES: Record<TTSEmotionType, TTSEmotionProfile> = {
  joy: {
    emotion: 'joy',
    playbackRate: 1.07,
    detune: 120,
    pitchHzOffset: 2,
    preservesPitch: true,
    label: '기쁨과 환희',
  },
  calm: {
    emotion: 'calm',
    playbackRate: 0.93,
    detune: -60,
    pitchHzOffset: -1,
    preservesPitch: true,
    label: '평온과 안식',
  },
  emphasis: {
    emotion: 'emphasis',
    playbackRate: 0.97,
    detune: -30,
    pitchHzOffset: 0,
    preservesPitch: true,
    label: '강조와 확신',
  },
  sadness: {
    emotion: 'sadness',
    playbackRate: 0.90,
    detune: -90,
    pitchHzOffset: -2,
    preservesPitch: true,
    label: '슬픔과 위로',
  },
  mystic: {
    emotion: 'mystic',
    playbackRate: 0.92,
    detune: 30,
    pitchHzOffset: 1,
    preservesPitch: true,
    label: '신비와 오라클',
  },
  vitality: {
    emotion: 'vitality',
    playbackRate: 1.05,
    detune: 80,
    pitchHzOffset: 2,
    preservesPitch: true,
    label: '활력과 생기',
  },
  neutral: {
    emotion: 'neutral',
    playbackRate: 1.00,
    detune: 0,
    pitchHzOffset: 0,
    preservesPitch: true,
    label: '자연스러운 기본',
  },
};

/**
 * Analyzes text semantics or explicit emotion tags to determine speed (rate) and pitch adjustments.
 */
export function analyzeTextEmotion(text: string, explicitEmotion?: string): TTSEmotionProfile {
  if (explicitEmotion) {
    const norm = explicitEmotion.toLowerCase().trim();
    if (norm.includes('joy') || norm.includes('기쁨') || norm.includes('환희') || norm.includes('행복') || norm.includes('축하') || norm.includes('happy')) {
      return TTS_EMOTION_PROFILES.joy;
    }
    if (norm.includes('calm') || norm.includes('평온') || norm.includes('안식') || norm.includes('이완') || norm.includes('치유') || norm.includes('peace') || norm.includes('relax')) {
      return TTS_EMOTION_PROFILES.calm;
    }
    if (norm.includes('emphasis') || norm.includes('강조') || norm.includes('확신') || norm.includes('결단') || norm.includes('focus') || norm.includes('insight')) {
      return TTS_EMOTION_PROFILES.emphasis;
    }
    if (norm.includes('sad') || norm.includes('슬픔') || norm.includes('위로') || norm.includes('비움') || norm.includes('grief')) {
      return TTS_EMOTION_PROFILES.sadness;
    }
    if (norm.includes('mystic') || norm.includes('신비') || norm.includes('오라클') || norm.includes('우주') || norm.includes('oracle') || norm.includes('tarot')) {
      return TTS_EMOTION_PROFILES.mystic;
    }
    if (norm.includes('vitality') || norm.includes('활력') || norm.includes('생기') || norm.includes('에너지') || norm.includes('energy')) {
      return TTS_EMOTION_PROFILES.vitality;
    }
    if (norm in TTS_EMOTION_PROFILES) {
      return TTS_EMOTION_PROFILES[norm as TTSEmotionType];
    }
  }

  if (!text || typeof text !== 'string') {
    return TTS_EMOTION_PROFILES.neutral;
  }

  const clean = text.toLowerCase();

  let joyScore = 0;
  let calmScore = 0;
  let emphasisScore = 0;
  let sadnessScore = 0;
  let mysticScore = 0;
  let vitalityScore = 0;

  const joyKeywords = ['기쁨', '행복', '환희', '축하', '설렘', '즐거', '반가', '웃음', '신나', '빛나', '희망', '감사', '사랑', '대단', '좋아', '멋진', '축복', '환대'];
  const calmKeywords = ['평온', '안식', '이완', '고요', '쉼', '휴식', '편안', '잠시', '호흡', '부드럽', '따뜻', '차분', '비우', '흘러', '정화', '다정', '안아', '안정', '느슨'];
  const emphasisKeywords = ['중요', '반드시', '기억', '확신', '결단', '핵심', '명심', '결코', '도전', '의지', '성공', '달성', '도약', '강력', '성찰', '통찰', '진실', '분명', '결정'];
  const sadnessKeywords = ['슬픔', '눈물', '아픔', '상처', '외로', '지친', '힘든', '버거운', '애도', '위로', '고단', '그리움', '상실'];
  const mysticKeywords = ['운명', '우주', '오라클', '타로', '별자리', '영혼', '직관', '신비', '차원', '공명', '시공간', '비밀', '흐름', '기운', '성좌'];
  const vitalityKeywords = ['활력', '에너지', '생기', '생체', '역동', '운동', '스트레칭', '기운', '움직', '파워', '깨어나', '시작', '실행', '리듬', '생명', '건강'];

  joyKeywords.forEach(k => { if (clean.includes(k)) joyScore++; });
  calmKeywords.forEach(k => { if (clean.includes(k)) calmScore++; });
  emphasisKeywords.forEach(k => { if (clean.includes(k)) emphasisScore++; });
  sadnessKeywords.forEach(k => { if (clean.includes(k)) sadnessScore++; });
  mysticKeywords.forEach(k => { if (clean.includes(k)) mysticScore++; });
  vitalityKeywords.forEach(k => { if (clean.includes(k)) vitalityScore++; });

  if (text.includes('!')) {
    joyScore += 0.5;
    vitalityScore += 0.5;
    emphasisScore += 0.5;
  }

  const scores = [
    { type: 'joy' as TTSEmotionType, score: joyScore },
    { type: 'calm' as TTSEmotionType, score: calmScore },
    { type: 'emphasis' as TTSEmotionType, score: emphasisScore },
    { type: 'sadness' as TTSEmotionType, score: sadnessScore },
    { type: 'mystic' as TTSEmotionType, score: mysticScore },
    { type: 'vitality' as TTSEmotionType, score: vitalityScore },
  ];

  scores.sort((a, b) => b.score - a.score);

  if (scores[0].score > 0) {
    return TTS_EMOTION_PROFILES[scores[0].type];
  }

  return TTS_EMOTION_PROFILES.neutral;
}

export function getEmotionProfile(emotion: string | TTSEmotionType): TTSEmotionProfile {
  return analyzeTextEmotion('', emotion);
}

export async function playTTSAudio(
  base64: string,
  encoding: string = 'mp3',
  sampleRate: number = 24000,
  emotionOrText?: string | TTSEmotionProfile,
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('TTS playback is only available in the browser');
  }

  // Pre-wake shared WebAudio context on mobile
  try {
    const audioCtx = getSharedAudioContext();
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
  } catch (_) {}

  stopTTSAudio();
  const activePlaybackId = ttsPlaybackId;
  const bytes = base64ToBytes(base64);

  const profile: TTSEmotionProfile =
    typeof emotionOrText === 'object' && emotionOrText !== null && 'playbackRate' in emotionOrText
      ? emotionOrText
      : analyzeTextEmotion(typeof emotionOrText === 'string' ? emotionOrText : '');

  const blob =
    encoding === 'pcm'
      ? pcm16ToWavBlob(bytes, sampleRate)
      : new Blob([bytes], { type: 'audio/mpeg' });

  if (activePlaybackId !== ttsPlaybackId) return;

  revokeTTSBlobUrl();
  ttsBlobUrl = URL.createObjectURL(blob);

  const audio = getTTSAudioElement();
  audio.src = ttsBlobUrl;

  // Apply emotional playback speed and pitch preservation
  try {
    audio.playbackRate = profile.playbackRate;
    audio.defaultPlaybackRate = profile.playbackRate;
    if ('preservesPitch' in audio) {
      (audio as any).preservesPitch = profile.preservesPitch;
    }
    if ('mozPreservesPitch' in audio) {
      (audio as any).mozPreservesPitch = profile.preservesPitch;
    }
    if ('webkitPreservesPitch' in audio) {
      (audio as any).webkitPreservesPitch = profile.preservesPitch;
    }
  } catch (err) {
    console.warn('[Audio] Failed to set emotion playback rate on audio element:', err);
  }

  ttsShouldBePlaying = true;
  startTTSKeepAlive();

  try {
    await new Promise<void>((resolve, reject) => {
      let isSettled = false;
      const cleanup = () => {
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
      };

      const finish = () => {
        if (isSettled) return;
        isSettled = true;
        if (activePlaybackId !== ttsPlaybackId) return;
        ttsShouldBePlaying = false;
        stopTTSKeepAlive();
        cleanup();
        resolve();
      };

      const onEnded = () => finish();

      const onError = (e?: any) => {
        if (isSettled) return;
        isSettled = true;
        if (activePlaybackId !== ttsPlaybackId) return;
        ttsShouldBePlaying = false;
        stopTTSKeepAlive();
        cleanup();
        reject(e || new Error('[AudioPlayer] HTMLAudioElement playback failed on mobile'));
      };

      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          onError(err);
        });
      }
    });
  } catch (htmlErr) {
    console.warn('[AudioPlayer] HTML5 Audio blocked by mobile policy, instantly rescuing via WebAudio buffer:', htmlErr);
    if (activePlaybackId !== ttsPlaybackId) return;

    // Direct WebAudio buffer decode & play (100% resilient on mobile browsers)
    if (encoding === 'pcm') {
      await playRawPCM(base64, sampleRate);
    } else {
      await playCompressedAudio(base64);
    }
  }
}

let ttsLifecycleInitialized = false;

export function initTTSAudioLifecycle(): void {
  if (ttsLifecycleInitialized || typeof window === 'undefined') return;
  ttsLifecycleInitialized = true;

  const handleResume = () => {
    if (document.visibilityState === 'hidden') return;
    resumeTTSAudio();
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      handleResume();
    }
  });
  window.addEventListener('pageshow', handleResume);
  window.addEventListener('focus', handleResume);
}


