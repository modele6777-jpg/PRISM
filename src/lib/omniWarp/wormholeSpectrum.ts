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
export const ALL_WORMHOLE_APPS: WormholeAppInfo[] = [
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
    defaultGaugePercent: 20,
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
    defaultGaugePercent: 30,
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
    defaultGaugePercent: 40,
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
    defaultGaugePercent: 50,
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
    defaultGaugePercent: 70,
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
    defaultGaugePercent: 80,
  },
];

/**
 * 현재 페이지 및 맥락에 맞춰 7개 앱을 추천순(1위~7위)으로 정렬하여
 * 20%, 30%, 40%, 50%, 60%, 70%, 80% 게이지에 차례대로 매핑합니다.
 */
export function getRankedWormholeApps(activeRoute: string): WormholeAppInfo[] {
  const norm = activeRoute.replace('/', '').toLowerCase();

  // 현재 앱과 동일한 앱은 맨 뒤로 보내고, 가장 적합한 연계 앱들을 상위로 우선순위 부여
  const priorityOrder: Record<string, string[]> = {
    trinity: ['muse', 'orange', 'epilogue', 'bluebird', 'lettinggo', 'hoponopono', 'oracle'],
    oracle: ['muse', 'orange', 'epilogue', 'bluebird', 'lettinggo', 'hoponopono', 'oracle'],
    muse: ['orange', 'epilogue', 'trinity', 'bluebird', 'lettinggo', 'hoponopono', 'muse'],
    orange: ['lettinggo', 'bluebird', 'epilogue', 'muse', 'oracle', 'hoponopono', 'orange'],
    heal: ['bluebird', 'orange', 'epilogue', 'muse', 'oracle', 'lettinggo', 'hoponopono'],
    bluebird: ['orange', 'muse', 'lettinggo', 'epilogue', 'oracle', 'hoponopono', 'bluebird'],
    epilogue: ['oracle', 'lettinggo', 'bluebird', 'muse', 'orange', 'hoponopono', 'epilogue'],
    orb: ['oracle', 'muse', 'orange', 'lettinggo', 'bluebird', 'epilogue', 'hoponopono'],
  };

  const currentOrder = priorityOrder[norm] || [
    'orange',
    'bluebird',
    'muse',
    'lettinggo',
    'hoponopono',
    'epilogue',
    'oracle',
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

  // 7개 앱 각각에 20, 30, 40, 50, 60, 70, 80 % 고정 게이지 슬롯 부여
  const gaugeSteps = [20, 30, 40, 50, 60, 70, 80];
  return ranked.slice(0, 7).map((app, index) => ({
    ...app,
    defaultGaugePercent: gaugeSteps[index],
  }));
}

/**
 * 게이지 값(0.0 ~ 1.0)에 따라 현재 웜홀 구간에서 활성화된 앱 인덱스(0 ~ 6)를 반환합니다.
 * 20% (0.15~0.24) -> 0
 * 30% (0.25~0.34) -> 1
 * 40% (0.35~0.44) -> 2
 * 50% (0.45~0.54) -> 3
 * 60% (0.55~0.64) -> 4
 * 70% (0.65~0.74) -> 5
 * 80% (0.75~0.84) -> 6
 */
export function getWormholeAppByGauge(
  gauge: number,
  rankedApps: WormholeAppInfo[]
): { app: WormholeAppInfo; index: number; targetPercent: number } {
  const percent = gauge * 100;
  let index = 0;

  if (percent < 25) {
    index = 0;
  } else if (percent < 35) {
    index = 1;
  } else if (percent < 45) {
    index = 2;
  } else if (percent < 55) {
    index = 3;
  } else if (percent < 65) {
    index = 4;
  } else if (percent < 75) {
    index = 5;
  } else {
    index = 6;
  }

  const app = rankedApps[index] || rankedApps[0];
  return { app, index, targetPercent: app.defaultGaugePercent };
}
