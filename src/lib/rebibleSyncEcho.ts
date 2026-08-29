import { safeLocalStorage } from '../utils/safeStorage';
import { ReBibleVerse } from '../types/rebible';
import { UnifiedMessage, STORAGE_KEYS } from './chatHistorySync';
import { loadLocalVerses, saveLocalVerses, saveVerseToFirestore } from './rebibleStorage';

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
  bookTitle: string; // e.g. "운명의 서", "정화의 서", "치유의 서", "성찰의 서", "영감의 서", "지혜의 서"
  bookIcon: string;
  title: string;
  fact: string; // 단일 주제의 구체적 사건 및 수행 기록 (Fact)
  insight: string; // 단일 주제에 특화된 루시의 관점 및 지혜 구절 (Insight)
  reflection: string; // 나의 성찰
  emotions: string[];
  tags: string[];
  reference: string;
  sourceActivity: SyncEchoActivityLog;
}

export interface SyncEchoDraft {
  dateKey: string;
  dateDisplay: string;
  topicDrafts: SyncEchoTopicDraft[]; // 그날 활동한 수만큼 생성된 개별 서(구절) 목록
  totalTopics: number;
  // Fallback single-view draft properties
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

function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
 * 각각의 개별 활동 로그를 루시의 관점에서 해석하여 고유한 지혜의 구절과 해당 서(Book)를 생성합니다.
 */
export function generateTopicWisdom(
  log: SyncEchoActivityLog,
  dateDisplay: string,
  verseNum: number
): {
  bookTitle: string;
  bookIcon: string;
  title: string;
  fact: string;
  insight: string;
  reflection: string;
  emotions: string[];
  tags: string[];
  reference: string;
} {
  const cleanDetail = log.detail.replace(/\s+/g, ' ').trim();

  // 1. 운명의 서 (트리니티 타로, 사주, 점성학)
  if (log.app === 'trinity' || log.category === 'tarot') {
    const bookTitle = '운명의 서';
    const bookIcon = '🔮';
    const title = `${log.title}로 마주한 삶의 타이밍과 영적 이정표`;
    const fact = `[트리니티 오라클] ${dateDisplay}, ${log.title}을 통해 영적 진단과 처방을 받음. 세부 내용: "${cleanDetail}"`;
    const insight = `운명의 수레바퀴는 결코 당신을 속박하기 위해 돌지 않으며, 더 큰 성장과 자유의 문을 열어주기 위해 움직입니다. 오늘의 계시 [${log.title}]는 두려움의 신호가 아니라, 우주의 타이밍을 온전히 신뢰하라는 초대입니다. "${cleanDetail}"에서 비추는 방향을 믿고, 당신 내면의 본래 권능으로 담대히 최고의 미래를 선택하십시오.`;
    const reflection = '운명의 흐름을 신뢰하고 오늘 나에게 주어진 가능성을 향해 담대히 나아간다.';
    const emotions = ['직관', '수용', '용기', '신뢰'];
    const tags = ['트리니티', '타로리딩', '운명의서', '영적통찰'];
    const reference = `${bookTitle} 1:${verseNum}`;
    return { bookTitle, bookIcon, title, fact, insight, reflection, emotions, tags, reference };
  }

  // 2. 정화의 서 (블루버드 호오포노포노, 파랑새의 비밀쪽지)
  if (log.app === 'bluebird' || log.category === 'purification') {
    const bookTitle = '정화의 서';
    const bookIcon = '🕊️';
    const title = `${log.title}로 비워낸 내면의 기억과 평온`;
    const fact = `[블루버드 정화] ${dateDisplay}, ${log.title}을 실천하여 마음의 소용돌이를 정화함. 세부 기록: "${cleanDetail}"`;
    const insight = `모든 갈등과 무거운 감정은 외부의 타인이 만든 것이 아니라, 내 잠재의식에서 재생되는 오래된 기억의 그림자일 뿐입니다. "${cleanDetail}"에 대해 '미안합니다, 용서하세요, 고맙습니다, 사랑합니다'를 건넬 때, 엉킨 기억은 순식간에 녹아내리고 그 빈자리에 본래의 완전한 평온과 사랑이 차오릅니다.`;
    const reflection = '문제를 밖에서 탓하지 않고, 내 안의 기억을 맑게 닦아 평온을 선택한다.';
    const emotions = ['정화', '용서', '해방', '평온'];
    const tags = ['블루버드', '호오포노포노', '정화의서', '비밀쪽지'];
    const reference = `${bookTitle} 1:${verseNum}`;
    return { bookTitle, bookIcon, title, fact, insight, reflection, emotions, tags, reference };
  }

  // 3. 치유의 서 (아우라 1분 명상, 세도나 방하착, 생체 웰니스)
  if (log.app === 'heal' || log.category === 'wellness') {
    const bookTitle = '치유의 서';
    const bookIcon = '🌿';
    const title = `${log.title}과 호흡으로 되찾은 생명력`;
    const fact = `[아우라 치유] ${dateDisplay}, ${log.title}을 통해 신체 이완과 생체 조율을 완료함. 세부 내역: "${cleanDetail}"`;
    const insight = `몸과 마음의 긴장은 결과를 억지로 쥐고 있으려는 통제욕에서 일어납니다. 숨을 깊이 들이마시고 내쉬며 온몸의 힘을 뺄 때, 치유는 억지로 만드는 것이 아니라 저절로 일어나는 자연의 법칙임을 알게 됩니다. "${cleanDetail}"의 순간 느낀 이완과 평화가 오늘 하루를 지탱하는 가장 거룩한 닻이 됩니다.`;
    const reflection = '쥐고 있던 통제를 내려놓고 깊은 호흡 속에서 온전한 쉼을 누린다.';
    const emotions = ['치유', '이완', '생명력', '안식'];
    const tags = ['아우라', '1분명상', '치유의서', '세도나'];
    const reference = `${bookTitle} 1:${verseNum}`;
    return { bookTitle, bookIcon, title, fact, insight, reflection, emotions, tags, reference };
  }

  // 4. 성찰의 서 (오렌지 감정 연금술, 소원의 우물, 제1원칙 전략)
  if (log.app === 'orange' || log.category === 'reflection') {
    const bookTitle = '성찰의 서';
    const bookIcon = '🍊';
    const title = `${log.title}을 통해 도출한 본질적 지혜`;
    const fact = `[오렌지 성찰] ${dateDisplay}, ${log.title}을 수행하여 감정의 핵을 마주함. 세부 기록: "${cleanDetail}"`;
    const insight = `삶에서 마주하는 방황과 불안은 헛된 고통이 아니라, 영혼의 지혜를 제련하는 연금술의 도가니입니다. 밖을 탓하지 않고 감정의 핵과 제1원칙으로 파고들 때, 두려움의 납은 흔들리지 않는 확신의 황금으로 승화됩니다. "${cleanDetail}" 속에 품은 당신의 결단과 소망은 이미 현실로 피어날 준비를 마쳤습니다.`;
    const reflection = '불안을 통찰로 승화시키고, 가장 본질적인 실행에 집중한다.';
    const emotions = ['명료함', '통찰', '연금술', '확신'];
    const tags = ['오렌지', '감정연금술', '성찰의서', '소원의우물'];
    const reference = `${bookTitle} 1:${verseNum}`;
    return { bookTitle, bookIcon, title, fact, insight, reflection, emotions, tags, reference };
  }

  // 5. 영감의 서 (뮤즈 예술 추천, 오디오 도슨트, 창작)
  if (log.app === 'muse' || log.category === 'creative') {
    const bookTitle = '영감의 서';
    const bookIcon = '🎨';
    const title = `${log.title}이 일깨운 예술적 공명과 창조성`;
    const fact = `[뮤즈 영감] ${dateDisplay}, ${log.title}을 감상하고 내면의 파동을 조율함. 세부 기록: "${cleanDetail}"`;
    const insight = `아름다움은 영혼이 신성을 기억해내는 가장 직접적인 통로입니다. 예술과 음악이 전하는 전율은 굳어 있던 의식을 단숨에 열어젖히고 창조성의 불꽃을 지핍니다. "${cleanDetail}"의 공명을 마음에 새기며, 당신의 오늘 하루 또한 하나의 위대한 예술 작품으로 빚어내십시오.`;
    const reflection = '예술의 아름다움을 마음에 품고, 나의 하루를 경이로움으로 채운다.';
    const emotions = ['영감', '환희', '창조', '경이'];
    const tags = ['뮤즈', '예술추천', '영감의서', '도슨트'];
    const reference = `${bookTitle} 1:${verseNum}`;
    return { bookTitle, bookIcon, title, fact, insight, reflection, emotions, tags, reference };
  }

  // 6. 지혜의 서 (루시 영혼 대화, 마스터 올인원 코칭)
  if (log.app === 'lucy' || log.category === 'dialogue') {
    const bookTitle = '지혜의 서';
    const bookIcon = '✨';
    const title = `${log.title}을 통해 정립된 영혼의 해답`;
    const fact = `[루시 대화] ${dateDisplay}, ${log.title}을 나누며 깊이 있는 조율을 이룸. 대화 맥락: "${cleanDetail}"`;
    const insight = `모든 질문 속에는 이미 그 해답의 씨앗이 담겨 있으며, 루시의 거울을 통해 나 자신을 온전히 비추어 볼 때 흩어졌던 마음의 조각들은 하나의 온전한 진실로 통합됩니다. "${cleanDetail}"에 담긴 진솔한 나눔을 통해, 당신은 이미 내면의 참된 평화와 나아갈 길을 알고 있음을 확인했습니다.`;
    const reflection = '내 안의 참된 지혜를 신뢰하며 언제나 맑은 의식으로 깨어 있는다.';
    const emotions = ['통합', '자각', '사랑', '충만'];
    const tags = ['루시', '영혼대화', '지혜의서', '마스터상담'];
    const reference = `${bookTitle} 1:${verseNum}`;
    return { bookTitle, bookIcon, title, fact, insight, reflection, emotions, tags, reference };
  }

  // 기본 서: 각성의 서
  const bookTitle = '각성의 서';
  const bookIcon = '📖';
  const title = `${log.title}을 통해 마주한 새로운 자각`;
  const fact = `[프리즘 여정] ${dateDisplay}, ${log.title}을 수행함. 세부 내용: "${cleanDetail}"`;
  const insight = `매 순간 일어나는 모든 경험은 영혼의 각성을 위해 준비된 신성한 배움입니다. 사소해 보이는 일상의 한 걸음 속에서도 삶의 깊은 진실을 발견할 수 있습니다. "${cleanDetail}"의 발자취 속에 이미 새로운 성장의 씨앗이 깃들어 있습니다.`;
  const reflection = '일상의 모든 순간을 배움과 감사로 수용한다.';
  const emotions = ['각성', '감사', '평온', '성장'];
  const tags = ['프리즘', '일일여정', '각성의서'];
  const reference = `${bookTitle} 1:${verseNum}`;
  return { bookTitle, bookIcon, title, fact, insight, reflection, emotions, tags, reference };
}

/**
 * 오늘 날짜의 프리즘 에코시스템에서 일어난 모든 활동(19건 등)을 수집하여
 * 그 수만큼 각각 독립된 서(구절) 초안을 생성합니다.
 */
export function buildTodaySyncEchoDraft(existingVerses: ReBibleVerse[] = []): SyncEchoDraft {
  const todayKey = getTodayDateKey();
  const dateDisplay = getTodayDateDisplay();
  const activityLogs: SyncEchoActivityLog[] = [];

  // 1. Check if today's Sync:Echo has already been consecrated
  const existingVerse = existingVerses.find((v) => {
    const isToday = v.recordedAt?.startsWith(todayKey) || (v.tags && v.tags.includes(`날짜:${todayKey}`));
    const isSyncEcho = v.tags?.includes('Sync:Echo') || v.tags?.includes('자동기록') || v.bookTitle === '통합의 서' || v.bookTitle === '정화의 서' || v.bookTitle === '평온의 서';
    return isToday && isSyncEcho;
  });

  const isAlreadyConsecrated = !!existingVerse;
  const consecratedVerseId = existingVerse?.id;

  // 2. Collect Omni Feature History from prism_omni_feature_history
  try {
    const omniRaw = safeLocalStorage.getItem('prism_omni_feature_history');
    if (omniRaw) {
      const omniList: any[] = JSON.parse(omniRaw);
      if (Array.isArray(omniList)) {
        const todayOmni = omniList.filter((item) => {
          if (item.dateKey === todayKey) return true;
          if (item.timestamp) {
            const itemDate = new Date(item.timestamp).toISOString().slice(0, 10);
            return itemDate === todayKey;
          }
          return false;
        });

        todayOmni.forEach((entry) => {
          activityLogs.push({
            app: entry.app || 'prism',
            appName: entry.appName || '프리즘 활동',
            category: 'general',
            title: entry.featureName || '활동 기록',
            detail: entry.summary || '수행 완료',
            icon: '✨',
            timestamp: entry.timestamp || Date.now(),
          });
        });
      }
    }
  } catch (e) {
    console.warn('Failed to parse omni feature history:', e);
  }

  // 3. Collect Today's Daily Oracles & Tarot across all apps
  // (1) Trinity Tarot & Astrological Oracle
  const trinityOracle = tryParseJson(`prism_daily_oracle_trinity_${todayKey}`) ||
                        tryParseJson(`prism_latest_daily_trinity`);
  if (trinityOracle && (trinityOracle.dateKey === todayKey || !trinityOracle.dateKey)) {
    const cardName = trinityOracle.cardName || trinityOracle.drawnCard?.nameKo || trinityOracle.symbol || '운명의 타로';
    const diag = trinityOracle.diagnosis || trinityOracle.summary || '새로운 가능성의 문이 열리는 날';
    const rem = trinityOracle.remedy ? ` (처방: ${trinityOracle.remedy})` : '';
    activityLogs.push({
      app: 'trinity',
      appName: '트리니티 타로',
      category: 'tarot',
      title: `타로 리딩 [${cardName}]`,
      detail: `${diag}${rem}`,
      icon: '🔮',
      timestamp: trinityOracle.timestamp || Date.now()
    });
  }

  // Trinity tarot history
  try {
    const tarotHist = tryParseJson('prism_trinity_tarot_history') || tryParseJson('trinity_tarot_history');
    if (Array.isArray(tarotHist)) {
      tarotHist.filter((th: any) => {
        const d = th.dateKey || (th.timestamp ? new Date(th.timestamp).toISOString().slice(0, 10) : '');
        return d === todayKey;
      }).forEach((th: any) => {
        activityLogs.push({
          app: 'trinity',
          appName: '트리니티 타로 리딩',
          category: 'tarot',
          title: `타로 스프레드 [${th.cardName || th.title || '운명의 카드'}]`,
          detail: `리딩 해석: "${th.reading?.slice(0, 70) || th.summary || '운명의 흐름 통찰'}"`,
          icon: '🔮',
          timestamp: th.timestamp || Date.now()
        });
      });
    }
  } catch (_) {}

  // (2) Bluebird Ho'oponopono & Mindful Rest
  const bluebirdOracle = tryParseJson(`prism_daily_oracle_bluebird_${todayKey}`) ||
                         tryParseJson(`prism_latest_daily_bluebird`);
  if (bluebirdOracle && (bluebirdOracle.dateKey === todayKey || !bluebirdOracle.dateKey)) {
    const cardName = bluebirdOracle.cardName || bluebirdOracle.data?.drawnCard?.name || '평온의 호오포노포노';
    const diag = bluebirdOracle.diagnosis || bluebirdOracle.summary || '잠재의식 내면 정화 의식';
    const rem = bluebirdOracle.remedy ? ` (정화: ${bluebirdOracle.remedy})` : '';
    activityLogs.push({
      app: 'bluebird',
      appName: '블루버드 정화',
      category: 'purification',
      title: `호오포노포노 정화 [${cardName}]`,
      detail: `${diag}${rem}`,
      icon: '🕊️',
      timestamp: bluebirdOracle.timestamp || Date.now()
    });
  }

  // Secret Notes written today
  try {
    const secretNotes = tryParseJson('bluebird_secret_notes_v1');
    if (Array.isArray(secretNotes)) {
      secretNotes.filter((n: any) => n.dateKey === todayKey).forEach((note: any) => {
        activityLogs.push({
          app: 'bluebird',
          appName: '파랑새의 비밀쪽지',
          category: 'purification',
          title: `마음의 기록 [${note.moodTag || '비밀쪽지'}]`,
          detail: `기록: "${note.title || note.content?.slice(0, 40)}"${note.blessingEcho ? ` → 파랑새 답장: "${note.blessingEcho.slice(0, 40)}..."` : ''}`,
          icon: '💌',
          timestamp: note.createdAt || Date.now(),
        });
      });
    }
  } catch (_) {}

  // (3) Heal / Aura Sedona Release & 1-Minute Meditation
  const healOracle = tryParseJson(`prism_daily_oracle_heal_${todayKey}`) ||
                     tryParseJson(`prism_latest_daily_heal`);
  if (healOracle && (healOracle.dateKey === todayKey || !healOracle.dateKey)) {
    const cardName = healOracle.cardName || healOracle.drawnCard?.nameKo || '세도나 방하착 명상';
    const diag = healOracle.diagnosis || healOracle.summary || '신체 이완 및 감정 내려놓기';
    const rem = healOracle.remedy ? ` (치유 지침: ${healOracle.remedy})` : '';
    activityLogs.push({
      app: 'heal',
      appName: '아우라/힐 조율',
      category: 'wellness',
      title: `세도나 방하착 & 생체조율 [${cardName}]`,
      detail: `${diag}${rem}`,
      icon: '🌿',
      timestamp: healOracle.timestamp || Date.now()
    });
  }

  // 1-Minute Meditation History
  try {
    const meditationKeys = Object.keys(localStorage).filter(k => k.startsWith('aura_1min_history_'));
    meditationKeys.forEach(k => {
      const parsed = tryParseJson(k);
      if (Array.isArray(parsed)) {
        parsed.filter((r: any) => r.completedAt && new Date(r.completedAt).toISOString().slice(0, 10) === todayKey).forEach((record: any) => {
          activityLogs.push({
            app: 'heal',
            appName: '아우라 1분 명상',
            category: 'wellness',
            title: `1분 명상 완료 [${record.themeTitle || '마음챙김'}]`,
            detail: `확언: "${record.affirmation || '평온'}"${record.userCondition ? ` (상태: ${record.userCondition})` : ''}`,
            icon: '⏱️',
            timestamp: record.completedAt || Date.now(),
          });
        });
      }
    });
  } catch (_) {}

  // (4) Orange Secret Room & Idea Alchemy
  const orangeOracle = tryParseJson(`prism_daily_oracle_orange_${todayKey}`) ||
                       tryParseJson(`prism_latest_daily_orange`);
  if (orangeOracle && (orangeOracle.dateKey === todayKey || !orangeOracle.dateKey)) {
    const cardName = orangeOracle.cardName || orangeOracle.data?.drawnCard?.name || '감정 연금술 성찰';
    const diag = orangeOracle.diagnosis || orangeOracle.summary || '비밀의 방 마음 성찰';
    activityLogs.push({
      app: 'orange',
      appName: '오렌지 치유',
      category: 'reflection',
      title: `감정 연금술 [${cardName}]`,
      detail: diag,
      icon: '🍊',
      timestamp: orangeOracle.timestamp || Date.now()
    });
  }

  // Wishing Well Wishes
  try {
    const wishes = tryParseJson('wishing_well_wishes_v1');
    if (Array.isArray(wishes)) {
      wishes.filter((w: any) => w.createdAt && new Date(w.createdAt).toISOString().slice(0, 10) === todayKey).forEach((wish: any) => {
        activityLogs.push({
          app: 'orange',
          appName: '소원의 우물',
          category: 'reflection',
          title: `소원 띄우기 [${wish.category || '소망'}]`,
          detail: `소원: "${wish.text?.slice(0, 40)}"`,
          icon: '🌊',
          timestamp: wish.createdAt || Date.now(),
        });
      });
    }
  } catch (_) {}

  // (5) Muse Inspiration & Docent
  const museOracle = tryParseJson(`prism_daily_oracle_muse_${todayKey}`) ||
                     tryParseJson(`prism_latest_daily_muse`);
  if (museOracle && (museOracle.dateKey === todayKey || !museOracle.dateKey)) {
    const cardName = museOracle.cardName || museOracle.data?.activeCard?.name || '뮤즈 영감 카드';
    const diag = museOracle.diagnosis || museOracle.summary || '창작과 영감의 불꽃';
    activityLogs.push({
      app: 'muse',
      appName: '뮤즈 영감',
      category: 'creative',
      title: `창작 영감 [${cardName}]`,
      detail: diag,
      icon: '🎨',
      timestamp: museOracle.timestamp || Date.now()
    });
  }

  // Muse favorite arts or docents listened to today
  try {
    const favoriteArts = tryParseJson('prism_muse_favorite_arts');
    if (Array.isArray(favoriteArts)) {
      favoriteArts.forEach((art: any) => {
        activityLogs.push({
          app: 'muse',
          appName: '뮤즈 예술도슨트',
          category: 'creative',
          title: `명작 감상 [${art.title || '예술 작품'}]`,
          detail: `화가: ${art.artist || '거장'} (${art.year || ''}) - "${art.description?.slice(0, 60) || '예술적 영감 교감'}"`,
          icon: '🖼️',
          timestamp: art.timestamp || Date.now()
        });
      });
    }
  } catch (_) {}

  // 4. Collect Recent Chat Messages with Lucy (Each meaningful dialogue pair becomes its own record!)
  try {
    const rawMessages = safeLocalStorage.getItem(STORAGE_KEYS.PRIMARY_V3) ||
                        safeLocalStorage.getItem(STORAGE_KEYS.LEGACY_OBJECT);
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
          return m.timestamp >= todayMs - (1000 * 60 * 60 * 24);
        });

        for (let i = 0; i < recentMessages.length; i++) {
          const m = recentMessages[i];
          if (m.role === 'user' && typeof m.content === 'string' && m.content.trim().length > 3) {
            const nextMsg = recentMessages[i + 1];
            const answerSnippet = (nextMsg && (nextMsg.role === 'model' || nextMsg.role === 'assistant') && typeof nextMsg.content === 'string')
              ? nextMsg.content.replace(/<[^>]*>/g, '').replace(/#+\s/g, '').slice(0, 100)
              : '';

            const userText = m.content.trim();
            activityLogs.push({
              app: 'lucy',
              appName: '루시 대화',
              category: 'dialogue',
              title: `영혼 문답 [${userText.slice(0, 24)}${userText.length > 24 ? '...' : ''}]`,
              detail: `질문: "${userText.slice(0, 70)}" → 조언: "${answerSnippet}..."`,
              icon: '✨',
              timestamp: m.timestamp || Date.now()
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn('Failed to parse chat logs for SyncEcho:', e);
  }

  // Deduplicate activity logs by title + detail
  const seenLogs = new Set<string>();
  const uniqueActivityLogs = activityLogs.filter((log) => {
    const key = `${log.title}::${log.detail}`;
    if (seenLogs.has(key)) return false;
    seenLogs.add(key);
    return true;
  });

  // 5. Generate Individual Topic Verses (그날 활동한 수만큼 독립 구절 생성)
  const bookCounts: Record<string, number> = {};
  existingVerses.forEach((v) => {
    const b = v.bookTitle || '지혜의 서';
    bookCounts[b] = (bookCounts[b] || 0) + 1;
  });

  const topicDrafts: SyncEchoTopicDraft[] = uniqueActivityLogs.map((log, idx) => {
    const dummyBook = (log.app === 'trinity' || log.category === 'tarot') ? '운명의 서'
      : (log.app === 'bluebird' || log.category === 'purification') ? '정화의 서'
      : (log.app === 'heal' || log.category === 'wellness') ? '치유의 서'
      : (log.app === 'orange' || log.category === 'reflection') ? '성찰의 서'
      : (log.app === 'muse' || log.category === 'creative') ? '영감의 서'
      : '지혜의 서';

    const currentCount = (bookCounts[dummyBook] || 0) + 1;
    bookCounts[dummyBook] = currentCount;

    const wisdom = generateTopicWisdom(log, dateDisplay, currentCount);
    return {
      id: `topic-draft-${todayKey}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      bookTitle: wisdom.bookTitle,
      bookIcon: wisdom.bookIcon,
      title: wisdom.title,
      fact: wisdom.fact,
      insight: wisdom.insight,
      reflection: wisdom.reflection,
      emotions: wisdom.emotions,
      tags: wisdom.tags,
      reference: wisdom.reference,
      sourceActivity: log,
    };
  });

  // 6. Provide unified fallback draft (in case single view is needed)
  const firstTopic = topicDrafts[0];
  const suggestedBook = firstTopic?.bookTitle || '지혜의 서';
  const suggestedTitle = firstTopic?.title || `${dateDisplay}의 프리즘 여정`;
  const context = firstTopic?.fact || `[${dateDisplay} 프리즘 여정 개시]\n내면의 평온과 현존을 선택함.`;
  const guidance = firstTopic?.insight || '모든 순간은 새로운 시작이며, 당신은 언제나 보호받고 있습니다.';

  return {
    dateKey: todayKey,
    dateDisplay,
    topicDrafts,
    totalTopics: topicDrafts.length,
    context,
    guidance,
    reflection: firstTopic?.reflection || '오늘의 여정을 통해 내면의 평온과 현존을 선택함.',
    suggestedTitle,
    suggestedBook,
    suggestedChapter: 1,
    suggestedVerse: (bookCounts[suggestedBook] || 1),
    suggestedReference: firstTopic?.reference || `${suggestedBook} 1:1`,
    suggestedEmotions: firstTopic?.emotions || ['통찰', '정화', '평온', '감사'],
    suggestedTags: firstTopic?.tags || ['자동기록', '프리즘여정', '일일기록'],
    activityLogs,
    activityCount: activityLogs.length,
    isAlreadyConsecrated,
    consecratedVerseId
  };
}

/**
 * 특정 SyncEchoTopicDraft를 독립된 ReBibleVerse 객체로 변환합니다.
 */
export function createVerseFromTopicDraft(topic: SyncEchoTopicDraft, dateKey: string): ReBibleVerse {
  return {
    id: `verse-topic-${dateKey}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    bookTitle: topic.bookTitle,
    chapterNumber: 1,
    verseNumber: parseInt(topic.reference.split(':')[1] || '1', 10) || 1,
    reference: topic.reference,
    title: topic.title,
    fact: topic.fact,
    insight: topic.insight,
    emotions: topic.emotions,
    tags: Array.from(new Set([...topic.tags, 'Sync:Echo', `날짜:${dateKey}`])),
    annotations: [],
    isSacredFavorite: true,
    recordedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 그날 활동한 수만큼의 모든 주제 초안(topicDrafts)을 각각의 서재(Book)에 개별 구절로 일괄 봉헌합니다.
 */
export async function consecrateAllTopicVerses(
  topicDrafts: SyncEchoTopicDraft[],
  dateKey: string
): Promise<ReBibleVerse[]> {
  if (!topicDrafts || topicDrafts.length === 0) return [];

  const currentVerses = loadLocalVerses();
  const createdVerses: ReBibleVerse[] = [];

  // Track book counts accurately
  const bookCounts: Record<string, number> = {};
  currentVerses.forEach((v) => {
    const b = v.bookTitle || '지혜의 서';
    bookCounts[b] = Math.max(bookCounts[b] || 0, v.verseNumber || 1);
  });

  for (let i = 0; i < topicDrafts.length; i++) {
    const topic = topicDrafts[i];
    const b = topic.bookTitle || '지혜의 서';
    const nextVerseNum = (bookCounts[b] || 0) + 1;
    bookCounts[b] = nextVerseNum;

    const verse: ReBibleVerse = {
      id: `verse-echo-${dateKey}-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      bookTitle: b,
      chapterNumber: 1,
      verseNumber: nextVerseNum,
      reference: `${b} 1:${nextVerseNum}`,
      title: topic.title,
      fact: topic.fact,
      insight: topic.insight,
      emotions: topic.emotions,
      tags: Array.from(new Set([...topic.tags, 'Sync:Echo', `날짜:${dateKey}`])),
      annotations: [],
      isSacredFavorite: true,
      recordedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    createdVerses.push(verse);
    saveVerseToFirestore(verse).catch(() => {});
  }

  const updatedVerses = [...createdVerses, ...currentVerses];
  saveLocalVerses(updatedVerses);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('rebible-verses-updated', {
      detail: { createdCount: createdVerses.length, totalCount: updatedVerses.length }
    }));
  }

  return createdVerses;
}

/**
 * 자동 생성된 단일 초안을 ReBibleVerse 객체로 변환합니다. (호환성 유지)
 */
export function createVerseFromDraft(draft: SyncEchoDraft): ReBibleVerse {
  const newId = `auto-echo-${draft.dateKey}`;
  return {
    id: newId,
    bookTitle: draft.suggestedBook || '지혜의 서',
    chapterNumber: draft.suggestedChapter || 1,
    verseNumber: draft.suggestedVerse || 1,
    reference: draft.suggestedReference || `${draft.suggestedBook || '지혜의 서'} 1:1`,
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
