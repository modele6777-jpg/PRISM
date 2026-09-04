import { sendPrismToss, type PrismTossPayload } from './prismToss';

export interface TossDestination {
  id: string;
  name: string;
  subName: string;
  icon: string;
  path: string;
  description: string;
  themeColor: string;
}

export const TOSS_DESTINATIONS: Record<string, TossDestination> = {
  muse: {
    id: 'muse',
    name: '뮤즈 예술처방',
    subName: '명화·명시·명곡 감상',
    icon: '🎨',
    path: '/muse',
    description: '고민과 상징에 공명하는 세계적 명작 3위 일체 큐레이션',
    themeColor: '#818cf8',
  },
  oracle: {
    id: 'oracle',
    name: '오라클 타로',
    subName: '내면아이 무의식 탐색',
    icon: '🔮',
    path: '/trinity',
    description: '3장의 타로 카드로 무의식의 상징과 치유 메시지 도출',
    themeColor: '#c084fc',
  },
  orange: {
    id: 'orange',
    name: '오렌지 5분 루틴',
    subName: '즉각 실행 타이머',
    icon: '🍊',
    path: '/orange',
    description: '망설임을 걷어내고 5분 안에 즉시 착수하는 포커스 루틴',
    themeColor: '#fb923c',
  },
  hoponopono: {
    id: 'hoponopono',
    name: '호오포노포노 정화',
    subName: '감정 상처 소멸 의식',
    icon: '🌊',
    path: '/heal',
    description: '미안합니다·용서하세요·감사합니다·사랑합니다 4마디 정화',
    themeColor: '#38bdf8',
  },
  epilogue: {
    id: 'epilogue',
    name: '에필로그 하루 마감',
    subName: '영감의 밤 서재 일기',
    icon: '📖',
    path: '/epilogue',
    description: '오늘의 영감과 감정을 한 편의 수필처럼 정리하는 회고',
    themeColor: '#34d399',
  },
  lucy: {
    id: 'lucy',
    name: '루시 심층 대화',
    subName: '방금 맥락 이어서 상담',
    icon: '✨',
    path: '/chat',
    description: '방금 마주한 고민과 상징의 기억을 들고 루시와 1:1 심층 대화',
    themeColor: '#c084fc',
  },
};

export interface ChannelTossRule {
  primary: TossDestination;
  secondary: TossDestination;
}

export const CHANNEL_TOSS_RULES: Record<string, ChannelTossRule> = {
  trinity: {
    primary: TOSS_DESTINATIONS.muse,
    secondary: TOSS_DESTINATIONS.orange,
  },
  oracle: {
    primary: TOSS_DESTINATIONS.muse,
    secondary: TOSS_DESTINATIONS.orange,
  },
  muse: {
    primary: TOSS_DESTINATIONS.epilogue,
    secondary: TOSS_DESTINATIONS.oracle,
  },
  bluebird: {
    primary: TOSS_DESTINATIONS.hoponopono,
    secondary: TOSS_DESTINATIONS.muse,
  },
  heal: {
    primary: TOSS_DESTINATIONS.muse,
    secondary: TOSS_DESTINATIONS.oracle,
  },
  orange: {
    primary: TOSS_DESTINATIONS.epilogue,
    secondary: TOSS_DESTINATIONS.oracle,
  },
  epilogue: {
    primary: TOSS_DESTINATIONS.oracle,
    secondary: TOSS_DESTINATIONS.muse,
  },
  lucy: {
    primary: TOSS_DESTINATIONS.muse,
    secondary: TOSS_DESTINATIONS.oracle,
  },
  hub: {
    primary: TOSS_DESTINATIONS.oracle,
    secondary: TOSS_DESTINATIONS.muse,
  },
};

export function getTossRule(currentChannel: string, contextHint?: any): ChannelTossRule {
  const norm = (currentChannel || '').toLowerCase();
  
  // 1. 텍스트 및 이전 활동 맥락 추출
  let text = '';
  if (typeof contextHint === 'string') {
    text = contextHint;
  } else if (contextHint && typeof contextHint === 'object') {
    text = contextHint.text || contextHint.content || contextHint.contextMessage || '';
    if (Array.isArray(contextHint.content)) {
      text = contextHint.content.map((c: any) => c.text || '').join(' ');
    }
  }

  // 2. 브라우저 최근 활동 맥락(Session Memory) 조회
  let recentOracleTime = 0;
  let recentEpilogueTime = 0;
  if (typeof window !== 'undefined') {
    try {
      const oracleItem = localStorage.getItem('prism_oracle_last_reading');
      if (oracleItem) recentOracleTime = JSON.parse(oracleItem)?.timestamp || 0;
      const epilogueItem = localStorage.getItem('prism_epilogue_last_saved');
      if (epilogueItem) recentEpilogueTime = JSON.parse(epilogueItem)?.timestamp || 0;
    } catch (_) {}
  }
  const isRecentOracle = Date.now() - recentOracleTime < 30 * 60 * 1000; // 30분 이내
  const isRecentEpilogue = Date.now() - recentEpilogueTime < 30 * 60 * 1000;

  // 3. 키워드 및 감정/의도(Intent) 분석
  const lowerText = text.toLowerCase();

  const isExecutionIntent = /실행|행동|시작|게으름|미루|집중|타이머|루틴|할일|의지|습관/.test(lowerText);
  const isFateOrChoiceIntent = /운명|선택|진로|사주|타로|앞날|방향|미래|기로|결정|어떻게 해야|사주팔자/.test(lowerText);
  const isDeepEmotionalCare = /상처|눈물|슬픔|우울|괴로움|용서|미안|치유|정화|가슴이 아파|트라우마/.test(lowerText);
  const isReflectionIntent = /정리|회고|기록|일기|감사|마무리|오늘 하루|생각이 많|밤|서재/.test(lowerText);
  const isArtInspiration = /예술|명화|명시|명곡|음악|시|그림|감성|영감|아름다움|도슨트/.test(lowerText);

  // 4. 맥락 기반 동적 1순위/2순위 자동 결정
  if (isExecutionIntent && !norm.includes('orange')) {
    return {
      primary: TOSS_DESTINATIONS.orange,
      secondary: TOSS_DESTINATIONS.epilogue,
    };
  }

  if (isFateOrChoiceIntent && !norm.includes('oracle') && !norm.includes('trinity')) {
    return {
      primary: TOSS_DESTINATIONS.oracle,
      secondary: TOSS_DESTINATIONS.muse,
    };
  }

  if (isDeepEmotionalCare && !norm.includes('heal') && !norm.includes('bluebird')) {
    return {
      primary: TOSS_DESTINATIONS.hoponopono,
      secondary: TOSS_DESTINATIONS.muse,
    };
  }

  if (isReflectionIntent && !norm.includes('epilogue')) {
    return {
      primary: TOSS_DESTINATIONS.epilogue,
      secondary: TOSS_DESTINATIONS.muse,
    };
  }

  if (isArtInspiration && !norm.includes('muse')) {
    return {
      primary: TOSS_DESTINATIONS.muse,
      secondary: TOSS_DESTINATIONS.epilogue,
    };
  }

  // 5. 최근 활동 이력(Memory) 기반 시너지 연계
  if (isRecentOracle && !norm.includes('muse')) {
    // 방금 오라클 타로를 봤다면 -> 타로 상징을 명화로 확장하는 뮤즈 예술처방 1순위
    return {
      primary: TOSS_DESTINATIONS.muse,
      secondary: TOSS_DESTINATIONS.epilogue,
    };
  }

  if (isRecentEpilogue && !norm.includes('orange')) {
    // 방금 일기를 썼다면 -> 내일의 루틴이나 예술 처방 연계
    return {
      primary: TOSS_DESTINATIONS.muse,
      secondary: TOSS_DESTINATIONS.orange,
    };
  }

  // 6. 기본 채널 규칙 매핑
  for (const [key, rule] of Object.entries(CHANNEL_TOSS_RULES)) {
    if (norm.includes(key)) return rule;
  }

  // 7. 정 연결할 게 없을 때: 메인은 뮤즈 예술처방, 사이드 백업은 루시 심층대화
  return {
    primary: TOSS_DESTINATIONS.muse,
    secondary: TOSS_DESTINATIONS.lucy,
  };
}

/** Execute smart toss with haptic feedback & auto navigation */
export function executeSmartToss(
  sourceApp: string,
  destination: TossDestination,
  contextData?: Partial<PrismTossPayload> & { text?: string }
): void {
  try {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(40);
    }
  } catch (_) {}

  const extractedMsg = contextData?.text || contextData?.contextMessage || `${sourceApp} 세션에서 연계된 토스`;

  sendPrismToss({
    sourceApp,
    targetApp: destination.id,
    actionType: 'smart_toss',
    contextMessage: extractedMsg,
    anchorArtworkTitle: contextData?.anchorArtworkTitle,
    anchorArtQuote: contextData?.anchorArtQuote,
    cards: contextData?.cards,
    tossedAt: Date.now(),
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('prism-navigate', { detail: { path: destination.path } }));
    window.dispatchEvent(new CustomEvent('nav-click-active', { detail: { path: destination.path } }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
