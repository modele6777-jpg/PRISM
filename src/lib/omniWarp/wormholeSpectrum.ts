/**
 * 🌀 웜홀 전 차원 룬 스펙트럼 (Wormhole Spectrum)
 * - PrismRouteRegistry(단일 진실 공급원)와 100% 연동
 * - 실존하는 유효 페이지/기능만 접근 허용하며 사라진 페이지는 원천 배제
 * - 신규 페이지/기능 추가 시 웜홀 스펙트럼 및 게이지 경로가 자동으로 확장 및 갱신됨
 */

import {
  getActivePrismRoutes,
  PrismRouteDefinition,
} from '@/lib/prismRouteRegistry';

export interface WormholeAppInfo {
  id: string;
  name: string;
  subName: string;
  path: string;
  icon: string;
  runeSymbol: string;
  runeName: string;
  runeMeaning: string;
  description: string;
  themeColor: string;
  accentGlow: string;
  defaultGaugePercent: number;
}

export const DISALLOWED_WARP_IDS = new Set(['profile', 'handbook', 'library', 'omniwarp']);
export const DISALLOWED_WARP_PATHS = new Set(['/profile', '/handbook', '/library', '/omniwarp']);

/**
 * 라우트 정의를 WormholeAppInfo 규격으로 변환
 */
function routeToWormholeApp(route: PrismRouteDefinition, defaultPercent: number = 50): WormholeAppInfo {
  return {
    id: route.id,
    name: route.name,
    subName: route.subName,
    path: route.path,
    icon: route.icon,
    runeSymbol: route.runeSymbol,
    runeName: route.runeName,
    runeMeaning: route.runeMeaning,
    description: route.description,
    themeColor: route.themeColor,
    accentGlow: route.accentGlow,
    defaultGaugePercent: defaultPercent,
  };
}

/**
 * 현재 활성화된 모든 프리즘 사이트/기능의 웜홀 앱 목록 반환 (하위 호환성 및 동적 갱신 보장)
 * profile, handbook, library, omniwarp는 워프 이동 금지 대상이므로 제외
 */
export function getAllActiveWormholeApps(): WormholeAppInfo[] {
  const activeRoutes = getActivePrismRoutes().filter(
    (r) => !DISALLOWED_WARP_IDS.has(r.id) && !DISALLOWED_WARP_PATHS.has(r.path)
  );
  const total = activeRoutes.length;
  return activeRoutes.map((r, index) => {
    const percent = Math.round(15 + (index / Math.max(1, total - 1)) * 70);
    return routeToWormholeApp(r, percent);
  });
}

/** 하위 호환용 정적 참조 (초기 렌더링용) */
export const ALL_WORMHOLE_APPS: WormholeAppInfo[] = getAllActiveWormholeApps();

/**
 * 현재 페이지 및 맥락에 맞춰 프리즘의 실존 사이트/기능들을 지능형 랭킹하여
 * 웜홀 시공간 스펙트럼에 차례대로 고르게 매핑합니다.
 * (profile, handbook, library, omniwarp는 워프 이동 불가 대상으로 엄격 제외)
 */
export function getRankedWormholeApps(activeRoute: string): WormholeAppInfo[] {
  const norm = (activeRoute || '').replace('/', '').toLowerCase() || 'hub';
  const allActive = getAllActiveWormholeApps();

  // 기본 채널별 시너지 우선순위 템플릿 (profile, handbook, library, omniwarp 전면 배제)
  const priorityOrder: Record<string, string[]> = {
    trinity: ['muse', 'orb', 'orange', 'lucy', 'epilogue', 'bluebird', 'heal', 'hub'],
    oracle: ['muse', 'orb', 'orange', 'lucy', 'epilogue', 'bluebird', 'heal', 'hub'],
    muse: ['orange', 'epilogue', 'trinity', 'lucy', 'bluebird', 'orb', 'heal', 'hub'],
    orange: ['heal', 'bluebird', 'epilogue', 'muse', 'trinity', 'orb', 'lucy', 'hub'],
    heal: ['bluebird', 'orange', 'epilogue', 'muse', 'trinity', 'orb', 'lucy', 'hub'],
    bluebird: ['orange', 'muse', 'heal', 'epilogue', 'trinity', 'orb', 'lucy', 'hub'],
    epilogue: ['trinity', 'heal', 'bluebird', 'muse', 'orange', 'orb', 'lucy', 'hub'],
    profile: ['epilogue', 'trinity', 'lucy', 'orb', 'muse', 'orange', 'heal', 'bluebird', 'hub'],
    orb: ['lucy', 'trinity', 'muse', 'orange', 'heal', 'bluebird', 'epilogue', 'hub'],
    chat: ['orb', 'trinity', 'muse', 'orange', 'bluebird', 'heal', 'epilogue', 'hub'],
    lucy: ['orb', 'trinity', 'muse', 'orange', 'bluebird', 'heal', 'epilogue', 'hub'],
    handbook: ['lucy', 'orb', 'trinity', 'muse', 'epilogue', 'bluebird', 'orange', 'heal', 'hub'],
    library: ['lucy', 'orb', 'trinity', 'muse', 'epilogue', 'bluebird', 'orange', 'heal', 'hub'],
    omniwarp: ['orb', 'lucy', 'trinity', 'orange', 'muse', 'heal', 'bluebird', 'epilogue', 'hub'],
    hub: ['orb', 'lucy', 'trinity', 'muse', 'orange', 'bluebird', 'heal', 'epilogue'],
  };

  const currentOrder = priorityOrder[norm] || [
    'orb',
    'lucy',
    'trinity',
    'orange',
    'bluebird',
    'muse',
    'heal',
    'epilogue',
    'hub',
  ];

  const appMap = new Map(allActive.map((a) => [a.id, a]));
  const ranked: WormholeAppInfo[] = [];

  // 1. 현재 맥락에 맞는 우선순위 목록 순서대로 추가 (금지 대상 제외된 실존 활성 라우트만)
  for (const id of currentOrder) {
    if (DISALLOWED_WARP_IDS.has(id)) continue;
    const app = appMap.get(id);
    if (app && !ranked.some((r) => r.id === app.id)) {
      ranked.push(app);
    }
  }

  // 2. 신규 추가되었거나 누락된 신규 실존 기능/페이지가 있다면 자동으로 뒤에 추가 (금지 대상 제외)
  for (const app of allActive) {
    if (DISALLOWED_WARP_IDS.has(app.id) || DISALLOWED_WARP_PATHS.has(app.path)) continue;
    if (!ranked.some((r) => r.id === app.id)) {
      ranked.push(app);
    }
  }

  // 3. 웜홀 스펙트럼(15% ~ 85%)에 전체 실존 앱을 균등하게 비례 분할 배치
  const total = ranked.length;
  return ranked.map((app, index) => {
    const percent = Math.round(15 + (index / Math.max(1, total - 1)) * 70);
    return {
      ...app,
      defaultGaugePercent: percent,
    };
  });
}

/**
 * 🕳️ 블랙홀 전용: 현재 맥락에서 가장 순위가 낮은(뒤에서 1순위 / 꼴찌) 대척점 차원 반환
 * (화이트홀이 추천 1순위라면, 블랙홀은 가장 예상치 못한 심연의 반전 차원으로 전이)
 */
export function getLowestRankedWormholeApp(activeRoute: string): WormholeAppInfo {
  const ranked = getRankedWormholeApps(activeRoute);
  return ranked[ranked.length - 1] || ranked[0];
}

/**
 * 게이지 값(0.0 ~ 1.0)에 따라 현재 웜홀 구간에서 활성화된 앱을 정밀 매핑합니다.
 * 웜홀 구간(0.18 ~ 0.82)을 유저가 지정한 모든 프리즘 실존 차원에 균등 분할 배정
 */
export function getWormholeAppByGauge(
  gauge: number,
  rankedApps: WormholeAppInfo[]
): { app: WormholeAppInfo; index: number; targetPercent: number } {
  const count = rankedApps.length;
  if (count === 0) {
    const fallbackApps = getAllActiveWormholeApps();
    return {
      app: fallbackApps[0] || ALL_WORMHOLE_APPS[0],
      index: 0,
      targetPercent: 50,
    };
  }

  // 웜홀 구간 [0.18, 0.82] 정규화
  const clampedGauge = Math.max(0.18, Math.min(0.82, gauge));
  const normalized = (clampedGauge - 0.18) / (0.82 - 0.18);
  const rawIndex = Math.floor(normalized * count);
  const index = Math.min(count - 1, Math.max(0, rawIndex));

  const app = rankedApps[index] || rankedApps[0];
  return { app, index, targetPercent: app.defaultGaugePercent };
}
