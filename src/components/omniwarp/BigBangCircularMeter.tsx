import React, { useId } from 'react';
import { motion } from 'motion/react';
import { WarpPhase } from '@/lib/omniWarp/types';

interface BigBangCircularMeterProps {
  /** 사용자가 누르고 있는지 여부 */
  isPressing: boolean;
  /** 마우스 호버 여부 */
  isHovered?: boolean;
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
 * 🔮 빅뱅 아케인 마법진 매트릭스 (BigBang Arcane Magic Circle)
 * - 버튼 중심 아이콘을 코어로 삼는 신비롭고 정교한 마법진 룬 서클 시스템
 * - 외곽 반시계 회전 룬 서클 (Outer Counter-Rotating Arcane Rune Ring)
 * - 내부 시계 회전 신성기하학 트라이포스 헥사그램 마법진 (Inner Sacred Geometry Core)
 * - 4대 룬 보석 노드 (시안, 에메랄드, 골드, 라벤더)
 * - 실시간 워프 사이클 아크 에너지 및 마우스 호버 시 부드러운 가속·팽창 인터랙션
 */
export function BigBangCircularMeter({
  isPressing,
  isHovered = false,
  gauge,
  durationMs,
  activePhase,
  isAborted,
  idleCycleProgress,
}: BigBangCircularMeterProps) {
  // 터치(누르는 중) 시에는 버튼 본체의 화이트홀/블랙홀 분출에 집중
  if (isPressing) return null;

  const gradientId = useId();
  const filterId = useId();

  // 버튼(56px) 외곽을 자연스럽고 고급스럽게 감싸는 최적의 마법진 직경 (104px)
  const size = 104;
  const center = size / 2; // 52px

  // 타이밍 동적 아크 (r=42)
  const rArc = 42;
  const circumferenceArc = 2 * Math.PI * rArc;
  const strokeDashoffsetArc = circumferenceArc - idleCycleProgress * circumferenceArc;

  return (
    <div
      className="relative flex items-center justify-center pointer-events-none select-none shrink-0 transition-transform duration-500"
      style={{
        width: size,
        height: size,
        transform: isHovered ? 'scale(1.18)' : 'scale(1)',
      }}
    >
      {/* 🌟 1. 마법진 앰비언트 글로우 오라 (Arcane Aura & Mana Mist) */}
      <div
        className="absolute inset-2 rounded-full pointer-events-none blur-md transition-opacity duration-500"
        style={{
          background: isHovered
            ? 'radial-gradient(circle, rgba(56,189,248,0.28) 0%, rgba(168,85,247,0.3) 45%, rgba(251,191,36,0.15) 70%, transparent 80%)'
            : 'radial-gradient(circle, rgba(56,189,248,0.18) 0%, rgba(168,85,247,0.18) 45%, transparent 75%)',
          opacity: isHovered ? 0.95 : 0.7,
        }}
      />

      {/* 🌟 2. 8방위 신비로운 빛살 (8-Fold Arcane Light Flares) */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: isHovered ? 20 : 40, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ opacity: isHovered ? 0.65 : 0.35 }}
      >
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <div
            key={`arcane-flare-${deg}`}
            className="absolute w-0.5 h-full pointer-events-none"
            style={{
              transform: `rotate(${deg}deg)`,
              background:
                'linear-gradient(180deg, transparent 5%, rgba(56,189,248,0.5) 20%, transparent 45%, transparent 55%, rgba(168,85,247,0.5) 80%, transparent 95%)',
            }}
          />
        ))}
      </motion.div>

      {/* 🌟 3. 정밀 아케인 SVG 벡터 마법진 시스템 */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 overflow-visible"
      >
        <defs>
          {/* 마법진 에너지 그라데이션 */}
          <linearGradient id={`${gradientId}-magic-gradient`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.95} />
            <stop offset="25%" stopColor="#00f0ff" stopOpacity={0.9} />
            <stop offset="60%" stopColor="#c084fc" stopOpacity={0.85} />
            <stop offset="85%" stopColor="#fbbf24" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#00f0ff" stopOpacity={0.95} />
          </linearGradient>

          {/* 블룸 글로우 필터 */}
          <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ─── 베이스 궤도 가이드 링 (불변 림) ─── */}
        <circle
          cx={center}
          cy={center}
          r={46}
          fill="none"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth={0.8}
        />
        <circle
          cx={center}
          cy={center}
          r={38}
          fill="none"
          stroke="rgba(0, 240, 255, 0.2)"
          strokeWidth={0.6}
        />

        {/* ─── 실시간 타이밍 오로라 아크 진행선 (12시 기준 회전) ─── */}
        <g style={{ transform: 'rotate(-90deg)', transformOrigin: `${center}px ${center}px` }}>
          <circle
            cx={center}
            cy={center}
            r={rArc}
            fill="none"
            stroke={`url(#${gradientId}-magic-gradient)`}
            strokeWidth={isHovered ? 2.2 : 1.6}
            strokeDasharray={circumferenceArc}
            strokeDashoffset={strokeDashoffsetArc}
            strokeLinecap="round"
            filter={`url(#${filterId})`}
            style={{
              transition: 'stroke-dashoffset 0.08s linear',
              filter: isAborted
                ? 'drop-shadow(0 0 6px #ef4444)'
                : 'drop-shadow(0 0 8px rgba(0,240,255,0.8)) drop-shadow(0 0 12px rgba(192,132,252,0.6))',
            }}
          />
        </g>
      </svg>

      {/* 🌟 4. 외곽 반시계 회전 룬 서클 (Outer Counter-Rotating Arcane Rune Ring) */}
      <motion.svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 text-cyan-400/60 pointer-events-none"
        animate={{ rotate: -360 }}
        transition={{ duration: isHovered ? 14 : 26, repeat: Infinity, ease: 'linear' }}
      >
        {/* 외곽 룬 트랙 링 */}
        <circle
          cx={center}
          cy={center}
          r={48}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.8}
          strokeDasharray="2 4"
          className="opacity-70"
        />
        <circle
          cx={center}
          cy={center}
          r={50}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.5}
          strokeDasharray="8 6 2 6"
          className="opacity-50"
        />

        {/* 12방위 룬 인덱스 눈금 */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const x1 = center + 44 * Math.cos(angle);
          const y1 = center + 44 * Math.sin(angle);
          const x2 = center + 48 * Math.cos(angle);
          const y2 = center + 48 * Math.sin(angle);
          return (
            <line
              key={`rune-line-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeWidth={0.9}
              className="opacity-60"
            />
          );
        })}

        {/* 4 Mystic Compass Rune Nodes (시안 & 퍼플 룬 보석) */}
        <circle cx={center} cy={4} r={2} fill="#38bdf8" style={{ filter: 'drop-shadow(0 0 4px #38bdf8)' }} />
        <circle cx={center} cy={size - 4} r={2} fill="#c084fc" style={{ filter: 'drop-shadow(0 0 4px #c084fc)' }} />
        <circle cx={4} cy={center} r={2} fill="#38bdf8" style={{ filter: 'drop-shadow(0 0 4px #38bdf8)' }} />
        <circle cx={size - 4} cy={center} r={2} fill="#c084fc" style={{ filter: 'drop-shadow(0 0 4px #c084fc)' }} />
      </motion.svg>

      {/* 🌟 5. 내부 시계 회전 신성기하학 마법진 코어 (Inner Clockwise Sacred Geometry Core) */}
      <motion.svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 text-purple-400/60 pointer-events-none"
        animate={{ rotate: 360 }}
        transition={{ duration: isHovered ? 10 : 20, repeat: Infinity, ease: 'linear' }}
      >
        {/* 내부 마법진 링 */}
        <circle
          cx={center}
          cy={center}
          r={35}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.6}
          strokeDasharray="4 6"
          className="opacity-75"
        />

        {/* 신성기하학 교차 삼각성 (Tri-Force Sacred Seal) */}
        <polygon
          points={`${center},17 ${center + 26},61 ${center - 26},61`}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.6}
          strokeDasharray="2 3"
          className="opacity-45"
        />
        <polygon
          points={`${center},87 ${center - 26},43 ${center + 26},43`}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={0.6}
          strokeDasharray="2 3"
          className="opacity-45"
        />

        {/* 6개 정점 보조 에너지 포인트 */}
        <circle cx={center} cy={17} r={1.2} fill="#ffffff" />
        <circle cx={center} cy={87} r={1.2} fill="#fbbf24" />
        <circle cx={center + 26} cy={43} r={1.2} fill="#38bdf8" />
        <circle cx={center - 26} cy={43} r={1.2} fill="#c084fc" />
        <circle cx={center + 26} cy={61} r={1.2} fill="#c084fc" />
        <circle cx={center - 26} cy={61} r={1.2} fill="#38bdf8" />
      </motion.svg>
    </div>
  );
}
