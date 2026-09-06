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
import { Sparkles, Sun, TreeDeciduous, Activity, Bird, Music, Moon } from 'lucide-react';
import { sendPrismToss } from '@/lib/prismToss';
import { CrystalOrbIcon } from '@/components/icons/CrystalOrbIcon';

// ----------------------------------------------------------------------------
// [Part 1. 타입 정의 및 7대 정규 차원(앱) 방사형 맵]
// ----------------------------------------------------------------------------
export type WarpPhase = 'idle' | 'whitehole' | 'event_horizon' | 'blackhole' | 'aborted';

export interface RadialWarpApp {
  id: string;
  name: string;
  path: string;
  themeColor: string;
  accentGlow: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tier: 1 | 2 | 3;
  tierName: string;
  x: number;
  y: number;
}

/**
 * 🪐 상향 3단 부채꼴 아크형 7대 차원 앱 맵 (총 7개 앱을 세 층으로 분할)
 * - 1층 (하단 근접 / 관문: r=58px): 프롤로그(좌: -44,-40), 에필로그(우: +44,-40) -> 2개
 * - 2층 (중간 아크 / 통찰: r=98px): 오렌지(좌: -78,-64), 트리니티(중앙 12시: 0,-100), 아우라(우: +78,-64) -> 3개
 * - 3층 (상단 원거리 / 승화: r=144px): 블루버드(좌: -76,-126), 뮤즈(우: +76,-126) -> 2개
 */
export const RADIAL_WARP_APPS: RadialWarpApp[] = [
  { id: 'hub', name: '프롤로그', path: '/', themeColor: '#38bdf8', accentGlow: 'rgba(56,189,248,0.7)', icon: Sun, tier: 1, tierName: '1층: 관문', x: -44, y: -40 },
  { id: 'orange', name: '오렌지', path: '/orange', themeColor: '#f97316', accentGlow: 'rgba(249,115,22,0.7)', icon: TreeDeciduous, tier: 2, tierName: '2층: 통찰', x: -78, y: -64 },
  { id: 'trinity', name: '트리니티', path: '/trinity', themeColor: '#a855f7', accentGlow: 'rgba(168,85,247,0.7)', icon: Sparkles, tier: 2, tierName: '2층: 통찰', x: 0, y: -100 },
  { id: 'heal', name: '아우라', path: '/heal', themeColor: '#10b981', accentGlow: 'rgba(16,185,129,0.7)', icon: Activity, tier: 2, tierName: '2층: 통찰', x: 78, y: -64 },
  { id: 'bluebird', name: '블루버드', path: '/bluebird', themeColor: '#0ea5e9', accentGlow: 'rgba(14,165,233,0.7)', icon: Bird, tier: 3, tierName: '3층: 승화', x: -76, y: -126 },
  { id: 'muse', name: '뮤즈', path: '/muse', themeColor: '#ec4899', accentGlow: 'rgba(236,72,153,0.7)', icon: Music, tier: 3, tierName: '3층: 승화', x: 76, y: -126 },
  { id: 'epilogue', name: '에필로그', path: '/epilogue', themeColor: '#f59e0b', accentGlow: 'rgba(245,158,11,0.7)', icon: Moon, tier: 1, tierName: '1층: 관문', x: 44, y: -40 },
];

export interface WarpMetrics {
  durationMs: number;
  virtualForce: number; // 0.08 ~ 1.0 (가상 물리력)
  phase: WarpPhase;
  dragDistance: number;
  dragAngleDeg: number;
  radialSectorIndex: number; // 0 ~ 6 또는 -1 (중립)
  isAborted: boolean;        // 유효 반경 초과 이탈 시 취소
}

// ----------------------------------------------------------------------------
// [Part 2. 물리 센싱 & 3단 계층 부채꼴 조이스틱 판별 알고리즘]
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

  // 2) 3단 계층 유효 조작 경계: 상단 최대 반경 175px, 아래로 너무 당기면(deltaY > 55px) 안전 취소
  const isAborted = dist > 175 || deltaY > 55;

  // 3) 3단 계층 노드 조준 판정: <20px(중앙 중립), 20px~175px(조이스틱 조준)
  let radialSectorIndex = -1;
  if (dist >= 20 && !isAborted) {
    let bestScore = Infinity;
    RADIAL_WARP_APPS.forEach((app, idx) => {
      // 대상 노드까지의 물리적 유클리드 거리
      const d = Math.hypot(deltaX - app.x, deltaY - app.y);
      // 드래그 벡터와 노드 방향 벡터의 각도 차이 보정 (더 자연스러운 방향 흡착)
      const appAngle = Math.atan2(app.y, app.x);
      const pointerAngle = Math.atan2(deltaY, deltaX);
      let angleDiff = Math.abs(pointerAngle - appAngle);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

      const score = d + angleDiff * 32;
      if (score < bestScore) {
        bestScore = score;
        radialSectorIndex = idx;
      }
    });
  }

  // 4) 호흡 주기(1.5s) 코사인 보간 가상 압력 계산 + 하드웨어 Force Touch 연동
  const cyclePeriod = 1500;
  const cycleProgress = (durationMs % cyclePeriod) / cyclePeriod;
  const oscillation = cycleProgress < 0.5 ? cycleProgress * 2 : (1 - cycleProgress) * 2;
  const smoothedFactor = (1 - Math.cos(oscillation * Math.PI)) / 2;
  let force = 0.08 + smoothedFactor * 0.92;
  if (hwPressure > 0.4) force = Math.max(force, hwPressure);
  const virtualForce = Math.min(1.0, Math.max(0.08, force));

  // 5) 가상 물리력 기반 3단계 위상 판정
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

  return { durationMs, virtualForce, phase, dragDistance: dist, dragAngleDeg, radialSectorIndex, isAborted };
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
  const [metrics, setMetrics] = useState<WarpMetrics>({
    durationMs: 0,
    virtualForce: 0.08,
    phase: 'idle',
    dragDistance: 0,
    dragAngleDeg: 0,
    radialSectorIndex: -1,
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
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isPressing) return;
    setIsPressing(false);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const { durationMs, virtualForce, dragDistance, radialSectorIndex, isAborted, phase } = metrics;

    // 1) 안전 취소: 88px 초과 이탈 시 취소
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

    // 3) 방사형 조이스틱 도약 또는 롱프레스 도약
    const targetApp = radialSectorIndex >= 0
      ? RADIAL_WARP_APPS[radialSectorIndex]
      : RADIAL_WARP_APPS[2]; // 기본값: 트리니티

    // 위상이 반영된 스마트 핸드오프 프롬프트 합성
    const autoPrompt = serializeViewAndSynthesizePrompt(
      window.location.pathname,
      targetApp.path,
      phase
    );

    // 21채널 딥링크 타깃 URL 생성
    const targetUrl = `${targetApp.path}?phase=${phase}&force=${virtualForce.toFixed(2)}`;

    // 크로스앱 토스 파이프라인 전달 (목적지 앱에서 즉시 감지 및 자동 발화)
    try {
      sendPrismToss({
        sourceApp: window.location.pathname.replace('/', '') || 'hub',
        targetApp: targetApp.id,
        actionType: `omniwarp_${phase}`,
        contextMessage: `[옴니워프 ${phase === 'whitehole' ? '화이트홀' : phase === 'event_horizon' ? '사건의 지평선' : '블랙홀'}] ${targetApp.name}`,
        autoTrigger: true,
        autoPrompt,
        tossedAt: Date.now(),
      });
    } catch (_) {}

    // 글로벌 도약 이벤트 발송 (Expansion Overlay 및 컴포넌트 연동)
    window.dispatchEvent(new CustomEvent('omniwarp-commit', {
      detail: { 
        targetApp, 
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
        autoPrompt,
        force: virtualForce,
        metrics,
        timestamp: Date.now(),
      }
    }));

    if (navigator.vibrate) navigator.vibrate([60, 30, 100]); // 빅뱅 폭발 햅틱

    setTimeout(() => {
      window.location.href = targetUrl;
    }, 280);
  };

  const selectedApp = metrics.radialSectorIndex >= 0 ? RADIAL_WARP_APPS[metrics.radialSectorIndex] : null;

  return (
    <>
      {/* 뷰포트 센터링 레이아웃: 모든 환경에서 정중앙 하단에 흔들림 없이 고정 */}
      <div className="fixed left-1/2 -translate-x-1/2 bottom-safe-fab z-[350] pointer-events-none flex items-center justify-center select-none">
        <div className="relative flex items-center justify-center pointer-events-auto">

          {/* 7대 앱 상향 3단 부채꼴 아크형 HUD */}
          <AnimatePresence>
            {isPressing && (
              <>
                {/* 3단 계층 부채꼴 아크 가이드 라인 & 티어 배지 */}
                <motion.svg
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.18 }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] pointer-events-none z-10 overflow-visible"
                >
                  <defs>
                    <radialGradient id="fanAmbientGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity="0.18" />
                      <stop offset="65%" stopColor="#c084fc" stopOpacity="0.05" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="tier1Grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
                      <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.6" />
                    </linearGradient>
                    <linearGradient id="tier2Grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f97316" stopOpacity="0.6" />
                      <stop offset="50%" stopColor="#a855f7" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.6" />
                    </linearGradient>
                    <linearGradient id="tier3Grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.7" />
                      <stop offset="50%" stopColor="#ec4899" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="#ec4899" stopOpacity="0.7" />
                    </linearGradient>
                  </defs>

                  {/* 앰비언트 부채꼴 배경 글로우 */}
                  <path
                    d="M 60 170 A 148 148 0 0 1 280 170 Z"
                    fill="url(#fanAmbientGlow)"
                    className="opacity-50"
                  />

                  {/* 1층 아크 (r=58, 관문: 프롤로그 · 에필로그) */}
                  <path
                    d="M 112 170 A 58 58 0 0 1 228 170"
                    fill="none"
                    stroke="url(#tier1Grad)"
                    strokeDasharray="3 3"
                    strokeWidth="1.5"
                  />

                  {/* 2층 아크 (r=100, 통찰: 오렌지 · 트리니티 · 아우라) */}
                  <path
                    d="M 70 170 A 100 100 0 0 1 270 170"
                    fill="none"
                    stroke="url(#tier2Grad)"
                    strokeDasharray="4 3"
                    strokeWidth="1.5"
                  />

                  {/* 3층 아크 (r=146, 승화: 블루버드 · 뮤즈) */}
                  <path
                    d="M 24 170 A 146 146 0 0 1 316 170"
                    fill="none"
                    stroke="url(#tier3Grad)"
                    strokeDasharray="4 4"
                    strokeWidth="1.5"
                  />

                  {/* 유효 조작 한계선 초과 시 경고 레드 링 */}
                  {metrics.isAborted && (
                    <path
                      d="M -5 170 A 175 175 0 0 1 345 170"
                      fill="none"
                      stroke="rgba(239, 68, 68, 0.8)"
                      strokeDasharray="6 4"
                      strokeWidth="2.5"
                    />
                  )}
                </motion.svg>

                {/* 3단 층 안내 라벨 뱃지 (좌측 인디케이터) */}
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  className="absolute -left-[122px] top-[-148px] pointer-events-none flex flex-col items-end gap-7 z-20"
                >
                  <span className="text-[9px] font-extrabold text-pink-300 bg-pink-950/70 border border-pink-500/40 px-1.5 py-0.5 rounded-full shadow-xs">
                    3층 · 승화
                  </span>
                  <span className="text-[9px] font-extrabold text-purple-300 bg-purple-950/70 border border-purple-500/40 px-1.5 py-0.5 rounded-full shadow-xs">
                    2층 · 통찰
                  </span>
                  <span className="text-[9px] font-extrabold text-cyan-300 bg-cyan-950/70 border border-cyan-500/40 px-1.5 py-0.5 rounded-full shadow-xs">
                    1층 · 관문
                  </span>
                </motion.div>

                {/* 7대 앱 3단 계층 노드 */}
                {RADIAL_WARP_APPS.map((app, idx) => {
                  const isSelected = metrics.radialSectorIndex === idx && !metrics.isAborted;
                  const Icon = app.icon;
                  const nodeX = app.x;
                  const nodeY = app.y;

                  return (
                    <motion.div
                      key={app.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{
                        scale: isSelected ? 1.25 : 1,
                        opacity: 1,
                        x: nodeX,
                        y: nodeY,
                      }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30"
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border transition-all ${
                            isSelected
                              ? 'border-white ring-2 ring-white/90 shadow-xl scale-110'
                              : 'border-white/30 bg-black/85 text-white/90 shadow-md backdrop-blur-md'
                          }`}
                          style={{
                            backgroundColor: isSelected ? app.themeColor : undefined,
                            boxShadow: isSelected ? `0 0 20px ${app.accentGlow}` : undefined,
                          }}
                        >
                          <Icon size={isSelected ? 17 : 14} />
                        </div>
                        <span
                          className={`text-[9px] font-bold mt-1 px-1.5 py-0.2 rounded-full whitespace-nowrap transition-all ${
                            isSelected
                              ? 'bg-white text-black shadow-md scale-105'
                              : 'bg-black/75 text-slate-300 border border-white/15'
                          }`}
                        >
                          {app.name}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </>
            )}
          </AnimatePresence>

          {/* 메인 빅뱅 싱귤래리티 코어 버튼 */}
          <motion.button
            type="button"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => setIsPressing(false)}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.94 }}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center cursor-pointer relative overflow-hidden transition-all border touch-manipulation ${
              metrics.isAborted
                ? 'border-red-500/80 shadow-[0_0_25px_rgba(239,68,68,0.7)]'
                : selectedApp
                ? 'border-white shadow-[0_0_25px_rgba(255,255,255,0.8)]'
                : isPressing && (metrics.durationMs >= 350 || metrics.virtualForce >= 0.35) && metrics.radialSectorIndex === -1
                ? 'border-cyan-300 shadow-[0_0_28px_rgba(56,189,248,0.85)] ring-2 ring-cyan-400/40'
                : isPressing && metrics.radialSectorIndex === -1
                ? 'border-amber-400/80 shadow-[0_0_28px_rgba(245,158,11,0.75)] ring-2 ring-amber-400/40'
                : metrics.phase === 'blackhole'
                ? 'border-zinc-800 shadow-[0_0_30px_rgba(0,0,0,0.95)] ring-2 ring-purple-900/50'
                : metrics.phase === 'event_horizon'
                ? 'border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.7)]'
                : 'border-cyan-400/50 shadow-[0_0_25px_rgba(56,189,248,0.4)]'
            }`}
            style={{
              background: !isPressing
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

            {/* 미조작 상태 또는 7대 방사형 조이스틱 조작 시 기본 싱귤래리티 코어 펄스 */}
            {(!isPressing || metrics.radialSectorIndex >= 0 || metrics.isAborted) && (
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
            {isPressing && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="absolute -top-[168px] left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap z-40"
              >
                {metrics.isAborted ? (
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-red-950/95 border border-red-500 text-red-200 shadow-md">
                    🛑 범위 이탈 · 손을 떼면 취소
                  </span>
                ) : selectedApp ? (
                  <span
                    className="text-[10px] font-bold px-3 py-1 rounded-full bg-black/90 border backdrop-blur-md shadow-md flex items-center gap-1.5"
                    style={{ borderColor: selectedApp.themeColor, color: selectedApp.themeColor }}
                  >
                    <span>
                      {selectedApp.tierName ? `${selectedApp.tierName} · ` : ''}{selectedApp.name} · {
                        metrics.phase === 'blackhole' ? '심층 통찰(블랙홀)' :
                        metrics.phase === 'event_horizon' ? '균형 분석' : '명료 해답(화이트홀)'
                      }
                    </span>
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
