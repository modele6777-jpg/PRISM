import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Sun, TreeDeciduous, Activity, Bird, Music, Moon } from 'lucide-react';
import { CrystalOrbIcon } from '@/components/icons/CrystalOrbIcon';
import { WarpPhase, OmniWarpTarget } from '@/lib/omniWarp/types';
import { calculateWarpMetrics, forceToAiTemperature, RADIAL_WARP_APPS } from '@/lib/omniWarp/forceSensor';
import { serializeCurrentView, synthesizeWarpTarget, executeBigBangCommit, getOrbRunicSigil, isDisallowedWarpDestination } from '@/lib/omniWarp/omniWarpEngine';
import { getLowestRankedWormholeApp } from '@/lib/omniWarp/wormholeSpectrum';
import { getTossRule } from '@/lib/prismTossRegistry';
import { omniWarpAudio } from '@/lib/omniWarp/omniWarpAudio';
import { triggerHaptic, startBlackHoleContinuousHaptic, stopBlackHoleContinuousHaptic } from '@/lib/omniWarp/omniWarpHaptics';
import { BigBangCircularMeter } from './BigBangCircularMeter';

// 프리즘 메인(HubHome) 화면과 100% 일치하는 7대 앱 공식 Lucide 아이콘 매핑
const RADIAL_MAIN_ICONS: Record<string, React.ComponentType<{ className?: string; size?: number; style?: React.CSSProperties }>> = {
  hub: Sun,
  orange: TreeDeciduous,
  trinity: Sparkles,
  heal: Activity,
  bluebird: Bird,
  muse: Music,
  epilogue: Moon,
};

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
  const [dragDistance, setDragDistance] = useState(0);
  const [dragAngleDeg, setDragAngleDeg] = useState(0);
  const [radialSectorIndex, setRadialSectorIndex] = useState<number>(-1);
  const [idleCycleProgress, setIdleCycleProgress] = useState(0);

  const lastSectorRef = useRef<number>(-1);

  // Active view context and next destination pre-vision (수정구슬 영시)
  const currentContext = serializeCurrentView(location);
  const normPath = location.replace('/', '') || 'hub';
  const tossRule = getTossRule(normPath, `${currentContext.summary} ${currentContext.primarySubject || ''}`);
  
  // profile, handbook, library, omniwarp 4대 페이지는 워프 이동 대상에서 엄격 배제
  const sanitizeDest = (dest: any) => {
    if (isDisallowedWarpDestination(dest.id) || isDisallowedWarpDestination(dest.path)) {
      return {
        id: 'hub',
        name: '프롤로그 허브',
        subName: '프리즘 우주의 중심',
        path: '/',
        icon: '🌌',
        description: '모든 차원의 영감과 가능성이 수렴하는 우주의 시초 허브',
        themeColor: '#00f0ff',
      };
    }
    return dest;
  };

  const nextDest = sanitizeDest(tossRule.primary);
  const secondaryDest = sanitizeDest(tossRule.secondary);
  const tertiaryDest = sanitizeDest(tossRule.tertiary);
  const blackholeApp = getLowestRankedWormholeApp(location);

  // 오브 사이트의 신성한 고대 룬 표식 (Elder Runic Sigils)
  const nextRune = getOrbRunicSigil(nextDest.id);
  const secondaryRune = getOrbRunicSigil(secondaryDest.id);
  const tertiaryRune = getOrbRunicSigil(tertiaryDest.id);
  const blackholeRune = {
    symbol: blackholeApp.runeSymbol,
    name: blackholeApp.runeName,
    meaning: blackholeApp.runeMeaning,
  };

  // 🎯 도약 목적지가 루시 채팅 또는 크리스탈 오브인지 실시간 판별
  const targetDestPath = (currentTarget?.destinationPath || (
    activePhase === 'blackhole' ? blackholeApp.path :
    activePhase === 'event_horizon' ? secondaryDest.path :
    nextDest.path
  )).toLowerCase();

  const targetDestId = (currentTarget?.id || (
    activePhase === 'blackhole' ? blackholeApp.id :
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
    setDragDistance(metrics.dragDistance || 0);
    setDragAngleDeg(metrics.dragAngleDeg || 0);

    const sectorIdx = metrics.radialSectorIndex !== undefined ? metrics.radialSectorIndex : -1;
    setRadialSectorIndex(sectorIdx);

    // 🎯 방사형 조이스틱 각 앱 섹터 진입 시 기계식 마그네틱 틱 햅틱 진동
    if (sectorIdx !== -1 && sectorIdx !== lastSectorRef.current && !metrics.isAborted) {
      lastSectorRef.current = sectorIdx;
      triggerHaptic('whitehole');
    } else if (sectorIdx === -1) {
      lastSectorRef.current = -1;
    }

    // 🧲 마그네틱 래칫 햅틱 (기존 단계 전이 햅틱)
    const currentStage = target.stageIndex || 1;
    if (sectorIdx === -1 && currentStage !== lastStageRef.current && !metrics.isAborted) {
      lastStageRef.current = currentStage;
      triggerHaptic('whitehole');
    }

    // 🕳️ 압력의 세기가 최대치(블랙홀 단계: virtualForce >= 0.85)에 도달했을 때 무한 반복 미세 진동 피드백 (Continuous Gravity Rumble)
    if (metrics.virtualForce >= 0.85 && !metrics.isAborted && sectorIdx === -1) {
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
    lastPhaseRef.current = 'wormhole';
    hasTriggeredBlackHolePeakRef.current = false;
    setDragOffset({ x: 0, y: 0 });
    setDragDistance(0);
    setDragAngleDeg(0);
    setRadialSectorIndex(-1);
    lastSectorRef.current = -1;
    setIsPressing(true);
    setIsAborted(false);
    setActivePhase('wormhole');
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

    omniWarpAudio.playBlackHole();
    triggerHaptic('blackhole');

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
    lastSectorRef.current = -1;
    stopBlackHoleContinuousHaptic();
    setDragOffset({ x: 0, y: 0 });
    setDragDistance(0);
    setDragAngleDeg(0);
    setRadialSectorIndex(-1);

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

    if (isDisallowedWarpDestination(target.id || '') || isDisallowedWarpDestination(target.destinationPath || '')) {
      omniWarpAudio.playAbort();
      triggerHaptic('abort');
      setActivePhase('idle');
      setGauge(0);
      setDurationMs(0);
      return;
    }

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
    lastSectorRef.current = -1;
    setDragOffset({ x: 0, y: 0 });
    setDragDistance(0);
    setDragAngleDeg(0);
    setRadialSectorIndex(-1);
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
                animate={{ opacity: 0.5 + gauge * 0.5 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 pointer-events-none z-[330]"
              >
                {/* Full-screen Radiant Photon Flash (홀드할수록 극대화되는 순백의 태양광) */}
                <div
                  className="absolute inset-0 transition-opacity duration-75"
                  style={{
                    background: `radial-gradient(ellipse at bottom, rgba(255,255,255,${(0.7 + gauge * 0.3).toFixed(2)}) 0%, rgba(165,243,252,${(0.5 + gauge * 0.4).toFixed(2)}) 30%, rgba(56,189,248,${(0.3 + gauge * 0.4).toFixed(2)}) 60%, transparent 85%)`,
                  }}
                />

                {/* Blinding Center-Bottom Solar Light Flare */}
                <div
                  className="absolute inset-x-0 bottom-0 h-[65vh] transition-opacity duration-75"
                  style={{
                    background: `radial-gradient(ellipse at bottom, rgba(255,255,255,${(0.85 + gauge * 0.15).toFixed(2)}) 0%, rgba(224,242,254,${(0.65 + gauge * 0.3).toFixed(2)}) 25%, rgba(56,189,248,${(0.4 + gauge * 0.4).toFixed(2)}) 50%, transparent 80%)`,
                  }}
                />

                {/* Outward Radiating Solar Photon Rays from Center Bottom */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                  className="absolute bottom-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[900px] pointer-events-none bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.95)_15deg,transparent_30deg,rgba(56,189,248,0.9)_50deg,transparent_70deg,rgba(255,255,255,0.95)_90deg,transparent_110deg,rgba(56,189,248,0.9)_130deg,transparent_150deg,rgba(255,255,255,0.95)_170deg,transparent_190deg,rgba(56,189,248,0.9)_210deg,transparent_230deg,rgba(255,255,255,0.95)_250deg,transparent_270deg,rgba(56,189,248,0.9)_290deg,transparent_310deg,rgba(255,255,255,0.95)_330deg,transparent_350deg)] blur-sm"
                  style={{ opacity: 0.6 + gauge * 0.4 }}
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
                {/* Dimensional Wormhole Aurora Bridge (사건의 지평선 차원 전이 오로라 브릿지) */}
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
                animate={{ opacity: 0.85 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 pointer-events-none z-[330] bg-black/90 backdrop-blur-[6px]"
              >
                {/* Inward Gravitational Influx Distortion Vignette (탭 즉시 칠흑의 특이점 공간 형성) */}
                <div
                  className="absolute inset-0 transition-opacity duration-75"
                  style={{
                    background: `radial-gradient(circle at bottom, rgba(0,0,0,0.85) 60px, rgba(0,0,0,0.95) 220px, #000000 450px)`,
                  }}
                />

                {/* Accretion Disk Darkness Vortex */}
                <motion.div
                  animate={{ scale: [1.2, 0.7, 1.2], opacity: [0.7, 1, 0.7] }}
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
        className="fixed left-1/2 -translate-x-1/2 z-[350] pointer-events-none flex items-center justify-center select-none bottom-safe-fab"
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
                  {/* 1. 궤도 바깥쪽 눈부신 빛비춤 효과 (홀드 / 화이트홀: 방사형 빛살 & 오로라 코로나 림) */}
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    animate={{
                      rotate: 360,
                      scale: [1, 1.06 + gauge * 0.14, 1],
                    }}
                    transition={{
                      rotate: { duration: 16, repeat: Infinity, ease: 'linear' },
                      scale: { duration: 0.75, repeat: Infinity, ease: 'easeInOut' },
                    }}
                    style={{
                      opacity: activePhase === 'whitehole' ? Math.min(1, 0.4 + gauge * 0.6) : 0,
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

                  {/* 2. 궤도 바깥쪽 칠흑의 어두운 효과 (탭 / 블랙홀: 심연의 중력 수축 링 & 암흑 비네팅) */}
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
                      opacity: activePhase === 'blackhole' ? 0.95 : 0,
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

            {/* White Hole Photon Explosion Aura (홀드할수록 눈부신 빛의 폭발) */}
            {activePhase === 'whitehole' && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{
                  scale: [1, 1 + gauge * 0.45, 1],
                  opacity: [0.7 + gauge * 0.3, 1, 0.7 + gauge * 0.3],
                }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -inset-6 rounded-full pointer-events-none"
                style={{
                  background: `radial-gradient(circle, rgba(255,255,255,${(0.85 + gauge * 0.15).toFixed(2)}) 0%, rgba(103,232,249,${(0.6 + gauge * 0.35).toFixed(2)}) 45%, transparent 75%)`,
                  filter: `blur(${Math.round(6 + gauge * 14)}px)`,
                }}
              />
            )}

            {/* Black Hole Gravitational Suction Collapse Rings (탭/초기 어둠의 수축) */}
            {activePhase === 'blackhole' && (
              <>
                <motion.div
                  animate={{ scale: [1.8, 0.3], opacity: [0, 0.75, 0] }}
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
                    boxShadow: `inset 0 0 30px #000000, 0 0 25px #000000`,
                  }}
                />
              </>
            )}

            {/* 🎯 7대 앱 방사형 조이스틱 HUD (버튼 누르고 있을 때 전개) */}
            <AnimatePresence>
              {isPressing && (
                <>
                  {/* 1) 88px 유효 조작 반경 경계 링 (원주 밖으로 나가면 취소) */}
                  <motion.div
                    key="radial-boundary-ring"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{
                      scale: 1,
                      opacity: 1,
                      borderColor: isAborted
                        ? 'rgba(239, 68, 68, 0.85)'
                        : radialSectorIndex >= 0
                        ? RADIAL_WARP_APPS[radialSectorIndex]?.themeColor || 'rgba(56, 189, 248, 0.6)'
                        : 'rgba(56, 189, 248, 0.35)',
                      boxShadow: isAborted
                        ? '0 0 25px rgba(239, 68, 68, 0.5), inset 0 0 20px rgba(239, 68, 68, 0.25)'
                        : radialSectorIndex >= 0
                        ? `0 0 22px ${RADIAL_WARP_APPS[radialSectorIndex]?.accentGlow}, inset 0 0 14px ${RADIAL_WARP_APPS[radialSectorIndex]?.accentGlow}`
                        : '0 0 14px rgba(56, 189, 248, 0.15)',
                    }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[176px] h-[176px] rounded-full border-2 border-dashed pointer-events-none z-25"
                  />

                  {/* 2) 7대 앱 궤도 노드 (12시 상단부터 시계 방향 배치: 프롤로그, 오렌지, 트리니티, 아우라, 블루버드, 뮤즈, 에필로그) */}
                  {RADIAL_WARP_APPS.map((app, idx) => {
                    const sectorAngle = 360 / RADIAL_WARP_APPS.length;
                    const angleDeg = idx * sectorAngle;
                    const angleRad = (angleDeg * Math.PI) / 180;
                    // 12시 방향이 0도: x = R * sin, y = -R * cos (반지름 72px)
                    const nodeX = 72 * Math.sin(angleRad);
                    const nodeY = -72 * Math.cos(angleRad);
                    const isSelected = radialSectorIndex === idx && !isAborted;
                    const MainIcon = RADIAL_MAIN_ICONS[app.id] || Sun;

                    return (
                      <motion.div
                        key={app.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                          scale: isSelected ? 1.4 : 0.95,
                          opacity: isAborted ? 0.25 : isSelected ? 1 : 0.8,
                          x: nodeX,
                          y: nodeY,
                        }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 flex items-center justify-center select-none"
                      >
                        {/* 노드 원형 뱃지 (하단 설명 텍스트 제거 및 프리즘 메인 아이콘 적용) */}
                        <div
                          className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 border ${
                            isSelected
                              ? 'border-white ring-2 ring-white/70 font-bold scale-110'
                              : 'border-white/30 bg-black/85 text-white/85'
                          }`}
                          style={{
                            background: isSelected
                              ? `radial-gradient(circle, ${app.themeColor} 0%, #030308 100%)`
                              : 'rgba(5, 6, 15, 0.88)',
                            boxShadow: isSelected
                              ? `0 0 20px ${app.accentGlow}, inset 0 0 8px rgba(255,255,255,0.7)`
                              : '0 0 6px rgba(0, 0, 0, 0.7)',
                          }}
                        >
                          <MainIcon
                            size={isSelected ? 18 : 14}
                            style={{
                              color: isSelected ? '#ffffff' : app.themeColor,
                              filter: isSelected ? 'drop-shadow(0 0 4px #ffffff)' : undefined,
                            }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </>
              )}
            </AnimatePresence>

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
                x: isPressing
                  ? isAborted
                    ? (dragDistance > 0 ? (dragOffset.x * Math.min(dragDistance * 0.7, 44)) / dragDistance : 0)
                    : (dragDistance > 0 ? (dragOffset.x * Math.min(dragDistance * 0.65, 38)) / dragDistance : 0)
                  : 0,
                y: isPressing
                  ? isAborted
                    ? (dragDistance > 0 ? (dragOffset.y * Math.min(dragDistance * 0.7, 44)) / dragDistance : 0)
                    : (dragDistance > 0 ? (dragOffset.y * Math.min(dragDistance * 0.65, 38)) / dragDistance : 0)
                  : 0,
              }}
              transition={{
                duration: activePhase === 'whitehole' && gauge >= 0.82 && radialSectorIndex === -1 ? 0.08 : 0.12,
                repeat: activePhase === 'whitehole' && gauge >= 0.82 && radialSectorIndex === -1 ? Infinity : 0,
              }}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center shrink-0 cursor-pointer outline-none relative overflow-hidden transition-all duration-300 border ${
                isPressing && isAborted
                  ? 'opacity-70 border-red-500/80 shadow-[0_0_25px_rgba(239,68,68,0.7)]'
                  : radialSectorIndex >= 0
                  ? 'scale-110 border-white shadow-[0_0_30px_rgba(255,255,255,0.8)]'
                  : activePhase === 'whitehole'
                  ? 'scale-115 border-white shadow-[0_0_35px_#ffffff]'
                  : activePhase === 'event_horizon'
                  ? 'scale-110 border-purple-400'
                  : activePhase === 'blackhole'
                  ? 'scale-105 border-zinc-800 shadow-[0_0_25px_rgba(0,0,0,0.95)]'
                  : 'border-cyan-400/40 hover:border-cyan-300/80 shadow-[0_0_24px_rgba(56,189,248,0.35),0_0_40px_rgba(168,85,247,0.2)]'
              }`}
              style={{
                background: !isPressing
                  ? 'radial-gradient(circle at 35% 30%, #15162c 0%, #0d0e1d 45%, #05060f 80%, #020207 100%)'
                  : '#04030a',
                boxShadow: (isPressing && isAborted)
                  ? 'inset 0 0 20px rgba(239, 68, 68, 0.5), 0 0 25px rgba(239, 68, 68, 0.6)'
                  : radialSectorIndex >= 0
                  ? `inset 0 0 22px ${RADIAL_WARP_APPS[radialSectorIndex].themeColor}, 0 0 35px ${RADIAL_WARP_APPS[radialSectorIndex].accentGlow}`
                  : !isPressing
                  ? 'inset 0 0 22px rgba(56, 189, 248, 0.28), inset 0 0 12px rgba(192, 132, 252, 0.25), inset -6px -6px 18px rgba(0, 0, 0, 0.95), 0 0 35px rgba(56, 189, 248, 0.35)'
                  : activePhase === 'whitehole'
                  ? `inset 0 0 ${Math.round(20 + gauge * 25)}px rgba(255, 255, 255, ${(0.8 + gauge * 0.2).toFixed(2)}), 0 0 ${Math.round(30 + gauge * 45)}px rgba(255, 255, 255, ${(0.8 + gauge * 0.2).toFixed(2)}), 0 0 ${Math.round(45 + gauge * 60)}px rgba(56, 189, 248, ${(0.7 + gauge * 0.3).toFixed(2)})`
                  : activePhase === 'event_horizon'
                  ? 'inset 0 0 20px rgba(168, 85, 247, 0.5), inset -5px -5px 15px rgba(0, 0, 0, 0.8), 0 0 30px rgba(168, 85, 247, 0.6), 0 0 45px rgba(0, 240, 255, 0.4)'
                  : `inset 0 0 25px #000000, inset -8px -8px 20px #000000, 0 0 25px rgba(0, 0, 0, 0.95)`,
              }}
              aria-label={`빅뱅 차원 도약 · 탭: 블랙홀(${tertiaryDest.name}), 홀드: 화이트홀(${nextDest.name}), 이동: 사건의 지평선`}
            >
              {/* 🌀 Rotating Wormhole Accretion Vortex Disk (홀드할수록 눈부신 백색광, 탭 시 칠흑의 어둠) */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: isPressing ? (activePhase === 'whitehole' ? 0.6 : 2.0) : 8,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="absolute inset-0 rounded-full pointer-events-none z-10 transition-opacity duration-75"
                style={{
                  opacity: isPressing ? (activePhase === 'blackhole' ? 0.25 : 0.85) : 0.65,
                  background:
                    activePhase === 'blackhole'
                      ? 'conic-gradient(from 0deg, rgba(20,10,5,0.8) 0deg, rgba(0,0,0,1) 180deg, rgba(20,10,5,0.8) 360deg)'
                      : activePhase === 'whitehole'
                      ? 'conic-gradient(from 0deg, rgba(255,255,255,0.95) 0deg, rgba(56,189,248,0.85) 90deg, rgba(168,85,247,0.7) 180deg, rgba(255,255,255,0.95) 360deg)'
                      : 'conic-gradient(from 0deg, rgba(168,85,247,0.85) 0deg, rgba(15,17,36,0.95) 90deg, rgba(192,132,252,0.7) 180deg, rgba(168,85,247,0.85) 360deg)',
                  filter: `blur(1.5px)`,
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

              {/* Event Horizon Deep Singularity Core (Harmonized Dark Space Lens with Dual Light/Dark Rune Aura) */}
              <div
                className="absolute inset-2 sm:inset-2.5 rounded-full z-15 pointer-events-none transition-all duration-300 overflow-hidden flex items-center justify-center"
                style={{
                  background: 'radial-gradient(circle at 45% 35%, #0f1124 0%, #080916 55%, #030309 100%)',
                  boxShadow: 'inset 0 0 16px rgba(0, 0, 0, 0.95), inset 0 0 8px rgba(56, 189, 248, 0.2)',
                }}
              >
                {/* 🌌 빛과 어둠 교차에 맞춰 배경에 안착하는 고대 룬 인장 워터마크 */}
                {isPressing && (
                  <motion.span
                    key={`bg-rune-${
                      activePhase === 'whitehole'
                        ? (radialSectorIndex >= 0 ? RADIAL_WARP_APPS[radialSectorIndex].runeSymbol : nextRune.symbol)
                        : activePhase === 'blackhole'
                        ? (currentTarget?.runeSymbol || blackholeRune.symbol)
                        : activePhase === 'event_horizon'
                        ? (radialSectorIndex >= 0 ? RADIAL_WARP_APPS[radialSectorIndex].runeSymbol : secondaryRune.symbol)
                        : (currentTarget?.runeSymbol || nextRune.symbol)
                    }`}
                    initial={{ opacity: 0, scale: 0.75 }}
                    animate={{ opacity: activePhase === 'whitehole' ? 0.32 : 0.22, scale: [1, 1.15, 1] }}
                    transition={{ duration: 0.3 }}
                    className="absolute font-serif font-black text-3xl sm:text-[34px] leading-none select-none pointer-events-none"
                    style={{
                      color:
                        activePhase === 'whitehole'
                          ? '#ffffff'
                          : activePhase === 'event_horizon'
                          ? (radialSectorIndex >= 0 ? RADIAL_WARP_APPS[radialSectorIndex].themeColor : '#c084fc')
                          : '#a855f7',
                      filter:
                        activePhase === 'whitehole'
                          ? 'drop-shadow(0 0 10px rgba(255,255,255,0.8)) drop-shadow(0 0 18px rgba(56,189,248,0.6))'
                          : activePhase === 'event_horizon'
                          ? 'drop-shadow(0 0 10px rgba(192,132,252,0.8)) drop-shadow(0 0 18px rgba(168,85,247,0.6))'
                          : 'drop-shadow(0 0 10px rgba(168,85,247,0.8)) drop-shadow(0 0 18px rgba(147,51,234,0.6))',
                    }}
                  >
                    {activePhase === 'whitehole'
                      ? (radialSectorIndex >= 0 ? RADIAL_WARP_APPS[radialSectorIndex].runeSymbol : nextRune.symbol)
                      : activePhase === 'blackhole'
                      ? (currentTarget?.runeSymbol || blackholeRune.symbol)
                      : activePhase === 'event_horizon'
                      ? (radialSectorIndex >= 0 ? RADIAL_WARP_APPS[radialSectorIndex].runeSymbol : secondaryRune.symbol)
                      : (currentTarget?.runeSymbol || nextRune.symbol)}
                  </motion.span>
                )}
              </div>

              {/* 🎯 Big Bang Center: 대기 시 은은한 싱귤래리티 코어, 조준/도약 시 아이콘 또는 룬 표출 */}
              <div className="relative z-20 w-full h-full rounded-full flex items-center justify-center text-center select-none pointer-events-none">
                {isPressing && isAborted ? (
                  <div className="flex items-center justify-center">
                    <span className="text-2xl font-bold leading-none text-red-400 animate-pulse">
                      🛑
                    </span>
                  </div>
                ) : isPressing ? (
                  <motion.div
                    key={`active-target-${radialSectorIndex >= 0 ? RADIAL_WARP_APPS[radialSectorIndex].id : isTargetLucy ? 'lucy' : isTargetOrb ? 'orb' : (currentTarget?.runeSymbol || nextRune.symbol)}`}
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
                        background: radialSectorIndex >= 0
                          ? `radial-gradient(circle, ${RADIAL_WARP_APPS[radialSectorIndex].themeColor} 0%, rgba(0,0,0,0.8) 60%, transparent 95%)`
                          : activePhase === 'blackhole'
                          ? 'radial-gradient(circle, rgba(251,113,133,0.85) 0%, rgba(0,0,0,0.95) 50%, rgba(251,113,133,0.4) 80%, transparent 95%)'
                          : activePhase === 'whitehole'
                          ? 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(56,189,248,0.8) 45%, rgba(0,0,0,0.6) 75%, transparent 90%)'
                          : 'radial-gradient(circle, rgba(192,132,252,0.9) 0%, rgba(0,0,0,0.7) 45%, rgba(168,85,247,0.6) 75%, transparent 90%)',
                      }}
                    />

                    {/* 🔮 도약 대상별 입력: 방사형 조이스틱 앱 조준 시 해당 앱 메인 Lucide 아이콘 표출 */}
                    {radialSectorIndex >= 0 ? (
                      (() => {
                        const targetId = currentTarget?.id || RADIAL_WARP_APPS[radialSectorIndex].id;
                        const CenterIcon = RADIAL_MAIN_ICONS[targetId] || Sun;
                        const isLight = activePhase === 'whitehole';
                        return (
                          <div className="relative z-10 flex flex-col items-center justify-center animate-pulse">
                            <CenterIcon
                              size={26}
                              style={{
                                color: isLight ? '#ffffff' : (currentTarget?.themeColor || '#c084fc'),
                                filter: isLight
                                  ? `drop-shadow(0 0 10px #ffffff) drop-shadow(0 0 18px ${RADIAL_WARP_APPS[radialSectorIndex].accentGlow})`
                                  : `drop-shadow(0 0 10px rgba(192,132,252,0.9)) drop-shadow(0 0 20px rgba(168,85,247,0.85))`,
                              }}
                            />
                            <span
                              className="text-[8px] font-black tracking-tight mt-0.5"
                              style={{ color: isLight ? '#ffffff' : (currentTarget?.themeColor || '#c084fc') }}
                            >
                              {currentTarget?.title || RADIAL_WARP_APPS[radialSectorIndex].name}
                            </span>
                          </div>
                        );
                      })()
                    ) : isTargetLucy ? (
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
                        {currentTarget?.runeSymbol || (activePhase === 'blackhole' ? blackholeRune.symbol : activePhase === 'event_horizon' ? secondaryRune.symbol : nextRune.symbol)}
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

            {/* 🛡️ 방사형 워프 가이드 및 취소 안내 배너 */}
            <AnimatePresence>
              {isPressing && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap z-35 select-none"
                >
                  {isAborted ? (
                    <span className="flex items-center gap-1 text-[9px] font-black tracking-tight px-3 py-1 rounded-full bg-red-950/95 border border-red-500 text-red-200 shadow-[0_0_16px_rgba(239,68,68,0.9)] animate-pulse">
                      🛑 범위 밖 감지 · 도약 취소 (손을 떼면 원위치)
                    </span>
                  ) : radialSectorIndex >= 0 ? (
                    <span
                      className="flex items-center gap-1.5 text-[9px] font-black tracking-tight px-3 py-1 rounded-full border backdrop-blur-md shadow-[0_0_14px_rgba(0,0,0,0.9)] animate-pulse"
                      style={{
                        backgroundColor: activePhase === 'whitehole' ? 'rgba(255,255,255,0.95)' : 'rgba(20,5,35,0.95)',
                        borderColor: activePhase === 'whitehole' ? '#ffffff' : (currentTarget?.themeColor || '#a855f7'),
                        color: activePhase === 'whitehole' ? '#020617' : (currentTarget?.themeColor || '#e9d5ff'),
                        boxShadow: activePhase === 'whitehole' ? '0 0 16px #ffffff' : '0 0 16px rgba(168,85,247,0.85)',
                      }}
                    >
                      {(() => {
                        const targetId = currentTarget?.id || RADIAL_WARP_APPS[radialSectorIndex].id;
                        const BannerIcon = RADIAL_MAIN_ICONS[targetId] || Sun;
                        return <BannerIcon size={13} />;
                      })()}
                      <span>
                        {activePhase === 'whitehole'
                          ? `☀️ [사건의 지평선: 화이트홀] ${currentTarget?.title || RADIAL_WARP_APPS[radialSectorIndex].name} (손을 떼면 도약) · 어둠(블랙홀) 교차 대기`
                          : `🕳️ [사건의 지평선: 블랙홀] ${currentTarget?.title || '대척점'} (뒤에서 1순위 반전) · 빛(화이트홀) 교차 대기`}
                      </span>
                    </span>
                  ) : activePhase === 'whitehole' ? (
                    <span className="flex items-center gap-1.5 text-[8px] sm:text-[9px] font-black tracking-tight px-2.5 py-0.5 rounded-full bg-white/95 border border-cyan-300 text-slate-950 backdrop-blur-md shadow-[0_0_15px_#ffffff] animate-pulse">
                      ☀️ [빛: 화이트홀 방출] {nextDest.name} (추천 1순위) · 어둠(블랙홀) 교차 대기
                    </span>
                  ) : activePhase === 'blackhole' && radialSectorIndex === -1 ? (
                    <span className="flex items-center gap-1.5 text-[8px] sm:text-[9px] font-black tracking-tight px-2.5 py-0.5 rounded-full bg-purple-950/95 border border-purple-400 text-purple-100 backdrop-blur-md shadow-[0_0_15px_rgba(168,85,247,0.9)] animate-pulse">
                      🕳️ [어둠: 블랙홀 전이] {currentTarget?.title || blackholeApp.name} (뒤에서 1순위 반전) · 빛(화이트홀) 교차 대기
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[8px] sm:text-[9px] font-semibold tracking-tight px-2.5 py-0.5 rounded-full bg-black/90 border border-cyan-400/50 text-cyan-200 backdrop-blur-md shadow-[0_0_10px_rgba(0,0,0,0.9)] animate-pulse">
                      🌀 [탭: 웜홀 임의 도약] 🌀 {currentTarget?.title || '미지의 차원'} · 홀드 시 빛과 어둠 교차
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}
