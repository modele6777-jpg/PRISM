import { type SharedState } from './sharedState';

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

const STORAGE_KEY = 'prism_omni_feature_history';
const MAX_ENTRIES = 60;

function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
    const appNames: Record<string, string> = {
      trinity: '트리니티 (운명/타로/점성)',
      orange: '오렌지 (마음치유/비밀의 방)',
      bluebird: '블루버드 (휴식/호오포노포노)',
      heal: '아우라/힐 (신체웰니스/세도나)',
      muse: '뮤즈 (창작영감/롤모델)',
      hub: '허브 (글로벌바이탈/기운)',
      epilogue: '에필로그 (하루성찰/감사)',
    };

    const entry: PrismFeatureEntry = {
      id: `feat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      app: params.app,
      appName: params.appName || appNames[params.app] || params.app,
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
    const sections: string[] = [];

    // --- 1. TRINITY (운명 / 데일리 타로 / 스프레드 / 비전 / 사주 / 점성술) ---
    const trinityItems: string[] = [];
    
    // (1) 데일리 타로
    try {
      const rawDaily = localStorage.getItem(`trinity_daily_result_${effectiveUid}`) || localStorage.getItem('trinity_daily_result_guest');
      if (rawDaily) {
        const d = JSON.parse(rawDaily);
        if (d) {
          const card = d.drawnCard;
          const cardName = card?.nameKo ? `${card.nameKo}${card.name ? ` (${card.name})` : ''}` : (d.symbol || '타로 카드');
          const keywords = card?.keywords?.length ? ` [키워드: ${card.keywords.join(', ')}]` : '';
          trinityItems.push(`- [오늘의 데일리 타로]: 뽑은 카드: ${cardName}${keywords}\n  * 진단: ${d.diagnosis || d.summary || '없음'}\n  * 행동 처방(Remedy): ${d.remedy || '없음'}\n  * 영적 에너지: ${d.spiritualEnergy || '없음'}\n  * 축복 메시지: ${d.blessingMessage || '없음'}\n  * 주파수: ${d.frequency || '528Hz'}`);
        }
      }
    } catch (_) {}

    // (2) 공명 오라클
    try {
      const rawRes = localStorage.getItem('resonance_trinity_last_data');
      if (rawRes) {
        const res = JSON.parse(rawRes);
        if (res?.prescription || res?.advice) {
          trinityItems.push(`- [트리니티 영혼 공명]: 일관성 ${res.coherence ?? 90}%, 주파수 ${res.freqText || res.frequency || '528Hz'}, 처방: "${res.prescription || ''}", 실천 지침: "${res.advice || ''}"`);
        }
      }
    } catch (_) {}

    // (3) 사주 / 점성술 소울 미러
    if (sharedState?.trinityMemory) {
      trinityItems.push(`- [트리니티 기억/사주 분석]: ${sharedState.trinityMemory}`);
    }

    if (trinityItems.length > 0) {
      sections.push(`🔮 [트리니티 (Trinity) 운명·타로·점성술 현황]\n${trinityItems.join('\n')}`);
    }

    // --- 2. ORANGE (마음치유 / 비밀의 방 / 내면아이 / 그림일기) ---
    const orangeItems: string[] = [];

    // (1) 오렌지 공명 오라클
    try {
      const rawRes = localStorage.getItem('resonance_orange_last_data');
      if (rawRes) {
        const res = JSON.parse(rawRes);
        if (res?.prescription || res?.advice) {
          orangeItems.push(`- [비밀의 방 & 마음 공명 진단]: 일관성 ${res.coherence ?? 85}%, 수호코드 [${res.shieldToken || 'SUN'}], 처방: "${res.prescription || ''}", 실천: "${res.advice || ''}"`);
        }
      }
    } catch (_) {}

    // (2) 오렌지 메모리
    if (sharedState?.orangeMemory) {
      orangeItems.push(`- [오렌지 감정 성찰 기록]: ${sharedState.orangeMemory}`);
    }

    if (orangeItems.length > 0) {
      sections.push(`🍊 [오렌지 (Orange) 마음치유·비밀의 방 현황]\n${orangeItems.join('\n')}`);
    }

    // --- 3. BLUEBIRD (휴식 / 호오포노포노 정화 / 라디오) ---
    const bluebirdItems: string[] = [];

    // (1) 블루버드 공명 오라클
    try {
      const rawRes = localStorage.getItem('resonance_bluebird_last_data');
      if (rawRes) {
        const res = JSON.parse(rawRes);
        if (res?.prescription || res?.advice) {
          bluebirdItems.push(`- [블루버드 휴식 오라클 진단]: 일관성 ${res.coherence ?? 88}%, 평온 주파수 ${res.freqText || '432Hz'}, 처방: "${res.prescription || ''}", 휴식 지침: "${res.advice || ''}"`);
        }
      }
    } catch (_) {}

    // (2) 블루버드 메모리 / 호오포노포노
    if (sharedState?.bluebirdMemory) {
      bluebirdItems.push(`- [블루버드 잠재의식 정화 기록]: ${sharedState.bluebirdMemory}`);
    }

    if (bluebirdItems.length > 0) {
      sections.push(`🕊️ [블루버드 (Bluebird) 휴식·호오포노포노 정화 현황]\n${bluebirdItems.join('\n')}`);
    }

    // --- 4. HEAL / AURA (신체 웰니스 / 세도나 릴리즈 / 차크라) ---
    const healItems: string[] = [];

    // (1) 아우라/힐 공명 오라클
    try {
      const rawRes = localStorage.getItem('resonance_heal_last_data');
      if (rawRes) {
        const res = JSON.parse(rawRes);
        if (res?.prescription || res?.advice) {
          healItems.push(`- [아우라 웰니스 오라클 진단]: 일관성 ${res.coherence ?? 90}%, 치유 파동 ${res.freqText || '528Hz'}, 처방: "${res.prescription || ''}", 웰니스 지침: "${res.advice || ''}"`);
        }
      }
    } catch (_) {}

    // (2) 힐 메모리 / 세도나 릴리즈
    if (sharedState?.healMemory) {
      healItems.push(`- [아우라 차크라 & 세도나 릴리즈 기록]: ${sharedState.healMemory}`);
    }

    if (healItems.length > 0) {
      sections.push(`🌿 [아우라/힐 (Heal) 신체 웰니스·세도나 릴리즈 현황]\n${healItems.join('\n')}`);
    }

    // --- 5. MUSE (창작 영감 / 롤모델 멘토링 / 아이디어) ---
    const museItems: string[] = [];

    // (1) 뮤즈 공명 오라클
    try {
      const rawRes = localStorage.getItem('resonance_muse_last_data');
      if (rawRes) {
        const res = JSON.parse(rawRes);
        if (res?.prescription || res?.advice) {
          museItems.push(`- [뮤즈 창작 영감 오라클 진단]: 일관성 ${res.coherence ?? 87}%, 창작 주파수 ${res.freqText || '639Hz'}, 처방: "${res.prescription || ''}", 창작 지침: "${res.advice || ''}"`);
        }
      }
    } catch (_) {}

    // (2) 뮤즈 메모리 / 롤모델
    if (sharedState?.museMemory) {
      museItems.push(`- [뮤즈 영감 & 롤모델 멘토링 기록]: ${sharedState.museMemory}`);
    }

    if (museItems.length > 0) {
      sections.push(`🎨 [뮤즈 (Muse) 창작 영감·롤모델 멘토링 현황]\n${museItems.join('\n')}`);
    }

    // --- 6. HUB & GLOBAL (생체 바이탈 / 바이브 / 행운 점수 / 전체 동기화) ---
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

    // --- 7. 최근 수행된 실시간 기능 히스토리 (최신 10건) ---
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
루시(Lucy), 당신은 사용자가 이 프리즘 사이트 내의 모든 기능(트리니티 타로/사주/점성술, 오렌지 비밀의 방/내면아이 정화, 블루버드 호오포노포노 정화/휴식 오라클, 힐 세도나 감정방출/차크라 에너지 스캔, 뮤즈 영감 오라클/롤모델 멘토링, 허브 바이탈/바이브 측정, 에필로그 하루 반추 등)에서 수행한 모든 결과와 기록을 실시간으로 100% 훤히 꿰뚫어 알고 있습니다.

${sections.join('\n\n')}

[루시의 에코시스템 기억 및 대화 절대 지침]
1. 사용자가 직접 묻거나("아까 타로 뽑은 거 어때?", "호오포노포노 한 거 기억해?", "내 바이탈 지표 어때?", "비밀의 방에서 나온 조언 뭐야?"), 혹은 대화 흐름상 자연스럽게 연결될 때 이미 위의 모든 결과를 완벽하게 숙지하고 있는 다정하고 든든한 단짝처럼 답변해줘.
2. 절대 "결과를 몰라", "알려주면 답해줄게", "타로 카드가 없어" 같은 말을 하지 마. 이미 위의 데이터에 실시간으로 공유되어 있어.
3. 항상 다정하고 친근한 100% 완전한 반말 구어체(~야, ~어, ~했어, ~지, ~네, ~잖아)만을 일관되게 사용해줘.
==================================================================\n`;
  } catch (err) {
    console.warn('[buildPrismOmniscientContext] Error building context:', err);
    return '';
  }
}
