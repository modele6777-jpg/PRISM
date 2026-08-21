import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Utensils,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  X,
  Heart,
  History,
  BookOpen,
  Send,
  Coffee,
  Leaf,
  ChevronRight,
  Flame,
  Moon,
  Zap,
  Activity,
  Soup,
  Salad,
  Volume2,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  FOOD_CATEGORIES,
  type FoodCategoryId,
  type HealingFoodRecommendation,
  generateHealingFoodRecommendation,
  loadFoodHistory,
  getPersonalizedFoodFallback,
} from '@/lib/healingFood';
import { useApp } from '@/contexts/AppContext';
import { TTSButton } from '@/components/TTSButton';

interface HealingFoodModalProps {
  onClose: () => void;
}

export function HealingFoodModal({ onClose }: HealingFoodModalProps) {
  const { firebaseUser } = useApp();
  const uid = firebaseUser?.uid || 'guest';

  const [activeTab, setActiveTab] = useState<'recommend' | 'history' | 'guide'>('recommend');
  const [selectedCategory, setSelectedCategory] = useState<FoodCategoryId>('calm');
  const [conditionInput, setConditionInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<HealingFoodRecommendation | null>(null);
  const [historyList, setHistoryList] = useState<HealingFoodRecommendation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load history on mount
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const list = await loadFoodHistory(uid);
      setHistoryList(list);
    } catch (e) {
      console.error('[HealingFoodModal] Failed to load history:', e);
    } finally {
      setLoadingHistory(false);
    }
  }, [uid]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Handle recommendation request
  const handleGenerate = async (forcedCategory?: FoodCategoryId) => {
    const cat = forcedCategory || selectedCategory;
    setIsLoading(true);
    setErrorMsg(null);

    const safetyTimer = setTimeout(() => {
      setIsLoading(false);
    }, 28000);

    try {
      const result = await generateHealingFoodRecommendation(uid, cat, conditionInput);
      setCurrentResult(result);
      setHistoryList((prev) => [result, ...prev.filter((p) => (p.id && result.id ? p.id !== result.id : true))]);
    } catch (err: any) {
      console.error('[HealingFoodModal] Error:', err);
      // Use graceful fallback
      const fallback = getPersonalizedFoodFallback(conditionInput, cat);
      setCurrentResult(fallback);
      setHistoryList((prev) => [fallback, ...prev]);
    } finally {
      clearTimeout(safetyTimer);
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!currentResult) return;
    const text = `🌿 [AURA 오늘의 추천 음식]
🍽️ ${currentResult.dishName} (${currentResult.dishSubtitle})
✨ 카테고리: ${currentResult.categoryLabel}
🥗 주요 식재료: ${currentResult.ingredients.join(', ')}
🫖 힐링 페어링 차: ${currentResult.healingTea}
💡 신체 치유 효능: ${currentResult.wellnessEffect}
🧘 마인드풀 섭식 명상: ${currentResult.mindfulEatingTip}
🍳 5분 조리 꿀팁: ${currentResult.simpleTip}
💖 치유 확언: "${currentResult.affirmation}"
🔮 오라 에너지: ${currentResult.auraEnergyKeyword}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentCategoryMeta = FOOD_CATEGORIES.find((c) => c.id === selectedCategory) || FOOD_CATEGORIES[0];

  const quickConditionTags = [
    { label: '😴 수면 부족 & 피로', text: '잠을 깊이 못 자서 온몸이 뻐근하고 무거워요' },
    { label: '🌪️ 소화불량 & 더부룩함', text: '속이 더부룩하고 가스가 차서 편안한 음식이 필요해요' },
    { label: '🤯 스트레스 & 긴장', text: '머리가 지끈거리고 긴장감이 심해 부드러운 위로가 필요해요' },
    { label: '🧊 몸이 차고 손발 냉증', text: '체온이 낮고 으슬으슬해서 속을 따뜻하게 데우고 싶어요' },
    { label: '🌫️ 멍하고 집중 안 됨', text: '머리가 맑지 않고 멍해서 두뇌를 깨우는 음식이 필요해요' },
    { label: '🎈 붓기 & 무거운 몸', text: '몸이 많이 붓고 찌뿌둥해서 가볍게 비우고 싶어요' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[400] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xl overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl bg-zinc-950/95 border border-emerald-500/30 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Glow Effects */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative px-5 py-4 sm:px-6 sm:py-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-inner">
              <Utensils size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-400">AURA SPECIAL</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                  Soul Nutrition
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">오늘의 추천 음식 (Healing Food)</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 border-b border-white/5 flex gap-2 sm:gap-3 bg-black/20">
          <button
            onClick={() => setActiveTab('recommend')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold tracking-wide flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'recommend'
                ? 'text-emerald-300 border-emerald-400'
                : 'text-white/40 border-transparent hover:text-white/80'
            }`}
          >
            <Sparkles size={14} />
            맞춤 추천 받기
          </button>
          <button
            onClick={() => {
              setActiveTab('history');
              fetchHistory();
            }}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold tracking-wide flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'history'
                ? 'text-emerald-300 border-emerald-400'
                : 'text-white/40 border-transparent hover:text-white/80'
            }`}
          >
            <History size={14} />
            치유 식탁 기록 ({historyList.length})
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold tracking-wide flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'guide'
                ? 'text-emerald-300 border-emerald-400'
                : 'text-white/40 border-transparent hover:text-white/80'
            }`}
          >
            <BookOpen size={14} />
            6대 치유 에너지
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
          {/* TAB 1: RECOMMEND */}
          {activeTab === 'recommend' && (
            <>
              {currentResult ? (
                /* RESULT DISPLAY */
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-5"
                >
                  {/* Hero Dish Banner */}
                  <div className="relative p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-950/60 via-zinc-900/80 to-teal-950/40 border border-emerald-500/30 overflow-hidden shadow-xl">
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <TTSButton
                        text={`${currentResult.dishName}. ${currentResult.dishSubtitle}. 핵심 치유 효능: ${currentResult.wellnessEffect}. 섭식 명상 가이드: ${currentResult.mindfulEatingTip}. 치유 확언: ${currentResult.affirmation}`}
                        voice="Kore"
                        className="bg-white/10 hover:bg-white/20 text-emerald-300 text-xs px-2.5 py-1 rounded-full border border-white/10"
                      />
                      <button
                        onClick={handleCopy}
                        className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                        title="추천 복사하기"
                      >
                        {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-3xl sm:text-4xl shadow-inner shrink-0">
                        {currentResult.emoji}
                      </div>
                      <div className="space-y-1 pr-16">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                            {currentResult.categoryLabel || '맞춤 힐링식'}
                          </span>
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                            {currentResult.auraEnergyKeyword}
                          </span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                          {currentResult.dishName}
                        </h3>
                        <p className="text-xs sm:text-sm text-emerald-200/80 font-medium leading-relaxed">
                          {currentResult.dishSubtitle}
                        </p>
                      </div>
                    </div>

                    {/* Ingredients & Pairing */}
                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-white/10 text-xs">
                      <div className="p-3 rounded-2xl bg-black/30 border border-white/5 space-y-1.5">
                        <div className="text-white/50 flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                          <Salad size={12} className="text-emerald-400" />
                          핵심 치유 식재료
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {currentResult.ingredients.map((ing, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-200 text-[11px] border border-emerald-500/20"
                            >
                              {ing}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-black/30 border border-white/5 space-y-1.5">
                        <div className="text-white/50 flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                          <Coffee size={12} className="text-teal-400" />
                          함께 마시는 힐링 페어링 차
                        </div>
                        <p className="text-teal-200 font-semibold text-xs leading-relaxed">
                          {currentResult.healingTea}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Deep Healing Breakdown */}
                  <div className="grid grid-cols-1 gap-3 text-xs sm:text-sm">
                    {/* Wellness Effect */}
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                        <Activity size={14} />
                        신체 생체 전압 & 장기 치유 효능
                      </div>
                      <p className="text-white/80 leading-relaxed font-sans">
                        {currentResult.wellnessEffect}
                      </p>
                    </div>

                    {/* Mindful Eating Tip */}
                    <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 space-y-1.5">
                      <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
                        <Moon size={14} />
                        마인드풀 이팅 (섭식 명상 가이드)
                      </div>
                      <p className="text-indigo-100/90 leading-relaxed font-sans italic">
                        "{currentResult.mindfulEatingTip}"
                      </p>
                    </div>

                    {/* Quick Prep Tip & Affirmation */}
                    <div className="p-4 rounded-2xl bg-amber-950/25 border border-amber-500/20 space-y-2">
                      <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
                        <Zap size={14} />
                        5분 간편 조리 & 섭취 꿀팁
                      </div>
                      <p className="text-amber-100/90 leading-relaxed text-xs">
                        {currentResult.simpleTip}
                      </p>
                      <div className="pt-2 border-t border-amber-500/15 flex items-center gap-2 text-emerald-300 font-medium text-xs">
                        <Heart size={12} className="text-rose-400 shrink-0" />
                        <span>오늘의 치유 확언: "{currentResult.affirmation}"</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      onClick={() => setCurrentResult(null)}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold tracking-wide transition-all"
                    >
                      다른 테마로 다시 고르기
                    </button>
                    <button
                      onClick={() => handleGenerate()}
                      disabled={isLoading}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-emerald-900/40 flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                      새로운 치유 음식 추천받기
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* SELECTION FORM */
                <div className="space-y-6">
                  {/* Category Selection */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold text-white/80 flex items-center gap-2">
                      <Layers size={14} className="text-emerald-400" />
                      1. 오늘 나에게 가장 필요한 힐링 테마를 선택하세요
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {FOOD_CATEGORIES.map((cat) => {
                        const isSelected = selectedCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                              isSelected
                                ? `bg-gradient-to-br ${cat.gradient} ${cat.borderColor} ring-1 ring-emerald-400/50 shadow-lg`
                                : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] text-white/70'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-2xl">{cat.emoji}</span>
                              {isSelected && (
                                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                              )}
                            </div>
                            <div className="mt-2 space-y-0.5">
                              <div className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-white/80'}`}>
                                {cat.label}
                              </div>
                              <div className="text-[10px] text-white/40 font-sans line-clamp-1">
                                {cat.subLabel}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Condition Input / Quick Tags */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold text-white/80 flex items-center gap-2">
                      <Activity size={14} className="text-emerald-400" />
                      2. 현재 몸 상태나 증상이 있다면 알려주세요 (선택)
                    </label>

                    {/* Quick Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {quickConditionTags.map((tag, i) => (
                        <button
                          key={i}
                          onClick={() => setConditionInput(tag.text)}
                          className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-white/70 hover:text-emerald-200 border border-white/5 hover:border-emerald-500/30 text-[11px] transition-all"
                        >
                          {tag.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <textarea
                        value={conditionInput}
                        onChange={(e) => setConditionInput(e.target.value)}
                        placeholder="예: 오늘 회의가 많아서 머리가 지끈거리고 속이 살짝 쓰려요. 가볍고 따뜻한 메뉴 추천해주세요."
                        rows={2}
                        maxLength={120}
                        className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/40 text-white text-xs placeholder:text-white/30 resize-none outline-none transition-all"
                      />
                      {conditionInput && (
                        <button
                          onClick={() => setConditionInput('')}
                          className="absolute right-3 top-3 text-white/30 hover:text-white/70"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Selected Summary Card */}
                  <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 flex items-center gap-3">
                    <span className="text-2xl">{currentCategoryMeta.emoji}</span>
                    <div className="flex-1 text-xs">
                      <span className="font-bold text-emerald-300">[{currentCategoryMeta.label}]</span>
                      <p className="text-white/60 text-[11px] leading-relaxed mt-0.5">
                        {currentCategoryMeta.description}
                      </p>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={() => handleGenerate()}
                    disabled={isLoading}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm tracking-wide shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw size={18} className="animate-spin text-emerald-200" />
                        <span>생체 오라와 신체 밸런스를 분석해 치유식을 조율 중...</span>
                      </>
                    ) : (
                      <>
                        <Utensils size={18} className="text-emerald-200" />
                        <span>오늘의 맞춤 치유 음식 처방받기</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}

          {/* TAB 2: HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span>내가 받은 데일리 치유 음식 기록</span>
                <button
                  onClick={fetchHistory}
                  className="hover:text-emerald-300 flex items-center gap-1"
                >
                  <RefreshCw size={12} className={loadingHistory ? 'animate-spin' : ''} />
                  새로고침
                </button>
              </div>

              {historyList.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Utensils size={32} className="mx-auto text-white/20" />
                  <p className="text-xs text-white/40">아직 처방받은 치유 음식 기록이 없습니다.</p>
                  <button
                    onClick={() => setActiveTab('recommend')}
                    className="mt-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold"
                  >
                    첫 치유 음식 추천받기
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyList.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      onClick={() => {
                        setCurrentResult(item);
                        setActiveTab('recommend');
                      }}
                      className="p-4 rounded-2xl bg-white/[0.03] hover:bg-emerald-950/30 border border-white/10 hover:border-emerald-500/30 transition-all cursor-pointer group flex items-start gap-3.5"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">
                        {item.emoji}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 font-semibold">
                            {item.categoryLabel || '힐링 푸드'}
                          </span>
                          <span className="text-[10px] text-white/30 flex items-center gap-1">
                            <Calendar size={10} />
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '최근'}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                          {item.dishName}
                        </h4>
                        <p className="text-[11px] text-white/50 line-clamp-1">{item.dishSubtitle}</p>
                      </div>
                      <ChevronRight size={16} className="text-white/20 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all self-center" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: 6 WELLNESS NUTRITIONAL PATHS GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-teal-950/30 border border-emerald-500/20 text-xs text-emerald-100/90 leading-relaxed space-y-1">
                <span className="font-bold text-emerald-300">🌿 AURA 치유 영양 테라피 철학</span>
                <p>
                  몸에 들어가는 음식은 단순한 칼로리가 아니라, 세포와 뇌파를 조율하는 '생체 정보'입니다.
                  AURA는 세도나 방하착과 함께 신체 에너지를 빠르게 회복시키는 6가지 맞춤 영양 경로를 제공합니다.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {FOOD_CATEGORIES.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 hover:border-emerald-500/30 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{cat.emoji}</span>
                      <div>
                        <div className="font-bold text-white text-xs">{cat.label}</div>
                        <div className="text-[10px] text-white/40">{cat.subLabel}</div>
                      </div>
                    </div>
                    <p className="text-white/70 text-[11px] leading-relaxed">{cat.description}</p>
                    <button
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setActiveTab('recommend');
                      }}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 pt-1"
                    >
                      이 테마로 처방받기 <ChevronRight size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-black/40 flex items-center justify-between text-[11px] text-white/40">
          <span>AURA Wellness Coach • Bio-Energy & Soul Nutrition</span>
          <button onClick={onClose} className="hover:text-white transition-colors">
            닫기
          </button>
        </div>
      </div>
    </motion.div>
  );
}
