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
        }, 600);
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
        transition={{ duration: 0.38, ease: 'easeOut' }}
        className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center overflow-hidden"
      >
        {/* White Hole: Blinding Pure White / Cyan Supernova Flash */}
        {phase === 'whitehole' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.95, 0.3, 0] }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="absolute inset-0 bg-white z-0 pointer-events-none"
          />
        )}

        {/* Black Hole: Complete Obsidian Singularity Void Implosion */}
        {phase === 'blackhole' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.85, 0] }}
            transition={{ duration: 0.58, ease: 'easeInOut' }}
            className="absolute inset-0 bg-black z-0 pointer-events-none"
          />
        )}

        {/* 1. Backdrop Expansion Glow Layer */}
        <motion.div
          initial={{ scale: 0.1, opacity: 0 }}
          animate={{ scale: 38, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
          className={`w-16 h-16 rounded-full blur-2xl ${
            phase === 'whitehole'
              ? 'bg-[radial-gradient(circle,rgba(255,255,255,1)_0%,rgba(165,243,252,0.9)_50%,transparent_80%)]'
              : phase === 'event_horizon'
              ? 'bg-gradient-to-tr from-purple-600 via-indigo-500 to-pink-500'
              : 'bg-[radial-gradient(circle,rgba(234,88,12,0.9)_0%,rgba(185,28,28,0.7)_50%,black_80%)]'
          }`}
        />

        {/* 2. Central Shockwave Expansion Ring */}
        <motion.div
          initial={{ scale: 0.2, opacity: 1, borderWidth: 18 }}
          animate={{ scale: 26, opacity: 0, borderWidth: 1 }}
          transition={{ duration: 0.52, ease: 'easeOut' }}
          className={`absolute w-24 h-24 rounded-full border ${
            phase === 'whitehole'
              ? 'border-white shadow-[0_0_40px_rgba(255,255,255,1)]'
              : phase === 'event_horizon'
              ? 'border-purple-300 shadow-[0_0_30px_rgba(168,85,247,0.8)]'
              : 'border-amber-500 shadow-[0_0_50px_rgba(249,115,22,1)]'
          }`}
        />

        {/* 3. Centered Teleportation Monogram & Title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.35 }}
          className={`relative z-10 flex flex-col items-center gap-2 p-6 rounded-3xl backdrop-blur-2xl border shadow-2xl text-center max-w-xs mx-4 ${
            phase === 'whitehole'
              ? 'bg-slate-950/85 border-cyan-300/50 shadow-[0_0_45px_rgba(34,211,238,0.4)]'
              : phase === 'event_horizon'
              ? 'bg-zinc-950/85 border-purple-400/50 shadow-[0_0_45px_rgba(168,85,247,0.4)]'
              : 'bg-black/95 border-amber-500/60 shadow-[0_0_60px_rgba(249,115,22,0.6)]'
          }`}
        >
          <div className="text-[10px] font-mono font-bold tracking-widest text-amber-300 uppercase">
            {phase === 'whitehole'
              ? 'WHITE HOLE RADIANT EMISSION'
              : phase === 'event_horizon'
              ? 'EVENT HORIZON WARP'
              : 'BLACK HOLE SINGULARITY BIG BANG'}
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
