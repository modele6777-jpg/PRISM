import React from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

export function PageLoader() {
  return (
    <div className="h-full min-h-[40vh] flex flex-col items-center justify-center py-12 gap-5">
      <div className="relative w-16 h-16 flex items-center justify-center">
        {/* Pulsing Aura Orb */}
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.25, 0.6, 0.25],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute inset-0 rounded-full bg-gradient-radial from-amber-400/30 via-orange-500/15 to-transparent blur-xl"
        />

        {/* Breathing Ring */}
        <motion.div
          animate={{
            scale: [0.95, 1.1, 0.95],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute inset-0 rounded-full border border-amber-400/30"
        />

        {/* Center Icon */}
        <motion.div
          animate={{
            scale: [0.9, 1.05, 0.9],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="relative z-10 w-9 h-9 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center shadow-[0_0_12px_rgba(251,191,36,0.2)]"
        >
          <Sparkles className="w-4 h-4 text-amber-300/80" />
        </motion.div>
      </div>

      <motion.p
        animate={{ opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        className="text-[11px] font-medium text-stone-300/70 tracking-[0.25em] uppercase font-sans"
      >
        마음의 공간을 불러오는 중...
      </motion.p>
    </div>
  );
}