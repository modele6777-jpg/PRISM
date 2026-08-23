import { useState, useEffect } from 'react';
import {
  getSharedAudioContext,
  playTTSAudio,
  primeTTSAudioElement,
  stopTTSPlayback,
  initTTSAudioLifecycle,
  analyzeTextEmotion,
} from '../lib/audio';
import { setTTSSessionActive, clearTTSSession, initTTSSessionHandlers } from '../lib/ttsMediaSession';

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
  ttsState = { ...ttsState, ...newState };
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
      const response = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, voice, emotion: activeEmotion }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (data?.audioContent) {
        return {
          audioContent: data.audioContent,
          encoding: data.encoding === 'pcm' ? 'pcm' : 'mp3',
          sampleRate: data.sampleRate ?? 24000,
        };
      }
      return null;
    } catch {
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
  if (!text) return "";
  return text
    .replace(/\[YOUTUBE:.*?\]/g, "")
    .replace(/\[EMOTION:.*?\]/g, "")
    .replace(/[*#_~`\[\]()]/g, "")
    .trim();
}

export const playTTS = async (text: string, voice?: string, wait: boolean = false, emotion?: string): Promise<void> => {
  ensureTTSLifecycle();
  const cleanText = normalizeTextForSpeech(text);

  // If we are calling playTTS standalone (without wait) and something is already loading/speaking for this exact text, second click stops it
  if (!wait && (ttsState.isSpeaking || ttsState.isLoading) && ttsState.activeText === cleanText) {
    stopTTS();
    return;
  }

  // Generate a brand new unique session key
  const mySessionId = Math.random().toString();
  if (!wait) {
    stopTTS();
    updateTTSState({ isLoading: true, isSpeaking: false, activeText: cleanText, activeSessionId: mySessionId });
  } else {
    // If we are waiting (chained playing), assign session only if none is currently active
    if (!ttsState.activeSessionId) {
      updateTTSState({ isLoading: true, isSpeaking: false, activeText: cleanText, activeSessionId: mySessionId });
    }
  }

  const sessionToVerify = ttsState.activeSessionId;

  // Auto-extract emotion tag if not explicitly provided
  let activeEmotion = emotion;
  if (!activeEmotion) {
    const emotionMatch = text.match(/\[EMOTION:\s*([^\]]+)\]/i);
    if (emotionMatch) {
      activeEmotion = emotionMatch[1].trim();
    }
  }

  try {
    // Synchronously unlock audio during user gesture (required for background playback after async fetch)
    try {
      getSharedAudioContext();
      primeTTSAudioElement();
    } catch (e) {
      console.warn("[TTS] Failed to warm up audio systems:", e);
    }

    const cacheKey = getTTSCacheKey(text, voice, activeEmotion);
    let data: TTSAudioData | null = null;
    if (ttsCache.has(cacheKey)) {
      data = await ttsCache.get(cacheKey)!;
    }

    if (!data) {
      const response = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, voice, emotion: activeEmotion }),
      });

      // CRITICAL ABORT CHECK after async action
      if (ttsState.activeSessionId !== sessionToVerify) {
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
    if (ttsState.activeSessionId !== sessionToVerify) {
      console.log("[TTS] Playback aborted as active session changed mid-parse.");
      return;
    }

    // Now transition state from loading to speaking
    updateTTSState({ isLoading: false, isSpeaking: true });
    setTTSSessionActive(cleanText);

    if (data?.audioContent) {
      const encoding = data.encoding === 'pcm' ? 'pcm' : 'mp3';
      const playAudio = () => playTTSAudio(data!.audioContent, encoding, data!.sampleRate ?? 24000, activeEmotion || cleanText);

      if (wait) {
        await playAudio();
      } else {
        if (ttsState.activeSessionId !== sessionToVerify) return;
        playAudio()
          .then(() => {
            if (ttsState.activeSessionId === sessionToVerify) {
              stopTTS();
            }
          })
          .catch((err) => {
            console.warn('playTTS silent failure:', err);
            if (ttsState.activeSessionId === sessionToVerify) {
              stopTTS();
            }
          });
      }
      return;
    }
    throw new Error('No audio content returned');
  } catch (error) {
    if (ttsState.activeSessionId !== sessionToVerify) return;

    console.warn('[TTS] API generation failed, falling back to native Browser SpeechSynthesis...', error);
    
    // Update state to speaking fallback
    updateTTSState({ isLoading: false, isSpeaking: true });

    // Browser Native SpeechSynthesis Fallback (Zero Server Network / Internet Dependency)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any ongoing native speech first
      
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = /[가-힣]/.test(cleanText) ? 'ko-KR' : 'en-US';
      
      // Find the absolute highest-quality premium voice
      const voicesList = window.speechSynthesis.getVoices();
      const langCode = /[가-힣]/.test(cleanText) ? 'ko' : 'en';
      const langVoices = voicesList.filter(v => v.lang.toLowerCase().startsWith(langCode));
      
      if (langVoices.length > 0) {
        // Sort voices to pick the most human-sounding neural voice
        const getVoiceScore = (voiceItem: SpeechSynthesisVoice) => {
          const name = voiceItem.name.toLowerCase();
          if (name.includes('natural') || name.includes('neural')) return 100;
          if (name.includes('google')) return 80;
          if (name.includes('yuna') || name.includes('siri') || name.includes('seoyeon') || name.includes('narae')) return 60;
          if (name.includes('sunhi') || name.includes('injoon') || name.includes('juni')) return 40;
          return 10;
        };
        
        const sorted = langVoices.sort((a, b) => getVoiceScore(b) - getVoiceScore(a));
        utterance.voice = sorted[0];
        console.log(`[TTS] Selected premium voice: ${sorted[0].name} (${sorted[0].lang})`);
      }
      
      const emotionProfile = analyzeTextEmotion(cleanText, activeEmotion);
      utterance.rate = Math.max(0.7, Math.min(1.3, emotionProfile.playbackRate * 0.95));
      utterance.pitch = Math.max(0.6, Math.min(1.4, 1.0 + (emotionProfile.detune / 1200)));
      
      if (wait) {
        return new Promise<void>((resolve) => {
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          window.speechSynthesis.speak(utterance);
        });
      } else {
        utterance.onend = () => { 
          if (ttsState.activeSessionId === sessionToVerify) {
            stopTTS();
          }
        };
        utterance.onerror = () => { 
          if (ttsState.activeSessionId === sessionToVerify) {
            stopTTS();
          }
        };
        window.speechSynthesis.speak(utterance);
      }
    } else {
      console.error('[TTS] Native Browser SpeechSynthesis is not supported in this browser.');
      stopTTS();
    }
  }
};

export const playConversation = async (messages: { role: string; content: string }[], aiVoice: string, userVoice: string = 'Aoede') => {
  // If we are already speaking or loading, click again to stop
  if (ttsState.isSpeaking || ttsState.isLoading) {
    stopTTS();
    return;
  }

  stopTTS();
  const mySessionId = Math.random().toString();
  updateTTSState({ isLoading: true, isSpeaking: false, activeText: '__CONVERSATION__', activeSessionId: mySessionId });
  isPlayingSequence = true;

  // Dynamically determine the best contrasting user voice to distinguish speakers organically without reading names
  let activeUserVoice = userVoice;
  if (!userVoice || userVoice === 'Aoede') {
    const maleVoices = ['puck', 'zephyr', 'user', 'aoede', 'fenrir', 'michael'];
    const aiIsMale = maleVoices.includes(aiVoice.toLowerCase());
    activeUserVoice = aiIsMale ? 'Kore' : 'Puck'; // If AI is male, User is female; if AI is female, User is male
  }

  try {
    for (const m of messages) {
      if (ttsState.activeSessionId !== mySessionId) break;
      const isUser = m.role === 'user';
      const voice = isUser ? activeUserVoice : aiVoice;

      await playTTS(m.content, voice, true);
      if (ttsState.activeSessionId !== mySessionId) break;
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
