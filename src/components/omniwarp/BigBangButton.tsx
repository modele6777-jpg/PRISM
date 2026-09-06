import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'motion/react';
import { CrystalOrbIcon } from '@/components/icons/CrystalOrbIcon';
import { WarpPhase, OmniWarpTarget } from '@/lib/omniWarp/types';
import { calculateWarpMetrics, forceToAiTemperature } from '@/lib/omniWarp/forceSensor';
import { serializeCurrentView, synthesizeWarpTarget, executeBigBangCommit } from '@/lib/omniWarp/omniWarpEngine';
import { getTossRule } from '@/lib/prismTossRegistry';
import { omniWarpAudio } from '@/lib/omniWarp/omniWarpAudio';
import { triggerHaptic, startBlackHoleContinuousHaptic, stopBlackHoleContinuousHaptic } from '@/lib/omniWarp/omniWarpHaptics';
import { BigBangCircularMeter } from './BigBangCircularMeter';
import { BigBangPreviewWindow } from './BigBangPreviewWindow';

export function BigBangButton() {
  const [location] = useLocation();
  const [isPressing, setIsPressing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [activePhase, setActivePhase] = useState<WarpPhase>('idle');
  const [gauge, setGauge] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [aiTemp, setAiTemp] = useState(0);
  const [currentTarget, setCurrentTarget] = useState<OmniWarpTarget | null>(null);
  const [isAborted, setIsAborted] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [idleCycleProgress, setIdleCycleProgress] = useState(0);

  // Active view context and next destination pre-vision (수정구슬 영시)
  const currentContext = serializeCurrentView(location);
  const normPath = location.replace('/', '') || 'hub';
  const tossRule = getTossRule(normPath, `${currentContext.summary} ${currentContext.primarySubject || ''}`);
  const nextDest = tossRule.primary;

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const touchStartRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const idleRafRef = useRef<number | null>(null);
  const lastPhaseRef = useRef<WarpPhase>('idle');
  const currentPointerEventRef = useRef<React.PointerEvent | null>(null);
  const hasTriggeredBlackHolePeakRef = useRef<boolean>(false);

  // Check if standalone chat or page without BottomNav
  const isStandaloneChat = location === '/chat' || location === '/lucy';

  // 낚시 게임 & 주사위 굴리기 게임 스타일의 대기 상태 무한 시계방향 루프 애니메이션 (3초 주기)
  useEffect(() => {
    let animId: number;
    const loopDuration = 3200; // 3.2초 주기

    const tickIdle = () => {
      if (!touchStartRef.current) {
        const now = performance.now();
        const progress = (now % loopDuration) / loopDuration;
        setIdleCycleProgress(progress);
      }
      animId = requestAnimationFrame(tickIdle);
    };

    animId = requestAnimationFrame(tickIdle);
    idleRafRef.current = animId;

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

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
    setDurationMs(metrics.durationMs);
    setAiTemp(temp);
    setActivePhase(metrics.phase);
    setCurrentTarget(target);
    setIsAborted(metrics.isAborted);
    setDragOffset({ x: metrics.dragOffsetX || 0, y: metrics.dragOffsetY || 0 });

    // 🕳️ 압력의 세기가 최대치(블랙홀 단계: virtualForce >= 0.82)에 도달했을 때 무한 반복 미세 진동 피드백 (Continuous Gravity Rumble)
    if (metrics.virtualForce >= 0.82 && !metrics.isAborted) {
      startBlackHoleContinuousHaptic();
    } else {
      stopBlackHoleContinuousHaptic();
    }

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

    const now = performance.now();
    touchStartRef.current = {
      time: now,
      x: e.clientX,
      y: e.clientY,
    };
    currentPointerEventRef.current = e;
    lastPhaseRef.current = 'whitehole';
    hasTriggeredBlackHolePeakRef.current = false;
    setDragOffset({ x: 0, y: 0 });
    setIsPressing(true);
    setIsAborted(false);
    setActivePhase('whitehole');
    setGauge(0.12);
    setDurationMs(0);

    const initialMetrics = calculateWarpMetrics(
      now,
      now,
      e.clientX,
      e.clientY,
      e.clientX,
      e.clientY,
      e
    );
    const context = serializeCurrentView(location);
    const target = synthesizeWarpTarget(context, initialMetrics);
    setCurrentTarget(target);

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
    hasTriggeredBlackHolePeakRef.current = false;
    stopBlackHoleContinuousHaptic();
    setDragOffset({ x: 0, y: 0 });

    if (metrics.isAborted) {
      omniWarpAudio.playAbort();
      triggerHaptic('abort');
      setActivePhase('idle');
      setGauge(0);
      setDurationMs(0);
      return;
    }

    const context = serializeCurrentView(location);
    const target = synthesizeWarpTarget(context, metrics);
    executeBigBangCommit(target, context, metrics);

    setActivePhase('idle');
    setGauge(0);
    setDurationMs(0);
  };

  const handlePointerCancel = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    stopBlackHoleContinuousHaptic();
    setIsPressing(false);
    setIsAborted(false);
    touchStartRef.current = null;
    currentPointerEventRef.current = null;
    hasTriggeredBlackHolePeakRef.current = false;
    setDragOffset({ x: 0, y: 0 });
    setActivePhase('idle');
    setGauge(0);
    setDurationMs(0);
  };

  useEffect(() => {
    return () => {
      stopBlackHoleContinuousHaptic();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (idleRafRef.current) cancelAnimationFrame(idleRafRef.current);
    };
  }, []);

  return (
    <>
      {/* 🌟 1. Environmental Atmospheric Field (Center-Bottom Anchored, Infinite Bidirectional Oscillation) */}
      <AnimatePresence>
        {isPressing && !isAborted && (
          <>
            {activePhase === 'whitehole' && (
              <motion.div
                key="whitehole-radiance-field"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.45 + (1 - gauge) * 0.55 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 pointer-events-none z-[330]"
              >
                {/* Full-screen Radiant Photon Flash (가볍게 누를수록 극대화되는 순백의 태양광) */}
                <div
                  className="absolute inset-0 transition-opacity duration-75"
                  style={{
                    background: `radial-gradient(ellipse at bottom, rgba(255,255,255,${(0.65 + (1 - gauge) * 0.35).toFixed(2)}) 0%, rgba(165,243,252,${(0.45 + (1 - gauge) * 0.45).toFixed(2)}) 30%, rgba(56,189,248,${(0.25 + (1 - gauge) * 0.4).toFixed(2)}) 60%, transparent 85%)`,
                  }}
                />

                {/* Blinding Center-Bottom Solar Light Flare */}
                <div
                  className="absolute inset-x-0 bottom-0 h-[65vh] transition-opacity duration-75"
                  style={{
                    background: `radial-gradient(ellipse at bottom, rgba(255,255,255,${(0.8 + (1 - gauge) * 0.2).toFixed(2)}) 0%, rgba(224,242,254,${(0.6 + (1 - gauge) * 0.35).toFixed(2)}) 25%, rgba(56,189,248,${(0.35 + (1 - gauge) * 0.45).toFixed(2)}) 50%, transparent 80%)`,
                  }}
                />

                {/* Outward Radiating Solar Photon Rays from Center Bottom */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                  className="absolute bottom-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[900px] pointer-events-none bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.95)_15deg,transparent_30deg,rgba(56,189,248,0.9)_50deg,transparent_70deg,rgba(255,255,255,0.95)_90deg,transparent_110deg,rgba(56,189,248,0.9)_130deg,transparent_150deg,rgba(255,255,255,0.95)_170deg,transparent_190deg,rgba(56,189,248,0.9)_210deg,transparent_230deg,rgba(255,255,255,0.95)_250deg,transparent_270deg,rgba(56,189,248,0.9)_290deg,transparent_310deg,rgba(255,255,255,0.95)_330deg,transparent_350deg)] blur-sm"
                  style={{ opacity: 0.5 + (1 - gauge) * 0.5 }}
                />
              </motion.div>
            )}

            {activePhase === 'event_horizon' && (
              <motion.div
                key="event-horizon-bridge-field"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 + (1 - Math.abs(gauge - 0.5) * 2) * 0.5 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="fixed inset-0 pointer-events-none z-[330]"
              >
                {/* Dimensional Wormhole Aurora Bridge */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'radial-gradient(ellipse at bottom, rgba(168,85,247,0.45) 0%, rgba(99,102,241,0.3) 45%, transparent 75%)',
                  }}
                />
              </motion.div>
            )}

            {activePhase === 'blackhole' && (
              <motion.div
                key="blackhole-darkness-field"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 + gauge * 0.5 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 pointer-events-none z-[330] bg-black/90 backdrop-blur-[6px]"
              >
                {/* Inward Gravitational Influx Distortion Vignette (세게 누를수록 화면 전체가 칠흑으로 암전) */}
                <div
                  className="absolute inset-0 transition-opacity duration-75"
                  style={{
                    background: `radial-gradient(circle at bottom, rgba(0,0,0,${(0.6 + gauge * 0.4).toFixed(2)}) 60px, rgba(0,0,0,${(0.85 + gauge * 0.15).toFixed(2)}) 220px, #000000 450px)`,
                  }}
                />

                {/* Accretion Disk Darkness Vortex */}
                <motion.div
                  animate={{ scale: [1.2, 0.7, 1.2], opacity: [0.6, 0.95, 0.6] }}
                  transition={{ duration: 1.0, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute bottom-[-150px] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full blur-3xl pointer-events-none bg-black/95 shadow-[0_0_80px_#000000]"
                />
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* 🚀 2. Crystal Ball Big Bang Button (Positioned at Bottom-Center) */}
      <div
        className={`fixed z-[350] pointer-events-auto transition-all duration-300 ${
          isStandaloneChat
            ? 'bottom-[68px] sm:bottom-[76px] left-1/2 -translate-x-1/2'
            : 'bottom-safe-fab left-1/2 -translate-x-1/2'
        }`}
      >
        {/* Real-time Holographic Warp Spectrum HUD & Infinite Preview Window (낚시/주사위 게임 스타일) */}
        <AnimatePresence>
          {(isPressing || isHovered) && (
            <BigBangPreviewWindow
              isOpen={isPressing || isHovered}
              isPressing={isPressing}
              isAborted={isAborted}
              activePhase={activePhase}
              gauge={gauge}
              durationMs={durationMs}
              aiTemp={aiTemp}
              currentTarget={currentTarget}
              nextDest={nextDest}
              idleCycleProgress={idleCycleProgress}
            />
          )}
        </AnimatePresence>

        {/* The Wormhole (웜홀) Core Component with Center Preview */}
        <div
          className="group relative flex flex-col items-center justify-center select-none"
          onPointerEnter={() => setIsHovered(true)}
          onPointerLeave={() => setIsHovered(false)}
        >
          {/* 🌟 360° Circular Ring Meter (12시 화이트홀 빛 -> 6시 블랙홀 어둠 -> 12시 빛 복귀 무한 궤도) */}
          <BigBangCircularMeter
            isPressing={isPressing}
            gauge={gauge}
            durationMs={durationMs}
            activePhase={activePhase}
            isAborted={isAborted}
            idleCycleProgress={idleCycleProgress}
          />

          {/* Ambient Gravitational Ripple Waves */}
          {activePhase === 'idle' && (
            <>
              <div className="absolute -inset-2.5 rounded-full border border-cyan-400/30 animate-ping opacity-25 pointer-events-none" />
              <div className="absolute -inset-4 rounded-full border border-purple-400/20 animate-pulse opacity-35 pointer-events-none" />
            </>
          )}

          {/* White Hole Photon Explosion Aura (가볍게 누를수록 눈부신 빛의 폭발) */}
          {activePhase === 'whitehole' && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: [1, 1 + (1 - gauge) * 0.45, 1],
                opacity: [0.7 + (1 - gauge) * 0.3, 1, 0.7 + (1 - gauge) * 0.3],
              }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -inset-6 rounded-full pointer-events-none"
              style={{
                background: `radial-gradient(circle, rgba(255,255,255,${(0.85 + (1 - gauge) * 0.15).toFixed(2)}) 0%, rgba(103,232,249,${(0.6 + (1 - gauge) * 0.35).toFixed(2)}) 45%, transparent 75%)`,
                filter: `blur(${Math.round(6 + (1 - gauge) * 14)}px)`,
              }}
            />
          )}

          {/* Black Hole Gravitational Suction Collapse Rings (세게 누를수록 빛을 삼키는 어둠의 수축) */}
          {activePhase === 'blackhole' && (
            <>
              <motion.div
                animate={{ scale: [1.8, 0.3], opacity: [0, 0.5 + gauge * 0.5, 0] }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'easeIn' }}
                className="absolute -inset-6 rounded-full pointer-events-none"
                style={{
                  border: '2px solid rgba(0, 0, 0, 0.95)',
                  boxShadow: '0 0 20px #000000',
                }}
              />
              <div
                className="absolute -inset-4 rounded-full bg-black/95 pointer-events-none transition-shadow duration-100"
                style={{
                  boxShadow: `inset 0 0 30px #000000, 0 0 ${Math.round(25 + gauge * 35)}px #000000`,
                }}
              />
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
            animate={{
              x: isAborted
                ? dragOffset.x * 0.75
                : isPressing
                ? activePhase === 'blackhole' && gauge >= 0.82
                  ? [dragOffset.x * 0.35 - 1.2, dragOffset.x * 0.35 + 1.2, dragOffset.x * 0.35]
                  : dragOffset.x * 0.35
                : 0,
              y: isAborted
                ? dragOffset.y * 0.75
                : isPressing
                ? activePhase === 'blackhole' && gauge >= 0.82
                  ? [dragOffset.y * 0.35 - 0.8, dragOffset.y * 0.35 + 0.8, dragOffset.y * 0.35]
                  : dragOffset.y * 0.35
                : 0,
            }}
            transition={{
              duration: activePhase === 'blackhole' && gauge >= 0.82 ? 0.08 : 0.15,
              repeat: activePhase === 'blackhole' && gauge >= 0.82 ? Infinity : 0,
            }}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center shrink-0 cursor-pointer outline-none relative overflow-hidden transition-all duration-200 border ${
              isAborted
                ? 'opacity-70 border-red-500/80 shadow-[0_0_25px_rgba(239,68,68,0.7)]'
                : activePhase === 'whitehole'
                ? 'scale-105 border-white shadow-[0_0_30px_#ffffff]'
                : activePhase === 'event_horizon'
                ? 'scale-110 border-purple-400'
                : activePhase === 'blackhole'
                ? 'scale-115 border-zinc-800'
                : 'border-cyan-400/40 hover:border-cyan-300/80 shadow-[0_0_20px_rgba(56,189,248,0.3)]'
            }`}
            style={{
              background: '#04030a',
              boxShadow: isAborted
                ? 'inset 0 0 20px rgba(239, 68, 68, 0.5), 0 0 25px rgba(239, 68, 68, 0.6)'
                : !isPressing
                ? 'inset 0 0 20px rgba(56, 189, 248, 0.25), inset -5px -5px 15px rgba(0, 0, 0, 0.9), 0 0 30px rgba(110, 130, 255, 0.3)'
                : activePhase === 'whitehole'
                ? `inset 0 0 ${Math.round(20 + (1 - gauge) * 25)}px rgba(255, 255, 255, ${(0.8 + (1 - gauge) * 0.2).toFixed(2)}), 0 0 ${Math.round(30 + (1 - gauge) * 45)}px rgba(255, 255, 255, ${(0.8 + (1 - gauge) * 0.2).toFixed(2)}), 0 0 ${Math.round(45 + (1 - gauge) * 60)}px rgba(56, 189, 248, ${(0.7 + (1 - gauge) * 0.3).toFixed(2)})`
                : activePhase === 'event_horizon'
                ? 'inset 0 0 20px rgba(168, 85, 247, 0.5), inset -5px -5px 15px rgba(0, 0, 0, 0.8), 0 0 30px rgba(168, 85, 247, 0.6), 0 0 45px rgba(0, 240, 255, 0.4)'
                : `inset 0 0 ${Math.round(25 + gauge * 25)}px #000000, inset -8px -8px 20px #000000, 0 0 ${Math.round(20 + gauge * 30)}px rgba(0, 0, 0, 0.95)`,
            }}
            aria-label={`빅뱅 차원 도약 · 다음 도약 미리보기: ${nextDest.name}`}
          >
            {/* 🌀 Rotating Wormhole Accretion Vortex Disk (가벼울수록 빛나고 세게 누를수록 어두워짐) */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: isPressing ? Math.max(0.5, 2.5 - gauge * 1.8) : 8,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="absolute inset-0 rounded-full pointer-events-none z-10 transition-opacity duration-75"
              style={{
                opacity: isPressing ? (activePhase === 'blackhole' ? 0.15 : 0.4 + (1 - gauge) * 0.6) : 0.65,
                background:
                  activePhase === 'blackhole'
                    ? 'conic-gradient(from 0deg, rgba(20,10,5,0.8) 0deg, rgba(0,0,0,1) 180deg, rgba(20,10,5,0.8) 360deg)'
                    : 'conic-gradient(from 0deg, rgba(255,255,255,0.95) 0deg, rgba(56,189,248,0.85) 90deg, rgba(168,85,247,0.7) 180deg, rgba(255,255,255,0.95) 360deg)',
                filter: `blur(${Math.max(1, 2.0 - gauge * 1.0)}px)`,
              }}
            />

            {/* Counter-rotating Inner Spiral Dashed Ring */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{
                duration: isPressing ? 3 : 12,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="absolute inset-1 rounded-full border border-dashed border-white/50 opacity-40 pointer-events-none z-10"
            />

            {/* Event Horizon Deep Singularity Core (Black Void Aperture) */}
            <div className="absolute inset-2 sm:inset-2.5 rounded-full bg-[#030208] shadow-[inset_0_0_14px_rgba(0,0,0,0.95)] z-15 pointer-events-none" />

            {/* 🎯 Big Bang Center Destination Preview (빅뱅 중심 실시간 미리보기) */}
            <div className="relative z-20 w-[82%] h-[82%] rounded-full flex flex-col items-center justify-center text-center select-none pointer-events-none">
              {isAborted ? (
                <div className="flex flex-col items-center justify-center">
                  <span className="text-xl font-bold leading-none text-red-400 animate-pulse">
                    🛑
                  </span>
                  <span className="text-[7.5px] font-bold text-red-300 tracking-tight leading-tight mt-0.5 whitespace-pre-line">
                    취소됨{'\n'}[안전복귀]
                  </span>
                </div>
              ) : !isPressing ? (
                <motion.div
                  animate={{
                    scale: [1, 1.08, 1],
                  }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="flex flex-col items-center justify-center"
                >
                  <div className="relative flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-cyan-400/25 blur-[3px] absolute animate-pulse" />
                    {nextDest.id === 'orb' ? (
                      <CrystalOrbIcon size={24} className="drop-shadow-[0_0_10px_rgba(255,255,255,0.95),0_0_20px_rgba(56,189,248,0.9)]" />
                    ) : (
                      <span className="text-xl sm:text-2xl drop-shadow-[0_0_10px_rgba(255,255,255,0.95),0_0_20px_rgba(56,189,248,0.9)]">
                        {nextDest.icon}
                      </span>
                    )}
                  </div>
                  <span className="text-[7.5px] sm:text-[8px] font-extrabold text-cyan-200 tracking-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] leading-tight mt-0.5">
                    {nextDest.name.split(' ')[0]}
                  </span>
                </motion.div>
              ) : gauge < 0.3 ? (
                <div className="flex flex-col items-center justify-center">
                  <span
                    className="text-xl font-bold leading-none animate-pulse"
                    style={{
                      color: '#ffffff',
                      textShadow: '0 0 8px #ffffff',
                    }}
                  >
                    ⚡
                  </span>
                  <span
                    className="text-[7.5px] font-bold tracking-tight leading-tight mt-0.5 whitespace-pre-line"
                    style={{
                      color: '#ffffff',
                      textShadow: '0 0 6px #ffffff',
                    }}
                  >
                    즉시 탭{'\n'}[빠른 도약]
                  </span>
                </div>
              ) : gauge < 0.7 ? (
                <div className="flex flex-col items-center justify-center">
                  <span
                    className="text-xl font-bold leading-none animate-bounce"
                    style={{
                      color: '#00f0ff',
                      textShadow: '0 0 12px #00f0ff',
                    }}
                  >
                    {nextDest.icon}
                  </span>
                  <span
                    className="text-[7.5px] font-bold tracking-tight leading-tight mt-0.5 whitespace-pre-line"
                    style={{
                      color: '#00f0ff',
                      textShadow: '0 0 8px #00f0ff',
                    }}
                  >
                    빅뱅 도약{'\n'}[{nextDest.name.split(' ')[0]}]
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <span
                    className="text-xl font-bold leading-none animate-spin"
                    style={{
                      color: '#ff0099',
                      textShadow: '0 0 16px #ff0099',
                    }}
                  >
                    🌌
                  </span>
                  <span
                    className="text-[7.5px] font-bold tracking-tight leading-tight mt-0.5 whitespace-pre-line"
                    style={{
                      color: '#ff0099',
                      textShadow: '0 0 10px #ff0099',
                    }}
                  >
                    빅뱅 특이점{'\n'}[심층 전이]
                  </span>
                </div>
              )}
            </div>
          </motion.button>

          {/* 🛡️ 옆으로 튕겨서 취소 안내 가이드 & 안전 알림 (버튼 누르고 있을 때 표시) */}
          <AnimatePresence>
            {isPressing && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="absolute -top-7 left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap z-30 select-none"
              >
                {isAborted ? (
                  <span className="flex items-center gap-1 text-[8px] sm:text-[9px] font-black tracking-tight px-2 py-0.5 rounded-full bg-red-950/95 border border-red-500 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse">
                    🛑 튕김 감지됨 · 도약 취소 (손을 떼면 원위치)
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[8px] font-semibold tracking-tight px-2 py-0.5 rounded-full bg-black/85 border border-cyan-400/40 text-cyan-200/90 backdrop-blur-md shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                    <span className="text-cyan-400 font-black">‹</span> 옆으로 튕기면 안전 취소 <span className="text-cyan-400 font-black">›</span>
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 좌우 튕기기 제스처 인디케이터 화살표 */}
          {isPressing && !isAborted && (
            <>
              <motion.div
                animate={{ x: [-2, -6, -2], opacity: [0.35, 0.85, 0.35] }}
                transition={{ duration: 1.0, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute left-[-22px] top-1/2 -translate-y-1/2 text-cyan-400/80 text-xs pointer-events-none select-none font-black drop-shadow-[0_0_6px_rgba(56,189,248,0.8)]"
              >
                ◀
              </motion.div>
              <motion.div
                animate={{ x: [2, 6, 2], opacity: [0.35, 0.85, 0.35] }}
                transition={{ duration: 1.0, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute right-[-22px] top-1/2 -translate-y-1/2 text-cyan-400/80 text-xs pointer-events-none select-none font-black drop-shadow-[0_0_6px_rgba(56,189,248,0.8)]"
              >
                ▶
              </motion.div>
            </>
          )}

          {/* 실시간 텔레메트리 상태 표시 */}
          <div className="text-[8px] font-mono text-cyan-300/60 text-center tracking-wider mt-1 select-none pointer-events-none">
            {isAborted
              ? 'ABORTED: FLING DETECTED'
              : !isPressing
              ? 'BIGBANG: READY'
              : gauge < 0.3
              ? `FOCUSING (${(gauge * 100).toFixed(0)}%)`
              : gauge < 0.7
              ? `BIGBANG WARP (${(gauge * 100).toFixed(0)}%)`
              : `SINGULARITY PEAK (${(gauge * 100).toFixed(0)}%)`}
          </div>
        </div>
      </div>
    </>
  );
}
