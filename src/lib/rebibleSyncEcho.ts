import { safeLocalStorage } from '../utils/safeStorage';
import { ReBibleVerse } from '../types/rebible';
import { UnifiedMessage, STORAGE_KEYS } from './chatHistorySync';

export interface SyncEchoActivityLog {
  app: 'trinity' | 'orange' | 'bluebird' | 'heal' | 'muse' | 'hub' | 'lucy' | string;
  appName: string;
  category: 'tarot' | 'purification' | 'wellness' | 'dialogue' | 'reflection' | 'general';
  title: string;
  detail: string;
  icon?: string;
  timestamp: number;
}

export interface SyncEchoDraft {
  dateKey: string;
  dateDisplay: string;
  context: string; // 수행의 기록 (Context/Fact)
  guidance: string; // 루시/우주의 성스러운 조언 (Guidance/Wisdom)
  reflection?: string; // 오늘의 깨달음 (Reflection)
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
 * 오늘 날짜의 프리즘 에코시스템 활동 로그 및 루시 대화를 수집하여 Sync:Echo 초안을 생성합니다.
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

  // Secret Notes written today
  try {
    const secretNotes = tryParseJson('bluebird_secret_notes_v1');
    if (Array.isArray(secretNotes)) {
      secretNotes.filter((n: any) => n.dateKey === todayKey).forEach((note: any) => {
        activityLogs.push({
          app: 'bluebird',
          appName: '파랑새의 비밀쪽지',
          category: 'reflection',
          title: `마음의 기록 [${note.moodTag || '비밀쪽지'}]`,
          detail: `기록: "${note.title || note.content?.slice(0, 40)}"${note.blessingEcho ? ` → 파랑새 답장: "${note.blessingEcho.slice(0, 40)}..."` : ''}`,
          icon: '💌',
          timestamp: note.createdAt || Date.now(),
        });
      });
    }
  } catch (_) {}

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
      category: 'general',
      title: `창작 영감 [${cardName}]`,
      detail: diag,
      icon: '🎨',
      timestamp: museOracle.timestamp || Date.now()
    });
  }

  // 4. Collect Recent Chat Messages with Lucy & PRISM Guides
  let userDialogueSnippets: string[] = [];
  let lucyGuidanceSnippets: string[] = [];

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

        const userMsgs = recentMessages
          .filter((m) => m.role === 'user' && typeof m.content === 'string' && m.content.trim().length > 3)
          .slice(-3);
        const modelMsgs = recentMessages
          .filter((m) => (m.role === 'model' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim().length > 10)
          .slice(-3);

        userMsgs.forEach((m) => {
          userDialogueSnippets.push(typeof m.content === 'string' ? m.content.trim() : '');
        });
        modelMsgs.forEach((m) => {
          lucyGuidanceSnippets.push(typeof m.content === 'string' ? m.content.trim() : '');
        });

        if (userMsgs.length > 0) {
          const lastUserText = userDialogueSnippets[userDialogueSnippets.length - 1];
          activityLogs.push({
            app: 'lucy',
            appName: '루시 대화',
            category: 'dialogue',
            title: '루시와의 영혼 대화',
            detail: `"${lastUserText.slice(0, 70)}${lastUserText.length > 70 ? '...' : ''}"에 대한 영적 조율`,
            icon: '✨',
            timestamp: Date.now()
          });
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

  // 5. Synthesize Context (여정의 기록) and Guidance (지혜의 구절)
  let context = '';
  let guidance = '';
  let suggestedTitle = '';
  let suggestedBook = '통합의 서';
  let suggestedEmotions: string[] = ['통찰', '정화', '평온', '감사'];
  let suggestedTags: string[] = ['자동기록', '프리즘여정', '일일기록'];

  const hasActivity = uniqueActivityLogs.length > 0;

  if (hasActivity) {
    const logSummaries = uniqueActivityLogs.map((log) => `[${log.appName}] ${log.title}: ${log.detail}`);
    context = `[${dateDisplay} 프리즘 여정 활동 전체 기록]\n` + logSummaries.map((s, i) => `${i + 1}. ${s}`).join('\n\n');

    // Synthesize profound wisdom guidance directly referencing the user's recorded journey
    const journeyHighlights = uniqueActivityLogs.map((l) => l.detail).join(' ');
    
    if (lucyGuidanceSnippets.length > 0) {
      const rawLucy = lucyGuidanceSnippets[lucyGuidanceSnippets.length - 1];
      const cleaned = rawLucy
        .replace(/<[^>]*>/g, '')
        .replace(/#+\s/g, '')
        .replace(/\n{2,}/g, ' ')
        .trim();
      guidance = `오늘 당신이 마주하고 기록한 모든 여정은 흩어진 마음을 하나의 신성한 온기로 모으는 과정이었습니다. ${cleaned.slice(0, 260)}`;
    } else {
      guidance = `오늘 하루 마주한 모든 고뇌와 정화, 그리고 마주한 성찰들은 당신을 결코 헛되게 하지 않습니다. ${journeyHighlights.slice(0, 150)}... 이 기록된 발자취 속에서 이미 내면의 평온과 본래의 순수한 중심이 회복되었습니다. 당신이 걸어온 모든 순간을 온전히 축복합니다.`;
    }

    if (uniqueActivityLogs.some((l) => l.category === 'tarot')) {
      suggestedTitle = '타로의 빛과 정화를 통해 회복한 현존';
      suggestedBook = '통합의 서';
      suggestedTags.push('타로');
    } else if (uniqueActivityLogs.some((l) => l.category === 'purification')) {
      suggestedTitle = '호오포노포노 정화로 마주한 기억의 해방';
      suggestedBook = '정화의 서';
      suggestedTags.push('호오포노포노');
    } else if (uniqueActivityLogs.some((l) => l.category === 'wellness')) {
      suggestedTitle = '세도나 방하착과 신체 이완의 평온';
      suggestedBook = '평온의 서';
      suggestedTags.push('세도나');
    } else {
      suggestedTitle = '루시와의 대화로 조율된 하루의 지혜';
      suggestedBook = '지혜의 서';
      suggestedTags.push('대화');
    }
  } else {
    context = `[${dateDisplay} 프리즘 여정 개시]\n오늘 하루의 시작을 맞이하며 영혼의 주파수를 맑게 조율하고, 내면의 평온과 현존을 선택함.`;
    guidance = '모든 순간은 새로운 시작이며, 당신은 언제나 보호받고 있습니다. 과거의 기억에 휘둘리지 않고 지금 이 순간 호흡에 머무를 때, 모든 길은 가장 조화로운 방식으로 열립니다.';
    suggestedTitle = '새로운 하루를 여는 평온과 신뢰의 선언';
    suggestedBook = '통합의 서';
  }

  const bookVerses = existingVerses.filter((v) => (v.bookTitle || '').trim() === suggestedBook);
  const suggestedChapter = 1;
  const suggestedVerse = bookVerses.length + 1;
  const suggestedReference = `${suggestedBook} ${suggestedChapter}:${suggestedVerse}`;

  return {
    dateKey: todayKey,
    dateDisplay,
    context,
    guidance,
    reflection: '오늘의 여정을 통해 내면의 평온과 현존을 선택함.',
    suggestedTitle,
    suggestedBook,
    suggestedChapter,
    suggestedVerse,
    suggestedReference,
    suggestedEmotions,
    suggestedTags,
    activityLogs,
    activityCount: activityLogs.length,
    isAlreadyConsecrated,
    consecratedVerseId
  };
}

/**
 * 자동 생성된 초안을 ReBibleVerse 객체로 변환합니다.
 */
export function createVerseFromDraft(draft: SyncEchoDraft): ReBibleVerse {
  const newId = `auto-echo-${draft.dateKey}`;
  return {
    id: newId,
    bookTitle: draft.suggestedBook || '통합의 서',
    chapterNumber: draft.suggestedChapter || 1,
    verseNumber: draft.suggestedVerse || 1,
    reference: draft.suggestedReference || `${draft.suggestedBook || '통합의 서'} 1:1`,
    title: draft.suggestedTitle || `${draft.dateDisplay}의 통합 여정`,
    fact: draft.context,
    insight: draft.guidance,
    emotions: draft.suggestedEmotions,
    tags: [...draft.suggestedTags, `날짜:${draft.dateKey}`],
    annotations: [],
    isSacredFavorite: false,
    recordedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
