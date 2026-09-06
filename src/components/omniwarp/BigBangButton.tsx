/**
 * ============================================================================
 * [OmniWarp Unified Core Engine & Interface v2.0]
 * 빅뱅 버튼(OmniWarp): 다감각 햅틱·방사형 조이스틱·맥락 직렬화 통합 엔진
 * 
 * 1. 물리 센서 & 3단계 위상 전이 (Whitehole / Event Horizon / Blackhole)
 * 2. 360° 7대 앱 방사형 조이스틱 각도 판별 (12시 기준 시계방향 균등 분할)
 * 3. 위상별 동적 AI 프롬프트 합성 및 1ms 스마트 핸드오프
 * 4. 21채널 딥링크 라우팅 (?phase=...&force=...)
 * 5. 60fps 렌더링 부하 최적화 (useRef 기반 좌표 추적)
 * ============================================================================
 */

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Sun,
  TreeDeciduous,
  Activity,
  Bird,
  Music,
  Moon,
  Compass,
  Shield,
  HeartPulse,
  KeyRound,
  Waves,
  Leaf,
  Timer,
  Mail,
  User,
  BookOpen
} from 'lucide-react';
import { sendPrismToss } from '@/lib/prismToss';
import { CrystalOrbIcon } from '@/components/icons/CrystalOrbIcon';

// ----------------------------------------------------------------------------
// [Part 1. 타입 정의 및 360° 3단 동심 궤도(21개 노드) 7대 앱 맵]
// ----------------------------------------------------------------------------
export type WarpPhase = 'idle' | 'whitehole' | 'event_horizon' | 'blackhole' | 'aborted';

export interface AppFeatureMenu {
  tier: 1 | 2 | 3;
  label: string;
  subLabel: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export interface RadialWarpApp {
  id: string;
  name: string;
  path: string;
  themeColor: string;
  accentGlow: string;
  emoji: string;
  runeSymbol: string; // 3층 외행성 전용 오브 룬문자 (Fehu, Sowilo, Pertho, Algiz, Berkana, Wunjo, Ansuz)
  runeName: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  features: [AppFeatureMenu, AppFeatureMenu, AppFeatureMenu]; // [1층 메뉴1, 2층 메뉴2, 3층 메뉴3]
}

/**
 * 🪐 360° 3단 태양계 동심 궤도 7대 앱 맵
 * - 7대 앱: 12시 상단(0°)부터 시계방향으로 균등 분할 (360° / 7 ≈ 51.43°)
 * - 1층 (내행성 궤도: r=58px): 각 앱의 첫 번째 기능
 * - 2층 (중행성 궤도: r=98px): 각 앱의 두 번째 기능
 * - 3층 (외행성 궤도: r=138px): 각 앱의 세 번째 기능 - 오브의 7대 룬문자 표기
 */
export const RADIAL_WARP_APPS: RadialWarpApp[] = [
  // 1. 프롤로그 (12시: 0°) - Fehu (새로운 시작과 운명의 창조)
  {
    id: 'hub',
    name: '프롤로그',
    path: '/',
    themeColor: '#38bdf8',
    accentGlow: 'rgba(56,189,248,0.7)',
    emoji: '☀️',
    runeSymbol: 'ᚠ',
    runeName: 'Fehu',
    icon: Sun,
    features: [
      { tier: 1, label: 'Universe', subLabel: '우주 탐색', path: '/?section=universe', icon: Compass },
      { tier: 2, label: 'AEGIS', subLabel: '이지스 시너지', path: '/synergy', icon: Shield },
      { tier: 3, label: 'eCPR', subLabel: '응급 회복', path: '/ecpr', icon: HeartPulse },
    ],
  },
  // 2. 오렌지 (~51.4°) - Sowilo (태양과 내면의 빛)
  {
    id: 'orange',
    name: '오렌지',
    path: '/orange',
    themeColor: '#f97316',
    accentGlow: 'rgba(249,115,22,0.7)',
    emoji: '🍊',
    runeSymbol: 'ᛋ',
    runeName: 'Sowilo',
    icon: TreeDeciduous,
    features: [
      { tier: 1, label: 'Secret', subLabel: '시크릿 성찰', path: '/orange?mode=secret', icon: KeyRound },
      { tier: 2, label: 'CATALYST', subLabel: '카탈리스트', path: '/orange?mode=synergy', icon: Sparkles },
      { tier: 3, label: 'WELL', subLabel: '소원의 우물', path: '/orange?mode=wishingWell', icon: Waves },
    ],
  },
  // 3. 트리니티 (~102.9°) - Pertho (운명과 심층 무의식의 비밀)
  {
    id: 'trinity',
    name: '트리니티',
    path: '/trinity',
    themeColor: '#a855f7',
    accentGlow: 'rgba(168,85,247,0.7)',
    emoji: '🔺',
    runeSymbol: 'ᛈ',
    runeName: 'Pertho',
    icon: Sparkles,
    features: [
      { tier: 1, label: 'Lucky', subLabel: '사주 운세', path: '/trinity?mode=daily', icon: Sun },
      { tier: 2, label: 'ORACLE', subLabel: '오라클 리딩', path: '/trinity?mode=oracle', icon: Sparkles },
      { tier: 3, label: 'TAROT', subLabel: '타로 카드', path: '/trinity?mode=tarot', icon: Sparkles },
    ],
  },
  // 4. 아우라 (~154.3°) - Algiz (보호와 내면의 치유)
  {
    id: 'heal',
    name: '아우라',
    path: '/heal',
    themeColor: '#10b981',
    accentGlow: 'rgba(16,185,129,0.7)',
    emoji: '🌿',
    runeSymbol: 'ᛉ',
    runeName: 'Algiz',
    icon: Activity,
    features: [
      { tier: 1, label: 'Letting Go', subLabel: '방하착 명상', path: '/heal?mode=meditation', icon: Leaf },
      { tier: 2, label: 'SANCTUARY', subLabel: '생츄어리', path: '/heal?mode=synergy', icon: Sparkles },
      { tier: 3, label: '1-MIN', subLabel: '1분 호흡', path: '/heal?mode=oneMinute', icon: Timer },
    ],
  },
  // 5. 블루버드 (~205.7°) - Berkana (영혼을 감싸는 안식처)
  {
    id: 'bluebird',
    name: '블루버드',
    path: '/bluebird',
    themeColor: '#0ea5e9',
    accentGlow: 'rgba(14,165,233,0.7)',
    emoji: '🕊️',
    runeSymbol: 'ᛒ',
    runeName: 'Berkana',
    icon: Bird,
    features: [
      { tier: 1, label: "Ho'oponopono", subLabel: '정화', path: '/bluebird?mode=daily', icon: Bird },
      { tier: 2, label: 'TRANSMUTATION', subLabel: '정화 성소', path: '/bluebird?mode=synergy', icon: Sparkles },
      { tier: 3, label: 'LETTER', subLabel: '비밀 쪽지', path: '/bluebird?mode=secretMessage', icon: Mail },
    ],
  },
  // 6. 뮤즈 (~257.1°) - Wunjo (예술적 희열과 하모니)
  {
    id: 'muse',
    name: '뮤즈',
    path: '/muse',
    themeColor: '#ec4899',
    accentGlow: 'rgba(236,72,153,0.7)',
    emoji: '🎵',
    runeSymbol: 'ᚹ',
    runeName: 'Wunjo',
    icon: Music,
    features: [
      { tier: 1, label: 'Art', subLabel: '예술 처방', path: '/muse?mode=artRecommendation', icon: Music },
      { tier: 2, label: 'MASTERCLASS', subLabel: '마스터클래스', path: '/muse?mode=synergy', icon: Sparkles },
      { tier: 3, label: 'MATE', subLabel: '롤모델 메이트', path: '/muse?mode=roleModel', icon: User },
    ],
  },
  // 7. 에필로그 (~308.6°) - Ansuz (신성한 지혜와 영감의 기록)
  {
    id: 'epilogue',
    name: '에필로그',
    path: '/epilogue',
    themeColor: '#f59e0b',
    accentGlow: 'rgba(245,158,11,0.7)',
    emoji: '🌙',
    runeSymbol: 'ᚨ',
    runeName: 'Ansuz',
    icon: Moon,
    features: [
      { tier: 1, label: 'Diary', subLabel: '다이어리 서재', path: '/epilogue?mode=diary', icon: BookOpen },
      { tier: 2, label: 'CHRONICLE', subLabel: '크로니클 연대기', path: '/epilogue?mode=synergy', icon: Sparkles },
      { tier: 3, label: 'Profile', subLabel: '프로필 결산', path: '/epilogue?mode=profile', icon: User },
    ],
  },
];

export interface WarpMetrics {
  durationMs: number;
  virtualForce: number; // 0.08 ~ 1.0 (가상 물리력)
  phase: WarpPhase;
  dragDistance: number;
  dragAngleDeg: number;
  radialSectorIndex: number; // 0 ~ 6 또는 -1 (중립)
  selectedTier: 1 | 2 | 3;   // 1층, 2층, 3층
  isAborted: boolean;        // 165px 초과 이탈 시 취소
}

// ----------------------------------------------------------------------------
// [Part 2. 물리 센싱 & 360° 3단 동심 궤도 판별 알고리즘]
// ----------------------------------------------------------------------------
export function calculateWarpMetrics(
  startTime: number,
  now: number,
  startX: number,
  startY: number,
  currX: number,
  currY: number,
  hwPressure: number = 0
): WarpMetrics {
  const durationMs = Math.max(0, now - startTime);
  const deltaX = currX - startX;
  const deltaY = currY - startY;
  const dist = Math.hypot(deltaX, deltaY);

  // 1) 12시 방향을 0°로 환산한 시계방향 각도 (0° ~ 360°)
  let dragAngleDeg = (Math.atan2(deltaY, deltaX) * 180 / Math.PI) + 90;
  if (dragAngleDeg < 0) dragAngleDeg += 360;

  // 2) 7개 섹터 균등 분할 (~51.43° 단위, 12시 기준 시계방향 순서)
  const sectorSize = 360 / RADIAL_WARP_APPS.length;
  const normalizedDeg = (dragAngleDeg + sectorSize / 2) % 360;
  const sectorIndex = Math.floor(normalizedDeg / sectorSize);

  // 3) 거리 판정: <22px(중앙 중립), 22px~165px(3단 동심 궤도 조준), >165px(범위 이탈 취소)
  const isAborted = dist > 165;
  const radialSectorIndex = (dist >= 22 && !isAborted) ? sectorIndex : -1;

  // 4) 3단 동심 궤도 층 판별:
  // - 1층 (상단 메뉴 1: r=56px): dist < 76px
  // - 2층 (상단 메뉴 2: r=96px): 76px <= dist < 116px
  // - 3층 (상단 메뉴 3: r=138px): dist >= 116px
  let selectedTier: 1 | 2 | 3 = 1;
  if (dist >= 116) {
    selectedTier = 3;
  } else if (dist >= 76) {
    selectedTier = 2;
  } else {
    selectedTier = 1;
  }

  // 5) 호흡 주기(1.5s) 코사인 보간 가상 압력 계산 + 하드웨어 Force Touch 연동
  const cyclePeriod = 1500;
  const cycleProgress = (durationMs % cyclePeriod) / cyclePeriod;
  const oscillation = cycleProgress < 0.5 ? cycleProgress * 2 : (1 - cycleProgress) * 2;
  const smoothedFactor = (1 - Math.cos(oscillation * Math.PI)) / 2;
  let force = 0.08 + smoothedFactor * 0.92;
  if (hwPressure > 0.4) force = Math.max(force, hwPressure);
  const virtualForce = Math.min(1.0, Math.max(0.08, force));

  // 6) 가상 물리력 기반 3단계 위상 판정
  let phase: WarpPhase = 'whitehole';
  if (isAborted) {
    phase = 'aborted';
  } else if (virtualForce >= 0.80) {
    phase = 'blackhole';     // 심층 무의식 · 본질 통찰 (Temp: 0.9)
  } else if (virtualForce >= 0.30) {
    phase = 'event_horizon'; // 균형 분석 · 심리 상담 (Temp: 0.5)
  } else {
    phase = 'whitehole';     // 명료한 현실 해답 · 1순위 행동 (Temp: 0.2)
  }

  return { durationMs, virtualForce, phase, dragDistance: dist, dragAngleDeg, radialSectorIndex, selectedTier, isAborted };
}

// ----------------------------------------------------------------------------
// [Part 3. 1ms 인앱 뷰 직렬화 & 위상별 특화 프롬프트 합성]
// ----------------------------------------------------------------------------
export function serializeViewAndSynthesizePrompt(
  activePath: string,
  targetPath: string,
  phase: WarpPhase = 'whitehole'
): string {
  let orbData: any = null;
  try {
    const raw = localStorage.getItem('prism_orb_latest_scrying');
    if (raw) orbData = JSON.parse(raw);
  } catch (_) {}

  // 1. 공통 기본 컨텍스트 (직전 화면 관측 데이터)
  const contextSummary = orbData?.keyTheme
    ? `[이전 관측 데이터]
- 키워드/테마: ${orbData.keyTheme}
- 사용자의 질문: "${orbData.query || '자유 여정'}"
- 도출된 직관 해답: "${orbData.directAnswer || ''}"
- 액션 가이드: "${orbData.actionSolution || ''}"`
    : `[이전 관측 데이터 없음: 즉시 세션 시작] (경로: ${activePath} -> ${targetPath})`;

  // 2. 위상(Phase)별 특화 지침 주입
  let phaseInstruction = '';
  if (phase === 'whitehole') {
    phaseInstruction = `[응답 모드: 화이트홀 (Whitehole Mode)]
- 역할: 현실적이고 명료한 좌뇌형 어드바이저
- 온도(Temperature): 0.2 (결정론적이고 군더더기 없는 해답)
- 지침:
  1. 감상적인 수식어를 배제하고, 지금 당장 현실에서 실행할 수 있는 '1순위 핵심 솔루션' 1가지를 명확히 제시할 것.
  2. 분량은 3줄 이내로 직관적이고 또렷하게 작성할 것.
  3. "오늘 할 일" 위주의 구체적 액션 플랜을 도출할 것.`;
  } else if (phase === 'event_horizon') {
    phaseInstruction = `[응답 모드: 이벤트 호라이즌 (Event Horizon Mode)]
- 역할: 공감과 이성의 균형을 잡는 전문 심리 멘토
- 온도(Temperature): 0.5 (균형 잡힌 통찰과 공감)
- 지침:
  1. 질문자의 현실적 상황과 감정 상태를 5:5 비율로 분석할 것.
  2. 현재 상황의 장점과 주의할 점을 짚어주고, 단계적인 조언을 제시할 것.
  3. 차분하고 따뜻한 어조로 심리적 안정감을 제공할 것.`;
  } else if (phase === 'blackhole') {
    phaseInstruction = `[응답 모드: 블랙홀 (Blackhole Mode)]
- 역할: 무의식 심연의 비밀을 꿰뚫는 우뇌형 영적 오라클
- 온도(Temperature): 0.9 (시적이고 깊이 있는 직관적 통찰)
- 지침:
  1. 겉으로 드러난 질문 너머의 '숨겨진 무의식적 원인과 심리적 그늘(Shadow)'을 파헤칠 것.
  2. 신비롭고 은유적인 문체로 본질을 짚어내고, 근원적인 내면의 변화를 이끄는 영감을 줄 것.
  3. 표면적 해결책 대신, 영혼의 성장을 위한 깊은 메시지를 전할 것.`;
  }

  // 3. 최종 결합 프롬프트
  return `${contextSummary}

${phaseInstruction}

[요청 사항]
위의 [이전 관측 데이터]를 기반으로, 지정된 [응답 모드]의 규칙을 100% 준수하여 답변을 생성해 줘.`;
}

// ----------------------------------------------------------------------------
// [Part 3.5. 현재 채널 모드 감지기]
// ----------------------------------------------------------------------------
export function detectCurrentChannelMode(pathname: string = ''): {
  mode: string;
  channelName: string;
} {
  const path = (pathname || (typeof window !== 'undefined' ? window.location.pathname : '')).toLowerCase();

  if (path.includes('/orange')) {
    return { mode: 'orange', channelName: '오렌지 채널' };
  }
  if (path.includes('/trinity')) {
    return { mode: 'trinity', channelName: '트리니티 채널' };
  }
  if (path.includes('/heal') || path.includes('/aura')) {
    return { mode: 'aura', channelName: '아우라 채널' };
  }
  if (path.includes('/bluebird')) {
    return { mode: 'bluebird', channelName: '블루버드 채널' };
  }
  if (path.includes('/muse')) {
    return { mode: 'muse', channelName: '뮤즈 채널' };
  }
  if (path.includes('/epilogue')) {
    return { mode: 'master', channelName: '에필로그 (마스터)' };
  }
  if (path.includes('/orb') || path.includes('/gateway') || path.includes('/crystal')) {
    try {
      const orbMode = sessionStorage.getItem('prism_orb_active_mode');
      if (orbMode) {
        const modeLabels: Record<string, string> = {
          master: '오브 마스터 모드',
          casual: '오브 수다 모드',
          orange: '오브 오렌지',
          trinity: '오브 트리니티',
          aura: '오브 아우라',
          bluebird: '오브 블루버드',
          muse: '오브 뮤즈',
        };
        return { mode: orbMode, channelName: modeLabels[orbMode] || '오브 공명 모드' };
      }
    } catch (_) {}
    return { mode: 'casual', channelName: '크리스탈 오브' };
  }
  if (path.includes('/handbook') || path.includes('/rebible')) {
    return { mode: 'master', channelName: '리바이블 핸드북' };
  }

  // 기본 홈 (프롤로그 / 수다 모드)
  return { mode: 'casual', channelName: '프롤로그 수다 모드' };
}

// ----------------------------------------------------------------------------
// [Part 3.8. 루시 8-Point 골든 셀레스티얼 스타 아이콘 (탭 배경 점등)]
// ----------------------------------------------------------------------------
export function LucyCelestialStarIcon({ size = 28, className = '' }: { size?: number; className?: string }) {
  const gradId = React.useId().replace(/:/g, '_');
  const goldGradId = `lucy_star_gold_${gradId}`;
  const coreGradId = `lucy_star_core_${gradId}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
    >
      <defs>
        <linearGradient id={goldGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="25%" stopColor="#fef08a" />
          <stop offset="60%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <radialGradient id={coreGradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="40%" stopColor="#fef08a" stopOpacity="0.95" />
          <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* 4 Cardinal Rays */}
      <path
        d="M 256 60 C 256 185, 298 256, 452 256 C 298 256, 256 327, 256 452 C 256 327, 214 256, 60 256 C 214 256, 256 185, 256 60 Z"
        fill={`url(#${goldGradId})`}
      />
      {/* 4 Diagonal Rays */}
      <path
        d="M 256 135 C 256 215, 285 256, 377 256 C 285 256, 256 297, 256 377 C 256 297, 227 256, 135 256 C 227 256, 256 215, 256 135 Z"
        fill="#ffffff"
        opacity="0.9"
      />
      {/* Singularity Core */}
      <circle cx="256" cy="256" r="46" fill={`url(#${coreGradId})`} />
      <circle cx="256" cy="256" r="22" fill="#ffffff" />
      <circle cx="256" cy="256" r="10" fill="#fef08a" />
    </svg>
  );
}

// ----------------------------------------------------------------------------
// [Part 4. 통합 빅뱅 버튼 컴포넌트]
// ----------------------------------------------------------------------------
export function UnifiedBigBangButton() {
  const [isPressing, setIsPressing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [metrics, setMetrics] = useState<WarpMetrics>({
    durationMs: 0,
    virtualForce: 0.08,
    phase: 'idle',
    dragDistance: 0,
    dragAngleDeg: 0,
    radialSectorIndex: -1,
    selectedTier: 1,
    isAborted: false,
  });

  // 현재 브라우저 경로 반응형 추적 (SPA 라우팅 및 팝스테이트 동기화)
  const [currentPathname, setCurrentPathname] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  useEffect(() => {
    const updatePath = () => {
      if (typeof window !== 'undefined') {
        setCurrentPathname(window.location.pathname);
      }
    };
    window.addEventListener('popstate', updatePath);
    const handleNavigate = (e: any) => {
      if (e?.detail?.path) {
        setCurrentPathname(e.detail.path.split('?')[0]);
      }
    };
    window.addEventListener('prism-navigate', handleNavigate);
    return () => {
      window.removeEventListener('popstate', updatePath);
      window.removeEventListener('prism-navigate', handleNavigate);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const isCurrentlyInChat = 
    currentPathname === '/chat' || 
    currentPathname === '/lucy' || 
    currentPathname.endsWith('/chat.html');

  const isCurrentlyInOrb = 
    currentPathname === '/orb' || 
    currentPathname === '/gateway' || 
    currentPathname === '/crystal' || 
    currentPathname.includes('orb.html');

  const currentChannelInfo = detectCurrentChannelMode(currentPathname);

  // 60fps 렌더링 최적화를 위한 ref 관리
  const pointerStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const currentPosRef = useRef<{ x: number; y: number; pressure: number }>({ x: 0, y: 0, pressure: 0 });
  const lastPhaseRef = useRef<WarpPhase>('idle');
  const animFrameRef = useRef<number | null>(null);
  const hasTriggeredHoldHapticRef = useRef(false);

  // 🌌 [태양계 옴니워프 도약 및 크로스앱 핸드오프 공통 실행기]
  const executeWarpTransition = (
    targetApp: RadialWarpApp,
    feat: AppFeatureMenu,
    phase: WarpPhase = 'whitehole',
    virtualForce: number = 0.5
  ) => {
    const autoPrompt = serializeViewAndSynthesizePrompt(
      window.location.pathname,
      feat.path,
      phase
    );

    const separator = feat.path.includes('?') ? '&' : '?';
    const targetUrl = `${feat.path}${separator}phase=${phase}&force=${virtualForce.toFixed(2)}`;

    try {
      sendPrismToss({
        sourceApp: window.location.pathname.replace('/', '') || 'hub',
        targetApp: targetApp.id,
        actionType: `omniwarp_${phase}`,
        contextMessage: `[태양계 옴니워프 ${phase === 'whitehole' ? '화이트홀' : phase === 'event_horizon' ? '사건의 지평선' : '블랙홀'}] ${targetApp.runeSymbol} ${targetApp.name} · ${feat.label} (${feat.subLabel})`,
        autoTrigger: true,
        autoPrompt,
        tossedAt: Date.now(),
      });
    } catch (_) {}

    window.dispatchEvent(new CustomEvent('omniwarp-commit', {
      detail: { 
        targetApp, 
        activeFeature: feat,
        targetUrl,
        autoPrompt, 
        phase, 
        force: virtualForce 
      }
    }));
    window.dispatchEvent(new CustomEvent('prism:bigbang_commit', {
      detail: {
        phase,
        target: targetApp,
        activeFeature: feat,
        autoPrompt,
        force: virtualForce,
        metrics: { ...metrics, selectedTier: feat.tier },
        timestamp: Date.now(),
      }
    }));

    if (navigator.vibrate) navigator.vibrate([60, 30, 100]); // 빅뱅 폭발 햅틱

    setTimeout(() => {
      window.location.href = targetUrl;
    }, 240);
  };

  // [데스크톱 마우스 호버 인터랙션]
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (isPressing) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      setMetrics((prev) => ({
        ...prev,
        radialSectorIndex: -1,
        dragDistance: 0,
      }));
    }, 220);
  };

  const handleContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPressing) return; // 드래그 터치 중에는 pointerMove로 처리
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    const dist = Math.hypot(deltaX, deltaY);

    if (dist > 185) {
      handleMouseLeave();
      return;
    }

    // 12시 방향 기준 시계방향 각도 환산
    let dragAngleDeg = (Math.atan2(deltaY, deltaX) * 180 / Math.PI) + 90;
    if (dragAngleDeg < 0) dragAngleDeg += 360;

    const sectorSize = 360 / RADIAL_WARP_APPS.length;
    const normalizedDeg = (dragAngleDeg + sectorSize / 2) % 360;
    const sectorIndex = Math.floor(normalizedDeg / sectorSize);

    // 마우스 호버 시에는 1,2층 표시가 없으므로 3층(룬문자 궤도)을 바로 조준
    let selectedTier: 1 | 2 | 3 = 3;
    if (isPressing) {
      if (dist >= 116) {
        selectedTier = 3;
      } else if (dist >= 76) {
        selectedTier = 2;
      } else {
        selectedTier = 1;
      }
    }

    setMetrics((prev) => ({
      ...prev,
      dragDistance: dist,
      dragAngleDeg,
      radialSectorIndex: dist >= 26 ? sectorIndex : -1,
      selectedTier,
      isAborted: false,
      phase: prev.phase === 'idle' ? 'whitehole' : prev.phase,
    }));
  };

  // [Pointer Down] 인터랙션 시작 & 60fps 루프 가동
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const startTime = performance.now();
    pointerStartRef.current = { x: e.clientX, y: e.clientY, time: startTime };
    currentPosRef.current = { x: e.clientX, y: e.clientY, pressure: (e as any).pressure || 0 };
    lastPhaseRef.current = 'whitehole';
    hasTriggeredHoldHapticRef.current = false;
    setIsPressing(true);

    if (navigator.vibrate) navigator.vibrate([15]); // 시작 터치 햅틱

    const loop = () => {
      const now = performance.now();
      const m = calculateWarpMetrics(
        pointerStartRef.current.time,
        now,
        pointerStartRef.current.x,
        pointerStartRef.current.y,
        currentPosRef.current.x,
        currentPosRef.current.y,
        currentPosRef.current.pressure
      );

      // 제자리 홀드 기준(350ms) 도달 시 물리 햅틱 틱 피드백 트리거
      if (m.durationMs >= 350 && !hasTriggeredHoldHapticRef.current && m.radialSectorIndex === -1 && m.dragDistance < 22) {
        hasTriggeredHoldHapticRef.current = true;
        if (navigator.vibrate) navigator.vibrate([30]);
      }

      // 위상 변경 시 단계별 햅틱 피드백 트리거
      if (m.phase !== lastPhaseRef.current && !m.isAborted) {
        if (m.phase === 'event_horizon' && navigator.vibrate) navigator.vibrate([25]);
        if (m.phase === 'blackhole' && navigator.vibrate) navigator.vibrate([40, 30, 40]);
        lastPhaseRef.current = m.phase;
      }

      setMetrics(m);
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
  };

  // [Pointer Move] 실시간 좌표 갱신 (부하 최소화)
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPressing) return;
    currentPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      pressure: (e as any).pressure || 0
    };
  };

  // [Pointer Up] 조작 해제: 다이렉트 딥링크 라우팅 및 이벤트 디스패치
  const handlePointerUp = (_e: React.PointerEvent) => {
    if (!isPressing) return;
    setIsPressing(false);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const { durationMs, virtualForce, dragDistance, radialSectorIndex, isAborted, phase } = metrics;

    // 1) 안전 취소: 165px 초과 이탈 시 취소
    if (isAborted) {
      if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
      return;
    }

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    // 2) 제자리 조작 (섹터 미선택 & 중심 반경 < 22px): 탭(루시채팅) vs 홀드(크리스탈 오브)
    const isStationary = radialSectorIndex === -1 && dragDistance < 22;
    const isHold = isStationary && (durationMs >= 350 || virtualForce >= 0.35);
    const isTap = isStationary && !isHold;

    if (isHold) {
      // 🔮 [제자리 홀드] 크리스탈 오브 양방향 스마트 토글
      const inOrb =
        currentPath === '/orb' ||
        currentPath === '/gateway' ||
        currentPath === '/crystal' ||
        currentPath.includes('orb.html');

      if (inOrb) {
        // 🔙 [오브 닫기] 직전에 머물던 원래 채널로 즉시 복귀
        let returnUrl = '/';
        try {
          returnUrl = sessionStorage.getItem('prism_orb_return_path') || '/';
          sessionStorage.removeItem('prism_orb_return_path');
        } catch (_) {}

        if (navigator.vibrate) navigator.vibrate([25, 40]);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('prism-navigate', { detail: { path: returnUrl } }));
          setTimeout(() => {
            if (window.location.pathname.includes('orb')) {
              window.location.href = returnUrl;
            }
          }, 60);
        }
        return;
      } else {
        // 🔮 [오브 열기] 현재 채널 위치 기억 & 현재 채널의 모드로 오브 진입
        const currentFullPath = typeof window !== 'undefined'
          ? (window.location.pathname + window.location.search)
          : '/';
        try {
          sessionStorage.setItem('prism_orb_return_path', currentFullPath);
        } catch (_) {}

        const { mode: targetMode } = detectCurrentChannelMode(currentPath);
        try {
          sessionStorage.setItem('prism_orb_pending_channel', targetMode);
        } catch (_) {}

        if (navigator.vibrate) navigator.vibrate([35, 20, 55]);

        const orbUrl = `/orb?channel=${encodeURIComponent(targetMode)}`;

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('prism-navigate', { detail: { path: orbUrl } }));
          setTimeout(() => {
            if (!window.location.pathname.includes('orb')) {
              window.location.href = orbUrl;
            }
          }, 60);
        }
        return;
      }
    }

    if (isTap) {
      // 💬 [제자리 탭] 루시채팅 양방향 스마트 토글
      if (navigator.vibrate) navigator.vibrate([20]);

      const inChat =
        currentPath === '/chat' ||
        currentPath === '/lucy' ||
        currentPath.endsWith('/chat.html');

      if (inChat) {
        // 🔙 [루시채팅 닫기] 이전에 머물던 원래 채널로 즉각 복귀
        let returnUrl = '/';
        try {
          returnUrl = sessionStorage.getItem('lucy_chat_return_path') || '/';
          sessionStorage.removeItem('lucy_chat_return_path');
        } catch (_) {}

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('prism-navigate', { detail: { path: returnUrl } }));
          setTimeout(() => {
            if (window.location.pathname === '/chat' || window.location.pathname === '/lucy') {
              window.location.href = returnUrl;
            }
          }, 60);
        }
        return;
      } else {
        // 💬 [루시채팅 열기] 현재 채널 위치 기억 & 현재 채널의 모드로 루시채팅 진입
        const currentFullPath = typeof window !== 'undefined'
          ? (window.location.pathname + window.location.search)
          : '/';
        try {
          sessionStorage.setItem('lucy_chat_return_path', currentFullPath);
        } catch (_) {}

        const { mode: targetMode } = detectCurrentChannelMode(currentPath);
        try {
          sessionStorage.setItem('lucy_pro_pending_channel', targetMode);
        } catch (_) {}

        const chatUrl = `/chat?channel=${encodeURIComponent(targetMode)}`;

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('prism-navigate', { detail: { path: chatUrl } }));
          setTimeout(() => {
            if (window.location.pathname !== '/chat' && window.location.pathname !== '/lucy') {
              window.location.href = chatUrl;
            }
          }, 60);
        }
        return;
      }
    }

    // 3) 360° 태양계 3단 동심 궤도 방사형 도약
    const targetApp = radialSectorIndex >= 0
      ? RADIAL_WARP_APPS[radialSectorIndex]
      : RADIAL_WARP_APPS[0]; // 기본값: 프롤로그

    const tierIdx = (metrics.selectedTier ? metrics.selectedTier - 1 : 0);
    const activeFeature = targetApp.features[tierIdx] || targetApp.features[0];

    executeWarpTransition(targetApp, activeFeature, phase, virtualForce);
  };

  const isSolarSystemVisible = isPressing || isHovered;
  const selectedApp = metrics.radialSectorIndex >= 0 ? RADIAL_WARP_APPS[metrics.radialSectorIndex] : null;
  const activeFeature = selectedApp ? selectedApp.features[metrics.selectedTier - 1] : null;

  return (
    <>
      {/* 뷰포트 센터링 레이아웃: 모든 환경에서 정중앙 하단에 흔들림 없이 고정 */}
      <div className="fixed left-1/2 -translate-x-1/2 bottom-safe-fab z-[350] pointer-events-none flex items-center justify-center select-none">
        <div
          ref={containerRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseMove={handleContainerMouseMove}
          className="relative flex items-center justify-center pointer-events-auto"
        >
          {/* 호버 영역 인터랙션 히트박스 원형 영역 */}
          {isSolarSystemVisible && (
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[370px] h-[370px] rounded-full pointer-events-auto z-10"
              onMouseMove={handleContainerMouseMove}
            />
          )}

          {/* 🪐 7대 앱 3층 태양계 인터페이스 HUD */}
          <AnimatePresence>
            {isSolarSystemVisible && (
              <>
                {/* 360° 태양계 동심 궤도 가이드 라인 & 섹터 분할 & 태양 코로나 */}
                <motion.svg
                  initial={{ opacity: 0, scale: 0.82 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.82 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  viewBox="0 0 370 370"
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[370px] h-[370px] pointer-events-none z-10 overflow-visible"
                >
                  <defs>
                    {/* 태양계 성간 앰비언트 글로우 */}
                    <radialGradient id="solarCosmicGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.18" />
                      <stop offset="35%" stopColor="#ec4899" stopOpacity="0.09" />
                      <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.05" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                    </radialGradient>

                    {/* 태양(Sun) 코로나 방사형 플레어 그라디언트 */}
                    <radialGradient id="solarCoronaGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9" />
                      <stop offset="30%" stopColor="#f59e0b" stopOpacity="0.55" />
                      <stop offset="65%" stopColor="#ea580c" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* 성간 원형 배경 앰비언트 */}
                  <circle
                    cx="185"
                    cy="185"
                    r="158"
                    fill="url(#solarCosmicGlow)"
                    className="opacity-70"
                  />

                  {/* 중심 태양(Sun) 코로나 오라 펄스 링 */}
                  <circle
                    cx="185"
                    cy="185"
                    r="38"
                    fill="url(#solarCoronaGlow)"
                    className="animate-pulse opacity-85"
                  />

                  {/* 7대 앱 360도 섹터 분할 방사선 가이드 */}
                  {RADIAL_WARP_APPS.map((_, i) => {
                    const angleDeg = i * (360 / RADIAL_WARP_APPS.length) + (360 / (RADIAL_WARP_APPS.length * 2));
                    const rad = (angleDeg * Math.PI) / 180;
                    const sin = Math.sin(rad);
                    const cos = Math.cos(rad);
                    return (
                      <line
                        key={`sector-line-${i}`}
                        x1={185 + 32 * sin}
                        y1={185 - 32 * cos}
                        x2={185 + 154 * sin}
                        y2={185 - 154 * cos}
                        stroke="rgba(255, 255, 255, 0.08)"
                        strokeDasharray="2 3"
                        strokeWidth="1"
                      />
                    );
                  })}

                  {/* 1층 & 2층 동심 궤도: 마우스 호버 시에는 완전히 숨김 (표시 없음) */}
                  {(!isHovered || isPressing) && (
                    <>
                      {/* 1층 동심 궤도: 내행성 궤도 (r=58px, 각 앱의 첫 번째 기능) */}
                      <circle
                        cx="185"
                        cy="185"
                        r="58"
                        fill="none"
                        stroke={metrics.selectedTier === 1 && selectedApp ? selectedApp.themeColor : 'rgba(56, 189, 248, 0.45)'}
                        strokeDasharray={metrics.selectedTier === 1 && selectedApp ? 'none' : '3 3'}
                        strokeWidth={metrics.selectedTier === 1 && selectedApp ? '2.5' : '1.2'}
                        className="transition-colors duration-150"
                      />

                      {/* 2층 동심 궤도: 중행성 궤도 (r=98px, 각 앱의 두 번째 기능) */}
                      <circle
                        cx="185"
                        cy="185"
                        r="98"
                        fill="none"
                        stroke={metrics.selectedTier === 2 && selectedApp ? selectedApp.themeColor : 'rgba(168, 85, 247, 0.45)'}
                        strokeDasharray={metrics.selectedTier === 2 && selectedApp ? 'none' : '4 3'}
                        strokeWidth={metrics.selectedTier === 2 && selectedApp ? '2.5' : '1.2'}
                        className="transition-colors duration-150"
                      />
                    </>
                  )}

                  {/* 3층 동심 궤도: 외행성 오브 룬문자 궤도 (r=138px, 각 앱의 세 번째 기능) */}
                  <circle
                    cx="185"
                    cy="185"
                    r="138"
                    fill="none"
                    stroke={metrics.selectedTier === 3 && selectedApp ? selectedApp.themeColor : 'rgba(245, 158, 11, 0.55)'}
                    strokeDasharray={metrics.selectedTier === 3 && selectedApp ? 'none' : '4 4'}
                    strokeWidth={metrics.selectedTier === 3 && selectedApp ? '2.5' : '1.2'}
                    className="transition-colors duration-150"
                  />

                  {/* 조준된 앱 활성 레이저 빔 */}
                  {selectedApp && metrics.radialSectorIndex >= 0 && (
                    <line
                      x1="185"
                      y1="185"
                      x2={185 + 158 * Math.sin((metrics.radialSectorIndex * (360 / RADIAL_WARP_APPS.length) * Math.PI) / 180)}
                      y2={185 - 158 * Math.cos((metrics.radialSectorIndex * (360 / RADIAL_WARP_APPS.length) * Math.PI) / 180)}
                      stroke={selectedApp.themeColor}
                      strokeWidth="2"
                      strokeOpacity="0.75"
                    />
                  )}

                  {/* 유효 조작 한계선 초과 시 경고 레드 링 */}
                  {metrics.isAborted && (
                    <circle
                      cx="185"
                      cy="185"
                      r="165"
                      fill="none"
                      stroke="rgba(239, 68, 68, 0.9)"
                      strokeDasharray="6 4"
                      strokeWidth="2.5"
                    />
                  )}
                </motion.svg>

                {/* 3단 태양계 궤도 안내 라벨 뱃지 (좌상단 인디케이터) */}
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  className="absolute -left-[148px] top-[-152px] pointer-events-none flex flex-col items-start gap-1.5 z-20"
                >
                  {isHovered && !isPressing ? (
                    <span className="text-[8.5px] font-bold px-2.5 py-0.5 rounded-full border shadow-xs text-amber-300 bg-amber-950/80 border-amber-500/50 shadow-md ring-1 ring-amber-300/40">
                      오브 룬문자 궤도
                    </span>
                  ) : (
                    <>
                      <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full border shadow-xs transition-all ${
                        metrics.selectedTier === 3 && selectedApp
                          ? 'bg-amber-500 text-white border-white scale-105 shadow-md ring-1 ring-amber-300'
                          : 'text-amber-300 bg-amber-950/70 border-amber-500/40'
                      }`}>
                        3층 · 외행성 룬문자 궤도
                      </span>
                      <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full border shadow-xs transition-all ${
                        metrics.selectedTier === 2 && selectedApp
                          ? 'bg-purple-500 text-white border-white scale-105 shadow-md ring-1 ring-purple-300'
                          : 'text-purple-300 bg-purple-950/70 border-purple-500/40'
                      }`}>
                        2층 · 중행성 고리 궤도
                      </span>
                      <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full border shadow-xs transition-all ${
                        metrics.selectedTier === 1 && selectedApp
                          ? 'bg-cyan-500 text-white border-white scale-105 shadow-md ring-1 ring-cyan-300'
                          : 'text-cyan-300 bg-cyan-950/70 border-cyan-500/40'
                      }`}>
                        1층 · 내행성 비드 궤도
                      </span>
                    </>
                  )}
                </motion.div>

                {/* 🪐 7대 앱 360° 3층 태양계 노드 
                    - 마우스 호버 시: 1층, 2층은 아무런 표시도 하지 않음 (표시 없음)
                    - 3층: 오브의 7대 고대 룬문자(Elder Runic Sigil) 표출
                */}
                {RADIAL_WARP_APPS.map((app, appIdx) => {
                  const angleDeg = appIdx * (360 / RADIAL_WARP_APPS.length);
                  const angleRad = (angleDeg * Math.PI) / 180;
                  const sinA = Math.sin(angleRad);
                  const cosA = Math.cos(angleRad);
                  const isAppSector = metrics.radialSectorIndex === appIdx && !metrics.isAborted;

                  // 최외측 앱 라벨 위치 (r = 168px)
                  const appLabelX = 168 * sinA;
                  const appLabelY = -168 * cosA;

                  return (
                    <React.Fragment key={app.id}>
                      {/* 3단 동심 궤도별 기능 노드 */}
                      {app.features.map((feat, featIdx) => {
                        const tierNum = (featIdx + 1) as 1 | 2 | 3;

                        // 🛑 마우스 호버 시에는 1, 2층에 아무런 표시도 하지 않음 (사용자 요청)
                        if (isHovered && !isPressing && (tierNum === 1 || tierNum === 2)) {
                          return null;
                        }

                        const radius = tierNum === 1 ? 58 : tierNum === 2 ? 98 : 138;
                        const nodeX = radius * sinA;
                        const nodeY = -radius * cosA;
                        const isNodeSelected = isAppSector && metrics.selectedTier === tierNum;

                        return (
                          <motion.div
                            key={`${app.id}-tier-${tierNum}`}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{
                              scale: isNodeSelected ? 1.25 : isAppSector ? 1.1 : 1,
                              opacity: 1,
                              x: nodeX,
                              y: nodeY,
                            }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              executeWarpTransition(app, feat, metrics.phase === 'idle' ? 'whitehole' : metrics.phase, 0.5);
                            }}
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-30 cursor-pointer"
                          >
                            <div className="relative flex flex-col items-center justify-center">
                              {/* 1층 (내행성 궤도): 매끄러운 발광 행성 비드 (터치 드래그 시에만 표시) */}
                              {tierNum === 1 && (
                                <div
                                  className={`rounded-full transition-all duration-200 ${
                                    isNodeSelected
                                      ? 'w-5 h-5 ring-2 ring-white shadow-[0_0_18px_rgba(255,255,255,0.95)] z-40 scale-110'
                                      : isAppSector
                                      ? 'w-4 h-4 ring-1 ring-white/70 shadow-[0_0_12px_currentColor]'
                                      : 'w-3 h-3 hover:scale-125'
                                  }`}
                                  style={{
                                    background: isNodeSelected
                                      ? '#ffffff'
                                      : `radial-gradient(circle at 35% 35%, #ffffff 0%, ${app.themeColor} 60%, #030712 100%)`,
                                    boxShadow: isNodeSelected
                                      ? `0 0 20px ${app.accentGlow}, 0 0 10px #ffffff`
                                      : isAppSector
                                      ? `0 0 12px ${app.accentGlow}`
                                      : `0 0 6px ${app.accentGlow}`,
                                    color: app.themeColor,
                                  }}
                                />
                              )}

                              {/* 2층 (중행성 궤도): 토성형 행성 고리가 둘러싸인 구체 비드 (터치 드래그 시에만 표시) */}
                              {tierNum === 2 && (
                                <div className="relative flex items-center justify-center">
                                  {/* 행성 고리 궤도 링 */}
                                  <div
                                    className={`absolute rounded-full border transition-all pointer-events-none -rotate-25 ${
                                      isNodeSelected
                                        ? 'w-7.5 h-2.5 border-white shadow-[0_0_10px_#ffffff]'
                                        : isAppSector
                                        ? 'w-6.5 h-2 border-white/70 shadow-[0_0_6px_currentColor]'
                                        : 'w-5 h-1.5 border-white/30'
                                    }`}
                                    style={{
                                      borderColor: isNodeSelected ? '#ffffff' : app.themeColor,
                                      color: app.themeColor,
                                    }}
                                  />
                                  {/* 행성 비드 본체 */}
                                  <div
                                    className={`rounded-full transition-all duration-200 relative z-10 ${
                                      isNodeSelected
                                        ? 'w-5.5 h-5.5 ring-2 ring-white shadow-[0_0_20px_rgba(255,255,255,0.95)] z-40 scale-110'
                                        : isAppSector
                                        ? 'w-4.5 h-4.5 ring-1 ring-white/70 shadow-[0_0_12px_currentColor]'
                                        : 'w-3.5 h-3.5 hover:scale-125'
                                    }`}
                                    style={{
                                      background: isNodeSelected
                                        ? '#ffffff'
                                        : `radial-gradient(circle at 30% 30%, #ffffff 0%, ${app.themeColor} 55%, #050515 100%)`,
                                      boxShadow: isNodeSelected
                                        ? `0 0 22px ${app.accentGlow}, 0 0 10px #ffffff`
                                        : `0 0 10px ${app.accentGlow}`,
                                      color: app.themeColor,
                                    }}
                                  />
                                </div>
                              )}

                              {/* 3층 (외행성 궤도): 오브의 고대 룬문자(Elder Runic Sigil) 표출 */}
                              {tierNum === 3 && (
                                <div
                                  className={`rounded-full flex items-center justify-center transition-all duration-200 ${
                                    isNodeSelected
                                      ? 'w-9 h-9 border-2 border-white ring-2 ring-white/90 shadow-2xl z-40 scale-115'
                                      : isAppSector
                                      ? 'w-8.5 h-8.5 border border-white/80 bg-black/90 shadow-lg'
                                      : 'w-8 h-8 border border-white/30 bg-black/85 backdrop-blur-xs hover:scale-110'
                                  }`}
                                  style={{
                                    backgroundColor: isNodeSelected
                                      ? '#ffffff'
                                      : isAppSector
                                      ? 'rgba(0,0,0,0.85)'
                                      : 'rgba(10,10,24,0.85)',
                                    boxShadow: isNodeSelected
                                      ? `0 0 25px ${app.accentGlow}, 0 0 12px #ffffff`
                                      : isAppSector
                                      ? `0 0 14px ${app.accentGlow}`
                                      : `0 0 8px ${app.accentGlow}`,
                                  }}
                                >
                                  <span
                                    className={`font-serif font-black select-none transition-transform tracking-wider ${
                                      isNodeSelected ? 'scale-120 text-lg' : 'text-base'
                                    }`}
                                    style={{
                                      color: isNodeSelected ? '#000000' : '#fef08a',
                                      textShadow: isNodeSelected
                                        ? 'none'
                                        : `0 0 8px ${app.accentGlow}`,
                                    }}
                                  >
                                    {app.runeSymbol}
                                  </span>
                                </div>
                              )}

                              {/* 선택/호버된 기능 노드 팝업 말풍선 */}
                              {isNodeSelected && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8, y: -4 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  className="absolute -top-7.5 whitespace-nowrap px-2.5 py-0.5 rounded-full bg-black/95 text-white border text-[9.5px] font-extrabold shadow-2xl z-50 flex items-center gap-1.5 pointer-events-none"
                                  style={{ borderColor: app.themeColor }}
                                >
                                  <span className="text-amber-300 font-serif font-black text-xs">{app.runeSymbol}</span>
                                  <span>{app.name}</span>
                                  <span className="text-white/60 text-[8.5px] font-medium">({app.runeName} · {feat.label})</span>
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}

                      {/* 최외측 7대 앱 명칭 뱃지 (시계방향 순서) */}
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                          scale: isAppSector ? 1.15 : 1,
                          opacity: 1,
                          x: appLabelX,
                          y: appLabelY,
                        }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const activeTierFeat = app.features[metrics.selectedTier - 1] || app.features[0];
                          executeWarpTransition(app, activeTierFeat, 'whitehole', 0.5);
                        }}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-20 cursor-pointer"
                      >
                        <span
                          className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap transition-all ${
                            isAppSector
                              ? 'bg-white text-black font-extrabold shadow-lg ring-1 ring-white'
                              : 'bg-black/80 text-slate-300 border border-white/10'
                          }`}
                        >
                          {app.name}
                        </span>
                      </motion.div>
                    </React.Fragment>
                  );
                })}
              </>
            )}
          </AnimatePresence>

          {/* 메인 빅뱅 싱귤래리티 코어 버튼 (태양 Sun 코어) */}
          <motion.button
            id="bigbang-core-button"
            type="button"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => setIsPressing(false)}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.94 }}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center cursor-pointer relative overflow-hidden transition-all border touch-manipulation z-30 ${
              metrics.isAborted
                ? 'border-red-500/80 shadow-[0_0_25px_rgba(239,68,68,0.7)]'
                : selectedApp
                ? 'border-white shadow-[0_0_25px_rgba(255,255,255,0.8)]'
                : isPressing && (metrics.durationMs >= 350 || metrics.virtualForce >= 0.35) && metrics.radialSectorIndex === -1
                ? 'border-cyan-300 shadow-[0_0_28px_rgba(56,189,248,0.85)] ring-2 ring-cyan-400/40'
                : isPressing && metrics.radialSectorIndex === -1
                ? 'border-amber-400/80 shadow-[0_0_28px_rgba(245,158,11,0.75)] ring-2 ring-amber-400/40'
                : isHovered && !isPressing
                ? 'border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.85),0_0_60px_rgba(239,68,68,0.4)] ring-2 ring-amber-300/60'
                : metrics.phase === 'blackhole'
                ? 'border-zinc-800 shadow-[0_0_30px_rgba(0,0,0,0.95)] ring-2 ring-purple-900/50'
                : metrics.phase === 'event_horizon'
                ? 'border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.7)]'
                : 'border-cyan-400/50 shadow-[0_0_25px_rgba(56,189,248,0.4)]'
            }`}
            style={{
              background: isHovered && !isPressing
                ? 'radial-gradient(circle at 45% 40%, #fef08a 0%, #f59e0b 35%, #b45309 70%, #451a03 100%)'
                : !isPressing
                ? 'radial-gradient(circle at 35% 30%, #15162c 0%, #0d0e1d 45%, #05060f 100%)'
                : metrics.phase === 'blackhole'
                ? '#000000'
                : '#04030a'
            }}
          >
            {/* 탭/홀드 동적 배경 아이콘: 탭할 때는 루시 아이콘, 홀드할 때는 오브 아이콘 */}
            <AnimatePresence mode="wait">
              {isPressing && metrics.radialSectorIndex === -1 && !metrics.isAborted && (
                (metrics.durationMs >= 350 || metrics.virtualForce >= 0.35) ? (
                  <motion.div
                    key="orb-hold-bg"
                    initial={{ scale: 0.6, opacity: 0, rotate: -15 }}
                    animate={{ scale: 1.05, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                  >
                    <div className="absolute w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-400/30 via-indigo-500/25 to-purple-500/30 blur-md animate-pulse" />
                    <CrystalOrbIcon size={32} className="drop-shadow-[0_0_14px_rgba(56,189,248,0.95)]" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="lucy-tap-bg"
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1.0, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                  >
                    <div className="absolute w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400/30 via-orange-400/25 to-yellow-300/30 blur-md animate-pulse" />
                    <LucyCelestialStarIcon size={30} className="drop-shadow-[0_0_12px_rgba(245,158,11,0.95)]" />
                  </motion.div>
                )
              )}
            </AnimatePresence>

            {/* 호버 시 태양(Sun) 코로나 플레어 중심 핵 */}
            {isHovered && !isPressing && metrics.radialSectorIndex === -1 && (
              <div className="relative flex items-center justify-center pointer-events-none z-20">
                <div className="absolute w-6 h-6 rounded-full bg-yellow-200 blur-[2px] animate-ping opacity-60" />
                <div className="w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_12px_#ffffff]" />
              </div>
            )}

            {/* 미조작 상태 또는 7대 방사형 조이스틱 조작 시 기본 싱귤래리티 코어 펄스 */}
            {(!isHovered && !isPressing || metrics.radialSectorIndex >= 0 || metrics.isAborted) && (
              <div
                className={`rounded-full transition-all duration-150 z-10 ${
                  metrics.phase === 'blackhole'
                    ? 'w-4 h-4 bg-purple-500 blur-[2px] animate-ping'
                    : metrics.phase === 'event_horizon'
                    ? 'w-3 h-3 bg-purple-300 blur-[1px]'
                    : 'w-2.5 h-2.5 bg-cyan-300 blur-[1px] animate-pulse'
                }`}
              />
            )}
          </motion.button>

          {/* 상단 실시간 조작 및 위상 안내 배너 */}
          <AnimatePresence>
            {isSolarSystemVisible && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="absolute -top-[178px] left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap z-40"
              >
                {metrics.isAborted ? (
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-red-950/95 border border-red-500 text-red-200 shadow-md">
                    🛑 범위 이탈 · 손을 떼면 취소
                  </span>
                ) : selectedApp && activeFeature ? (
                  <div
                    className="text-[10px] font-bold px-3.5 py-1.5 rounded-full bg-black/95 border backdrop-blur-md shadow-2xl flex items-center gap-2"
                    style={{ borderColor: selectedApp.themeColor }}
                  >
                    <span
                      className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-black font-serif"
                      style={{ backgroundColor: selectedApp.themeColor }}
                    >
                      {selectedApp.runeSymbol} {selectedApp.runeName}
                    </span>
                    <span className="text-white font-bold text-[11px]">
                      {selectedApp.name} · {activeFeature.label}
                    </span>
                    <span className="text-amber-300/90 text-[9px] font-medium">
                      {isHovered && !isPressing ? '✨ 클릭 시 즉시 도약' : '손을 떼면 도약'}
                    </span>
                  </div>
                ) : isHovered && !isPressing ? (
                  <span className="text-[9.5px] font-bold px-3 py-1 rounded-full bg-black/90 border border-amber-400/60 text-amber-200 backdrop-blur-md shadow-xl flex items-center gap-1.5">
                    <span>☀️ 태양계 옴니워프</span>
                    <span className="text-white/40">|</span>
                    <span className="text-amber-300">오브 7대 룬문자 궤도</span>
                    <span className="text-white/40">·</span>
                    <span className="text-slate-300">클릭 시 즉시 도약</span>
                  </span>
                ) : isCurrentlyInOrb ? (
                  <span className="text-[9px] font-medium px-2.5 py-0.5 rounded-full bg-black/80 border border-amber-400/50 text-amber-200 backdrop-blur-md">
                    {metrics.durationMs >= 350
                      ? '🔮 손을 떼면 오브 닫기 (원래 채널 복귀)'
                      : '💬 탭: 루시채팅 · 🔮 홀드: 오브 닫기'}
                  </span>
                ) : isCurrentlyInChat ? (
                  <span className="text-[9px] font-medium px-2.5 py-0.5 rounded-full bg-black/80 border border-purple-400/50 text-purple-200 backdrop-blur-md">
                    {metrics.durationMs >= 350
                      ? `🔮 손을 떼면 오브 진입 (${currentChannelInfo.channelName})`
                      : '🚪 탭: 원래 채널 복귀 · 🔮 홀드: 오브 진입'}
                  </span>
                ) : (
                  <span className="text-[9px] font-medium px-2.5 py-0.5 rounded-full bg-black/80 border border-cyan-400/40 text-cyan-200 backdrop-blur-md">
                    {metrics.durationMs >= 350
                      ? `🔮 손을 떼면 오브 진입 (${currentChannelInfo.channelName})`
                      : `💬 탭: 루시채팅 · 🔮 홀드: 오브 (${currentChannelInfo.channelName})`}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </>
  );
}

// 기존 임포트와의 100% 호환을 위한 기본 별칭 내보내기
export function BigBangButton() {
  return <UnifiedBigBangButton />;
}
