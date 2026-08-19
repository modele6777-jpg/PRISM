import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';

const THEME_STYLES = {
  orange: {
    glow: 'bg-orange-500/20',
    ring: 'border-orange-500/30',
    orb: 'from-orange-500/30 via-amber-500/20 to-transparent',
    icon: 'text-orange-400',
    subtitle: 'text-orange-300/80',
    accent: '#f97316'
  },
  sky: {
    glow: 'bg-sky-500/20',
    ring: 'border-sky-500/30',
    orb: 'from-sky-500/30 via-cyan-500/20 to-transparent',
    icon: 'text-sky-400',
    subtitle: 'text-sky-300/80',
    accent: '#38bdf8'
  },
  emerald: {
    glow: 'bg-emerald-500/20',
    ring: 'border-emerald-500/30',
    orb: 'from-emerald-500/30 via-teal-500/20 to-transparent',
    icon: 'text-emerald-400',
    subtitle: 'text-emerald-300/80',
    accent: '#34d399'
  },
  blue: {
    glow: 'bg-blue-500/20',
    ring: 'border-blue-500/30',
    orb: 'from-blue-500/30 via-indigo-500/20 to-transparent',
    icon: 'text-blue-400',
    subtitle: 'text-blue-300/80',
    accent: '#60a5fa'
  },
  yellow: {
    glow: 'bg-yellow-500/20',
    ring: 'border-yellow-500/30',
    orb: 'from-yellow-500/30 via-amber-500/20 to-transparent',
    icon: 'text-yellow-400',
    subtitle: 'text-yellow-300/80',
    accent: '#facc15'
  },
} as const;

const SERENE_QUOTES = [
  "마음의 파도를 가만히 가라앉히고 있습니다...",
  "내면의 고요한 주파수와 지혜를 조율하는 시간...",
  "보이지 않는 깊은 곳의 빛을 불러오고 있습니다...",
  "모든 생각과 긴장을 편안하게 내려놓아 보세요...",
  "지금 이 순간, 당신에게 꼭 필요한 영감을 건넵니다..."
];

type DailyOracleTheme = keyof typeof THEME_STYLES;

interface DailyOracleLoadingOverlayProps {
  isLoading: boolean;
  theme?: DailyOracleTheme;
}

export function DailyOracleLoadingOverlay({
  isLoading,
  theme = 'orange',
}: DailyOracleLoadingOverlayProps) {
  const styles = THEME_STYLES[theme] || THEME_STYLES.orange;
  const [quoteIdx, setQuoteIdx] = useState(0);

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setQuoteIdx((prev) => (prev + 1) % SERENE_QUOTES.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [isLoading]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="daily-oracle-loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-2xl px-6"
        >
          <div className="flex flex-col items-center gap-8 max-w-sm text-center">
            {/* Breathing Aura Orb */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              {/* Outer Pulsing Glow */}
              <motion.div
                animate={{
                  scale: [1, 1.35, 1],
                  opacity: [0.35, 0.75, 0.35],
                }}
                transition={{
                  duration: 3.6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className={`absolute inset-0 rounded-full bg-gradient-radial ${styles.orb} blur-2xl`}
              />

              {/* Concentric Breathing Rings */}
              {[0, 1].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: [1, 1.15 + i * 0.1, 1],
                    rotate: i % 2 === 0 ? [0, 180, 360] : [360, 180, 0],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    scale: { duration: 3 + i * 0.8, repeat: Infinity, ease: 'easeInOut' },
                    rotate: { duration: 16 + i * 4, repeat: Infinity, ease: 'linear' },
                    opacity: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
                  }}
                  className={`absolute inset-0 rounded-full border ${styles.ring}`}
                  style={{ margin: i * 8 }}
                />
              ))}

              {/* Inner Star / Soft Icon */}
              <motion.div
                animate={{
                  scale: [0.92, 1.08, 0.92],
                  opacity: [0.8, 1, 0.8],
                }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative z-10 w-16 h-16 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md flex items-center justify-center shadow-[0_0_24px_rgba(255,255,255,0.1)]"
              >
                <Sparkles className={`${styles.icon} w-7 h-7`} />
              </motion.div>
            </div>

            {/* Poetic & Serene Text */}
            <div className="space-y-3">
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-lg md:text-xl font-display font-medium text-white/95 tracking-wide"
              >
                영혼의 오라클을 조율하는 중
              </motion.p>
              
              <div className="h-10 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={quoteIdx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.4 }}
                    className={`text-xs md:text-sm ${styles.subtitle} font-normal tracking-wider leading-relaxed`}
                  >
                    {SERENE_QUOTES[quoteIdx]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}