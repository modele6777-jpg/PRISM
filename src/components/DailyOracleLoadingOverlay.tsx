import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw } from 'lucide-react';

const THEME_STYLES = {
  orange: {
    glow: 'bg-orange-500/20',
    icon: 'text-orange-400',
    subtitle: 'text-orange-400',
  },
  sky: {
    glow: 'bg-sky-500/20',
    icon: 'text-sky-400',
    subtitle: 'text-sky-400',
  },
  emerald: {
    glow: 'bg-emerald-500/20',
    icon: 'text-emerald-400',
    subtitle: 'text-emerald-400',
  },
  blue: {
    glow: 'bg-blue-500/20',
    icon: 'text-blue-400',
    subtitle: 'text-blue-400',
  },
  yellow: {
    glow: 'bg-yellow-500/20',
    icon: 'text-yellow-400',
    subtitle: 'text-yellow-400',
  },
} as const;

type DailyOracleTheme = keyof typeof THEME_STYLES;

interface DailyOracleLoadingOverlayProps {
  isLoading: boolean;
  theme?: DailyOracleTheme;
}

export function DailyOracleLoadingOverlay({
  isLoading,
  theme = 'orange',
}: DailyOracleLoadingOverlayProps) {
  const styles = THEME_STYLES[theme];

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="daily-oracle-loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center glass backdrop-blur-3xl"
        >
          <div className="flex flex-col items-center gap-8">
            <div className="relative">
              <div className={`absolute inset-0 ${styles.glow} blur-3xl animate-pulse rounded-full`} />
              <RefreshCw className={`${styles.icon} animate-spin`} size={60} />
            </div>
            <div className="text-center space-y-2">
              <p className="text-2xl font-display text-white tracking-widest animate-pulse font-bold">
                Consulting the Oracle...
              </p>
              <p className={`text-[10px] ${styles.subtitle} font-bold uppercase tracking-[0.4em] font-sans`}>
                마음의 주파수를 정렬하고 있습니다
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}