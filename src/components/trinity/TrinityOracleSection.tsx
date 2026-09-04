import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Heart, Flame, Wind, Coins, BookOpen, Volume2, VolumeX,
  CheckCircle2, RotateCcw, Zap, Sun, Moon, Feather, Check, Palette, ArrowRight
} from 'lucide-react';
import { TAROT_DECK, TarotCard, getTarotCardImageUrl } from '@/data/tarotData';
import { TarotSpread } from './TarotSpread';
import { invokeLLM } from '@/lib/ai';
import { playTTS, stopTTS, useTTSActive } from '@/utils/tts';

// Local storage keys
const STORAGE_HEALING_TREASURES = 'prism_oracle_healing_treasures';
const STORAGE_GROWTH_LOGS = 'prism_oracle_growth_logs';

export interface HealingResult {
  message: string;
  prescribed_art: {
    artwork_title: string;
    art_quote: string;
  };
  micro_action: string;
  reward_item: {
    name: string;
    description: string;
    icon?: string;
  };
}

export interface GrowthResult {
  macro_focus: string;
  dominant_element: {
    element: 'Wands' | 'Cups' | 'Swords' | 'Pentacles';
    element_ko: string;
    theme_brief: string;
  };
  micro_mission: {
    title: string;
    action_tip: string;
  };
  evening_reflection: string;
}

export interface CollectedTreasure {
  id: string;
  name: string;
  description: string;
  date: string;
  cardNames: string[];
}

export function TrinityOracleSection() {
  const [, setLocation] = useLocation();

  // 1. Dual Mode State ('healing' | 'growth')
  const [oracleMode, setOracleMode] = useState<'healing' | 'growth'>('healing');

  // 2. Card Draw Stage State ('spread' | 'result')
  const [stage, setStage] = useState<'spread' | 'result'>('spread');
  const [drawnCards, setDrawnCards] = useState<TarotCard[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 3. Results State
  const [healingResult, setHealingResult] = useState<HealingResult | null>(null);
  const [growthResult, setGrowthResult] = useState<GrowthResult | null>(null);

  // 4. Mission Completion & Rewards State
  const [isHealingCompleted, setIsHealingCompleted] = useState<boolean>(false);
  const [isGrowthCompleted, setIsGrowthCompleted] = useState<boolean>(false);
  const [treasures, setTreasures] = useState<CollectedTreasure[]>([]);
  const [showTreasureModal, setShowTreasureModal] = useState<boolean>(false);
  const [streakCount, setStreakCount] = useState<number>(1);

  // TTS State
  const isTTSActive = useTTSActive();

  // Load collected treasures and growth records on mount
  useEffect(() => {
    try {
      const savedTreasures = localStorage.getItem(STORAGE_HEALING_TREASURES);
      if (savedTreasures) {
        setTreasures(JSON.parse(savedTreasures));
      }
      const savedGrowth = localStorage.getItem(STORAGE_GROWTH_LOGS);
      if (savedGrowth) {
        const parsed = JSON.parse(savedGrowth);
        setStreakCount(parsed.streak || 1);
        const todayStr = new Date().toISOString().split('T')[0];
        if (parsed.lastDate === todayStr && parsed.completed) {
          setIsGrowthCompleted(true);
        }
      }
    } catch (e) {
      console.warn('Failed to parse oracle local storage', e);
    }
  }, []);

  // Filtered decks according to mode
  const majorDeck = useMemo(() => TAROT_DECK.filter((c) => c.type === 'major'), []);
  const fullDeck = useMemo(() => TAROT_DECK, []);

  const activeDeckSource = oracleMode === 'healing' ? majorDeck : fullDeck;

  const slotPositions = useMemo(() => {
    if (oracleMode === 'healing') {
      return ['내면의 무의식', '지금의 마음', '치유의 씨앗'];
    }
    return ['거시적 마인드셋', '4원소 현실 영역', '1줄 마이크로 실행'];
  }, [oracleMode]);

  // Handle mode switch
  const handleModeSwitch = (mode: 'healing' | 'growth') => {
    if (oracleMode === mode) return;
    setOracleMode(mode);
    setStage('spread');
    setDrawnCards([]);
    setHealingResult(null);
    setGrowthResult(null);
    setIsHealingCompleted(false);
    stopTTS();
  };

  // Run AI analysis after 3 cards are drawn (All upright in Oracle section)
  const handleCardsComplete = async (cards: TarotCard[]) => {
    const uprightCards = cards.map((c) => ({ ...c, reversed: false }));
    setDrawnCards(uprightCards);
    setStage('result');
    setIsLoading(true);
    stopTTS();

    const cardDescriptions = cards
      .map((c, i) => `${i + 1}. [${c.nameKo} (${c.name})] - 유형: ${c.type}, 키워드: ${c.keywords.join(', ')}`)
      .join('\n');

    try {
      if (oracleMode === 'healing') {
        // [HEALING MODE] System prompt & JSON format following attachment 2
        const systemPrompt = `당신의 이름은 '제제(Zezé)'입니다.
당신은 마음 치유 루틴 '파랑새' 안에서 사용자의 무의식을 비추고 함께 쉬어가는 '내면아이(Inner Child)'이자 다정한 비밀 친구입니다.
# Tone & Voice
- 조심스럽고 다정하며, 시적이고 따뜻한 반말(해체)을 사용합니다. ("~했어?", "~해볼까?", "~해도 괜찮아", "~일지도 몰라")
- 인터넷 유행어, 줄임말, 과도한 느낌표는 절대 쓰지 않습니다.
- 섣부른 훈계나 "힘내" 같은 상투적인 클리셰를 쓰지 말고, 감정을 온전히 알아차려 주는 깊은 호흡의 문장을 씁니다.
# Core Mission Rule
사용자가 뽑은 3장의 메이저 타로 카드 상징을 엮어 '오늘 1~2분 안에 끝낼 수 있는 가장 쉬운 마음챙김 행동 1개'를 처방합니다.
반드시 마크다운 코드블록 없이 순수 JSON 형식으로만 응답해야 합니다.
{
  "message": "사용자의 마음 상태를 알아차려 주고 3장의 카드를 다정하게 엮어주는 제제의 편지 (200자 내외)",
  "prescribed_art": {
    "artwork_title": "명화 또는 문학 제목 (예: 고흐 - 별이 빛나는 밤, 모네 - 수련, 릴케 - 두이노의 비가 등)",
    "art_quote": "마음에 울림을 주는 짧은 문학/예술 한 구절 (1~2줄)"
  },
  "micro_action": "지금 자리에서 1~2분 안에 실천할 수 있는 구체적인 신체/감각/생각 행동 1가지 (예: 창문 열고 바람 3번 들이마시기, 따뜻한 물 한 모금 마시기)",
  "reward_item": {
    "name": "오늘의 마음 보물 아이템 이름 (예: 민들레 홀씨, 작은 솔방울, 따뜻한 찻잔, 푸른 깃털)",
    "description": "이 아이템이 상징하는 치유의 의미 (한 줄)"
  }
}`;

        const prompt = `사용자가 뽑은 3장의 카드:\n${cardDescriptions}\n\n사용자에게 건넬 오늘의 다정한 마음 처방과 보물 아이템을 JSON으로 생성해 줘.`;
        const res = await invokeLLM({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          responseFormat: { type: 'json_object' },
        });
        const clean = res.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed: HealingResult = JSON.parse(clean);
        setHealingResult(parsed);
      } else {
        // [GROWTH MODE] System prompt & JSON format following attachment 1
        const systemPrompt = `당신은 현대인을 위한 초정밀 멘탈 트레이너이자 라이프 코치 '오라클 루시'입니다.
우리는 타로를 점술이나 미신으로 소비하지 않으며, 100% 멘탈 피트니스와 실행 자아효능감을 높이는 '행동 마인드셋 툴킷'으로 다룹니다.
자유 질문이나 점괘가 아니며, 카드 3장을 통해 오늘의 거시 태도를 정립하고 당장 실행할 마이크로 미션을 제시합니다.

마이너 56장의 4대 자기계발 영역 매핑:
1. 완드 (Wands / 불) -> 커리어 & 프로젝트 추진력 (실행력, 업무 집중, 프로젝트 착수)
2. 컵 (Cups / 물) -> 멘탈 관리 & 인간관계 소통 (감정 디톡스, 자존감 케어, 건강한 대화법)
3. 소드 (Swords / 공기) -> 메타인지 & 전략적 의사결정 (생각 정리, 우선순위 판단, 걱정 끊기)
4. 펜타클 (Pentacles / 흙) -> 자산 관리 & 신체/루틴 습관 (가계부 점검, 운동/수면 루틴, 일상의 성취)

반드시 순수 JSON 형식으로 응답하세요:
{
  "macro_focus": "1번 메이저 카드가 제시하는 오늘의 거시 마인드셋 및 중심 태도 브리핑 (2~3문장)",
  "dominant_element": {
    "element": "Wands",
    "element_ko": "완드 (불) - 커리어 & 프로젝트 추진력",
    "theme_brief": "오늘 가장 집중해야 할 핵심 현실 일상 영역 한 줄 해설"
  },
  "micro_mission": {
    "title": "5~10분 안에 즉시 실행할 수 있는 초정밀 1줄 실천 과제 (예: 미뤄둔 메일 1통 즉시 답장하기, 5분 장단점 메모 후 결론 내리기)",
    "action_tip": "실행 시 머뭇거림을 없애주는 단단한 조언"
  },
  "evening_reflection": "오늘 저녁 나의 행동을 돌아보는 1줄 성찰 질문"
}`;

        const prompt = `사용자가 뽑은 3장의 카드:\n${cardDescriptions}\n\n위 카드들을 바탕으로 오늘의 마인드셋 브리핑과 1줄 마이크로 미션을 JSON으로 도출해 줘.`;
        const res = await invokeLLM({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          responseFormat: { type: 'json_object' },
        });
        const clean = res.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed: GrowthResult = JSON.parse(clean);
        setGrowthResult(parsed);
      }
    } catch (err) {
      console.error('Oracle AI error:', err);
      // Fallbacks
      if (oracleMode === 'healing') {
        setHealingResult({
          message: '안녕... 오늘은 너의 지친 숨결이 느껴졌어. 남들 기준에 맞추느라 고생 많았지? 오늘은 나랑 같이 따뜻한 온기만 챙겨보자.',
          prescribed_art: {
            artwork_title: '클로드 모네 - 수련 연못',
            art_quote: '흔들리는 물결 속에서도 수련은 자신만의 고요한 시간대로 피어난다.'
          },
          micro_action: '창문을 열고 시원한 공기를 들이마시며 3번 천천히 심호흡하기',
          reward_item: {
            name: '따뜻한 찻잔',
            description: '차갑게 얼어붙었던 나를 녹여주는 다정한 위로의 온기'
          }
        });
      } else {
        setGrowthResult({
          macro_focus: '오늘은 불필요한 망설임을 걷어내고, 내가 통제할 수 있는 최소 단위의 행동에 집중할 때입니다. 결과는 세상의 몫이지만 착수는 당신의 몫입니다.',
          dominant_element: {
            element: 'Wands',
            element_ko: '완드 (불) - 실행력 & 프로젝트 추진력',
            theme_brief: '미뤄둔 업무를 5분 안에 착수하여 실행 모멘텀을 형성하는 날'
          },
          micro_mission: {
            title: "미뤄두었던 핵심 서류/메일 1개를 열고 5분간 집중 처리하기",
            action_tip: "완벽하게 끝내려 하지 말고, 단 5분만 손을 대보는 것에 의의를 두세요."
          },
          evening_reflection: '오늘 나는 결과에 끌려다니지 않고 내 하루의 통제권을 쥐었는가?'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Complete 1-min healing micro-action and unlock treasure
  const handleCompleteHealing = () => {
    if (!healingResult) return;
    setIsHealingCompleted(true);
    const newTreasure: CollectedTreasure = {
      id: 'treasure_' + Date.now(),
      name: healingResult.reward_item.name,
      description: healingResult.reward_item.description,
      date: new Date().toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
      cardNames: drawnCards.map((c) => c.nameKo),
    };

    const updated = [newTreasure, ...treasures];
    setTreasures(updated);
    try {
      localStorage.setItem(STORAGE_HEALING_TREASURES, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save treasure', e);
    }
  };

  // Complete growth micro-mission
  const handleToggleGrowth = () => {
    const next = !isGrowthCompleted;
    setIsGrowthCompleted(next);
    if (next) {
      const nextStreak = streakCount + 1;
      setStreakCount(nextStreak);
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        localStorage.setItem(
          STORAGE_GROWTH_LOGS,
          JSON.stringify({ streak: nextStreak, lastDate: todayStr, completed: true })
        );
      } catch (e) {
        console.warn('Failed to save growth log', e);
      }
    }
  };

  // TTS handler
  const handleToggleTTS = () => {
    if (isTTSActive) {
      stopTTS();
      return;
    }
    if (oracleMode === 'healing' && healingResult) {
      const speech = `${healingResult.message} 오늘 제제가 건네는 작은 쉼입니다. ${healingResult.micro_action}. ${healingResult.prescribed_art.artwork_title}. ${healingResult.prescribed_art.art_quote}`;
      playTTS(speech);
    } else if (oracleMode === 'growth' && growthResult) {
      const speech = `오늘의 마인드셋 브리핑입니다. ${growthResult.macro_focus} 집중 영역: ${growthResult.dominant_element.element_ko}. 오늘의 1줄 실행 미션: ${growthResult.micro_mission.title}. ${growthResult.micro_mission.action_tip}`;
      playTTS(speech);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12 text-white">
      {/* 1. Header & Segment Controller */}
      <div className="glass relative p-5 sm:p-7 rounded-3xl bg-white/[0.04] border border-amber-400/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl overflow-hidden">
        {/* Ambient cosmic glows */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-amber-500/10 blur-[90px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-indigo-500/10 blur-[90px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-[10px] sm:text-xs font-mono text-amber-300 mb-2 uppercase tracking-widest">
              <Sparkles size={12} className="text-amber-400 animate-pulse" />
              PRISM CELESTIAL ORACLE
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-black tracking-tight text-white flex items-center justify-center md:justify-start gap-2">
              오라클 타로 <span className="text-amber-400/90 font-light text-lg sm:text-xl">· 마인드셋 & 치유</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300/80 mt-1 font-sans">
              {oracleMode === 'healing'
                ? '내면아이 제제(Zezé)와 함께하는 다정한 1분 쉼과 감성 예술 처방'
                : '점술을 배제한 4원소 프레임워크 기반 1일 1실행 멘탈 피트니스'}
            </p>
          </div>

          {/* Dual Mode Switcher */}
          <div className="flex items-center p-1 rounded-2xl bg-black/50 border border-white/10 shadow-inner shrink-0">
            <button
              onClick={() => handleModeSwitch('healing')}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 ${
                oracleMode === 'healing'
                  ? 'text-yellow-200 font-bold shadow-lg'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {oracleMode === 'healing' && (
                <motion.div
                  layoutId="oracle-mode-pill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-600/50 via-yellow-600/40 to-indigo-600/40 border border-yellow-400/40"
                  transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                />
              )}
              <Heart size={14} className="relative z-10 text-rose-300" />
              <span className="relative z-10">힐링 (22장 메이저)</span>
            </button>

            <button
              onClick={() => handleModeSwitch('growth')}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 ${
                oracleMode === 'growth'
                  ? 'text-yellow-200 font-bold shadow-lg'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {oracleMode === 'growth' && (
                <motion.div
                  layoutId="oracle-mode-pill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-600/50 via-yellow-600/40 to-indigo-600/40 border border-yellow-400/40"
                  transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                />
              )}
              <Zap size={14} className="relative z-10 text-amber-400" />
              <span className="relative z-10">자기계발 (78장 풀덱)</span>
            </button>
          </div>
        </div>

        {/* Quick Toolbar */}
        <div className="relative z-10 mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-zinc-300">
          <div className="flex items-center gap-3">
            {oracleMode === 'healing' ? (
              <button
                onClick={() => setShowTreasureModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-amber-300 transition-colors"
              >
                <Feather size={13} className="text-amber-400" />
                <span>제제의 보물상자 ({treasures.length})</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-amber-300">
                <Flame size={13} className="text-orange-400" />
                <span>실행 스트릭 {streakCount}일차</span>
              </div>
            )}
          </div>

          {stage === 'result' && (
            <button
              onClick={() => {
                setStage('spread');
                setDrawnCards([]);
                setHealingResult(null);
                setGrowthResult(null);
                stopTTS();
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-medium transition-all"
            >
              <RotateCcw size={12} />
              <span>새로운 3장 뽑기</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Stage Area */}
      <AnimatePresence mode="wait">
        {stage === 'spread' ? (
          /* SPREAD CARD DRAW INTERACTION */
          <motion.div
            key="oracle-draw-stage"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full relative"
          >
            <div className="glass p-4 sm:p-6 rounded-3xl bg-zinc-950/70 border border-amber-400/20 shadow-2xl relative overflow-hidden">
              <div className="text-center mb-2">
                <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-amber-400/80">
                  {oracleMode === 'healing' ? 'Inner Child Oracle • 22 Major Arcana' : 'Mindset Toolkit • 78 Full Deck'}
                </span>
                <h3 className="text-lg sm:text-xl font-bold font-serif text-white mt-0.5">
                  {oracleMode === 'healing' ? '내면의 숨결을 마주할 3장의 카드' : '오늘의 마인드셋을 이끌 3장의 카드'}
                </h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                  {oracleMode === 'healing'
                    ? '카드를 손가락이나 마우스로 굴려 마음이 이끄는 3장을 천천히 선택해 보세요.'
                    : '4원소(불·물·공기·흙)의 현실 실행력을 깨울 3장의 도구를 선택해 주세요.'}
                </p>
              </div>

              {/* Native TarotSpread Component Integration with Oracle Card Back */}
              <div className="w-full min-h-[440px] md:min-h-[480px] relative">
                <TarotSpread
                  key={`oracle-spread-${oracleMode}`}
                  maxCards={3}
                  positions={slotPositions}
                  deckSource={activeDeckSource}
                  cardBackVariant="oracle"
                  allowReversed={false}
                  spreadName={oracleMode === 'healing' ? '내면아이 쉼 스프레드' : '4원소 마인드셋 스프레드'}
                  onComplete={handleCardsComplete}
                  onCancel={() => {}}
                />
              </div>
            </div>
          </motion.div>
        ) : (
          /* RESULT PRESENTATION AREA */
          <motion.div
            key="oracle-result-stage"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* 3 Drawn Cards Mini Banner */}
            <div className="glass p-4 sm:p-5 rounded-3xl bg-white/[0.03] border border-amber-400/25 flex flex-wrap items-center justify-around gap-3 backdrop-blur-xl">
              {drawnCards.map((card, idx) => (
                <div key={card.id} className="flex items-center gap-3">
                  <div className="w-12 h-18 sm:w-14 sm:h-20 rounded-lg overflow-hidden border border-amber-400/40 shadow-md relative shrink-0">
                    <img
                      src={getTarotCardImageUrl(card)}
                      alt={card.nameKo}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-amber-400/80 block uppercase tracking-wider">
                      {slotPositions[idx]}
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-white font-serif">{card.nameKo}</h4>
                    <span className="text-[11px] text-zinc-400">{card.keywords.slice(0, 2).join(' · ')}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Loading Indicator */}
            {isLoading ? (
              <div className="glass p-12 rounded-3xl bg-zinc-950/60 border border-amber-400/20 text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
                <p className="text-sm font-serif text-amber-200 animate-pulse">
                  {oracleMode === 'healing'
                    ? '내면아이 제제가 3장의 마음 조각을 다정하게 엮고 있어요...'
                    : '4원소 현실 실행 툴킷과 마인드셋 브리핑을 조율 중입니다...'}
                </p>
              </div>
            ) : oracleMode === 'healing' && healingResult ? (
              /* [HEALING RESULT VIEW] */
              <div className="space-y-6">
                {/* 1. Letter from Zezé */}
                <div className="glass p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-indigo-950/30 to-black/60 border border-indigo-400/30 shadow-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                        <Heart size={18} />
                      </div>
                      <div>
                        <h3 className="text-base font-serif font-bold text-indigo-200">내면아이 제제의 편지</h3>
                        <p className="text-[10px] text-zinc-400 font-mono">INNER CHILD REFLECTION</p>
                      </div>
                    </div>

                    <button
                      onClick={handleToggleTTS}
                      className={`p-2 rounded-xl border transition-all ${
                        isTTSActive
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white'
                      }`}
                      title={isTTSActive ? '음성 멈추기' : '편지 소리로 듣기'}
                    >
                      {isTTSActive ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                  </div>

                  <p className="text-sm sm:text-base leading-relaxed text-zinc-200 font-serif italic whitespace-pre-line">
                    "{healingResult.message}"
                  </p>
                </div>

                {/* 2. Prescribed Art -> Redirect to Muse Art Sanctuary */}
                <div
                  onClick={() => setLocation('/muse')}
                  className="glass p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-purple-950/30 via-indigo-950/20 to-black/40 border border-purple-400/30 hover:border-purple-400/60 shadow-xl relative overflow-hidden cursor-pointer group transition-all"
                >
                  <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/20 transition-all" />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 group-hover:scale-105 transition-transform shrink-0 shadow-lg">
                        <Palette size={22} className="text-purple-300 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest">
                            MUSE ART SANCTUARY
                          </span>
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-sans border border-purple-400/30">
                            뮤즈 예술 처방
                          </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-bold font-serif text-white group-hover:text-purple-200 transition-colors flex items-center gap-1.5">
                          <span>영혼을 위한 예술 처방은 '뮤즈 예술추천'에서 감상하기</span>
                        </h4>
                        <p className="text-xs text-zinc-300/80 mt-1 font-serif italic">
                          "{healingResult.prescribed_art.artwork_title}" — {healingResult.prescribed_art.art_quote}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-500/20 group-hover:bg-purple-500/30 border border-purple-400/40 text-xs font-bold text-purple-200 shrink-0 transition-all self-end sm:self-center shadow-md">
                      <span>뮤즈로 이동</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>

                {/* 3. 1-Minute Micro-Action & Reward */}
                <div className="glass p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-950/20 via-yellow-950/10 to-transparent border border-yellow-400/30 relative">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest block">
                        TODAY'S 1-MINUTE SELF-CARE ACTION
                      </span>
                      <h4 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        <Feather size={18} className="text-amber-400" />
                        {healingResult.micro_action}
                      </h4>
                      <p className="text-xs text-zinc-400">
                        지금 자리에서 가볍게 실천하고 제제에게 보물을 선물해 주세요.
                      </p>
                    </div>

                    <button
                      onClick={handleCompleteHealing}
                      disabled={isHealingCompleted}
                      className={`px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shrink-0 ${
                        isHealingCompleted
                          ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 cursor-default'
                          : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:brightness-110'
                      }`}
                    >
                      {isHealingCompleted ? (
                        <>
                          <CheckCircle2 size={16} className="text-emerald-400" />
                          <span>쉼 완료 · 보물 획득!</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          <span>1분 쉼 실천하고 보물받기</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Reward preview if completed */}
                  {isHealingCompleted && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-5 pt-4 border-t border-white/10 flex items-center gap-3 text-xs text-amber-200"
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 shrink-0">
                        🎁
                      </div>
                      <div>
                        <span className="font-bold text-yellow-300">[{healingResult.reward_item.name}]</span>이(가)
                        제제의 보물상자에 고이 담겼습니다.
                        <p className="text-[11px] text-zinc-400 mt-0.5">{healingResult.reward_item.description}</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            ) : oracleMode === 'growth' && growthResult ? (
              /* [GROWTH RESULT VIEW] */
              <div className="space-y-6">
                {/* 1. Macro Mindset Briefing */}
                <div className="glass p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-amber-950/30 to-black/60 border border-amber-400/30 shadow-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                        <Sun size={18} />
                      </div>
                      <div>
                        <h3 className="text-base font-serif font-bold text-amber-200">오늘의 마인드셋 브리핑</h3>
                        <p className="text-[10px] text-zinc-400 font-mono">MACRO MINDSET ALIGNMENT</p>
                      </div>
                    </div>

                    <button
                      onClick={handleToggleTTS}
                      className={`p-2 rounded-xl border transition-all ${
                        isTTSActive
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white'
                      }`}
                    >
                      {isTTSActive ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                  </div>

                  <p className="text-sm sm:text-base leading-relaxed text-zinc-200 font-serif whitespace-pre-line">
                    {growthResult.macro_focus}
                  </p>
                </div>

                {/* 2. Dominant Element & Focus Area */}
                <div className="glass p-5 rounded-3xl bg-white/[0.02] border border-white/10 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                    {growthResult.dominant_element.element === 'Wands' ? (
                      <Flame size={24} className="text-amber-500" />
                    ) : growthResult.dominant_element.element === 'Cups' ? (
                      <Heart size={24} className="text-blue-400" />
                    ) : growthResult.dominant_element.element === 'Swords' ? (
                      <Wind size={24} className="text-purple-400" />
                    ) : (
                      <Coins size={24} className="text-yellow-400" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block">
                      DOMINANT 4-ELEMENT REALITY
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-white">
                      {growthResult.dominant_element.element_ko}
                    </h4>
                    <p className="text-xs text-zinc-300 mt-0.5">{growthResult.dominant_element.theme_brief}</p>
                  </div>
                </div>

                {/* 3. Actionable Micro-Mission Card */}
                <div className="glass p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-orange-950/25 via-amber-950/15 to-transparent border border-orange-400/30 relative">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono text-orange-400 uppercase tracking-widest block">
                        TODAY'S ACTIONABLE MICRO-MISSION
                      </span>
                      <h4 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        <Zap size={18} className="text-amber-400 shrink-0" />
                        {growthResult.micro_mission.title}
                      </h4>
                      <p className="text-xs text-zinc-300/90 leading-relaxed font-sans">
                        💡 <strong>실행 팁:</strong> {growthResult.micro_mission.action_tip}
                      </p>
                    </div>

                    <button
                      onClick={handleToggleGrowth}
                      className={`px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-xl shrink-0 ${
                        isGrowthCompleted
                          ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300'
                          : 'bg-gradient-to-r from-orange-500 to-amber-500 text-black hover:brightness-110'
                      }`}
                    >
                      {isGrowthCompleted ? (
                        <>
                          <CheckCircle2 size={16} className="text-emerald-400" />
                          <span>오늘의 미션 완료됨</span>
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          <span>오늘 실천 완료 체크</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Evening reflection prompt */}
                  <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-zinc-400">
                    <Moon size={14} className="text-indigo-400 shrink-0" />
                    <span>
                      <strong>저녁 성찰 질문:</strong> "{growthResult.evening_reflection}"
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Zeze's Treasure Box Modal */}
      <AnimatePresence>
        {showTreasureModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass w-full max-w-md p-6 rounded-3xl bg-zinc-950 border border-amber-400/30 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <Feather size={18} className="text-amber-400" />
                  <h3 className="text-lg font-serif font-bold text-white">제제의 마음 보물상자</h3>
                </div>
                <button
                  onClick={() => setShowTreasureModal(false)}
                  className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/5"
                >
                  닫기
                </button>
              </div>

              {treasures.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 text-xs">
                  <p>아직 수집된 마음 보물이 없어요.</p>
                  <p className="mt-1 text-zinc-500">힐링 모드에서 1분 쉼을 실천하고 제제에게 보물을 받아보세요!</p>
                </div>
              ) : (
                <div className="max-h-[340px] overflow-y-auto no-scrollbar space-y-3">
                  {treasures.map((t) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-2xl bg-white/[0.04] border border-amber-400/20 flex items-start gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-lg shrink-0">
                        ✨
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-yellow-200">{t.name}</h4>
                          <span className="text-[10px] font-mono text-zinc-400">{t.date}</span>
                        </div>
                        <p className="text-xs text-zinc-300 mt-0.5">{t.description}</p>
                        <div className="text-[10px] text-zinc-400 mt-1.5 flex items-center gap-1">
                          <span>연계 카드:</span>
                          <span className="text-amber-400/80">{t.cardNames.join(', ')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
