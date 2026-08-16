// Dynamic Binaural Beats Generator - shared AudioContext engine

import {
  getSharedAudioContext,
  getBinauralAudioBus,
  createLoopingNoiseSource,
  DEFAULT_BINAURAL_GAIN,
  setBinauralMixActive,
} from '@/lib/audio';
import {
  getBinauralWatchdogMs,
  isIOSDevice,
  isLegacyMobile,
  isMobileDevice,
} from '@/lib/perfMode';

let oscL: OscillatorNode | null = null;
let oscR: OscillatorNode | null = null;
let oscL2: OscillatorNode | null = null;
let oscR2: OscillatorNode | null = null;
let noiseNode: AudioBufferSourceNode | null = null;
let gainNode: GainNode | null = null;
let lowpassFilter: BiquadFilterNode | null = null;
let activeNodes: AudioNode[] = [];
let activeTrackId: string | null = null;
let lastPlayedParam: string | BinauralBeatConfig | null = null;
let lastPlayedVolume = DEFAULT_BINAURAL_GAIN;
let lifecycleInitialized = false;
let wakeLockSentinel: WakeLockSentinel | null = null;
let resumeInFlight = false;

function dispatchBinauralStateChange() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('binaural-state-change'));
}

async function acquireWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLockSentinel = await navigator.wakeLock.request('screen');
    wakeLockSentinel.addEventListener('release', () => {
      wakeLockSentinel = null;
    });
  } catch (_) {}
}

function releaseWakeLock() {
  wakeLockSentinel?.release().catch(() => {});
  wakeLockSentinel = null;
}

function restartIfNeeded(force = false) {
  if (!activeTrackId || !lastPlayedParam) return;

  const ctx = getSharedAudioContext();
  const needsRestart =
    force ||
    ctx.state === 'suspended' ||
    (isIOSDevice() && (!oscL || !oscR));

  if (!needsRestart) return;

  resumeInFlight = true;
  const resumePromise =
    ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();

  resumePromise
    .then(() => {
      if (!activeTrackId || !lastPlayedParam) return;
      if (ctx.state !== 'running') {
        playBinauralBeatInternal(lastPlayedParam, lastPlayedVolume, true);
        return;
      }
      if (force || isIOSDevice()) {
        playBinauralBeatInternal(lastPlayedParam, lastPlayedVolume, true);
      }
    })
    .catch((err) => {
      console.warn('[BinauralEngine] Resume/restart failed:', err);
    })
    .finally(() => {
      resumeInFlight = false;
    });
}

export function ensureBinauralAlive() {
  if (!activeTrackId) return;
  restartIfNeeded();
}

export function isBinauralPlaying(): boolean {
  return activeTrackId !== null;
}

export function initBinauralLifecycle() {
  if (lifecycleInitialized || typeof window === 'undefined') return;
  lifecycleInitialized = true;

  const handleResume = () => {
    if (document.visibilityState === 'hidden') return;
    ensureBinauralAlive();
  };

  document.addEventListener('visibilitychange', handleResume);
  window.addEventListener('pageshow', handleResume);
  window.addEventListener('focus', handleResume);

  const touchResume = () => {
    if (isBinauralPlaying()) ensureBinauralAlive();
  };
  window.addEventListener('touchstart', touchResume, { passive: true });

  if ('wakeLock' in navigator) {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && isBinauralPlaying()) {
        acquireWakeLock();
      }
    });
  }

  window.setInterval(() => {
    if (!isBinauralPlaying() || resumeInFlight) return;
    const ctx = getSharedAudioContext();
    if (ctx.state === 'suspended') {
      restartIfNeeded(true);
    }
  }, getBinauralWatchdogMs());

  try {
    const ctx = getSharedAudioContext();
    ctx.addEventListener('statechange', () => {
      if (!isBinauralPlaying()) return;
      if (ctx.state === 'running') {
        restartIfNeeded(isIOSDevice());
      }
    });
  } catch (_) {}
}

export const BINAURAL_FREQS = {
  trinity: { name: '차분한 집중 (528Hz)', carrier: 528, beat: 10, desc: '머릿속을 가라앉히고 오늘 할 일에 집중하기 좋아요' },
  orange: { name: '아이디어 몰입 (200Hz)', carrier: 200, beat: 40, desc: '생각을 정리하고 작업에 몰입하기 좋아요' },
  muse: { name: '창작 집중 (432Hz)', carrier: 432, beat: 6, desc: '창작 전 마음을 가라앉히고 영감을 끌어올려요' },
  bluebird: { name: '마음 안정 (396Hz)', carrier: 396, beat: 4, desc: '불안할 때 호흡을 고르고 쉬어 가기 좋아요' },
  heal: { name: '몸 풀기 (639Hz)', carrier: 639, beat: 8, desc: '긴장을 풀고 컨디션을 회복하는 데 도움이 돼요' },
} as const;

export interface BinauralBeatConfig {
  id: string;
  name: string;
  carrier: number;
  beat: number;
  desc: string;
  category: 'trinity' | 'orange' | 'muse' | 'bluebird' | 'heal';
  timestamp: number;
  isCustom?: boolean;
}

function disconnectNodes(nodes: AudioNode[]) {
  nodes.forEach((node) => {
    try {
      if ('stop' in node && typeof (node as AudioBufferSourceNode).stop === 'function') {
        (node as AudioBufferSourceNode).stop();
      }
    } catch (_) {}
    try {
      node.disconnect();
    } catch (_) {}
  });
}

function playBinauralBeatInternal(
  param: string | BinauralBeatConfig,
  volume: number = DEFAULT_BINAURAL_GAIN,
  skipStop = false,
) {
  if (!skipStop) {
    stopBinauralBeat();
  } else {
    disconnectNodes([...activeNodes]);
    activeNodes = [];
    oscL = null;
    oscR = null;
    oscL2 = null;
    oscR2 = null;
    noiseNode = null;
    gainNode = null;
    lowpassFilter = null;
  }

  try {
    let config: { name: string; carrier: number; beat: number; desc: string } | undefined;
    let trackId = '';

    if (typeof param === 'string') {
      config = BINAURAL_FREQS[param as keyof typeof BINAURAL_FREQS];
      trackId = param;
    } else {
      config = param;
      trackId = param.id;
    }

    if (!config) return;

    const audioCtx = getSharedAudioContext();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const outputBus = getBinauralAudioBus();
    const now = audioCtx.currentTime;
    const nodes: AudioNode[] = [];
    const useLightweightMix = isMobileDevice();

    gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(skipStop ? Math.max(0.0002, volume) : 0.0001, now);
    nodes.push(gainNode);

    lowpassFilter = audioCtx.createBiquadFilter();
    lowpassFilter.type = 'lowpass';
    lowpassFilter.frequency.setValueAtTime(useLightweightMix ? 520 : 620, now);
    lowpassFilter.Q.setValueAtTime(0.5, now);
    nodes.push(lowpassFilter);

    const usePanner = typeof audioCtx.createStereoPanner === 'function';
    let pannerL: StereoPannerNode | null = null;
    let pannerR: StereoPannerNode | null = null;

    if (usePanner) {
      pannerL = audioCtx.createStereoPanner();
      pannerL.pan.setValueAtTime(-0.85, now);
      pannerR = audioCtx.createStereoPanner();
      pannerR.pan.setValueAtTime(0.85, now);
      nodes.push(pannerL, pannerR);
    }

    oscL = audioCtx.createOscillator();
    oscL.type = 'sine';
    oscL.frequency.setValueAtTime(config.carrier, now);

    oscR = audioCtx.createOscillator();
    oscR.type = 'sine';
    oscR.frequency.setValueAtTime(config.carrier + config.beat, now);

    nodes.push(oscL, oscR);

    if (!useLightweightMix) {
      oscL2 = audioCtx.createOscillator();
      oscL2.type = 'sine';
      oscL2.frequency.setValueAtTime(config.carrier * 2, now);
      const harmonicGainL = audioCtx.createGain();
      harmonicGainL.gain.setValueAtTime(0.04, now);

      oscR2 = audioCtx.createOscillator();
      oscR2.type = 'sine';
      oscR2.frequency.setValueAtTime((config.carrier + config.beat) * 2, now);
      const harmonicGainR = audioCtx.createGain();
      harmonicGainR.gain.setValueAtTime(0.04, now);

      nodes.push(oscL2, oscR2, harmonicGainL, harmonicGainR);

      if (usePanner && pannerL && pannerR) {
        oscL.connect(pannerL);
        oscL2.connect(harmonicGainL);
        harmonicGainL.connect(pannerL);
        pannerL.connect(lowpassFilter);

        oscR.connect(pannerR);
        oscR2.connect(harmonicGainR);
        harmonicGainR.connect(pannerR);
        pannerR.connect(lowpassFilter);
      } else {
        const merger = audioCtx.createChannelMerger(2);
        nodes.push(merger);
        oscL.connect(merger, 0, 0);
        oscR.connect(merger, 0, 1);
        oscL2.connect(harmonicGainL);
        harmonicGainL.connect(merger, 0, 0);
        oscR2.connect(harmonicGainR);
        harmonicGainR.connect(merger, 0, 1);
        merger.connect(lowpassFilter);
      }
    } else if (usePanner && pannerL && pannerR) {
      oscL.connect(pannerL);
      pannerL.connect(lowpassFilter);
      oscR.connect(pannerR);
      pannerR.connect(lowpassFilter);
    } else {
      const merger = audioCtx.createChannelMerger(2);
      nodes.push(merger);
      oscL.connect(merger, 0, 0);
      oscR.connect(merger, 0, 1);
      merger.connect(lowpassFilter);
    }

    if (!useLightweightMix) {
      try {
        noiseNode = createLoopingNoiseSource(audioCtx, 'brown', 10);
        const noiseGainNode = audioCtx.createGain();
        noiseGainNode.gain.setValueAtTime(0.012, now);
        const noiseFilter = audioCtx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(220, now);
        noiseFilter.Q.setValueAtTime(0.4, now);

        noiseNode.connect(noiseFilter);
        noiseFilter.connect(noiseGainNode);
        noiseGainNode.connect(lowpassFilter);
        nodes.push(noiseNode, noiseFilter, noiseGainNode);
        noiseNode.start(now);
      } catch (noiseErr) {
        console.warn('[BinauralEngine] Noise layer skipped:', noiseErr);
      }
    }

    lowpassFilter.connect(gainNode);
    gainNode.connect(outputBus);

    oscL.start(now);
    oscR.start(now);
    if (oscL2) oscL2.start(now);
    if (oscR2) oscR2.start(now);

    if (!skipStop) {
      gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), now + 1.4);
    }

    activeNodes = nodes;
    activeTrackId = trackId;
    lastPlayedParam = param;
    lastPlayedVolume = volume;
    setBinauralMixActive(true);
    acquireWakeLock();
    dispatchBinauralStateChange();
  } catch (err) {
    console.error('[BinauralEngine] Synthesis failed:', err);
  }
}

export function playBinauralBeat(param: string | BinauralBeatConfig, volume: number = DEFAULT_BINAURAL_GAIN) {
  playBinauralBeatInternal(param, volume, false);
}

export function stopBinauralBeat() {
  const currentGain = gainNode;
  const ctx = getSharedAudioContext();
  const nodesToStop = [...activeNodes];
  activeTrackId = null;
  activeNodes = [];
  lastPlayedParam = null;
  releaseWakeLock();

  if (currentGain) {
    try {
      const now = ctx.currentTime;
      currentGain.gain.cancelScheduledValues(now);
      currentGain.gain.setValueAtTime(Math.max(currentGain.gain.value, 0.0001), now);
      currentGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      setTimeout(() => disconnectNodes(nodesToStop), 320);
    } catch (_) {
      disconnectNodes(nodesToStop);
    }
  } else {
    disconnectNodes(nodesToStop);
  }

  oscL = null;
  oscR = null;
  oscL2 = null;
  oscR2 = null;
  noiseNode = null;
  gainNode = null;
  lowpassFilter = null;
  setBinauralMixActive(false);
  dispatchBinauralStateChange();
}

export function getActiveBinauralDappId() {
  if (!activeTrackId) return null;
  if (activeTrackId in BINAURAL_FREQS) return activeTrackId;
  if (activeTrackId.startsWith('custom_')) {
    const item = getCustomBinauralBeats().find(b => b.id === activeTrackId);
    return item ? item.category : 'heal';
  }
  return 'heal';
}

export function getActiveBinauralTrackId() {
  return activeTrackId;
}

const BROKEN_BINAURAL_LABEL_MARKERS = [
  '생성하지 못했',
  '분석 결과를',
  '잠시 후 다시 시도',
  '다시 시도해',
  '시스템 주파수 조정 안내',
  'ai 서비스',
  '연결 및 호출',
  'unknown error',
  'http error',
  'failed to',
];

export function isBrokenBinauralLabel(text: string | null | undefined): boolean {
  const normalized = String(text ?? '').trim().toLowerCase();
  if (!normalized || normalized.length < 4) return true;
  return BROKEN_BINAURAL_LABEL_MARKERS.some((marker) => normalized.includes(marker));
}

function sanitizeBinauralBeatMeta(
  beat: Omit<BinauralBeatConfig, 'id' | 'timestamp'>,
): Omit<BinauralBeatConfig, 'id' | 'timestamp'> {
  const preset = BINAURAL_FREQS[beat.category];
  const rawName = beat.name?.trim() || preset.name;
  const name = isBrokenBinauralLabel(rawName) ? preset.name : rawName;
  const desc = isBrokenBinauralLabel(beat.desc) ? preset.desc : beat.desc;
  return {
    ...beat,
    name,
    desc,
    carrier: Number.isFinite(beat.carrier) && beat.carrier >= 80 && beat.carrier <= 1200
      ? beat.carrier
      : preset.carrier,
    beat: Number.isFinite(beat.beat) && beat.beat >= 0.5 && beat.beat <= 60
      ? beat.beat
      : preset.beat,
  };
}

export function buildRecommendedBinauralName(
  appId: BinauralBeatConfig['category'],
  bandText: string,
): string {
  const preset = BINAURAL_FREQS[appId];
  const label = isBrokenBinauralLabel(bandText) ? preset.name : bandText.trim();
  return `추천: ${label}`;
}

export function getCustomBinauralBeats(): BinauralBeatConfig[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem('custom_binaural_beats');
    if (!data) return [];
    const parsed = JSON.parse(data) as BinauralBeatConfig[];
    if (!Array.isArray(parsed)) return [];

    const cleaned = parsed
      .filter((beat) => beat && typeof beat === 'object')
      .map((beat) => {
        const category = beat.category in BINAURAL_FREQS
          ? beat.category
          : 'heal';
        return {
          ...sanitizeBinauralBeatMeta({ ...beat, category }),
          id: beat.id,
          timestamp: beat.timestamp,
          isCustom: true,
        };
      })
      .filter((beat) => !isBrokenBinauralLabel(beat.name) && !isBrokenBinauralLabel(beat.desc));

    if (cleaned.length !== parsed.length) {
      try {
        localStorage.setItem('custom_binaural_beats', JSON.stringify(cleaned));
      } catch (_) {}
    }

    return cleaned;
  } catch (_) {
    return [];
  }
}

export function saveCustomBinauralBeat(beat: Omit<BinauralBeatConfig, 'id' | 'timestamp'>): BinauralBeatConfig {
  const sanitized = sanitizeBinauralBeatMeta(beat);
  if (isBrokenBinauralLabel(sanitized.name) || isBrokenBinauralLabel(sanitized.desc)) {
    const preset = BINAURAL_FREQS[sanitized.category];
    sanitized.name = preset.name;
    sanitized.desc = preset.desc;
  }

  const customList = getCustomBinauralBeats();
  const newBeat: BinauralBeatConfig = {
    ...sanitized,
    id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    isCustom: true
  };
  customList.push(newBeat);
  try {
    localStorage.setItem('custom_binaural_beats', JSON.stringify(customList));
  } catch (err) {
    console.error('[BinauralEngine] Failed to save custom beat to localStorage', err);
  }
  return newBeat;
}

export function deleteCustomBinauralBeat(id: string): boolean {
  const customList = getCustomBinauralBeats();
  const filtered = customList.filter(b => b.id !== id);
  const deleted = filtered.length !== customList.length;
  if (deleted) {
    try {
      localStorage.setItem('custom_binaural_beats', JSON.stringify(filtered));
    } catch (_) {}
  }
  return deleted;
}

export function pickRandomBinauralTrack(
  tracks: BinauralBeatConfig[],
  excludeId?: string | null,
): BinauralBeatConfig | null {
  if (!tracks.length) return null;
  const pool =
    excludeId && tracks.length > 1
      ? tracks.filter((track) => track.id !== excludeId)
      : tracks;
  const source = pool.length > 0 ? pool : tracks;
  return source[Math.floor(Math.random() * source.length)] ?? null;
}

export function getBinauralBeatsForApp(appId: 'trinity' | 'orange' | 'muse' | 'bluebird' | 'heal'): BinauralBeatConfig[] {
  const preset = BINAURAL_FREQS[appId];
  const presetWithId: BinauralBeatConfig = {
    id: appId,
    name: preset.name,
    carrier: preset.carrier,
    beat: preset.beat,
    desc: preset.desc,
    category: appId,
    timestamp: 0
  };

  const customs = getCustomBinauralBeats().filter(b => b.category === appId);
  customs.sort((a, b) => b.timestamp - a.timestamp);

  return [presetWithId, ...customs];
}