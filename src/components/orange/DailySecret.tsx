import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, KeyRound, Copy, Check, RefreshCw, Heart, Eye, PenLine,
  ListChecks, Moon, Timer, Plus, X, BookOpen, Keyboard, Shuffle, Wand2,
} from 'lucide-react';
import { z } from 'zod';
import { useApp } from '@/contexts/AppContext';
import { invokeLLMStructured } from '@/lib/ai';
import { recordPrismFeature } from '@/lib/prismOmniSync';
import { TTSButton } from '@/components/TTSButton';
import { playTTS, stopTTS } from '@/utils/tts';
import { ScriptingTypingPractice } from './ScriptingTypingPractice';

const DailySecretSchema = z.object({
  affirmation: z.string().describe('사용자의 소원과 상황을 바탕으로, 이미 완벽히 이루어진 것처럼 감사와 확신을 담은 강력한 현재완료/선언형 확언 한 문장'),
  reflection: z.string().describe('소원이 이루어짐을 깊이 믿고 마음속 의심과 저항을 지우며 확신을 갖도록 이끄는 마음에 새길 글 2~3문장'),
  action: z.string().describe('소원과 끌어당김을 실현하기 위해 오늘 당장 실천할 수 있는 구체적이고 작은 행동 1가지'),
  desire: z.string().describe('Ask: 사용자의 소원을 바탕으로 우주에 명확하고 간결하게 요청하는 선언문 한 문장'),
  visualizationGuide: z.string().describe('사용자의 소원이 생생히 실현된 장면을 오감(시각, 청각, 촉각, 벅찬 감정)으로 느끼는 68초 시각화 가이드 3~4문장'),
  gratitudeSeeds: z.array(z.string()).describe('소원 성취 주파수를 높이고 풍요를 여는 오늘의 구체적 감사 3가지'),
  feelingAnchor: z.string().describe('소원이 이미 이루어졌을 때 느껴지는 벅찬 기쁨과 안도감을 생생히 환기하는 감정 한 줄'),
  mirrorPhrase: z.string().describe('거울 속 나를 보며 소원 성취의 확신과 자존감을 채우는 거울 확언 한 문장'),
  eveningPrompt: z.string().describe('소원이 이루어짐에 감사하며 편안한 수면으로 들어가는 저녁 마무리 한 문장'),
  scriptingStarter: z.string().describe('소원이 완벽히 실현된 현재의 하루를 생생하게 써 내려가는 스크립팅 첫 문장'),
  appliedWish: z.string().optional().describe('이 키트 생성에 적용된 사용자의 소원 원문'),
});

type DailySecretData = z.infer<typeof DailySecretSchema>;

function generateTailoredSecretFallback(wishStr: string, name = '여행자'): DailySecretData {
  const cleanWish = wishStr.trim() || '오늘 하루 온전한 평온과 뜻밖의 풍요로운 행운';
  return {
    desire: `우주여, ${name}의 "${cleanWish}" 소원이 가장 아름답고 완전한 방식으로 현실에 피어나게 하옵소서.`,
    affirmation: `나의 소원 "${cleanWish}"은(는) 이미 우주의 완벽한 섭리 안에서 기적처럼 이루어졌으며, 나는 지금 깊은 감사와 충만한 풍요 속에 존재합니다.`,
    reflection: `원하는 것을 간절히 바라는 것은 이미 그것이 영적인 차원에 존재하기 때문입니다. 의심과 조급함을 내려놓고, 이미 이루어진 결과의 편안한 주파수에 당신의 마음을 맞추세요. 우주는 언제나 당신의 진실한 믿음에 화답합니다.`,
    action: `오늘 하루 "${cleanWish}"이(가) 이미 이루어진 사람처럼 당당하고 가벼운 발걸음으로 미소를 지으며 주변에 친절을 베풀어 보세요.`,
    visualizationGuide: `눈을 감고 편안히 숨을 들이마십니다. 당신이 그토록 바라던 "${cleanWish}"이(가) 눈앞에 완벽한 현실이 되어 있습니다. 당신의 얼굴에 번지는 안도감의 미소, 가슴 가득 차오르는 벅찬 기쁨, 주변 사람들의 따뜻한 축하와 환호성을 오감으로 생생히 느껴보세요.`,
    gratitudeSeeds: [
      `나의 소원 "${cleanWish}"을(를) 우주가 가장 완벽한 타이밍에 이루어주고 있음에 감사합니다.`,
      `오늘 하루 내 안에 숨 쉬는 무한한 가능성과 끌어당김의 힘에 감사합니다.`,
      `나를 둘러싼 모든 상황과 인연들이 나를 돕기 위해 조화롭게 움직이고 있음에 감사합니다.`
    ],
    feelingAnchor: `가슴 깊은 곳에서 차오르는 형언할 수 없는 안도감과 충만한 기쁨이 온몸으로 퍼져나갑니다.`,
    mirrorPhrase: `거울 속 나를 바라보며 선언합니다. "${name}, 너의 소원은 이미 이루어졌고 너는 이 모든 풍요를 누릴 자격이 충분해."`,
    eveningPrompt: `오늘 우주에 띄워 보낸 "${cleanWish}"의 씨앗이 밤사이 무럭무럭 자라남을 믿으며 깊은 평화 속에 잠듭니다.`,
    scriptingStarter: `오늘 아침, 나는 내 소원 "${cleanWish}"이(가) 완벽하게 이루어졌다는 기적 같은 소식을 듣고 벅찬 감사의 눈물을 흘렸다.`,
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

function loadCachedSecret(): DailySecretData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { date: string; data: DailySecretData };
      if (parsed.date === todayKey()) return parsed.data;
    }
    for (const key of LEGACY_KEYS) {
      const legacy = localStorage.getItem(key);
      if (!legacy) continue;
      const parsed = JSON.parse(legacy) as { date: string; data: Partial<DailySecretData> };
      if (parsed.date !== todayKey()) continue;
      if (parsed.data.affirmation && parsed.data.reflection && parsed.data.action) {
        return parsed.data as DailySecretData;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function isFullSecretKit(data: DailySecretData | null): data is DailySecretData {
  return Boolean(
    data?.desire
    && data.visualizationGuide
    && data.gratitudeSeeds?.length === 3
    && data.feelingAnchor
    && data.mirrorPhrase
    && data.eveningPrompt
    && data.scriptingStarter,
  );
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

  useEffect(() => {
    if (!running || secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          setDone(true);
          setCompletionNotice(true);
          playVisualizationAlarm();
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, secondsLeft, onComplete]);

  // Clean up TTS when unmounting
  useEffect(() => {
    return () => {
      stopTTS();
    };
  }, []);

  const start = () => {
    setSecondsLeft(68);
    setDone(false);
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
  const { sharedState, updateSharedState } = useApp();
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

  const hasReceivedToday = data !== null;
  const hasFullKit = isFullSecretKit(data);
  const isWishMatched = Boolean(data?.appliedWish && wish.trim() && data.appliedWish.trim() === wish.trim());

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
      setData((prev) => prev || (cloudSecret as DailySecretData));
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
          savePractice(merged);
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
        setPractice((prev) => {
          const merged = { ...freshPractice, ...prev };
          savePractice(merged);
          return merged;
        });
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

  const receiveSecret = useCallback(async (options?: { upgradeOnly?: boolean; force?: boolean }) => {
    const upgradeOnly = options?.upgradeOnly ?? false;
    if (loading) return;
    setLoading(true);

    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 25000);

    const { userProfileStr, memory, name } = buildPromptContext();
    const currentWish = wish.trim();
    const hasWish = Boolean(currentWish);

    try {
      const upgradeNote = upgradeOnly && data
        ? `\n[기존 확언 유지 참고] affirmation: ${data.affirmation}`
        : '';

      const systemPrompt = [
        '당신은 론다 번(Rhonda Byrne)의 『시크릿(The Secret)』— 끌어당김의 법칙을 바탕으로 오늘의 시크릿 키트를 만드는 ORANGE 가이드입니다.',
        '핵심 원리: Ask(명확한 요청) → Believe(흔들림 없는 믿음) → Receive(이미 받은 것처럼 느끼고 수용).',
        '생각과 감정의 주파수가 실제 현실을 강력하게 끌어당깁니다.',
        '',
        hasWish
          ? [
              '★★★ [최우선 필수 지침: 사용자의 구체적 소원 100% 심층 반영] ★★★',
              `사용자가 오늘 우주에 요청한 구체적 소원: "${currentWish}"`,
              '1. 반드시 생성되는 모든 항목(affirmation, reflection, action, desire, visualizationGuide, feelingAnchor, mirrorPhrase, eveningPrompt, scriptingStarter, gratitudeSeeds)을 위 소원과 직접적으로 연결하여 완벽하게 맞춤형으로 작성하세요.',
              '2. 추상적이거나 일반적인 좋은 말이 아니라, 사용자가 적은 소원의 세부적인 내용(상황, 목표, 바라는 결과)이 눈앞에서 완벽히 실현된 구체적인 현실을 생생하게 담아야 합니다.',
              `3. desire 항목: 사용자의 소원("${currentWish}")을 우주에 올리는 가장 명확하고 순수하며 강력한 Ask 선언문으로 다듬어 적으세요.`,
              `4. affirmation 항목: "${currentWish}" 소원이 이미 완전히 이루어져 깊이 감사해하는 현재완료형/선언형 확언으로 작성하세요.`,
              `5. visualizationGuide 항목: "${currentWish}" 소원이 눈앞에 현실이 된 구체적인 장면, 주변의 축하와 감탄, 나의 미소와 안도감을 68초간 눈을 감고 느끼도록 단계별로 묘사하세요.`,
              `6. feelingAnchor 항목: 이 소원이 성취되었을 때 가슴 깊은 곳에서 차오르는 벅찬 기쁨과 안도감을 한 줄로 생생하게 담으세요.`,
              `7. mirrorPhrase 항목: 거울을 보며 이 소원이 이미 나의 것임을 당당하게 선언하는 확언으로 작성하세요.`,
              `8. scriptingStarter 항목: "${currentWish}" 소원이 이루어진 오늘의 감사한 하루를 기록하는 일기의 첫 문장으로 작성하세요.`,
              `9. action 항목: 이 소원을 향해 주파수를 맞추고 우주의 선물을 기쁘게 받기 위한 오늘의 작고 구체적인 실천 1가지로 작성하세요.`,
            ].join('\n')
          : '사용자가 별도의 소원을 적지 않았으므로, 오늘의 일반적인 풍요, 평온, 성공, 사랑, 건강을 강력하게 끌어당기는 조화로운 시크릿 키트를 작성하세요.',
        '',
        `[프로필: ${userProfileStr}]`,
        `[최근 기록/맥락: ${memory}]${upgradeNote}`,
      ].filter(Boolean).join('\n');

      const userPrompt = hasWish
        ? `[${name}님의 소원: "${currentWish}"]\n\n이 소원을 100% 중심에 두고, 소원이 이미 완벽하게 이루어진 현실을 전제로 하는 맞춤형 오늘의 시크릿 키트를 완성해 주세요.\naffirmation, reflection, action, desire, visualizationGuide, gratitudeSeeds(3개), feelingAnchor, mirrorPhrase, eveningPrompt, scriptingStarter 모든 항목에 "${currentWish}" 소원의 내용이 구체적이고 깊이 있게 녹아있어야 합니다.`
        : `${name}님을 위한 오늘의 시크릿 키트를 주세요. affirmation, reflection, action, desire, visualizationGuide, gratitudeSeeds(3개), feelingAnchor, mirrorPhrase, eveningPrompt, scriptingStarter를 모두 채워 주세요.`;

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

      if (!result) {
        result = generateTailoredSecretFallback(currentWish, name);
      }

      const effectiveWish = hasWish ? currentWish : undefined;
      const merged: DailySecretData = upgradeOnly && data
        ? { ...data, ...result, affirmation: data.affirmation, appliedWish: data.appliedWish || effectiveWish }
        : { ...result, appliedWish: effectiveWish };
      
      setData(merged);
      if (effectiveWish) {
        localStorage.setItem(dayStorageKey('wish_applied'), 'true');
        localStorage.setItem(dayStorageKey('applied_wish'), effectiveWish);
        localStorage.setItem(dayStorageKey('wish'), effectiveWish);
        setWish(effectiveWish);
        setWishApplied(true);
      }
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ date: todayKey(), data: merged }),
      );

      // Realtime cross-device synchronization to Firestore & server vault
      try {
        const today = todayKey();
        void updateSharedState({
          dailySecrets: {
            ...(sharedState?.dailySecrets || {}),
            [today]: {
              ...merged,
              appliedWish: effectiveWish || merged.appliedWish,
              practice,
              gratitudeChecked,
              extraGratitude,
              script: script || (result.scriptingStarter ? `${result.scriptingStarter}\n\n` : ''),
            },
          },
          lastOrangeDailySync: Date.now(),
        }, 'ORANGE');
      } catch (_) {}

      recordPrismFeature({
        app: 'orange',
        featureName: '시크릿(The Secret) 확언 키트',
        summary: `확언: "${merged.affirmation}", 요청(Ask): "${merged.desire}"${effectiveWish ? ` (소원: "${effectiveWish}")` : ''}`,
        details: merged,
      });

      if (result.scriptingStarter && !script.trim()) {
        setScript(`${result.scriptingStarter}\n\n`);
      }
    } catch (error) {
      console.error('[DailySecret] Top-level error:', error);
      const fallback = generateTailoredSecretFallback(currentWish, name);
      setData(fallback);
    } finally {
      clearTimeout(safetyTimer);
      setLoading(false);
    }
  }, [buildPromptContext, data, loading, script, wish]);

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const togglePractice = (id: PracticeId) => {
    setPractice((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      syncDailyProgress(next, gratitudeChecked, extraGratitude, script);
      return next;
    });
  };

  const toggleGratitude = (index: number) => {
    setGratitudeChecked((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      syncDailyProgress(practice, next, extraGratitude, script);
      return next;
    });
  };

  const addGratitude = () => {
    const trimmed = newGratitude.trim();
    if (!trimmed) return;
    setExtraGratitude((prev) => {
      const next = [...prev, trimmed].slice(0, 5);
      syncDailyProgress(practice, gratitudeChecked, next, script);
      return next;
    });
    setNewGratitude('');
  };

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
            value={data?.appliedWish ? data.appliedWish : wish}
            onChange={(e) => {
              if (!data) setWish(e.target.value);
            }}
            readOnly={Boolean(data)}
            placeholder="위 맞춤 예시를 클릭하거나, 오늘 끌어당기고 싶은 구체적인 소원을 자유롭게 적어 보세요. (예: 원하는 시험 합격, 승진 및 연봉 인상, 소중한 사람과의 화해, 건강과 활력 회복...)"
            rows={2}
            className={`w-full rounded-xl border border-white/15 bg-black/40 text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50 px-4 py-3 text-sm transition-colors shadow-inner resize-none ${data ? 'opacity-90 cursor-default' : ''}`}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="space-y-0.5">
            <p className="text-[11px] text-amber-200/80 font-sans">
              {data
                ? `✨ 오늘 적용된 소원: "${data.appliedWish || '오늘의 시크릿 키트'}"`
                : '✨ 소원을 선택/입력 후 키트를 받으시면 확언, 68초 시각화, 스크립팅, 실천 과제가 100% 맞춤 생성됩니다.'}
            </p>
          </div>
          {!data ? (
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
                    <span>{wish.trim() ? '소원 맞춤 키트 받기' : '오늘의 시크릿 키트 받기'}</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setData(null);
                  setWishApplied(false);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-amber-500/20 text-amber-300 hover:text-amber-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Wand2 size={12} />
                <span>소원 변경 및 다시 받기</span>
              </button>
            </div>
          )}
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
          {!hasFullKit && (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-amber-100/90">
                시크릿 실천 도구 키트를 아직 받지 않았어요. 시각화·감사·거울 확언 등을 추가로 받을 수 있습니다.
              </p>
              <button
                type="button"
                onClick={() => void receiveSecret({ upgradeOnly: true })}
                disabled={loading}
                className="shrink-0 px-4 py-2 rounded-xl bg-amber-500/25 hover:bg-amber-500/35 border border-amber-500/30 text-amber-100 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                키트 확장 받기
              </button>
            </div>
          )}

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
                  onPlay={() => {
                    setPractice((prev) => {
                      const next = { ...prev, affirmation: true };
                      syncDailyProgress(next, gratitudeChecked, extraGratitude, script);
                      return next;
                    });
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    void copyText(data.affirmation, 'affirmation');
                    togglePractice('affirmation');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                >
                  {copied === 'affirmation' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  {copied === 'affirmation' ? '복사됨' : '복사'}
                </button>
                <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-500/20 bg-amber-500/10 text-[10px] font-bold uppercase tracking-wider text-amber-200/90 shadow-sm">
                  <Check size={12} className="text-emerald-400" />
                  <span>오늘의 시크릿 수신 완료 (하루 1회)</span>
                </div>
              </div>
            </div>
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

          {hasFullKit && (
            <>
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
                onComplete={() => setPractice((prev) => {
                  const next = { ...prev, visualization: true };
                  syncDailyProgress(next, gratitudeChecked, extraGratitude, script);
                  return next;
                })}
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
                          if (!gratitudeChecked[index]) togglePractice('gratitude');
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
                    onCompletePractice={() => {
                      setPractice((prev) => {
                        const next = { ...prev, affirmation: true };
                        syncDailyProgress(next, gratitudeChecked, extraGratitude, script);
                        return next;
                      });
                    }}
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
                    onPlay={() => {
                      setPractice((prev) => {
                        const next = { ...prev, mirror: true };
                        syncDailyProgress(next, gratitudeChecked, extraGratitude, script);
                        return next;
                      });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void copyText(data.mirrorPhrase, 'mirror');
                      togglePractice('mirror');
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
            </>
          )}

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
