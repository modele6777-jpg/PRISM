import { safeLocalStorage } from '../utils/safeStorage';
import { ReBibleVerse, CanonicalReBibleBook, REBIBLE_CANONICAL_BOOKS } from '../types/rebible';
import { UnifiedMessage, STORAGE_KEYS } from './chatHistorySync';
import { loadLocalVerses, saveLocalVerses, saveVerseToFirestore, getLocalDateKey, getVerseDateKey, isVerseKeyDeleted, resolveTargetBooksForLucyMode } from './rebibleStorage';
import { invokeEpilogueSummaryLLM } from './ai';

export interface SyncEchoActivityLog {
  app: 'trinity' | 'orange' | 'bluebird' | 'heal' | 'muse' | 'hub' | 'lucy' | string;
  appName: string;
  category: 'tarot' | 'purification' | 'wellness' | 'dialogue' | 'reflection' | 'creative' | 'general';
  title: string;
  detail: string;
  icon?: string;
  timestamp: number;
}

export interface SyncEchoTopicDraft {
  id: string;
  bookTitle: CanonicalReBibleBook;
  bookIcon: string;
  bookSubtitle: string;
  title: string;
  fact: string; // 간결하게 요약된 그날의 활동 및 사건 (Fact)
  insight: string; // 기록된 여정을 바탕으로 맞춤 생성된 루시의 관점 지혜 구절 (Insight)
  reflection: string; // 나의 성찰
  emotions: string[];
  tags: string[];
  reference: string;
  sourceActivities: SyncEchoActivityLog[];
}

export interface SyncEchoDraft {
  dateKey: string;
  dateDisplay: string;
  topicDrafts: SyncEchoTopicDraft[]; // 7개의 성스러운 서(1권당 1개씩 총 7개)
  totalTopics: number;
  // Fallback / Single View
  context: string;
  guidance: string;
  reflection?: string;
  suggestedTitle: string;
  suggestedBook: string;
  suggestedChapter: number;
  suggestedVerse: number;
  suggestedReference: string;
  suggestedEmotions: string[];
  suggestedTags: string[];
  activityLogs: SyncEchoActivityLog[];
  activityCount: number;
  isAlreadyConsecrated: boolean;
  consecratedVerseId?: string;
}

export const BOOK_META_MAP: Record<CanonicalReBibleBook, { icon: string; subtitle: string; defaultEmotions: string[]; defaultTags: string[] }> = {
  '지혜의 서': {
    icon: '✨',
    subtitle: '루시와의 영혼 문답 · 5대 지능 올인원 상담',
    defaultEmotions: ['통합', '자각', '사랑', '충만'],
    defaultTags: ['루시', '영혼대화', '지혜의서', '마스터상담']
  },
  '성찰의 서': {
    icon: '🍊',
    subtitle: '감정 연금술 · 소원의 우물 · 제1원칙 전략 성찰',
    defaultEmotions: ['명료함', '통찰', '연금술', '확신'],
    defaultTags: ['오렌지', '감정연금술', '성찰의서', '소원의우물']
  },
  '운명의 서': {
    icon: '🔮',
    subtitle: '타로 스프레드 · 사주 원국 · 점성 계시',
    defaultEmotions: ['직관', '수용', '용기', '신뢰'],
    defaultTags: ['트리니티', '타로리딩', '운명의서', '영적이정표']
  },
  '치유의 서': {
    icon: '🌿',
    subtitle: '1분 호흡 명상 · 세도나 방하착 · 생체 조율',
    defaultEmotions: ['치유', '이완', '생명력', '안식'],
    defaultTags: ['아우라', '1분명상', '치유의서', '세도나']
  },
  '정화의 서': {
    icon: '🕊️',
    subtitle: '호오포노포노 정화 의식 · 파랑새의 비밀쪽지',
    defaultEmotions: ['정화', '용서', '해방', '평온'],
    defaultTags: ['블루버드', '호오포노포노', '정화의서', '비밀쪽지']
  },
  '영감의 서': {
    icon: '🎨',
    subtitle: '오늘의 예술 추천 · 오디오 도슨트 · 창작 영감',
    defaultEmotions: ['영감', '환희', '창조', '경이'],
    defaultTags: ['뮤즈', '예술추천', '영감의서', '도슨트']
  },
  '각성의 서': {
    icon: '📖',
    subtitle: '일상의 영적 자각 · 프리즘 통합 여정',
    defaultEmotions: ['각성', '현존', '감사', '성장'],
    defaultTags: ['프리즘', '통합여정', '각성의서', '라이프바이탈']
  }
};

function getTodayDateKey(): string {
  return getLocalDateKey();
}

function getTodayDateDisplay(): string {
  const now = new Date();
  return now.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
}

function tryParseJson(key: string): any {
  if (typeof window === 'undefined') return null;
  try {
    const raw = safeLocalStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * 1. 활동 로그들을 7개의 서재별로 깊이 있고 구체적인 서사로 요약 정리하는 함수 (Fact Summarizer)
 */
export function summarizeBookActivities(
  bookTitle: CanonicalReBibleBook,
  logs: SyncEchoActivityLog[],
  dateDisplay: string
): { title: string; fact: string; emotions: string[]; tags: string[] } {
  const meta = BOOK_META_MAP[bookTitle];
  const emotions = [...meta.defaultEmotions];
  const tags = [...meta.defaultTags];

  if (logs.length === 0) {
    // 해당 날짜에 명시적인 활동 로그가 없을 때의 깊이 있는 테마별 자각 서사
    switch (bookTitle) {
      case '운명의 서':
        return {
          title: '흐름에 맡기는 신뢰와 영적 나침반',
          fact: '외부의 불확실성에 휘둘리기보다 보이지 않는 삶의 질서와 타이밍을 온전히 신뢰하는 내면의 나침반을 세움. 조급한 계산을 내려놓고 우주의 섭리를 믿으며 고요하고 당당한 발걸음을 내딛음.',
          emotions: ['평온', '신뢰', '현존', '수용'],
          tags: [...tags, '신뢰의여정', '하늘의타이밍']
        };
      case '정화의 서':
        return {
          title: '기억의 비움과 순수한 백지의 평온',
          fact: '마음속에 차오른 불필요한 집착과 낡은 기억의 잔재를 의식적으로 비워내고 순수한 백지 상태의 평온을 지킴. 타인과 세상을 탓하지 않고 내면의 중심에서 일체의 갈등을 흘려보내는 정화의 시간을 가짐.',
          emotions: ['정화', '평온', '비움', '해방'],
          tags: [...tags, '기억정화', '순수백지']
        };
      case '치유의 서':
        return {
          title: '깊은 호흡과 생명력의 조화로운 회복',
          fact: '자연스럽고 깊은 호흡을 통해 몸과 마음에 쌓인 피로와 긴장을 부드럽게 이완함. 억지로 결과를 통제하려는 애씀을 내려놓고 생명력의 자연스러운 회복과 평온한 안식을 온전히 누림.',
          emotions: ['이완', '생명력', '회복', '안식'],
          tags: [...tags, '생체조율', '이완과쉼']
        };
      case '성찰의 서':
        return {
          title: '본질을 향한 응시와 내면의 중심',
          fact: '일상의 번잡함을 걷어내고 내면의 가장 본질적인 가치와 소망을 되새김. 감정의 파도에 휩쓸리지 않고 제1원칙의 관점으로 사유하며 확고한 내면의 중심과 명료함을 정립함.',
          emotions: ['명료함', '성찰', '중심', '통찰'],
          tags: [...tags, '본질사유', '제1원칙']
        };
      case '영감의 서':
        return {
          title: '일상의 아름다움과 창조성의 불꽃',
          fact: '매 순간 스치는 일상의 빛과 풍경 속에서 예술적 감수성과 창조적 영감을 발견함. 삶 자체를 하나의 아름다운 명작으로 대하며 가슴 뛰는 미적 감각과 감사의 파동을 깨움.',
          emotions: ['영감', '감사', '경이', '창조'],
          tags: [...tags, '창조영감', '미적각성']
        };
      case '지혜의 서':
        return {
          title: '영혼의 참된 침묵과 내적 명료함',
          fact: '밖을 향하던 시선을 내면으로 돌려 영혼의 참된 침묵과 조율을 나눔. 5대 지능의 거울에 비춘 나의 상태를 점검하고 흔들리지 않는 내적 명료함과 참된 지혜의 나침반을 세움.',
          emotions: ['자각', '지혜', '평화', '통합'],
          tags: [...tags, '영혼조율', '내면지혜']
        };
      case '각성의 서':
      default:
        return {
          title: '일상의 영적 자각과 현존의 기쁨',
          fact: '프리즘 라이프 전반을 아우르며 주어진 오늘 하루의 소중함에 감사함. 사소한 일상의 한 걸음 속에서도 삶의 깊은 진실을 발견하며 온전한 현존의 기쁨을 삶의 중심에 뿌리내림.',
          emotions: ['각성', '감사', '충만', '현존'],
          tags: [...tags, '통합각성', '현존의빛']
        };
    }
  }

  // 활동 로그가 1건 이상 있는 경우: 상세한 내용들을 입체적으로 추출하여 서사 구축
  const rawDetails = logs.map((l) => l.detail.trim()).filter(Boolean);
  const titles = logs.map((l) => l.title.trim()).filter(Boolean);

  switch (bookTitle) {
    case '운명의 서': {
      const cardMatches = logs
        .map((l) => l.title.match(/\[([^\]]+)\]/)?.[1] || '')
        .filter(Boolean);
      const cardName = cardMatches[0] || '운명의 계시';
      const mainDetail = rawDetails[0] || '영적 나침반을 조율함';
      const extraDetails = rawDetails.slice(1, 3).join(' · ');

      return {
        title: `타로 [${cardName}]와 운명의 계시`,
        fact: `트리니티 타로 리딩을 통해 [${cardName}] 카드를 소환하여 운명의 흐름과 영적 나침반을 점검함. 카드와 오라클이 전한 핵심 진단: "${mainDetail}".${extraDetails ? ` 연계된 리딩 통찰: "${extraDetails}".` : ''} 외부의 불확실성을 넘어 하늘의 타이밍을 온전히 신뢰하며 주도적인 결단과 평온을 확립함.`,
        emotions: ['직관', '신뢰', '용기', '수용'],
        tags: [...tags, ...cardMatches.slice(0, 3)]
      };
    }

    case '정화의 서': {
      const targetMatches = logs.map((l) => l.title.match(/\[([^\]]+)\]/)?.[1] || '').filter(Boolean);
      const targetSubject = targetMatches[0] || '마음의 기억';
      const mainDetail = rawDetails[0] || '잠재의식 내면 정화';
      const noteDetail = rawDetails.find((d) => d.includes('쪽지') || d.includes('마음') || d.length > 10) || '';

      return {
        title: `호오포노포노 정화와 마음 비우기`,
        fact: `블루버드 정화 의식을 통해 [${targetSubject}]에 얽힌 잠재의식의 낡은 기억과 감정의 응어리를 마주함. "미안합니다, 용서하세요, 고맙습니다, 사랑합니다"의 4가지 진언을 새기며 내면을 치유함.${noteDetail ? ` 파랑새 비밀쪽지에 "${noteDetail}"(이)라는 진솔한 고백을 남기고` : ''} 모든 갈등의 매듭을 풀어내어 순수한 백지 상태의 평온을 회복함.`,
        emotions: ['정화', '용서', '해방', '평온'],
        tags: [...tags, '정화의식', ...targetMatches.slice(0, 2)]
      };
    }

    case '치유의 서': {
      const themeMatches = logs.map((l) => l.title.match(/\[([^\]]+)\]/)?.[1] || '').filter(Boolean);
      const themeName = themeMatches[0] || '호흡 명상';
      const mainDetail = rawDetails[0] || '신체 이완 및 호흡 조율';
      const affirmations = rawDetails.filter((d) => !d.includes('수행 완료')).slice(0, 2).join(' · ');

      return {
        title: `1분 호흡과 방하착으로 되찾은 활력`,
        fact: `아우라/힐에서 [${themeName}]을(를) 실천하며 신체와 감정에 누적된 긴장을 부드럽게 이완함. 실천 내용: "${mainDetail}".${affirmations ? ` 호흡과 함께 "${affirmations}"(이)라는 긍정 확언을 마음에 각인하고,` : ''} 쥐고 있던 통제욕구를 깊은 날숨으로 방하착(放下着)하여 본래의 조화로운 생체 리듬과 생명력을 회복함.`,
        emotions: ['치유', '이완', '생명력', '안식'],
        tags: [...tags, '1분호흡', '방하착', ...themeMatches.slice(0, 2)]
      };
    }

    case '성찰의 서': {
      const emotionMatches = logs.map((l) => l.title.match(/\[([^\]]+)\]/)?.[1] || '').filter(Boolean);
      const targetName = emotionMatches[0] || '감정 연금술';
      const mainDetail = rawDetails[0] || '제1원칙 본질 통찰';
      const wishText = rawDetails.find((d) => d.includes('소원') || d.length > 5) || '';

      return {
        title: `감정 연금술과 소원의 우물 성찰`,
        fact: `오렌지 비밀의 방에서 [${targetName}]을(를) 제1원칙으로 분석하여 감정의 핵을 마주하고 사유를 정립함. 성찰 내용: "${mainDetail}".${wishText ? ` 소원의 우물에 "${wishText}"의 소망을 띄워 보내며,` : ''} 막연한 불안과 두려움을 명료한 확신과 생산적인 실천력으로 승화시킴.`,
        emotions: ['명료함', '통찰', '연금술', '확신'],
        tags: [...tags, '감정연금술', '제1원칙', ...emotionMatches.slice(0, 2)]
      };
    }

    case '영감의 서': {
      const artMatches = logs.map((l) => l.title.match(/\[([^\]]+)\]/)?.[1] || '').filter(Boolean);
      const artName = artMatches[0] || '예술 작품';
      const mainDetail = rawDetails[0] || '예술적 영감과 창조성 충전';

      return {
        title: `예술적 공명과 창조성의 불꽃`,
        fact: `뮤즈 명작 예술 도슨트와 영감 카드를 통해 [${artName}]을(를) 감상하며 깊은 예술적 공명을 나눔. 작품 속 미적 해설과 영감: "${mainDetail}". 일상의 번잡함을 잊고 찰나의 아름다움에 몰입하여 가슴 뛰는 창조적 파동과 미적 감수성을 충전함.`,
        emotions: ['영감', '환희', '창조', '경이'],
        tags: [...tags, '예술감상', '뮤즈도슨트', ...artMatches.slice(0, 2)]
      };
    }

    case '지혜의 서': {
      const dialogueLogs = logs.filter((l) => l.category === 'dialogue' || l.appName.includes('루시'));
      const mainLog = dialogueLogs[0] || logs[0];
      const detailText = mainLog ? mainLog.detail : '영혼의 본질적 문답을 나눔';

      return {
        title: `루시와 나눈 영혼의 대화와 해답`,
        fact: `루시와의 5대 지능 올인원 상담을 통해 삶의 중요한 질문과 고민을 마주하고 심도 있는 대화를 나눔. 문답 요약: ${detailText}. 외부의 평가나 조급함에 흔들리지 않고 내면의 직관과 참된 지혜의 나침반을 명확히 세움.`,
        emotions: ['통합', '자각', '사랑', '충만'],
        tags: [...tags, '루시대화', '5대지능', '인생상담']
      };
    }

    case '각성의 서':
    default: {
      const summaryTitles = Array.from(new Set(titles)).slice(0, 4).join(', ');
      return {
        title: `프리즘 통합 순례와 현존의 자각`,
        fact: `프리즘 에코시스템 전반을 조화롭게 순례하며 [${summaryTitles || '오늘의 다양한 마음챙김 활동'}]을(를) 완수함. 운명, 정화, 치유, 성찰, 영감, 지혜의 다차원적 활동을 통해 오늘의 라이프 바이탈과 소울 바이브를 정돈하고 깨어 있는 현존의 기쁨을 삶의 중심에 확립함.`,
        emotions: ['각성', '현존', '감사', '성장'],
        tags: [...tags, '통합순례', '전인적각성']
      };
    }
  }
}

/**
 * 2. 기록된 여정을 바탕으로 고정된 판박이가 아닌 '맞춤형 지혜의 구절'을 동적으로 합성하는 엔진 (Dynamic Wisdom Generator)
 */
export function generateDynamicWisdomInsight(
  bookTitle: CanonicalReBibleBook,
  factSummary: string,
  logs: SyncEchoActivityLog[]
): { insight: string; reflection: string } {
  // 1. 운명의 서 (Trinity)
  if (bookTitle === '운명의 서') {
    const cardNames = logs
      .map((l) => l.title.match(/\[([^\]]+)\]/)?.[1] || '')
      .filter(Boolean);

    let specificWisdom = '';
    if (cardNames.some((c) => c.includes('바보') || c.includes('Fool'))) {
      specificWisdom = '새로운 여정은 완벽한 계산이 아니라, 미지의 세계를 향해 내딛는 순수한 첫 발걸음에서 시작됩니다. 두려움을 호기심으로 바꾸세요.';
    } else if (cardNames.some((c) => c.includes('마법사') || c.includes('Magician'))) {
      specificWisdom = '당신 안에는 이미 생각한 것을 물질계에 구현할 모든 신성한 도구와 권능이 갖추어져 있습니다. 망설이지 말고 의도를 명확히 세우십시오.';
    } else if (cardNames.some((c) => c.includes('여황제') || c.includes('Empress') || c.includes('풍요'))) {
      specificWisdom = '풍요는 밖에서 쟁취하는 것이 아니라, 이미 내면에 깃든 생명력을 온화하게 꽃피우는 데서 피어납니다. 스스로를 귀하게 대접하세요.';
    } else if (cardNames.some((c) => c.includes('황제') || c.includes('Emperor') || c.includes('전차'))) {
      specificWisdom = '진정한 권위와 승리는 타인을 지배함에 있지 않고, 내면의 흔들리는 감정들을 하나의 숭고한 목표로 통합하는 자기 절제에서 완성됩니다.';
    } else if (cardNames.some((c) => c.includes('은둔자') || c.includes('Hermit') || c.includes('달'))) {
      specificWisdom = '어둠 속에서 등불을 켜는 것은 바깥 세상을 비추기 위함이 아니라, 내 영혼의 고요한 중심을 마주하기 위함입니다. 침묵 속의 지혜를 신뢰하세요.';
    } else if (cardNames.some((c) => c.includes('심판') || c.includes('Judgement') || c.includes('세계') || c.includes('World'))) {
      specificWisdom = '낡은 허물을 벗고 본래의 빛나는 자아로 거듭나는 위대한 전환점에 도달했습니다. 지나간 장(Chapter)을 감사함으로 덮고 새 차원을 맞이하십시오.';
    } else {
      specificWisdom = '운명의 수레바퀴는 당신을 속박하기 위해 돌지 않으며, 더 큰 자유와 영적 도약을 비추기 위해 움직입니다. 하늘의 타이밍을 온전히 신뢰하십시오.';
    }

    return {
      insight: `운명은 정해진 굴레가 아니라, 당신의 의식 상태가 우주의 거울에 투영되어 피어나는 거룩한 창조의 장입니다. 오늘 기록된 여정처럼 ${specificWisdom}`,
      reflection: '운명의 타이밍을 신뢰하며 내 안의 창조적 권능으로 최고의 오늘을 빚어낸다.'
    };
  }

  // 2. 정화의 서 (Bluebird)
  if (bookTitle === '정화의 서') {
    const hasSecretNote = logs.some((l) => l.appName.includes('비밀쪽지') || l.category === 'purification');
    return {
      insight: hasSecretNote
        ? `타인과의 갈등이나 마음에 차오른 무거운 기억은 외부의 문제가 아니라, 내 잠재의식 속에서 낡은 필름처럼 반복되는 기억의 투사일 뿐입니다. '미안합니다, 용서하세요, 고맙습니다, 사랑합니다'의 네 마디로 그 기억을 온전히 정화할 때, 엉켜 있던 매듭은 풀리고 그 자리에 신성의 거룩한 평온이 채워집니다.`
        : `마음의 백지를 흐리는 어떠한 상념도 본래의 온전한 나를 해칠 수 없습니다. 숨을 고르고 내면의 기억을 맑게 닦아낼 때, 세상은 거짓말처럼 가장 평화로운 안식처로 변모합니다.`,
      reflection: '문제를 밖에서 탓하지 않고, 내 안의 기억을 정화하여 순수한 사랑과 평온을 선택한다.'
    };
  }

  // 3. 치유의 서 (Aura & Heal)
  if (bookTitle === '치유의 서') {
    return {
      insight: `육체와 감정의 긴장은 통제하려는 집착과 미래에 대한 두려움에서 피어납니다. 숨을 깊이 들이쉬고 내쉬며 온몸의 힘을 뺄 때, 치유는 억지로 만드는 것이 아니라 스스로 일어나는 자연의 법칙임을 깨닫게 됩니다. 오늘 마주한 이 고요한 쉼이 삶을 지탱하는 가장 단단한 반석입니다.`,
      reflection: '쥐고 있던 통제욕구를 내려놓고, 깊은 호흡 속에서 온전한 생명력을 회복한다.'
    };
  }

  // 4. 성찰의 서 (Orange)
  if (bookTitle === '성찰의 서') {
    return {
      insight: `삶에서 겪는 불안과 혼란은 헛된 고통이 아니라, 영혼의 지혜를 제련하는 연금술의 도가니입니다. 겉으로 드러난 현상에 휘둘리지 않고 제1원칙으로 파고들어 감정의 핵을 마주할 때, 두려움의 납은 흔들리지 않는 확신의 황금으로 승화됩니다. 우물에 띄운 소망은 이미 현실로 피어나기 시작했습니다.`,
      reflection: '감정의 소용돌이를 넘어 본질적인 원리에 집중하고 확신의 한 걸음을 내딛는다.'
    };
  }

  // 5. 영감의 서 (Muse)
  if (bookTitle === '영감의 서') {
    return {
      insight: `아름다움은 영혼이 신성을 기억해내는 가장 직접적이고 순수한 통로입니다. 예술과 음악이 전하는 숭고한 전율은 굳어 있던 의식을 단숨에 열어젖히고 창조성의 불꽃을 지핍니다. 오늘 감상한 명작의 빛을 가슴에 품고, 당신의 삶이라는 위대한 캔버스를 찬란한 색채로 채워나가십시오.`,
      reflection: '예술의 감동을 마음에 품고, 나의 하루를 하나의 거룩한 작품으로 빚어낸다.'
    };
  }

  // 6. 지혜의 서 (Lucy)
  if (bookTitle === '지혜의 서') {
    return {
      insight: `모든 질문 속에는 이미 그 질문을 던진 영혼의 해답이 씨앗처럼 깃들어 있습니다. 5대 지능의 거울을 통해 나 자신을 온전히 비추어 볼 때, 흩어졌던 마음의 조각들은 하나의 명쾌한 진실로 통합됩니다. 당신은 이미 당신이 가야 할 길과 내면의 참된 평화를 알고 있습니다.`,
      reflection: '내 안의 깊은 직관과 지혜를 신뢰하며, 언제나 맑은 의식으로 깨어 있는다.'
    };
  }

  // 7. 각성의 서 (Prism & Hub)
  return {
    insight: `매 순간 일어나는 모든 경험은 영혼의 온전한 각성을 위해 정교하게 안배된 신성한 배움입니다. 평범해 보이는 일상의 작은 한 걸음 속에서도 삶의 가장 심오한 진리를 발견할 수 있습니다. 현존하는 이 찰나의 순간이야말로 영원과 닿아 있는 유일한 진실입니다.`,
    reflection: '일상의 모든 순간을 축복과 배움으로 수용하며 현존의 기쁨을 누린다.'
  };
}

/**
 * 3. 오늘 날짜의 활동 데이터를 7개의 서재로 그룹화하여
 * 정확히 7개의 단일 기록 초안(1권당 1개)을 생성합니다.
 */
export function buildTodaySyncEchoDraft(existingVerses: ReBibleVerse[] = []): SyncEchoDraft {
  const todayKey = getTodayDateKey();
  const dateDisplay = getTodayDateDisplay();

  const logsByBook: Record<CanonicalReBibleBook, SyncEchoActivityLog[]> = {
    '운명의 서': [],
    '정화의 서': [],
    '치유의 서': [],
    '성찰의 서': [],
    '영감의 서': [],
    '지혜의 서': [],
    '각성의 서': []
  };

  const allCollectedLogs: SyncEchoActivityLog[] = [];

  // (1) Omni Feature History
  try {
    const omniRaw = safeLocalStorage.getItem('prism_omni_feature_history');
    if (omniRaw) {
      const omniList: any[] = JSON.parse(omniRaw);
      if (Array.isArray(omniList)) {
        omniList
          .filter((item) => item.dateKey === todayKey || (item.timestamp && getLocalDateKey(item.timestamp) === todayKey))
          .forEach((entry) => {
            const log: SyncEchoActivityLog = {
              app: entry.app || 'prism',
              appName: entry.appName || '프리즘 활동',
              category: 'general',
              title: entry.featureName || '활동 기록',
              detail: entry.summary || '수행 완료',
              icon: '✨',
              timestamp: entry.timestamp || Date.now()
            };
            allCollectedLogs.push(log);
            logsByBook['각성의 서'].push(log);
          });
      }
    }
  } catch (_) {}

  // (2) Trinity Tarot & Saju (운명의 서)
  const trinityOracle = tryParseJson(`prism_daily_oracle_trinity_${todayKey}`) || tryParseJson(`prism_latest_daily_trinity`);
  if (trinityOracle && (trinityOracle.dateKey === todayKey || !trinityOracle.dateKey)) {
    const cardName = trinityOracle.cardName || trinityOracle.drawnCard?.nameKo || trinityOracle.symbol || '운명의 타로';
    const diag = trinityOracle.diagnosis || trinityOracle.summary || '새로운 가능성의 문이 열리는 날';
    const remedyText = trinityOracle.remedy ? ` (처방 및 지침: ${trinityOracle.remedy})` : '';
    const log: SyncEchoActivityLog = {
      app: 'trinity',
      appName: '트리니티 타로',
      category: 'tarot',
      title: `타로 리딩 [${cardName}]`,
      detail: `${diag}${remedyText}`,
      icon: '🔮',
      timestamp: trinityOracle.timestamp || Date.now()
    };
    allCollectedLogs.push(log);
    logsByBook['운명의 서'].push(log);
  }

  try {
    const tarotHist = tryParseJson('prism_trinity_tarot_history') || tryParseJson('trinity_tarot_history');
    if (Array.isArray(tarotHist)) {
      tarotHist
        .filter((th: any) => (th.dateKey || (th.timestamp ? getLocalDateKey(th.timestamp) : '')) === todayKey)
        .forEach((th: any) => {
          const readingText = th.reading || th.summary || th.interpretation || '운명의 흐름과 영적 나침반 통찰';
          const log: SyncEchoActivityLog = {
            app: 'trinity',
            appName: '트리니티 타로 리딩',
            category: 'tarot',
            title: `타로 스프레드 [${th.cardName || th.title || '운명의 카드'}]`,
            detail: `${th.question ? `질문: "${th.question}" ↳ ` : ''}${readingText}`,
            icon: '🔮',
            timestamp: th.timestamp || Date.now()
          };
          allCollectedLogs.push(log);
          logsByBook['운명의 서'].push(log);
        });
    }
  } catch (_) {}

  // (3) Bluebird Ho'oponopono & Secret Notes (정화의 서)
  const bluebirdOracle = tryParseJson(`prism_daily_oracle_bluebird_${todayKey}`) || tryParseJson(`prism_latest_daily_bluebird`);
  if (bluebirdOracle && (bluebirdOracle.dateKey === todayKey || !bluebirdOracle.dateKey)) {
    const cardName = bluebirdOracle.cardName || bluebirdOracle.data?.drawnCard?.name || '평온의 호오포노포노';
    const diag = bluebirdOracle.diagnosis || bluebirdOracle.summary || '잠재의식 내면 정화 의식';
    const log: SyncEchoActivityLog = {
      app: 'bluebird',
      appName: '블루버드 정화',
      category: 'purification',
      title: `호오포노포노 정화 [${cardName}]`,
      detail: `${diag}${bluebirdOracle.remedy ? ` (정화 메시지: ${bluebirdOracle.remedy})` : ''}`,
      icon: '🕊️',
      timestamp: bluebirdOracle.timestamp || Date.now()
    };
    allCollectedLogs.push(log);
    logsByBook['정화의 서'].push(log);
  }

  try {
    const lastResultRaw = safeLocalStorage.getItem('hoponopono_last_result');
    if (lastResultRaw) {
      const lastRes = JSON.parse(lastResultRaw);
      const subject = safeLocalStorage.getItem('hoponopono_last_subject') || lastRes.subject || '마음의 갈등';
      const log: SyncEchoActivityLog = {
        app: 'bluebird',
        appName: '호오포노포노 정화 실천',
        category: 'purification',
        title: `정화 실천 [${subject}]`,
        detail: `정화 대상: "${subject}"에 대해 4가지 진언을 새기고 내면의 기억을 순수하게 비워냄.`,
        icon: '🕊️',
        timestamp: Date.now()
      };
      allCollectedLogs.push(log);
      logsByBook['정화의 서'].push(log);
    }
  } catch (_) {}

  try {
    const secretNotes = tryParseJson('bluebird_secret_notes_v1');
    if (Array.isArray(secretNotes)) {
      secretNotes.filter((n: any) => n.dateKey === todayKey).forEach((note: any) => {
        const fullContent = note.content || note.title || '비밀쪽지 마음 고백';
        const log: SyncEchoActivityLog = {
          app: 'bluebird',
          appName: '파랑새의 비밀쪽지',
          category: 'purification',
          title: `마음의 기록 [${note.moodTag || '비밀쪽지'}]`,
          detail: fullContent,
          icon: '💌',
          timestamp: note.createdAt || Date.now()
        };
        allCollectedLogs.push(log);
        logsByBook['정화의 서'].push(log);
      });
    }
  } catch (_) {}

  // (4) Heal & Aura 1-Min Breath / Sedona (치유의 서)
  const healOracle = tryParseJson(`prism_daily_oracle_heal_${todayKey}`) || tryParseJson(`prism_latest_daily_heal`);
  if (healOracle && (healOracle.dateKey === todayKey || !healOracle.dateKey)) {
    const cardName = healOracle.cardName || healOracle.drawnCard?.nameKo || '세도나 방하착 명상';
    const diag = healOracle.diagnosis || healOracle.summary || '신체 이완 및 감정 내려놓기';
    const log: SyncEchoActivityLog = {
      app: 'heal',
      appName: '아우라/힐 조율',
      category: 'wellness',
      title: `세도나 방하착 & 생체조율 [${cardName}]`,
      detail: diag,
      icon: '🌿',
      timestamp: healOracle.timestamp || Date.now()
    };
    allCollectedLogs.push(log);
    logsByBook['치유의 서'].push(log);
  }

  try {
    const meditationKeys = Object.keys(localStorage).filter((k) => k.startsWith('aura_1min_history_'));
    meditationKeys.forEach((k) => {
      const parsed = tryParseJson(k);
      if (Array.isArray(parsed)) {
        parsed.filter((r: any) => r.completedAt && getLocalDateKey(r.completedAt) === todayKey).forEach((record: any) => {
          const log: SyncEchoActivityLog = {
            app: 'heal',
            appName: '아우라 1분 명상',
            category: 'wellness',
            title: `1분 호흡 명상 [${record.themeTitle || '마음챙김'}]`,
            detail: `호흡 확언: "${record.affirmation || '숨을 깊이 들이쉬고 내쉬며 몸과 마음을 이완함'}" (시간: ${record.durationSeconds || 60}초)`,
            icon: '⏱️',
            timestamp: record.completedAt || Date.now()
          };
          allCollectedLogs.push(log);
          logsByBook['치유의 서'].push(log);
        });
      }
    });
  } catch (_) {}

  // (5) Orange Emotion Alchemy & Wishing Well (성찰의 서)
  const orangeOracle = tryParseJson(`prism_daily_oracle_orange_${todayKey}`) || tryParseJson(`prism_latest_daily_orange`);
  if (orangeOracle && (orangeOracle.dateKey === todayKey || !orangeOracle.dateKey)) {
    const cardName = orangeOracle.cardName || orangeOracle.data?.drawnCard?.name || '감정 연금술 성찰';
    const diag = orangeOracle.diagnosis || orangeOracle.summary || '비밀의 방 마음 성찰';
    const log: SyncEchoActivityLog = {
      app: 'orange',
      appName: '오렌지 성찰',
      category: 'reflection',
      title: `감정 연금술 [${cardName}]`,
      detail: diag,
      icon: '🍊',
      timestamp: orangeOracle.timestamp || Date.now()
    };
    allCollectedLogs.push(log);
    logsByBook['성찰의 서'].push(log);
  }

  try {
    const wishes = tryParseJson('wishing_well_wishes_v1');
    if (Array.isArray(wishes)) {
      wishes.filter((w: any) => w.createdAt && getLocalDateKey(w.createdAt) === todayKey).forEach((wish: any) => {
        const wishContent = wish.text || wish.content || '소원의 우물 소망';
        const log: SyncEchoActivityLog = {
          app: 'orange',
          appName: '소원의 우물',
          category: 'reflection',
          title: `소원 띄우기 [${wish.category || '소망'}]`,
          detail: `띄운 소망: "${wishContent}"`,
          icon: '🌊',
          timestamp: wish.createdAt || Date.now()
        };
        allCollectedLogs.push(log);
        logsByBook['성찰의 서'].push(log);
      });
    }
  } catch (_) {}

  // (6) Muse Art Inspiration & Docent (영감의 서)
  const museOracle = tryParseJson(`prism_daily_oracle_muse_${todayKey}`) || tryParseJson(`prism_latest_daily_muse`);
  if (museOracle && (museOracle.dateKey === todayKey || !museOracle.dateKey)) {
    const cardName = museOracle.cardName || museOracle.data?.activeCard?.name || '뮤즈 영감 카드';
    const diag = museOracle.diagnosis || museOracle.summary || '창작과 영감의 불꽃';
    const log: SyncEchoActivityLog = {
      app: 'muse',
      appName: '뮤즈 영감',
      category: 'creative',
      title: `창작 영감 [${cardName}]`,
      detail: diag,
      icon: '🎨',
      timestamp: museOracle.timestamp || Date.now()
    };
    allCollectedLogs.push(log);
    logsByBook['영감의 서'].push(log);
  }

  try {
    const favoriteArts = tryParseJson('prism_muse_favorite_arts');
    if (Array.isArray(favoriteArts)) {
      favoriteArts.forEach((art: any) => {
        const desc = art.description || art.commentary || '명작 예술 감상';
        const log: SyncEchoActivityLog = {
          app: 'muse',
          appName: '뮤즈 예술도슨트',
          category: 'creative',
          title: `명작 감상 [${art.artist || '거장'} - ${art.title || '예술 작품'}]`,
          detail: `화가: ${art.artist || '거장'}${art.year ? ` (${art.year})` : ''} ↳ 해설: "${desc}"`,
          icon: '🖼️',
          timestamp: art.timestamp || Date.now()
        };
        allCollectedLogs.push(log);
        logsByBook['영감의 서'].push(log);
      });
    }
  } catch (_) {}

  // (7) Lucy Soul Dialogue (지혜의 서)
  try {
    const rawMessages = safeLocalStorage.getItem(STORAGE_KEYS.PRIMARY_V3) || safeLocalStorage.getItem(STORAGE_KEYS.LEGACY_OBJECT);
    if (rawMessages) {
      const parsed = JSON.parse(rawMessages);
      let list: UnifiedMessage[] = [];
      if (Array.isArray(parsed)) {
        list = parsed;
      } else if (parsed && typeof parsed === 'object') {
        list = parsed.lucy || parsed.messages || [];
      }

      if (Array.isArray(list) && list.length > 0) {
        const todayMs = new Date().setHours(0, 0, 0, 0);
        const recentMessages = list.filter((m) => {
          if (!m.timestamp) return true;
          return m.timestamp >= todayMs;
        });

        for (let i = 0; i < recentMessages.length; i++) {
          const m = recentMessages[i];
          if (m.role === 'user' && typeof m.content === 'string' && m.content.trim().length > 3) {
            const nextMsg = recentMessages[i + 1];
            const answerSnippet = nextMsg && (nextMsg.role === 'model' || nextMsg.role === 'assistant') && typeof nextMsg.content === 'string'
              ? nextMsg.content.replace(/<[^>]*>/g, '').replace(/#+\s/g, '').trim().slice(0, 180)
              : '';

            const userText = m.content.trim();
            const modeOrChannels = m.channels || m.mode || m.channel || m.persona || 'casual';
            const targetBooks = resolveTargetBooksForLucyMode(modeOrChannels);

            const modeLabel = Array.isArray(modeOrChannels)
              ? (modeOrChannels.length === 5 ? '올인원 마스터' : modeOrChannels.join('×'))
              : (modeOrChannels === 'master' ? '올인원 마스터' : (modeOrChannels === 'casual' || modeOrChannels === 'lucy' ? '수다' : modeOrChannels));

            const log: SyncEchoActivityLog = {
              app: 'lucy',
              appName: `루시 상담 [${modeLabel}]`,
              category: 'dialogue',
              title: `영혼 문답 [${userText.slice(0, 25)}${userText.length > 25 ? '...' : ''}]`,
              detail: `질문: "${userText}" → 루시의 조언: "${answerSnippet}${answerSnippet.length >= 180 ? '...' : ''}"`,
              icon: '✨',
              timestamp: m.timestamp || Date.now()
            };
            allCollectedLogs.push(log);

            targetBooks.forEach((targetBook) => {
              if (logsByBook[targetBook]) {
                logsByBook[targetBook].push(log);
              }
            });
          }
        }
      }
    }
  } catch (_) {}

  const isAlreadyConsecrated = existingVerses.some((v) => {
    return getVerseDateKey(v) === todayKey;
  });

  const topicDrafts: SyncEchoTopicDraft[] = REBIBLE_CANONICAL_BOOKS.map((bookTitle) => {
    const bookLogs = logsByBook[bookTitle] || [];
    const meta = BOOK_META_MAP[bookTitle];

    const summary = summarizeBookActivities(bookTitle, bookLogs, dateDisplay);
    const wisdom = generateDynamicWisdomInsight(bookTitle, summary.fact, bookLogs);

    return {
      id: `topic-draft-${todayKey}-${bookTitle}`,
      bookTitle,
      bookIcon: meta.icon,
      bookSubtitle: meta.subtitle,
      title: summary.title,
      fact: summary.fact,
      insight: wisdom.insight,
      reflection: wisdom.reflection,
      emotions: summary.emotions,
      tags: summary.tags,
      reference: `${bookTitle} 1:1`,
      sourceActivities: bookLogs
    };
  });

  const firstTopic = topicDrafts[0];

  return {
    dateKey: todayKey,
    dateDisplay,
    topicDrafts,
    totalTopics: topicDrafts.length,
    context: firstTopic.fact,
    guidance: firstTopic.insight,
    reflection: firstTopic.reflection,
    suggestedTitle: firstTopic.title,
    suggestedBook: firstTopic.bookTitle,
    suggestedChapter: 1,
    suggestedVerse: 1,
    suggestedReference: firstTopic.reference,
    suggestedEmotions: firstTopic.emotions,
    suggestedTags: firstTopic.tags,
    activityLogs: allCollectedLogs,
    activityCount: allCollectedLogs.length,
    isAlreadyConsecrated
  };
}

/**
 * 자동 생성된 단일 초안을 ReBibleVerse 객체로 변환합니다. (호환성 유지)
 */
export function createVerseFromDraft(draft: SyncEchoDraft): ReBibleVerse {
  const newId = `auto-echo-${draft.dateKey}-${draft.suggestedBook || '각성의서'}`;
  return {
    id: newId,
    bookTitle: draft.suggestedBook || '각성의 서',
    chapterNumber: draft.suggestedChapter || 1,
    verseNumber: draft.suggestedVerse || 1,
    reference: draft.suggestedReference || `${draft.suggestedBook || '각성의 서'} 1:1`,
    title: draft.suggestedTitle || `${draft.dateDisplay}의 지혜`,
    fact: draft.context,
    insight: draft.guidance,
    emotions: draft.suggestedEmotions,
    tags: [...draft.suggestedTags, `날짜:${draft.dateKey}`],
    annotations: [],
    isSacredFavorite: true,
    recordedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * 4. 7개의 성스러운 서(Topic Drafts)를 일자별·서별 1기록 원칙에 맞추어 일괄 봉헌 및 갱신합니다.
 */
export async function consecrateAllTopicVerses(
  topicDrafts: SyncEchoTopicDraft[],
  dateKey: string
): Promise<ReBibleVerse[]> {
  if (!topicDrafts || topicDrafts.length === 0) return [];

  const currentVerses = loadLocalVerses();
  const updatedVersesMap = new Map<string, ReBibleVerse>();

  currentVerses.forEach((v) => {
    updatedVersesMap.set(v.id, v);
  });

  const createdOrUpdatedVerses: ReBibleVerse[] = [];

  for (let i = 0; i < topicDrafts.length; i++) {
    const topic = topicDrafts[i];
    const bTitle = topic.bookTitle;

    const existingIndexVerse = currentVerses.find((v) => {
      const matchesDate = getVerseDateKey(v) === dateKey;
      const matchesBook = (v.bookTitle || '').trim() === bTitle.trim();
      return matchesDate && matchesBook;
    });

    if (existingIndexVerse) {
      const updated: ReBibleVerse = {
        ...existingIndexVerse,
        title: topic.title,
        fact: topic.fact,
        insight: topic.insight,
        emotions: Array.from(new Set([...(existingIndexVerse.emotions || []), ...topic.emotions])),
        tags: Array.from(new Set([...(existingIndexVerse.tags || []), ...topic.tags, 'Sync:Echo', `날짜:${dateKey}`])),
        updatedAt: new Date().toISOString()
      };
      updatedVersesMap.set(updated.id, updated);
      createdOrUpdatedVerses.push(updated);
      saveVerseToFirestore(updated).catch(() => {});
    } else {
      const newVerse: ReBibleVerse = {
        id: `verse-${dateKey}-${bTitle.replace(/\s+/g, '')}-${Date.now().toString(36)}`,
        bookTitle: bTitle,
        chapterNumber: 1,
        verseNumber: 1,
        reference: `${bTitle} 1:1`,
        title: topic.title,
        fact: topic.fact,
        insight: topic.insight,
        emotions: topic.emotions,
        tags: Array.from(new Set([...topic.tags, 'Sync:Echo', `날짜:${dateKey}`])),
        annotations: [],
        isSacredFavorite: true,
        recordedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      updatedVersesMap.set(newVerse.id, newVerse);
      createdOrUpdatedVerses.push(newVerse);
      saveVerseToFirestore(newVerse).catch(() => {});
    }
  }

  const finalVerses = Array.from(updatedVersesMap.values()).sort(
    (a, b) => new Date(b.recordedAt || 0).getTime() - new Date(a.recordedAt || 0).getTime()
  );

  saveLocalVerses(finalVerses);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('rebible-verses-updated', {
        detail: { count: createdOrUpdatedVerses.length, totalCount: finalVerses.length }
      })
    );
  }

  return createdOrUpdatedVerses;
}

/**
 * 5. 오늘 날짜의 최신 활동 로그를 실시간으로 스캔하여 7개의 서재를 항시 실시간으로 자동 동기화합니다.
 * (사용자가 별도의 편찬 버튼을 누르지 않아도 활동이 생기는 즉시 자동으로 Re:Bible에 실시간 반영)
 */
export function syncTodayLiveCanonicalVerses(currentVerses: ReBibleVerse[] = loadLocalVerses()): {
  verses: ReBibleVerse[];
  hasChanged: boolean;
  draft: SyncEchoDraft;
} {
  const draft = buildTodaySyncEchoDraft(currentVerses);
  const todayDateKey = draft.dateKey;
  const topicDrafts = draft.topicDrafts;

  const versesMap = new Map<string, ReBibleVerse>();
  let hasChanged = false;

  // 1. 과거 일자 구절 보존 및 자정(00:00) 경과 시 영구 확정 봉인 (Immutable Locking)
  currentVerses.forEach((v) => {
    const vDate = getVerseDateKey(v);
    if (vDate < todayDateKey) {
      if (!v.isFinalized) {
        const finalizedVerse: ReBibleVerse = {
          ...v,
          isFinalized: true,
          finalizedAt: v.finalizedAt || new Date().toISOString()
        };
        versesMap.set(finalizedVerse.id, finalizedVerse);
        saveVerseToFirestore(finalizedVerse).catch(() => {});
        hasChanged = true;
      } else {
        versesMap.set(v.id, v);
      }
    } else {
      versesMap.set(v.id, v);
    }
  });

  // 2. 오늘 일자(todayDateKey)에 해당하는 7개의 서만 실시간으로 동적으로 조율
  topicDrafts.forEach((topic) => {
    const bTitle = topic.bookTitle;
    const existingVerse = currentVerses.find((v) => {
      const matchesDate = getVerseDateKey(v) === todayDateKey;
      const matchesBook = (v.bookTitle || '').trim() === bTitle.trim();
      return matchesDate && matchesBook;
    });

    if (existingVerse) {
      if (
        existingVerse.title !== topic.title ||
        existingVerse.fact !== topic.fact ||
        existingVerse.insight !== topic.insight
      ) {
        const updated: ReBibleVerse = {
          ...existingVerse,
          title: topic.title,
          fact: topic.fact,
          insight: topic.insight,
          isFinalized: false, // 오늘은 자정 전까지 실시간 진행 중
          emotions: Array.from(new Set([...(existingVerse.emotions || []), ...topic.emotions])),
          tags: Array.from(new Set([...(existingVerse.tags || []), ...topic.tags, `날짜:${todayDateKey}`])),
          updatedAt: new Date().toISOString()
        };
        versesMap.set(updated.id, updated);
        saveVerseToFirestore(updated).catch(() => {});
        hasChanged = true;
      }
    } else {
      const candidateId = `verse-${todayDateKey}-${bTitle.replace(/\s+/g, '')}`;
      if (!isVerseKeyDeleted(candidateId, todayDateKey, bTitle)) {
        const newVerse: ReBibleVerse = {
          id: candidateId,
          bookTitle: bTitle,
          chapterNumber: 1,
          verseNumber: 1,
          reference: `${bTitle} 1:1`,
          title: topic.title,
          fact: topic.fact,
          insight: topic.insight,
          isFinalized: false,
          emotions: topic.emotions,
          tags: Array.from(new Set([...topic.tags, `날짜:${todayDateKey}`])),
          annotations: [],
          isSacredFavorite: true,
          recordedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        versesMap.set(newVerse.id, newVerse);
        saveVerseToFirestore(newVerse).catch(() => {});
        hasChanged = true;
      }
    }
  });

  const finalVerses = Array.from(versesMap.values()).sort(
    (a, b) => new Date(b.recordedAt || 0).getTime() - new Date(a.recordedAt || 0).getTime()
  );

  if (hasChanged) {
    saveLocalVerses(finalVerses);
  }

  return {
    verses: finalVerses,
    hasChanged,
    draft
  };
}

/**
 * AI를 활용해 구절의 통찰을 더욱 깊이 있고 수려하게 다듬는 비동기 함수
 */
export async function enhanceWisdomInsightWithAI(
  bookTitle: CanonicalReBibleBook,
  factSummary: string,
  currentInsight: string
): Promise<string> {
  try {
    const prompt = `당신은 영적 인생 경전 'Re:Bible'의 거룩한 예지자이자 멘토인 '루시(Lucy)'입니다.
사용자가 오늘 기록한 다음 사건(Fact)과 기존 통찰을 바탕으로, 성경이나 잠언, 명상록처럼 마음에 깊은 울림과 평온을 주는 고결하고 시적인 1~2문장의 '지혜의 구절(Insight)'을 한국어로 작성해 주세요.
- 서재: ${bookTitle}
- 기록된 여정(Fact): ${factSummary}
- 기존 통찰: ${currentInsight}

[작성 규칙]:
1. 판박이 문장이나 진부한 상투어를 배제하고, 해당 사건의 본질을 영적 원리로 승화시키세요.
2. 경전 특유의 엄숙하면서도 따뜻한 어조(예: ~하십시오, ~입니다, ~이 비로소 회복됩니다)를 사용하세요.
3. 따옴표나 군더더기 서두 없이 완성된 경전 구절 본문 1~2문장만 출력하세요.`;

    const aiRes = await invokeEpilogueSummaryLLM([
      { role: 'system', content: 'You are the sacred scripture composer of Re:Bible.' },
      { role: 'user', content: prompt }
    ]);

    if (aiRes && aiRes.length > 15 && !aiRes.includes('실패')) {
      return aiRes.replace(/^["']|["']$/g, '').trim();
    }
  } catch (_) {}
  return currentInsight;
}
