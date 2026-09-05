/**
 * OmniWarp Engine & Context Synthesizer
 * 1ms Active View Serialization + <100ms SLM Intent Synthesis + Navigation Routing
 * Fully Unified with Prism Toss Pipeline & Registry
 */

import { OmniWarpContext, OmniWarpTarget, WarpForceMetrics, BigBangCommitEventDetail } from './types';
import { forceToAiTemperature } from './forceSensor';
import { omniWarpAudio } from './omniWarpAudio';
import { triggerHaptic } from './omniWarpHaptics';
import { getTossRule } from '@/lib/prismTossRegistry';
import { sendPrismToss } from '@/lib/prismToss';

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
 * 2단계: 터치 압력/온도 기반 온디바이스 SLM 맥락 합성 (<100ms)
 * 통합 토스 레지스트리(Primary / Secondary / Tertiary)와 완전 연동
 */
export function synthesizeWarpTarget(context: OmniWarpContext, metrics: WarpForceMetrics): OmniWarpTarget {
  const norm = context.activeRoute.replace('/', '') || 'hub';
  const T = forceToAiTemperature(metrics.virtualForce);
  const phase = metrics.phase;

  // 토스 레지스트리의 맥락 라우팅 룰 추출
  const rule = getTossRule(norm, `${context.summary} ${context.primarySubject || ''}`);

  // 1. 화이트홀: T = 0.0 ~ 0.2 (토스 1순위 목적지 · 빛처럼 즉각 방출)
  if (phase === 'whitehole') {
    const dest = rule.primary;
    return {
      phase,
      gauge: metrics.virtualForce,
      aiTemperature: T,
      title: dest.name,
      actionType: 'convergent_primary_toss',
      destinationPath: dest.path,
      previewLabel: `✨ 화이트홀 · 1순위: ${dest.name}`,
      previewDescription: dest.description || '현재 마주한 영감을 가장 순수한 빛으로 즉각 방출합니다.',
      themeColor: '#ffffff',
      accentGlow: 'rgba(255, 255, 255, 0.95)',
    };
  }

  // 2. 사건의 지평선: T = 0.3 ~ 0.7 (토스 2순위 목적지 · 맥락 확장 및 웜홀 전이)
  if (phase === 'event_horizon') {
    const dest = rule.secondary;
    return {
      phase,
      gauge: metrics.virtualForce,
      aiTemperature: T,
      title: dest.name,
      actionType: 'expand_secondary_toss',
      destinationPath: dest.path,
      previewLabel: `🌀 사건의 지평선 · 2순위: ${dest.name}`,
      previewDescription: dest.description || '시공간을 접어 연관 행동과 시너지 차원으로 도약합니다.',
      themeColor: '#a855f7',
      accentGlow: 'rgba(168, 85, 247, 0.9)',
    };
  }

  // 3. 블랙홀: T = 0.8 ~ 1.5 (토스 3순위 심연 목적지 · 모든 맥락을 특이점에 완전 압축)
  const dest = rule.tertiary;
  return {
    phase: 'blackhole',
    gauge: metrics.virtualForce,
    aiTemperature: T,
    title: dest.name,
    actionType: 'transcendent_tertiary_singularity',
    destinationPath: dest.path,
    previewLabel: `🕳️ 블랙홀 · 심연 초월: ${dest.name}`,
    previewDescription: `모든 맥락을 특이점에 완전 압축하여 ${dest.name}(으)로 심층 도약합니다.`,
    themeColor: '#09090b',
    accentGlow: 'rgba(249, 115, 22, 0.95)',
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

  // AI 원터치 자동 발화를 위한 고도화 프롬프트(autoPrompt) 합성
  let autoPrompt = '';
  const orb = context.sessionData?.orbInsight;
  const oracle = context.sessionData?.oracleReading;
  const art = context.sessionData?.artContext;

  if (orb?.keyTheme && orb?.directAnswer) {
    autoPrompt = `루시야, 방금 크리스탈 오브에서 [${orb.keyTheme}] 직관 해답을 마주했어:\n• 나의 질문: "${orb.query}"\n• 직관의 해답: "${orb.directAnswer}"\n• 실천 가이드: "${orb.actionSolution}"\n\n이 해답의 깊은 의미를 풀이해주고, 오늘 내가 당장 실천에 옮길 수 있는 구체적인 행동 가이드를 들려줘.`;
  } else if (oracle?.cards && oracle.cards.length > 0) {
    const cardNames = oracle.cards.map((c: any) => c.nameKo || c.name).join(', ');
    autoPrompt = `루시야, 방금 오라클 타로에서 [${cardNames}] 카드를 마주했어. 내 무의식의 상징과 현재 운의 흐름을 풀이해주고, 오늘 내가 취해야 할 마음가짐을 가이드해줘.`;
  } else if (art?.anchorArtworkTitle) {
    autoPrompt = `루시야, 방금 뮤즈에서 명작 "${art.anchorArtworkTitle}"의 예술 처방을 감상했어. 이 예술적 울림과 영감을 바탕으로 내 마음에 힘이 되는 이야기를 들려줘.`;
  } else {
    autoPrompt = `루시야, 방금 [${context.activeTitle}]에서 빅뱅 웜홀을 타고 건너왔어. 방금 마주한 영감("${context.primarySubject || context.summary}")의 맥락을 이어서 깊이 있는 가이드를 들려줘.`;
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
