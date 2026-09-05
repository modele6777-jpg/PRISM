import { WarpPhase, WarpForceMetrics } from './types';

export interface ForceSensorOptions {
  abortDistanceThreshold?: number; // default 50px
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
  const abortThreshold = options.abortDistanceThreshold ?? 52;
  const maxDuration = options.maxDurationMs ?? 1100;

  const durationMs = Math.max(0, currentTime - startTime);
  const dist = Math.hypot(currentX - startX, currentY - startY);
  const isAborted = dist > abortThreshold;

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

  // 3. Time-based Virtual Force Curve (0.0 to 1.0)
  // Tap < 0.2s: 0.10 ~ 0.30
  // Continuous 0.2s ~ 0.75s: 0.30 ~ 0.70
  // Deep > 0.75s ~ 1.1s: 0.70 ~ 1.00
  let timeForce = 0.1;
  if (durationMs < 200) {
    // 0 ~ 200ms -> 0.10 ~ 0.30
    timeForce = 0.10 + (durationMs / 200) * 0.20;
  } else if (durationMs < 750) {
    // 200ms ~ 750ms -> 0.30 ~ 0.70
    timeForce = 0.30 + ((durationMs - 200) / 550) * 0.40;
  } else {
    // 750ms ~ 1100ms+ -> 0.70 ~ 1.00
    timeForce = Math.min(1.0, 0.70 + ((durationMs - 750) / (maxDuration - 750)) * 0.30);
  }

  // If real hardware pressure is significantly higher, boost the force
  if (hwPressure > 0.6) {
    timeForce = Math.max(timeForce, hwPressure);
  }

  const virtualForce = Math.min(1.0, Math.max(0.1, timeForce));

  // Determine current Warp Phase matching OmniWarp Continuum
  let phase: WarpPhase = 'whitehole';
  if (isAborted) {
    phase = 'aborted';
  } else if (virtualForce >= 0.75) {
    phase = 'blackhole';
  } else if (virtualForce >= 0.45) {
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
