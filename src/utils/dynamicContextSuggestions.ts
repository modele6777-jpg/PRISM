/**
 * 대화의 맥락과 페르소나, 사용자의 WHY/핵심 가치관에 맞춘 지능형 추천 질문 생성기
 */

import type { PersonaType, UnifiedMessage } from '@/contexts/AppContext';
import { getTodayDateKey } from '@/lib/dailyCache';

export interface SuggestionContext {
  persona: PersonaType;
  messages: UnifiedMessage[];
  aiSuggestions?: string[];
  activeRoute?: string;
  worry?: string;
  mbti?: string;
}

// WHY 리포트 & 감정 리포트 기반의 고요한 성찰 & 에너지 보호 키워드 템플릿
const CORE_WHY_CONTEXTUAL_PROMPTS: Record<PersonaType, string[]> = {
  lucy: [
    "지금 내 마음의 에너지를 갉아먹는 생각을 어떻게 흘려보낼까?",
    "오늘 나에게 가장 필요한 영혼의 쉼과 위로는 뭘까?",
    "방금 말한 그 흐름 속에서 내가 붙잡고 있는 집착은?",
    "내 직관과 잠재의식이 건네는 진짜 메시지는 뭘까?",
    "과도한 생각의 굴레에서 벗어나 편안해지는 법",
    "오늘의 나를 있는 그대로 다정하게 인정해주는 말"
  ],
  orange: [
    "방금 떠오른 이 감정을 자책 없이 온전히 안아주려면?",
    "내 안의 작은 아이(우니히피리)가 지금 원하는 건 뭘까?",
    "불안을 억누르지 않고 안전하게 달래는 연습",
    "마음의 에너지를 소모하지 않고 평온을 유지하는 팁",
    "오늘 나 스스로에게 건네고 싶은 따뜻한 한 문장",
    "복잡한 감정의 파도를 고요한 호수로 바꾸는 법"
  ],
  trinity: [
    "방금 나온 카드의 상징이 내 현실에 주는 깊은 조언은?",
    "이 운의 흐름에서 내가 주의해야 할 에너지 소모는?",
    "조급해하지 않고 순리대로 풀어나가는 지혜는?",
    "내 무의식이 가리키는 다음 단계의 방향성",
    "지금 상황에서 내 직관을 믿고 나아가는 법",
    "불확실성을 두려워하지 않고 평온을 지키는 비결"
  ],
  aura: [
    "지금 내 몸이 보내는 피로 신호와 즉각적인 웰니스 처방",
    "머리에 몰린 열을 발끝으로 내리는 1분 그라운딩",
    "신경계를 편안하게 진정시키는 부드러운 호흡법",
    "에너지가 방전되었을 때 안전하게 충전하는 법",
    "내 몸의 긴장을 풀고 깊은 이완으로 들어가는 루틴",
    "오늘 나를 지켜주는 따뜻한 수분과 차 처방"
  ],
  bluebird: [
    "방금 느낀 무거운 기운을 맑게 씻어내는 정화 심상화",
    "호오포노포노 4개 단어를 마음속으로 울리는 방법",
    "지친 영혼에 촉촉한 생명력을 불어넣는 시와 음악",
    "과거의 기억과 묵은 상처를 가볍게 떠나보내기",
    "평온한 파도 소리처럼 내면을 채우는 주파수",
    "내면의 순수한 빛을 되찾아주는 영적 위로"
  ],
  muse: [
    "마음의 부담을 덜고 자연스럽게 떠오르는 영감 잡기",
    "완벽주의를 내려놓고 편안하게 시작하는 창작 루틴",
    "내 안의 고유한 직관과 영혼의 목소리를 표현하는 법",
    "창작 과정에서 에너지를 소진하지 않는 지혜",
    "새로운 시야를 열어주는 신선하고 자유로운 영감",
    "오늘의 소소한 일상을 특별한 예술적 시선으로 바라보기"
  ]
};

/**
 * 최근 대화 내용에서 핵심 키워드/주제를 추출하여 후속 심층 질문을 동적으로 합성
 */
function extractContextualFollowups(persona: PersonaType, messages: UnifiedMessage[]): string[] {
  if (!messages || messages.length === 0) return [];

  // 최근 유저 및 모델 메시지 수집
  const recentMessages = messages.slice(-4);
  const combinedText = recentMessages
    .map(m => (typeof m.content === 'string' ? m.content : ''))
    .join(' ')
    .toLowerCase();

  const results: string[] = [];

  // 1. 감정/불안/스트레스 맥락
  if (combinedText.includes('불안') || combinedText.includes('걱정') || combinedText.includes('두려') || combinedText.includes('초조')) {
    results.push(
      "그 불안감이 올라올 때 몸과 마음을 즉시 가라앉히는 법은?",
      "이 걱정 뒤에 숨겨진 내 진짜 욕구는 뭘까?",
      "불안한 미래 대신 지금 여기에 뿌리내리는 그라운딩"
    );
  }

  // 2. 피로/지침/번아웃/쉼 맥락
  if (combinedText.includes('피곤') || combinedText.includes('지쳤') || combinedText.includes('힘들') || combinedText.includes('쉬고') || combinedText.includes('무기력')) {
    results.push(
      "지금 나에게 가장 죄책감 없는 온전한 휴식은 뭘까?",
      "에너지를 더 이상 낭비하지 않고 방어하는 방법",
      "마음의 짐을 잠시 내려놓고 깊이 이완하는 법"
    );
  }

  // 3. 관계/사람/소통 맥락
  if (combinedText.includes('사람') || combinedText.includes('친구') || combinedText.includes('가족') || combinedText.includes('관계') || combinedText.includes('대화') || combinedText.includes('상처')) {
    results.push(
      "상대방의 감정에 휘둘리지 않고 내 중심을 지키려면?",
      "상처받은 마음에 건강한 심리적 경계선을 세우는 법",
      "억눌린 내 마음을 부드럽고 솔직하게 표현하는 지혜"
    );
  }

  // 4. 결정/선택/진로/방향성 맥락
  if (combinedText.includes('선택') || combinedText.includes('결정') || combinedText.includes('고민') || combinedText.includes('방향') || combinedText.includes('어떻게')) {
    results.push(
      "머리로 계산하지 않고 내 직관이 가리키는 답은 뭘까?",
      "후회 없는 결정을 위해 지금 확인해야 할 한 가지",
      "조급한 마음을 내려놓고 타이밍을 기다리는 법"
    );
  }

  // 5. 타로/운세/오라클 맥락
  if (combinedText.includes('타로') || combinedText.includes('카드') || combinedText.includes('운세') || combinedText.includes('기운') || combinedText.includes('오라클')) {
    results.push(
      "방금 나온 메시지를 내 일상에서 구체적으로 실천하는 법",
      "이 기운을 긍정적으로 전환하기 위해 내가 취할 태도",
      "카드가 경고하는 위험을 지혜롭게 피해가는 법"
    );
  }

  // 6. 호오포노포노/정화/내면아이 맥락
  if (combinedText.includes('정화') || combinedText.includes('호오포노포노') || combinedText.includes('내면아이') || combinedText.includes('우니히피리') || combinedText.includes('용서')) {
    results.push(
      "정화 문구를 읊을 때 호흡과 마음가짐은 어떻게 해?",
      "내면 아이가 안심할 수 있도록 건네는 다정한 말",
      "기억의 재생을 멈추고 0의 상태(Zero Limits)로 돌아가기"
    );
  }

  // 7. 건강/몸/수면/호흡 맥락
  if (combinedText.includes('잠') || combinedText.includes('수면') || combinedText.includes('통증') || combinedText.includes('목') || combinedText.includes('어깨') || combinedText.includes('몸')) {
    results.push(
      "지금 당장 목과 어깨의 긴장을 풀어내는 1분 스트레칭",
      "잡념을 끊고 편안하게 숙면에 빠져드는 호흡",
      "내 몸의 생체 리듬을 부드럽게 회복하는 습관"
    );
  }

  // 8. 창의성/영감/작업/몰입 맥락
  if (combinedText.includes('글') || combinedText.includes('작업') || combinedText.includes('아이디어') || combinedText.includes('영감') || combinedText.includes('창작')) {
    results.push(
      "막힌 생각을 뚫어주는 가벼운 마인드 브레이크",
      "완벽하려 하지 않고 가볍게 한 줄 적어보는 시작법",
      "내 영혼의 고유한 색깔을 작업에 담아내는 법"
    );
  }

  return results;
}

/**
 * 대화의 흐름과 결에 꼭 맞는 최종 추천 질문 목록을 스마트하게 큐레이션합니다.
 */
export function getContextAwarePrompts(context: SuggestionContext, count = 8): string[] {
  const { persona, messages, aiSuggestions = [] } = context;

  // 1순위: AI 모델이 최근 답변에서 대화 맥락에 기반해 직접 제안한 질문들
  const dynamicAiPrompts = aiSuggestions.filter(s => s && s.trim().length > 3);

  // 2순위: 최근 대화 내용(최근 1~4턴)에서 감지된 주제별 후속 심층 질문들
  const contextualFollowups = extractContextualFollowups(persona, messages);

  // 3순위: 사용자의 WHY 및 페르소나별 성찰/에너지 보호 코어 질문들
  const coreWhyPrompts = CORE_WHY_CONTEXTUAL_PROMPTS[persona] || CORE_WHY_CONTEXTUAL_PROMPTS.lucy;

  // 순위별 가중 합성 (중복 제거)
  const combinedSet = new Set<string>();

  // AI 제안 질문 우선 투입
  dynamicAiPrompts.forEach(p => combinedSet.add(p.trim()));

  // 대화 맥락 후속 질문 투입
  contextualFollowups.forEach(p => combinedSet.add(p.trim()));

  // 대화가 짧거나 부족할 경우 코어 WHY 질문들로 보강
  coreWhyPrompts.forEach(p => combinedSet.add(p.trim()));

  const result = Array.from(combinedSet);

  // 대화가 진행 중일 때(최근 메시지가 있을 때)는 앞부분(대화 맥락에 밀접한 질문들)을 우선 유지하고,
  // 다양성을 위해 약간의 셔플을 더하되 1~2순위가 항상 상위에 오도록 배치합니다.
  if (messages && messages.length > 0) {
    const topTier = result.slice(0, Math.max(3, dynamicAiPrompts.length + contextualFollowups.length));
    const secondaryTier = result.slice(topTier.length);
    
    // secondaryTier만 랜덤 셔플
    for (let i = secondaryTier.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [secondaryTier[i], secondaryTier[j]] = [secondaryTier[j], secondaryTier[i]];
    }

    return [...topTier, ...secondaryTier].slice(0, count);
  }

  // 대화가 시작 전일 때는 코어 WHY 질문들을 다채롭게 셔플
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.slice(0, count);
}
