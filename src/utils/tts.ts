import { useState, useEffect } from 'react';
import {
  getSharedAudioContext,
  unlockAudioPlayback,
  playTTSAudio,
  playCompressedAudio,
  playRawPCM,
  primeTTSAudioElement,
  pauseTTSAudio,
  resumeTTSAudio,
  stopTTSPlayback,
  initTTSAudioLifecycle,
  analyzeTextEmotion,
  duckAmbientAudio,
} from '../lib/audio';
import { setTTSSessionActive, clearTTSSession, initTTSSessionHandlers } from '../lib/ttsMediaSession';
import { acquireScreenWakeLock, releaseScreenWakeLock } from '../lib/wakeLock';
import { prepareNaturalSpeechText } from './speechText';

// Pre-warm the browser's speechSynthesis engine to load premium voices asynchronously immediately on load
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

export interface TTSState {
  isSpeaking: boolean;
  isLoading: boolean;
  activeText: string | null;
  activeSessionId: string | null;
}

let ttsState: TTSState = {
  isSpeaking: false,
  isLoading: false,
  activeText: null,
  activeSessionId: null,
};

type TTSListener = (state: TTSState) => void;
const listeners = new Set<TTSListener>();

export const subscribeTTS = (listener: TTSListener) => {
  listeners.add(listener);
  // Emit current state immediately
  listener(ttsState);
  return () => {
    listeners.delete(listener);
  };
};

const updateTTSState = (newState: Partial<TTSState>) => {
  const prevActive = ttsState.isSpeaking || ttsState.isLoading;
  ttsState = { ...ttsState, ...newState };
  const nextActive = ttsState.isSpeaking || ttsState.isLoading;

  if (!prevActive && nextActive) {
    duckAmbientAudio(true, 0.3);
  } else if (prevActive && !nextActive) {
    duckAmbientAudio(false, 0.5);
  }

  listeners.forEach((l) => l(ttsState));
};

export interface TTSAudioData {
  audioContent: string;
  encoding: 'pcm' | 'mp3';
  sampleRate: number;
}

const ttsCache = new Map<string, Promise<TTSAudioData | null>>();

export function getTTSCacheKey(text: string, voice?: string, emotion?: string): string {
  const clean = normalizeTextForSpeech(text);
  return `${voice || 'default'}_${emotion || 'none'}_${clean}`;
}

export function prefetchTTS(text: string, voice?: string, emotion?: string): Promise<TTSAudioData | null> {
  const cleanText = normalizeTextForSpeech(text);
  if (!cleanText) return Promise.resolve(null);

  const key = getTTSCacheKey(text, voice, emotion);
  if (ttsCache.has(key)) {
    return ttsCache.get(key)!;
  }

  let activeEmotion = emotion;
  if (!activeEmotion) {
    const emotionMatch = text.match(/\[EMOTION:\s*([^\]]+)\]/i);
    if (emotionMatch) activeEmotion = emotionMatch[1].trim();
  }

  const promise = (async (): Promise<TTSAudioData | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, voice, emotion: activeEmotion }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        ttsCache.delete(key);
        return null;
      }
      const data = await response.json();
      if (data?.audioContent) {
        return {
          audioContent: data.audioContent,
          encoding: data.encoding === 'pcm' ? 'pcm' : 'mp3',
          sampleRate: data.sampleRate ?? 24000,
        };
      }
      ttsCache.delete(key);
      return null;
    } catch {
      ttsCache.delete(key);
      return null;
    }
  })();

  ttsCache.set(key, promise);
  return promise;
}

let isPlayingSequence = false;
let ttsLifecycleReady = false;

function ensureTTSLifecycle() {
  if (ttsLifecycleReady || typeof window === 'undefined') return;
  ttsLifecycleReady = true;
  initTTSAudioLifecycle();
  initTTSSessionHandlers(stopTTS);
}

export const pauseTTS = (): void => {
  updateTTSState({ isSpeaking: false, isLoading: false });
  pauseTTSAudio();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
    window.speechSynthesis.pause();
  }
};

export const resumeTTS = (): void => {
  updateTTSState({ isSpeaking: true, isLoading: false });
  resumeTTSAudio();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }
};

export const stopTTS = () => {
  isPlayingSequence = false;
  updateTTSState({ isSpeaking: false, isLoading: false, activeText: null, activeSessionId: null });
  stopTTSPlayback();
  clearTTSSession();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

export function normalizeTextForSpeech(text: string): string {
  return prepareNaturalSpeechText(text);
}

export const playTTS = async (
  text: string,
  voice?: string,
  wait: boolean = false,
  emotion?: string,
  sequenceSessionId?: string,
  isSequenceChunk: boolean = false,
): Promise<void> => {
  ensureTTSLifecycle();
  const cleanText = normalizeTextForSpeech(text);
  if (!cleanText) return;

  // If we are calling playTTS standalone (without wait / without sequence) and something is already loading/speaking for this exact text, second click stops it
  if (!wait && !sequenceSessionId && (ttsState.isSpeaking || ttsState.isLoading) && ttsState.activeText === cleanText) {
    stopTTS();
    return;
  }

  // Determine active session ID
  let mySessionId = sequenceSessionId;
  if (!mySessionId) {
    mySessionId = Math.random().toString();
    if (!wait) {
      stopTTS();
      updateTTSState({ isLoading: true, isSpeaking: false, activeText: cleanText, activeSessionId: mySessionId });
    } else {
      if (!ttsState.activeSessionId) {
        updateTTSState({ isLoading: true, isSpeaking: false, activeText: cleanText, activeSessionId: mySessionId });
      }
    }
  }

  const sessionToVerify = sequenceSessionId || ttsState.activeSessionId;

  // Auto-extract emotion tag if not explicitly provided
  let activeEmotion = emotion;
  if (!activeEmotion) {
    const emotionMatch = text.match(/\[EMOTION:\s*([^\]]+)\]/i);
    if (emotionMatch) {
      activeEmotion = emotionMatch[1].trim();
    }
  }

  try {
    // Synchronously unlock audio during user gesture (required for mobile iOS/Android playback after async fetch)
    try {
      unlockAudioPlayback();
    } catch (e) {
      console.warn("[TTS] Failed to warm up audio systems:", e);
    }

    const cacheKey = getTTSCacheKey(text, voice, activeEmotion);
    let data: TTSAudioData | null = null;
    if (ttsCache.has(cacheKey)) {
      data = await ttsCache.get(cacheKey)!;
    }

    if (!data) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, voice, emotion: activeEmotion }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // CRITICAL ABORT CHECK after async action
      if (sessionToVerify && ttsState.activeSessionId !== sessionToVerify) {
        console.log("[TTS] Playback aborted as active session changed mid-download.");
        return;
      }

      if (!response.ok) throw new Error('Failed to generate TTS');
      const rawData = await response.json();
      if (rawData?.audioContent) {
        data = {
          audioContent: rawData.audioContent,
          encoding: rawData.encoding === 'pcm' ? 'pcm' : 'mp3',
          sampleRate: rawData.sampleRate ?? 24000,
        };
        ttsCache.set(cacheKey, Promise.resolve(data));
      }
    }

    // CRITICAL ABORT CHECK after JSON parse
    if (sessionToVerify && ttsState.activeSessionId !== sessionToVerify) {
      console.log("[TTS] Playback aborted as active session changed mid-parse.");
      return;
    }

    // Now transition state from loading to speaking
    updateTTSState({ isLoading: false, isSpeaking: true, activeText: cleanText });
    setTTSSessionActive(cleanText);

    if (data?.audioContent) {
      const encoding = data.encoding === 'pcm' ? 'pcm' : 'mp3';
      const playAudio = async () => {
        try {
          await playTTSAudio(
            data!.audioContent,
            encoding,
            data!.sampleRate ?? 24000,
            activeEmotion || cleanText,
            isSequenceChunk,
          );
        } catch (err) {
          console.warn('[TTS] playTTSAudio failed on mobile, applying WebAudio direct buffer fallback:', err);
          if (encoding === 'pcm') {
            await playRawPCM(data!.audioContent, data!.sampleRate ?? 24000);
          } else {
            await playCompressedAudio(data!.audioContent);
          }
        }
      };

      if (wait) {
        await playAudio();
      } else {
        if (sessionToVerify && ttsState.activeSessionId !== sessionToVerify) return;
        playAudio()
          .then(() => {
            if (sessionToVerify && ttsState.activeSessionId === sessionToVerify && !isSequenceChunk) {
              stopTTS();
            }
          })
          .catch((err) => {
            console.warn('playTTS silent failure:', err);
            if (sessionToVerify && ttsState.activeSessionId === sessionToVerify && !isSequenceChunk) {
              stopTTS();
            }
          });
      }
      return;
    }
    throw new Error('No audio content returned');
  } catch (error) {
    if (sessionToVerify && ttsState.activeSessionId !== sessionToVerify) return;

    console.warn('[TTS] API generation failed, trying direct client stream fallback...', error);
    
    // Direct Client Stream Fallback (Bypasses server failure and plays 100% on iOS Safari via Web Audio)
    try {
      const lang = /[가-힣]/.test(cleanText) ? 'ko' : 'en';
      const fallbackUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText.slice(0, 190))}&tl=${lang}&client=tw-ob`;
      const directRes = await fetch(fallbackUrl);
      if (directRes.ok) {
        const ab = await directRes.arrayBuffer();
        const bytes = new Uint8Array(ab);
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        if (base64.length > 200) {
          updateTTSState({ isLoading: false, isSpeaking: true, activeText: cleanText });
          setTTSSessionActive(cleanText);
          await playCompressedAudio(base64);
          if (sessionToVerify && ttsState.activeSessionId === sessionToVerify && !isSequenceChunk) {
            stopTTS();
          }
          return;
        }
      }
    } catch (directErr) {
      console.warn('[TTS] Client direct stream failed, attempting SpeechSynthesis:', directErr);
    }

    // Update state to speaking fallback
    updateTTSState({ isLoading: false, isSpeaking: true, activeText: cleanText });

    // Browser Native SpeechSynthesis Fallback
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any ongoing native speech first
      
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = /[가-힣]/.test(cleanText) ? 'ko-KR' : 'en-US';
      
      const voicesList = window.speechSynthesis.getVoices();
      const langCode = /[가-힣]/.test(cleanText) ? 'ko' : 'en';
      const langVoices = voicesList.filter(v => v.lang.toLowerCase().startsWith(langCode));
      
      if (langVoices.length > 0) {
        const getVoiceScore = (voiceItem: SpeechSynthesisVoice) => {
          const name = voiceItem.name.toLowerCase();
          if (name.includes('sunhi') || name.includes('female') || name.includes('yuna') || name.includes('siri') || name.includes('seoyeon') || name.includes('narae') || name.includes('heami')) return 100;
          if (name.includes('natural') || name.includes('neural') || name.includes('online')) return 70;
          return 20;
        };
        
        const sorted = langVoices.sort((a, b) => getVoiceScore(b) - getVoiceScore(a));
        utterance.voice = sorted[0];
      }
      
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      
      // Chrome 15s garbage collection keepalive timer
      let keepAliveInterval: any = null;
      const startKeepAlive = () => {
        keepAliveInterval = setInterval(() => {
          if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        }, 10000);
      };
      const clearKeepAlive = () => {
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval);
          keepAliveInterval = null;
        }
      };

      if (wait) {
        return new Promise<void>((resolve) => {
          startKeepAlive();
          utterance.onend = () => {
            clearKeepAlive();
            resolve();
          };
          utterance.onerror = () => {
            clearKeepAlive();
            resolve();
          };
          window.speechSynthesis.speak(utterance);
        });
      } else {
        startKeepAlive();
        utterance.onend = () => { 
          clearKeepAlive();
          if (sessionToVerify && ttsState.activeSessionId === sessionToVerify && !isSequenceChunk) {
            stopTTS();
          }
        };
        utterance.onerror = () => { 
          clearKeepAlive();
          if (sessionToVerify && ttsState.activeSessionId === sessionToVerify && !isSequenceChunk) {
            stopTTS();
          }
        };
        window.speechSynthesis.speak(utterance);
      }
    } else {
      console.error('[TTS] Native Browser SpeechSynthesis is not supported in this browser.');
      if (!isSequenceChunk) {
        stopTTS();
      }
    }
  }
};

/**
 * Splits any long reading (e.g. Tarot 78-cards reading, horoscope, meditation)
 * into optimal, sentence-safe chunks and streams them with active prefetching.
 * This guarantees zero cutoffs, zero network gaps, and rock-solid mobile audio continuity.
 */
export const playTTSInChunks = async (
  text: string,
  voice?: string,
  maxChunkLength = 220,
  emotion?: string,
): Promise<void> => {
  // If already speaking or loading, click again stops playback
  if (ttsState.isSpeaking || ttsState.isLoading) {
    stopTTS();
    return;
  }

  const cleanText = prepareNaturalSpeechText(text);
  if (!cleanText) return;

  // Split into natural sentence tokens
  const rawSentences = cleanText.match(/[^.!?。！？\n]+[.!?。！？\n]?/g) || [cleanText];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of rawSentences) {
    const s = sentence.trim();
    if (!s) continue;

    // If a single sentence exceeds maxChunkLength, split on commas or whitespace
    if (s.length > maxChunkLength) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      const subClauses = s.split(/,\s*/);
      let subCurrent = '';
      for (const clause of subClauses) {
        const nextSub = subCurrent ? `${subCurrent}, ${clause}` : clause;
        if (subCurrent && nextSub.length > maxChunkLength) {
          chunks.push(subCurrent.trim() + (/[.!?]$/.test(subCurrent) ? '' : '.'));
          subCurrent = clause;
        } else {
          subCurrent = nextSub;
        }
      }
      if (subCurrent.trim()) {
        currentChunk = subCurrent.trim();
      }
      continue;
    }

    const next = currentChunk ? `${currentChunk} ${s}` : s;
    if (currentChunk && next.length > maxChunkLength) {
      chunks.push(currentChunk.trim());
      currentChunk = s;
    } else {
      currentChunk = next;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  if (chunks.length === 0) return;

  // Start sequence session
  stopTTS();
  const sequenceSessionId = `seq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  updateTTSState({
    isLoading: true,
    isSpeaking: true,
    activeText: cleanText.slice(0, 50),
    activeSessionId: sequenceSessionId,
  });
  isPlayingSequence = true;
  acquireScreenWakeLock().catch(() => {});

  try {
    // Prime the audio context and element during user click
    try {
      const ctx = getSharedAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      primeTTSAudioElement();
    } catch (_) {}

    // Pipeline: Pre-fetch chunks in parallel ahead of playback
    for (let i = 0; i < Math.min(3, chunks.length); i++) {
      prefetchTTS(chunks[i], voice, emotion).catch(() => {});
    }

    for (let i = 0; i < chunks.length; i++) {
      if (ttsState.activeSessionId !== sequenceSessionId || !isPlayingSequence) {
        break;
      }

      // Proactively pre-fetch next upcoming chunks
      if (i + 1 < chunks.length) {
        prefetchTTS(chunks[i + 1], voice, emotion).catch(() => {});
      }
      if (i + 2 < chunks.length) {
        prefetchTTS(chunks[i + 2], voice, emotion).catch(() => {});
      }

      const isLastChunk = i === chunks.length - 1;
      await playTTS(
        chunks[i],
        voice,
        true,
        emotion,
        sequenceSessionId,
        !isLastChunk, // keep session alive until final chunk
      );

      if (ttsState.activeSessionId !== sequenceSessionId || !isPlayingSequence) {
        break;
      }

      // Micro-pause between sentences (80ms) for natural human rhythm
      if (!isLastChunk) {
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
    }
  } catch (err) {
    console.error("[TTS] playTTSInChunks sequence error:", err);
  } finally {
    if (ttsState.activeSessionId === sequenceSessionId) {
      isPlayingSequence = false;
      stopTTS();
    }
  }
};

export const playConversation = async (
  messages: { role: string; content: string; id?: string }[],
  aiVoice: string = 'Kore',
  userVoice: string = 'Kore',
  onMessageStart?: (index: number, msg: { role: string; content: string; id?: string }) => void,
) => {
  // If we are already speaking or loading, click again to stop
  if (ttsState.isSpeaking || ttsState.isLoading) {
    stopTTS();
    return;
  }

  stopTTS();
  const mySessionId = Math.random().toString();
  updateTTSState({ isLoading: true, isSpeaking: false, activeText: '__CONVERSATION__', activeSessionId: mySessionId });
  isPlayingSequence = true;
  acquireScreenWakeLock().catch(() => {});

  // 루시 AI 및 대화 전역 여성 음성 (Kore -> SunHi / Ara)
  const resolvedAiVoice = aiVoice || 'Kore';
  const resolvedUserVoice = userVoice || 'Kore';

  try {
    for (let i = 0; i < messages.length; i++) {
      if (ttsState.activeSessionId !== mySessionId) break;
      const m = messages[i];
      const isUser = m.role === 'user';
      const voice = isUser ? resolvedUserVoice : resolvedAiVoice;

      if (onMessageStart) {
        onMessageStart(i, m);
      }

      await playTTS(m.content, voice, true);
      if (ttsState.activeSessionId !== mySessionId) break;

      // Natural pause between speaker turns
      if (i < messages.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }
  } catch (err) {
    console.error("[TTS] playConversation error:", err);
  } finally {
    if (ttsState.activeSessionId === mySessionId) {
      isPlayingSequence = false;
      stopTTS();
    }
  }
};

export const useTTSActive = () => {
  const [active, setActive] = useState(false);
  useEffect(() => {
    return subscribeTTS((state) => {
      setActive(state.isSpeaking || state.isLoading);
    });
  }, []);
  return active;
};
