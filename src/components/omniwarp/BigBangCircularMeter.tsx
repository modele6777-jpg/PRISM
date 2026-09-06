import React, { useId } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Compass } from 'lucide-react';
import { WarpPhase } from '@/lib/omniWarp/types';

interface BigBangCircularMeterProps {
  /** 사용자가 누르고 있는지 여부 */
  isPressing: boolean;
  /** 실시간 가상 압력 (0.0 ~ 1.0) */
  gauge: number;
  /** 누르고 있는 시간 (ms) */
  durationMs: number;
  /** 현재 감지된 워프 위상 */
  activePhase: WarpPhase;
  /** 취소(어보트) 대기 상태 */
  isAborted: boolean;
  /** 무한 반복 대기 사이클 타이밍 값 (0.0 ~ 1.0) */
  idleCycleProgress: number;
}

/**
 * 360도 원형 궤도 게이지 (Circular 360° Meter & Fishing/Dice Game Preview)
 * - 12시 방향 (0° / Top): 화이트홀 (순수한 빛, 백색광·시안 광자 방출)
 * - 시계 방향 진행 ➔ 6시 방향 (180° / Bottom): 블랙홀 (칠흑의 어둠, 강착원반 특이점)
 * - 6시 ➔ 12시 방향으로 다시 상승: 빛으로의 귀환 및 재탄생 (화이트홀 복귀)
 * - 낚시 게임 / 주사위 굴리기 게임 스타일의 무한 루프 타이밍 인디케이터 탑재
 */
export function BigBangCircularMeter({
  isPressing,
  gauge,
  durationMs,
  activePhase,
  isAborted,
  idleCycleProgress,
}: BigBangCircularMeterProps) {
  const gradientId = useId();
  const filterId = useId();

  // 링 크기 및 파라미터 (버튼 64px을 여유롭게 감싸는 지름 86px)
  const size = 88;
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth * 2) / 2; // ~40.5px
  const circumference = 2 * Math.PI * radius;

  // 💡 핵심 메커니즘: 가볍게 누를수록(낮은 압력) 빛이 눈부시게 나고, 세게 누를수록(높은 압력) 어두워짐!
  // - lightFactor: gauge가 0에 가까울수록 1.0 (최대 광도/화이트홀), gauge가 1에 가까울수록 0.12 (빛 꺼짐)
  // - darknessFactor: gauge가 1에 가까울수록 1.0 (칠흑의 블랙홀/심연), gauge가 0에 가까울수록 0.05
  const lightFactor = isPressing
    ? Math.max(0.12, 1.0 - gauge * 0.88)
    : 0.55 + Math.sin(idleCycleProgress * Math.PI * 2) * 0.2;

  const darknessFactor = isPressing
    ? Math.min(1.0, Math.max(0.05, gauge * 1.05))
    : 0.15;

  // 가볍게 누를수록 섬세하고 팽창하는 빛줄기, 세게 누를수록 빛이 수축하며 압축되는 어둠의 링
  const dynamicStrokeWidth = isPressing
    ? strokeWidth + (1 - gauge) * 2.5
    : strokeWidth;

  // 가볍게 누를수록 빛의 블룸이 웅장하게 번지고, 세게 누를수록 빛이 소멸되어 블러가 수축
  const blurDeviation = isPressing ? (1.5 + (1 - gauge) * 5.0).toFixed(1) : '2.5';

  // 실시간 진행도 (누르고 있을 때는 gauge, 누르지 않을 때는 무한 반복 타이밍 프로그레스)
  const effectiveProgress = isPressing ? Math.min(1, Math.max(0.02, gauge)) : idleCycleProgress;

  // 12시 방향(-90deg)에서 시작하여 시계 방향으로 차오름
  const strokeDashoffset = circumference - effectiveProgress * circumference;

  // 인디케이터 바늘 각도 (12시: 0도 -> 3시: 90도 -> 6시: 180도 -> 90도 -> 360도)
  const markerAngle = effectiveProgress * 360; // 0 ~ 360도
  const markerRad = ((markerAngle - 90) * Math.PI) / 180; // 12시 방향 기준 좌표 변환
  const markerX = size / 2 + radius * Math.cos(markerRad);
  const markerY = size / 2 + radius * Math.sin(markerRad);

  // 현재 위치에 따른 색상 및 테마 감지
  // 0% ~ 25%: 화이트홀(빛) -> 25% ~ 75%: 웜홀/블랙홀(어둠) -> 75% ~ 100%: 빛으로 복귀
  const isNearWhiteHole = markerAngle < 45 || markerAngle > 315;
  const isNearBlackHole = markerAngle >= 135 && markerAngle <= 225;

  // 가볍게 누를수록 빛의 번짐 섀도우가 커지고, 세게 누르면 어둠의 비네팅이 덮임
  const glowSpread = Math.round(8 + (1 - gauge) * 26);
  const voidSpread = Math.round(6 + gauge * 28);

  return (
    <div className="absolute -inset-3 sm:-inset-3.5 pointer-events-none z-20 flex items-center justify-center">
      {/* 🌟 1. 가볍게 누를수록 눈부시게 빛나는 화이트홀 광자 방출 오라 (Light Touch Flash) */}
      {isPressing && (
        <motion.div
          animate={{
            scale: [1, 1 + (1 - gauge) * 0.35, 1],
            opacity: [lightFactor * 0.8, lightFactor, lightFactor * 0.8],
          }}
          transition={{ duration: 0.6 + gauge * 0.8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute rounded-full pointer-events-none transition-all duration-75"
          style={{
            width: size + 20,
            height: size + 20,
            background: `radial-gradient(circle, rgba(255,255,255,${(lightFactor * 0.95).toFixed(2)}) 0%, rgba(56,189,248,${(lightFactor * 0.75).toFixed(2)}) 35%, rgba(168,85,247,${(lightFactor * 0.4).toFixed(2)}) 60%, transparent 75%)`,
            filter: `blur(${Math.round(4 + (1 - gauge) * 12)}px)`,
          }}
        />
      )}

      {/* 🕳️ 2. 세게 누를수록 칠흑의 어둠으로 빛을 삼키는 블랙홀 심연 오라 (Heavy Press Void Sink) */}
      {isPressing && gauge > 0.3 && (
        <motion.div
          animate={{
            scale: [1.2, 0.85, 1.2],
            opacity: [darknessFactor * 0.75, darknessFactor, darknessFactor * 0.75],
          }}
          transition={{ duration: Math.max(0.4, 1.2 - gauge * 0.6), repeat: Infinity, ease: 'easeInOut' }}
          className="absolute rounded-full pointer-events-none transition-all duration-75"
          style={{
            width: size + 16,
            height: size + 16,
            background: `radial-gradient(circle, rgba(0,0,0,${darknessFactor.toFixed(2)}) 40%, rgba(15,10,25,${(darknessFactor * 0.9).toFixed(2)}) 70%, transparent 95%)`,
            boxShadow: `inset 0 0 ${voidSpread}px #000000, 0 0 ${voidSpread}px rgba(0,0,0,${darknessFactor.toFixed(2)})`,
          }}
        />
      )}

      {/* 360도 회전 원형 SVG 트랙 */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
        style={{ transform: 'rotate(-90deg)' }} // 12시 방향이 0% 시작점이 되도록 회전
      >
        <defs>
          {/* 빛 ➔ 어둠 ➔ 빛 360도 코닉 그라데이션 시뮬레이션 */}
          <linearGradient id={`${gradientId}-top-to-bottom`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={lightFactor} />
            <stop offset="30%" stopColor="#38bdf8" stopOpacity={lightFactor * 0.9} />
            <stop offset="50%" stopColor="#a855f7" stopOpacity={0.4 + lightFactor * 0.4} />
            <stop offset="70%" stopColor="#f59e0b" stopOpacity={darknessFactor * 0.8} />
            <stop offset="100%" stopColor="#000000" stopOpacity={darknessFactor} />
          </linearGradient>

          {/* 12시(빛) -> 6시(어둠) 하강 그라데이션 */}
          <linearGradient id={`${gradientId}-top-half`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={lightFactor} />
            <stop offset="35%" stopColor="#38bdf8" stopOpacity={lightFactor * 0.85} />
            <stop offset="70%" stopColor="#a855f7" stopOpacity={0.3 + lightFactor * 0.4} />
            <stop offset="100%" stopColor="#000000" stopOpacity={darknessFactor} />
          </linearGradient>

          {/* 6시(어둠) -> 12시(빛) 상승 귀환 그라데이션 */}
          <linearGradient id={`${gradientId}-bottom-half`} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#000000" stopOpacity={darknessFactor} />
            <stop offset="25%" stopColor="#f59e0b" stopOpacity={darknessFactor * 0.7} />
            <stop offset="65%" stopColor="#67e8f9" stopOpacity={lightFactor * 0.8} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity={lightFactor} />
          </linearGradient>

          {/* 블룸 글로우 필터 (가볍게 누를수록 빛이 넓게 번짐) */}
          <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation={blurDeviation} result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. 은은한 배경 트랙 링 (Backdrop Guide Ring) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.14)"
          strokeWidth={strokeWidth - 1}
          strokeDasharray="2 3"
          opacity={0.3 + lightFactor * 0.4}
        />

        {/* 1-2. 360도 코닉 궤적 빛/어둠 안내 호 (Clockwise Light -> Dark -> Light Base) */}
        {/* 상단 반원 (12시 빛 -> 3시 웜홀 -> 6시 어둠) */}
        <path
          d={`M ${size / 2} ${size / 2 - radius} A ${radius} ${radius} 0 0 1 ${size / 2} ${size / 2 + radius}`}
          fill="none"
          stroke={`url(#${gradientId}-top-half)`}
          strokeWidth={dynamicStrokeWidth - 1.5}
          opacity={0.4 + lightFactor * 0.5}
        />
        {/* 하단 반원 (6시 어둠 -> 9시 귀환 -> 12시 빛) */}
        <path
          d={`M ${size / 2} ${size / 2 + radius} A ${radius} ${radius} 0 0 1 ${size / 2} ${size / 2 - radius}`}
          fill="none"
          stroke={`url(#${gradientId}-bottom-half)`}
          strokeWidth={dynamicStrokeWidth - 1.5}
          opacity={0.4 + lightFactor * 0.5}
        />

        {/* 2. 12시(빛) ➔ 6시(어둠) ➔ 12시(빛) 그라데이션 채움 링 (가벼울수록 눈부신 빛, 세게 누르면 어두워짐) */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={
            isAborted
              ? '#ef4444'
              : isPressing
              ? activePhase === 'whitehole'
                ? '#ffffff'
                : activePhase === 'event_horizon'
                ? '#c084fc'
                : '#18181b'
              : 'url(#' + `${gradientId}-top-to-bottom` + ')'
          }
          strokeWidth={dynamicStrokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          filter={`url(#${filterId})`}
          className="transition-all duration-75"
          style={{
            filter: isPressing
              ? activePhase === 'whitehole'
                ? `drop-shadow(0 0 ${Math.round(8 + (1 - gauge) * 18)}px rgba(255,255,255,${lightFactor})) drop-shadow(0 0 ${Math.round(15 + (1 - gauge) * 25)}px rgba(56,189,248,${lightFactor}))`
                : activePhase === 'event_horizon'
                ? `drop-shadow(0 0 ${Math.round(6 + (1 - gauge) * 12)}px rgba(192,132,252,${lightFactor * 0.8}))`
                : `drop-shadow(0 0 8px rgba(0,0,0,${darknessFactor})) drop-shadow(0 0 2px rgba(245,158,11,${0.3 * (1 - gauge)}))`
              : undefined,
          }}
        />

        {/* 3. 12시 방향 마커 (화이트홀 빛의 특이점 - 앵커: 가볍게 누를수록 눈부시게 폭발) */}
        <circle
          cx={size / 2 + radius * Math.cos(-Math.PI / 2)}
          cy={size / 2 + radius * Math.sin(-Math.PI / 2)}
          r={isPressing ? 2.5 + (1 - gauge) * 1.5 : 2.8}
          fill="#ffffff"
          className="animate-pulse"
          filter={`url(#${filterId})`}
          style={{
            opacity: lightFactor,
          }}
        />

        {/* 4. 6시 방향 마커 (블랙홀 어둠의 특이점 - 앵커: 세게 누를수록 칠흑으로 팽창) */}
        <circle
          cx={size / 2 + radius * Math.cos(Math.PI / 2)}
          cy={size / 2 + radius * Math.sin(Math.PI / 2)}
          r={isPressing ? 2.8 + gauge * 2.2 : 3}
          fill="#000000"
          stroke={gauge > 0.6 ? '#ef4444' : '#f59e0b'}
          strokeWidth={1.4}
          filter={`url(#${filterId})`}
          style={{
            opacity: darknessFactor,
          }}
        />
      </svg>

      {/* 5. 낚시 게임 / 주사위 굴리기 게임 스타일의 실시간 타이밍 마커 바늘 (Timing Needle) */}
      <motion.div
        className="absolute w-3.5 h-3.5 -ml-[7px] -mt-[7px] pointer-events-none flex items-center justify-center"
        style={{
          left: markerX,
          top: markerY,
        }}
        animate={{
          scale: isPressing
            ? (isNearBlackHole ? [1 + gauge * 0.4, 1.3 + gauge * 0.5, 1 + gauge * 0.4] : [1.1 + (1 - gauge) * 0.5, 1.4 + (1 - gauge) * 0.6, 1.1 + (1 - gauge) * 0.5])
            : 1,
        }}
        transition={{ duration: 0.35, repeat: Infinity }}
      >
        {/* 마커 빛/어둠 발광체: 가벼운 터치 = 눈부신 백색광 채움, 세게 누름 = 칠흑의 블랙홀 핵 */}
        <div
          className={`rounded-full border transition-all duration-100 ${
            isAborted
              ? 'w-2.5 h-2.5 bg-red-500 border-white'
              : isNearBlackHole
              ? 'w-3.5 h-3.5 bg-black border-amber-500/80 shadow-[inset_0_0_4px_#000000]'
              : isNearWhiteHole
              ? 'w-3 h-3 bg-white border-cyan-200'
              : 'w-2.5 h-2.5 bg-purple-300 border-white'
          }`}
          style={{
            boxShadow: isAborted
              ? '0 0 12px #ef4444'
              : isNearBlackHole
              ? `0 0 ${voidSpread}px #000000, 0 0 ${Math.round(voidSpread * 1.5)}px rgba(0,0,0,1)`
              : isNearWhiteHole
              ? `0 0 ${glowSpread + 8}px rgba(255,255,255,${lightFactor}), 0 0 ${Math.round((glowSpread + 8) * 1.6)}px rgba(56,189,248,${lightFactor}), inset 0 0 4px #ffffff`
              : `0 0 ${glowSpread}px rgba(168,85,247,${lightFactor})`,
            opacity: isPressing ? (isNearBlackHole ? darknessFactor : lightFactor) : 0.85,
          }}
        />

        {/* 바늘 궤적 뒤통수 광자 꼬리 (Fishing Bobber / Comet Tail: 가벼울수록 눈부신 꼬리) */}
        <div
          className="absolute -inset-1.5 rounded-full pointer-events-none animate-ping"
          style={{
            backgroundColor: isNearBlackHole ? '#f59e0b' : isNearWhiteHole ? '#ffffff' : '#c084fc',
            opacity: 0.2 + lightFactor * 0.7,
          }}
        />
      </motion.div>

      {/* 6. 12시 맨 위 [화이트홀: 빛] 아이콘 뱃지 (가볍게 누를수록 최대 광도) */}
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none select-none z-25">
        <span
          className="flex items-center gap-0.5 text-[7.5px] font-black tracking-tight px-1 py-0.2 rounded-full border backdrop-blur-sm whitespace-nowrap transition-all duration-150"
          style={{
            background: isNearWhiteHole && isPressing ? `rgba(8, 47, 73, ${lightFactor})` : 'rgba(2, 6, 23, 0.8)',
            borderColor: isNearWhiteHole && isPressing ? `rgba(103, 232, 249, ${lightFactor})` : 'rgba(56, 189, 248, 0.4)',
            color: isNearWhiteHole && isPressing ? '#ffffff' : '#a5f3fc',
            boxShadow: isNearWhiteHole && isPressing ? `0 0 ${Math.round(8 + (1 - gauge) * 16)}px rgba(255,255,255,${lightFactor})` : '0 0 8px rgba(56,189,248,0.6)',
          }}
        >
          <Sparkles size={8} className="text-white animate-spin" /> 빛
        </span>
      </div>

      {/* 7. 6시 맨 아래 [블랙홀: 어둠] 아이콘 뱃지 (세게 누를수록 칠흑 농도 심화) */}
      <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none select-none z-25">
        <span
          className="flex items-center gap-0.5 text-[7.5px] font-black tracking-tight px-1 py-0.2 rounded-full border backdrop-blur-sm whitespace-nowrap transition-all duration-150"
          style={{
            background: isNearBlackHole && isPressing ? `rgba(0, 0, 0, ${darknessFactor})` : 'rgba(0, 0, 0, 0.9)',
            borderColor: isNearBlackHole && isPressing ? `rgba(239, 68, 68, ${darknessFactor})` : 'rgba(245, 158, 11, 0.5)',
            color: isNearBlackHole && isPressing ? '#fca5a5' : '#fcd34d',
            boxShadow: isNearBlackHole && isPressing ? `0 0 ${Math.round(8 + gauge * 18)}px rgba(0,0,0,1)` : '0 0 8px rgba(0,0,0,0.6)',
          }}
        >
          <Compass size={8} className="text-amber-400 animate-spin" /> 어둠
        </span>
      </div>
    </div>
  );
}
