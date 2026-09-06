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

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Sun, TreeDeciduous, Activity, Bird, Music, Moon } from 'lucide-react';
import { sendPrismToss } from '@/lib/prismToss';

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
}

/** 12시 상단(0°)부터 시계방향으로 균등 분할(360° / 7 ≈ 51.43°) 배치된 7대 앱 맵 */
export const RADIAL_WARP_APPS: RadialWarpApp[] = [
  { id: 'hub', name: '프롤로그', path: '/', themeColor: '#38bdf8', accentGlow: 'rgba(56,189,248,0.7)', icon: Sun },
  { id: 'orange', name: '오렌지', path: '/orange', themeColor: '#f97316', accentGlow: 'rgba(249,115,22,0.7)', icon: TreeDeciduous },
  { id: 'trinity', name: '트리니티', path: '/trinity', themeColor: '#a855f7', accentGlow: 'rgba(168,85,247,0.7)', icon: Sparkles },
  { id: 'heal', name: '아우라', path: '/heal', themeColor: '#10b981', accentGlow: 'rgba(16,185,129,0.7)', icon: Activity },
  { id: 'bluebird', name: '블루버드', path: '/bluebird', themeColor: '#0ea5e9', accentGlow: 'rgba(14,165,233,0.7)', icon: Bird },
  { id: 'muse', name: '뮤즈', path: '/muse', themeColor: '#ec4899', accentGlow: 'rgba(236,72,153,0.7)', icon: Music },
  { id: 'epilogue', name: '에필로그', path: '/epilogue', themeColor: '#f59e0b', accentGlow: 'rgba(245,158,11,0.7)', icon: Moon },
];

export interface WarpMetrics {
  durationMs: number;
  virtualForce: number; // 0.08 ~ 1.0 (가상 물리력)
  phase: WarpPhase;
  dragDistance: number;
  dragAngleDeg: number;
  radialSectorIndex: number; // 0 ~ 6 또는 -1 (중립)
  isAborted: boolean;        // 88px 초과 이탈 시 취소
}

// ----------------------------------------------------------------------------
// [Part 2. 물리 센싱 & 360° 조이스틱 판별 알고리즘]
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

  // 2) 7개 섹터 균등 분할 (~51.43° 단위)
  const sectorSize = 360 / RADIAL_WARP_APPS.length;
  const normalizedDeg = (dragAngleDeg + sectorSize / 2) % 360;
  const sectorIndex = Math.floor(normalizedDeg / sectorSize);

  // 3) 거리 판정: <18px(중앙 중립), 18px~88px(조이스틱 조준), >88px(범위 이탈 취소)
  const isAborted = dist > 88;
  const radialSectorIndex = (dist >= 18 && !isAborted) ? sectorIndex : -1;

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

  // 60fps 렌더링 최적화를 위한 ref 관리
  const pointerStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const currentPosRef = useRef<{ x: number; y: number; pressure: number }>({ x: 0, y: 0, pressure: 0 });
  const lastPhaseRef = useRef<WarpPhase>('idle');
  const animFrameRef = useRef<number | null>(null);

  // [Pointer Down] 인터랙션 시작 & 60fps 루프 가동
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const startTime = performance.now();
    pointerStartRef.current = { x: e.clientX, y: e.clientY, time: startTime };
    currentPosRef.current = { x: e.clientX, y: e.clientY, pressure: (e as any).pressure || 0 };
    lastPhaseRef.current = 'whitehole';
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

    // 2) 숏 탭 (<180ms & <18px): 메인 홈('/') 즉각 복귀
    if (durationMs < 180 && virtualForce < 0.2 && dragDistance < 18) {
      if (navigator.vibrate) navigator.vibrate([20]);
      window.location.href = '/';
      return;
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

          {/* 7대 앱 360° 방사형 조이스틱 HUD */}
          <AnimatePresence>
            {isPressing && (
              <>
                {/* 88px 유효 조작 경계 링 */}
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  className={`absolute w-[176px] h-[176px] rounded-full border-2 border-dashed pointer-events-none transition-colors duration-150 ${
                    metrics.isAborted ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)]' : 'border-cyan-400/40'
                  }`}
                />

                {/* 7대 앱 궤도 노드 */}
                {RADIAL_WARP_APPS.map((app, idx) => {
                  const angleDeg = idx * (360 / RADIAL_WARP_APPS.length);
                  const rad = (angleDeg * Math.PI) / 180;
                  const nodeX = 72 * Math.sin(rad);
                  const nodeY = -72 * Math.cos(rad);
                  const isSelected = metrics.radialSectorIndex === idx && !metrics.isAborted;
                  const Icon = app.icon;

                  return (
                    <motion.div
                      key={app.id}
                      initial={{ scale: 0 }}
                      animate={{ scale: isSelected ? 1.35 : 0.95, x: nodeX, y: nodeY }}
                      exit={{ scale: 0 }}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30"
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'border-white ring-2 ring-white/80 shadow-lg scale-110'
                            : 'border-white/30 bg-black/80 text-white/80'
                        }`}
                        style={{
                          backgroundColor: isSelected ? app.themeColor : undefined,
                          boxShadow: isSelected ? `0 0 16px ${app.accentGlow}` : undefined,
                        }}
                      >
                        <Icon size={isSelected ? 16 : 13} />
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
            <div
              className={`rounded-full transition-all duration-150 ${
                metrics.phase === 'blackhole'
                  ? 'w-4 h-4 bg-purple-500 blur-[2px] animate-ping'
                  : metrics.phase === 'event_horizon'
                  ? 'w-3 h-3 bg-purple-300 blur-[1px]'
                  : 'w-2.5 h-2.5 bg-cyan-300 blur-[1px] animate-pulse'
              }`}
            />
          </motion.button>

          {/* 상단 실시간 조작 및 위상 안내 배너 */}
          <AnimatePresence>
            {isPressing && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="absolute -top-9 left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap z-40"
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
                      {selectedApp.name} · {
                        metrics.phase === 'blackhole' ? '심층 통찰(블랙홀)' :
                        metrics.phase === 'event_horizon' ? '균형 분석' : '명료 해답(화이트홀)'
                      }
                    </span>
                  </span>
                ) : (
                  <span className="text-[9px] font-medium px-2.5 py-0.5 rounded-full bg-black/80 border border-cyan-400/40 text-cyan-200 backdrop-blur-md">
                    {metrics.phase === 'blackhole' ? '🌌 심층 무의식 응축 중 · 앱으로 밀어 워프' :
                     metrics.phase === 'event_horizon' ? '⚖️ 균형 분석 상태 · 앱 방향으로 드래그' :
                     '✨ 방향 선택 시 앱 워프 · 밖으로 당기면 취소'}
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
