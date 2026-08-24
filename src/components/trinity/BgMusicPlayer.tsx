import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Disc, SkipForward, Volume2, VolumeX, ChevronLeft, ChevronRight, ChevronDown, Music, Headphones, Shuffle, Repeat, Repeat1, RefreshCw, Trash2, EyeOff, RotateCcw } from "lucide-react";
import {
  getSharedAudioContext,
  getAmbientAudioBus,
  getMasterAudioBus,
  createLoopingNoiseSource,
  AMBIENT_MASTER_GAIN_SCALE,
  BGM_HTML_GAIN_SCALE,
  type NoiseColor,
} from "@/lib/audio";
import { getMaxSynthVoices, shouldPreloadBgmAudio } from "@/lib/perfMode";
import {
  getBgmTrackId,
  hideBgmTrack,
  hydratePersistedBgmTracks,
  isBgmTrackHidden,
  loadHiddenBgmTracks,
  loadPersistedExtraBgmTracks,
  removePersistedExtraBgmTrackByKey,
  resolveBgmPlaybackUrl,
  savePersistedExtraBgmTracks,
  toPersistedBgmUrl,
  needsBgmUrlResolution,
  isPersistedBgmRef,
  permanentlyDeleteBgmTrack,
  restoreBgmTrackAvailability,
  unhideBgmTrack,
  type HiddenBgmTrack,
  type PersistedBgmTrack,
} from "@/lib/dailyBgm";

type BgmTrack = {
  name: string;
  url: string;
  artist?: string;
  trackKey?: string;
};

type RepeatMode = "off" | "one" | "all";

const SYNTH_SEGMENT_SEC = 60;

const REPEAT_MODE_LABEL: Record<RepeatMode, string> = {
  off: "반복 끔",
  one: "1곡 반복",
  all: "전체 반복",
};

// The premium track library - utilizing 20 Procedural WebAudio synths (guaranteed to work 100%)
const AUDIO_TRACKS: BgmTrack[] = [
  { name: "Space Ambient Pad (Synth)", url: "synth-space", artist: "Lucy Procedural Suite" },
  { name: "Cozy Rain & Soft Chords (Synth)", url: "synth-rain", artist: "Lucy Procedural Suite" },
  { name: "Deep Ocean Waves (Synth)", url: "synth-ocean", artist: "Lucy Procedural Suite" },
  { name: "Zen Wind & Windchimes (Synth)", url: "synth-wind", artist: "Lucy Procedural Suite" },
  { name: "Lofi Meditative Pads (Synth)", url: "synth-lofi", artist: "Lucy Procedural Suite" },
  { name: "Celestial Harps (Synth)", url: "synth-harp", artist: "Lucy Procedural Suite" },
  { name: "Deep Heartbeat Resonance (Synth)", url: "synth-heart", artist: "Lucy Procedural Suite" },
  { name: "Forest Birdsong Breeze (Synth)", url: "synth-birds", artist: "Lucy Procedural Suite" },
  { name: "Dreamy Cosmic Aurora (Synth)", url: "synth-aurora", artist: "Lucy Procedural Suite" },
  { name: "Temple Singing Bowls (Synth)", url: "synth-bowls", artist: "Lucy Procedural Suite" },
  { name: "Moonlight Piano Glow (Synth)", url: "synth-moonlight", artist: "Lucy Procedural Suite" },
  { name: "Campfire Warmth & Crackle (Synth)", url: "synth-campfire", artist: "Lucy Procedural Suite" },
  { name: "Stargazing Night Sky (Synth)", url: "synth-stars", artist: "Lucy Procedural Suite" },
  { name: "Crystal Cave Echoes (Synth)", url: "synth-crystal", artist: "Lucy Procedural Suite" },
  { name: "Sakura Garden Breeze (Synth)", url: "synth-sakura", artist: "Lucy Procedural Suite" },
  { name: "Nebula Drift Horizon (Synth)", url: "synth-nebula", artist: "Lucy Procedural Suite" },
  { name: "Mountain Stream Flow (Synth)", url: "synth-river", artist: "Lucy Procedural Suite" },
  { name: "Lucid Dream Theta Waves (Synth)", url: "synth-dream", artist: "Lucy Procedural Suite" },
  { name: "Sacred Om Mantra Hum (Synth)", url: "synth-mantra", artist: "Lucy Procedural Suite" },
  { name: "Silent Snowfall Bells (Synth)", url: "synth-snow", artist: "Lucy Procedural Suite" },
];

// Synth Scales
const PENTATONIC_SCALE = [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00];

function shuffleTrackIndices(length: number): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildNextShuffleOrder(trackCount: number, avoidIndex: number): number[] {
  let nextShuffled = shuffleTrackIndices(trackCount);
  if (trackCount > 1 && nextShuffled[0] === avoidIndex) {
    const swapWith = nextShuffled.findIndex((idx, i) => i > 0 && idx !== avoidIndex);
    if (swapWith > 0) {
      [nextShuffled[0], nextShuffled[swapWith]] = [nextShuffled[swapWith], nextShuffled[0]];
    }
  }
  return nextShuffled;
}

function buildInitialTrackLibrary(): BgmTrack[] {
  restoreBgmTrackAvailability("synth-snow");
  const extra = loadPersistedExtraBgmTracks().filter((track) => !isBgmTrackHidden(track));
  const merged = AUDIO_TRACKS.filter((track) => !isBgmTrackHidden(track));
  extra.forEach((track) => {
    if (!merged.some((item) => item.trackKey && item.trackKey === track.trackKey)) {
      merged.push(track);
    }
  });
  return merged.length > 0 ? merged : [...AUDIO_TRACKS];
}

interface LPRecordDiscProps {
  isPlaying: boolean;
  isBuffering?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LPRecordDisc({
  isPlaying,
  isBuffering = false,
  size = 'md',
  className = '',
}: LPRecordDiscProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-11 h-11',
  }[size];

  const labelSizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4.5 h-4.5',
    lg: 'w-5 h-5',
  }[size];

  const holeSizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-1.5 h-1.5',
  }[size];

  return (
    <div
      className={`lp-vinyl-disc ${sizeClasses} relative flex items-center justify-center shrink-0 cursor-pointer ${className}`}
    >
      {/* Vinyl Grooves & Conic Specular Reflection Sheen */}
      <div
        className={`lp-vinyl-grooves ${
          isPlaying && !isBuffering ? 'lp-spinning' : 'lp-paused'
        }`}
      />

      {/* Decorative concentric groove rings */}
      <div className="absolute inset-1 rounded-full border border-white/10 pointer-events-none" />
      <div className="absolute inset-2.5 rounded-full border border-white/5 pointer-events-none" />

      {/* Center Label (Prismatic Vinyl Sticker) */}
      <div
        className={`relative z-10 ${labelSizeClasses} rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-500 flex items-center justify-center shadow-sm ${
          isPlaying && !isBuffering ? 'lp-spinning' : 'lp-paused'
        }`}
      >
        {/* Center Spindle Hole */}
        <div className={`${holeSizeClasses} rounded-full bg-zinc-950 border border-white/40 shadow-inner`} />
      </div>

      {/* Tone Arm Stylus Needle Indicator */}
      <div
        className={`absolute top-0.5 right-1 w-2.5 h-3.5 transition-transform duration-500 origin-top-right pointer-events-none z-20 ${
          isPlaying && !isBuffering
            ? 'rotate-12 translate-x-0'
            : '-rotate-25 translate-x-1 opacity-60'
        }`}
      >
        <div className="w-[1.5px] h-3 bg-gradient-to-b from-white/90 via-zinc-400 to-amber-300 rounded-full shadow-sm" />
        <div className="w-1 h-1 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.9)] -ml-[1px]" />
      </div>

      {/* Buffering Indicator Overlay */}
      {isBuffering && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] rounded-full flex items-center justify-center z-30">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />
        </div>
      )}
    </div>
  );
}

export function BgMusicPlayer() {
  // --- PLAYER STATES ---
  const [tracks, setTracks] = useState(buildInitialTrackLibrary);
  const [shuffledIndices, setShuffledIndices] = useState(() =>
    shuffleTrackIndices(buildInitialTrackLibrary().length),
  );
  const [queueIndex, setQueueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(() => {
    try {
      const saved = localStorage.getItem('prism_bgm_playing');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const isPlayingRef = useRef(isPlaying);
  const [isBuffering, setIsBuffering] = useState(false);
  const [volume, setVolume] = useState(() => {
    try {
      const saved = localStorage.getItem('prism_bgm_volume');
      return saved !== null ? parseFloat(saved) : 1.0;
    } catch {
      return 1.0;
    }
  });
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem('prism_bgm_muted') === 'true';
    } catch {
      return false;
    }
  });
  
  // Custom Controls
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("all");
  const [isShuffle, setIsShuffle] = useState(true);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showHiddenTracks, setShowHiddenTracks] = useState(false);
  const [hiddenTracks, setHiddenTracks] = useState<HiddenBgmTrack[]>(() => loadHiddenBgmTracks());
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isPanelActive, setIsPanelActive] = useState(() => !!(window as any).__lucy_active_panel);

  useEffect(() => {
    const handlePanelChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsPanelActive(!!customEvent.detail);
    };
    window.addEventListener("lucy-active-panel-change", handlePanelChange);
    return () => {
      window.removeEventListener("lucy-active-panel-change", handlePanelChange);
    };
  }, []);

  // --- REFS ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadedUrlRef = useRef<string>("");
  const isPlayInitiatedRef = useRef<string>("");
  const masterGainRef = useRef<GainNode | null>(null);
  const htmlGainRef = useRef<GainNode | null>(null);
  const htmlSourceConnectedRef = useRef(false);
  const activeNodesRef = useRef<any[]>([]);
  const activeVoiceCountRef = useRef(0);
  const synthIntervalRef = useRef<any>(null);
  const secondarySynthIntervalRef = useRef<any>(null);
  const synthAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatModeRef = useRef<RepeatMode>("all");
  const isShuffleRef = useRef(true);
  const queueIndexRef = useRef(0);
  const handleTrackEndedRef = useRef<() => void>(() => {});
  const volumeRef = useRef<HTMLDivElement | null>(null);
  const tracksRef = useRef(tracks);
  const shuffledIndicesRef = useRef(shuffledIndices);
  const activeTrackIndexRef = useRef(0);
  const handleSelectTrackRef = useRef<(trackIndex: number) => void>(() => {});
  const queueAndPlayTrackRef = useRef<(trackIndex: number) => void>(() => {});
  const resolvePlaybackUrlRef = useRef<(url: string, trackKey?: string) => Promise<string | null>>(
    async (url) => url,
  );
  const playbackGenerationRef = useRef(0);
  const skipUnresolvableTrackRef = useRef<(trackIndex: number) => void>(() => {});

  const getActiveTrack = () =>
    tracksRef.current[activeTrackIndexRef.current] || tracksRef.current[0];

  const isTrackAlreadyPlaying = (trackIndex: number): boolean => {
    if (!isPlayingRef.current) return false;
    if (activeTrackIndexRef.current !== trackIndex) return false;

    const track = tracksRef.current[trackIndex];
    if (!track) return false;

    if (track.url.startsWith("synth")) {
      return (
        isPlayInitiatedRef.current === track.url &&
        (masterGainRef.current !== null || synthIntervalRef.current !== null || secondarySynthIntervalRef.current !== null || activeNodesRef.current.length > 0)
      );
    }

    const audio = audioRef.current;
    if (!audio) return false;
    return (
      !audio.paused &&
      loadedUrlRef.current.length > 0 &&
      isPlayInitiatedRef.current === loadedUrlRef.current
    );
  };

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    shuffledIndicesRef.current = shuffledIndices;
  }, [shuffledIndices]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    isShuffleRef.current = isShuffle;
  }, [isShuffle]);

  useEffect(() => {
    queueIndexRef.current = queueIndex;
  }, [queueIndex]);

  useEffect(() => {
    if (repeatMode === "one") {
      clearSynthAdvanceTimer();
      return;
    }
    if (isPlayingRef.current && getActiveTrack().url.startsWith("synth")) {
      scheduleSynthAdvance();
    }
  }, [repeatMode]);

  useEffect(() => {
    if (showPlaylist) {
      setHiddenTracks(loadHiddenBgmTracks());
    } else {
      setShowHiddenTracks(false);
    }
  }, [showPlaylist]);

  // Get current active track (UI may lag one frame behind activeTrackIndexRef)
  const currentTrackIndex = shuffledIndices[queueIndex] ?? activeTrackIndexRef.current;
  const currentTrack = tracks[currentTrackIndex] || getActiveTrack();

  // --- SHUFFLE HELPER ---
  const shuffleList = (length: number, excludeIndex: number) => {
    const indices = Array.from({ length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    if (excludeIndex >= 0) {
      const currentPos = indices.indexOf(excludeIndex);
      if (currentPos >= 0) {
        indices.splice(currentPos, 1);
        indices.unshift(excludeIndex);
      }
    }
    return indices;
  };

  const handleToggleShuffle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsShuffle(prev => {
      const next = !prev;
      if (next) {
        setShuffledIndices(shuffleList(tracks.length, currentTrackIndex));
        setQueueIndex(0);
      } else {
        const originalIndices = tracks.map((_, i) => i);
        setShuffledIndices(originalIndices);
        setQueueIndex(currentTrackIndex);
      }
      return next;
    });
  };

  const handleCollapse = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setShowPlaylist(false);
    setShowVolumeSlider(false);
    setIsCollapsed(true);
  };

  const handleExpandPlayer = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsCollapsed(false);
    setShowPlaylist(false);
    setShowVolumeSlider(false);
  };

  const handleToggleRepeat = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRepeatMode((prev) => {
      if (prev === "off") return "one";
      if (prev === "one") return "all";
      return "off";
    });
  };

  const createNoiseNode = (ctx: AudioContext, type: NoiseColor) => {
    return createLoopingNoiseSource(ctx, type, 10);
  };

  const clearSynthAdvanceTimer = () => {
    if (synthAdvanceTimerRef.current) {
      clearTimeout(synthAdvanceTimerRef.current);
      synthAdvanceTimerRef.current = null;
    }
  };

  const scheduleSynthAdvance = () => {
    clearSynthAdvanceTimer();
    if (!isPlayingRef.current || repeatModeRef.current === "one") return;

    synthAdvanceTimerRef.current = setTimeout(() => {
      if (!isPlayingRef.current) return;
      handleTrackEndedRef.current();
    }, SYNTH_SEGMENT_SEC * 1000);
  };

  // --- PROCEDURAL SOUND OVERHAUL ---
  const stopProceduralSynth = () => {
    clearSynthAdvanceTimer();
    if (synthIntervalRef.current) {
      clearInterval(synthIntervalRef.current);
      synthIntervalRef.current = null;
    }
    if (secondarySynthIntervalRef.current) {
      clearInterval(secondarySynthIntervalRef.current);
      secondarySynthIntervalRef.current = null;
    }

    activeNodesRef.current.forEach((node) => {
      try {
        if (typeof (node as any).stop === 'function') (node as any).stop(0);
      } catch (_) {}
      try {
        if (typeof (node as any).disconnect === 'function') (node as any).disconnect();
      } catch (_) {}
    });
    activeNodesRef.current = [];
    activeVoiceCountRef.current = 0;

    if (masterGainRef.current) {
      try {
        const ctx = getSharedAudioContext();
        masterGainRef.current.gain.cancelScheduledValues(ctx.currentTime);
        masterGainRef.current.gain.setValueAtTime(0, ctx.currentTime);
        masterGainRef.current.disconnect();
      } catch (_) {}
      masterGainRef.current = null;
    }
  };

  const pausePlayback = () => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setIsBuffering(false);
    isPlayInitiatedRef.current = "";
    try {
      localStorage.setItem('prism_bgm_playing', 'false');
    } catch (_) {}

    const audio = audioRef.current;
    if (audio) {
      try {
        if (!audio.paused) audio.pause();
      } catch (_) {}
    }
    if (htmlGainRef.current) {
      try {
        const ctx = getSharedAudioContext();
        htmlGainRef.current.gain.cancelScheduledValues(ctx.currentTime);
        htmlGainRef.current.gain.setValueAtTime(0, ctx.currentTime);
      } catch (_) {}
    }
    stopProceduralSynth();
  };

  const startProceduralSynth = (type: string) => {
    stopProceduralSynth();
    if (!isPlayingRef.current) return;

    try {
      const ctx = getSharedAudioContext();
      if (ctx.state === 'suspended') {
        const handleStateChange = () => {
          if (ctx.state === 'running') {
            ctx.removeEventListener('statechange', handleStateChange);
            if (isPlayingRef.current && isPlayInitiatedRef.current === type) {
              startProceduralSynth(type);
            }
          }
        };
        ctx.addEventListener('statechange', handleStateChange);
      }
      const ambientBus = getAmbientAudioBus();

      const registerDynamicVoice = (nodes: AudioNode[], stopDelaySeconds: number) => {
        if (!isPlayingRef.current || activeVoiceCountRef.current >= getMaxSynthVoices()) {
          nodes.forEach((node) => {
            try {
              if ('stop' in node) (node as AudioBufferSourceNode).stop(0);
            } catch (_) {}
            try {
              node.disconnect();
            } catch (_) {}
          });
          return;
        }

        activeVoiceCountRef.current += 1;
        activeNodesRef.current.push(...nodes);

        window.setTimeout(() => {
          nodes.forEach((node) => {
            try {
              if ('stop' in node) (node as AudioBufferSourceNode).stop(0);
            } catch (_) {}
            try {
              node.disconnect();
            } catch (_) {}
            activeNodesRef.current = activeNodesRef.current.filter((n) => n !== node);
          });
          activeVoiceCountRef.current = Math.max(0, activeVoiceCountRef.current - 1);
        }, (stopDelaySeconds + 0.35) * 1000);
      };

      if (!masterGainRef.current || masterGainRef.current.context !== ctx) {
        masterGainRef.current = ctx.createGain();
      }
      const masterGain = masterGainRef.current;
      masterGain.disconnect();

      const softLimiter = ctx.createDynamicsCompressor();
      softLimiter.threshold.setValueAtTime(-20, ctx.currentTime);
      softLimiter.knee.setValueAtTime(12, ctx.currentTime);
      softLimiter.ratio.setValueAtTime(2, ctx.currentTime);
      softLimiter.attack.setValueAtTime(0.008, ctx.currentTime);
      softLimiter.release.setValueAtTime(0.2, ctx.currentTime);

      masterGain.connect(softLimiter);
      softLimiter.connect(ambientBus);
      activeNodesRef.current.push(softLimiter);

      const targetVol = isMuted ? 0 : volume;
      masterGain.gain.setValueAtTime(targetVol * AMBIENT_MASTER_GAIN_SCALE, ctx.currentTime);

      // --- ADVANCED AUDIO ROUTING UTILITIES ---

      // 1. Spacious Stereo Auto-Panner with dynamic LFO sweep
      const createAutoPanner = (speedHz: number, panDepth: number) => {
        if (!ctx.createStereoPanner) return masterGain;
        const panner = ctx.createStereoPanner();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();

        lfo.frequency.setValueAtTime(speedHz, ctx.currentTime);
        lfoGain.gain.setValueAtTime(panDepth, ctx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(panner.pan);
        panner.connect(masterGain);
        lfo.start();

        activeNodesRef.current.push(panner, lfo, lfoGain);
        return panner;
      };

      // 2. High-Fidelity Feedback Delay Matrix
      const createDelay = (delayTime: number, feedback: number, wet: number) => {
        const delayNode = ctx.createDelay(2.0);
        delayNode.delayTime.setValueAtTime(delayTime, ctx.currentTime);

        const feedbackGain = ctx.createGain();
        feedbackGain.gain.setValueAtTime(feedback, ctx.currentTime);

        const wetGain = ctx.createGain();
        wetGain.gain.setValueAtTime(wet, ctx.currentTime);

        // Feedback routing
        delayNode.connect(feedbackGain);
        feedbackGain.connect(delayNode);

        // Routing path to master output
        delayNode.connect(wetGain);
        wetGain.connect(masterGain);

        activeNodesRef.current.push(delayNode, feedbackGain, wetGain);
        return delayNode;
      };

      // --- PROCEDURAL SYNTHESIZER MODELS ---

      // 1. SPACE AMBIENT PAD (Rich, sweeping multi-voice pad)
      if (type === "synth-space") {
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.Q.setValueAtTime(1.0, ctx.currentTime); // Lower Q resonance to avoid buzzing peaks

        // Slowly sweep lowpass cutoff over a 16-second cycle for cosmic movement
        const sweepLfo = ctx.createOscillator();
        const sweepGain = ctx.createGain();
        sweepLfo.frequency.setValueAtTime(0.062, ctx.currentTime);
        sweepGain.gain.setValueAtTime(120, ctx.currentTime); // filter drift range (Hz)
        
        sweepLfo.connect(sweepGain);
        sweepGain.connect(filter.frequency);
        filter.frequency.setValueAtTime(280, ctx.currentTime); // Mid-frequency baseline
        sweepLfo.start();

        const panner = createAutoPanner(0.045, 0.45); // Space drift panning
        filter.connect(panner);
        activeNodesRef.current.push(filter, sweepLfo, sweepGain);

        // Spacious celestial echo
        const spaceDelay = createDelay(0.85, 0.52, 0.22);

        const playSpaceNote = () => {
          const now = ctx.currentTime;
          const notes = [
            PENTATONIC_SCALE[Math.floor(Math.random() * 5)], 
            PENTATONIC_SCALE[Math.floor(Math.random() * 5) + 5]
          ];
          
          notes.forEach(freq => {
            const voiceGain = ctx.createGain();
            voiceGain.connect(filter);
            voiceGain.connect(spaceDelay); // Feed into delay matrix

            voiceGain.gain.setValueAtTime(0, now);
            voiceGain.gain.linearRampToValueAtTime(0.025, now + 3.2); // Smooth cozy attack
            voiceGain.gain.setValueAtTime(0.025, now + 5.0);
            voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + 11.5); // Warm, fading tail

            // DETUNED UNISON CHORUS EFFECT with pure sine waves for absolutely zero crackle
            const oscLeft = ctx.createOscillator();
            const oscCenter = ctx.createOscillator();
            const oscRight = ctx.createOscillator();

            oscLeft.type = "sine";
            oscLeft.frequency.setValueAtTime(freq, now);
            oscLeft.detune.setValueAtTime(-9, now);

            oscCenter.type = "sine";
            oscCenter.frequency.setValueAtTime(freq, now);

            oscRight.type = "sine";
            oscRight.frequency.setValueAtTime(freq, now);
            oscRight.detune.setValueAtTime(9, now);

            oscLeft.connect(voiceGain);
            oscCenter.connect(voiceGain);
            oscRight.connect(voiceGain);

            oscLeft.start(now);
            oscCenter.start(now);
            oscRight.start(now);

            oscLeft.stop(now + 11.8);
            oscCenter.stop(now + 11.8);
            oscRight.stop(now + 11.8);

            registerDynamicVoice([oscLeft, oscCenter, oscRight, voiceGain], 11.8);
          });
        };
        playSpaceNote();
        synthIntervalRef.current = setInterval(playSpaceNote, 6500);
      }

      // 2. COZY RAIN & SOFT CHORDS (Layered cozy micro-droplets & wow/flutter piano vibes)
      else if (type === "synth-rain") {
        // Deep basement rain (very soft natural brown noise rumble)
        const rainBrown = createNoiseNode(ctx, "brown");
        const rainFilterP = ctx.createBiquadFilter();
        const rainGainP = ctx.createGain();
        
        rainFilterP.type = "lowpass";
        rainFilterP.frequency.setValueAtTime(350, ctx.currentTime);
        rainBrown.connect(rainFilterP);
        rainFilterP.connect(rainGainP);
        rainGainP.connect(masterGain);
        rainGainP.gain.setValueAtTime(0.02, ctx.currentTime); // very quiet and calming

        rainBrown.start();
        activeNodesRef.current.push(rainBrown, rainFilterP, rainGainP);

        // Organic wow-and-flutter tape oscillator for piano stability drift
        const tapeWowLfo = ctx.createOscillator();
        const tapeWowGain = ctx.createGain();
        tapeWowLfo.frequency.setValueAtTime(4.2, ctx.currentTime); // wow wobble rate
        tapeWowGain.gain.setValueAtTime(3.2, ctx.currentTime); // detune range (cents)
        tapeWowLfo.connect(tapeWowGain);
        tapeWowLfo.start();
        activeNodesRef.current.push(tapeWowLfo, tapeWowGain);

        // Relaxing, rolling chords with analog warmth
        const chords = [
          [174.61, 220.00, 261.63, 329.63], // Fmaj7
          [164.81, 196.00, 246.94, 329.63], // Em7
          [146.83, 174.61, 220.00, 293.66], // Dm7
          [130.81, 164.81, 196.00, 261.63]  // Cmaj7
        ];
        let chordIdx = 0;

        // Soft room echo delay
        const rainDelay = createDelay(1.15, 0.44, 0.18);

        const playRainChord = () => {
          const now = ctx.currentTime;
          const currentChord = chords[chordIdx];
          chordIdx = (chordIdx + 1) % chords.length;

          const cozyFilter = ctx.createBiquadFilter();
          cozyFilter.type = "lowpass";
          cozyFilter.frequency.setValueAtTime(320, now); // warm filtering
          cozyFilter.connect(masterGain);
          cozyFilter.connect(rainDelay);
          registerDynamicVoice([cozyFilter], 8.2);

          currentChord.forEach(freq => {
            const voiceGain = ctx.createGain();
            voiceGain.connect(cozyFilter);

            voiceGain.gain.setValueAtTime(0, now);
            voiceGain.gain.linearRampToValueAtTime(0.02, now + 2.8); // Smooth soft piano touch
            voiceGain.gain.setValueAtTime(0.02, now + 3.8);
            voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + 8.0);

            // Layer detuned Pure Sines for ultimate clean tones
            const oscSineLeft = ctx.createOscillator();
            const oscSineRight = ctx.createOscillator();

            oscSineLeft.type = "sine";
            oscSineLeft.frequency.setValueAtTime(freq, now);
            oscSineLeft.detune.setValueAtTime(-6, now);
            tapeWowGain.connect(oscSineLeft.detune);

            oscSineRight.type = "sine";
            oscSineRight.frequency.setValueAtTime(freq, now);
            oscSineRight.detune.setValueAtTime(6, now);
            tapeWowGain.connect(oscSineRight.detune);

            oscSineLeft.connect(voiceGain);
            oscSineRight.connect(voiceGain);

            oscSineLeft.start(now);
            oscSineRight.start(now);

            oscSineLeft.stop(now + 8.2);
            oscSineRight.stop(now + 8.2);

            registerDynamicVoice([oscSineLeft, oscSineRight, voiceGain], 8.2);
          });
        };
        playRainChord();
        synthIntervalRef.current = setInterval(playRainChord, 7600);
      }

      // 3. DEEP OCEAN WAVES (Cinematic sub drone + dual-frequency out-of-sync stereo waves)
      else if (type === "synth-ocean") {
        // Left Channel Tide generator
        const pannerL = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (pannerL) pannerL.pan.setValueAtTime(-0.82, ctx.currentTime);

        const oceanL = createNoiseNode(ctx, "brown"); // change to brown noise for deeper wave texture without digital buzz
        const filterL = ctx.createBiquadFilter();
        const gainL = ctx.createGain();

        filterL.type = "lowpass";
        filterL.frequency.setValueAtTime(140, ctx.currentTime);
        oceanL.connect(filterL);
        filterL.connect(gainL);
        if (pannerL) {
          gainL.connect(pannerL);
          pannerL.connect(masterGain);
        } else {
          gainL.connect(masterGain);
        }

        // Right Channel Tide generator
        const pannerR = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (pannerR) pannerR.pan.setValueAtTime(0.82, ctx.currentTime);

        const oceanR = createNoiseNode(ctx, "brown");
        const filterR = ctx.createBiquadFilter();
        const gainR = ctx.createGain();

        filterR.type = "lowpass";
        filterR.frequency.setValueAtTime(140, ctx.currentTime);
        oceanR.connect(filterR);
        filterR.connect(gainR);
        if (pannerR) {
          gainR.connect(pannerR);
          pannerR.connect(masterGain);
        } else {
          gainR.connect(masterGain);
        }

        // Out-of-sync ocean tide LFOs for an incredibly immersive, natural beach environment
        const swellLfoL = ctx.createOscillator();
        const swellGainL = ctx.createGain();
        swellLfoL.frequency.setValueAtTime(0.046, ctx.currentTime); // L: Left swell speed (21.7s)
        swellGainL.gain.setValueAtTime(0.012, ctx.currentTime);
        swellLfoL.connect(swellGainL);
        swellGainL.connect(gainL.gain);
        gainL.gain.setValueAtTime(0.02, ctx.currentTime); // ocean swell minimum volume

        const swellLfoR = ctx.createOscillator();
        const swellGainR = ctx.createGain();
        swellLfoR.frequency.setValueAtTime(0.039, ctx.currentTime); // R: Right swell speed (25.6s)
        swellGainR.gain.setValueAtTime(0.012, ctx.currentTime);
        swellLfoR.connect(swellGainR);
        swellGainR.connect(gainR.gain);
        gainR.gain.setValueAtTime(0.02, ctx.currentTime); 

        swellLfoL.start();
        swellLfoR.start();
        oceanL.start();
        oceanR.start();

        activeNodesRef.current.push(
          oceanL, filterL, gainL, pannerL, swellLfoL, swellGainL,
          oceanR, filterR, gainR, pannerR, swellLfoR, swellGainR
        );

        // Huge ocean floor cinematic drone delay
        const subDroneDelay = createDelay(1.5, 0.48, 0.16);

        // Deep warm sub drone (C2 warm chord)
        const playDrone = () => {
          const now = ctx.currentTime;
          const droneFilter = ctx.createBiquadFilter();
          droneFilter.type = "lowpass";
          droneFilter.frequency.setValueAtTime(110, now);
          droneFilter.connect(masterGain);
          droneFilter.connect(subDroneDelay);
          registerDynamicVoice([droneFilter], 14.2);

          [65.41, 98.00, 130.81].forEach(freq => {
            const voiceGain = ctx.createGain();
            voiceGain.connect(droneFilter);

            voiceGain.gain.setValueAtTime(0, now);
            voiceGain.gain.linearRampToValueAtTime(0.025, now + 4.8); // Smooth soft sub drone swell
            voiceGain.gain.setValueAtTime(0.025, now + 6.5);
            voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + 14.0);

            // Detuned pure sines for a highly pure organic drone (no buzz)
            const oscSineLeft = ctx.createOscillator();
            const oscSineRight = ctx.createOscillator();

            oscSineLeft.type = "sine";
            oscSineLeft.frequency.setValueAtTime(freq, now);
            oscSineLeft.detune.setValueAtTime(-5, now);

            oscSineRight.type = "sine";
            oscSineRight.frequency.setValueAtTime(freq, now);
            oscSineRight.detune.setValueAtTime(5, now);

            oscSineLeft.connect(voiceGain);
            oscSineRight.connect(voiceGain);

            oscSineLeft.start(now);
            oscSineRight.start(now);

            oscSineLeft.stop(now + 14.2);
            oscSineRight.stop(now + 14.2);

            registerDynamicVoice([oscSineLeft, oscSineRight, voiceGain], 14.2);
          });
        };
        playDrone();
        synthIntervalRef.current = setInterval(playDrone, 13500);
      }

      // 4. ZEN WIND & WINDCHIMES (Multi-LFO forest breeze & physically-modeled metallic chimes)
      else if (type === "synth-wind") {
        const windBase = createNoiseNode(ctx, "brown"); // brown noise instead of pink noise to prevent any static hiss
        const windBp = ctx.createBiquadFilter();
        const windVol = ctx.createGain();

        windBp.type = "lowpass"; // lowpass instead of bandpass to keep it warm and deep
        windBp.frequency.setValueAtTime(150, ctx.currentTime);

        windBase.connect(windBp);
        windBp.connect(windVol);
        windVol.connect(masterGain);

        windVol.gain.setValueAtTime(0.012, ctx.currentTime); // extremely soft deep rumble breeze
        windBase.start();
        activeNodesRef.current.push(windBase, windBp, windVol);

        // Wind Whistle Sweep LFO
        const whistleLfo = ctx.createOscillator();
        const whistleGain = ctx.createGain();
        whistleLfo.frequency.setValueAtTime(0.045, ctx.currentTime);
        whistleGain.gain.setValueAtTime(80, ctx.currentTime); // swept range
        whistleLfo.connect(whistleGain);
        whistleGain.connect(windBp.frequency);
        whistleLfo.start();
        activeNodesRef.current.push(whistleLfo, whistleGain);

        // Shimmering crystalline delay block
        const bellDelay = createDelay(0.48, 0.58, 0.28);

        // Physically-modeled bell overtone chimers (Aluminum pipe chime physics)
        const chimeNotes = [783.99, 880.00, 987.77, 1174.66, 1318.51, 1567.98];
        const triggerChime = () => {
          const now = ctx.currentTime;
          const fundFreq = chimeNotes[Math.floor(Math.random() * chimeNotes.length)];
          
          const chimeVoice = ctx.createGain();
          
          const chimePanner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
          if (chimePanner) {
            const randPan = Math.random() * 1.5 - 0.75;
            chimePanner.pan.setValueAtTime(randPan, now);
            chimeVoice.connect(chimePanner);
            chimePanner.connect(masterGain);
            chimePanner.connect(bellDelay);
            registerDynamicVoice([chimePanner], 3.4);
          } else {
            chimeVoice.connect(masterGain);
            chimeVoice.connect(bellDelay);
          }

          chimeVoice.gain.setValueAtTime(0, now);
          chimeVoice.gain.linearRampToValueAtTime(0.035, now + 0.015); // Smooth chime impact
          chimeVoice.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

          // Voice 1: Fundamental Timbre (Sine wave)
          const oscFund = ctx.createOscillator();
          oscFund.type = "sine";
          oscFund.frequency.setValueAtTime(fundFreq, now);
          oscFund.connect(chimeVoice);
          oscFund.start(now);
          oscFund.stop(now + 3.4);

          // Voice 2: Metallic Overtone (physics ratio ~= 2.76)
          const oscOvertone1 = ctx.createOscillator();
          const gainOvertone1 = ctx.createGain();
          oscOvertone1.type = "sine";
          oscOvertone1.frequency.setValueAtTime(fundFreq * 2.76, now);
          gainOvertone1.gain.setValueAtTime(0.008, now); // soft and glassy
          oscOvertone1.connect(gainOvertone1);
          gainOvertone1.connect(chimeVoice);
          oscOvertone1.start(now);
          oscOvertone1.stop(now + 3.4);

          // Voice 3: Crystalline Shimmer (physics ratio ~= 5.4)
          const oscOvertone2 = ctx.createOscillator();
          const gainOvertone2 = ctx.createGain();
          oscOvertone2.type = "sine";
          oscOvertone2.frequency.setValueAtTime(fundFreq * 5.4, now);
          gainOvertone2.gain.setValueAtTime(0.004, now); // subtle sparkle
          oscOvertone2.connect(gainOvertone2);
          gainOvertone2.connect(chimeVoice);
          oscOvertone2.start(now);
          oscOvertone2.stop(now + 3.4);

          registerDynamicVoice([oscFund, oscOvertone1, gainOvertone1, oscOvertone2, gainOvertone2, chimeVoice], 3.4);
        };
        secondarySynthIntervalRef.current = setInterval(triggerChime, 3800);
      }

      // 5. LOFI MEDITATIVE PADS (Wow vibrato & resonant smooth pad pass - vinyl crackle completely disabled to prevent '지지직' reports)
      else if (type === "synth-lofi") {
        // Vinyl crackle generator removed completely to ensure absolute clear noise-free output!

        // Analog tape cassette feedback delay
        const lofiDelay = createDelay(0.58, 0.49, 0.22);

        // Sweeping lowpass filter with smooth analog feel
        const sweetFilter = ctx.createBiquadFilter();
        sweetFilter.type = "lowpass";
        sweetFilter.Q.setValueAtTime(1.0, ctx.currentTime); // lowered resonance to prevent peaking buzz
        sweetFilter.connect(masterGain);
        sweetFilter.connect(lofiDelay);
        activeNodesRef.current.push(sweetFilter);

        // Slow filter envelope LFO
        const filterSweepLfo = ctx.createOscillator();
        const filterSweepGain = ctx.createGain();
        filterSweepLfo.frequency.setValueAtTime(0.076, ctx.currentTime);
        filterSweepGain.gain.setValueAtTime(60, ctx.currentTime);
        filterSweepLfo.connect(filterSweepGain);
        filterSweepGain.connect(sweetFilter.frequency);
        sweetFilter.frequency.setValueAtTime(240, ctx.currentTime);
        filterSweepLfo.start();
        activeNodesRef.current.push(filterSweepLfo, filterSweepGain);

        // Slow tape flutter wow-vibrato
        const wobbleLfo = ctx.createOscillator();
        const wobbleGain = ctx.createGain();
        wobbleLfo.frequency.setValueAtTime(2.8, ctx.currentTime);
        wobbleGain.gain.setValueAtTime(3.2, ctx.currentTime); // pitch slip (cents)
        wobbleLfo.connect(wobbleGain);
        wobbleLfo.start();
        activeNodesRef.current.push(wobbleLfo, wobbleGain);

        // Cozy moody chord progression
        const lofiChords = [
          [82.41, 164.81, 196.00, 246.94, 293.66], // Em9
          [110.00, 220.00, 261.63, 329.63, 392.00], // Am9
          [123.47, 246.94, 293.66, 369.99, 440.00]  // Bm11
        ];
        let lofiIdx = 0;

        const playLofiPad = () => {
          const now = ctx.currentTime;
          const currentChord = lofiChords[lofiIdx];
          lofiIdx = (lofiIdx + 1) % lofiChords.length;

          currentChord.forEach(freq => {
            const voiceGain = ctx.createGain();
            voiceGain.connect(sweetFilter);

            voiceGain.gain.setValueAtTime(0, now);
            voiceGain.gain.linearRampToValueAtTime(0.015, now + 2.2); // Smooth slow fade-in
            voiceGain.gain.setValueAtTime(0.015, now + 3.2);
            voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + 6.5);

            // Detuned pure sine and triangle waves instead of harsh sawtooth to guarantee zero buzz
            const oscSine = ctx.createOscillator();
            const oscTri = ctx.createOscillator();

            oscSine.type = "sine";
            oscSine.frequency.setValueAtTime(freq, now);
            oscSine.detune.setValueAtTime(-6, now);
            wobbleGain.connect(oscSine.detune);

            oscTri.type = "triangle";
            oscTri.frequency.setValueAtTime(freq, now);
            oscTri.detune.setValueAtTime(6, now);
            wobbleGain.connect(oscTri.detune);

            oscSine.connect(voiceGain);
            oscTri.connect(voiceGain);

            oscSine.start(now);
            oscTri.start(now);

            oscSine.stop(now + 6.7);
            oscTri.stop(now + 6.7);

            registerDynamicVoice([oscSine, oscTri, voiceGain], 6.7);
          });
        };
        playLofiPad();
        synthIntervalRef.current = setInterval(playLofiPad, 6000);
      }

      // 6. CELESTIAL CELESTIAL HARPS (Delicate pentatonic visual plucks + long echo/delay)
      else if (type === "synth-harp") {
        const harpDelay = createDelay(0.68, 0.55, 0.35);
        const harpNotes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00]; // Pentatonic C
        
        const triggerHarpPluck = () => {
          const now = ctx.currentTime;
          const freq = harpNotes[Math.floor(Math.random() * harpNotes.length)];
          
          const harpVoice = ctx.createGain();
          const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
          if (panner) {
            panner.pan.setValueAtTime(Math.random() * 1.6 - 0.8, now);
            harpVoice.connect(panner);
            panner.connect(masterGain);
            panner.connect(harpDelay);
            registerDynamicVoice([panner], 4.5);
          } else {
            harpVoice.connect(masterGain);
            harpVoice.connect(harpDelay);
          }
          
          harpVoice.gain.setValueAtTime(0, now);
          harpVoice.gain.linearRampToValueAtTime(0.012, now + 0.005); // Instant harp pluck
          harpVoice.gain.exponentialRampToValueAtTime(0.0001, now + 4.0);
          
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          osc1.type = "sine";
          osc1.frequency.setValueAtTime(freq, now);
          osc2.type = "triangle";
          osc2.frequency.setValueAtTime(freq * 2, now); // Sweet overtone
          
          const osc2Gain = ctx.createGain();
          osc2Gain.gain.setValueAtTime(0.003, now);
          
          osc1.connect(harpVoice);
          osc2.connect(osc2Gain);
          osc2Gain.connect(harpVoice);
          
          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 4.2);
          osc2.stop(now + 4.2);
          
          registerDynamicVoice([osc1, osc2, osc2Gain, harpVoice], 4.2);
        };
        
        triggerHarpPluck();
        secondarySynthIntervalRef.current = setInterval(triggerHarpPluck, 1500);
      }

      // 7. DEEP HEARTBEAT RESONANCE (Warm biological sub pulse + gentle healing drone)
      else if (type === "synth-heart") {
        const playHeartbeat = () => {
          const now = ctx.currentTime;
          // Double thump heartbeat: Lub-dub
          const triggerThump = (timeOffset: number, volumeMult: number) => {
            const thumpGain = ctx.createGain();
            thumpGain.connect(masterGain);
            thumpGain.gain.setValueAtTime(0, now + timeOffset);
            thumpGain.gain.linearRampToValueAtTime(0.04 * volumeMult, now + timeOffset + 0.05);
            thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + timeOffset + 0.45);
            
            const osc = ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.setValueAtTime(55, now + timeOffset); // Sub bass thump
            osc.frequency.exponentialRampToValueAtTime(20, now + timeOffset + 0.2); // pitch sweep down
            
            osc.connect(thumpGain);
            osc.start(now + timeOffset);
            osc.stop(now + timeOffset + 0.5);
            registerDynamicVoice([osc, thumpGain], 0.5);
          };
          
          triggerThump(0, 1.0);     // First beat (Lub)
          triggerThump(0.28, 0.7);   // Second beat (Dub)
        };
        
        playHeartbeat();
        synthIntervalRef.current = setInterval(playHeartbeat, 2400); // ~50 BPM comforting slow heartbeat
        
        // Add a gentle companion drone (432Hz-related chords)
        const heartPad = () => {
          const now = ctx.currentTime;
          const padFilter = ctx.createBiquadFilter();
          padFilter.type = "lowpass";
          padFilter.frequency.setValueAtTime(140, now);
          padFilter.connect(masterGain);
          registerDynamicVoice([padFilter], 8.0);
          
          [108.00, 162.00, 216.00].forEach(freq => { // 432Hz perfect harmonic ratio notes
            const voiceGain = ctx.createGain();
            voiceGain.connect(padFilter);
            voiceGain.gain.setValueAtTime(0, now);
            voiceGain.gain.linearRampToValueAtTime(0.015, now + 2.5);
            voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + 7.5);
            
            const osc = ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now);
            osc.detune.setValueAtTime(Math.random() * 8 - 4, now);
            
            osc.connect(voiceGain);
            osc.start(now);
            osc.stop(now + 8.0);
            registerDynamicVoice([osc, voiceGain], 8.0);
          });
        };
        heartPad();
        secondarySynthIntervalRef.current = setInterval(heartPad, 7500);
      }

      // 8. FOREST BIRDSONG BREEZE (Organic sweeping chirps + rustling forest breeze)
      else if (type === "synth-birds") {
        // Soft rustling sound
        const woodNoise = createNoiseNode(ctx, "brown");
        const woodFilter = ctx.createBiquadFilter();
        const woodGain = ctx.createGain();
        woodFilter.type = "lowpass";
        woodFilter.frequency.setValueAtTime(180, ctx.currentTime);
        woodNoise.connect(woodFilter);
        woodFilter.connect(woodGain);
        woodGain.connect(masterGain);
        woodGain.gain.setValueAtTime(0.01, ctx.currentTime);
        woodNoise.start();
        activeNodesRef.current.push(woodNoise, woodFilter, woodGain);
        
        const triggerBirdChirp = () => {
          const now = ctx.currentTime;
          const baseFreq = 2000 + Math.random() * 1500; // Natural avian frequencies
          const chirpDuration = 0.12 + Math.random() * 0.18;
          
          const chirpGain = ctx.createGain();
          const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
          if (panner) {
            panner.pan.setValueAtTime(Math.random() * 1.6 - 0.8, now);
            chirpGain.connect(panner);
            panner.connect(masterGain);
            registerDynamicVoice([panner], 0.8);
          } else {
            chirpGain.connect(masterGain);
          }
          
          chirpGain.gain.setValueAtTime(0, now);
          chirpGain.gain.linearRampToValueAtTime(0.003, now + 0.02);
          chirpGain.gain.exponentialRampToValueAtTime(0.0001, now + chirpDuration);
          
          // Fast pitch sweep up and down to sound like a natural bird chirp
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(baseFreq, now);
          osc.frequency.exponentialRampToValueAtTime(baseFreq * (1.3 + Math.random() * 0.4), now + chirpDuration * 0.4);
          osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, now + chirpDuration);
          
          osc.connect(chirpGain);
          osc.start(now);
          osc.stop(now + chirpDuration + 0.1);
          registerDynamicVoice([osc, chirpGain], chirpDuration + 0.1);
        };
        
        // Randomized bird chirp triggers for true organic timing
        const birdTimer = () => {
          triggerBirdChirp();
          if (Math.random() > 0.4) {
            setTimeout(triggerBirdChirp, 150 + Math.random() * 200);
          }
          if (Math.random() > 0.7) {
            setTimeout(triggerBirdChirp, 400 + Math.random() * 200);
          }
        };
        
        synthIntervalRef.current = setInterval(birdTimer, 3200);
      }

      // 9. DREAMY COSMIC AURORA (Extremely slow evolving landscape & deep sweeping resonance)
      else if (type === "synth-aurora") {
        const auroraDelay = createDelay(1.2, 0.55, 0.25);
        
        const playAuroraSweep = () => {
          const now = ctx.currentTime;
          const baseTone = 110.00 * (1 + Math.floor(Math.random() * 3)); // Random harmonic base
          
          const auraFilter = ctx.createBiquadFilter();
          auraFilter.type = "bandpass";
          auraFilter.frequency.setValueAtTime(400, now);
          auraFilter.Q.setValueAtTime(0.8, now);
          auraFilter.connect(masterGain);
          auraFilter.connect(auroraDelay);
          registerDynamicVoice([auraFilter], 16.0);
          
          // Sweep the bandpass filter slowly
          auraFilter.frequency.exponentialRampToValueAtTime(1200, now + 8.0);
          auraFilter.frequency.exponentialRampToValueAtTime(300, now + 16.0);
          
          [baseTone, baseTone * 1.5, baseTone * 2.25].forEach((freq) => {
            const voiceGain = ctx.createGain();
            voiceGain.connect(auraFilter);
            voiceGain.gain.setValueAtTime(0, now);
            voiceGain.gain.linearRampToValueAtTime(0.015, now + 4.0);
            voiceGain.gain.setValueAtTime(0.015, now + 8.0);
            voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + 15.5);
            
            const oscLeft = ctx.createOscillator();
            const oscRight = ctx.createOscillator();
            oscLeft.type = "sine";
            oscLeft.frequency.setValueAtTime(freq, now);
            oscLeft.detune.setValueAtTime(-12, now);
            
            oscRight.type = "sine";
            oscRight.frequency.setValueAtTime(freq, now);
            oscRight.detune.setValueAtTime(12, now);
            
            oscLeft.connect(voiceGain);
            oscRight.connect(voiceGain);
            
            oscLeft.start(now);
            oscRight.start(now);
            oscLeft.stop(now + 16.0);
            oscRight.stop(now + 16.0);
            
            registerDynamicVoice([oscLeft, oscRight, voiceGain], 16.0);
          });
        };
        
        playAuroraSweep();
        synthIntervalRef.current = setInterval(playAuroraSweep, 14000);
      }

      // 10. TEMPLE SINGING BOWLS (Authentic metallic Singing Bowl with pulsing hum)
      else if (type === "synth-bowls") {
        const bowlDelay = createDelay(0.75, 0.48, 0.2);
        
        const triggerSingingBowl = () => {
          const now = ctx.currentTime;
          const fund = 180 + Math.random() * 40; // Warm singing bowl fundamental
          
          const bowlVoice = ctx.createGain();
          bowlVoice.connect(masterGain);
          bowlVoice.connect(bowlDelay);
          
          bowlVoice.gain.setValueAtTime(0, now);
          bowlVoice.gain.linearRampToValueAtTime(0.035, now + 0.08); // Slow metallic hammer strike
          bowlVoice.gain.exponentialRampToValueAtTime(0.0001, now + 9.0);
          
          // Overtone frequencies matching authentic bronze signing bowls
          const overtones = [1, 2.76, 5.4, 8.1];
          const gains = [0.03, 0.008, 0.004, 0.002];
          
          const oscillators: any[] = [];
          
          overtones.forEach((ratio, idx) => {
            const osc = ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.setValueAtTime(fund * ratio, now);
            
            // Add a slow LFO to each overtone to match natural acoustic pulsing
            const pulseGain = ctx.createGain();
            pulseGain.gain.setValueAtTime(gains[idx], now);
            
            const lfo = ctx.createOscillator();
            lfo.frequency.setValueAtTime(2.5 + idx * 0.8, now); // Pulsing vibrato
            const lfoGain = ctx.createGain();
            lfoGain.gain.setValueAtTime(gains[idx] * 0.25, now);
            
            lfo.connect(lfoGain);
            lfoGain.connect(pulseGain.gain);
            
            osc.connect(pulseGain);
            pulseGain.connect(bowlVoice);
            
            lfo.start(now);
            osc.start(now);
            lfo.stop(now + 9.5);
            osc.stop(now + 9.5);
            
            oscillators.push(osc, lfo, pulseGain, lfoGain);
          });
          
          registerDynamicVoice([...oscillators, bowlVoice], 9.5);
        };
        
        triggerSingingBowl();
        synthIntervalRef.current = setInterval(triggerSingingBowl, 8500);
      }

      // 11. MOONLIGHT PIANO GLOW (Sparse nocturnal piano notes with long echo)
      else if (type === "synth-moonlight") {
        const moonDelay = createDelay(1.05, 0.52, 0.28);
        const moonNotes = [196.00, 220.00, 246.94, 261.63, 293.66, 329.63, 392.00];

        const triggerMoonNote = () => {
          const now = ctx.currentTime;
          const freq = moonNotes[Math.floor(Math.random() * moonNotes.length)];
          const noteGain = ctx.createGain();
          const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

          if (panner) {
            panner.pan.setValueAtTime(Math.random() * 1.2 - 0.6, now);
            noteGain.connect(panner);
            panner.connect(masterGain);
            panner.connect(moonDelay);
            registerDynamicVoice([panner], 5.5);
          } else {
            noteGain.connect(masterGain);
            noteGain.connect(moonDelay);
          }

          noteGain.gain.setValueAtTime(0, now);
          noteGain.gain.linearRampToValueAtTime(0.014, now + 0.04);
          noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 5.2);

          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now);
          osc.connect(noteGain);
          osc.start(now);
          osc.stop(now + 5.4);
          registerDynamicVoice([osc, noteGain], 5.4);
        };

        triggerMoonNote();
        secondarySynthIntervalRef.current = setInterval(triggerMoonNote, 2800);
      }

      // 12. CAMPFIRE WARMTH (Soft crackle pops + warm ember drone)
      else if (type === "synth-campfire") {
        const fireNoise = createNoiseNode(ctx, "brown");
        const fireFilter = ctx.createBiquadFilter();
        const fireGain = ctx.createGain();
        fireFilter.type = "lowpass";
        fireFilter.frequency.setValueAtTime(220, ctx.currentTime);
        fireNoise.connect(fireFilter);
        fireFilter.connect(fireGain);
        fireGain.connect(masterGain);
        fireGain.gain.setValueAtTime(0.014, ctx.currentTime);
        fireNoise.start();
        activeNodesRef.current.push(fireNoise, fireFilter, fireGain);

        const triggerCrackle = () => {
          const now = ctx.currentTime;
          const popGain = ctx.createGain();
          popGain.connect(masterGain);
          popGain.gain.setValueAtTime(0, now);
          popGain.gain.linearRampToValueAtTime(0.006, now + 0.01);
          popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(80 + Math.random() * 120, now);
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
          osc.connect(popGain);
          osc.start(now);
          osc.stop(now + 0.2);
          registerDynamicVoice([osc, popGain], 0.2);
        };

        const crackleTimer = () => {
          triggerCrackle();
          if (Math.random() > 0.5) setTimeout(triggerCrackle, 80 + Math.random() * 120);
        };

        synthIntervalRef.current = setInterval(crackleTimer, 900);

        const playEmberDrone = () => {
          const now = ctx.currentTime;
          const droneFilter = ctx.createBiquadFilter();
          droneFilter.type = "lowpass";
          droneFilter.frequency.setValueAtTime(160, now);
          droneFilter.connect(masterGain);
          registerDynamicVoice([droneFilter], 10.0);

          [65.41, 98.00].forEach((freq) => {
            const voiceGain = ctx.createGain();
            voiceGain.connect(droneFilter);
            voiceGain.gain.setValueAtTime(0, now);
            voiceGain.gain.linearRampToValueAtTime(0.012, now + 2.0);
            voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + 9.5);

            const osc = ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now);
            osc.connect(voiceGain);
            osc.start(now);
            osc.stop(now + 10.0);
            registerDynamicVoice([osc, voiceGain], 10.0);
          });
        };

        playEmberDrone();
        secondarySynthIntervalRef.current = setInterval(playEmberDrone, 10500);
      }

      // 13. STARGAZING NIGHT SKY (Deep cosmic pad + sparse star twinkles)
      else if (type === "synth-stars") {
        const starDelay = createDelay(0.9, 0.5, 0.22);
        const padFilter = ctx.createBiquadFilter();
        padFilter.type = "lowpass";
        padFilter.frequency.setValueAtTime(200, ctx.currentTime);
        padFilter.connect(masterGain);
        activeNodesRef.current.push(padFilter);

        const playStarPad = () => {
          const now = ctx.currentTime;
          [55.00, 82.41, 110.00].forEach((freq) => {
            const voiceGain = ctx.createGain();
            voiceGain.connect(padFilter);
            voiceGain.gain.setValueAtTime(0, now);
            voiceGain.gain.linearRampToValueAtTime(0.01, now + 3.0);
            voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + 12.0);

            const osc = ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now);
            osc.connect(voiceGain);
            osc.start(now);
            osc.stop(now + 12.2);
            registerDynamicVoice([osc, voiceGain], 12.2);
          });
        };

        playStarPad();
        synthIntervalRef.current = setInterval(playStarPad, 12000);

        const triggerTwinkle = () => {
          const now = ctx.currentTime;
          const twinkleGain = ctx.createGain();
          twinkleGain.connect(masterGain);
          twinkleGain.connect(starDelay);
          twinkleGain.gain.setValueAtTime(0, now);
          twinkleGain.gain.linearRampToValueAtTime(0.004, now + 0.02);
          twinkleGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(1200 + Math.random() * 2400, now);
          osc.connect(twinkleGain);
          osc.start(now);
          osc.stop(now + 2.0);
          registerDynamicVoice([osc, twinkleGain], 2.0);
        };

        secondarySynthIntervalRef.current = setInterval(triggerTwinkle, 2200);
      }

      // 14. CRYSTAL CAVE ECHOES (Glass droplets in cavernous reverb)
      else if (type === "synth-crystal") {
        const caveDelay = createDelay(1.35, 0.58, 0.3);
        const caveNoise = createNoiseNode(ctx, "brown");
        const caveFilter = ctx.createBiquadFilter();
        const caveGain = ctx.createGain();
        caveFilter.type = "lowpass";
        caveFilter.frequency.setValueAtTime(120, ctx.currentTime);
        caveNoise.connect(caveFilter);
        caveFilter.connect(caveGain);
        caveGain.connect(masterGain);
        caveGain.gain.setValueAtTime(0.008, ctx.currentTime);
        caveNoise.start();
        activeNodesRef.current.push(caveNoise, caveFilter, caveGain);

        const triggerDroplet = () => {
          const now = ctx.currentTime;
          const freq = 600 + Math.random() * 900;
          const dropGain = ctx.createGain();
          dropGain.connect(masterGain);
          dropGain.connect(caveDelay);
          dropGain.gain.setValueAtTime(0, now);
          dropGain.gain.linearRampToValueAtTime(0.01, now + 0.008);
          dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);

          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          osc1.type = "sine";
          osc1.frequency.setValueAtTime(freq, now);
          osc2.type = "triangle";
          osc2.frequency.setValueAtTime(freq * 2.2, now);
          const osc2Gain = ctx.createGain();
          osc2Gain.gain.setValueAtTime(0.002, now);

          osc1.connect(dropGain);
          osc2.connect(osc2Gain);
          osc2Gain.connect(dropGain);
          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 2.8);
          osc2.stop(now + 2.8);
          registerDynamicVoice([osc1, osc2, osc2Gain, dropGain], 2.8);
        };

        triggerDroplet();
        secondarySynthIntervalRef.current = setInterval(triggerDroplet, 1900);
      }

      // 15. SAKURA GARDEN BREEZE (Gentle breeze + soft koto-like plucks)
      else if (type === "synth-sakura") {
        const breeze = createNoiseNode(ctx, "brown");
        const breezeFilter = ctx.createBiquadFilter();
        const breezeGain = ctx.createGain();
        breezeFilter.type = "lowpass";
        breezeFilter.frequency.setValueAtTime(280, ctx.currentTime);
        breeze.connect(breezeFilter);
        breezeFilter.connect(breezeGain);
        breezeGain.connect(masterGain);
        breezeGain.gain.setValueAtTime(0.006, ctx.currentTime);
        breeze.start();
        activeNodesRef.current.push(breeze, breezeFilter, breezeGain);

        const sakuraDelay = createDelay(0.72, 0.46, 0.2);
        const pluckNotes = [329.63, 392.00, 440.00, 493.88, 523.25, 587.33];

        const triggerPluck = () => {
          const now = ctx.currentTime;
          const freq = pluckNotes[Math.floor(Math.random() * pluckNotes.length)];
          const pluckGain = ctx.createGain();
          pluckGain.connect(masterGain);
          pluckGain.connect(sakuraDelay);
          pluckGain.gain.setValueAtTime(0, now);
          pluckGain.gain.linearRampToValueAtTime(0.011, now + 0.006);
          pluckGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now);
          osc.connect(pluckGain);
          osc.start(now);
          osc.stop(now + 3.4);
          registerDynamicVoice([osc, pluckGain], 3.4);
        };

        triggerPluck();
        synthIntervalRef.current = setInterval(triggerPluck, 3400);
      }

      // 16. NEBULA DRIFT HORIZON (Slow morphing spectral wash)
      else if (type === "synth-nebula") {
        const nebulaDelay = createDelay(1.4, 0.54, 0.26);
        const nebulaPanner = createAutoPanner(0.03, 0.55);

        const playNebulaWash = () => {
          const now = ctx.currentTime;
          const washFilter = ctx.createBiquadFilter();
          washFilter.type = "bandpass";
          washFilter.frequency.setValueAtTime(260, now);
          washFilter.Q.setValueAtTime(0.6, now);
          washFilter.connect(nebulaPanner);
          washFilter.connect(nebulaDelay);
          registerDynamicVoice([washFilter], 18.0);

          washFilter.frequency.exponentialRampToValueAtTime(900, now + 9.0);
          washFilter.frequency.exponentialRampToValueAtTime(220, now + 18.0);

          [73.42, 110.00, 164.81].forEach((freq) => {
            const voiceGain = ctx.createGain();
            voiceGain.connect(washFilter);
            voiceGain.gain.setValueAtTime(0, now);
            voiceGain.gain.linearRampToValueAtTime(0.012, now + 5.0);
            voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + 17.5);

            const oscL = ctx.createOscillator();
            const oscR = ctx.createOscillator();
            oscL.type = "sine";
            oscL.frequency.setValueAtTime(freq, now);
            oscL.detune.setValueAtTime(-10, now);
            oscR.type = "sine";
            oscR.frequency.setValueAtTime(freq, now);
            oscR.detune.setValueAtTime(10, now);
            oscL.connect(voiceGain);
            oscR.connect(voiceGain);
            oscL.start(now);
            oscR.start(now);
            oscL.stop(now + 18.0);
            oscR.stop(now + 18.0);
            registerDynamicVoice([oscL, oscR, voiceGain], 18.0);
          });
        };

        playNebulaWash();
        synthIntervalRef.current = setInterval(playNebulaWash, 16000);
      }

      // 17. MOUNTAIN STREAM FLOW (Flowing water texture + harmonic stream hum)
      else if (type === "synth-river") {
        const streamL = createNoiseNode(ctx, "brown");
        const streamR = createNoiseNode(ctx, "brown");
        const filterL = ctx.createBiquadFilter();
        const filterR = ctx.createBiquadFilter();
        const gainL = ctx.createGain();
        const gainR = ctx.createGain();

        filterL.type = "lowpass";
        filterL.frequency.setValueAtTime(380, ctx.currentTime);
        filterL.Q.setValueAtTime(0.4, ctx.currentTime);
        filterR.type = "lowpass";
        filterR.frequency.setValueAtTime(460, ctx.currentTime);
        filterR.Q.setValueAtTime(0.4, ctx.currentTime);

        streamL.connect(filterL);
        filterL.connect(gainL);
        streamR.connect(filterR);
        filterR.connect(gainR);

        const pannerL = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        const pannerR = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (pannerL) { pannerL.pan.setValueAtTime(-0.6, ctx.currentTime); gainL.connect(pannerL); pannerL.connect(masterGain); }
        else gainL.connect(masterGain);
        if (pannerR) { pannerR.pan.setValueAtTime(0.6, ctx.currentTime); gainR.connect(pannerR); pannerR.connect(masterGain); }
        else gainR.connect(masterGain);

        gainL.gain.setValueAtTime(0.008, ctx.currentTime);
        gainR.gain.setValueAtTime(0.008, ctx.currentTime);
        streamL.start();
        streamR.start();
        activeNodesRef.current.push(streamL, streamR, filterL, filterR, gainL, gainR, pannerL, pannerR);

        const flowLfo = ctx.createOscillator();
        const flowGain = ctx.createGain();
        flowLfo.frequency.setValueAtTime(0.12, ctx.currentTime);
        flowGain.gain.setValueAtTime(0.003, ctx.currentTime);
        flowLfo.connect(flowGain);
        flowGain.connect(gainL.gain);
        flowGain.connect(gainR.gain);
        flowLfo.start();
        activeNodesRef.current.push(flowLfo, flowGain);

        const playStreamHum = () => {
          const now = ctx.currentTime;
          const humFilter = ctx.createBiquadFilter();
          humFilter.type = "lowpass";
          humFilter.frequency.setValueAtTime(180, now);
          humFilter.connect(masterGain);
          registerDynamicVoice([humFilter], 8.0);

          [146.83, 220.00].forEach((freq) => {
            const voiceGain = ctx.createGain();
            voiceGain.connect(humFilter);
            voiceGain.gain.setValueAtTime(0, now);
            voiceGain.gain.linearRampToValueAtTime(0.008, now + 2.5);
            voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + 7.8);

            const osc = ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now);
            osc.connect(voiceGain);
            osc.start(now);
            osc.stop(now + 8.0);
            registerDynamicVoice([osc, voiceGain], 8.0);
          });
        };

        playStreamHum();
        synthIntervalRef.current = setInterval(playStreamHum, 9000);
      }

      // 18. LUCID DREAM THETA WAVES (4Hz amplitude pulse on warm dream pad)
      else if (type === "synth-dream") {
        const dreamDelay = createDelay(0.95, 0.5, 0.24);
        const dreamFilter = ctx.createBiquadFilter();
        dreamFilter.type = "lowpass";
        dreamFilter.frequency.setValueAtTime(300, ctx.currentTime);
        dreamFilter.connect(masterGain);
        dreamFilter.connect(dreamDelay);
        activeNodesRef.current.push(dreamFilter);

        const thetaLfo = ctx.createOscillator();
        const thetaGain = ctx.createGain();
        const dreamAmplitude = ctx.createGain();
        thetaLfo.frequency.setValueAtTime(4.0, ctx.currentTime);
        thetaGain.gain.setValueAtTime(0.004, ctx.currentTime);
        dreamAmplitude.gain.setValueAtTime(0.008, ctx.currentTime);
        thetaLfo.connect(thetaGain);
        thetaGain.connect(dreamAmplitude.gain);
        dreamAmplitude.connect(dreamFilter);
        thetaLfo.start();
        activeNodesRef.current.push(thetaLfo, thetaGain, dreamAmplitude);

        const playDreamPad = () => {
          const now = ctx.currentTime;
          [130.81, 196.00, 261.63].forEach((freq) => {
            const voiceGain = ctx.createGain();
            voiceGain.connect(dreamAmplitude);

            const osc = ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now);
            osc.connect(voiceGain);
            osc.start(now);
            osc.stop(now + 10.0);
            registerDynamicVoice([osc, voiceGain], 10.0);
          });
        };

        playDreamPad();
        synthIntervalRef.current = setInterval(playDreamPad, 10000);
      }

      // 19. SACRED OM MANTRA HUM (Layered harmonic OM drone)
      else if (type === "synth-mantra") {
        const mantraDelay = createDelay(1.1, 0.5, 0.2);
        const omFundamental = 136.1; // Om frequency approximation

        const playOmDrone = () => {
          const now = ctx.currentTime;
          const omGain = ctx.createGain();
          omGain.connect(masterGain);
          omGain.connect(mantraDelay);
          omGain.gain.setValueAtTime(0, now);
          omGain.gain.linearRampToValueAtTime(0.02, now + 3.0);
          omGain.gain.setValueAtTime(0.02, now + 8.0);
          omGain.gain.exponentialRampToValueAtTime(0.0001, now + 14.0);
          registerDynamicVoice([omGain], 14.0);

          [1, 2, 3, 1.5].forEach((ratio, idx) => {
            const partialGain = ctx.createGain();
            partialGain.gain.setValueAtTime(0.012 / (idx + 1), now);
            const osc = ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.setValueAtTime(omFundamental * ratio, now);

            const vibrato = ctx.createOscillator();
            const vibratoGain = ctx.createGain();
            vibrato.frequency.setValueAtTime(3.5 + idx * 0.4, now);
            vibratoGain.gain.setValueAtTime(2.5, now);
            vibrato.connect(vibratoGain);
            vibratoGain.connect(osc.frequency);

            osc.connect(partialGain);
            partialGain.connect(omGain);
            vibrato.start(now);
            osc.start(now);
            vibrato.stop(now + 14.2);
            osc.stop(now + 14.2);
            registerDynamicVoice([osc, partialGain, vibrato, vibratoGain], 14.2);
          });
        };

        playOmDrone();
        synthIntervalRef.current = setInterval(playOmDrone, 14000);
      }

      // 20. SILENT SNOWFALL BELLS (Soft snowfall hiss + gentle winter chimes)
      else if (type === "synth-snow") {
        const snowNoise = createNoiseNode(ctx, "brown");
        const snowFilter = ctx.createBiquadFilter();
        const snowGain = ctx.createGain();
        snowFilter.type = "lowpass";
        snowFilter.frequency.setValueAtTime(420, ctx.currentTime);
        snowNoise.connect(snowFilter);
        snowFilter.connect(snowGain);
        snowGain.connect(masterGain);
        snowGain.gain.setValueAtTime(0.006, ctx.currentTime);
        snowNoise.start();
        activeNodesRef.current.push(snowNoise, snowFilter, snowGain);

        const snowDelay = createDelay(0.85, 0.48, 0.25);
        const bellNotes = [523.25, 659.25, 783.99, 987.77];

        const triggerSnowBell = () => {
          const now = ctx.currentTime;
          const freq = bellNotes[Math.floor(Math.random() * bellNotes.length)];
          const bellGain = ctx.createGain();
          bellGain.connect(masterGain);
          bellGain.connect(snowDelay);
          bellGain.gain.setValueAtTime(0, now);
          bellGain.gain.linearRampToValueAtTime(0.008, now + 0.03);
          bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);

          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now);
          osc.connect(bellGain);
          osc.start(now);
          osc.stop(now + 4.7);
          registerDynamicVoice([osc, bellGain], 4.7);
        };

        triggerSnowBell();
        secondarySynthIntervalRef.current = setInterval(triggerSnowBell, 4200);
      }

      setIsBuffering(false);
      scheduleSynthAdvance();
    } catch (err) {
      console.warn("Synthesizer failed to start:", err);
    }
  };

  const isSameActiveTrack = (track: BgmTrack) => {
    const active = getActiveTrack();
    return active.url === track.url && active.trackKey === track.trackKey;
  };

  const setHtmlBgmGain = (targetVol: number) => {
    if (htmlGainRef.current) {
      htmlGainRef.current.gain.setValueAtTime(
        targetVol * BGM_HTML_GAIN_SCALE,
        getSharedAudioContext().currentTime,
      );
      if (audioRef.current) audioRef.current.volume = 1;
      return;
    }
    if (audioRef.current) {
      audioRef.current.volume = Math.min(1, targetVol * BGM_HTML_GAIN_SCALE);
    }
  };

  const ensureHtmlAudioRouting = () => {
    const audio = audioRef.current;
    if (!audio || htmlSourceConnectedRef.current) return;

    try {
      const ctx = getSharedAudioContext();
      const source = ctx.createMediaElementSource(audio);
      const gain = ctx.createGain();
      gain.connect(getMasterAudioBus());
      source.connect(gain);
      htmlGainRef.current = gain;
      htmlSourceConnectedRef.current = true;
      audio.volume = 1;
      setHtmlBgmGain(isMuted ? 0 : volume);
    } catch (err) {
      console.warn("HTML BGM WebAudio routing unavailable, using element volume:", err);
    }
  };

  const playHtmlBgmAudio = (resolvedUrl: string) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!isPlayingRef.current) {
      stopProceduralSynth();
      if (!audio.paused) {
        try { audio.pause(); } catch (_) {}
      }
      setIsBuffering(false);
      isPlayInitiatedRef.current = "";
      return;
    }

    stopProceduralSynth();
    ensureHtmlAudioRouting();
    setHtmlBgmGain(isMuted ? 0 : volume);

    if (loadedUrlRef.current !== resolvedUrl) {
      loadedUrlRef.current = resolvedUrl;
      audio.src = resolvedUrl;
      audio.load();
      isPlayInitiatedRef.current = "";
    }

    setIsBuffering(true);
    isPlayInitiatedRef.current = resolvedUrl;
    audio
      .play()
      .then(() => {
        if (!isPlayingRef.current) {
          audio.pause();
          setIsBuffering(false);
          isPlayInitiatedRef.current = "";
          return;
        }
        setIsBuffering(false);
        setRetryCount(0);
      })
      .catch((err) => {
        console.warn("HTML BGM play failed/deferred:", err);
        setIsBuffering(false);
        isPlayInitiatedRef.current = "";
      });
  };

  const skipUnresolvableTrack = (trackIndex: number) => {
    const current = [...tracksRef.current];
    const failed = current[trackIndex];
    if (!failed || current.length <= 1) {
      setIsBuffering(false);
      pausePlayback();
      return;
    }

    if (failed.trackKey?.startsWith("daily:")) {
      removePersistedExtraBgmTrackByKey(failed.trackKey);
    }

    const newTracks = current.filter((_, idx) => idx !== trackIndex);
    const oldShuffled = [...shuffledIndicesRef.current];
    const removedQueuePos = oldShuffled.indexOf(trackIndex);
    const newShuffled = oldShuffled
      .filter((idx) => idx !== trackIndex)
      .map((idx) => (idx > trackIndex ? idx - 1 : idx));

    let newQueueIndex = queueIndex;
    if (removedQueuePos >= 0 && removedQueuePos < queueIndex) {
      newQueueIndex = Math.max(0, queueIndex - 1);
    } else if (removedQueuePos === queueIndex) {
      newQueueIndex = Math.min(queueIndex, Math.max(0, newShuffled.length - 1));
    }

    const nextPlayIdx = newShuffled[newQueueIndex] ?? newShuffled[0] ?? 0;
    tracksRef.current = newTracks;
    shuffledIndicesRef.current = newShuffled.length > 0 ? newShuffled : shuffleTrackIndices(newTracks.length);
    setTracks(newTracks);
    setShuffledIndices(shuffledIndicesRef.current);
    setQueueIndex(newQueueIndex);
    if (isPlayingRef.current) {
      playTrackDirectly(nextPlayIdx);
    }
  };

  skipUnresolvableTrackRef.current = skipUnresolvableTrack;

  const resolveAndPlayHtmlBgm = (track: BgmTrack, generation: number) => {
    const finish = (resolvedUrl: string | null) => {
      if (generation !== playbackGenerationRef.current) return;
      if (!isPlayingRef.current) return;
      if (!isSameActiveTrack(track)) return;

      if (!resolvedUrl) {
        console.warn("Failed to resolve BGM url:", track.url, track.trackKey);
        skipUnresolvableTrackRef.current(activeTrackIndexRef.current);
        return;
      }

      playHtmlBgmAudio(resolvedUrl);
    };

    if (needsBgmUrlResolution(track.url, track.trackKey)) {
      setIsBuffering(true);
      resolvePlaybackUrlRef
        .current(track.url, track.trackKey)
        .then(finish)
        .catch((err) => {
          console.warn("BGM resolve failed:", err);
          finish(null);
        });
      return;
    }

    finish(track.url);
  };

  // --- DIRECT SYNCHRONOUS PLAY ENGINE ---
  const playTrackDirectly = (trackIndex: number, force = false) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!isPlayingRef.current && !force) {
      stopProceduralSynth();
      if (!audio.paused) {
        try { audio.pause(); } catch (_) {}
      }
      return;
    }
    if (!force && isTrackAlreadyPlaying(trackIndex)) return;

    const generation = ++playbackGenerationRef.current;
    activeTrackIndexRef.current = trackIndex;
    const track = tracksRef.current[trackIndex] || tracksRef.current[0];
    const targetUrl = track.url;

    if (targetUrl.startsWith("synth")) {
      try {
        if (!audio.paused) {
          audio.pause();
          audio.currentTime = 0;
        }
      } catch (_) {}
      loadedUrlRef.current = "";
      isPlayInitiatedRef.current = targetUrl;
      startProceduralSynth(targetUrl);
      return;
    }

    stopProceduralSynth();
    resolveAndPlayHtmlBgm(track, generation);
  };

  // --- AUDIO ACTION HANDLERS ---
  const advanceToNextTrack = () => {
    if (!isPlayingRef.current) return;
    setRetryCount(0);
    const shuffled = [...shuffledIndicesRef.current];
    const trackCount = tracksRef.current.length;
    if (trackCount === 0 || !shuffled.length) return;

    const prev = queueIndexRef.current;
    const currentIdx = shuffled[prev] ?? activeTrackIndexRef.current;
    let nextQueuePos = prev + 1;
    let nextTrackIdx = 0;

    if (nextQueuePos >= shuffled.length) {
      if (repeatModeRef.current === "off") {
        pausePlayback();
        return;
      }

      if (isShuffleRef.current) {
        const nextShuffled = buildNextShuffleOrder(trackCount, currentIdx);
        shuffledIndicesRef.current = nextShuffled;
        setShuffledIndices(nextShuffled);
        nextTrackIdx = nextShuffled[0];
      } else {
        nextTrackIdx = shuffled[0];
      }
      nextQueuePos = 0;
    } else {
      nextTrackIdx = shuffled[nextQueuePos];
    }

    setQueueIndex(nextQueuePos);
    playTrackDirectly(nextTrackIdx);
    isPlayingRef.current = true;
    setIsPlaying(true);
    try {
      localStorage.setItem('prism_bgm_playing', 'true');
    } catch (_) {}
  };

  const handleNextTrack = () => {
    advanceToNextTrack();
  };

  const handlePrevTrack = () => {
    setRetryCount(0);
    const shuffled = shuffledIndicesRef.current;
    if (!shuffled.length) return;

    const prev = queueIndexRef.current;
    const nextQueuePos = prev - 1 < 0 ? shuffled.length - 1 : prev - 1;
    const prevTrackIdx = shuffled[nextQueuePos];
    setQueueIndex(nextQueuePos);
    playTrackDirectly(prevTrackIdx);
    isPlayingRef.current = true;
    setIsPlaying(true);
  };

  const handleTrackEnded = () => {
    if (!isPlayingRef.current) return;

    if (repeatModeRef.current === "one") {
      playTrackDirectly(activeTrackIndexRef.current);
      return;
    }

    if (repeatModeRef.current === "off") {
      const shuffled = shuffledIndicesRef.current;
      if (queueIndexRef.current >= shuffled.length - 1) {
        pausePlayback();
        return;
      }
    }

    advanceToNextTrack();
  };

  handleTrackEndedRef.current = handleTrackEnded;

  const handlePlayToggle = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isPlayingRef.current) {
      pausePlayback();
      return;
    }

    isPlayingRef.current = true;
    setIsPlaying(true);
    try {
      localStorage.setItem('prism_bgm_playing', 'true');
    } catch (_) {}

    const audio = audioRef.current;
    const currentIdx = shuffledIndicesRef.current[queueIndexRef.current] ?? activeTrackIndexRef.current;
    const track = tracksRef.current[currentIdx] || tracksRef.current[0];
    if (audio && !track.url.startsWith("synth") && audio.src && !audio.ended && audio.currentTime > 0) {
      ensureHtmlAudioRouting();
      setHtmlBgmGain(isMuted ? 0 : volume);
      audio.play().catch(() => {
        playTrackDirectly(currentIdx);
      });
      return;
    }

    playTrackDirectly(currentIdx);
  };



  const queueAndPlayTrack = (trackIndex: number) => {
    const qIdx = shuffledIndicesRef.current.indexOf(trackIndex);
    if (qIdx >= 0) {
      setQueueIndex(qIdx);
    } else {
      const newIndices = [...shuffledIndicesRef.current, trackIndex];
      shuffledIndicesRef.current = newIndices;
      setShuffledIndices(newIndices);
      setQueueIndex(newIndices.length - 1);
    }
    playTrackDirectly(trackIndex);
    isPlayingRef.current = true;
    setIsPlaying(true);
    setShowPlaylist(false);
  };

  const handleSelectTrack = (trackIndex: number) => {
    queueAndPlayTrack(trackIndex);
  };

  handleSelectTrackRef.current = handleSelectTrack;

  const handleRemoveTrack = (trackIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const current = [...tracksRef.current];
    if (current.length <= 1) return;

    const removed = current[trackIndex];
    if (!removed) return;

    const trackId = getBgmTrackId(removed);
    const persistedUrl =
      removed.trackKey && (removed.url.startsWith("blob:") || !removed.url.startsWith("idb:"))
        ? toPersistedBgmUrl(removed.trackKey)
        : removed.url;
    hideBgmTrack({
      id: trackId,
      name: removed.name,
      url: persistedUrl,
      artist: removed.artist,
      trackKey: removed.trackKey,
    });
    setHiddenTracks(loadHiddenBgmTracks());
    if (removed.trackKey?.startsWith("daily:")) {
      removePersistedExtraBgmTrackByKey(removed.trackKey);
    }

    const newTracks = current.filter((_, i) => i !== trackIndex);
    const wasPlaying = activeTrackIndexRef.current === trackIndex;
    const oldShuffled = [...shuffledIndicesRef.current];
    const removedQueuePos = oldShuffled.indexOf(trackIndex);

    const newShuffled = oldShuffled
      .filter((idx) => idx !== trackIndex)
      .map((idx) => (idx > trackIndex ? idx - 1 : idx));

    let newQueueIndex = queueIndex;
    if (removedQueuePos >= 0) {
      if (removedQueuePos < queueIndex) {
        newQueueIndex = Math.max(0, queueIndex - 1);
      } else if (removedQueuePos === queueIndex) {
        newQueueIndex = Math.min(queueIndex, Math.max(0, newShuffled.length - 1));
      }
    }

    const nextShuffled =
      newShuffled.length > 0 ? newShuffled : shuffleTrackIndices(newTracks.length);
    const boundedQueueIndex = Math.min(newQueueIndex, Math.max(0, nextShuffled.length - 1));

    tracksRef.current = newTracks;
    shuffledIndicesRef.current = nextShuffled;
    setTracks(newTracks);
    setShuffledIndices(nextShuffled);
    setQueueIndex(boundedQueueIndex);

    if (wasPlaying) {
      const nextPlayIdx = nextShuffled[boundedQueueIndex] ?? 0;
      playTrackDirectly(nextPlayIdx);
    }
  };

  const refreshHiddenTracks = () => {
    setHiddenTracks(loadHiddenBgmTracks());
  };

  const handleRestoreTrack = (hidden: HiddenBgmTrack, e: React.MouseEvent) => {
    e.stopPropagation();
    unhideBgmTrack(hidden.id);

    const restoredTrack: BgmTrack = {
      name: hidden.name,
      url: hidden.url,
      artist: hidden.artist || "Lucy Procedural Suite",
      trackKey: hidden.trackKey,
    };

    if (hidden.trackKey?.startsWith("daily:")) {
      const extras = loadPersistedExtraBgmTracks();
      if (!extras.some((track) => track.trackKey === hidden.trackKey)) {
        savePersistedExtraBgmTracks([
          ...extras,
          {
            name: hidden.name,
            url: hidden.url,
            artist: hidden.artist,
            trackKey: hidden.trackKey,
          },
        ]);
      }
    }

    const current = [...tracksRef.current];
    const existingIdx = current.findIndex((track) => getBgmTrackId(track) === hidden.id);
    if (existingIdx < 0) {
      const trackIndex = current.length;
      current.push(restoredTrack);
      const nextShuffled = [...shuffledIndicesRef.current, trackIndex];
      tracksRef.current = current;
      shuffledIndicesRef.current = nextShuffled;
      setTracks(current);
      setShuffledIndices(nextShuffled);
    }

    setHiddenTracks(loadHiddenBgmTracks());
  };

  const handleToggleHiddenTracks = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowHiddenTracks((prev) => {
      const next = !prev;
      if (next) refreshHiddenTracks();
      return next;
    });
  };

  const handlePermanentDeleteTrack = async (hidden: HiddenBgmTrack, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      `"${hidden.name}"을(를) 영원히 삭제할까요?\n복원하거나 다시 추가할 수 없습니다.`,
    );
    if (!confirmed) return;

    const current = [...tracksRef.current];
    const removeIdx = current.findIndex((track) => getBgmTrackId(track) === hidden.id);
    const wasPlaying = removeIdx >= 0 && activeTrackIndexRef.current === removeIdx;

    await permanentlyDeleteBgmTrack(hidden);

    if (removeIdx >= 0) {
      const newTracks = current.filter((_, i) => i !== removeIdx);
      const oldShuffled = [...shuffledIndicesRef.current];
      const removedQueuePos = oldShuffled.indexOf(removeIdx);
      const newShuffled = oldShuffled
        .filter((idx) => idx !== removeIdx)
        .map((idx) => (idx > removeIdx ? idx - 1 : idx));

      let newQueueIndex = queueIndex;
      if (removedQueuePos >= 0) {
        if (removedQueuePos < queueIndex) {
          newQueueIndex = Math.max(0, queueIndex - 1);
        } else if (removedQueuePos === queueIndex) {
          newQueueIndex = Math.min(queueIndex, Math.max(0, newShuffled.length - 1));
        }
      }

      const nextShuffled =
        newShuffled.length > 0 ? newShuffled : shuffleTrackIndices(newTracks.length);
      const boundedQueueIndex = Math.min(newQueueIndex, Math.max(0, nextShuffled.length - 1));

      tracksRef.current = newTracks;
      shuffledIndicesRef.current = nextShuffled;
      setTracks(newTracks);
      setShuffledIndices(nextShuffled);
      setQueueIndex(boundedQueueIndex);

      if (wasPlaying) {
        if (newTracks.length === 0) {
          pausePlayback();
        } else {
          playTrackDirectly(nextShuffled[boundedQueueIndex] ?? 0);
        }
      }
    }

    const nextHidden = loadHiddenBgmTracks();
    setHiddenTracks(nextHidden);
    if (nextHidden.length === 0) {
      setShowHiddenTracks(false);
    }
  };

  // --- MUTED & VOLUME HANDLERS ---
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    const muted = val === 0;
    setIsMuted(muted);
    try {
      localStorage.setItem('prism_bgm_volume', String(val));
      localStorage.setItem('prism_bgm_muted', muted ? 'true' : 'false');
    } catch (_) {}
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(prev => {
      const next = !prev;
      try {
        localStorage.setItem('prism_bgm_muted', next ? 'true' : 'false');
      } catch (_) {}
      const targetVol = next ? 0 : volume;
      setHtmlBgmGain(targetVol);
      if (masterGainRef.current) {
        masterGainRef.current.gain.setValueAtTime(targetVol * AMBIENT_MASTER_GAIN_SCALE, getSharedAudioContext().currentTime);
      }
      return next;
    });
  };

  queueAndPlayTrackRef.current = queueAndPlayTrack;
  resolvePlaybackUrlRef.current = resolveBgmPlaybackUrl;

  useEffect(() => {
    let cancelled = false;
    const persisted = loadPersistedExtraBgmTracks();
    if (!persisted.length) return;

    hydratePersistedBgmTracks(persisted).then((hydrated) => {
      if (cancelled) return;
      const current = [...tracksRef.current];
      let changed = false;

      const hydratedKeys = new Set(
        hydrated.map((track) => track.trackKey).filter((trackKey): trackKey is string => !!trackKey),
      );

      persisted.forEach((savedTrack) => {
        if (!savedTrack.trackKey || isBgmTrackHidden(savedTrack)) return;
        if (isPersistedBgmRef(savedTrack.url) && !hydratedKeys.has(savedTrack.trackKey)) {
          removePersistedExtraBgmTrackByKey(savedTrack.trackKey);
          const staleIdx = current.findIndex((track) => track.trackKey === savedTrack.trackKey);
          if (staleIdx >= 0) {
            current.splice(staleIdx, 1);
            changed = true;
          }
        }
      });

      hydrated.forEach((savedTrack) => {
        if (!savedTrack.trackKey || isBgmTrackHidden(savedTrack)) return;
        const idx = current.findIndex((track) => track.trackKey === savedTrack.trackKey);
        if (idx >= 0) {
          if (current[idx].url !== savedTrack.url) {
            current[idx] = { ...current[idx], ...savedTrack };
            changed = true;
          }
        } else {
          current.push({
            name: savedTrack.name,
            url: savedTrack.url,
            artist: savedTrack.artist,
            trackKey: savedTrack.trackKey,
          });
          changed = true;
        }
      });

      if (!changed) return;
      tracksRef.current = current;
      setTracks(current);
      setShuffledIndices((prev) => {
        const missing = current
          .map((_, idx) => idx)
          .filter((idx) => !prev.includes(idx));
        return missing.length ? [...prev, ...missing] : prev;
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const upsertCustomBgmTrack = (detail: {
    name: string;
    url: string;
    artist?: string;
    trackKey?: string;
    persist?: boolean;
  }): number => {
    const { name, url, artist, trackKey, persist = false } = detail;
    if (!url) return 0;
    if (isBgmTrackHidden({ url, trackKey })) return -1;

    const current = [...tracksRef.current];
    let trackIndex = -1;

    if (trackKey) {
      trackIndex = current.findIndex((track) => track.trackKey === trackKey);
    }
    if (trackIndex < 0) {
      trackIndex = current.findIndex(
        (track) =>
          track.trackKey &&
          track.name === name &&
          track.url === url &&
          track.artist === (artist || track.artist),
      );
    }

    const nextTrack: BgmTrack = {
      name,
      url,
      artist: artist || "Custom Track",
      trackKey: trackKey || `custom:${url}:${name}`,
    };

    if (trackIndex >= 0) {
      current[trackIndex] = { ...current[trackIndex], ...nextTrack };
    } else {
      trackIndex = current.length;
      current.push(nextTrack);
      const nextShuffle = [...shuffledIndicesRef.current, trackIndex];
      shuffledIndicesRef.current = nextShuffle;
      setShuffledIndices(nextShuffle);
    }

    tracksRef.current = current;
    setTracks(current);

    if (persist) {
      const persisted = current
        .filter(
          (track) =>
            !!track.trackKey &&
            track.trackKey.startsWith("daily:") &&
            !isBgmTrackHidden(track),
        )
        .map(
          (track): PersistedBgmTrack => ({
            name: track.name,
            url: track.trackKey ? toPersistedBgmUrl(track.trackKey) : track.url,
            artist: track.artist || "Custom Track",
            trackKey: track.trackKey!,
          }),
        );
      savePersistedExtraBgmTracks(persisted);
    }

    return trackIndex;
  };

  // --- CUSTOM BGM EVENTS ---
  useEffect(() => {
    const handleCustomBgmEvent = (e: Event, shouldPlay: boolean) => {
      const customEvent = e as CustomEvent;
      const { name, url, artist, trackKey, persist = true } = customEvent.detail || {};
      if (!url || !name) return;

      try {
        getSharedAudioContext();
      } catch (_) {}

      const trackIndex = upsertCustomBgmTrack({
        name,
        url,
        artist,
        trackKey,
        persist,
      });

      if (shouldPlay && trackIndex >= 0 && isPlayingRef.current) {
        queueAndPlayTrackRef.current(trackIndex);
      }
    };

    const handlePlayCustomBgm = (e: Event) => handleCustomBgmEvent(e, true);
    const handleRegisterCustomBgm = (e: Event) => handleCustomBgmEvent(e, false);

    const handleUnlockAudio = () => {
      try {
        const ctx = getSharedAudioContext();
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      } catch (_) {}
      if (isPlayingRef.current) {
        const curTrackIndex = shuffledIndicesRef.current[queueIndexRef.current] ?? activeTrackIndexRef.current;
        try {
          playTrackDirectly(curTrackIndex, false);
        } catch (_) {}
      }
    };

    window.addEventListener("play-custom-bgm", handlePlayCustomBgm);
    window.addEventListener("register-custom-bgm", handleRegisterCustomBgm);
    window.addEventListener("unlock-bgm-audio", handleUnlockAudio);
    return () => {
      window.removeEventListener("play-custom-bgm", handlePlayCustomBgm);
      window.removeEventListener("register-custom-bgm", handleRegisterCustomBgm);
      window.removeEventListener("unlock-bgm-audio", handleUnlockAudio);
    };
  }, []);

  // --- CLICK OUTSIDE TO CLOSE VOLUME SLIDER ---
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (volumeRef.current && !volumeRef.current.contains(e.target as Node)) {
        setShowVolumeSlider(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // --- AUTOPLAY UNLOCKER & AUDIO RECOVERY ---
  useEffect(() => {
    const triggerAudioRecovery = () => {
      try {
        const ctx = getSharedAudioContext();
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      } catch (_) {}

      if (isPlayingRef.current) {
        const curTrackIndex = shuffledIndicesRef.current[queueIndexRef.current] ?? activeTrackIndexRef.current;
        const track = tracksRef.current[curTrackIndex] || tracksRef.current[0];
        if (track.url.startsWith("synth")) {
          if (!masterGainRef.current || activeNodesRef.current.length === 0) {
            playTrackDirectly(curTrackIndex, false);
          }
        } else {
          const audio = audioRef.current;
          if (audio && audio.paused) {
            audio.play().catch(() => {
              playTrackDirectly(curTrackIndex, false);
            });
          }
        }
      }
    };

    const ctx = getSharedAudioContext();
    const handleContextStateChange = () => {
      if (ctx.state === 'running') {
        triggerAudioRecovery();
      }
    };
    ctx.addEventListener('statechange', handleContextStateChange);

    window.addEventListener("click", triggerAudioRecovery, { passive: true });
    window.addEventListener("touchstart", triggerAudioRecovery, { passive: true });
    window.addEventListener("touchend", triggerAudioRecovery, { passive: true });
    window.addEventListener("pointerdown", triggerAudioRecovery, { passive: true });
    window.addEventListener("keydown", triggerAudioRecovery, { passive: true });

    return () => {
      ctx.removeEventListener('statechange', handleContextStateChange);
      window.removeEventListener("click", triggerAudioRecovery);
      window.removeEventListener("touchstart", triggerAudioRecovery);
      window.removeEventListener("touchend", triggerAudioRecovery);
      window.removeEventListener("pointerdown", triggerAudioRecovery);
      window.removeEventListener("keydown", triggerAudioRecovery);
    };
  }, []);

  // --- REACTIVE AUDIO SYNC (Single source of truth for playback synchronization) ---
  useEffect(() => {
    const audio = audioRef.current;

    if (!isPlaying) {
      if (audio) {
        try {
          if (!audio.paused) audio.pause();
        } catch (_) {}
      }
      stopProceduralSynth();
      isPlayInitiatedRef.current = "";
      setIsBuffering(false);
      return;
    }

    const currentIdx = shuffledIndices[queueIndex] ?? activeTrackIndexRef.current;
    if (isTrackAlreadyPlaying(currentIdx)) {
      setIsBuffering(false);
      return;
    }

    playTrackDirectly(currentIdx);
  }, [isPlaying, queueIndex, tracks.length, shuffledIndices]);

  useEffect(() => {
    const targetVol = isMuted ? 0 : volume;
    setHtmlBgmGain(targetVol);
    if (masterGainRef.current) {
      masterGainRef.current.gain.setValueAtTime(targetVol * AMBIENT_MASTER_GAIN_SCALE, getSharedAudioContext().currentTime);
    }
  }, [volume, isMuted]);

  // --- AUDIO EXCEPTION RETRY FRAMEWORK ---
  const handleAudioError = () => {
    const audio = audioRef.current;
    if (!audio) return;

    const err = audio.error;
    if (err) {
      console.warn("HTML5 Audio Error details:", { code: err.code, message: err.message });
      if (err.code === 1) {
        console.warn("Audio abort detected (normally due to track change). Ignoring.");
        return;
      }
    }

    setIsBuffering(false);
    const failedTrack = getActiveTrack();
    const maxRetries = 2;

    const retryPlayback = async () => {
      if (!audioRef.current || !isPlayingRef.current) return;
      const resolvedUrl = await resolvePlaybackUrlRef.current(failedTrack.url, failedTrack.trackKey);
      const targetUrl = resolvedUrl || failedTrack.url;
      if (needsBgmUrlResolution(targetUrl, failedTrack.trackKey) && !resolvedUrl) {
        skipUnresolvableTrackRef.current(activeTrackIndexRef.current);
        return;
      }
      audioRef.current.src = targetUrl;
      audioRef.current.load();
      audioRef.current.play().catch((playErr) => {
        console.warn("Retry play failed (expected in test/headless environments):", playErr);
      });
    };

    if (retryCount < maxRetries) {
      setRetryCount((prev) => prev + 1);
      setTimeout(() => {
        void retryPlayback();
      }, 1500);
      return;
    }

    setRetryCount(0);
    const fallbackSynthIdx = tracksRef.current.findIndex((t) => t.url === "synth-space");
    if (failedTrack.url.startsWith("/music/") && fallbackSynthIdx >= 0) {
      console.warn("Legacy MP3 failed to load. Falling back to procedural synth.");
      handleSelectTrackRef.current(fallbackSynthIdx);
      return;
    }

    if (needsBgmUrlResolution(failedTrack.url, failedTrack.trackKey)) {
      skipUnresolvableTrackRef.current(activeTrackIndexRef.current);
      return;
    }

    if (activeTrackIndexRef.current !== 0) {
      console.warn("Track failed to load. Falling back to default synth.");
      handleSelectTrackRef.current(0);
    }
  };

  const handleAudioWaiting = () => setIsBuffering(true);
  const handleAudioPlaying = () => setIsBuffering(false);

  // --- RENDER COMPONENT ---
  return (
    <div className={`relative font-sans select-none z-50 transition-all duration-300 ${isPanelActive ? "opacity-0 pointer-events-none scale-75" : "opacity-100"}`}>
      {/* Invisible HTML5 Audio Node for Legacy MP3s */}
      <audio
        ref={audioRef}
        onEnded={repeatMode === "one" ? undefined : handleTrackEnded}
        onError={handleAudioError}
        onWaiting={handleAudioWaiting}
        onPlaying={handleAudioPlaying}
        loop={repeatMode === "one"}
        preload={shouldPreloadBgmAudio() ? "auto" : "none"}
      />

      {/* Floating control bar */}
      {isCollapsed ? (
        <div
          className="flex items-center gap-1 rounded-full glass border border-white/20 shadow-xl p-1 bg-black/40 backdrop-blur-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handlePlayToggle}
            className={`relative rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 group ${
              isPlaying
                ? "shadow-[0_0_16px_rgba(254,202,87,0.45)] ring-2 ring-amber-400/50"
                : "opacity-75 hover:opacity-100 ring-1 ring-white/20"
            }`}
            title={isPlaying ? "배경음 일시정지 (LP판 회전 중)" : "배경음 재생 (LP판 멈춤)"}
            aria-label={isPlaying ? "배경음 일시정지" : "배경음 재생"}
          >
            <LPRecordDisc isPlaying={isPlaying} isBuffering={isBuffering} size="lg" />
          </button>
          <button
            type="button"
            onClick={handleExpandPlayer}
            className="w-7 h-11 rounded-full flex items-center justify-center shrink-0 text-white/45 hover:text-white hover:bg-white/10 active:scale-95 transition-colors"
            title="플레이어 펼치기 (→)"
            aria-label="플레이어 펼치기"
          >
            <ChevronRight className="w-4 h-4 shrink-0" strokeWidth={2} />
          </button>
        </div>
      ) : (
      <div
        className="flex items-center gap-1.5 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full glass border border-white/15 shadow-2xl hover:border-white/30 transition-all duration-300 relative max-w-[calc(100vw-2.5rem)] md:max-w-md bg-black/40 backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Record Vinyl */}
        <div 
          onClick={(e) => handlePlayToggle(e)}
          className={`relative shrink-0 cursor-pointer active:scale-95 transition-all rounded-full ${
            isPlaying ? "shadow-[0_0_14px_rgba(254,202,87,0.4)] ring-1 ring-amber-400/40" : "opacity-75 hover:opacity-100"
          }`}
          title={isPlaying ? "일시정지 (LP판 멈춤)" : "재생 (LP판 회전)"}
        >
          <LPRecordDisc isPlaying={isPlaying} isBuffering={isBuffering} size="sm" />
        </div>

        {/* Clickable Select dropdown track info panel */}
        <div 
          onClick={() => setShowPlaylist(p => !p)}
          className="flex items-center gap-1 cursor-pointer bg-white/5 hover:bg-white/10 px-1.5 sm:px-2 py-0.5 rounded-full border border-white/5 transition-all max-w-[80px] xs:max-w-[120px] sm:max-w-[150px] shrink-0 group/title"
          title="Click to open playlist (목록 보기)"
        >
          <div className="flex flex-col truncate max-w-[80%]">
            <span className="text-[9px] sm:text-[10px] font-bold text-white/90 truncate leading-tight tracking-wide flex items-center gap-1">
              {currentTrack.name}
              {isBuffering && <RefreshCw size={8} className="animate-spin text-white shrink-0" />}
            </span>
            <span className="text-[7px] sm:text-[8px] text-white/40 truncate tracking-wider leading-none">
              {currentTrack.artist}
            </span>
          </div>
          <ChevronDown size={8} className="text-white/40 group-hover/title:text-white transition-colors shrink-0" />
        </div>

        {/* Reactive waves visualizer - Hidden on small mobile to save space */}
        <div className="hidden sm:flex items-end gap-[2px] h-3 w-5 shrink-0 px-0.5">
          {[1, 2, 3, 4].map(idx => {
            let animDur = "0.6s";
            if (idx === 2) animDur = "0.4s";
            if (idx === 3) animDur = "0.8s";
            if (idx === 4) animDur = "0.5s";
            return (
              <span
                key={idx}
                style={{
                  animationDuration: animDur,
                  animationIterationCount: "infinite",
                  animationTimingFunction: "ease-in-out"
                }}
                className={`w-[2px] rounded-full bg-gradient-to-t from-white/40 to-white transition-all duration-300 ${
                  isPlaying && !isBuffering ? "animate-bounce" : "h-[2px] opacity-30"
                }`}
              />
            );
          })}
        </div>

        {/* Media Buttons Controls */}
        <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0 border-l border-white/10 pl-1 sm:pl-2">
          <button 
            onClick={handlePrevTrack}
            className="p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
            title="Previous Track"
          >
            <SkipForward size={10} className="rotate-180" />
          </button>

          <button 
            onClick={handleNextTrack}
            className="p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
            title="Next Track"
          >
            <SkipForward size={10} />
          </button>

          <button 
            onClick={handleToggleShuffle}
            className={`hidden sm:inline-flex p-1 rounded-full active:scale-90 transition-all ${
              isShuffle ? "text-white bg-white/10 shadow-[0_0_8px_rgba(255,255,255,0.2)]" : "text-white/40 hover:text-white"
            }`}
            title="Shuffle mode"
          >
            <Shuffle size={10} />
          </button>

          <button 
            onClick={handleToggleRepeat}
            className={`hidden sm:inline-flex p-1 rounded-full active:scale-90 transition-all ${
              repeatMode !== "off" ? "text-white bg-white/10 shadow-[0_0_8px_rgba(255,255,255,0.2)]" : "text-white/40 hover:text-white"
            }`}
            title={REPEAT_MODE_LABEL[repeatMode]}
            aria-label={REPEAT_MODE_LABEL[repeatMode]}
          >
            {repeatMode === "one" ? <Repeat1 size={10} /> : <Repeat size={10} />}
          </button>

          {/* Volume control with Slider */}
          <div 
            ref={volumeRef}
            className="relative flex items-center"
          >
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowVolumeSlider(prev => !prev);
              }}
              className={`p-1 rounded-full active:scale-90 transition-all ${
                showVolumeSlider ? "text-white bg-white/10" : "text-white/40 hover:text-white"
              }`}
              title="Volume Adjust"
            >
              {isMuted ? <VolumeX size={10} className="text-white" /> : <Volume2 size={10} />}
            </button>

            {/* Volume Slider Panel */}
            <div className={`absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-slate-950/95 border border-white/10 rounded-xl px-2.5 py-2.5 shadow-2xl flex flex-col items-center gap-1.5 transition-all duration-300 backdrop-blur-xl ${
              showVolumeSlider ? "opacity-100 translate-y-0 scale-100 pointer-events-auto" : "opacity-0 translate-y-2 scale-90 pointer-events-none"
            }`}>
              <button 
                onClick={handleToggleMute}
                className="p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 active:scale-95 transition-all shrink-0"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX size={10} className="text-white" /> : <Volume2 size={10} />}
              </button>
              <span className="text-[7px] font-bold text-white/60 tracking-wider">
                {isMuted ? "MUTED" : `${Math.round(volume * 100)}%`}
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-1.5 h-16 accent-white bg-white/10 rounded-lg cursor-pointer vertical-range-slider"
                style={{ WebkitAppearance: "slider-vertical" } as any}
              />
            </div>
          </div>



          <button
            type="button"
            onClick={handleCollapse}
            className="p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
            title="플레이어 접기 (←)"
            aria-label="음악 플레이어 접기"
          >
            <ChevronLeft size={10} />
          </button>
        </div>

        {/* --- PREMIUM PLAYLIST DROPDOWN MENU --- */}
        <div className={`absolute bottom-full mb-3 left-0 w-[240px] bg-slate-950/95 border border-white/10 rounded-2xl p-2.5 shadow-2xl transition-all duration-300 flex flex-col gap-1.5 backdrop-blur-xl ${
          showPlaylist ? "opacity-100 translate-y-0 scale-100 pointer-events-auto" : "opacity-0 translate-y-3 scale-95 pointer-events-none"
        }`}>
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5 px-1.5 gap-2">
            <span className="text-[9px] font-extrabold text-white/90 uppercase tracking-widest flex items-center gap-1 min-w-0">
              <Music size={10} className="text-white animate-pulse shrink-0" />
              <span className="truncate">
                {showHiddenTracks ? "숨김 곡" : "Lucy Ambient Tracks"}
              </span>
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {hiddenTracks.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleHiddenTracks}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[7px] font-semibold transition-all ${
                    showHiddenTracks
                      ? "text-white bg-white/15 border border-white/20"
                      : "text-white/45 hover:text-white border border-transparent hover:bg-white/5"
                  }`}
                  title={showHiddenTracks ? "재생 목록 보기" : "숨김 곡 보기"}
                >
                  <EyeOff size={8} />
                  {showHiddenTracks ? "목록" : `숨김 ${hiddenTracks.length}`}
                </button>
              )}
              <span className="text-[7px] font-semibold text-white/40">
                {showHiddenTracks ? `${hiddenTracks.length} hidden` : `${tracks.length} tracks`}
              </span>
            </div>
          </div>

          {/* Quick controls inside playlist for mobile users */}
          <div className="flex sm:hidden items-center justify-end gap-2 px-1.5 py-1 border-b border-white/5 mb-1 bg-white/[0.02] rounded-lg">
            <span className="text-[8px] text-white/40 mr-auto">Controls:</span>
            <button 
              type="button"
              onClick={handleToggleShuffle}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-semibold transition-all ${
                isShuffle ? "text-white bg-white/15 border border-white/20" : "text-white/40 border border-transparent hover:text-white"
              }`}
            >
              <Shuffle size={8} /> Shuffle
            </button>
            <button 
              type="button"
              onClick={handleToggleRepeat}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-semibold transition-all ${
                repeatMode !== "off" ? "text-white bg-white/15 border border-white/20" : "text-white/40 border border-transparent hover:text-white"
              }`}
              title={REPEAT_MODE_LABEL[repeatMode]}
            >
              {repeatMode === "one" ? <Repeat1 size={8} /> : <Repeat size={8} />}
              {repeatMode === "one" ? "1곡" : repeatMode === "all" ? "전체" : "반복"}
            </button>
          </div>

          {/* Tracks list container */}
          <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto pr-0.5 custom-scrollbar">
            {showHiddenTracks ? (
              hiddenTracks.length > 0 ? (
                hiddenTracks.map((hidden) => (
                  <div
                    key={hidden.id}
                    className="flex items-center gap-1 w-full rounded-xl border border-transparent hover:bg-white/5 transition-all duration-150"
                  >
                    <div className="flex flex-1 min-w-0 flex-col px-2 py-1.5 text-white/50">
                      <span className="text-[9px] truncate">{hidden.name}</span>
                      <span className="text-[7px] text-white/30 truncate">
                        {hidden.artist || "숨김 처리됨"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleRestoreTrack(hidden, e)}
                      className="shrink-0 p-1.5 rounded-lg text-white/35 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all"
                      title="목록에 다시 추가"
                      aria-label={`${hidden.name} 목록에 복원`}
                    >
                      <RotateCcw size={10} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => void handlePermanentDeleteTrack(hidden, e)}
                      className="shrink-0 p-1.5 mr-0.5 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/15 transition-all"
                      title="영원히 삭제"
                      aria-label={`${hidden.name} 영원히 삭제`}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))
              ) : (
                <p className="px-2 py-3 text-[8px] text-white/35 text-center">
                  숨긴 곡이 없습니다.
                </p>
              )
            ) : tracks.map((track, idx) => {
              const isActive = shuffledIndices[queueIndex] === idx;
              const rowKey = getBgmTrackId(track);
              return (
                <div
                  key={rowKey}
                  className={`flex items-center gap-1 w-full rounded-xl transition-all duration-150 ${
                    isActive
                      ? "bg-white/10 border border-white/30"
                      : "hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectTrack(idx)}
                    className={`flex flex-1 min-w-0 items-center justify-between text-left px-2 py-1.5 transition-all duration-150 ${
                      isActive
                        ? "text-white font-semibold"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    <div className="flex flex-col min-w-0 max-w-[85%]">
                      <span className="text-[9px] truncate">{track.name}</span>
                      <span className="text-[7px] text-white/40 truncate">{track.artist}</span>
                    </div>
                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#ffffff] shrink-0 animate-ping" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleRemoveTrack(idx, e)}
                    disabled={tracks.length <= 1}
                    className="shrink-0 p-1.5 mr-0.5 rounded-lg text-white/30 hover:text-rose-300 hover:bg-rose-500/10 disabled:opacity-20 disabled:pointer-events-none transition-all"
                    title="목록에서 제거"
                    aria-label={`${track.name} 목록에서 제거`}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>
      )}
    </div>
  );
}
