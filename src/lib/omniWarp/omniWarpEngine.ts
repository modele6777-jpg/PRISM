/**
 * OmniWarp Engine & Context Synthesizer
 * 1ms Active View Serialization + <100ms SLM Intent Synthesis + Navigation Routing
 */

import { OmniWarpContext, OmniWarpTarget, WarpForceMetrics, BigBangCommitEventDetail } from './types';
import { forceToAiTemperature } from './forceSensor';
import { omniWarpAudio } from './omniWarpAudio';
import { triggerHaptic } from './omniWarpHaptics';

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
 */
export function synthesizeWarpTarget(context: OmniWarpContext, metrics: WarpForceMetrics): OmniWarpTarget {
  const norm = context.activeRoute.toLowerCase();
  const T = forceToAiTemperature(metrics.virtualForce);
  const phase = metrics.phase;

  // 1. 화이트홀: T = 0.0 ~ 0.2 (고정밀·수렴)
  if (phase === 'whitehole') {
    if (norm.includes('trinity')) {
      return {
        phase,
        gauge: metrics.virtualForce,
        aiTemperature: T,
        title: '뮤즈 예술처방',
        actionType: 'convergent_art_cure',
        destinationPath: '/muse',
        previewLabel: '✨ 화이트홀 · 타로 상징의 즉각적 명화 큐레이션',
        previewDescription: '현재 마주한 타로의 상징을 가장 순수한 명화 3위 일체로 즉각 방출합니다.',
        themeColor: '#ffffff',
        accentGlow: 'rgba(255, 255, 255, 0.95)',
      };
    }
    if (norm.includes('muse')) {
      return {
        phase,
        gauge: metrics.virtualForce,
        aiTemperature: T,
        title: '에필로그 밤 서재',
        actionType: 'convergent_save_reflection',
        destinationPath: '/epilogue',
        previewLabel: '✨ 화이트홀 · 감상 영감 즉시 회고 저장',
        previewDescription: '방금 감상한 명화의 여운을 밤 서재의 첫 문장으로 신속하게 봉헌합니다.',
        themeColor: '#ffffff',
        accentGlow: 'rgba(255, 255, 255, 0.95)',
      };
    }
    if (norm.includes('orange')) {
      return {
        phase,
        gauge: metrics.virtualForce,
        aiTemperature: T,
        title: '5분 루틴 즉시 시작',
        actionType: 'convergent_timer_start',
        destinationPath: '/orange',
        previewLabel: '✨ 화이트홀 · 5분 카운트다운 초광속 착수',
        previewDescription: '망설임 없이 즉각 5분 몰입 타이머를 가동합니다.',
        themeColor: '#ffffff',
        accentGlow: 'rgba(255, 255, 255, 0.95)',
      };
    }
    if (norm.includes('heal')) {
      return {
        phase,
        gauge: metrics.virtualForce,
        aiTemperature: T,
        title: '뮤즈 힐링 예술처방',
        actionType: 'convergent_heal_to_art',
        destinationPath: '/muse',
        previewLabel: '✨ 화이트홀 · 정화된 영혼을 위한 빛의 예술',
        previewDescription: '정화된 마음에 맑은 빛을 채우는 명곡과 명시를 즉각 띄웁니다.',
        themeColor: '#ffffff',
        accentGlow: 'rgba(255, 255, 255, 0.95)',
      };
    }
    // Default / Prologue White Hole
    return {
      phase,
      gauge: metrics.virtualForce,
      aiTemperature: T,
      title: '뮤즈 오늘의 예술처방',
      actionType: 'convergent_daily_art',
      destinationPath: '/muse',
      previewLabel: '✨ 화이트홀 · 오늘의 핵심 예술 영감 즉시 방출',
      previewDescription: '지금 이 순간 가장 필요한 명화·명시·명곡을 1초 만에 큐레이션합니다.',
      themeColor: '#ffffff',
      accentGlow: 'rgba(255, 255, 255, 0.95)',
    };
  }

  // 2. 사건의 지평선: T = 0.3 ~ 0.7 (맥락 확장 & 시공간 왜곡)
  if (phase === 'event_horizon') {
    if (norm.includes('trinity')) {
      return {
        phase,
        gauge: metrics.virtualForce,
        aiTemperature: T,
        title: '오렌지 5분 루틴',
        actionType: 'expand_action_routine',
        destinationPath: '/orange',
        previewLabel: '🌀 사건의 지평선 · 무의식의 통찰을 즉각 실행으로',
        previewDescription: '타로가 일러준 운명의 상징을 5분 루틴의 현실 행동으로 전환합니다.',
        themeColor: '#a855f7',
        accentGlow: 'rgba(168, 85, 247, 0.9)',
      };
    }
    if (norm.includes('muse')) {
      return {
        phase,
        gauge: metrics.virtualForce,
        aiTemperature: T,
        title: '트리니티 오라클',
        actionType: 'expand_art_to_oracle',
        destinationPath: '/trinity',
        previewLabel: '🌀 사건의 지평선 · 명화 속 상징을 타로로 해독',
        previewDescription: '예술 작품에 깃든 원형적 상징을 3장의 오라클 카드로 심층 해석합니다.',
        themeColor: '#a855f7',
        accentGlow: 'rgba(168, 85, 247, 0.9)',
      };
    }
    if (norm.includes('orange')) {
      return {
        phase,
        gauge: metrics.virtualForce,
        aiTemperature: T,
        title: '에필로그 하루 마감',
        actionType: 'expand_routine_to_epilogue',
        destinationPath: '/epilogue',
        previewLabel: '🌀 사건의 지평선 · 루틴 실행 기록의 서재 봉헌',
        previewDescription: '오늘 집중했던 성취와 감각을 에필로그 서재의 한 편의 글로 확장합니다.',
        themeColor: '#a855f7',
        accentGlow: 'rgba(168, 85, 247, 0.9)',
      };
    }
    // Default / Hub Event Horizon
    return {
      phase,
      gauge: metrics.virtualForce,
      aiTemperature: T,
      title: '트리니티 오라클 타로',
      actionType: 'expand_unconscious_bridge',
      destinationPath: '/trinity',
      previewLabel: '🌀 사건의 지평선 · 내면아이 무의식 차원 연결',
      previewDescription: '표면적 생각을 넘어선 무의식의 심층 상징으로 시공간을 접어 연결합니다.',
      themeColor: '#a855f7',
      accentGlow: 'rgba(168, 85, 247, 0.9)',
    };
  }

  // 3. 블랙홀: T = 0.8 ~ 1.5 (발산·초월·특이점 완전 압축)
  if (norm.includes('chat') || norm.includes('lucy')) {
    return {
      phase: 'blackhole',
      gauge: metrics.virtualForce,
      aiTemperature: T,
      title: '오라클 심연 특이점',
      actionType: 'transcendent_unconscious_singularity',
      destinationPath: '/trinity',
      previewLabel: '🕳️ 블랙홀 · 대화의 모든 기억을 타로 특이점에 소환',
      previewDescription: '루시와의 모든 대화 맥락을 암흑 특이점에 압축하여 근원 무의식 카드로 전환합니다.',
      themeColor: '#09090b',
      accentGlow: 'rgba(249, 115, 22, 0.95)',
    };
  }
  if (norm.includes('trinity')) {
    return {
      phase: 'blackhole',
      gauge: metrics.virtualForce,
      aiTemperature: T,
      title: '루시 1:1 심층 상담',
      actionType: 'transcendent_deep_lucy_dialogue',
      destinationPath: '/chat',
      previewLabel: '🕳️ 블랙홀 · 3장의 카드를 삼켜 심연의 비밀 대화로',
      previewDescription: '타로에 비친 모든 운명의 실타래를 안고 루시의 영혼과 1:1 심층 밀담을 나눕니다.',
      themeColor: '#09090b',
      accentGlow: 'rgba(249, 115, 22, 0.95)',
    };
  }
  if (norm.includes('muse')) {
    return {
      phase: 'blackhole',
      gauge: metrics.virtualForce,
      aiTemperature: T,
      title: '호오포노포노 대정화',
      actionType: 'transcendent_catharsis_cleansing',
      destinationPath: '/heal',
      previewLabel: '🕳️ 블랙홀 · 모든 감정의 파도를 특이점에 완전 소멸',
      previewDescription: '예술 감상 중 일어난 번뇌와 상처를 4마디 정화의 심연 속에 완전히 녹여냅니다.',
      themeColor: '#09090b',
      accentGlow: 'rgba(249, 115, 22, 0.95)',
    };
  }

  // Default Black Hole Singularity: Lucy Cosmic Singularity
  return {
    phase: 'blackhole',
    gauge: metrics.virtualForce,
    aiTemperature: T,
    title: '루시 영혼의 심연 대화',
    actionType: 'transcendent_lucy_singularity',
    destinationPath: '/chat',
    previewLabel: '🕳️ 블랙홀 · 전 우주적 맥락을 압축한 초월적 심층 대화',
    previewDescription: '현재의 모든 맥락을 암흑 구체에 집약하여 루시의 가장 깊은 지혜의 방으로 도약합니다.',
    themeColor: '#09090b',
    accentGlow: 'rgba(249, 115, 22, 0.95)',
  };
}

/**
 * 3단계: 빅뱅 커밋 (Big Bang Commit) 실행 및 내비게이션 라우팅
 */
export function executeBigBangCommit(
  target: OmniWarpTarget,
  context: OmniWarpContext,
  metrics: WarpForceMetrics
): void {
  // 1. Audio & Haptic Impact Kick
  omniWarpAudio.playBigBang();
  triggerHaptic('bigbang');

  // 2. Serialize Payload to SessionStorage
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

  // 3. Dispatch Big Bang Expansion Screen Event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('prism:bigbang_commit', {
        detail: payload,
      })
    );

    // 4. Smooth Navigation Routing after slight cosmological delay for visual impact
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
