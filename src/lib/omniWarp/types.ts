/**
 * OmniWarp System & Big Bang Button (BBB) Type Definitions
 * Zero-UI Embodied Cognition Framework
 */

export type WarpPhase = 'idle' | 'whitehole' | 'event_horizon' | 'blackhole' | 'bigbang' | 'aborted';

export interface OmniWarpContext {
  activeRoute: string;
  activeTitle: string;
  summary: string;
  primarySubject?: string;
  sessionData?: Record<string, any>;
  capturedAt: number;
}

export interface OmniWarpTarget {
  phase: WarpPhase;
  gauge: number; // 0.0 ~ 1.0 (0% ~ 100%)
  aiTemperature: number; // 0.0 ~ 1.5
  title: string;
  actionType: string;
  destinationPath: string;
  previewLabel: string;
  previewDescription: string;
  themeColor: string;
  accentGlow: string;
}

export interface WarpForceMetrics {
  hardwarePressure: number; // 0.0 ~ 1.0
  touchArea: number; // calculated contact area
  durationMs: number;
  virtualForce: number; // blended force 0.0 ~ 1.0
  isAborted: boolean;
  phase: WarpPhase;
  dragOffsetX?: number;
  dragOffsetY?: number;
}

export interface BigBangCommitEventDetail {
  phase: WarpPhase;
  target: OmniWarpTarget;
  context: OmniWarpContext;
  metrics: WarpForceMetrics;
  timestamp: number;
}
