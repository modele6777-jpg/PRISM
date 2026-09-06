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

/**
 * 🌟 9대 고대 룬 차원 스펙트럼 (The 9 Elder Runic Dimensions)
 * [태초의 빛: 루시] ➔ [7대 고대 룬 차원 도구] ➔ [심연의 어둠: 크리스탈 오브]
 */
export interface NineStageDimension {
  stage: number; // 1 ~ 9
  id: string;
  title: string;
  path: string;
  runeSymbol: string;
  runeName: string;
  runeMeaning: string;
  themeColor: string;
  accentGlow: string;
  phase: WarpPhase;
}

export const NINE_STAGE_SPECTRUM: NineStageDimension[] = [
  {
    stage: 1,
    id: 'lucy',
    title: '루시 1:1 심층 대화',
    path: '/chat',
    runeSymbol: '✨',
    runeName: 'Solar Lucy',
    runeMeaning: '태초의 순백 광채와 영혼의 가이드',
    themeColor: '#ffffff',
    accentGlow: 'rgba(255, 255, 255, 0.95)',
    phase: 'whitehole',
  },
  {
    stage: 2,
    id: 'orange',
    title: '오렌지 5분 루틴',
    path: '/orange',
    runeSymbol: 'ᛋ',
    runeName: 'Sowilo',
    runeMeaning: '번개와 태양의 즉각 실행력',
    themeColor: '#f97316',
    accentGlow: 'rgba(249, 115, 22, 0.9)',
    phase: 'event_horizon',
  },
  {
    stage: 3,
    id: 'bluebird',
    title: '파랑새의 성소',
    path: '/bluebird',
    runeSymbol: 'ᛒ',
    runeName: 'Berkana',
    runeMeaning: '일상의 감사와 작은 평온',
    themeColor: '#38bdf8',
    accentGlow: 'rgba(56, 189, 248, 0.9)',
    phase: 'event_horizon',
  },
  {
    stage: 4,
    id: 'muse',
    title: '뮤즈 예술처방',
    path: '/muse',
    runeSymbol: 'ᚹ',
    runeName: 'Wunjo',
    runeMeaning: '예술적 희열과 하모니',
    themeColor: '#a855f7',
    accentGlow: 'rgba(168, 85, 247, 0.9)',
    phase: 'event_horizon',
  },
  {
    stage: 5,
    id: 'lettinggo',
    title: '레팅고 메서드',
    path: '/heal',
    runeSymbol: 'ᛉ',
    runeName: 'Algiz',
    runeMeaning: '보호와 방하착 비움',
    themeColor: '#10b981',
    accentGlow: 'rgba(16, 185, 129, 0.9)',
    phase: 'event_horizon',
  },
  {
    stage: 6,
    id: 'hoponopono',
    title: '호오포노포노 정화',
    path: '/heal',
    runeSymbol: 'ᚷ',
    runeName: 'Gebo',
    runeMeaning: '화해와 4마디 감정 정화',
    themeColor: '#06b6d4',
    accentGlow: 'rgba(6, 182, 212, 0.9)',
    phase: 'event_horizon',
  },
  {
    stage: 7,
    id: 'epilogue',
    title: '에필로그 밤 서재',
    path: '/epilogue',
    runeSymbol: 'ᚨ',
    runeName: 'Ansuz',
    runeMeaning: '신성한 지혜와 영감의 기록',
    themeColor: '#eab308',
    accentGlow: 'rgba(234, 179, 8, 0.9)',
    phase: 'event_horizon',
  },
  {
    stage: 8,
    id: 'trinity',
    title: '오라클 타로',
    path: '/trinity',
    runeSymbol: 'ᛈ',
    runeName: 'Pertho',
    runeMeaning: '운명과 심층 무의식의 비밀',
    themeColor: '#c084fc',
    accentGlow: 'rgba(192, 132, 252, 0.9)',
    phase: 'event_horizon',
  },
  {
    stage: 9,
    id: 'orb',
    title: '크리스탈 오브',
    path: '/orb',
    runeSymbol: '🔮',
    runeName: 'Crystal Orb',
    runeMeaning: '절대 고요의 특이점과 직관 해답',
    themeColor: '#09090b',
    accentGlow: 'rgba(245, 158, 11, 0.95)',
    phase: 'blackhole',
  },
];

/**
 * 2단계: 터치 압력/시간 기반 9대 차원 스펙트럼 합성 (<100ms)
 * - 0 ~ 180ms: 1단계 루시 1:1 대화 (빛비춤 화이트홀)
 * - 180 ~ 1250ms: 2~8단계 7대 차원 고대 룬 스펙트럼
 * - 1250ms 이상: 9단계 크리스탈 오브 (어둠의 심연 블랙홀 특이점)
 */
export function synthesizeWarpTarget(context: OmniWarpContext, metrics: WarpForceMetrics): OmniWarpTarget {
  const T = forceToAiTemperature(metrics.virtualForce);
  
  let stageIdx = 0;
  if (metrics.virtualForce < 0.15) {
    stageIdx = 0; // 1단계 (루시)
  } else if (metrics.virtualForce >= 0.85) {
    stageIdx = 8; // 9단계 (크리스탈 오브)
  } else {
    // 0.15 ~ 0.85 사이의 7개 앱 단계 (인덱스 1 ~ 7)
    const normalized = (metrics.virtualForce - 0.15) / 0.70;
    stageIdx = 1 + Math.min(6, Math.max(0, Math.floor(normalized * 7)));
  }

  const dim = NINE_STAGE_SPECTRUM[stageIdx];

  return {
    phase: dim.phase,
    gauge: metrics.virtualForce,
    aiTemperature: T,
    title: dim.title,
    actionType: `omniwarp_stage_${dim.id}`,
    destinationPath: dim.path,
    previewLabel: `[${dim.stage}/9] ${dim.runeSymbol} ${dim.title}`,
    previewDescription: `${dim.runeName}(${dim.runeMeaning}): ${dim.title}`,
    themeColor: dim.themeColor,
    accentGlow: dim.accentGlow,
    stageIndex: dim.stage,
    runeSymbol: dim.runeSymbol,
    runeName: dim.runeName,
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
