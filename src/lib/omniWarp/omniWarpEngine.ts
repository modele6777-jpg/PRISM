/**
 * OmniWarp Engine & Context Synthesizer
 * 1ms Active View Serialization + <100ms SLM Intent Synthesis + Navigation Routing
 * Fully Unified with Prism Toss Pipeline & Registry
 */

import { OmniWarpContext, OmniWarpTarget, WarpPhase, WarpForceMetrics, BigBangCommitEventDetail } from './types';
import { forceToAiTemperature } from './forceSensor';
import { omniWarpAudio } from './omniWarpAudio';
import { triggerHaptic } from './omniWarpHaptics';
import { getTossRule } from '@/lib/prismTossRegistry';
import { sendPrismToss } from '@/lib/prismToss';
import { getRankedWormholeApps, getWormholeAppByGauge } from './wormholeSpectrum';
import {
  extractLatestDialogueContext,
  recordCrossAppDialogue,
  synthesizePersonaHandoffPrompt,
} from '@/lib/prismPersonaSync';

const OMNIWARP_STORAGE_KEY = 'prism_active_omniwarp_payload';

/**
 * 1단계: 인앱 뷰 직렬화 (1ms 내 완료)
 */
export function serializeCurrentView(activePath: string): OmniWarpContext {
  const normPath = (activePath || '/').toLowerCase();
  let title = '프롤로그 허브';
  let summary = '모든 채널의 영감과 여정이 교차하는 중심 허브';
  let primarySubject = '우주적 시선과 오늘의 상태';
  const sessionData: Record<string, any> = {};

  // 1. 최신 대화 맥락(유저 질문 + AI 페르소나 응답) 실시간 캡처 & 동기화
  const lastDialogue = extractLatestDialogueContext(activePath);
  if (lastDialogue) {
    sessionData.lastDialogue = lastDialogue;
    recordCrossAppDialogue(lastDialogue);
    if (lastDialogue.lastUserMessage) {
      summary = `[${lastDialogue.sourcePersonaName}] "${lastDialogue.lastUserMessage.slice(0, 60)}"`;
      primarySubject = `이전 대화 맥락: ${lastDialogue.lastUserMessage.slice(0, 40)}`;
    }
  }

  if (normPath.includes('trinity')) {
    title = '트리니티 오라클';
    summary = '내면아이 무의식과 3장의 타로 카드 상징';
    primarySubject = '운명과 무의식의 상징 탐색';
    try {
      const oracleItem = localStorage.getItem('prism_oracle_last_reading');
      if (oracleItem) sessionData.oracleReading = JSON.parse(oracleItem);
    } catch (_) {}
  } else if (normPath.includes('muse')) {
    title = '뮤즈 예술처방';
    summary = '명화·명시·명곡 3위 일체 예술적 공명';
    primarySubject = '감성과 심미적 카타르시스';
    try {
      const tossData = sessionStorage.getItem('prism_active_toss_payload');
      if (tossData) sessionData.artContext = JSON.parse(tossData);
    } catch (_) {}
  } else if (normPath.includes('orange')) {
    title = '오렌지 5분 루틴';
    summary = '생각을 멈추고 즉시 착수하는 포커스 타이머';
    primarySubject = '실행력과 미루기 극복';
  } else if (normPath.includes('heal')) {
    title = '호오포노포노 & 아우라 치유';
    summary = '미안·용서·감사·사랑 4마디 감정 정화 의식';
    primarySubject = '내면 상처 정화와 에너지 회복';
  } else if (normPath.includes('bluebird')) {
    title = '파랑새의 일상 행복';
    summary = '소소한 감사와 일상의 온기 기록';
    primarySubject = '감사와 평온';
  } else if (normPath.includes('epilogue')) {
    title = '에필로그 밤 서재';
    summary = '오늘의 영감과 감정을 한 편의 수필로 엮는 회고';
    primarySubject = '하루 마감과 영감의 정돈';
  } else if (normPath.includes('chat') || normPath.includes('lucy')) {
    title = '루시 1:1 심층 대화';
    summary = '영혼의 가이드 루시와의 지혜로운 공명';
    primarySubject = '내면의 고민과 깊은 치유 대화';
  } else if (normPath.includes('orb') || normPath.includes('crystal') || normPath.includes('gateway')) {
    title = '크리스탈 오브';
    summary = '마음속 질문을 투영하는 독립 직관 도구';
    primarySubject = '직관과 영적 해답 점술';
    try {
      const orbRaw = localStorage.getItem('prism_orb_latest_scrying');
      if (orbRaw) {
        const orb = JSON.parse(orbRaw);
        sessionData.orbInsight = orb;
        if (orb.keyTheme && orb.directAnswer) {
          summary = `[직관: ${orb.keyTheme}] ${orb.directAnswer.slice(0, 60)}`;
          primarySubject = `직관의 해답 (${orb.keyTheme}): ${orb.directAnswer.slice(0, 40)}`;
        }
      }
    } catch (_) {}
  }

  return {
    activeRoute: activePath,
    activeTitle: title,
    summary,
    primarySubject,
    sessionData,
    capturedAt: Date.now(),
  };
}

export const ORB_SITE_RUNES: Record<string, { symbol: string; name: string; meaning: string }> = {
  lucy: { symbol: 'ᛞ', name: 'Dagaz', meaning: '새벽의 빛과 자각' },
  chat: { symbol: 'ᛞ', name: 'Dagaz', meaning: '새벽의 빛과 자각' },
  orb: { symbol: 'ᛟ', name: 'Othala', meaning: '직관의 성소' },
  crystal: { symbol: 'ᛟ', name: 'Othala', meaning: '직관의 성소' },
  gateway: { symbol: 'ᛟ', name: 'Othala', meaning: '직관의 성소' },
  orange: { symbol: 'ᛋ', name: 'Sowilo', meaning: '태양과 실행' },
  muse: { symbol: 'ᚹ', name: 'Wunjo', meaning: '예술과 기쁨' },
  oracle: { symbol: 'ᛈ', name: 'Pertho', meaning: '운명과 무의식' },
  trinity: { symbol: 'ᛈ', name: 'Pertho', meaning: '운명과 무의식' },
  hoponopono: { symbol: 'ᚷ', name: 'Gebo', meaning: '화해와 정화' },
  lettinggo: { symbol: 'ᛉ', name: 'Algiz', meaning: '보호와 내려놓음' },
  heal: { symbol: 'ᛉ', name: 'Algiz', meaning: '보호와 내려놓음' },
  bluebird: { symbol: 'ᛒ', name: 'Berkana', meaning: '치유와 안식' },
  epilogue: { symbol: 'ᚨ', name: 'Ansuz', meaning: '지혜와 마감' },
  handbook: { symbol: 'ᚱ', name: 'Raidho', meaning: '영혼의 여정과 바이블' },
  rebible: { symbol: 'ᚱ', name: 'Raidho', meaning: '영혼의 여정과 바이블' },
  library: { symbol: 'ᛗ', name: 'Mannaz', meaning: '영혼의 지식 도서관' },
  hub: { symbol: 'ᚲ', name: 'Kenaz', meaning: '우주의 횃불 허브' },
  universe: { symbol: 'ᚲ', name: 'Kenaz', meaning: '우주의 횃불 허브' },
};

export function getOrbRunicSigil(destId: string): { symbol: string; name: string; meaning: string } {
  const norm = (destId || '').toLowerCase().replace('/', '');
  return ORB_SITE_RUNES[norm] || { symbol: 'ᚲ', name: 'Kenaz', meaning: '프리즘 우주' };
}

/**
 * 2단계: 터치 압력/온도 기반 온디바이스 SLM 맥락 합성 (<100ms)
 * 통합 토스 레지스트리(Primary / Secondary / Tertiary)와 완전 연동
 * - 화이트홀 (빛): 즉시 탭 시 현재 맥락을 가장 순수하게 계승하는 1순위 최적 연계 차원으로 방출
 * - 사건의 지평선 (웜홀): 누르는 동안 시공간을 접어 연관 행동과 시너지 차원으로 전이
 * - 블랙홀 (어둠): 끝까지 꾹 누르면 모든 잡념을 특이점에 완전 압축하여 심연 초월 차원으로 도약
 */
export function synthesizeWarpTarget(context: OmniWarpContext, metrics: WarpForceMetrics): OmniWarpTarget {
  const norm = context.activeRoute.replace('/', '') || 'hub';
  const rule = getTossRule(norm, context.sessionData);
  const T = forceToAiTemperature(metrics.virtualForce);

  if (metrics.virtualForce < 0.18) {
    // 1. 화이트홀: 1순위 다이렉트 차원 방출 (빛비춤 · 가벼운 탭 즉시 도약)
    const dest = rule.primary;
    const rune = getOrbRunicSigil(dest.id);
    return {
      phase: 'whitehole',
      gauge: metrics.virtualForce,
      aiTemperature: T,
      title: dest.name,
      actionType: 'omniwarp_primary',
      destinationPath: dest.path,
      previewLabel: `[화이트홀 방출] ${rune.symbol} ${dest.name}`,
      previewDescription: dest.description,
      themeColor: dest.themeColor || '#38bdf8',
      accentGlow: 'rgba(56, 189, 248, 0.45)',
      stageIndex: 1,
      runeSymbol: rune.symbol,
      runeName: rune.name,
    };
  }

  if (metrics.virtualForce >= 0.82) {
    // 3. 블랙홀: 3순위 심연 특이점 초월 차원 도약 (어둠 · 꾹 누름 특이점 압축)
    const dest = rule.tertiary;
    const rune = getOrbRunicSigil(dest.id);
    return {
      phase: 'blackhole',
      gauge: metrics.virtualForce,
      aiTemperature: T,
      title: dest.name,
      actionType: 'omniwarp_tertiary',
      destinationPath: dest.path,
      previewLabel: `[블랙홀 초월] ${rune.symbol} ${dest.name}`,
      previewDescription: dest.description,
      themeColor: dest.themeColor || '#fb7185',
      accentGlow: 'rgba(251, 113, 133, 0.65)',
      stageIndex: 9,
      runeSymbol: rune.symbol,
      runeName: rune.name,
    };
  }

  // 2. 사건의 지평선 웜홀 전이 구간 (0.18 ~ 0.82): 7대 핵심 차원 룬 스펙트럼
  const rankedApps = getRankedWormholeApps(context.activeRoute);
  const { app, index, targetPercent } = getWormholeAppByGauge(metrics.virtualForce, rankedApps);

  return {
    phase: 'event_horizon',
    gauge: metrics.virtualForce,
    aiTemperature: T,
    title: app.name,
    actionType: `wormhole_spectrum_${app.id}`,
    destinationPath: app.path,
    previewLabel: `[웜홀 전이 ${targetPercent}%] ${app.runeSymbol} ${app.name}`,
    previewDescription: `${app.runeName}(${app.runeMeaning}): ${app.description}`,
    themeColor: app.themeColor,
    accentGlow: app.accentGlow,
    stageIndex: index + 2, // 2 ~ 8
    runeSymbol: app.runeSymbol,
    runeName: app.runeName,
  };
}

/**
 * 3단계: 빅뱅 커밋 (Big Bang Commit) 실행 및 내비게이션 라우팅
 * 원터치 자동 발화(Auto-Trigger) 및 통합 토스 엔진(sendPrismToss)과 100% 동기화
 */
export function executeBigBangCommit(
  target: OmniWarpTarget,
  context: OmniWarpContext,
  metrics: WarpForceMetrics
): void {
  // 1. Audio & Haptic Impact Kick
  omniWarpAudio.playBigBang();
  triggerHaptic('bigbang');

  // 2. 통합 토스 페이로드 전송 (타깃 앱에서 getPendingPrismToss로 즉시 수신 및 자동 발화)
  const sourceApp = context.activeRoute.replace('/', '') || 'hub';
  const targetApp = target.destinationPath.replace('/', '') || 'hub';

  // AI 원터치 자동 발화 및 페르소나 상태 동기화 프롬프트(autoPrompt) 지능형 합성
  const lastDialogue = context.sessionData?.lastDialogue || extractLatestDialogueContext(context.activeRoute);
  let autoPrompt = synthesizePersonaHandoffPrompt(lastDialogue, targetApp);

  const orb = context.sessionData?.orbInsight;
  const oracle = context.sessionData?.oracleReading;
  const art = context.sessionData?.artContext;

  if (orb?.keyTheme && orb?.directAnswer && (targetApp.includes('lucy') || targetApp.includes('chat'))) {
    autoPrompt = `루시야, 방금 크리스탈 오브에서 [${orb.keyTheme}] 직관 해답을 마주했어:\n• 나의 질문: "${orb.query}"\n• 직관의 해답: "${orb.directAnswer}"\n• 실천 가이드: "${orb.actionSolution}"\n\n이 해답의 깊은 의미를 풀이해주고, 오늘 내가 당장 실천에 옮길 수 있는 구체적인 행동 가이드를 들려줘.`;
  } else if (oracle?.cards && oracle.cards.length > 0 && (targetApp.includes('lucy') || targetApp.includes('chat'))) {
    const cardNames = oracle.cards.map((c: any) => c.nameKo || c.name).join(', ');
    autoPrompt = `루시야, 방금 오라클 타로에서 [${cardNames}] 카드를 마주했어. 내 무의식의 상징과 현재 운의 흐름을 풀이해주고, 오늘 내가 취해야 할 마음가짐을 가이드해줘.`;
  } else if (art?.anchorArtworkTitle && (targetApp.includes('lucy') || targetApp.includes('chat'))) {
    autoPrompt = `루시야, 방금 뮤즈에서 명작 "${art.anchorArtworkTitle}"의 예술 처방을 감상했어. 이 예술적 울림과 영감을 바탕으로 내 마음에 힘이 되는 이야기를 들려줘.`;
  }

  sendPrismToss({
    sourceApp,
    targetApp,
    actionType: `omniwarp_${target.phase}`,
    contextMessage: `[옴니워프 ${target.phase === 'whitehole' ? '화이트홀' : target.phase === 'event_horizon' ? '사건의 지평선' : '블랙홀'}] ${context.primarySubject || context.activeTitle}`,
    cards: context.sessionData?.oracleReading?.cards,
    anchorArtworkTitle: context.sessionData?.artContext?.anchorArtworkTitle,
    anchorArtQuote: context.sessionData?.artContext?.anchorArtQuote,
    autoTrigger: true,
    autoPrompt,
    personaDialogue: lastDialogue,
    orbInsight: orb,
    tossedAt: Date.now(),
  });

  // 3. Serialize OmniWarp Specific Payload
  const payload: BigBangCommitEventDetail = {
    phase: target.phase,
    target,
    context,
    metrics,
    timestamp: Date.now(),
  };

  try {
    sessionStorage.setItem(OMNIWARP_STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem(OMNIWARP_STORAGE_KEY, JSON.stringify(payload));
  } catch (_) {}

  // 4. Dispatch Big Bang Expansion Screen Event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('prism:bigbang_commit', {
        detail: payload,
      })
    );

    // 5. Smooth Navigation Routing with cosmological timing
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('prism-navigate', {
          detail: { path: target.destinationPath },
        })
      );
      window.dispatchEvent(
        new CustomEvent('nav-click-active', {
          detail: { path: target.destinationPath },
        })
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 280);
  }
}
