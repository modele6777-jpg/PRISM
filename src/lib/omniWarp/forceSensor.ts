import { WarpPhase, WarpForceMetrics } from './types';

export interface ForceSensorOptions {
  abortDistanceThreshold?: number; // default 42px
  sideFlingThreshold?: number; // default 30px (옆으로 튕겨내어 안전 취소)
  maxDurationMs?: number; // duration to reach 100% force, default 1100ms
}

/**
 * Parses hardware and virtual touch force, mapping to the Warp Spectrum
 */
export function calculateWarpMetrics(
  startTime: number,
  currentTime: number,
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  pointerEvent?: PointerEvent | React.PointerEvent,
  options: ForceSensorOptions = {}
): WarpForceMetrics {
  const sideThreshold = options.sideFlingThreshold ?? 32;
  const abortThreshold = options.abortDistanceThreshold ?? 44;
  const maxDuration = options.maxDurationMs ?? 1100;

  const durationMs = Math.max(0, currentTime - startTime);
  const deltaX = currentX - startX;
  const deltaY = currentY - startY;
  const absX = Math.abs(deltaX);
  const dist = Math.hypot(deltaX, deltaY);

  // 옆으로 튕겨내거나(Side Fling) 기준 거리 이상 이동 시 안전 취소 트리거
  // 1) 수평 변위가 32px 이상이거나 전체 변위가 44px 이상일 때
  // 2) 빠른 스와이프/플링 속도 감지 (시간 대비 변위 속도)
  const isSideFling = absX > sideThreshold;
  const isOverDistance = dist > abortThreshold;
  const isRapidFling = durationMs > 50 && (absX / durationMs > 0.35); // 0.35px/ms 이상 빠른 튕김
  const isAborted = isSideFling || isOverDistance || isRapidFling;

  // 1. Hardware Pressure check
  let hwPressure = 0;
  if (pointerEvent && typeof pointerEvent.pressure === 'number') {
    // Some browsers default pointerdown to 0.5 without true pressure
    // If it dynamically varies or is greater than 0, track it
    hwPressure = pointerEvent.pressure;
  }

  // 2. Touch Contact Area check (e.width/e.height or simulated thumb deformation)
  let touchArea = 1.0;
  if (pointerEvent) {
    const w = pointerEvent.width || 1;
    const h = pointerEvent.height || 1;
    touchArea = Math.min(3.0, Math.max(1.0, (w * h) / 100));
  }

  // 3. Smooth Physical Pressure Curve (0~10% White Hole -> 20~80% Wormhole 7 Steps -> 90~100% Black Hole)
  // 0 ~ 120ms: 0.05 ~ 0.12 (White Hole: 톡 탭 시 루시 채팅)
  // 120 ~ 950ms: 0.15 ~ 0.84 (Wormhole: 10% 단위 7대 룬 스펙트럼 전이)
  // 950ms 이상: 0.85 ~ 1.0 (Black Hole: 꾹 누름 특이점 크리스탈 오브)
  let timeForce: number;
  if (durationMs < 120) {
    timeForce = 0.05 + (durationMs / 120) * 0.07;
  } else if (durationMs < 950) {
    timeForce = 0.15 + ((durationMs - 120) / 830) * 0.69;
  } else {
    timeForce = Math.min(1.0, 0.85 + Math.min(1.0, (durationMs - 950) / 200) * 0.15);
  }

  // If real hardware pressure is significantly higher, boost the force
  if (hwPressure > 0.6) {
    timeForce = Math.max(timeForce, hwPressure);
  }

  const virtualForce = Math.min(1.0, Math.max(0.05, timeForce));

  // Determine current Warp Phase matching OmniWarp Continuum
  // 0% ~ 14%: 화이트홀 (루시)
  // 15% ~ 84%: 웜홀 (7대 룬 스펙트럼)
  // 85% ~ 100%: 블랙홀 (크리스탈 오브)
  let phase: WarpPhase = 'whitehole';
  if (isAborted) {
    phase = 'aborted';
  } else if (virtualForce >= 0.85) {
    phase = 'blackhole';
  } else if (virtualForce >= 0.15) {
    phase = 'event_horizon';
  } else {
    phase = 'whitehole';
  }

  return {
    hardwarePressure: hwPressure,
    touchArea,
    durationMs,
    virtualForce,
    isAborted,
    phase,
    dragOffsetX: deltaX,
    dragOffsetY: deltaY,
  };
}

/**
 * Maps virtual force (0.0 ~ 1.0) to AI Temperature T (0.0 ~ 1.5)
 */
export function forceToAiTemperature(force: number): number {
  if (force < 0.45) {
    // White Hole: 0.0 ~ 0.25
    return Number((force * (0.25 / 0.45)).toFixed(2));
  }
  if (force < 0.75) {
    // Event Horizon / Wormhole: 0.3 ~ 0.7
    const ratio = (force - 0.45) / 0.30;
    return Number((0.3 + ratio * 0.4).toFixed(2));
  }
  // Black Hole: 0.8 ~ 1.5
  const ratio = (force - 0.75) / 0.25;
  return Number((0.8 + ratio * 0.7).toFixed(2));
}
