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
    // Only capture primary button / touch
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

    // Trigger initial whitehole tone
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
      // Safe Abort committed
      omniWarpAudio.playAbort();
      triggerHaptic('abort');
      setActivePhase('idle');
      return;
    }

    // Release to Commit: Trigger Big Bang!
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

  // Visual Theme Styling based on active phase
  const getOrbAuraStyle = () => {
    if (isAborted) {
      return 'border-zinc-500/40 bg-zinc-800/80 shadow-[0_0_15px_rgba(113,113,122,0.4)] opacity-60';
    }
    switch (activePhase) {
      case 'whitehole':
        return 'border-cyan-200/90 bg-gradient-to-tr from-white via-cyan-100 to-white text-zinc-950 shadow-[0_0_30px_rgba(255,255,255,0.95),0_0_55px_rgba(34,211,238,0.7)] scale-110 ring-4 ring-white/50';
      case 'event_horizon':
        return 'border-purple-300/90 bg-gradient-to-tr from-indigo-900 via-purple-700 to-pink-500 text-white shadow-[0_0_35px_rgba(168,85,247,0.95),0_0_65px_rgba(129,140,248,0.7)] scale-120 ring-4 ring-purple-400/60';
      case 'blackhole':
        return 'border-amber-500/90 bg-gradient-to-tr from-black via-zinc-950 to-neutral-900 text-amber-400 shadow-[0_0_40px_rgba(249,115,22,1),0_0_80px_rgba(220,38,38,0.8)] scale-130 ring-4 ring-amber-500/70';
      default:
        // Idle
        return 'border-white/30 bg-gradient-to-tr from-zinc-900/90 via-slate-800/80 to-zinc-900/90 text-white hover:border-white/60 hover:shadow-[0_0_20px_rgba(255,255,255,0.35)]';
    }
  };

  return (
    <div
      className={`fixed z-[350] pointer-events-auto left-1/2 -translate-x-1/2 transition-all duration-300 ${
        isStandaloneChat
          ? 'bottom-4 sm:bottom-6'
          : 'bottom-[calc(var(--nav-total-h)+10px)] sm:bottom-5'
      }`}
    >
      {/* 1. Real-time Holographic Warp Spectrum HUD */}
      <AnimatePresence>
        {isPressing && currentTarget && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.92 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={`absolute bottom-16 left-1/2 -translate-x-1/2 w-[310px] sm:w-[340px] p-3.5 rounded-2xl backdrop-blur-2xl border shadow-2xl flex flex-col gap-2 pointer-events-none select-none ${
              isAborted
                ? 'bg-zinc-950/90 border-red-500/40 text-red-300 shadow-[0_0_25px_rgba(239,68,68,0.3)]'
                : activePhase === 'whitehole'
                ? 'bg-slate-950/90 border-cyan-400/40 text-white shadow-[0_0_35px_rgba(34,211,238,0.35)]'
                : activePhase === 'event_horizon'
                ? 'bg-purple-950/90 border-purple-400/50 text-white shadow-[0_0_40px_rgba(168,85,247,0.4)]'
                : 'bg-black/95 border-amber-500/60 text-white shadow-[0_0_50px_rgba(249,115,22,0.45)]'
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
                  <span className="flex items-center gap-1 text-cyan-300">
                    <Sparkles size={14} className="animate-spin" /> ✨ 화이트홀 · 고정밀 수렴
                  </span>
                ) : activePhase === 'event_horizon' ? (
                  <span className="flex items-center gap-1 text-purple-300">
                    <Zap size={14} className="animate-pulse" /> 🌀 사건의 지평선 · 맥락 확장
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400">
                    <Compass size={14} className="animate-spin" /> 🕳️ 블랙홀 · 발산 초월 특이점
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
                    ? 'bg-gradient-to-r from-white to-cyan-400'
                    : activePhase === 'event_horizon'
                    ? 'bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500'
                    : 'bg-gradient-to-r from-purple-500 via-amber-500 to-red-600'
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

      {/* 2. Desktop Hover Tooltip (Idle mode only) */}
      {!isPressing && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 scale-0 origin-bottom group-hover:scale-100 transition-all duration-200 bg-zinc-950/90 backdrop-blur-md border border-white/15 text-white text-[10px] py-1.5 px-3 rounded-xl shadow-2xl whitespace-nowrap tracking-wide font-sans pointer-events-none z-50 flex items-center gap-1.5">
          <Sparkles size={12} className="text-cyan-300" />
          <span>빅뱅 버튼 (BBB) · 탭: 화이트홀 / 꾹 누름: 지평선 / 깊게: 블랙홀</span>
        </div>
      )}

      {/* 3. The Big Bang Button Core Component */}
      <div className="group relative flex items-center justify-center">
        <motion.button
          ref={buttonRef}
          type="button"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.96 }}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 cursor-pointer outline-none relative select-none backdrop-blur-xl border transition-all duration-150 ${getOrbAuraStyle()}`}
          aria-label="Big Bang Button"
        >
          {/* Ambient idle cosmic pulse rings */}
          {activePhase === 'idle' && (
            <>
              <span className="absolute inset-0 rounded-full border border-white/30 animate-ping opacity-25 pointer-events-none" />
              <div className="absolute inset-x-2 top-0.5 h-2 rounded-full bg-gradient-to-b from-white/60 to-transparent pointer-events-none z-10" />
            </>
          )}

          {/* Active Phase Gravitational Lensing & Vortex Rings */}
          {activePhase === 'event_horizon' && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
              className="absolute -inset-2 rounded-full border border-purple-400/60 border-dashed pointer-events-none"
            />
          )}

          {activePhase === 'blackhole' && (
            <>
              <motion.div
                animate={{ rotate: -360, scale: [1, 1.15, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-3 rounded-full border-2 border-amber-500/80 border-t-transparent pointer-events-none"
              />
              <div className="absolute inset-1 rounded-full bg-black shadow-inner pointer-events-none" />
            </>
          )}

          {/* Center Cosmic Icon */}
          <div className="relative z-20 flex items-center justify-center">
            {activePhase === 'whitehole' ? (
              <Sparkles size={19} className="text-zinc-950 drop-shadow-[0_0_8px_rgba(255,255,255,1)] animate-spin" />
            ) : activePhase === 'event_horizon' ? (
              <Zap size={19} className="text-purple-100 drop-shadow-[0_0_10px_rgba(192,132,252,1)]" />
            ) : activePhase === 'blackhole' ? (
              <Compass size={20} className="text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,1)] animate-pulse" />
            ) : (
              <Sparkles size={18} className="text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] group-hover:scale-110 transition-transform" />
            )}
          </div>
        </motion.button>
      </div>
    </div>
  );
}
