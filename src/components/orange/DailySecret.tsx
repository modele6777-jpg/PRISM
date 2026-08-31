import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, KeyRound, Copy, Check, RefreshCw, Heart, Eye, PenLine,
  ListChecks, Moon, Timer, Plus, X, BookOpen, Keyboard, Shuffle,
} from 'lucide-react';
import { z } from 'zod';
import { useApp } from '@/contexts/AppContext';
import { invokeLLMStructured } from '@/lib/ai';
import { recordPrismFeature } from '@/lib/prismOmniSync';
import { sendDailySecretToLucy } from '@/lib/oracleDeepInsight';
import { TTSButton } from '@/components/TTSButton';
import { playTTS, stopTTS } from '@/utils/tts';
import { ScriptingTypingPractice } from './ScriptingTypingPractice';

const DailySecretSchema = z.object({
  affirmation: z.string().describe('Today’s Secret Affirmation: 사용자의 소원이 이미 완벽히 이루어졌음을 선언하는 현재완료형 강력한 확언 1문장 (예: "나의 소원 ...은(는) 이미 우주의 완벽한 섭리 안에서 기적처럼 이루어졌으며...")'),
  reflection: z.string().describe('Believe · 믿음으로 새기기: 마음속 의심과 조급함을 지우고 소원이 이미 영적 차원에 존재함을 확신하게 돕는 깊이 있는 통찰 사색 2~3문장 (절대 affirmation과 같은 문장을 반복하지 말고 완전히 다른 사색적인 문장으로 작성)'),
  action: z.string().describe('Receive · 오늘의 작은 실천: 소원이 이미 이루어진 사람처럼 오늘 당장 실천할 수 있는 구체적인 일상/신체적 행동 1문장 (예: "오늘 하루 가벼운 발걸음으로 산책하며 주변에 미소 짓기" 등 구체적 미션. 절대 affirmation이나 reflection 문장을 복사하지 마세요)'),
  desire: z.string().describe('Ask · 오늘의 소원 선언: 사용자의 소원을 바탕으로 우주에 명확하고 간결하게 요청하는 선언문 1문장'),
  visualizationGuide: z.string().describe('68초 오감 시각화: 사용자의 소원이 생생히 실현된 장면을 오감(시각, 청각, 촉각, 벅찬 감정)으로 느끼는 시각화 가이드 3~4문장'),
  gratitudeSeeds: z.array(z.string()).describe('감사 자석: 소원 성취 주파수를 높이고 풍요를 여는 서로 다른 구체적 감사 3가지'),
  feelingAnchor: z.string().describe('Feel · 이미 받은 느낌: 소원이 이미 이루어졌을 때 느껴지는 벅찬 기쁨과 안도감을 생생히 환기하는 감정 한 줄'),
  mirrorPhrase: z.string().describe('거울 확언: 거울 속 나를 보며 소원 성취의 확신과 자존감을 채우는 거울 확언 1문장'),
  eveningPrompt: z.string().describe('저녁 감사 마무리: 소원이 이루어짐에 감사하며 편안한 수면으로 들어가는 저녁 마무리 1문장'),
  scriptingStarter: z.string().describe('스크립팅 노트: 소원이 완벽히 실현된 현재의 하루를 생생하게 써 내려가는 일기 첫 문장'),
  appliedWish: z.string().optional().describe('이 키트 생성에 적용된 사용자의 소원 원문'),
});

type DailySecretData = z.infer<typeof DailySecretSchema>;

function generateTailoredSecretFallback(wishStr: string, name = '여행자'): DailySecretData {
  const cleanWish = wishStr.trim() || '온전한 내면의 평온과 뜻밖의 풍요로운 행운';
  const lower = cleanWish.toLowerCase();

  let affirmation = `나의 삶은 언제나 나를 가장 완전하고 조화로운 길로 이끌며, 내 안의 모든 저항과 의심이 녹아내려 찬란한 결실과 깊은 평온이 기적처럼 실현되었습니다.`;
  let reflection = `원하는 것을 바란다는 것은 그것이 이미 영적 차원에 온전히 준비되어 있다는 증거입니다. 결핍과 조급함의 주파수를 내려놓고, 이미 모든 것이 완벽히 채워진 평온의 자리에 머무세요. 우주는 언제나 당신의 고요한 확신에 화답합니다.`;
  let action = `오늘 하루 모든 긴장을 내려놓고 가슴을 활짝 편 채, 이미 소원을 이룬 사람의 여유로운 미소로 주변 사람들에게 따뜻한 친절을 건네보세요.`;
  let desire = `우주여, ${name}의 삶에 "${cleanWish}"의 소망이 가장 지혜롭고 아름다운 방식으로 피어나게 하옵소서.`;
  let visualizationGuide = `조용히 눈을 감고 깊은 숨을 들이마십니다. 당신이 염원하던 "${cleanWish}"의 상황이 눈앞에 환하고 선명한 현실로 펼쳐집니다. 안도의 숨결과 함께 얼굴에 번지는 벅찬 미소, 온몸으로 전해지는 따스한 전율을 오감으로 생생히 느껴 보세요.`;
  let feelingAnchor = `모든 걱정이 씻은 듯 사라지고 가슴 깊은 곳에서 차오르는 벅찬 안도감과 충만한 기쁨`;
  let mirrorPhrase = `거울 속 나를 보며 선언합니다. "${name}, 너는 이 모든 기적과 축복을 온전히 누릴 자격이 충분해."`;
  let eveningPrompt = `오늘 우주에 띄워 보낸 평화와 확신의 파동이 밤사이 무한한 결실로 자라남을 믿으며 깊은 안식에 듭니다.`;
  let scriptingStarter = `오늘 하루, 마침내 내 마음속 간절했던 소망이 현실에서 기적처럼 풀려나가는 벅찬 순간을 경험했다.`;

  if (/시험|합격|자격증|취득|수능|고시|임용|승진|면접|평가|성적|취업|입사/.test(lower)) {
    affirmation = `나는 내가 성실히 쌓아온 모든 지혜와 역량을 온전히 신뢰하며, 결정적인 모든 순간 맑은 집중력과 차분한 확신으로 가장 눈부신 합격과 성공의 문을 당당히 열었습니다.`;
    reflection = `결과는 평가장에서 결정되는 것이 아니라, 지금 이 순간 당신의 확신에 찬 마인드셋에서 이미 결정됩니다. 의심을 지우고 이미 합격증을 손에 쥔 기쁨의 주파수에 주파수를 맞추세요.`;
    action = `공부나 작업 공간을 1분간 단정히 정돈하고, 합격 후 당당하게 웃고 있을 나의 모습을 상상하며 깊은 심호흡을 3회 하세요.`;
    desire = `우주여, ${name}이(가) 준비해온 모든 배움과 노력이 시험과 평가에서 최고의 집중력과 만점의 지혜로 발휘되어 빛나는 결실을 맺게 하옵소서.`;
    visualizationGuide = `눈을 감고 최종 합격자 명단에서 당신의 이름을 또렷이 발견하는 순간을 그려봅니다. 가슴이 쿵쾅거리며 터져 나오는 환호성, 눈가에 맺히는 감격의 눈물, 가족과 지인들의 벅찬 축하를 생생하게 느껴보세요.`;
    feelingAnchor = `심장이 벅차오르는 감격과 "해냈다!"라는 뜨거운 확신의 안도감`;
    mirrorPhrase = `${name}, 너는 최고의 역량을 유감없이 발휘할 것이며, 합격의 영광은 이미 너의 것이다.`;
    scriptingStarter = `합격 소식을 전해 들은 오늘, 그동안의 노력이 눈부신 결실로 증명되어 감사와 감격의 눈물이 흘렀다.`;
  } else if (/돈|재물|금전|부자|수입|매출|연봉|빚|채무|자산|투자|수익|통장|부동산|경제/.test(lower)) {
    affirmation = `나를 옥죄던 금전적 결핍과 조급함은 완전히 사라졌으며, 나의 가치와 재능에 걸맞은 거대한 풍요와 뜻밖의 재정적 기적이 매일 폭포수처럼 쏟아져 들어옵니다.`;
    reflection = `풍요는 돈을 좇아 애쓸 때가 아니라, 내 안의 풍요로운 감사 주파수에 머물 때 자연스럽게 끌어당겨집니다. 돈에 대한 두려움을 내려놓고 우주의 무한한 공급 원천을 신뢰하세요.`;
    action = `지갑을 열어 지폐를 정갈하게 정리하거나, 오늘 나를 위해 쓴 작은 지출에 대해 "풍요를 순환시켜 주어 감사합니다"라고 마음속으로 축복하세요.`;
    desire = `우주여, ${name}의 모든 재정적 통로를 활짝 열어주시고, 맑고 정당한 풍요와 경제적 자유의 기적이 풍성히 유입되게 하옵소서.`;
    visualizationGuide = `통장에 상상 이상의 풍요로운 금액이 찍히는 알림을 선명히 바라봅니다. 어깨를 짓누르던 모든 재정적 걱정이 눈 녹듯 사라지고, 사랑하는 사람들에게 아낌없이 베풀며 누리는 벅찬 여유를 오감으로 느껴보세요.`;
    feelingAnchor = `재정적 불안에서 완전히 해방되어 누리는 형언할 수 없는 자유와 든든한 안정감`;
    mirrorPhrase = `${name}, 너는 우주의 무한한 부와 번영을 풍성하게 누리고 세상에 나눌 자격이 넘친다.`;
    scriptingStarter = `오늘 나의 재정적 흐름이 극적으로 반전되어 통장에 풍요가 가득 차오르고 감사한 기회가 쏟아졌다.`;
  } else if (/연애|사랑|인연|결혼|화해|남친|여친|배우자|이별|재회|짝사랑|인간관계|친구|가족|대화|갈등/.test(lower)) {
    affirmation = `오해와 불안의 장벽은 눈 녹듯 사라졌으며, 우리는 서로를 깊이 존중하고 아끼는 진실한 사랑과 신뢰 속에서 그 어느 때보다 따뜻하고 단단하게 연결되어 있습니다.`;
    reflection = `관계의 치유와 진정한 사랑은 타인을 바꾸려 애쓰는 것이 아니라, 내 마음속의 두려움과 방어벽을 내려놓는 것에서 시작됩니다. 당신이 사랑 그 자체가 될 때 완벽한 인연이 화답합니다.`;
    action = `소중한 사람을 떠올리며 그 사람의 장점 1가지를 마음속으로 축복하거나, 다정한 안부나 미소를 먼저 건네보세요.`;
    desire = `우주여, ${name}의 마음에 상처와 불신을 녹여주시고, 서로를 귀하게 여기는 운명적인 조화와 깊은 사랑의 축복을 내려주옵소서.`;
    visualizationGuide = `눈을 감고 서로의 눈을 다정히 바라보며 따뜻하게 손을 맞잡는 순간을 그립니다. 모든 오해와 서운함이 포근히 녹아내리고, 온몸을 감싸는 평온한 온기와 진심 어린 미소를 생생히 느껴보세요.`;
    feelingAnchor = `가슴 한구석을 찌르던 외로움이 사라지고 온 영혼이 포근한 사랑으로 가득 채워지는 따스함`;
    mirrorPhrase = `${name}, 너는 그 자체로 사랑받기에 충분하며, 온 우주가 너에게 가장 진실한 사랑을 보내고 있다.`;
    scriptingStarter = `오늘 소중한 그 사람과 마음의 벽을 허물고 진심 어린 사랑과 신뢰를 확인하며 벅찬 행복을 느꼈다.`;
  } else if (/건강|피로|치유|통증|수면|불면|잠|활력|다이어트|몸|질병|치료|컨디션|아픔/.test(lower)) {
    affirmation = `내 몸과 마음을 짓누르던 피로와 통증은 흔적 없이 씻겨 나갔으며, 머리끝부터 발끝까지 맑고 강인한 생명력과 세포 하나하나의 완전한 회복이 이루어졌습니다.`;
    reflection = `우리의 몸은 스스로를 치유하고 본래의 조화로운 상태로 돌아가려는 놀라운 자연 치유력을 지니고 있습니다. 몸에 대한 걱정을 내려놓고, 세포들이 건강하게 호흡하는 순수한 생명력을 믿으세요.`;
    action = `따뜻한 물 한 컵을 천천히 음미하며 마시고, 양손을 가슴과 배에 얹고 "내 몸아 고마워, 너는 건강하게 회복되고 있어"라고 속삭여주세요.`;
    desire = `우주여, ${name}의 신체와 마음에 맑고 성스러운 치유의 에너지를 채워주시고, 세포 하나하나가 본래의 건강과 활력으로 회복되게 하옵소서.`;
    visualizationGuide = `온몸의 모든 관절과 근육이 솜털처럼 가벼워지고, 신선한 아침 공기 속에서 가볍게 뛰어오르는 자신의 모습을 그려봅니다. 맑은 혈색, 깊고 고요한 호흡, 샘솟는 에너지를 온몸의 감각으로 만끽해보세요.`;
    feelingAnchor = `몸의 무거움이 사라지고 날아갈 듯 가벼워진 심신과 맑은 활력의 상쾌함`;
    mirrorPhrase = `${name}, 네 몸은 날마다 더 건강하고 강인해지고 있으며, 완벽한 치유 에너지가 넘쳐난다.`;
    scriptingStarter = `오늘 아침, 밤새 깊은 숙면을 취하고 눈을 떴을 때 온몸에 넘치는 활력과 가벼움을 느끼며 감사의 숨을 쉬었다.`;
  } else if (/불안|우울|걱정|자존감|자신감|스트레스|두려움|평온|마음|상처|트라우마|공황|잡념/.test(lower)) {
    affirmation = `나를 흔들던 모든 불안과 과거의 그림자는 지나가는 구름처럼 흩어졌으며, 나는 지금 흔들리지 않는 내면의 단단한 평온과 절대적인 자기 신뢰 속에 현존합니다.`;
    reflection = `감정은 당신의 실체가 아니라 지나가는 날씨일 뿐입니다. 구름 뒤의 태양처럼 당신의 본질은 언제나 온전하고 안전합니다. 모든 통제 욕구를 내려놓고 지금 이 순간의 평화에 나를 맡기세요.`;
    action = `창밖의 넓은 하늘을 10초간 응시하며 깊은 날숨으로 가슴 속 묵은 한숨을 모두 토해내고 어깨를 툭 떨어뜨리세요.`;
    desire = `우주여, ${name}의 내면에 깃든 모든 두려움과 불안을 거두어주시고, 어떤 파도 앞에서도 평온한 바다처럼 단단한 자기 신뢰를 채워주옵소서.`;
    visualizationGuide = `눈을 감고 고요한 호숫가에 앉아 잔잔한 수면을 바라보는 모습을 그립니다. 마음에 일던 모든 파도가 잠잠해지고, 세상 어떤 풍파에도 흔들리지 않는 중심을 잡은 나 자신을 느껴보세요.`;
    feelingAnchor = `가슴을 옥죄던 불안의 사슬이 끊어지고 온몸으로 번지는 맑고 깊은 해방감`;
    mirrorPhrase = `${name}, 너는 이미 그 자체로 완전하고 강인하며, 어떤 상황에서도 너 자신을 지킬 힘이 있다.`;
    scriptingStarter = `오늘 마침내 마음을 짓누르던 무거운 돌덩이를 내려놓고, 온전한 평온과 내면에 깃든 단단한 힘을 되찾았다.`;
  }

  return {
    desire,
    affirmation,
    reflection,
    action,
    visualizationGuide,
    gratitudeSeeds: [
      `나의 상황 "${cleanWish}"이(가) 가장 조화롭고 완벽한 방식으로 해결되고 있음에 감사합니다.`,
      `오늘 하루 내 안에 숨 쉬는 무한한 회복력과 끌어당김의 힘에 감사합니다.`,
      `나를 둘러싼 모든 우주의 질서가 나의 행복과 성장을 돕고 있음에 감사합니다.`,
    ],
    feelingAnchor,
    mirrorPhrase,
    eveningPrompt,
    scriptingStarter,
    appliedWish: wishStr.trim() || undefined,
  };
}

const STORAGE_KEY = 'orange_daily_secret_v2';
const LEGACY_KEYS = ['orange_daily_secret_v1', 'orange_daily_affirmation_v1'];

const PRACTICE_ITEMS = [
  { id: 'affirmation', label: '시크릿 확언 읽기/듣기' },
  { id: 'gratitude', label: '감사 3가지 느끼기' },
  { id: 'visualization', label: '68초 시각화 완료' },
  { id: 'mirror', label: '거울 확언 말하기/듣기' },
  { id: 'feeling', label: '이미 받은 것처럼 기분 느끼기' },
  { id: 'action', label: '오늘의 작은 실천 하기' },
] as const;

type PracticeId = (typeof PRACTICE_ITEMS)[number]['id'];

function todayKey(): string {
  return new Date().toLocaleDateString('sv');
}

function dayStorageKey(suffix: string) {
  return `orange_daily_secret_${suffix}_${todayKey()}`;
}

function ensureFullKit(
  raw: Partial<DailySecretData> | null | undefined,
  wishStr: string = '',
  name: string = '여행자',
): DailySecretData | null {
  if (!raw) return null;
  const effectiveWish = raw.appliedWish || wishStr.trim() || undefined;
  const fallback = generateTailoredSecretFallback(effectiveWish || '', name);

  let affirmation = raw.affirmation?.trim() || fallback.affirmation;
  let reflection = raw.reflection?.trim() || fallback.reflection;
  let action = raw.action?.trim() || fallback.action;

  // 🚨 [필수 템플릿 제거 및 자정] 구형 템플릿("나의 소원 ...은(는) 이미 우주의 완벽한 섭리")이나 빈값인 경우 고민 맞춤형 고유 확언으로 승격
  if (
    !affirmation ||
    affirmation.includes('은(는) 이미 우주의 완벽한 섭리 안에서') ||
    affirmation.startsWith('나의 소원 "') ||
    affirmation.length < 12
  ) {
    affirmation = fallback.affirmation;
  }

  // 🚨 [필수 중복 방지] affirmation, reflection, action이 서로 같거나 부실한 경우 fallback 고유 문구로 즉시 교정
  if (!reflection || reflection === affirmation || reflection.length < 15 || reflection === action) {
    reflection = fallback.reflection;
  }
  if (!action || action === affirmation || action === reflection || action.length < 8) {
    action = fallback.action;
  }

  let desire = raw.desire?.trim() || fallback.desire;
  if (!desire || desire === affirmation || desire === reflection) {
    desire = fallback.desire;
  }

  let visualizationGuide = raw.visualizationGuide?.trim() || fallback.visualizationGuide;
  if (!visualizationGuide || visualizationGuide === affirmation || visualizationGuide.length < 20) {
    visualizationGuide = fallback.visualizationGuide;
  }

  let feelingAnchor = raw.feelingAnchor?.trim() || fallback.feelingAnchor;
  if (!feelingAnchor || feelingAnchor === affirmation) {
    feelingAnchor = fallback.feelingAnchor;
  }

  let mirrorPhrase = raw.mirrorPhrase?.trim() || fallback.mirrorPhrase;
  if (!mirrorPhrase || mirrorPhrase === affirmation) {
    mirrorPhrase = fallback.mirrorPhrase;
  }

  let eveningPrompt = raw.eveningPrompt?.trim() || fallback.eveningPrompt;
  if (!eveningPrompt || eveningPrompt === affirmation) {
    eveningPrompt = fallback.eveningPrompt;
  }

  let scriptingStarter = raw.scriptingStarter?.trim() || fallback.scriptingStarter;
  if (!scriptingStarter || scriptingStarter === affirmation) {
    scriptingStarter = fallback.scriptingStarter;
  }

  let gratitudeSeeds =
    Array.isArray(raw.gratitudeSeeds) && raw.gratitudeSeeds.length >= 3
      ? [String(raw.gratitudeSeeds[0]), String(raw.gratitudeSeeds[1]), String(raw.gratitudeSeeds[2])]
      : fallback.gratitudeSeeds;

  if (
    gratitudeSeeds.some((s) => s === affirmation || s === reflection || s === action) ||
    gratitudeSeeds[0] === gratitudeSeeds[1] ||
    gratitudeSeeds[1] === gratitudeSeeds[2]
  ) {
    gratitudeSeeds = fallback.gratitudeSeeds;
  }

  return {
    affirmation,
    reflection,
    action,
    desire,
    visualizationGuide,
    gratitudeSeeds,
    feelingAnchor,
    mirrorPhrase,
    eveningPrompt,
    scriptingStarter,
    appliedWish: effectiveWish,
  };
}

function loadCachedSecret(wishStr: string = '', name: string = '여행자'): DailySecretData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { date: string; data: Partial<DailySecretData> };
      if (parsed.date === todayKey() && parsed.data) {
        return ensureFullKit(parsed.data, wishStr, name);
      }
    }
    for (const key of LEGACY_KEYS) {
      const legacy = localStorage.getItem(key);
      if (!legacy) continue;
      const parsed = JSON.parse(legacy) as { date: string; data: Partial<DailySecretData> };
      if (parsed.date !== todayKey()) continue;
      if (parsed.data.affirmation && parsed.data.reflection && parsed.data.action) {
        return ensureFullKit(parsed.data, wishStr, name);
      }
    }
    return null;
  } catch {
    return null;
  }
}

function loadWish(): string {
  const appliedWish = localStorage.getItem(dayStorageKey('applied_wish'));
  if (appliedWish) return appliedWish;
  const directWish = localStorage.getItem(dayStorageKey('wish'));
  if (directWish) return directWish;
  const cached = loadCachedSecret();
  return cached?.appliedWish || '';
}

function loadWishApplied(): boolean {
  try {
    if (localStorage.getItem(dayStorageKey('wish_applied')) === 'true') return true;
    if (Boolean(localStorage.getItem(dayStorageKey('applied_wish')))) return true;
    const cached = loadCachedSecret();
    return Boolean(cached?.appliedWish && cached.appliedWish.trim().length > 0);
  } catch {
    return false;
  }
}

function loadPractice(): Record<PracticeId, boolean> {
  try {
    const raw = localStorage.getItem(dayStorageKey('practice')) || sessionStorage.getItem(dayStorageKey('practice'));
    if (!raw) return {} as Record<PracticeId, boolean>;
    return JSON.parse(raw) as Record<PracticeId, boolean>;
  } catch {
    return {} as Record<PracticeId, boolean>;
  }
}

function savePractice(practiceData: Record<PracticeId, boolean>) {
  try {
    const serialized = JSON.stringify(practiceData);
    localStorage.setItem(dayStorageKey('practice'), serialized);
    sessionStorage.setItem(dayStorageKey('practice'), serialized);
  } catch {}
}

function loadGratitudeChecked(): boolean[] {
  try {
    const raw = localStorage.getItem(dayStorageKey('gratitude_checked'));
    if (!raw) return [false, false, false];
    const parsed = JSON.parse(raw) as boolean[];
    return [parsed[0] ?? false, parsed[1] ?? false, parsed[2] ?? false];
  } catch {
    return [false, false, false];
  }
}

function loadExtraGratitude(): string[] {
  try {
    const raw = localStorage.getItem(dayStorageKey('gratitude_extra'));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function loadScript(): string {
  return localStorage.getItem(dayStorageKey('script')) || '';
}

function playVisualizationAlarm() {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const now = context.currentTime;
    [0, 0.22, 0.44].forEach((offset, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = index === 1 ? 880 : 660;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.16, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.2);
    });
    window.setTimeout(() => void context.close(), 1000);
  } catch {
    // 일부 모바일 브라우저가 알람용 AudioContext 생성을 차단해도 완료 처리는 유지합니다.
  }
}

function VisualizationTimer({ guide, onComplete }: { guide: string; onComplete?: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(68);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [completionNotice, setCompletionNotice] = useState(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!running) return;

    if (secondsLeft <= 0) {
      setRunning(false);
      setDone(true);
      setCompletionNotice(true);
      playVisualizationAlarm();
      if (onCompleteRef.current) {
        onCompleteRef.current();
      }
      return;
    }

    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, secondsLeft]);

  // Clean up TTS when unmounting
  useEffect(() => {
    return () => {
      stopTTS();
    };
  }, []);

  const start = () => {
    setSecondsLeft(68);
    setDone(false);
    setCompletionNotice(false);
    setRunning(true);
    // Automatically play TTS audio guidance
    playTTS(guide, 'Kore');
  };

  const reset = () => {
    stopTTS();
    setRunning(false);
    setDone(false);
    setCompletionNotice(false);
    setSecondsLeft(68);
  };

  const progress = ((68 - secondsLeft) / 68) * 100;

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5 space-y-4 shadow-lg shadow-amber-950/20">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-amber-400" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400/80">
            68초 시각화 스튜디오
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold text-amber-300/90 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25">
            {running || done ? `${secondsLeft}초` : '68초'}
          </span>
        </div>
      </div>
      <p className="text-sm text-white/85 leading-relaxed break-keep font-sans bg-black/30 p-4 rounded-xl border border-white/5">{guide}</p>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>
      {completionNotice && (
        <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100 shadow-lg shadow-emerald-950/20">
          <Check size={16} className="shrink-0 text-emerald-300" />
          68초 시각화가 완료되었습니다. 따뜻한 알림음과 함께 오늘의 마음을 잘 간직해 보세요.
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {!running && !done && (
          <button
            type="button"
            onClick={start}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/30 to-orange-500/30 hover:from-amber-500/40 hover:to-orange-500/40 border border-amber-500/40 text-amber-100 text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-950/30 active:scale-95 transition-all"
          >
            <Timer size={14} className="text-amber-300 animate-pulse" />
            <span>시각화 시작</span>
          </button>
        )}
        {running && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-4 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs font-mono flex items-center gap-2 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              눈을 감고 이미 이루어진 장면을 생생히 느껴 보세요...
            </span>
            <button
              type="button"
              onClick={reset}
              className="px-3.5 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs cursor-pointer active:scale-95 transition-all"
            >
              중지 / 다시 시작
            </button>
          </div>
        )}
        {done && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-4 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-200 text-xs font-bold flex items-center gap-1.5">
              <Check size={13} className="text-emerald-400" />
              시각화 완료 · 우주에 강력한 주파수가 전달되었습니다
            </span>
            <button
              type="button"
              onClick={reset}
              className="px-3.5 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs cursor-pointer active:scale-95 transition-all"
            >
              다시 하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export interface TailoredWishCategory {
  id: string;
  name: string;
  icon: string;
}

export const TAILORED_WISH_CATEGORIES: TailoredWishCategory[] = [
  { id: 'smart', name: '스마트 맞춤', icon: '🌟' },
  { id: 'wealth', name: '풍요·재정', icon: '💰' },
  { id: 'career', name: '성공·커리어', icon: '🎯' },
  { id: 'love', name: '사랑·인연', icon: '💖' },
  { id: 'health', name: '건강·활력', icon: '🌿' },
  { id: 'growth', name: '평온·자존감', icon: '🕊️' },
];

export const TAILORED_WISH_EXAMPLES: Record<string, string[]> = {
  wealth: [
    '올해 목표한 재정적 성과 달성과 뜻밖의 풍요로운 금전 수입 유입',
    '안정적인 자산 증식과 여유롭고 당당한 경제적 자유 성취',
    '진행 중인 사업 및 프로젝트의 폭발적 성장과 끊임없는 우량 고객 유입',
    '원하는 연봉 협상 성공 및 파격적인 성과급 보너스 달성',
    '모든 채무와 빚을 깨끗이 청산하고 통장에 가득 차는 잉여 자산',
    '부동산 및 투자에서 최적의 타이밍에 큰 수익과 안전한 결실',
  ],
  career: [
    '원하던 꿈의 기업 및 직무 최종 합격과 눈부신 커리어 도약',
    '준비 중인 시험 및 국가 전문 자격증 최고 득점 합격',
    '추진 중인 핵심 프로젝트의 독보적인 대성공과 사내외 인정',
    '나만의 독창적인 창작물과 브랜딩이 세상에 널리 사랑받음',
    '창의적인 아이디어가 샘솟고 매 순간 빛나는 업무 효율과 리더십',
    '최고의 동료 및 멘토와 함께 성장하는 이상적인 직장 환경',
  ],
  love: [
    '서로 깊이 신뢰하고 아껴주는 운명적인 평생의 인연과의 만남',
    '소중한 사람과의 오해를 풀고 한층 더 깊어진 사랑과 화해',
    '나를 온전히 지지해주고 존중하는 건강하고 따뜻한 인간관계',
    '가족 모두가 건강하고 화목하게 서로를 보듬는 평화로운 가정',
    '매력과 호감을 끌어당기며 누구에게나 사랑받는 밝은 에너지',
    '결혼과 가정이 우주의 축복 속에서 행복과 안정을 누림',
  ],
  health: [
    '몸과 마음의 피로가 씻은 듯 사라지고 넘치는 활력과 에너지 회복',
    '밤마다 깊고 편안한 숙면을 취하고 아침마다 상쾌하게 기상',
    '불안과 긴장을 내려놓고 온전한 평온과 내면의 깊은 안정 유지',
    '나의 몸을 깊이 사랑하며 가장 건강하고 아름다운 신체 밸런스 회복',
    '오랜 통증과 불편함이 깨끗이 치유되고 가벼워진 심신',
    '면역력이 극대화되어 어떤 계절에도 지치지 않는 강인한 체력',
  ],
  growth: [
    '타인의 시선에서 벗어나 내 삶의 주권을 잡는 단단한 자존감',
    '매 순간 감사와 기쁨으로 가득 찬 충만하고 풍요로운 일상',
    '과거의 후회와 미래의 불안을 내려놓고 지금 여기에 현존함',
    '내 안의 무한한 끌어당김의 법칙을 완전히 신뢰하고 원하는 현실 실현',
    '어떤 시련 앞에서도 긍정적인 확신을 잃지 않는 단단한 내면의 힘',
    '내 안의 잠재력을 100% 꽃피우며 날마다 성장하는 위대한 나',
  ],
};

export function DailySecret() {
  const { sharedState, updateSharedState, openLucyChat, sendUnifiedMessage } = useApp();
  const [data, setData] = useState<DailySecretData | null>(() => loadCachedSecret());
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [wish, setWish] = useState(loadWish);
  const [wishApplied, setWishApplied] = useState(loadWishApplied);
  const [practice, setPractice] = useState<Record<PracticeId, boolean>>(loadPractice);
  const [gratitudeChecked, setGratitudeChecked] = useState(loadGratitudeChecked);
  const [extraGratitude, setExtraGratitude] = useState(loadExtraGratitude);
  const [newGratitude, setNewGratitude] = useState('');
  const [script, setScript] = useState(loadScript);
  const [scriptingTab, setScriptingTab] = useState<'write' | 'typing'>('typing');

  const [selectedWishCategory, setSelectedWishCategory] = useState<string>('smart');

  const smartProfileWishes = useMemo(() => {
    const profile = sharedState?.userProfile;
    const name = profile?.basic?.nickname || profile?.basic?.name || '나';
    const list: { text: string; tag: string }[] = [];

    if (profile?.fate?.lifeGoal) {
      list.push({
        text: `인생 핵심 목표 "${profile.fate.lifeGoal}"의 기적 같은 완전 성취`,
        tag: '내 목표 연동',
      });
    }
    if (profile?.fate?.currentWorry) {
      list.push({
        text: `현재 고민 "${profile.fate.currentWorry}"의 평화롭고 조화로운 해결과 반전`,
        tag: '고민 해소 연동',
      });
    }
    if (profile?.psych?.mbti) {
      list.push({
        text: `${profile.psych.mbti} 기질의 독창적 강점을 극대화하여 나만의 분야에서 정상에 오름`,
        tag: 'MBTI 맞춤',
      });
    }
    list.push({
      text: `${name}의 삶에 상상 이상의 기적과 우주의 무한한 풍요가 매일 쏟아짐`,
      tag: '행운·기적',
    });
    list.push({
      text: `오늘 하루 온전한 평온과 뜻밖의 기분 좋은 행운의 선물 받기`,
      tag: '오늘의 평온',
    });
    list.push({
      text: `모든 불안을 내려놓고 우주의 무한한 지지와 사랑을 온몸으로 신뢰함`,
      tag: '신뢰·수용',
    });

    return list;
  }, [sharedState?.userProfile]);

  const handleSelectWishExample = (text: string) => {
    setWish(text);
  };

  const handleRandomWish = () => {
    const allLists: string[] = [
      ...smartProfileWishes.map((w) => w.text),
      ...Object.values(TAILORED_WISH_EXAMPLES).flat(),
    ];
    if (allLists.length === 0) return;
    const pick = allLists[Math.floor(Math.random() * allLists.length)];
    setWish(pick);
  };

  const fullDailySecretSpeech = useMemo(() => {
    if (!data) return '';
    const parts = [
      `오늘의 시크릿 확언. ${data.affirmation}`,
      `믿음으로 새기기. ${data.reflection}`,
      `오늘의 작은 실천. ${data.action}`,
    ];
    if (data.desire) parts.push(`오늘의 소원 선언. ${data.desire}`);
    if (data.feelingAnchor) parts.push(`이미 받은 느낌. ${data.feelingAnchor}`);
    if (data.mirrorPhrase) parts.push(`거울 확언. ${data.mirrorPhrase}`);
    if (data.eveningPrompt) parts.push(`저녁 감사 마무리. ${data.eveningPrompt}`);
    return parts.join(' ');
  }, [data]);

  // Hydrate from sharedState when available (PC <-> Mobile sync)
  useEffect(() => {
    const today = todayKey();
    const cloudSecret = sharedState?.dailySecrets?.[today];
    if (cloudSecret && typeof cloudSecret === 'object') {
      const name = sharedState?.userProfile?.basic?.nickname || sharedState?.userProfile?.basic?.name || '여행자';
      const full = ensureFullKit(cloudSecret as Partial<DailySecretData>, wish, name);
      if (full) {
        setData((prev) => (prev ? { ...full, ...prev } : full));
      }
      if (cloudSecret.appliedWish) {
        setWish((prev) => prev || cloudSecret.appliedWish);
        setWishApplied(true);
      }
      if (cloudSecret.practice && typeof cloudSecret.practice === 'object') {
        setPractice((prev) => {
          const local = loadPractice();
          const merged: Record<PracticeId, boolean> = { ...local, ...prev };
          (Object.keys(cloudSecret.practice) as PracticeId[]).forEach((k) => {
            if (cloudSecret.practice[k]) {
              merged[k] = true;
            }
          });
          return merged;
        });
      }
      if (Array.isArray(cloudSecret.gratitudeChecked)) {
        setGratitudeChecked((prev) => {
          const local = loadGratitudeChecked();
          return [
            Boolean(local[0] || prev[0] || cloudSecret.gratitudeChecked[0]),
            Boolean(local[1] || prev[1] || cloudSecret.gratitudeChecked[1]),
            Boolean(local[2] || prev[2] || cloudSecret.gratitudeChecked[2]),
          ];
        });
      }
      if (Array.isArray(cloudSecret.extraGratitude) && cloudSecret.extraGratitude.length > 0) {
        setExtraGratitude((prev) => {
          const local = loadExtraGratitude();
          return Array.from(new Set([...local, ...prev, ...cloudSecret.extraGratitude]));
        });
      }
      if (cloudSecret.script) {
        setScript((prev) => prev || cloudSecret.script);
      }
    }
  }, [sharedState]);

  useEffect(() => {
    const cached = loadCachedSecret();
    if (cached) setData(cached);
    const loadedWish = loadWish();
    if (loadedWish) setWish(loadedWish);
    const isApplied = loadWishApplied();
    setWishApplied(isApplied);
    setPractice(loadPractice());
    setGratitudeChecked(loadGratitudeChecked());
    setExtraGratitude(loadExtraGratitude());
    setScript(loadScript());

    const handleSyncEvent = () => {
      const freshCached = loadCachedSecret();
      if (freshCached) setData(freshCached);
      const freshWish = loadWish();
      if (freshWish) {
        setWish(freshWish);
        setWishApplied(true);
      }
      const freshPractice = loadPractice();
      if (Object.keys(freshPractice).length > 0) {
        setPractice((prev) => ({ ...freshPractice, ...prev }));
      }
    };
    window.addEventListener('prism:feature_updated', handleSyncEvent);
    window.addEventListener('prism:daily_oracle_updated', handleSyncEvent);
    return () => {
      window.removeEventListener('prism:feature_updated', handleSyncEvent);
      window.removeEventListener('prism:daily_oracle_updated', handleSyncEvent);
    };
  }, []);

  useEffect(() => {
    if (wish) {
      localStorage.setItem(dayStorageKey('wish'), wish);
    }
  }, [wish]);

  useEffect(() => {
    localStorage.setItem(dayStorageKey('practice'), JSON.stringify(practice));
  }, [practice]);

  useEffect(() => {
    localStorage.setItem(dayStorageKey('gratitude_checked'), JSON.stringify(gratitudeChecked));
  }, [gratitudeChecked]);

  useEffect(() => {
    localStorage.setItem(dayStorageKey('gratitude_extra'), JSON.stringify(extraGratitude));
  }, [extraGratitude]);

  useEffect(() => {
    localStorage.setItem(dayStorageKey('script'), script);
  }, [script]);

  const syncDailyProgress = useCallback((
    newPractice: Record<PracticeId, boolean>,
    newGratitudeChecked: boolean[],
    newExtraGratitude: string[],
    newScript: string,
  ) => {
    const today = todayKey();
    try {
      localStorage.setItem(dayStorageKey('practice'), JSON.stringify(newPractice));
      localStorage.setItem(dayStorageKey('gratitude_checked'), JSON.stringify(newGratitudeChecked));
      localStorage.setItem(dayStorageKey('gratitude_extra'), JSON.stringify(newExtraGratitude));
      localStorage.setItem(dayStorageKey('script'), newScript);
    } catch {}

    try {
      void updateSharedState({
        dailySecrets: {
          ...(sharedState?.dailySecrets || {}),
          [today]: {
            ...(sharedState?.dailySecrets?.[today] || data || {}),
            practice: newPractice,
            gratitudeChecked: newGratitudeChecked,
            extraGratitude: newExtraGratitude,
            script: newScript,
          },
        },
        lastOrangeDailySync: Date.now(),
      }, 'ORANGE');
    } catch {}
  }, [sharedState, data, updateSharedState]);

  const practiceCount = useMemo(
    () => PRACTICE_ITEMS.filter((item) => practice[item.id]).length,
    [practice],
  );

  const buildPromptContext = useCallback(() => {
    const userProfileStr = sharedState?.userProfile
      ? JSON.stringify(sharedState.userProfile)
      : '프로필 없음';
    const memory = sharedState?.orangeMemory || sharedState?.globalMemory || '최근 기록 없음';
    const name =
      sharedState?.userProfile?.basic?.nickname ||
      sharedState?.userProfile?.basic?.name ||
      '여행자';
    return { userProfileStr, memory, name };
  }, [sharedState]);

  const receiveSecret = useCallback(async (_options?: { force?: boolean }) => {
    if (loading) return;
    setLoading(true);

    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 25000);

    const { userProfileStr, memory, name } = buildPromptContext();
    const currentWish = wish.trim();
    const hasWish = Boolean(currentWish);

    try {
      const systemPrompt = [
        '당신은 론다 번(Rhonda Byrne)의 『시크릿(The Secret)』— 끌어당김의 법칙을 바탕으로 오늘의 시크릿 키트를 만드는 ORANGE 가이드입니다.',
        '핵심 원리: Ask(명확한 요청) → Believe(흔들림 없는 믿음) → Receive(이미 받은 것처럼 느끼고 수용).',
        '생각과 감정의 주파수가 실제 현실을 강력하게 끌어당깁니다.',
        '',
        '★★★ [절대 필수: 각 항목별 명확한 역할 분리 및 문장 중복 엄격 금지 규칙] ★★★',
        '1. affirmation (Today’s Secret Affirmation): 소원이 이미 이루어졌음을 우주에 선언하는 1문장의 강력한 현재완료형 확언입니다.',
        '2. reflection (Believe · 믿음으로 새기기): affirmation과 완전히 다른 독자적인 문장이어야 합니다! 의심과 조급함을 내려놓고 잠재의식과 우주의 주파수에 나를 맞추도록 돕는 2~3문장의 깊이 있는 통찰/철학적 사색 글이어야 합니다. 절대로 확언 문장을 그대로 반복하지 마십시오.',
        '3. action (Receive · 오늘의 작은 실천): affirmation/reflection과 완전히 다른 구체적인 신체적/일상적 실천 미션 1문장입니다! (예: "오늘 하루 이미 소원을 이룬 사람처럼 어깨를 펴고 미소 지으며 10분간 산책하기", "소중한 사람에게 먼저 다정한 안부 전하기" 등).',
        '4. desire (Ask · 오늘의 소원 선언): 우주에 올리는 명확하고 순수한 청원 1문장입니다.',
        '5. visualizationGuide (68초 시각화): 소원이 이루어진 장면을 오감으로 느끼는 가이드 3~4문장입니다.',
        '6. feelingAnchor (Feel · 이미 받은 느낌): 성취 시 벅찬 감정을 표현한 1줄입니다.',
        '7. mirrorPhrase (거울 확언): 거울을 보며 자신에게 건네는 확신 1문장입니다.',
        '8. eveningPrompt (저녁 감사): 하루를 평온히 닫는 감사 1문장입니다.',
        '9. scriptingStarter (스크립팅): 이미 이루어진 하루를 기록하는 일기 첫 문장입니다.',
        '10. [경고] affirmation, reflection, action 항목에 절대로 동일하거나 유사한 텍스트를 중복해서 출력하지 마십시오. 각 항목은 고유한 목적과 고유한 문장 구조를 가져야 합니다.',
        '',
        hasWish
          ? [
              `사용자가 오늘 우주에 요청한 구체적 소원: "${currentWish}"`,
              '위 소원을 100% 중심에 두고 모든 항목(affirmation, reflection, action, desire, visualizationGuide, gratitudeSeeds, feelingAnchor, mirrorPhrase, eveningPrompt, scriptingStarter)을 개별적이고 독창적으로 작성하세요.',
            ].join('\n')
          : '사용자가 별도의 소원을 적지 않았으므로, 오늘의 일반적인 풍요, 평온, 성공, 사랑, 건강을 강력하게 끌어당기는 조화로운 시크릿 키트를 각 항목별로 고유하게 작성하세요.',
        '',
        `[프로필: ${userProfileStr}]`,
        `[최근 기록/맥락: ${memory}]`,
      ].filter(Boolean).join('\n');

      const userPrompt = hasWish
        ? `[${name}님의 핵심 고민 / 소원: "${currentWish}"]\n\n위 고민/소원의 본질을 깊이 꿰뚫어보고, "나의 소원 ...은 이루어졌으며" 같은 기계적인 템플릿 문장을 절대 쓰지 마세요.\n이 고민과 고통이 완벽하게 해결되고 반전되어 현실이 된 감격과 절대적 확신을 담아 감동적인 1인칭 맞춤형 시크릿 키트를 작성해 주세요.\n\n특히 Today’s Secret Affirmation(확언)은 "${currentWish}" 고민의 구체적 정황(불안 해소, 당당한 성공, 금전 풍요, 따뜻한 화해 등)이 살아 숨 쉬는 명문장 1문장으로 선언해야 합니다.`
        : `${name}님을 위한 오늘의 시크릿 키트를 주세요. 마음속 고민을 녹이고 풍요와 평온을 여는 품격 있는 맞춤 확언과 도구들을 작성해 주세요.`;

      let result: DailySecretData | null = null;
      try {
        result = await invokeLLMStructured({
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
          schema: DailySecretSchema,
        });
      } catch (aiErr) {
        console.warn('[DailySecret] AI structured invoke failed, falling back to rich tailored kit:', aiErr);
        result = generateTailoredSecretFallback(currentWish, name);
      }

      const completed = ensureFullKit(result, currentWish, name) || generateTailoredSecretFallback(currentWish, name);
      const effectiveWish = hasWish ? currentWish : undefined;
      const finalData: DailySecretData = { ...completed, appliedWish: effectiveWish };

      setData(finalData);
      if (effectiveWish) {
        localStorage.setItem(dayStorageKey('wish_applied'), 'true');
        localStorage.setItem(dayStorageKey('applied_wish'), effectiveWish);
        localStorage.setItem(dayStorageKey('wish'), effectiveWish);
        setWish(effectiveWish);
        setWishApplied(true);
      }
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ date: todayKey(), data: finalData }),
      );

      // Realtime cross-device synchronization to Firestore & server vault
      try {
        const today = todayKey();
        void updateSharedState({
          dailySecrets: {
            ...(sharedState?.dailySecrets || {}),
            [today]: {
              ...finalData,
              appliedWish: effectiveWish || finalData.appliedWish,
              practice,
              gratitudeChecked,
              extraGratitude,
              script: script || (finalData.scriptingStarter ? `${finalData.scriptingStarter}\n\n` : ''),
            },
          },
          lastOrangeDailySync: Date.now(),
        }, 'ORANGE');
      } catch (_) {}

      recordPrismFeature({
        app: 'orange',
        featureName: '시크릿(The Secret) 확언 키트',
        summary: `확언: "${finalData.affirmation}", 요청(Ask): "${finalData.desire}"${effectiveWish ? ` (소원: "${effectiveWish}")` : ''}`,
        details: finalData,
      });

      if (finalData.scriptingStarter && !script.trim()) {
        setScript(`${finalData.scriptingStarter}\n\n`);
      }
    } catch (error) {
      console.error('[DailySecret] Top-level error:', error);
      const fallback = generateTailoredSecretFallback(currentWish, name);
      setData(fallback);
    } finally {
      clearTimeout(safetyTimer);
      setLoading(false);
    }
  }, [buildPromptContext, extraGratitude, gratitudeChecked, loading, practice, script, sharedState, updateSharedState, wish]);

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const markPracticeItem = useCallback((id: PracticeId) => {
    setPractice((prev) => {
      if (prev[id]) return prev;
      const next = { ...prev, [id]: true };
      setTimeout(() => {
        syncDailyProgress(next, gratitudeChecked, extraGratitude, script);
      }, 0);
      return next;
    });
  }, [gratitudeChecked, extraGratitude, script, syncDailyProgress]);

  const togglePractice = useCallback((id: PracticeId) => {
    setPractice((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      setTimeout(() => {
        syncDailyProgress(next, gratitudeChecked, extraGratitude, script);
      }, 0);
      return next;
    });
  }, [gratitudeChecked, extraGratitude, script, syncDailyProgress]);

  const toggleGratitude = useCallback((index: number) => {
    setGratitudeChecked((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      setTimeout(() => {
        syncDailyProgress(practice, next, extraGratitude, script);
      }, 0);
      return next;
    });
  }, [practice, extraGratitude, script, syncDailyProgress]);

  const addGratitude = useCallback(() => {
    const trimmed = newGratitude.trim();
    if (!trimmed) return;
    setExtraGratitude((prev) => {
      const next = [...prev, trimmed].slice(0, 5);
      setTimeout(() => {
        syncDailyProgress(practice, gratitudeChecked, next, script);
      }, 0);
      return next;
    });
    setNewGratitude('');
  }, [newGratitude, practice, gratitudeChecked, script, syncDailyProgress]);

  return (
    <div className="space-y-6 sm:space-y-10 text-left w-full min-w-0">
      <div className="text-center space-y-3 sm:space-y-4 px-1">
        <span className="text-[9px] sm:text-[10px] text-amber-400 font-extrabold uppercase tracking-[0.2em] sm:tracking-[0.3em] font-mono block">
          DAILY
        </span>
        <h3 className="text-2xl sm:text-4xl md:text-5xl font-display text-white tracking-tighter break-words">
          오늘의 시크릿
        </h3>
        <p className="text-[11px] md:text-xs text-white/50 max-w-2xl mx-auto leading-relaxed px-1 sm:px-0">
          론다 번의 『시크릿』— 끌어당김의 법칙을 실천하는 확언, 시각화, 감사, 스크립팅 도구를 한곳에서 만나보세요.
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
          {['Ask · 원함', 'Believe · 믿음', 'Receive · 받음'].map((step) => (
            <span
              key={step}
              className="text-[9px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-300/90"
            >
              {step}
            </span>
          ))}
        </div>

        </div>

      <div className="w-full max-w-3xl mx-auto rounded-2xl border border-amber-500/25 bg-gradient-to-b from-amber-500/[0.06] via-amber-500/[0.02] to-transparent p-4 sm:p-6 space-y-4 shadow-xl shadow-amber-950/20">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400 block flex items-center gap-1.5 font-mono">
            <Sparkles size={13} className="text-amber-400 animate-pulse" />
            Ask · 오늘 우주에 보낼 맞춤 소원
          </label>
          {data ? (
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono flex items-center gap-1">
              <Check size={11} className="text-emerald-400" />
              {data.appliedWish ? '소원 반영된 키트 활성화됨' : '오늘의 키트 활성화됨'}
            </span>
          ) : (
            <span className="text-[10px] text-amber-300/80 font-mono">
              소원을 선택하거나 적고 버튼을 누르면 100% 맞춤 키트가 생성됩니다
            </span>
          )}
        </div>

        {/* 🌟 맞춤 소원 예시 카테고리 탭 및 선택 칩 (키트 생성 전 노출) */}
        {!data && (
          <div className="space-y-2.5 pt-0.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-amber-300/90 font-sans flex items-center gap-1">
                <Sparkles size={12} className="text-amber-400" />
                원클릭 맞춤 소원 예시
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleRandomWish}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 text-[10px] font-medium flex items-center gap-1 transition-all cursor-pointer hover:border-amber-400/40 active:scale-95"
                  title="랜덤 소원 추천받기"
                >
                  <Shuffle size={11} className="text-amber-400" />
                  <span>랜덤 추천</span>
                </button>
                {wish.trim() && (
                  <button
                    type="button"
                    onClick={() => setWish('')}
                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white text-[10px] flex items-center gap-0.5 transition-all cursor-pointer active:scale-95"
                    title="입력 내용 지우기"
                  >
                    <X size={11} />
                    <span>지우기</span>
                  </button>
                )}
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
              {TAILORED_WISH_CATEGORIES.map((cat) => {
                const isActive = selectedWishCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedWishCategory(cat.id)}
                    className={`shrink-0 px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-500/25 text-amber-200 border border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                        : 'bg-white/5 text-white/50 border border-white/10 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Examples grid / chips */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {selectedWishCategory === 'smart' ? (
                smartProfileWishes.map((item, idx) => {
                  const isSelected = wish.trim() === item.text.trim();
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectWishExample(item.text)}
                      className={`text-left px-3 py-2 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-2 border active:scale-[0.98] ${
                        isSelected
                          ? 'bg-gradient-to-r from-amber-500/30 to-orange-500/20 text-amber-100 border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.25)] font-bold'
                          : 'bg-black/30 hover:bg-amber-500/10 text-white/80 hover:text-white border-white/10 hover:border-amber-500/30'
                      }`}
                    >
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono shrink-0">
                        {item.tag}
                      </span>
                      <span className="truncate max-w-[280px] sm:max-w-md">{item.text}</span>
                      {isSelected && <Check size={12} className="text-amber-400 shrink-0 ml-auto" />}
                    </button>
                  );
                })
              ) : (
                (TAILORED_WISH_EXAMPLES[selectedWishCategory] || []).map((ex, idx) => {
                  const isSelected = wish.trim() === ex.trim();
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectWishExample(ex)}
                      className={`text-left px-3 py-2 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-2 border active:scale-[0.98] ${
                        isSelected
                          ? 'bg-gradient-to-r from-amber-500/30 to-orange-500/20 text-amber-100 border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.25)] font-bold'
                          : 'bg-black/30 hover:bg-amber-500/10 text-white/80 hover:text-white border-white/10 hover:border-amber-500/30'
                      }`}
                    >
                      <Sparkles size={11} className={isSelected ? 'text-amber-400 shrink-0' : 'text-amber-400/40 shrink-0'} />
                      <span className="truncate max-w-[280px] sm:max-w-md">{ex}</span>
                      {isSelected && <Check size={12} className="text-amber-400 shrink-0 ml-auto" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div className="relative">
          <textarea
            value={wish}
            onChange={(e) => setWish(e.target.value)}
            placeholder="위 맞춤 예시를 클릭하거나, 오늘 끌어당기고 싶은 구체적인 소원을 자유롭게 적어 보세요. (예: 원하는 시험 합격, 승진 및 연봉 인상, 소중한 사람과의 화해, 건강과 활력 회복...)"
            rows={2}
            className="w-full rounded-xl border border-white/15 bg-black/40 text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50 px-4 py-3 text-sm transition-colors shadow-inner resize-none"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="space-y-0.5">
            <p className="text-[11px] text-amber-200/80 font-sans">
              {data?.appliedWish
                ? `✨ 현재 적용된 소원: "${data.appliedWish}"`
                : '✨ 소원을 선택/입력 후 키트를 받으시면 확언, 68초 시각화, 스크립팅, 실천 과제가 100% 맞춤 생성됩니다.'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => void receiveSecret({ force: true })}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/25 to-orange-500/25 hover:from-amber-500/35 hover:to-orange-500/35 border border-amber-500/40 text-amber-100 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-950/40 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw size={13} className="animate-spin text-amber-300" />
                  <span>맞춤 키트 생성 중...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} className="text-amber-400" />
                  <span>
                    {data
                      ? wish.trim() && wish.trim() !== data.appliedWish
                        ? '새 소원으로 키트 다시 받기'
                        : '키트 다시 생성'
                      : wish.trim()
                        ? '소원 맞춤 키트 받기'
                        : '오늘의 시크릿 키트 받기'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {!data ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg mx-auto"
        >
          <button
            type="button"
            onClick={() => void receiveSecret({ force: true })}
            disabled={loading}
            className="w-full group relative overflow-hidden rounded-[28px] border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-white/5 to-orange-500/10 p-8 sm:p-10 text-center shadow-2xl shadow-amber-500/10 transition-all hover:border-amber-400/50 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
          >
            <div className="absolute inset-0 bg-amber-500/10 blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full border border-amber-500/30 bg-amber-500/10 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.25)]">
                {loading ? (
                  <RefreshCw size={28} className="text-amber-400 animate-spin" />
                ) : (
                  <KeyRound size={28} className="text-amber-400 animate-pulse" />
                )}
              </div>
              <div className="space-y-2">
                <p className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {loading ? '소원 맞춤 시크릿 키트를 여는 중...' : wish.trim() ? '소원 맞춤 시크릿 키트 받기' : '오늘의 시크릿 키트 받기'}
                </p>
                <p className="text-[10px] sm:text-xs text-white/40 font-sans">
                  {wish.trim() ? `"${wish.trim().slice(0, 20)}${wish.trim().length > 20 ? '...' : ''}" 맞춤형 확언 + 시각화 + 감사 + 실천` : '확언 + 68초 시각화 + 감사 + 실천 도구'}
                </p>
              </div>
            </div>
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-3xl mx-auto space-y-5"
        >
          <div className="relative overflow-hidden rounded-[32px] border border-amber-500/25 bg-gradient-to-br from-amber-950/40 via-zinc-950/80 to-orange-950/30 p-6 sm:p-10 shadow-2xl">
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-amber-500/15 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-orange-500/10 rounded-full blur-[60px] pointer-events-none" />
            <div className="relative z-10 space-y-6 text-center">
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400/80">
                  <Sparkles size={12} />
                  <span>Today&apos;s Secret Affirmation</span>
                  <Sparkles size={12} />
                </div>
                {data.appliedWish && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs mt-1">
                    <Sparkles size={11} className="text-amber-400 shrink-0" />
                    <span className="font-medium truncate max-w-xs sm:max-w-md">맞춤 소원: &ldquo;{data.appliedWish}&rdquo;</span>
                  </div>
                )}
              </div>
              <p className="text-xl sm:text-2xl md:text-3xl font-serif text-white/95 leading-relaxed break-keep font-medium">
                &ldquo;{data.affirmation}&rdquo;
              </p>
              <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                <TTSButton
                  text={data.affirmation}
                  voice="Kore"
                  className="text-amber-300 border-amber-500/20 text-xs py-2 px-4"
                  onPlay={() => markPracticeItem('affirmation')}
                />
                <button
                  type="button"
                  onClick={() => {
                    void copyText(data.affirmation, 'affirmation');
                    markPracticeItem('affirmation');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                >
                  {copied === 'affirmation' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  {copied === 'affirmation' ? '복사됨' : '복사'}
                </button>
                <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-500/20 bg-amber-500/10 text-[10px] font-bold uppercase tracking-wider text-amber-200/90 shadow-sm">
                  <Check size={12} className="text-emerald-400" />
                  <span>오늘의 시크릿 수신 완료</span>
                </div>
                <button
                  type="button"
                  onClick={() => void receiveSecret({ force: true })}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer disabled:opacity-50"
                  title="새로운 확언 및 실천 도구 다시 받기"
                >
                  <RefreshCw size={11} className={loading ? 'animate-spin text-amber-300' : ''} />
                  <span>{loading ? '생성 중...' : '다시 받기'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 🌟 루시와 1:1 심층 상담 (Deep Insight) Banner */}
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-950/20 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1 text-left">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                  <Sparkles size={13} className="animate-pulse" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-amber-200">
                  루시와 1:1 심층 상담 (Deep Insight)
                </span>
              </div>
              <p className="text-[11px] text-white/70 font-sans leading-relaxed">
                오늘 우주에 보낸 맞춤 소원과 시크릿 확언을 바탕으로, 루시와 함께 마음속 의심을 지우고 강력한 끌어당김 확신을 나누세요.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void sendDailySecretToLucy(data, wish, openLucyChat, sendUnifiedMessage);
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(245,158,11,0.35)] active:scale-95 cursor-pointer shrink-0"
            >
              <Sparkles size={13} />
              <span>루시와 심층 상담하기</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-2">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400/70 block">
                Believe · 믿음으로 새기기
              </span>
              <p className="text-sm text-white/75 leading-relaxed break-keep">{data.reflection}</p>
            </div>
            <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-5 space-y-2">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400/70 block">
                Receive · 오늘의 작은 실천
              </span>
              <p className="text-sm text-white/80 leading-relaxed break-keep font-medium">{data.action}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-orange-500/20 bg-orange-500/[0.05] p-5 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-400/80 block font-mono">
                Ask · 오늘의 소원 선언 (Desire)
              </span>
              {data.appliedWish && (
                <span className="text-[9px] text-amber-300/80 font-mono">
                  우주로 쏘아 올린 요청
                </span>
              )}
            </div>
            <p className="text-sm text-white/90 leading-relaxed break-keep font-medium">
              {data.desire}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-2">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400/70 block">
              Feel · 이미 받은 것처럼 느끼기
            </span>
            <p className="text-sm text-white/80 leading-relaxed break-keep italic">
              {data.feelingAnchor}
            </p>
            <button
              type="button"
              onClick={() => togglePractice('feeling')}
              className="text-[10px] text-amber-300/80 hover:text-amber-200 underline-offset-2 hover:underline cursor-pointer"
            >
              {practice.feeling ? '✓ 기분 연습 완료' : '기분 연습했다고 표시'}
            </button>
          </div>

          <VisualizationTimer
            guide={data.visualizationGuide}
            onComplete={() => markPracticeItem('visualization')}
          />

          <div className="rounded-2xl border border-rose-500/15 bg-rose-500/[0.04] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Heart size={14} className="text-rose-400" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-400/80">
                감사 자석 · Gratitude Magnet
              </span>
            </div>
            <div className="space-y-2">
              {data.gratitudeSeeds.map((item, index) => (
                <label
                  key={item}
                  className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-black/20 cursor-pointer hover:bg-white/[0.03] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={gratitudeChecked[index]}
                    onChange={() => {
                      toggleGratitude(index);
                      if (!gratitudeChecked[index]) markPracticeItem('gratitude');
                    }}
                    className="mt-0.5 accent-amber-500"
                  />
                  <span className={`text-sm break-keep ${gratitudeChecked[index] ? 'text-white/50 line-through' : 'text-white/80'}`}>
                    {item}
                  </span>
                </label>
              ))}
              {extraGratitude.map((item) => (
                <div key={item} className="flex items-center gap-2 p-3 rounded-xl border border-white/5 bg-black/20 text-sm text-white/70">
                  <Sparkles size={12} className="text-amber-400 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newGratitude}
                onChange={(e) => setNewGratitude(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addGratitude()}
                placeholder="나만의 감사 한 가지 추가"
                className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/80 placeholder:text-white/25 focus:outline-none focus:border-amber-500/30"
              />
              <button
                type="button"
                onClick={addGratitude}
                className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 cursor-pointer"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <PenLine size={14} className="text-violet-400" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-400/80">
                  스크립팅 노트 · 현재형 미래
                </span>
              </div>

              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setScriptingTab('typing')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    scriptingTab === 'typing'
                      ? 'bg-violet-500/25 text-violet-200 border border-violet-500/30 shadow-sm'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  <Keyboard size={12} />
                  <span>필사 타자 연습</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScriptingTab('write')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    scriptingTab === 'write'
                      ? 'bg-violet-500/25 text-violet-200 border border-violet-500/30 shadow-sm'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  <PenLine size={12} />
                  <span>자유 작성</span>
                </button>
              </div>
            </div>

            {scriptingTab === 'typing' ? (
              <ScriptingTypingPractice
                scriptingStarter={data.scriptingStarter}
                affirmation={data.affirmation}
                desire={data.desire}
                mirrorPhrase={data.mirrorPhrase}
                gratitudeSeeds={data.gratitudeSeeds}
                reflection={data.reflection}
                currentScript={script}
                onCompletePractice={() => markPracticeItem('affirmation')}
              />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] text-white/45">
                    이미 이루어진 것처럼 현재형으로 적어 보세요. 감정까지 생생하게 쓸수록 좋습니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => void copyText(script || data.scriptingStarter, 'script')}
                    className="text-[9px] text-white/40 hover:text-white flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {copied === 'script' ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                    {copied === 'script' ? '복사됨' : '복사'}
                  </button>
                </div>
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  rows={5}
                  placeholder={data.scriptingStarter}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/85 placeholder:text-white/25 resize-y focus:outline-none focus:border-violet-500/30 font-serif leading-relaxed"
                />
                <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                  <span className="text-[10px] font-mono text-white/30">
                    {script.trim().length}자 작성됨
                  </span>
                  <button
                    type="button"
                    onClick={() => setScriptingTab('typing')}
                    className="text-[11px] text-violet-300/80 hover:text-violet-200 flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <Keyboard size={12} />
                    <span>이 문구로 필사 타자 연습하기 &rarr;</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.04] p-5 space-y-3">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400/80 block">
              거울 확언 · Mirror Work
            </span>
            <p className="text-base sm:text-lg font-serif text-white/90 leading-relaxed break-keep">
              &ldquo;{data.mirrorPhrase}&rdquo;
            </p>
            <div className="flex flex-wrap gap-2">
              <TTSButton
                text={data.mirrorPhrase}
                voice="Kore"
                className="text-cyan-300 border-cyan-500/20 text-xs py-2 px-4"
                onPlay={() => markPracticeItem('mirror')}
              />
              <button
                type="button"
                onClick={() => {
                  void copyText(data.mirrorPhrase, 'mirror');
                  markPracticeItem('mirror');
                }}
                className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-[10px] text-white/50 hover:text-white cursor-pointer"
              >
                {copied === 'mirror' ? '복사됨' : '거울 확언 복사'}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-500/15 bg-indigo-500/[0.04] p-5 space-y-2">
            <div className="flex items-center gap-2">
              <Moon size={14} className="text-indigo-400" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400/80">
                Evening · 저녁 감사 마무리
              </span>
            </div>
            <p className="text-sm text-white/75 leading-relaxed break-keep">{data.eveningPrompt}</p>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ListChecks size={14} className="text-emerald-400" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400/80">
                  오늘의 끌어당김 실천 체크리스트
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-300/80">
                {practiceCount}/{PRACTICE_ITEMS.length}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRACTICE_ITEMS.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-black/20 cursor-pointer hover:bg-white/[0.03]"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(practice[item.id])}
                    onChange={() => togglePractice(item.id)}
                    className="accent-emerald-500"
                  />
                  <span className={`text-xs ${practice[item.id] ? 'text-white/45 line-through' : 'text-white/75'}`}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
            <AnimatePresence>
              {practiceCount === PRACTICE_ITEMS.length && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-xs text-emerald-300 font-bold"
                >
                  오늘의 시크릿 실천 완료 · 우주와 같은 주파수에 맞춰졌습니다
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 text-center">
            <p className="text-[10px] text-white/35 font-mono">
              오늘의 맞춤 소원 적용은 하루에 1회만 가능하며, 내일 새로운 소원을 우주에 요청할 수 있습니다.
            </p>
          </div>
        </motion.div>
      )}

      {!data && (
        <div className="w-full max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: Eye, title: '68초 시각화', desc: '이미 이루어진 장면을 느껴 보세요' },
            { icon: Heart, title: '감사 자석', desc: '감사가 더 많은 좋은 일을 끌어당깁니다' },
            { icon: PenLine, title: '스크립팅', desc: '현재형으로 미래를 기록하세요' },
          ].map((tool) => (
            <div
              key={tool.title}
              className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-center space-y-2 opacity-70"
            >
              <tool.icon size={18} className="mx-auto text-amber-400/70" />
              <p className="text-[11px] font-bold text-white/60">{tool.title}</p>
              <p className="text-[10px] text-white/35 leading-relaxed">{tool.desc}</p>
            </div>
          ))}
        </div>
      )}

      
    </div>
  );
}
