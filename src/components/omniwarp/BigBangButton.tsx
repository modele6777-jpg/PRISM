import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { CrystalOrbIcon } from '@/components/icons/CrystalOrbIcon';
import { WarpPhase, OmniWarpTarget } from '@/lib/omniWarp/types';
import { calculateWarpMetrics, forceToAiTemperature } from '@/lib/omniWarp/forceSensor';
import { serializeCurrentView, synthesizeWarpTarget, executeBigBangCommit, getOrbRunicSigil } from '@/lib/omniWarp/omniWarpEngine';
import { getTossRule } from '@/lib/prismTossRegistry';
import { omniWarpAudio } from '@/lib/omniWarp/omniWarpAudio';
import { triggerHaptic, startBlackHoleContinuousHaptic, stopBlackHoleContinuousHaptic } from '@/lib/omniWarp/omniWarpHaptics';
import { BigBangCircularMeter } from './BigBangCircularMeter';

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
  const secondaryDest = tossRule.secondary;
  const tertiaryDest = tossRule.tertiary;

  // 오브 사이트의 신성한 고대 룬 표식 (Elder Runic Sigils)
  const nextRune = getOrbRunicSigil(nextDest.id);
  const secondaryRune = getOrbRunicSigil(secondaryDest.id);
  const tertiaryRune = getOrbRunicSigil(tertiaryDest.id);

  // 🎯 도약 목적지가 루시 채팅 또는 크리스탈 오브인지 실시간 판별
  const targetDestPath = (currentTarget?.destinationPath || (
    activePhase === 'blackhole' ? tertiaryDest.path :
    activePhase === 'event_horizon' ? secondaryDest.path :
    nextDest.path
  )).toLowerCase();

  const targetDestId = (currentTarget?.id || (
    activePhase === 'blackhole' ? tertiaryDest.id :
    activePhase === 'event_horizon' ? secondaryDest.id :
    nextDest.id
  )).toLowerCase();

  const isTargetLucy = (
    targetDestPath.includes('/chat') ||
    targetDestPath.includes('/lucy') ||
    targetDestId === 'lucy' ||
    targetDestId === 'chat'
  );

  const isTargetOrb = (
    targetDestPath.includes('/orb') ||
    targetDestPath.includes('/crystal') ||
    targetDestPath.includes('/gateway') ||
    targetDestId === 'orb' ||
    targetDestId === 'crystal' ||
    targetDestId === 'gateway'
  );

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const touchStartRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const idleRafRef = useRef<number | null>(null);
  const lastPhaseRef = useRef<WarpPhase>('idle');
  const currentPointerEventRef = useRef<React.PointerEvent | null>(null);
  const hasTriggeredBlackHolePeakRef = useRef<boolean>(false);
  const lastStageRef = useRef<number>(1);

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

    // 🧲 마그네틱 래칫 햅틱 (9개 단계 전이 시 손끝에 착 감기는 정밀 다이얼 틱 진동)
    const currentStage = target.stageIndex || 1;
    if (currentStage !== lastStageRef.current && !metrics.isAborted) {
      lastStageRef.current = currentStage;
      triggerHaptic('whitehole');
    }

    // 🕳️ 압력의 세기가 최대치(블랙홀 단계: virtualForce >= 0.85)에 도달했을 때 무한 반복 미세 진동 피드백 (Continuous Gravity Rumble)
    if (metrics.virtualForce >= 0.85 && !metrics.isAborted) {
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
    setGauge(0.08);
    setDurationMs(0);
    lastStageRef.current = 1;

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
    lastStageRef.current = 1;
    stopBlackHoleContinuousHaptic();
    setDragOffset({ x: 0, y: 0 });

    if (metrics.isAborted || isAborted) {
      omniWarpAudio.playAbort();
      triggerHaptic('abort');
      setActivePhase('idle');
      setGauge(0);
      setDurationMs(0);
      setIsAborted(false);
      return;
    }

    setIsAborted(false);

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
    lastStageRef.current = 1;
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

      {/* 🚀 2. Crystal Ball Big Bang Button (Positioned at Exact Bottom-Center) */}
      <div
        className={`fixed inset-x-0 mx-auto w-fit z-[350] pointer-events-none flex items-center justify-center select-none ${
          isStandaloneChat
            ? 'bottom-[68px] sm:bottom-[76px]'
            : 'bottom-safe-fab'
        }`}
      >

        {/* The Wormhole (웜홀) Core Component with Center Preview */}
        <div
          className="group relative flex flex-col items-center justify-center pointer-events-auto select-none"
          onPointerEnter={() => setIsHovered(true)}
          onPointerLeave={() => setIsHovered(false)}
        >
          {/* 🎯 버튼 & 궤도 전용 정밀 센터링 앵커 (아이콘 중심과 1:1 완벽 동심원 정렬 래퍼) */}
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center shrink-0">
            {/* 🌟 빅뱅 아케인 마법진 매트릭스 (Arcane Magic Circle: 항시 노출 & 마우스 호버 시 광채 팽창) */}
            <AnimatePresence>
              {!isPressing && (
                <motion.div
                  key="circular-meter-track"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: isHovered ? 1 : 0.85,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                >
                  <BigBangCircularMeter
                    isPressing={false}
                    isHovered={isHovered}
                    gauge={gauge}
                    durationMs={durationMs}
                    activePhase={activePhase}
                    isAborted={isAborted}
                    idleCycleProgress={idleCycleProgress}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* 💥 터치 시 원형 궤도 바깥쪽 빛비춤 및 어두운 효과 (Outer Orbital Light & Dark Void Aura) */}
            <AnimatePresence>
              {isPressing && (
                <motion.div
                  key="outer-orbital-effects"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                >
                  {/* 1. 궤도 바깥쪽 눈부신 빛비춤 효과 (가벼운 터치 / 화이트홀: 방사형 빛살 & 오로라 코로나 림) */}
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    animate={{
                      rotate: 360,
                      scale: [1, 1.06 + (1 - gauge) * 0.14, 1],
                    }}
                    transition={{
                      rotate: { duration: 16, repeat: Infinity, ease: 'linear' },
                      scale: { duration: 0.75, repeat: Infinity, ease: 'easeInOut' },
                    }}
                    style={{
                      opacity: Math.max(0, 1 - gauge * 1.5),
                    }}
                  >
                    {/* 궤도 바깥쪽 림 라디언스 (직경 104px의 고휘도 빛비춤 링) */}
                    <div
                      className="absolute rounded-full border border-white/90"
                      style={{
                        width: 104,
                        height: 104,
                        boxShadow: `0 0 24px rgba(255,255,255,0.95), 0 0 45px rgba(0,240,255,0.85), inset 0 0 15px rgba(255,255,255,0.7)`,
                      }}
                    />

                    {/* 궤도 바깥쪽으로 사방으로 뻗어나가는 8줄기 천상 빛비춤 (Radial Starlight Flares) */}
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                      <div
                        key={`radial-ray-${deg}`}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 origin-center pointer-events-none"
                        style={{ transform: `rotate(${deg}deg)` }}
                      >
                        <div
                          className="w-1 rounded-full animate-pulse"
                          style={{
                            height: 155,
                            background:
                              'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(0,240,255,0.75) 25%, transparent 75%)',
                            filter: 'blur(0.8px)',
                          }}
                        />
                      </div>
                    ))}

                    {/* 궤도 외곽 부드러운 화이트홀 플레어 오라 */}
                    <div
                      className="absolute rounded-full"
                      style={{
                        width: 140,
                        height: 140,
                        background:
                          'radial-gradient(circle, transparent 48px, rgba(255,255,255,0.8) 54px, rgba(0,240,255,0.4) 65px, transparent 72px)',
                        filter: 'blur(3px)',
                      }}
                    />
                  </motion.div>

                  {/* 2. 궤도 바깥쪽 칠흑의 어두운 효과 (깊은 압력 / 블랙홀: 심연의 중력 수축 링 & 암흑 비네팅) */}
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    animate={{
                      scale: [1.08, 0.96, 1.08],
                    }}
                    transition={{
                      duration: 0.65,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    style={{
                      opacity: Math.max(0, (gauge - 0.22) * 1.4),
                    }}
                  >
                    {/* 궤도 외곽을 둘러싸는 칠흑의 심연 암흑 링 (Outer Abyss Ring) */}
                    <div
                      className="absolute rounded-full border-2 border-black"
                      style={{
                        width: 112,
                        height: 112,
                        boxShadow: `0 0 35px #000000, 0 0 65px #000000, inset 0 0 25px #000000`,
                        background:
                          'radial-gradient(circle, transparent 46px, rgba(0,0,0,0.9) 56px, #000000 70px)',
                      }}
                    />

                    {/* 궤도 바깥쪽으로 수축하는 중력 흡입 펄스 (Inward Singularity Waves) */}
                    <div
                      className="absolute rounded-full border border-amber-500/50 animate-ping"
                      style={{
                        width: 136,
                        height: 136,
                        animationDuration: '1.1s',
                      }}
                    />
                  </motion.div>

                  {/* 3. 빛과 어둠의 교차 나선 휠 (Intertwining Light & Shadow Chiaroscuro Helix) */}
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: 'linear' }}
                  >
                    {/* 상단 180도: 눈부신 백색광 빔 (Solar Light Beam) */}
                    <div
                      className="absolute rounded-full"
                      style={{
                        width: 124,
                        height: 124,
                        background:
                          'conic-gradient(from 0deg, rgba(255,255,255,0.95) 0deg, rgba(56,189,248,0.75) 50deg, transparent 110deg, transparent 360deg)',
                        filter: 'blur(2px)',
                        opacity: 0.8,
                      }}
                    />
                    {/* 하단 180도 맞은편: 빛을 삼키는 심연의 암흑 보이드 빔 (Singularity Void Beam) */}
                    <div
                      className="absolute rounded-full"
                      style={{
                        width: 124,
                        height: 124,
                        background:
                          'conic-gradient(from 180deg, #000000 0deg, rgba(15,8,22,0.95) 50deg, transparent 110deg, transparent 360deg)',
                        filter: 'blur(2.5px)',
                        opacity: 0.85,
                      }}
                    />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

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
                x: isPressing && isAborted
                  ? dragOffset.x * 0.75
                  : isPressing
                  ? activePhase === 'blackhole' && gauge >= 0.82
                    ? [dragOffset.x * 0.35 - 1.2, dragOffset.x * 0.35 + 1.2, dragOffset.x * 0.35]
                    : dragOffset.x * 0.35
                  : 0,
                y: isPressing && isAborted
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
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center shrink-0 cursor-pointer outline-none relative overflow-hidden transition-all duration-300 border ${
                isPressing && isAborted
                  ? 'opacity-70 border-red-500/80 shadow-[0_0_25px_rgba(239,68,68,0.7)]'
                  : activePhase === 'whitehole'
                  ? 'scale-105 border-white shadow-[0_0_30px_#ffffff]'
                  : activePhase === 'event_horizon'
                  ? 'scale-110 border-purple-400'
                  : activePhase === 'blackhole'
                  ? 'scale-115 border-zinc-800'
                  : 'border-cyan-400/40 hover:border-cyan-300/80 shadow-[0_0_24px_rgba(56,189,248,0.35),0_0_40px_rgba(168,85,247,0.2)]'
              }`}
              style={{
                background: !isPressing
                  ? 'radial-gradient(circle at 35% 30%, #15162c 0%, #0d0e1d 45%, #05060f 80%, #020207 100%)'
                  : '#04030a',
                boxShadow: (isPressing && isAborted)
                  ? 'inset 0 0 20px rgba(239, 68, 68, 0.5), 0 0 25px rgba(239, 68, 68, 0.6)'
                  : !isPressing
                  ? 'inset 0 0 22px rgba(56, 189, 248, 0.28), inset 0 0 12px rgba(192, 132, 252, 0.25), inset -6px -6px 18px rgba(0, 0, 0, 0.95), 0 0 35px rgba(56, 189, 248, 0.35)'
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

              {/* Forward-rotating Inner Spiral Dashed Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: isPressing ? 3 : 12,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="absolute inset-1 rounded-full border border-dashed border-cyan-300/40 opacity-50 pointer-events-none z-10"
              />

              {/* Event Horizon Deep Singularity Core (Harmonized Dark Space Lens with Subtle Astral Dust) */}
              <div
                className="absolute inset-2 sm:inset-2.5 rounded-full z-15 pointer-events-none transition-all duration-300 overflow-hidden flex items-center justify-center"
                style={{
                  background: 'radial-gradient(circle at 45% 35%, #0f1124 0%, #080916 55%, #030309 100%)',
                  boxShadow: 'inset 0 0 16px rgba(0, 0, 0, 0.95), inset 0 0 8px rgba(56, 189, 248, 0.2)',
                }}
              />

              {/* 🎯 Big Bang Center: 대기 시 은은한 싱귤래리티 코어, 도약 시 루시/오브 아이콘 또는 목적지 룬 표출 */}
              <div className="relative z-20 w-full h-full rounded-full flex items-center justify-center text-center select-none pointer-events-none">
                {isPressing && isAborted ? (
                  <div className="flex items-center justify-center">
                    <span className="text-2xl font-bold leading-none text-red-400 animate-pulse">
                      🛑
                    </span>
                  </div>
                ) : isPressing ? (
                  <motion.div
                    key={`active-target-${isTargetLucy ? 'lucy' : isTargetOrb ? 'orb' : (currentTarget?.runeSymbol || nextRune.symbol)}`}
                    initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
                    animate={{ scale: [1, 1.08, 1], opacity: 1, rotate: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative flex flex-col items-center justify-center"
                  >
                    {/* 💫 빛과 어둠이 교차하는 내부 앰비언트 글로우 오라 */}
                    <motion.div
                      animate={{
                        scale: [0.85, 1.3, 0.85],
                        opacity: [0.65, 1, 0.65],
                        rotate: [0, 180, 360],
                      }}
                      transition={{ duration: 2.0, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute -inset-3 rounded-full pointer-events-none blur-[5px]"
                      style={{
                        background: activePhase === 'blackhole'
                          ? 'radial-gradient(circle, rgba(251,113,133,0.85) 0%, rgba(0,0,0,0.95) 50%, rgba(251,113,133,0.4) 80%, transparent 95%)'
                          : activePhase === 'whitehole'
                          ? 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(56,189,248,0.8) 45%, rgba(0,0,0,0.6) 75%, transparent 90%)'
                          : 'radial-gradient(circle, rgba(192,132,252,0.9) 0%, rgba(0,0,0,0.7) 45%, rgba(168,85,247,0.6) 75%, transparent 90%)',
                      }}
                    />

                    {/* 🔮 도약 대상별 입력: 루시 채팅 이동 시 루시 스파클 아이콘, 오브 이동 시 크리스탈 오브 아이콘, 그 외에는 목적지 룬 */}
                    {isTargetLucy ? (
                      <div className="relative z-10 flex items-center justify-center animate-pulse">
                        <Sparkles
                          className="w-7 h-7 sm:w-8 sm:h-8 text-amber-200"
                          style={{
                            filter: activePhase === 'whitehole'
                              ? 'drop-shadow(0 0 10px #ffffff) drop-shadow(0 0 20px #f472b6) drop-shadow(0 0 30px #c084fc)'
                              : 'drop-shadow(0 0 12px #f472b6) drop-shadow(0 0 24px #a855f7)',
                          }}
                        />
                      </div>
                    ) : isTargetOrb ? (
                      <div className="relative z-10 flex items-center justify-center animate-pulse">
                        <CrystalOrbIcon
                          size={28}
                          className="drop-shadow-[0_0_12px_rgba(56,189,248,0.95)] drop-shadow-[0_0_24px_rgba(168,85,247,0.85)]"
                        />
                      </div>
                    ) : (
                      /* 그 외 목적지 고대 룬 표식 (Elder Runic Sigil) */
                      <span
                        className="relative z-10 font-serif font-black text-2xl sm:text-[30px] leading-none select-none tracking-tight animate-pulse"
                        style={{
                          color: activePhase === 'whitehole'
                            ? '#ffffff'
                            : activePhase === 'event_horizon'
                            ? '#e9d5ff'
                            : '#fecdd3',
                          filter: activePhase === 'whitehole'
                            ? 'drop-shadow(0 0 12px #ffffff) drop-shadow(0 0 24px #38bdf8)'
                            : activePhase === 'event_horizon'
                            ? 'drop-shadow(0 0 12px #e9d5ff) drop-shadow(0 0 24px #a855f7)'
                            : 'drop-shadow(0 0 14px #fb7185) drop-shadow(0 0 24px #e11d48) drop-shadow(0 0 32px #000000)',
                        }}
                      >
                        {currentTarget?.runeSymbol || (activePhase === 'blackhole' ? tertiaryRune.symbol : activePhase === 'event_horizon' ? secondaryRune.symbol : nextRune.symbol)}
                      </span>
                    )}
                  </motion.div>
                ) : (
                  /* 대기 상태: 현재 사이트 표식 없이, 마법진 궤도 색감(시안/오로라)과 완벽히 공명하는 은은한 싱귤래리티 코어 */
                  <div className="relative flex items-center justify-center pointer-events-none">
                    <div className="w-2 h-2 rounded-full bg-cyan-300/40 blur-[1px] animate-pulse" />
                    <div className="absolute w-3.5 h-3.5 rounded-full border border-cyan-400/25 animate-ping opacity-40" />
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
          </div>
        </div>
      </div>
    </>
  );
}
