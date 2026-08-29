import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Headphones, Volume2, Square, Sparkles } from 'lucide-react';
import { useBinauralBeat } from '@/hooks/useBinauralBeat';

export const BinauralBeatIndicator: React.FC = () => {
  const { isPlaying, activePreset, stop, toggle, activeAppId } = useBinauralBeat();

  if (!isPlaying || !activePreset) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        className="fixed bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 z-[105] pointer-events-auto"
      >
        <div
          className="flex items-center gap-3 px-4 py-2 rounded-full glass border shadow-2xl backdrop-blur-xl transition-all"
          style={{
            borderColor: `${activePreset.accentColor}40`,
            backgroundColor: 'rgba(10, 10, 18, 0.85)',
            boxShadow: `0 0 25px ${activePreset.accentColor}25`,
          }}
        >
          {/* Animated sound wave bars */}
          <div className="flex items-center gap-0.5 h-4">
            {[0.6, 1, 0.4, 0.8, 0.5].map((scale, i) => (
              <motion.div
                key={i}
                animate={{ scaleY: [0.3, scale, 0.3] }}
                transition={{
                  duration: 0.8 + i * 0.15,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'easeInOut',
                }}
                className="w-1 rounded-full"
                style={{ backgroundColor: activePreset.accentColor, height: '100%' }}
              />
            ))}
          </div>

          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <Headphones size={12} style={{ color: activePreset.accentColor }} />
              <span className="text-[11px] font-bold text-white tracking-tight">
                {activePreset.waveType} 파동 바이노럴 비트
              </span>
              <span
                className="text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold"
                style={{
                  backgroundColor: `${activePreset.accentColor}20`,
                  color: activePreset.accentColor,
                }}
              >
                {activePreset.carrierFreq}Hz + {activePreset.beatFreq}Hz
              </span>
            </div>
          </div>

          {/* Stop / Toggle Button */}
          <button
            type="button"
            onClick={() => stop()}
            title="바이노럴 비트 끄기"
            className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors ml-1 cursor-pointer"
          >
            <Square size={12} className="fill-current" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
