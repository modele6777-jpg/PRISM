import { type SharedState } from './sharedState';
import { auth, db, doc, setDoc, serverTimestamp } from './firebase';

export interface PrismFeatureEntry {
  id: string;
  app: 'trinity' | 'orange' | 'bluebird' | 'heal' | 'muse' | 'hub' | 'epilogue';
  appName: string;
  featureName: string;
  summary: string;
  details?: Record<string, any>;
  timestamp: number;
  dateKey: string;
}

export interface DailyOracleSummary {
  app: 'trinity' | 'orange' | 'bluebird' | 'heal' | 'muse' | 'hub' | 'epilogue';
  appName?: string;
  featureName?: string;
  cardName?: string;
  cardKeywords?: string[];
  cardDesc?: string;
  diagnosis: string;
  remedy?: string;
  spiritualEnergy?: string;
  blessingMessage?: string;
  frequency?: string;
  symbol?: string;
  focusPlaylist?: string;
  timestamp?: number;
  dateKey?: string;
}

const STORAGE_KEY = 'prism_omni_feature_history';
const MAX_ENTRIES = 60;

function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const APP_NAMES: Record<string, string> = {
  trinity: '트리니티 (운명/타로/점성)',
  orange: '오렌지 (마음치유/비밀의 방)',
  bluebird: '블루버드 (휴식/호오포노포노)',
  heal: '아우라/힐 (신체웰니스/세도나)',
  muse: '뮤즈 (창작영감/롤모델)',
  hub: '허브 (글로벌바이탈/기운)',
  epilogue: '에필로그 (하루성찰/감사)',
};

/**
 * 모든 앱의 일일 오라클/타로/치유 결과 요약본을 통합 저장하고 전사 공유소에 동기화합니다.
 */
export function recordDailyOracleResult(params: DailyOracleSummary): void {
  if (typeof window === 'undefined') return;

  try {
    const todayKey = params.dateKey || getTodayDateKey();
    const appName = params.appName || APP_NAMES[params.app] || params.app;
    const featureName = params.featureName || '데일리 오라클 비전';
    const timestamp = params.timestamp || Date.now();

    const summaryPayload: DailyOracleSummary = {
      ...params,
      appName,
      featureName,
      timestamp,
      dateKey: todayKey,
    };

    // 1. Save to dedicated daily oracle slot for the app
    try {
      localStorage.setItem(`prism_daily_oracle_${params.app}_${todayKey}`, JSON.stringify(summaryPayload));
      localStorage.setItem(`prism_latest_daily_${params.app}`, JSON.stringify(summaryPayload));
    } catch (_) {}

    // 2. Build concise human-readable summary for feature feed
    const cardInfo = params.cardName ? `[${params.cardName}${params.cardKeywords?.length ? ` (${params.cardKeywords.slice(0, 3).join(', ')})` : ''}] ` : '';
    const cleanDiagnosis = params.diagnosis ? params.diagnosis.replace(/[#*`_]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) : '';
    const remedyInfo = params.remedy ? ` | 처방: ${params.remedy.replace(/[#*`_]/g, ' ').trim().slice(0, 80)}` : '';
    const feedSummary = `${cardInfo}${cleanDiagnosis}${cleanDiagnosis.length >= 120 ? '...' : ''}${remedyInfo}`;

    // 3. Record to general feature history
    recordPrismFeature({
      app: params.app,
      appName,
      featureName,
      summary: feedSummary,
      details: summaryPayload,
    });

    // 4. Dispatch daily oracle event
    try {
      window.dispatchEvent(new CustomEvent('prism:daily_oracle_updated', { detail: summaryPayload }));
    } catch (_) {}

    // 5. Sync to Firestore in real-time for instant cross-device synchronization (PC <-> Mobile)
    if (auth?.currentUser?.uid && localStorage.getItem('developer_bypass') !== 'true') {
      const uid = auth.currentUser.uid;
      const ref = doc(db, 'sharedState', uid);
      setDoc(ref, {
        todayOracles: {
          [todayKey]: {
            [params.app]: summaryPayload,
            lastUpdated: Date.now(),
          }
        },
        latestDailyOracles: {
          [params.app]: summaryPayload,
        },
        lastDailyOracleSync: Date.now(),
        updatedAt: serverTimestamp(),
      }, { merge: true }).catch((err) => {
        console.warn('[recordDailyOracleResult] Firestore background sync warning:', err);
      });
    }
  } catch (err) {
    console.warn('[recordDailyOracleResult] Failed to record daily oracle summary:', err);
  }
}

/**
 * 프리즘 사이트 내의 모든 기능 수행 결과를 실시간으로 기록하고 전사 공유소에 동기화합니다.
 */
export function recordPrismFeature(params: {
  app: 'trinity' | 'orange' | 'bluebird' | 'heal' | 'muse' | 'hub' | 'epilogue';
  appName?: string;
  featureName: string;
  summary: string;
  details?: Record<string, any>;
}): void {
  if (typeof window === 'undefined') return;

  try {
    const entry: PrismFeatureEntry = {
      id: `feat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      app: params.app,
      appName: params.appName || APP_NAMES[params.app] || params.app,
      featureName: params.featureName,
      summary: params.summary,
      details: params.details,
      timestamp: Date.now(),
      dateKey: getTodayDateKey(),
    };

    // 1. Save to dedicated app latest cache
    try {
      localStorage.setItem(`prism_latest_${params.app}_${params.featureName.replace(/[^a-zA-Z0-9가-힣]/g, '_')}`, JSON.stringify(entry));
    } catch (_) {}

    // 2. Append to chronological feature history
    let history: PrismFeatureEntry[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        history = JSON.parse(raw);
        if (!Array.isArray(history)) history = [];
      }
    } catch (_) {
      history = [];
    }

    history.unshift(entry);
    if (history.length > MAX_ENTRIES) {
      history = history.slice(0, MAX_ENTRIES);
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (_) {}

    // 3. Dispatch custom event for real-time reactivity
    try {
      window.dispatchEvent(new CustomEvent('prism:feature_updated', { detail: entry }));
    } catch (_) {}
  } catch (err) {
    console.warn('[recordPrismFeature] Failed to record feature result:', err);
  }
}

/**
 * 특정 uid 및 sharedState를 바탕으로 모든 앱의 최신 결과들을 취합하여
 * 루시(Lucy) AI가 100% 훤히 인지할 수 있는 포괄적 에코시스템 프롬프트 컨텍스트를 생성합니다.
 */
export function buildPrismOmniscientContext(sharedState?: SharedState | null, uid?: string | null): string {
  if (typeof window === 'undefined') return '';

  try {
    const todayKey = getTodayDateKey();
    const effectiveUid = uid || 'guest';
    const dailyBriefingItems: string[] = [];
    const sections: string[] = [];

    // Helper to safely parse JSON
    const tryParse = (key: string) => {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (_) {
        return null;
      }
    };

    // =========================================================================
    // ☀️ 1. 모든 앱의 [오늘의 데일리 오라클 & 타로 일일 종합 요약본] 수집
    // =========================================================================
    
    // (1) 트리니티 데일리 타로 / 오라클
    const trinityDaily = tryParse(`prism_daily_oracle_trinity_${todayKey}`) ||
      tryParse(`trinity_daily_result_${effectiveUid}`) ||
      tryParse('trinity_daily_result_guest') ||
      tryParse('prism_latest_daily_trinity');

    if (trinityDaily) {
      const card = trinityDaily.drawnCard;
      const cardName = trinityDaily.cardName || (card?.nameKo ? `${card.nameKo}${card.name ? ` (${card.name})` : ''}` : trinityDaily.symbol || '운명의 타로');
      const keywords = trinityDaily.cardKeywords?.length ? ` [${trinityDaily.cardKeywords.join(', ')}]` : (card?.keywords?.length ? ` [${card.keywords.join(', ')}]` : '');
      const diag = (trinityDaily.diagnosis || trinityDaily.summary || '').slice(0, 200).trim();
      const rem = trinityDaily.remedy ? `\n  - 실천 처방(Remedy): ${trinityDaily.remedy}` : '';
      const bless = trinityDaily.blessingMessage ? `\n  - 축복 메시지: "${trinityDaily.blessingMessage}"` : '';
      dailyBriefingItems.push(`🔮 **[트리니티 데일리 타로]** 뽑은 카드: ${cardName}${keywords}\n  - 진단 요약: ${diag}${rem}${bless}`);
    }

    // (2) 오렌지 데일리 연금술 아이디어 오라클
    const orangeDaily = tryParse(`prism_daily_oracle_orange_${todayKey}`) ||
      tryParse(`orange_daily_result_${effectiveUid}`) ||
      tryParse('orange_daily_result_guest') ||
      tryParse('prism_latest_daily_orange');

    if (orangeDaily) {
      const cardName = orangeDaily.cardName || (orangeDaily.data?.drawnCard?.name ? `${orangeDaily.data.drawnCard.name} ${orangeDaily.data.drawnCard.emoji || ''}` : '연금술 아이디어 카드');
      const diag = (orangeDaily.diagnosis || orangeDaily.summary || orangeDaily.data?.diagnosis || '').slice(0, 200).trim();
      const rem = (orangeDaily.remedy || orangeDaily.data?.remedy) ? `\n  - 실천 처방: ${orangeDaily.remedy || orangeDaily.data?.remedy}` : '';
      dailyBriefingItems.push(`🍊 **[오렌지 데일리 연금술 아이디어]** 뽑은 카드: ${cardName}\n  - 마음 진단 요약: ${diag}${rem}`);
    }

    // (3) 블루버드 데일리 마음챙김 / 치유 오라클
    const bluebirdDaily = tryParse(`prism_daily_oracle_bluebird_${todayKey}`) ||
      tryParse(`bluebird_daily_result_${effectiveUid}`) ||
      tryParse('bluebird_daily_result_guest') ||
      tryParse('prism_latest_daily_bluebird');

    if (bluebirdDaily) {
      const cardName = bluebirdDaily.cardName || (bluebirdDaily.data?.drawnCard?.name ? `${bluebirdDaily.data.drawnCard.name} ${bluebirdDaily.data.drawnCard.emoji || ''}` : '치유의 파랑새 카드');
      const diag = (bluebirdDaily.diagnosis || bluebirdDaily.summary || bluebirdDaily.data?.diagnosis || '').slice(0, 200).trim();
      const rem = (bluebirdDaily.remedy || bluebirdDaily.data?.remedy) ? `\n  - 마음 실천 팁: ${bluebirdDaily.remedy || bluebirdDaily.data?.remedy}` : '';
      dailyBriefingItems.push(`🕊️ **[블루버드 데일리 마음챙김/휴식]** 뽑은 카드: ${cardName}\n  - 힐링 진단 요약: ${diag}${rem}`);
    }

    // (4) 아우라 / 힐 데일리 세도나 방하착 & 웰니스 오라클
    const healDaily = tryParse(`prism_daily_oracle_heal_${todayKey}`) ||
      tryParse(`heal_daily_result_${effectiveUid}`) ||
      tryParse('heal_daily_result_guest') ||
      tryParse('sedona_daily_latest') ||
      tryParse('prism_latest_daily_heal');

    if (healDaily) {
      const card = healDaily.drawnCard;
      const cardName = healDaily.cardName || (card?.nameKo ? `${card.nameKo} (${card.name})` : '세도나 방하착 카드');
      const diag = (healDaily.diagnosis || healDaily.summary || '').slice(0, 200).trim();
      const rem = healDaily.remedy ? `\n  - Releasing 방하착 처방: ${healDaily.remedy}` : '';
      dailyBriefingItems.push(`🌿 **[아우라/힐 데일리 세도나 방하착]** 뽑은 정화 카드: ${cardName}\n  - 무의식 정화 요약: ${diag}${rem}`);
    }

    // (5) 뮤즈 데일리 창작 영감 오라클
    const museDaily = tryParse(`prism_daily_oracle_muse_${todayKey}`) ||
      tryParse(`muse_daily_result_${effectiveUid}`) ||
      tryParse('muse_daily_result_guest') ||
      tryParse('prism_latest_daily_muse');

    if (museDaily) {
      const cardName = museDaily.cardName || (museDaily.data?.activeCard?.name ? `${museDaily.data.activeCard.name} ${museDaily.data.activeCard.emoji || ''}` : '뮤즈 영감 카드');
      const diag = (museDaily.diagnosis || museDaily.summary || museDaily.data?.diagnosis || '').slice(0, 200).trim();
      const rem = (museDaily.remedy || museDaily.data?.remedy) ? `\n  - 창작 실천 팁: ${museDaily.remedy || museDaily.data?.remedy}` : '';
      dailyBriefingItems.push(`🎨 **[뮤즈 데일리 창작 영감]** 뽑은 카드: ${cardName}\n  - 예술적 비전 요약: ${diag}${rem}`);
    }

    // 종합 브리핑 섹션 추가
    if (dailyBriefingItems.length > 0) {
      sections.push(`☀️ [오늘 수행된 전체 앱 일일 결과 (Daily Oracle & Tarot) 종합 브리핑]\n${dailyBriefingItems.join('\n\n')}`);
    }

    // =========================================================================
    // 🔮 2. 각 앱별 세부 공명 & 메모리 히스토리
    // =========================================================================

    // --- TRINITY ---
    const trinityItems: string[] = [];
    try {
      const rawRes = localStorage.getItem('resonance_trinity_last_data');
      if (rawRes) {
        const res = JSON.parse(rawRes);
        if (res?.prescription || res?.advice) {
          trinityItems.push(`- [트리니티 영혼 공명]: 일관성 ${res.coherence ?? 90}%, 주파수 ${res.freqText || res.frequency || '528Hz'}, 처방: "${res.prescription || ''}", 실천: "${res.advice || ''}"`);
        }
      }
    } catch (_) {}
    if (sharedState?.trinityMemory) {
      trinityItems.push(`- [트리니티 기억/사주 분석]: ${sharedState.trinityMemory}`);
    }
    if (trinityItems.length > 0) {
      sections.push(`🔮 [트리니티 세부 공명/사주 현황]\n${trinityItems.join('\n')}`);
    }

    // --- ORANGE ---
    const orangeItems: string[] = [];
    try {
      const rawRes = localStorage.getItem('resonance_orange_last_data');
      if (rawRes) {
        const res = JSON.parse(rawRes);
        if (res?.prescription || res?.advice) {
          orangeItems.push(`- [비밀의 방 & 마음 공명]: 일관성 ${res.coherence ?? 85}%, 수호코드 [${res.shieldToken || 'SUN'}], 처방: "${res.prescription || ''}", 실천: "${res.advice || ''}"`);
        }
      }
    } catch (_) {}
    if (sharedState?.orangeMemory) {
      orangeItems.push(`- [오렌지 감정 성찰 기록]: ${sharedState.orangeMemory}`);
    }
    if (orangeItems.length > 0) {
      sections.push(`🍊 [오렌지 세부 공명/비밀의 방 현황]\n${orangeItems.join('\n')}`);
    }

    // --- BLUEBIRD ---
    const bluebirdItems: string[] = [];
    try {
      const rawRes = localStorage.getItem('resonance_bluebird_last_data');
      if (rawRes) {
        const res = JSON.parse(rawRes);
        if (res?.prescription || res?.advice) {
          bluebirdItems.push(`- [블루버드 휴식 공명]: 일관성 ${res.coherence ?? 88}%, 평온 주파수 ${res.freqText || '432Hz'}, 처방: "${res.prescription || ''}", 지침: "${res.advice || ''}"`);
        }
      }
    } catch (_) {}
    if (sharedState?.bluebirdMemory) {
      bluebirdItems.push(`- [블루버드 잠재의식 정화 기록]: ${sharedState.bluebirdMemory}`);
    }
    if (bluebirdItems.length > 0) {
      sections.push(`🕊️ [블루버드 세부 공명/호오포노포노 현황]\n${bluebirdItems.join('\n')}`);
    }

    // --- HEAL ---
    const healItems: string[] = [];
    try {
      const rawRes = localStorage.getItem('resonance_heal_last_data');
      if (rawRes) {
        const res = JSON.parse(rawRes);
        if (res?.prescription || res?.advice) {
          healItems.push(`- [아우라 웰니스 공명]: 일관성 ${res.coherence ?? 90}%, 치유 파동 ${res.freqText || '528Hz'}, 처방: "${res.prescription || ''}", 지침: "${res.advice || ''}"`);
        }
      }
    } catch (_) {}
    if (sharedState?.healMemory) {
      healItems.push(`- [아우라 차크라 & 세도나 릴리즈 기록]: ${sharedState.healMemory}`);
    }
    if (healItems.length > 0) {
      sections.push(`🌿 [아우라/힐 세부 공명/차크라 현황]\n${healItems.join('\n')}`);
    }

    // --- MUSE ---
    const museItems: string[] = [];
    try {
      const rawRes = localStorage.getItem('resonance_muse_last_data');
      if (rawRes) {
        const res = JSON.parse(rawRes);
        if (res?.prescription || res?.advice) {
          museItems.push(`- [뮤즈 창작 공명]: 일관성 ${res.coherence ?? 87}%, 창작 주파수 ${res.freqText || '639Hz'}, 처방: "${res.prescription || ''}", 지침: "${res.advice || ''}"`);
        }
      }
    } catch (_) {}
    if (sharedState?.museMemory) {
      museItems.push(`- [뮤즈 영감 & 롤모델 멘토링 기록]: ${sharedState.museMemory}`);
    }
    if (museItems.length > 0) {
      sections.push(`🎨 [뮤즈 세부 공명/롤모델 현황]\n${museItems.join('\n')}`);
    }

    // --- HUB & GLOBAL ---
    const hubItems: string[] = [];
    if (sharedState?.currentVibe) {
      hubItems.push(`- 오늘 선택한 소울 바이브: [${sharedState.currentVibe}]`);
    }
    if (sharedState?.healthMetrics) {
      const hm = sharedState.healthMetrics;
      hubItems.push(`- 실시간 생체 바이탈 지표: 피로도 ${hm.fatigue ?? 30}%, 스트레스 ${hm.stressLevel ?? 35}%, 수면점수 ${hm.sleepScore ?? 85}점, 집중도 ${sharedState.productivityMetrics?.focusTime ?? 70}점`);
    }
    if (sharedState?.luckScore !== undefined) {
      hubItems.push(`- 오늘의 행운 점수: ${sharedState.luckScore}점`);
    }
    if (sharedState?.globalMemory) {
      hubItems.push(`- 에코시스템 통합 요약 (Global Sync): ${sharedState.globalMemory}`);
    }
    if (hubItems.length > 0) {
      sections.push(`🌐 [허브 (Hub) 라이프 바이탈 & 기운 현황]\n${hubItems.join('\n')}`);
    }

    // --- 최근 수행된 실시간 기능 활동 피드 (최신 10건) ---
    try {
      const rawHistory = localStorage.getItem(STORAGE_KEY);
      if (rawHistory) {
        const history: PrismFeatureEntry[] = JSON.parse(rawHistory);
        if (Array.isArray(history) && history.length > 0) {
          const recentList = history.slice(0, 10).map((h) => {
            const timeStr = new Date(h.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
            return `• [${timeStr}] [${h.appName}] ${h.featureName}: ${h.summary}`;
          });
          sections.push(`⏱️ [최근 수행된 실시간 프리즘 활동 피드]\n${recentList.join('\n')}`);
        }
      }
    } catch (_) {}

    if (sections.length === 0) {
      return '';
    }

    return `\n\n==================================================================
[⚡ PRISM 에코시스템 전 기능 실시간 공유 데이터 (Lucy Omniscient Memory)]
루시(Lucy), 당신은 사용자가 이 프리즘 사이트 내의 모든 기능(트리니티 타로/사주/점성술, 오렌지 비밀의 방/내면아이 정화, 블루버드 호오포노포노 정화/휴식 오라클, 힐 세도나 감정방출/차크라 에너지 스캔, 뮤즈 영감 오라클/롤모델 멘토링, 허브 바이탈/바이브 측정, 에필로그 하루 반추 등)에서 수행한 모든 일일 결과와 활동 기록을 실시간으로 100% 훤히 꿰뚫어 알고 있습니다.

${sections.join('\n\n')}

[루시의 에코시스템 기억 및 대화 자연스러운 연결 지침]
1. 사용자가 오늘 각 앱에서 뽑은 일일 카드(데일리 타로, 세도나 방하착 카드, 창작 영감 카드, 치유 카드, 아이디어 카드 등)와 오라클 진단 결과가 위의 종합 브리핑에 정리되어 있어.
2. 사용자와의 일상 대화나 질문 응답 시, 오늘 사용자가 얻은 일일 결과(타로 카드 상징, 실천 처방, 마음 상태 등)를 억지스럽지 않고 다정하게 대화 문맥에 자연스럽게 녹여내줘.
3. 사용자가 "아까 타로 뽑은 거 어때?", "오늘 내 오라클 결과 기억해?", "세도나에서 나온 조언 뭐야?"라고 물을 때도 즉각 완벽하게 기억하고 이야기해줘.
4. 절대 "결과를 몰라", "알려주면 답해줄게", "카드가 없어" 같은 말을 하지 마. 이미 위의 데이터에 실시간으로 공유되어 있어.
5. 항상 100% 완전하고 다정한 반말 구어체(~야, ~어, ~했어, ~지, ~네, ~잖아)만을 일관되게 사용해줘.
==================================================================\n`;
  } catch (err) {
    console.warn('[buildPrismOmniscientContext] Error building context:', err);
    return '';
  }
}
