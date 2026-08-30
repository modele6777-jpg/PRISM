import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Zap,
  Check,
  Copy,
  Compass,
  Clock,
  Palette,
  Hash,
  Utensils,
  Award,
  ChevronRight,
  RefreshCw,
  ShieldAlert,
  KeyRound,
  SunMedium,
  Droplets,
  HeartHandshake,
  Flame,
} from 'lucide-react';
import { z } from 'zod';
import { useApp, getPersistentUserProfile } from '@/contexts/AppContext';
import { calculateDetailedSaju, type SajuAnalysisResult } from '@/lib/sajuAnalysis';
import { invokeLLMStructured } from '@/lib/ai';
import { recordPrismFeature } from '@/lib/prismOmniSync';
import { TTSButton } from '@/components/TTSButton';
import { getTodayDateKey } from '@/lib/dailyCache';

// 🌟 Zod Schema for AI-Generated Lucky Attunement Report
const TrinityDailyLuckySchema = z.object({
  luckScore: z.number().min(50).max(100).describe('오늘의 행운 공명 지수 (50~100점)'),
  luckLevelTitle: z.string().describe('오늘의 운세 레벨 칭호 (예: LV.4 황금빛 비상 대길)'),
  cosmicTide: z.string().describe('오늘 질문자를 감싸는 천상의 거대한 운명적 조류와 긍정적 기운 해설 (2~3문장)'),
  shadowDefense: z.string().describe('오늘 피해야 할 에고의 마찰과 감정 소모, 카르마적 함정 예방법 (1~2문장)'),
  goldenKey: z.string().describe('오늘 가장 큰 운을 낚아채고 상황을 반전시킬 결정적 행동 1가지 (1~2문장)'),
  luckyColor: z.string().describe('오늘의 개운 색상 이름 (예: 엠버 골드)'),
  luckyColorHex: z.string().describe('개운 색상 HEX 코드 (예: #F59E0B)'),
  luckyColorReason: z.string().describe('이 색상이 오늘의 부족한 기운을 채워주는 이유 (1문장)'),
  luckyNumbers: z.array(z.number()).describe('오늘의 행운의 숫자 3개'),
  luckyDirection: z.string().describe('오늘의 길한 방위 (예: 남동쪽 - 재물과 귀인 방위)'),
  goldenHour: z.string().describe('오늘 가장 운이 따르는 황금 시간대 (예: 오후 2시 ~ 4시)'),
  luckyFood: z.string().describe('오늘의 기운을 보양해주는 개운 음식이나 차 (예: 따뜻한 카모마일 티)'),
  dailyAmuletBlessing: z.string().describe('황금 부적에 새겨진 천상의 한 줄 수호 축복문'),
  quests: z.array(
    z.object({
      id: z.string(),
      title: z.string().describe('실천 과제 제목'),
      element: z.string().describe('관련 오행 (목/화/토/금/수)'),
      description: z.string().describe('손쉽게 실천할 수 있는 1분 개운 행동 설명'),
    })
  ).describe('오늘 하루 운을 열어주는 3가지 구체적 실천 과제'),
});

type TrinityDailyLuckyData = z.infer<typeof TrinityDailyLuckySchema>;

// Helper to generate deterministic day-seeded base luck data
function generateDailyLuckyFallback(
  dateKey: string,
  saju: SajuAnalysisResult | null,
  userName = '질문자'
): TrinityDailyLuckyData {
  let hash = 0;
  const seed = `${dateKey}_${userName}_${saju?.dayMaster?.korean || 'trinity'}`;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);
  const baseScore = 78 + (absHash % 19); // 78 ~ 96

  const colors = [
    { name: '로열 엠버 골드', hex: '#F59E0B', reason: '태양의 충만한 화기운으로 정체된 에너지를 녹여줍니다.' },
    { name: '에메랄드 포레스트', hex: '#10B981', reason: '새싹의 목기운으로 활력과 새로운 기회의 싹을 틔웁니다.' },
    { name: '사파이어 딥 블루', hex: '#3B82F6', reason: '지혜로운 수기운으로 감정의 파도를 평온하게 다스립니다.' },
    { name: '루비 크림슨 레드', hex: '#EF4444', reason: '열정적인 화기운으로 용기 있는 결단과 추진력을 돕습니다.' },
    { name: '플래티넘 펄 화이트', hex: '#F8FAFC', reason: '정화의 금기운으로 불필요한 잡념과 군더더기를 털어냅니다.' },
  ];
  const chosenColor = colors[absHash % colors.length];

  const directions = ['동남쪽 (귀인과 재물운)', '동쪽 (새로운 활력과 성장)', '남쪽 (명예와 인기운)', '서남쪽 (안정과 결실)'];
  const chosenDir = directions[absHash % directions.length];

  const hours = ['오전 9시 ~ 11시 (사시 - 번영의 시간)', '오후 2시 ~ 4시 (미시 - 결실의 시간)', '오후 7시 ~ 9시 (술시 - 지혜의 시간)'];
  const chosenHour = hours[absHash % hours.length];

  const foods = ['따뜻한 카모마일 또는 루이보스 차', '신선한 견과류와 제철 과일', '맑은 녹차와 다크 초콜릿'];
  const chosenFood = foods[absHash % foods.length];

  const num1 = (absHash % 9) + 1;
  const num2 = ((absHash * 3) % 9) + 1;
  const num3 = ((absHash * 7) % 9) + 1;

  const dayMasterSymbol = saju?.dayMaster?.symbolName || '빛나는 본원';

  return {
    luckScore: baseScore,
    luckLevelTitle: baseScore >= 90 ? 'LV.5 천우신조 (기적의 대길운)' : 'LV.4 황금빛 도약 (상승 대길)',
    cosmicTide: `오늘은 당신의 사주 본원(${dayMasterSymbol})에 천상의 따스한 서광이 드리우는 날입니다. 마음속에 품어온 긍정적인 확신이 현실의 우호적인 기회와 동조하여 뜻밖의 순풍을 일으킵니다.`,
    shadowDefense: `사소한 말실수나 조급한 감정 반응에 에너지를 빼앗기지 마세요. 1초만 숨을 고르고 여유를 가질 때 불필요한 마찰을 완전히 차단할 수 있습니다.`,
    goldenKey: `오늘 가장 중요한 결단이나 대화는 ${chosenHour}에 시도하세요. 망설이지 않고 직관을 믿고 내딛는 한 걸음이 큰 행운의 문을 엽니다.`,
    luckyColor: chosenColor.name,
    luckyColorHex: chosenColor.hex,
    luckyColorReason: chosenColor.reason,
    luckyNumbers: [num1, num2, num3],
    luckyDirection: chosenDir,
    goldenHour: chosenHour,
    luckyFood: chosenFood,
    dailyAmuletBlessing: `“당신이 내딛는 모든 발걸음마다 우주의 황금빛 은총과 행운이 동행합니다.”`,
    quests: [
      {
        id: 'water_cleanse',
        title: '맑은 물 한 잔의 수기운 정화',
        element: '수(水)',
        description: '아침 혹은 휴식 시간에 맑은 물 한 잔을 천천히 마시며 내면의 탁기를 비워내세요.',
      },
      {
        id: 'sun_breathe',
        title: '햇볕 3분 쬐기와 가슴 펴기',
        element: '화(火)',
        description: '창가나 야외에서 햇살을 받으며 어깨를 활짝 펴고 깊은 호흡을 3회 반복하세요.',
      },
      {
        id: 'kindness_act',
        title: '나와 주변을 향한 작은 친절',
        element: '목(木)',
        description: '오늘 나 자신에게 따뜻한 칭찬 한마디를 건네거나, 소중한 이에게 다정한 미소를 선물하세요.',
      },
    ],
  };
}

interface TrinityDailyLuckyViewProps {
  onConsult?: (message: string) => void;
}

export function TrinityDailyLuckyView({ onConsult }: TrinityDailyLuckyViewProps) {
  const { sharedState } = useApp();
  const todayKey = getTodayDateKey();
  const storageKey = `trinity_daily_lucky_data_${todayKey}`;
  const questStorageKey = `trinity_daily_lucky_quests_${todayKey}`;
  const boostStorageKey = `trinity_daily_lucky_boost_${todayKey}`;

  const profile = sharedState?.userProfile || getPersistentUserProfile();
  const saju = useMemo(() => (profile ? calculateDetailedSaju(profile) : null), [profile]);
  const userName = profile?.basic?.name || profile?.basic?.nickname || '여행자';

  // State
  const [luckyData, setLuckyData] = useState<TrinityDailyLuckyData>(() => {
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    return generateDailyLuckyFallback(todayKey, saju, userName);
  });

  const [isLoading, setIsLoading] = useState(false);
  const [completedQuests, setCompletedQuests] = useState<Record<string, boolean>>(() => {
    try {
      const cached = localStorage.getItem(questStorageKey);
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    return {};
  });

  const [isBoosted, setIsBoosted] = useState<boolean>(() => {
    return localStorage.getItem(boostStorageKey) === 'true';
  });

  const [showBoostCelebration, setShowBoostCelebration] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Dynamic Luck Score calculation
  const totalQuestCount = luckyData.quests.length || 3;
  const completedQuestCount = Object.values(completedQuests).filter(Boolean).length;
  const questBonus = completedQuestCount * 3; // +3 per quest
  const boostBonus = isBoosted ? 8 : 0;
  const dynamicLuckScore = Math.min(100, luckyData.luckScore + questBonus + boostBonus);

  // Fetch or Generate tailored AI Lucky Report
  const fetchTailoredLuckyReport = useCallback(
    async (force = false) => {
      if (!force) {
        try {
          const cached = localStorage.getItem(storageKey);
          if (cached) {
            setLuckyData(JSON.parse(cached));
            return;
          }
        } catch (_) {}
      }

      setIsLoading(true);
      try {
        const sajuDigest = saju
          ? `사주 일간: ${saju.dayMaster.symbolName}, 최강 오행: ${saju.elements.dominant.name}, 결핍 및 용신: ${saju.elements.lacking.name}, 2026 병오년 세운: ${saju.annual2026.theme}`
          : '기본 프로필';

        const prompt = `당신은 천상의 우주적 행운과 사주 오행의 기운을 개운(開運)시키는 최고의 행운 마스터 '트리니티'입니다.
오늘 날짜: ${todayKey}
질문자: ${userName} (성별: ${profile?.basic?.gender || '미입력'}, 생년월일: ${profile?.basic?.birthdate || '미입력'})
사주 정보: ${sajuDigest}
최근 고민: ${profile?.fate?.currentWorry || '없음'}
인생 목표: ${profile?.fate?.lifeGoal || '없음'}

위 질문자의 타고난 사주 본원과 오늘의 날짜(${todayKey}) 기운을 정밀 조율하여, 오늘 하루 막힌 운을 뚫고 대길(大吉)의 행운을 끌어당길 수 있는 맞춤형 데일리 럭키 개운 리포트를 생성해 주세요.`;

        const res = await invokeLLMStructured({
          schema: TrinityDailyLuckySchema,
          messages: [{ role: 'user', content: prompt }],
        });

        if (res && res.luckScore) {
          setLuckyData(res);
          try {
            localStorage.setItem(storageKey, JSON.stringify(res));
          } catch (_) {}

          recordPrismFeature({
            app: 'trinity',
            featureName: '데일리 럭키 시스템 (개운 조율)',
            summary: `오늘의 행운 지수: ${res.luckScore}점 (${res.luckLevelTitle}), 개운 컬러: ${res.luckyColor}, 골든 아워: ${res.goldenHour}`,
            details: {
              dateKey: todayKey,
              luckScore: res.luckScore,
              luckyColor: res.luckyColor,
              goldenHour: res.goldenHour,
              goldenKey: res.goldenKey,
            },
          });
        }
      } catch (err) {
        console.warn('[Trinity Daily Lucky] LLM generation failed, using rich deterministic fallback:', err);
        const fallback = generateDailyLuckyFallback(todayKey, saju, userName);
        setLuckyData(fallback);
        try {
          localStorage.setItem(storageKey, JSON.stringify(fallback));
        } catch (_) {}
      } finally {
        setIsLoading(false);
      }
    },
    [profile, saju, storageKey, todayKey, userName]
  );

  useEffect(() => {
    fetchTailoredLuckyReport(false);
  }, [fetchTailoredLuckyReport]);

  // Handle Quest Toggle
  const toggleQuest = (id: string) => {
    setCompletedQuests((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(questStorageKey, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  // Handle Luck Boost Action
  const handleBoostLuck = () => {
    if (isBoosted) return;
    setIsBoosted(true);
    setShowBoostCelebration(true);
    try {
      localStorage.setItem(boostStorageKey, 'true');
    } catch (_) {}
    setTimeout(() => setShowBoostCelebration(false), 4000);
  };

  // Handle Copy
  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isAllQuestsCompleted = completedQuestCount === totalQuestCount && totalQuestCount > 0;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-12 animate-fade-in relative font-sans text-white">
      {/* Background Ambience Glow */}
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl h-80 bg-gradient-to-b from-yellow-500/15 via-amber-500/10 to-transparent blur-[120px] pointer-events-none -z-10" />

      {/* Header Banner */}
      <div className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-500/15 border border-yellow-400/30 text-yellow-300 text-[11px] font-bold tracking-wider uppercase backdrop-blur-md shadow-[0_0_15px_rgba(234,179,8,0.2)]">
          <Sparkles size={14} className="animate-spin text-yellow-400" style={{ animationDuration: '8s' }} />
          <span>CELESTIAL LUCKY ENGINE</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
          오늘의 데일리 럭키 개운 시스템
        </h2>
        <p className="text-xs sm:text-sm text-white/60 font-sans max-w-lg mx-auto leading-relaxed">
          {userName}님의 사주 본원과 오늘의 천상 기운을 조율하여, 막힌 운을 틔우고 행운의 주파수를 최고조로 끌어올립니다.
        </p>
      </div>

      {/* 🌟 1. Main Luck Resonance Score Card */}
      <div className="glass relative overflow-hidden rounded-[32px] sm:rounded-[40px] p-6 sm:p-10 bg-gradient-to-b from-yellow-950/40 via-zinc-950/80 to-zinc-950 border border-yellow-400/30 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)] backdrop-blur-2xl">
        <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-500/15 rounded-full blur-[90px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Circular / Gauge Display */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center">
              {/* Outer Rotating Glow Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full border-2 border-dashed border-yellow-400/40 shadow-[0_0_25px_rgba(250,204,21,0.25)]"
              />
              <div className="absolute inset-2 rounded-full border border-yellow-500/30 bg-gradient-to-br from-yellow-500/20 via-black/60 to-black/90 flex flex-col items-center justify-center shadow-inner">
                <span className="text-[11px] sm:text-xs font-mono font-bold text-yellow-400/80 uppercase tracking-widest">
                  LUCK INDEX
                </span>
                <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tighter drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">
                  {dynamicLuckScore}
                  <span className="text-xl sm:text-2xl text-yellow-400 ml-0.5">%</span>
                </span>
                <span className="text-[10px] font-bold text-yellow-300/90 px-2.5 py-0.5 mt-1 rounded-full bg-yellow-400/15 border border-yellow-400/25">
                  {luckyData.luckLevelTitle}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-white/50 font-mono">
              기본 {luckyData.luckScore}% {questBonus > 0 && `+ 퀘스트 ${questBonus}%`} {boostBonus > 0 && `+ 부스트 ${boostBonus}%`}
            </p>
          </div>

          {/* Right Side: Score Summary & Boost Action */}
          <div className="flex-1 space-y-5 text-center md:text-left">
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2 mb-1.5">
                <span className="text-xs font-bold font-mono text-yellow-400 uppercase tracking-wider">
                  TODAY'S FORTUNE RESONANCE
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                  {todayKey}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {dynamicLuckScore >= 90
                  ? '✨ 대길(大吉)의 기운이 온전히 감응하고 있습니다!'
                  : '🌟 행운의 주파수가 상승 궤도에 올랐습니다.'}
              </h3>
              <p className="text-xs sm:text-sm text-white/70 mt-2 leading-relaxed">
                {luckyData.cosmicTide}
              </p>
            </div>

            {/* Lucky Boost Button */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              <button
                onClick={handleBoostLuck}
                disabled={isBoosted}
                className={`relative group px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2.5 transition-all shadow-lg overflow-hidden ${
                  isBoosted
                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/40 cursor-default shadow-[0_0_20px_rgba(234,179,8,0.2)]'
                    : 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black border border-yellow-300 shadow-[0_0_25px_rgba(234,179,8,0.4)] active:scale-95'
                }`}
              >
                <Zap size={18} className={isBoosted ? 'text-yellow-400' : 'text-black fill-current animate-bounce'} />
                <span>{isBoosted ? '⚡ 럭키 파워 부스트 활성화 완료 (+8%)' : '⚡ 럭키 파워 즉시 부스트 (+8%)'}</span>
                {!isBoosted && (
                  <span className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                )}
              </button>

              <button
                onClick={() => fetchTailoredLuckyReport(true)}
                disabled={isLoading}
                title="오늘의 행운 기운 다시 조율하기"
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white/70 hover:text-white transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold"
              >
                <RefreshCw size={15} className={isLoading ? 'animate-spin text-yellow-400' : ''} />
                <span className="hidden sm:inline">새로고침</span>
              </button>
            </div>

            {/* Boost Celebration Toast Effect */}
            <AnimatePresence>
              {showBoostCelebration && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3 rounded-xl bg-yellow-500/25 border border-yellow-400/50 text-yellow-200 text-xs font-bold flex items-center justify-center md:justify-start gap-2 shadow-lg backdrop-blur-md"
                >
                  <Sparkles size={16} className="text-yellow-300 animate-pulse" />
                  <span>황금빛 888Hz 행운 주파수가 동기화되었습니다! (+8% 상승)</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 🧭 2. Four Lucky Attunements (4대 개운 인자) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <Compass size={18} className="text-yellow-400" />
            <span>오늘의 4대 개운 인자 (Lucky Attunements)</span>
          </h4>
          <span className="text-[11px] font-mono text-white/50">오행 상생 조율</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Lucky Color */}
          <div className="glass p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/10 hover:border-yellow-400/30 transition-all flex flex-col justify-between space-y-3 group shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white/60 flex items-center gap-1.5">
                <Palette size={14} className="text-yellow-400" />
                <span>개운 컬러</span>
              </span>
              <div
                className="w-4 h-4 rounded-full border border-white/40 shadow-sm"
                style={{ backgroundColor: luckyData.luckyColorHex }}
              />
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold text-white group-hover:text-yellow-300 transition-colors">
                {luckyData.luckyColor}
              </p>
              <p className="text-[10px] text-white/50 mt-1 line-clamp-2 leading-relaxed">
                {luckyData.luckyColorReason}
              </p>
            </div>
          </div>

          {/* Lucky Number */}
          <div className="glass p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/10 hover:border-yellow-400/30 transition-all flex flex-col justify-between space-y-3 group shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white/60 flex items-center gap-1.5">
                <Hash size={14} className="text-amber-400" />
                <span>행운의 숫자</span>
              </span>
            </div>
            <div>
              <p className="text-base sm:text-lg font-mono font-extrabold text-yellow-400 tracking-wider">
                {luckyData.luckyNumbers.join(' · ')}
              </p>
              <p className="text-[10px] text-white/50 mt-1">
                기회와 결실을 맺는 상생의 정렬 수
              </p>
            </div>
          </div>

          {/* Lucky Direction */}
          <div className="glass p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/10 hover:border-yellow-400/30 transition-all flex flex-col justify-between space-y-3 group shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white/60 flex items-center gap-1.5">
                <Compass size={14} className="text-yellow-400" />
                <span>행운의 방위</span>
              </span>
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold text-white group-hover:text-yellow-300 transition-colors">
                {luckyData.luckyDirection}
              </p>
              <p className="text-[10px] text-white/50 mt-1">
                자리 배치 및 이동 시 행운을 부르는 방향
              </p>
            </div>
          </div>

          {/* Golden Hour */}
          <div className="glass p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/10 hover:border-yellow-400/30 transition-all flex flex-col justify-between space-y-3 group shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white/60 flex items-center gap-1.5">
                <Clock size={14} className="text-amber-400" />
                <span>골든 아워</span>
              </span>
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold text-white group-hover:text-yellow-300 transition-colors">
                {luckyData.goldenHour}
              </p>
              <p className="text-[10px] text-white/50 mt-1">
                중요 결단과 미팅의 최적 시간대
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 🎯 3. Daily Lucky Quests (일일 개운 3대 퀘스트) */}
      <div className="glass rounded-[32px] p-6 sm:p-8 bg-white/[0.02] border border-white/10 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/10">
          <div>
            <h4 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Award size={20} className="text-yellow-400" />
              <span>오늘의 3대 일일 개운 퀘스트</span>
            </h4>
            <p className="text-xs text-white/60 mt-0.5 font-sans">
              작은 실천으로 막힌 카르마와 탁기를 정화하고 행운 게이지를 끌어올립니다.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-mono font-bold text-yellow-400">
              {completedQuestCount} / {totalQuestCount} 완료
            </span>
            <div className="w-20 h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 transition-all duration-500"
                style={{ width: `${(completedQuestCount / totalQuestCount) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quest List */}
        <div className="space-y-3">
          {luckyData.quests.map((quest, idx) => {
            const isDone = !!completedQuests[quest.id];
            const elementIcon =
              quest.element.includes('수') ? Droplets : quest.element.includes('화') ? Flame : quest.element.includes('목') ? SunMedium : HeartHandshake;

            return (
              <div
                key={quest.id || idx}
                onClick={() => toggleQuest(quest.id)}
                className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-start sm:items-center justify-between gap-4 group ${
                  isDone
                    ? 'bg-yellow-500/10 border-yellow-500/40 shadow-[0_0_15px_rgba(234,179,8,0.1)]'
                    : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-white/20'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                      isDone
                        ? 'bg-yellow-400 text-black shadow-[0_0_12px_rgba(250,204,21,0.5)]'
                        : 'bg-white/10 text-white/50 group-hover:text-white group-hover:bg-white/15'
                    }`}
                  >
                    {isDone ? <Check size={18} strokeWidth={3} /> : React.createElement(elementIcon, { size: 18 })}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-white group-hover:text-yellow-300 transition-colors">
                        {quest.title}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                        {quest.element}
                      </span>
                    </div>
                    <p className="text-xs text-white/60 mt-1 leading-relaxed">
                      {quest.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5 text-[11px] font-mono font-bold text-yellow-400/80">
                  <span>+3%</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* All Clear Badge */}
        {isAllQuestsCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl bg-gradient-to-r from-yellow-500/20 via-amber-500/20 to-yellow-500/20 border border-yellow-400/40 text-center space-y-1"
          >
            <div className="flex items-center justify-center gap-1.5 text-yellow-300 font-bold text-sm">
              <Award size={18} className="text-yellow-400" />
              <span>오늘의 3대 개운 퀘스트 올 클리어!</span>
            </div>
            <p className="text-xs text-white/70">
              천상의 대길(大吉) 가호가 완전히 개방되었습니다. 오늘 하루 펼쳐질 기적을 온전히 누려보세요.
            </p>
          </motion.div>
        )}
      </div>

      {/* 🔮 4. AI Master Trinity's Deep Fortune Decree (심층 개운 신탁) */}
      <div className="glass rounded-[32px] p-6 sm:p-8 bg-white/[0.03] border border-yellow-400/25 shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center text-yellow-400 shadow-md">
              <KeyRound size={20} />
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-bold text-white">
                마스터 트리니티의 개운 신탁 (Fortune Decree)
              </h4>
              <p className="text-xs text-white/60 font-sans">
                {userName}님을 위한 일일 운세 처방전
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TTSButton text={`${luckyData.cosmicTide} ${luckyData.shadowDefense} ${luckyData.goldenKey}`} voice="Kore" className="p-2.5 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 transition-all text-xs" />
            <button
              onClick={() =>
                handleCopyText(
                  `[트리니티 오늘의 개운 신탁]\n🌟 흐름: ${luckyData.cosmicTide}\n⚠️ 주의: ${luckyData.shadowDefense}\n🔑 개운 열쇠: ${luckyData.goldenKey}\n🎨 컬러: ${luckyData.luckyColor} | 🔢 숫자: ${luckyData.luckyNumbers.join(', ')}`,
                  'decree'
                )
              }
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all text-xs flex items-center gap-1 font-bold"
              title="신탁 복사하기"
            >
              {copiedKey === 'decree' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span className="hidden sm:inline">{copiedKey === 'decree' ? '복사됨' : '복사'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Shadow Defense */}
          <div className="p-4 sm:p-5 rounded-2xl bg-red-950/20 border border-red-500/25 space-y-2">
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
              <ShieldAlert size={16} />
              <span>마찰 예방 & 에고 방어 (Shadow Check)</span>
            </div>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
              {luckyData.shadowDefense}
            </p>
          </div>

          {/* Golden Key */}
          <div className="p-4 sm:p-5 rounded-2xl bg-yellow-950/20 border border-yellow-500/30 space-y-2">
            <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold">
              <KeyRound size={16} />
              <span>오늘의 결정적 개운 비법 (Golden Key)</span>
            </div>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
              {luckyData.goldenKey}
            </p>
          </div>
        </div>

        {/* Lucky Food Remedy */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-yellow-400 shrink-0">
              <Utensils size={16} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-white/50 block">오늘의 보양 개운 푸드/티</span>
              <span className="text-xs sm:text-sm font-bold text-white">{luckyData.luckyFood}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 🎴 5. Daily Golden Amulet Card (행운의 황금 부적) */}
      <div className="glass rounded-[32px] p-6 sm:p-8 bg-gradient-to-r from-yellow-950/40 via-zinc-950 to-amber-950/40 border border-yellow-400/40 shadow-2xl text-center space-y-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(250,204,21,0.1)_0%,transparent_70%)] pointer-events-none" />

        <div className="relative z-10 space-y-2 max-w-xl mx-auto">
          <span className="text-[10px] font-mono text-yellow-400 uppercase tracking-[0.3em] block font-bold">
            CELESTIAL AMULET
          </span>
          <h4 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            오늘 당신을 지켜주는 천상의 수호 부적
          </h4>
          <p className="text-sm sm:text-base font-serif italic text-yellow-200/90 leading-relaxed pt-2">
            {luckyData.dailyAmuletBlessing}
          </p>
        </div>

        {/* Lucy Chat Button */}
        {onConsult && (
          <div className="pt-2">
            <button
              onClick={() =>
                onConsult(
                  `오늘 나의 행운 지수는 ${dynamicLuckScore}%(${luckyData.luckLevelTitle})이고, 개운 컬러는 ${luckyData.luckyColor}야. 오늘 이 행운의 흐름을 최고로 극대화할 수 있는 비결을 알려줘!`
                )
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 group"
            >
              <Sparkles size={16} className="text-yellow-400 group-hover:rotate-12 transition-transform" />
              <span>오늘 행운 극대화 비법 루시에게 묻기</span>
              <ChevronRight size={16} className="text-white/40 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
