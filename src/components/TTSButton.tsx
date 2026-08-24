import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { normalizeTextForSpeech, playTTS, stopTTS, subscribeTTS, prefetchTTS } from '../utils/tts';

interface TTSButtonProps {
  text: string;
  voice?: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  className?: string;
  onPlay?: () => void;
  onClick?: () => void;
}

export const TTSButton: React.FC<TTSButtonProps> = ({ text, voice = 'Kore', className = "", onPlay, onClick }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const textStr = typeof text === 'string' ? text : String(text || '');
  const cleanText = normalizeTextForSpeech(textStr);

  // Background warm-up / prefetch audio as soon as TTSButton renders
  useEffect(() => {
    if (!cleanText || cleanText.length < 2) return;
    const timer = setTimeout(() => {
      prefetchTTS(cleanText, voice);
    }, 150);
    return () => clearTimeout(timer);
  }, [cleanText, voice]);

  useEffect(() => {
    const unsubscribe = subscribeTTS((state) => {
      // It is playing or loading if the global speech is active and the active text matches ours.
      setIsPlaying(state.isSpeaking && state.activeText === cleanText);
      setIsLoading(state.isLoading && state.activeText === cleanText);
    });
    return unsubscribe;
  }, [cleanText]);

  const handleSpeak = async () => {
    // If already playing or loading, a click halts the playback and resets
    if (isPlaying || isLoading) {
      stopTTS();
      return;
    }

    try {
      onPlay?.();
      onClick?.();
    } catch (e) {
      console.warn('[TTSButton] onPlay/onClick error:', e);
    }

    // playTTS handles its own asynchronous loading and playing state changes globally
    playTTS(cleanText, voice);
  };

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={handleSpeak}
      className={`p-2 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-blue-400 hover:bg-white/10 transition-all ${className}`}
      title={isPlaying ? "Stop playing" : isLoading ? "Stop loading" : "Listen to response"}
    >
      {isLoading ? (
        <Loader2 size={14} className="animate-spin text-blue-400" />
      ) : isPlaying ? (
        <VolumeX size={14} className="text-blue-400" />
      ) : (
        <Volume2 size={14} />
      )}
    </motion.button>
  );
};
