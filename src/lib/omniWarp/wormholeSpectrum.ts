/**
 * 🌀 웜홀 7대 차원 룬 스펙트럼 (Wormhole Septagram Spectrum)
 * 게이지 20% ~ 80% 구간(10% 단위)에 배치되는 7대 앱 룬 인장 및 추천 랭킹 시스템
 */

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
  defaultGaugePercent: number; // 20, 30, 40, 50, 60, 70, 80
}

/** 루시 유니버스 7대 핵심 차원 앱 룬 정의 */
/** 루시 & 프리즘 유니버스 전천후 전 차원(12대 사이트·기능) 룬 인장 정의 */
export const ALL_WORMHOLE_APPS: WormholeAppInfo[] = [
  {
    id: 'lucy',
    name: '루시 심층 대화',
    subName: '영혼의 가이드와 1:1 대화',
    path: '/chat',
    icon: '✨',
    runeSymbol: 'ᛞ',
    runeName: 'Dagaz',
    runeMeaning: '새벽의 빛과 자각',
    description: '영혼의 가이드 루시와의 1:1 심층 대화 및 지혜의 조언',
    themeColor: '#c084fc',
    accentGlow: 'rgba(192, 132, 252, 0.9)',
    defaultGaugePercent: 12,
  },
  {
    id: 'orb',
    name: '크리스탈 오브',
    subName: '마음의 질문과 직관 점술',
    path: '/orb',
    icon: '🔮',
    runeSymbol: 'ᛟ',
    runeName: 'Othala',
    runeMeaning: '직관의 성소와 본질',
    description: '마음속 깊은 질문을 비추어 직관적인 해답을 투영하는 크리스탈 구슬',
    themeColor: '#38bdf8',
    accentGlow: 'rgba(56, 189, 248, 0.9)',
    defaultGaugePercent: 20,
  },
  {
    id: 'orange',
    name: '오렌지 5분 루틴',
    subName: '즉각 실행과 도파민 포커스',
    path: '/orange',
    icon: '🍊',
    runeSymbol: 'ᛋ',
    runeName: 'Sowilo',
    runeMeaning: '태양과 즉각 실행',
    description: '망설임을 걷어내고 5분 안에 즉시 착수하는 포커스 루틴',
    themeColor: '#fb923c',
    accentGlow: 'rgba(251, 146, 60, 0.9)',
    defaultGaugePercent: 28,
  },
  {
    id: 'bluebird',
    name: '파랑새의 성소',
    subName: '영혼의 상처 치유와 행복',
    path: '/bluebird',
    icon: '🐦',
    runeSymbol: 'ᛒ',
    runeName: 'Berkana',
    runeMeaning: '일상의 감사와 치유',
    description: '지친 마음에 일상의 평온과 행복, 따뜻한 감사의 온기를 되찾는 안식처',
    themeColor: '#38bdf8',
    accentGlow: 'rgba(56, 189, 248, 0.9)',
    defaultGaugePercent: 36,
  },
  {
    id: 'muse',
    name: '뮤즈 예술처방',
    subName: '명화·명시·명곡 삼위일체',
    path: '/muse',
    icon: '🎨',
    runeSymbol: 'ᚹ',
    runeName: 'Wunjo',
    runeMeaning: '기쁨과 예술적 공명',
    description: '고민과 감정에 공명하는 세계적 명작 3위 일체 큐레이션',
    themeColor: '#a855f7',
    accentGlow: 'rgba(168, 85, 247, 0.9)',
    defaultGaugePercent: 44,
  },
  {
    id: 'lettinggo',
    name: '레팅고 메서드',
    subName: '방하착 명상과 긴장 이완',
    path: '/heal',
    icon: '🧘',
    runeSymbol: 'ᛉ',
    runeName: 'Algiz',
    runeMeaning: '보호와 방하착 비움',
    description: '마음의 묵은 집착과 긴장을 편안하게 내려놓는 의식',
    themeColor: '#10b981',
    accentGlow: 'rgba(16, 185, 129, 0.9)',
    defaultGaugePercent: 52,
  },
  {
    id: 'hoponopono',
    name: '호오포노포노 정화',
    subName: '4마디 감정 정화 의식',
    path: '/heal',
    icon: '🌊',
    runeSymbol: 'ᚷ',
    runeName: 'Gebo',
    runeMeaning: '화해와 감정 정화',
    description: '미안합니다·용서하세요·감사합니다·사랑합니다 4마디 감정 정화',
    themeColor: '#06b6d4',
    accentGlow: 'rgba(6, 182, 212, 0.9)',
    defaultGaugePercent: 60,
  },
  {
    id: 'epilogue',
    name: '에필로그 밤 서재',
    subName: '영감의 밤 서재 일기',
    path: '/epilogue',
    icon: '📖',
    runeSymbol: 'ᚨ',
    runeName: 'Ansuz',
    runeMeaning: '영감과 하루 마감',
    description: '오늘의 영감과 감정을 한 편의 수필처럼 정리하는 회고',
    themeColor: '#34d399',
    accentGlow: 'rgba(52, 211, 153, 0.9)',
    defaultGaugePercent: 68,
  },
  {
    id: 'oracle',
    name: '오라클 타로',
    subName: '3장의 타로와 무의식 탐색',
    path: '/trinity',
    icon: '🔮',
    runeSymbol: 'ᛈ',
    runeName: 'Pertho',
    runeMeaning: '운명과 무의식 비의',
    description: '3장의 타로 카드로 무의식의 상징과 치유 메시지 도출',
    themeColor: '#c084fc',
    accentGlow: 'rgba(192, 132, 252, 0.9)',
    defaultGaugePercent: 76,
  },
  {
    id: 'handbook',
    name: '지혜의 핸드북',
    subName: '영혼의 안내서 & 바이블',
    path: '/handbook',
    icon: '🧭',
    runeSymbol: 'ᚱ',
    runeName: 'Raidho',
    runeMeaning: '영혼의 여정과 바이블',
    description: '삶의 방향과 지혜가 담긴 프리즘 영혼의 핸드북 가이드',
    themeColor: '#f59e0b',
    accentGlow: 'rgba(245, 158, 11, 0.9)',
    defaultGaugePercent: 82,
  },
  {
    id: 'library',
    name: '영혼의 도서관',
    subName: '프리즘 지식 아카이브',
    path: '/library',
    icon: '🏛️',
    runeSymbol: 'ᛗ',
    runeName: 'Mannaz',
    runeMeaning: '인간과 영혼의 지식',
    description: '모든 기록과 사유가 축적된 영혼의 도서관 아카이브',
    themeColor: '#6366f1',
    accentGlow: 'rgba(99, 102, 241, 0.9)',
    defaultGaugePercent: 88,
  },
  {
    id: 'hub',
    name: '프롤로그 허브',
    subName: '프리즘 우주의 중심',
    path: '/',
    icon: '🌌',
    runeSymbol: 'ᚲ',
    runeName: 'Kenaz',
    runeMeaning: '우주의 횃불과 중심',
    description: '모든 차원의 영감과 가능성이 수렴하는 우주의 시초 허브',
    themeColor: '#00f0ff',
    accentGlow: 'rgba(0, 240, 255, 0.9)',
    defaultGaugePercent: 94,
  },
];

/**
 * 현재 페이지 및 맥락에 맞춰 프리즘 전체 사이트/기능을 랭킹하여
 * 웜홀 시공간 스펙트럼에 차례대로 고르게 매핑합니다.
 */
export function getRankedWormholeApps(activeRoute: string): WormholeAppInfo[] {
  const norm = activeRoute.replace('/', '').toLowerCase() || 'hub';

  // 현재 앱과 동일한 앱은 맨 뒤로 보내고, 가장 적합한 연계 앱들을 상위로 우선순위 부여
  const priorityOrder: Record<string, string[]> = {
    trinity: ['muse', 'orb', 'orange', 'lucy', 'epilogue', 'bluebird', 'lettinggo', 'hoponopono', 'handbook', 'library', 'hub', 'oracle'],
    oracle: ['muse', 'orb', 'orange', 'lucy', 'epilogue', 'bluebird', 'lettinggo', 'hoponopono', 'handbook', 'library', 'hub', 'oracle'],
    muse: ['orange', 'epilogue', 'trinity', 'lucy', 'bluebird', 'orb', 'lettinggo', 'hoponopono', 'handbook', 'library', 'hub', 'muse'],
    orange: ['lettinggo', 'bluebird', 'epilogue', 'muse', 'oracle', 'orb', 'hoponopono', 'lucy', 'handbook', 'library', 'hub', 'orange'],
    heal: ['bluebird', 'orange', 'epilogue', 'muse', 'oracle', 'orb', 'lettinggo', 'hoponopono', 'lucy', 'handbook', 'library', 'hub'],
    bluebird: ['orange', 'muse', 'lettinggo', 'epilogue', 'oracle', 'orb', 'hoponopono', 'lucy', 'handbook', 'library', 'hub', 'bluebird'],
    epilogue: ['oracle', 'lettinggo', 'bluebird', 'muse', 'orange', 'orb', 'hoponopono', 'lucy', 'library', 'handbook', 'hub', 'epilogue'],
    orb: ['lucy', 'oracle', 'muse', 'orange', 'lettinggo', 'bluebird', 'epilogue', 'hoponopono', 'handbook', 'library', 'hub', 'orb'],
    chat: ['orb', 'oracle', 'muse', 'orange', 'bluebird', 'lettinggo', 'epilogue', 'hoponopono', 'handbook', 'library', 'hub', 'lucy'],
    lucy: ['orb', 'oracle', 'muse', 'orange', 'bluebird', 'lettinggo', 'epilogue', 'hoponopono', 'handbook', 'library', 'hub', 'lucy'],
    handbook: ['library', 'lucy', 'orb', 'oracle', 'muse', 'epilogue', 'bluebird', 'orange', 'lettinggo', 'hoponopono', 'hub', 'handbook'],
    library: ['handbook', 'lucy', 'orb', 'oracle', 'muse', 'epilogue', 'bluebird', 'orange', 'lettinggo', 'hoponopono', 'hub', 'library'],
    hub: ['orb', 'lucy', 'oracle', 'muse', 'orange', 'bluebird', 'lettinggo', 'epilogue', 'hoponopono', 'handbook', 'library', 'hub'],
  };

  const currentOrder = priorityOrder[norm] || [
    'orb',
    'lucy',
    'orange',
    'bluebird',
    'muse',
    'lettinggo',
    'hoponopono',
    'epilogue',
    'oracle',
    'handbook',
    'library',
    'hub',
  ];

  const appMap = new Map(ALL_WORMHOLE_APPS.map((a) => [a.id, a]));
  const ranked: WormholeAppInfo[] = [];

  // 우선순위 목록 순서대로 추가
  for (const id of currentOrder) {
    const app = appMap.get(id);
    if (app) ranked.push(app);
  }

  // 누락된 앱이 있다면 뒤에 추가
  for (const app of ALL_WORMHOLE_APPS) {
    if (!ranked.some((r) => r.id === app.id)) {
      ranked.push(app);
    }
  }

  // 10개 이상의 전천후 앱을 웜홀 스펙트럼(15% ~ 85%)에 비례 배치
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
 * 게이지 값(0.0 ~ 1.0)에 따라 현재 웜홀 구간에서 활성화된 앱을 정밀 매핑합니다.
 * 웜홀 구간(0.18 ~ 0.82)을 유저가 지정한 모든 프리즘 차원에 균등 분할 배정
 */
export function getWormholeAppByGauge(
  gauge: number,
  rankedApps: WormholeAppInfo[]
): { app: WormholeAppInfo; index: number; targetPercent: number } {
  const count = rankedApps.length;
  if (count === 0) {
    return {
      app: ALL_WORMHOLE_APPS[0],
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

