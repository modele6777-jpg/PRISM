import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'motion/react';
import { Bird, Sparkles, Zap, Compass, AlertCircle } from 'lucide-react';
import { WarpPhase, OmniWarpTarget } from '@/lib/omniWarp/types';
import { calculateWarpMetrics, forceToAiTemperature } from '@/lib/omniWarp/forceSensor';
import { serializeCurrentView, synthesizeWarpTarget, executeBigBangCommit } from '@/lib/omniWarp/omniWarpEngine';
import { getTossRule } from '@/lib/prismTossRegistry';
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

  // Active view context and next destination pre-vision (수정구슬 영시)
  const currentContext = serializeCurrentView(location);
  const normPath = location.replace('/', '') || 'hub';
  const tossRule = getTossRule(normPath, `${currentContext.summary} ${currentContext.primarySubject || ''}`);
  const nextDest = tossRule.primary;

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
      {/* 🌟 1. Environmental Atmospheric Field (Center-Bottom Anchored) */}
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
                className="fixed inset-0 pointer-events-none z-[330] bg-[radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.45)_0%,rgba(103,232,249,0.25)_40%,transparent_75%)]"
              >
                {/* Outward Radiating Solar Photon Rays from Center Bottom */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                  className="absolute bottom-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] opacity-40 pointer-events-none bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.8)_20deg,transparent_40deg,rgba(56,189,248,0.7)_60deg,transparent_80deg,rgba(255,255,255,0.8)_100deg,transparent_120deg,rgba(56,189,248,0.7)_140deg,transparent_160deg,rgba(255,255,255,0.8)_180deg,transparent_200deg,rgba(56,189,248,0.7)_220deg,transparent_240deg,rgba(255,255,255,0.8)_260deg,transparent_280deg,rgba(56,189,248,0.7)_300deg,transparent_320deg,rgba(255,255,255,0.8)_340deg,transparent_360deg)] blur-md"
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
                {/* Inward Gravitational Influx Distortion Vignette from Center Bottom */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,transparent_80px,rgba(0,0,0,0.6)_220px,rgba(0,0,0,0.95)_480px)]" />

                {/* Accretion Disk Plasma Ambient Glow */}
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.35, 0.65, 0.35] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute bottom-[-150px] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(234,88,12,0.35)_0%,rgba(185,28,28,0.2)_40%,transparent_70%)] blur-2xl pointer-events-none"
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
            ? 'bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2'
            : 'bottom-safe-fab left-1/2 -translate-x-1/2'
        }`}
      >
        {/* Real-time Holographic Warp Spectrum HUD (Anchored Center Above Crystal Ball) */}
        <AnimatePresence>
          {isPressing && currentTarget && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.92 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className={`absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 w-[300px] sm:w-[340px] p-3.5 rounded-2xl backdrop-blur-2xl border shadow-2xl flex flex-col gap-2 pointer-events-none select-none ${
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
                      <Sparkles size={14} className="animate-spin text-white" /> ✨ 화이트홀 · 빛의 방출
                    </span>
                  ) : activePhase === 'event_horizon' ? (
                    <span className="flex items-center gap-1 text-purple-300">
                      <Zap size={14} className="animate-pulse" /> 🌀 웜홀 특이점 · 차원 도약
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]">
                      <Compass size={14} className="animate-spin text-amber-300" /> 🕳️ 블랙홀 · 절대 암흑 빅뱅
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

              {/* Next Feature Pre-vision (다음기능 영시) Reflection */}
              <div className="flex items-center justify-between bg-white/[0.08] px-2.5 py-1.5 rounded-xl border border-white/10 shadow-inner">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0">{nextDest.icon}</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-extrabold text-cyan-200 truncate">
                      다음 도약: {nextDest.name}
                    </span>
                    <span className="text-[8px] text-white/60 truncate">
                      {nextDest.subName} · {currentTarget.previewDescription}
                    </span>
                  </div>
                </div>
                <span className="text-[8px] px-1.5 py-0.5 rounded-md font-mono font-bold uppercase shrink-0 bg-cyan-400/20 text-cyan-200 border border-cyan-400/30">
                  {currentTarget.phase.toUpperCase()}
                </span>
              </div>

              {/* Content: Real-time Action Preview */}
              <div className="flex flex-col gap-0.5 py-0.5">
                <div className="text-xs font-bold text-white/95 leading-tight line-clamp-1">
                  {isAborted ? '손을 떼면 원래 화면으로 복귀합니다' : currentTarget.previewLabel}
                </div>
                <div className="text-[11px] text-white/70 leading-normal line-clamp-2">
                  {isAborted ? '버튼 영역 밖으로 스와이프되어 취소 대기 중입니다.' : currentTarget.previewDescription}
                </div>
              </div>

              {/* Dynamic Multi-Stage Progress Meter */}
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden relative">
                <div
                  className={`h-full transition-all duration-75 rounded-full ${
                    isAborted ? 'bg-red-500' : ''
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(8, gauge * 100))}%`,
                    background: isAborted
                      ? undefined
                      : 'linear-gradient(90deg, #00f0ff 0%, #7b8bff 45%, #ff0077 100%)',
                  }}
                />
              </div>

              {/* Release / Abort Guide footer + Telemetry */}
              <div className="flex items-center justify-between text-[9px] text-white/60 font-mono tracking-tight pt-0.5">
                <span>
                  Force: {(gauge * 100).toFixed(1)}% |{' '}
                  {activePhase === 'whitehole'
                    ? 'WHITEHOLE'
                    : activePhase === 'event_horizon'
                    ? 'WORMHOLE'
                    : activePhase === 'blackhole'
                    ? 'BLACKHOLE'
                    : 'IDLE'}
                </span>
                <span className="text-white/40">밖으로 밀어 취소</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop Hover Tooltip (Idle mode only, centered above crystal ball) */}
        {!isPressing && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 scale-0 origin-bottom group-hover:scale-100 transition-all duration-200 bg-zinc-950/95 backdrop-blur-md border border-cyan-400/30 text-white text-[10px] py-2 px-3 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.8),0_0_20px_rgba(56,189,248,0.25)] whitespace-nowrap tracking-wide font-sans pointer-events-none z-50 flex items-center gap-2.5">
            <span className="text-base">{nextDest.icon}</span>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-cyan-200">
                  수정구슬 영시 · {nextDest.name}
                </span>
                <a
                  href="/orb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pointer-events-auto text-[8px] px-1.5 py-0.5 rounded bg-purple-500/40 hover:bg-purple-500/60 text-purple-100 border border-purple-400/50 font-bold transition-colors"
                  title="독립형 크리스탈 오라클 웹앱 열기"
                >
                  독립 앱 ↗
                </a>
              </div>
              <span className="text-[8px] text-white/60">
                {nextDest.subName} · 탭: 도약 / 길게 누름: 빅뱅 포스
              </span>
            </div>
          </div>
        )}

        {/* The Crystal Ball (수정구슬) Core Component */}
        <div className="group relative flex flex-col items-center justify-center select-none">
          {/* Ambient Gravitational Ripple Waves */}
          {activePhase === 'idle' && (
            <>
              <div className="absolute -inset-2.5 rounded-full border border-cyan-400/30 animate-ping opacity-25 pointer-events-none" />
              <div className="absolute -inset-4 rounded-full border border-purple-400/20 animate-pulse opacity-35 pointer-events-none" />
            </>
          )}

          {/* White Hole Photon Explosion Aura */}
          {activePhase === 'whitehole' && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.35, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -inset-6 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.95)_0%,rgba(103,232,249,0.7)_45%,transparent_75%)] blur-lg pointer-events-none"
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
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center shrink-0 cursor-pointer outline-none relative overflow-hidden transition-all duration-200 border border-white/30 ${
              isAborted
                ? 'opacity-70 border-red-500/60'
                : activePhase === 'whitehole'
                ? 'scale-105'
                : activePhase === 'event_horizon'
                ? 'scale-110'
                : activePhase === 'blackhole'
                ? 'scale-115'
                : 'hover:border-white/50'
            }`}
            style={{
              background: 'radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0.06) 50%, rgba(0, 0, 0, 0.75) 100%)',
              boxShadow: isAborted
                ? 'inset 0 0 20px rgba(239, 68, 68, 0.4), 0 0 25px rgba(239, 68, 68, 0.5)'
                : !isPressing
                ? 'inset 0 0 20px rgba(255, 255, 255, 0.3), inset -5px -5px 15px rgba(0, 0, 0, 0.8), 0 0 30px rgba(110, 130, 255, 0.25)'
                : gauge < 0.3
                ? 'inset 0 0 20px rgba(255, 255, 255, 0.4), inset -5px -5px 15px rgba(0, 0, 0, 0.8), 0 0 25px rgba(255, 255, 255, 0.5)'
                : gauge < 0.7
                ? 'inset 0 0 22px rgba(255, 255, 255, 0.45), inset -5px -5px 15px rgba(0, 0, 0, 0.8), 0 0 35px rgba(0, 240, 255, 0.6)'
                : 'inset 0 0 25px rgba(255, 255, 255, 0.5), inset -5px -5px 15px rgba(0, 0, 0, 0.8), 0 0 45px rgba(255, 0, 153, 0.8)',
            }}
            aria-label={`OmniWarp 수정구슬 · 다음 도약: ${nextDest.name}`}
          >
            {/* 상단 유리 반사광 (Specular Glass Glare) */}
            <div
              className="absolute top-1.5 left-2.5 sm:top-2 sm:left-3.5 w-7 sm:w-8 h-3.5 sm:h-4 rounded-full pointer-events-none z-30 -rotate-[25deg]"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.65) 0%, transparent 80%)',
              }}
            />

            {/* 구슬 내부 미래 투영 홀로그램 (Peeking Vision) */}
            <div className="relative z-20 w-[82%] h-[82%] rounded-full flex flex-col items-center justify-center text-center select-none pointer-events-none">
              {!isPressing ? (
                <motion.div
                  animate={{
                    y: [0, -1.5, 0],
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 2.4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="flex flex-col items-center justify-center"
                >
                  <div className="relative flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-cyan-400/20 blur-[2px] absolute animate-pulse" />
                    <span className="text-xl drop-shadow-[0_0_8px_rgba(255,255,255,0.9),0_0_16px_rgba(56,189,248,0.8)]">
                      {nextDest.icon}
                    </span>
                  </div>
                  <span className="text-[7.5px] font-bold text-white/90 tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] leading-tight mt-0.5">
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
                    즉시 탭{'\n'}[빠른 실행]
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
                    화이트홀 예지{'\n'}[{nextDest.name.split(' ')[0]}]
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
                    블랙홀 빅뱅{'\n'}[심층 전이]
                  </span>
                </div>
              )}
            </div>

            {/* 하단 프레넬 반사광 (Lower Rim Bounce) */}
            <div className="absolute inset-x-3 bottom-1 h-2 rounded-full bg-gradient-to-t from-cyan-400/25 to-transparent blur-[0.5px] pointer-events-none z-30" />
          </motion.button>

          {/* 실시간 텔레메트리 상태 표시 */}
          <div className="text-[8px] font-mono text-white/50 text-center tracking-wider mt-1 select-none pointer-events-none">
            {!isPressing
              ? 'Orb State: SLEEPING'
              : gauge < 0.3
              ? `CLEAR FOCUS (${(gauge * 100).toFixed(0)}%)`
              : gauge < 0.7
              ? `WHITEHOLE PEEK (${(gauge * 100).toFixed(0)}%)`
              : `BIGBANG MATRIX (${(gauge * 100).toFixed(0)}%)`}
          </div>
        </div>
      </div>
    </>
  );
}
