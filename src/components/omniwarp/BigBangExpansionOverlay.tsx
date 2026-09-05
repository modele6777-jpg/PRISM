import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BigBangCommitEventDetail, WarpPhase } from '@/lib/omniWarp/types';

export function BigBangExpansionOverlay() {
  const [activeCommit, setActiveCommit] = useState<BigBangCommitEventDetail | null>(null);

  useEffect(() => {
    const handleCommit = (e: any) => {
      const detail = e.detail as BigBangCommitEventDetail;
      if (detail) {
        setActiveCommit(detail);
        // Clear after transition animation completes
        setTimeout(() => {
          setActiveCommit(null);
        }, 550);
      }
    };

    window.addEventListener('prism:bigbang_commit', handleCommit);
    return () => {
      window.removeEventListener('prism:bigbang_commit', handleCommit);
    };
  }, []);

  if (!activeCommit) return null;

  const phase: WarpPhase = activeCommit.phase;
  const target = activeCommit.target;

  return (
    <AnimatePresence>
      <motion.div
        key="bigbang-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center overflow-hidden"
      >
        {/* 1. Backdrop Glow Layer */}
        <motion.div
          initial={{ scale: 0.1, opacity: 0 }}
          animate={{ scale: 35, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className={`w-16 h-16 rounded-full blur-2xl ${
            phase === 'whitehole'
              ? 'bg-gradient-to-tr from-white via-cyan-300 to-white'
              : phase === 'event_horizon'
              ? 'bg-gradient-to-tr from-purple-600 via-indigo-500 to-pink-500'
              : 'bg-gradient-to-tr from-amber-500 via-red-600 to-black'
          }`}
        />

        {/* 2. Central Supernova / Singularity Shockwave Shock Ring */}
        <motion.div
          initial={{ scale: 0.2, opacity: 1, borderWidth: 16 }}
          animate={{ scale: 22, opacity: 0, borderWidth: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`absolute w-24 h-24 rounded-full border ${
            phase === 'whitehole'
              ? 'border-white'
              : phase === 'event_horizon'
              ? 'border-purple-300'
              : 'border-amber-400'
          }`}
        />

        {/* 3. Centered Teleportation Monogram & Title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.35 }}
          className="relative z-10 flex flex-col items-center gap-2 p-6 rounded-3xl bg-zinc-950/80 backdrop-blur-2xl border border-white/20 shadow-2xl text-center max-w-xs mx-4"
        >
          <div className="text-[10px] font-mono font-bold tracking-widest text-amber-300 uppercase">
            BIG BANG DIMENSION WARP
          </div>
          <div className="text-base font-extrabold text-white">
            {target.title}
          </div>
          <div className="text-xs text-white/80 font-sans leading-relaxed">
            {target.previewLabel}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
