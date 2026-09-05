import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Zap, Compass, AlertCircle } from 'lucide-react';
import { WarpPhase, OmniWarpTarget } from '@/lib/omniWarp/types';
import { calculateWarpMetrics, forceToAiTemperature } from '@/lib/omniWarp/forceSensor';
import { serializeCurrentView, synthesizeWarpTarget, executeBigBangCommit } from '@/lib/omniWarp/omniWarpEngine';
import { omniWarpAudio } from '@/lib/omniWarp/omniWarpAudio';
import { triggerHaptic } from '@/lib/omniWarp/omniWarpHaptics';

export function BigBangButton() {
  const [location] = useLocation();
  const [isPressing, setIsPressing] = useState(false);
  const [activePhase, setActivePhase] = useState<WarpPhase>('idle');
  const [gauge, setGauge] = useState(0);
  const [aiTemp, setAiTemp] = useState(0);
  const [currentTarget, setCurrentTarget] = useState<OmniWarpTarget | null>(null);
  const [isAborted, setIsAborted] = useState(false);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const touchStartRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastPhaseRef = useRef<WarpPhase>('idle');
  const currentPointerEventRef = useRef<React.PointerEvent | null>(null);

  // Check if standalone chat or page without BottomNav
  const isStandaloneChat = location === '/chat' || location === '/lucy';

  // Real-time animation loop while pressing
  const updateLoop = useCallback(() => {
    if (!touchStartRef.current) return;

    const now = performance.now();
    const start = touchStartRef.current;
    const currentPointer = currentPointerEventRef.current;

    const metrics = calculateWarpMetrics(
      start.time,
      now,
      start.x,
      start.y,
      currentPointer ? currentPointer.clientX : start.x,
      currentPointer ? currentPointer.clientY : start.y,
      currentPointer || undefined
    );

    const context = serializeCurrentView(location);
    const target = synthesizeWarpTarget(context, metrics);
    const temp = forceToAiTemperature(metrics.virtualForce);

    setGauge(metrics.virtualForce);
    setAiTemp(temp);
    setActivePhase(metrics.phase);
    setCurrentTarget(target);
    setIsAborted(metrics.isAborted);

    // Audio & Haptic triggers on phase transition
    if (metrics.phase !== lastPhaseRef.current && !metrics.isAborted) {
      if (metrics.phase === 'whitehole') {
        omniWarpAudio.playWhiteHole();
        triggerHaptic('whitehole');
      } else if (metrics.phase === 'event_horizon') {
        omniWarpAudio.playEventHorizon();
        triggerHaptic('event_horizon');
      } else if (metrics.phase === 'blackhole') {
        omniWarpAudio.playBlackHole();
        triggerHaptic('blackhole');
      }
      lastPhaseRef.current = metrics.phase;
    }

    if (metrics.isAborted && lastPhaseRef.current !== 'aborted') {
      omniWarpAudio.playAbort();
      triggerHaptic('abort');
      lastPhaseRef.current = 'aborted';
    }

    rafRef.current = requestAnimationFrame(updateLoop);
  }, [location]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}

    touchStartRef.current = {
      time: performance.now(),
      x: e.clientX,
      y: e.clientY,
    };
    currentPointerEventRef.current = e;
    lastPhaseRef.current = 'idle';
    setIsPressing(true);
    setIsAborted(false);

    omniWarpAudio.playWhiteHole();
    triggerHaptic('whitehole');

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateLoop);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isPressing || !touchStartRef.current) return;
    currentPointerEventRef.current = e;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isPressing || !touchStartRef.current) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const start = touchStartRef.current;
    const now = performance.now();
    const metrics = calculateWarpMetrics(
      start.time,
      now,
      start.x,
      start.y,
      e.clientX,
      e.clientY,
      e
    );

    setIsPressing(false);
    touchStartRef.current = null;
    currentPointerEventRef.current = null;

    if (metrics.isAborted) {
      omniWarpAudio.playAbort();
      triggerHaptic('abort');
      setActivePhase('idle');
      return;
    }

    const context = serializeCurrentView(location);
    const target = synthesizeWarpTarget(context, metrics);
    executeBigBangCommit(target, context, metrics);

    setActivePhase('idle');
    setGauge(0);
  };

  const handlePointerCancel = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsPressing(false);
    setIsAborted(false);
    touchStartRef.current = null;
    currentPointerEventRef.current = null;
    setActivePhase('idle');
    setGauge(0);
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      {/* 🌟 1. Environmental Atmospheric Field (Bottom-Right Anchored) */}
      <AnimatePresence>
        {isPressing && !isAborted && (
          <>
            {activePhase === 'whitehole' && (
              <motion.div
                key="whitehole-radiance-field"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 pointer-events-none z-[330] bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,255,255,0.45)_0%,rgba(103,232,249,0.25)_40%,transparent_75%)]"
              >
                {/* Outward Radiating Solar Photon Rays from Bottom Right */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                  className="absolute bottom-[-150px] right-[-150px] w-[750px] h-[750px] opacity-40 pointer-events-none bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.8)_20deg,transparent_40deg,rgba(56,189,248,0.7)_60deg,transparent_80deg,rgba(255,255,255,0.8)_100deg,transparent_120deg,rgba(56,189,248,0.7)_140deg,transparent_160deg,rgba(255,255,255,0.8)_180deg,transparent_200deg,rgba(56,189,248,0.7)_220deg,transparent_240deg,rgba(255,255,255,0.8)_260deg,transparent_280deg,rgba(56,189,248,0.7)_300deg,transparent_320deg,rgba(255,255,255,0.8)_340deg,transparent_360deg)] blur-md"
                />
              </motion.div>
            )}

            {activePhase === 'blackhole' && (
              <motion.div
                key="blackhole-darkness-field"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
                className="fixed inset-0 pointer-events-none z-[330] bg-black/80 backdrop-blur-[3.5px]"
              >
                {/* Inward Gravitational Influx Distortion Vignette from Bottom Right */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,transparent_60px,rgba(0,0,0,0.6)_200px,rgba(0,0,0,0.95)_450px)]" />

                {/* Accretion Disk Plasma Ambient Glow */}
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.35, 0.65, 0.35] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute bottom-[-100px] right-[-100px] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(234,88,12,0.35)_0%,rgba(185,28,28,0.2)_40%,transparent_70%)] blur-2xl pointer-events-none"
                />
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* 🚀 2. Big Bang Button (Positioned at Bottom-Right in place of Lucy Chat) */}
      <div
        className={`fixed z-[350] pointer-events-auto transition-all duration-300 ${
          isStandaloneChat
            ? 'bottom-6 sm:bottom-8 right-4 sm:right-6'
            : 'bottom-safe-fab right-4 sm:right-6'
        }`}
      >
        {/* Real-time Holographic Warp Spectrum HUD (Anchored Right-Aligned) */}
        <AnimatePresence>
          {isPressing && currentTarget && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.92 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className={`absolute bottom-16 sm:bottom-20 right-0 w-[300px] sm:w-[340px] p-3.5 rounded-2xl backdrop-blur-2xl border shadow-2xl flex flex-col gap-2 pointer-events-none select-none ${
                isAborted
                  ? 'bg-zinc-950/90 border-red-500/40 text-red-300 shadow-[0_0_25px_rgba(239,68,68,0.3)]'
                  : activePhase === 'whitehole'
                  ? 'bg-slate-950/95 border-cyan-300/60 text-white shadow-[0_0_45px_rgba(255,255,255,0.6),0_0_70px_rgba(34,211,238,0.5)]'
                  : activePhase === 'event_horizon'
                  ? 'bg-purple-950/90 border-purple-400/50 text-white shadow-[0_0_40px_rgba(168,85,247,0.4)]'
                  : 'bg-black border-amber-500/80 text-white shadow-[0_0_60px_rgba(249,115,22,0.7),0_0_100px_rgba(0,0,0,1)]'
              }`}
            >
              {/* Header: Phase badge + Gauge + AI Temperature */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-1.5 font-bold text-xs font-mono">
                  {isAborted ? (
                    <span className="flex items-center gap-1 text-red-400">
                      <AlertCircle size={14} /> 안전 취소 (Safe Abort)
                    </span>
                  ) : activePhase === 'whitehole' ? (
                    <span className="flex items-center gap-1 text-cyan-200 drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]">
                      <Sparkles size={14} className="animate-spin text-white" /> ✨ 화이트홀 · 빛의 즉각 방출
                    </span>
                  ) : activePhase === 'event_horizon' ? (
                    <span className="flex items-center gap-1 text-purple-300">
                      <Zap size={14} className="animate-pulse" /> 🌀 사건의 지평선 · 맥락 확장
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]">
                      <Compass size={14} className="animate-spin text-amber-300" /> 🕳️ 블랙홀 · 절대 암흑 특이점
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[10px] font-mono text-white/70">
                  <span className="px-1.5 py-0.5 rounded bg-white/10 font-semibold">
                    {Math.round(gauge * 100)}%
                  </span>
                  <span className="text-amber-300 font-bold">T={aiTemp.toFixed(2)}</span>
                </div>
              </div>

              {/* Content: Real-time Action & Destination Preview */}
              <div className="flex flex-col gap-0.5 py-0.5">
                <div className="text-xs font-bold text-white/95 leading-tight line-clamp-1">
                  {isAborted ? '손을 떼면 원래 화면으로 복귀합니다' : currentTarget.previewLabel}
                </div>
                <div className="text-[11px] text-white/70 leading-normal line-clamp-2">
                  {isAborted ? '버튼 영역 밖으로 스와이프되어 취소 대기 중입니다.' : currentTarget.previewDescription}
                </div>
              </div>

              {/* Dynamic Multi-Stage Progress Meter */}
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden relative">
                <div
                  className={`h-full transition-all duration-75 rounded-full ${
                    isAborted
                      ? 'bg-red-500'
                      : activePhase === 'whitehole'
                      ? 'bg-gradient-to-r from-white via-cyan-200 to-white shadow-[0_0_12px_rgba(255,255,255,1)]'
                      : activePhase === 'event_horizon'
                      ? 'bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500'
                      : 'bg-gradient-to-r from-purple-600 via-amber-500 to-red-600 shadow-[0_0_15px_rgba(249,115,22,1)]'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(8, gauge * 100))}%` }}
                />
              </div>

              {/* Release / Abort Guide footer */}
              <div className="flex items-center justify-between text-[9px] text-white/50 font-sans tracking-tight pt-0.5">
                <span>손을 떼면 차원 즉시 전이 (Big Bang)</span>
                <span className="text-white/40">밖으로 밀어 취소</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop Hover Tooltip (Idle mode only, aligned to left of button) */}
        {!isPressing && (
          <div className="absolute right-14 top-1/2 -translate-y-1/2 scale-0 origin-right group-hover:scale-100 transition-all duration-200 bg-zinc-950/90 backdrop-blur-md border border-white/15 text-white text-[10px] py-1.5 px-3 rounded-xl shadow-2xl whitespace-nowrap tracking-wide font-sans pointer-events-none z-50 flex items-center gap-1.5">
            <Sparkles size={12} className="text-cyan-300" />
            <span>시공간 웜홀 (Wormhole) · 탭: 화이트홀 / 꾹: 지평선 / 깊게: 블랙홀</span>
          </div>
        )}

        {/* The Cosmic Wormhole Button Core Component */}
        <div className="group relative flex items-center justify-center select-none">
          {/* Ambient Gravitational Ripple Waves */}
          {activePhase === 'idle' && (
            <>
              <div className="absolute -inset-2 rounded-full border border-cyan-400/20 animate-ping opacity-30 pointer-events-none" />
              <div className="absolute -inset-4 rounded-full border border-purple-500/15 animate-pulse opacity-40 pointer-events-none" />
            </>
          )}

          {/* White Hole Photon Explosion Aura */}
          {activePhase === 'whitehole' && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.35, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -inset-5 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.95)_0%,rgba(103,232,249,0.7)_45%,transparent_75%)] blur-lg pointer-events-none"
            />
          )}

          {/* Black Hole Gravitational Suction Collapse Rings */}
          {activePhase === 'blackhole' && (
            <>
              <motion.div
                animate={{ scale: [1.9, 0.4], opacity: [0, 0.9, 0] }}
                transition={{ duration: 1.0, repeat: Infinity, ease: 'easeIn' }}
                className="absolute -inset-6 rounded-full border border-amber-500/70 pointer-events-none"
              />
              <motion.div
                animate={{ scale: [2.3, 0.6], opacity: [0, 0.7, 0] }}
                transition={{ duration: 1.0, delay: 0.5, repeat: Infinity, ease: 'easeIn' }}
                className="absolute -inset-8 rounded-full border border-red-500/60 pointer-events-none"
              />
              <div className="absolute -inset-3 rounded-full bg-black/90 shadow-[0_0_30px_rgba(0,0,0,1)] pointer-events-none" />
            </>
          )}

          <motion.button
            ref={buttonRef}
            type="button"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.94 }}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 cursor-pointer outline-none relative overflow-hidden backdrop-blur-xl transition-all duration-200 ${
              isAborted
                ? 'ring-2 ring-red-500/40 opacity-70'
                : activePhase === 'whitehole'
                ? 'ring-4 ring-white shadow-[0_0_40px_rgba(255,255,255,1),0_0_80px_rgba(34,211,238,0.9)] scale-110'
                : activePhase === 'event_horizon'
                ? 'ring-4 ring-purple-400/80 shadow-[0_0_40px_rgba(168,85,247,0.95),0_0_70px_rgba(129,140,248,0.7)] scale-115'
                : activePhase === 'blackhole'
                ? 'ring-4 ring-amber-500 shadow-[0_0_50px_rgba(249,115,22,1),0_0_90px_rgba(220,38,38,0.9)] scale-125'
                : 'ring-2 ring-purple-400/40 shadow-[0_0_24px_rgba(168,85,247,0.4),0_0_45px_rgba(6,182,212,0.3)] hover:ring-cyan-400/60 hover:shadow-[0_0_30px_rgba(34,211,238,0.6)]'
            }`}
            aria-label="Cosmic Wormhole Portal Button"
          >
            {/* Layer 1: Outer Rotating Accretion Ring (강착원반 고리) */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: isPressing ? (activePhase === 'blackhole' ? 0.9 : 1.6) : 6.0,
                repeat: Infinity,
                ease: 'linear',
              }}
              className={`absolute -inset-1 rounded-full pointer-events-none ${
                activePhase === 'blackhole'
                  ? 'bg-[conic-gradient(from_0deg,#ea580c,#f97316,#ef4444,#7f1d1d,#ea580c)]'
                  : activePhase === 'whitehole'
                  ? 'bg-[conic-gradient(from_0deg,#ffffff,#a5f3fc,#ffffff,#67e8f9,#ffffff)]'
                  : 'bg-[conic-gradient(from_0deg,#38bdf8,#818cf8,#c084fc,#ec4899,#f97316,#38bdf8)]'
              }`}
            />

            {/* Layer 2: Counter-Rotating Dimensional Vortex (역회전 소용돌이 터널) */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{
                duration: isPressing ? 1.2 : 4.5,
                repeat: Infinity,
                ease: 'linear',
              }}
              className={`absolute inset-[2px] rounded-full pointer-events-none opacity-90 ${
                activePhase === 'blackhole'
                  ? 'bg-[conic-gradient(from_180deg,#09090b,#451a03,#7c2d12,#09090b)]'
                  : activePhase === 'whitehole'
                  ? 'bg-[conic-gradient(from_180deg,#ffffff,#cffafe,#e0e7ff,#ffffff)]'
                  : 'bg-[conic-gradient(from_180deg,#09090b,#4338ca,#7e22ce,#0284c7,#09090b)]'
              }`}
            />

            {/* Layer 3: Wormhole Throat Depth Sink (웜홀 심연 통로) */}
            <div
              className={`absolute inset-[4px] rounded-full pointer-events-none ${
                activePhase === 'whitehole'
                  ? 'bg-gradient-to-tr from-white via-cyan-50 to-white shadow-[0_0_20px_rgba(255,255,255,1)]'
                  : activePhase === 'event_horizon'
                  ? 'bg-[radial-gradient(circle_at_center,#1e1b4b_20%,#312e81_55%,#581c87_85%,#09090b_100%)]'
                  : activePhase === 'blackhole'
                  ? 'bg-black shadow-[inset_0_0_25px_rgba(0,0,0,1)]'
                  : 'bg-[radial-gradient(circle_at_center,#020617_25%,#1e1b4b_60%,#3b0764_85%,#09090b_100%)]'
              }`}
            />

            {/* Layer 4: Center Singularity Photon Core (중심 특이점 광자핵) */}
            <motion.div
              animate={{
                scale: isPressing
                  ? activePhase === 'whitehole'
                    ? [1, 1.6, 1]
                    : activePhase === 'blackhole'
                    ? [1.2, 0.7, 1.2]
                    : [1, 1.3, 1]
                  : [0.9, 1.15, 0.9],
                opacity: [0.85, 1, 0.85],
              }}
              transition={{
                duration: isPressing ? 0.7 : 2.0,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="relative z-20 flex items-center justify-center pointer-events-none"
            >
              {activePhase === 'whitehole' ? (
                <div className="relative flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,1),0_0_35px_rgba(103,232,249,1)]" />
                  <Sparkles size={22} className="text-cyan-900 drop-shadow-[0_0_12px_rgba(255,255,255,1)] absolute animate-spin" />
                </div>
              ) : activePhase === 'event_horizon' ? (
                <div className="relative flex items-center justify-center">
                  <Zap size={18} className="text-cyan-200 drop-shadow-[0_0_12px_rgba(192,132,252,1)]" />
                  <span className="absolute w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_10px_#38bdf8]" />
                </div>
              ) : activePhase === 'blackhole' ? (
                <div className="relative flex items-center justify-center">
                  {/* Black Hole Singularity Void Eye */}
                  <div className="w-4 h-4 rounded-full bg-black ring-2 ring-amber-500 shadow-[0_0_15px_rgba(245,158,11,1)]" />
                  <Compass size={18} className="text-amber-400 drop-shadow-[0_0_14px_rgba(245,158,11,1)] absolute animate-spin" />
                </div>
              ) : (
                <div className="relative flex items-center justify-center">
                  {/* Ethereal Wormhole Cosmic Core */}
                  <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_14px_rgba(56,189,248,1),0_0_24px_rgba(192,132,252,1)]" />
                  <Sparkles size={17} className="text-cyan-200 drop-shadow-[0_0_8px_rgba(255,255,255,0.9)] absolute" />
                </div>
              )}
            </motion.div>

            {/* Layer 5: Specular Curved Glass Refraction Highlight */}
            <div className="absolute inset-x-2 top-1 h-3.5 rounded-full bg-gradient-to-b from-white/60 via-white/20 to-transparent pointer-events-none z-30" />
          </motion.button>
        </div>
      </div>
    </>
  );
}
