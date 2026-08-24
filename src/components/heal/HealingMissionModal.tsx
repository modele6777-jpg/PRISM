import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  X,
  History,
  BookOpen,
  Send,
  Leaf,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Moon,
  Zap,
  Activity,
  Heart,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  Volume2,
} from 'lucide-react';
import {
  MISSION_CATEGORIES,
  type MissionCategoryId,
  type HealingMission,
  generateHealingMissionRecommendation,
  loadMissionHistory,
  toggleMissionCompleted,
  getPersonalizedMissionFallback,
} from '@/lib/healingMission';
import { useApp } from '@/contexts/AppContext';
import { TTSButton } from '@/components/TTSButton';

interface HealingMissionModalProps {
  onClose?: () => void;
  isModal?: boolean;
}

export function HealingMissionModal({ onClose, isModal = true }: HealingMissionModalProps) {
  const { firebaseUser } = useApp();
  const uid = firebaseUser?.uid || 'guest';

  const [activeTab, setActiveTab] = useState<'recommend' | 'history' | 'guide'>('recommend');
  const [selectedCategory, setSelectedCategory] = useState<MissionCategoryId>('body');
  const [conditionInput, setConditionInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<HealingMission | null>(null);
  const [historyList, setHistoryList] = useState<HealingMission[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [copiedHistoryId, setCopiedHistoryId] = useState<string | null>(null);

  // Load history on mount
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const list = await loadMissionHistory(uid);
      setHistoryList(list);
    } catch (e) {
      console.error('[HealingMissionModal] Failed to load history:', e);
    } finally {
      setLoadingHistory(false);
    }
  }, [uid]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Handle recommendation request
  const handleGenerate = async (forcedCategory?: MissionCategoryId) => {
    const cat = forcedCategory || selectedCategory;
    setIsLoading(true);
    setJustCompleted(false);

    const safetyTimer = setTimeout(() => {
      setIsLoading(false);
    }, 28000);

    try {
      const result = await generateHealingMissionRecommendation(uid, cat, conditionInput);
      setCurrentResult(result);
      setHistoryList((prev) => [result, ...prev.filter((p) => (p.id && result.id ? p.id !== result.id : true))]);
    } catch (err: any) {
      console.error('[HealingMissionModal] Error:', err);
      const fallback = getPersonalizedMissionFallback(conditionInput, cat);
      setCurrentResult(fallback);
      setHistoryList((prev) => [fallback, ...prev]);
    } finally {
      clearTimeout(safetyTimer);
      setIsLoading(false);
    }
  };

  const handleToggleComplete = async () => {
    if (!currentResult) return;
    const isNowCompleted = !currentResult.completed;
    setCurrentResult((prev) => prev ? { ...prev, completed: isNowCompleted, completedAt: isNowCompleted ? Date.now() : undefined } : null);
    if (isNowCompleted) {
      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 3000);
    }
    if (currentResult.id) {
      await toggleMissionCompleted(uid, currentResult.id, !isNowCompleted);
    }
    fetchHistory();
  };

  const handleCopy = () => {
    if (!currentResult) return;
    const stepsText = currentResult.actionSteps.map((s, idx) => `${idx + 1}. ${s}`).join('\n');
    const text = `🌿 [AURA 오늘의 힐링미션]\n\n` +
      `✨ ${currentResult.missionTitle}\n` +
      `⏱️ 소요 시간: ${currentResult.durationText}\n` +
      `🎯 목적: ${currentResult.missionSubtitle}\n\n` +
      `[실천 단계]\n${stepsText}\n\n` +
      `💫 오라 효과: ${currentResult.wellnessEffect}\n` +
      `🧘 마인드풀 조언: ${currentResult.mindfulTip}\n` +
      `💖 치유 확언: "${currentResult.affirmation}"\n\n` +
      `#PRISM #AURA #힐링미션`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyHistoryItem = (item: HealingMission, itemId: string) => {
    const stepsText = item.actionSteps.map((s, idx) => `${idx + 1}. ${s}`).join('\n');
    const text = `🌿 [AURA 힐링미션 기록]\n\n` +
      `✨ ${item.missionTitle}\n` +
      `⏱️ 소요 시간: ${item.durationText}\n` +
      `🎯 목적: ${item.missionSubtitle}\n\n` +
      `[실천 단계]\n${stepsText}\n\n` +
      `💫 오라 효과: ${item.wellnessEffect}\n` +
      `🧘 마인드풀 조언: ${item.mindfulTip}\n` +
      `💖 치유 확언: "${item.affirmation}"\n\n` +
      `#PRISM #AURA #힐링미션`;

    navigator.clipboard.writeText(text);
    setCopiedHistoryId(itemId);
    setTimeout(() => setCopiedHistoryId(null), 2000);
  };

  const handleToggleHistoryComplete = async (item: HealingMission) => {
    const isNowCompleted = !item.completed;
    const updatedList = historyList.map((m) => {
      if ((item.id && m.id === item.id) || m.missionTitle === item.missionTitle) {
        return { ...m, completed: isNowCompleted, completedAt: isNowCompleted ? Date.now() : undefined };
      }
      return m;
    });
    setHistoryList(updatedList);
    if (currentResult && ((item.id && currentResult.id === item.id) || currentResult.missionTitle === item.missionTitle)) {
      setCurrentResult((prev) => prev ? { ...prev, completed: isNowCompleted, completedAt: isNowCompleted ? Date.now() : undefined } : null);
    }
    if (item.id) {
      await toggleMissionCompleted(uid, item.id, !isNowCompleted);
    }
  };

  const activeCategoryMeta = MISSION_CATEGORIES.find((c) => c.id === selectedCategory) || MISSION_CATEGORIES[0];

  const PRESET_CONDITIONS = [
    { label: '목·승모근 뭉침', text: '목과 승모근이 뻐근하고 어깨가 결려요' },
    { label: '머리 과부하·잡념', text: '머리가 멍하고 잡념이 많아 뇌를 쉬게 하고 싶어요' },
    { label: '가슴 답답·불안', text: '가슴이 답답하고 호흡이 얕아져 편안한 이완이 필요해요' },
    { label: '화면 피로·눈 시림', text: '스마트폰과 모니터를 오래 봐서 눈과 시신경이 피로해요' },
    { label: '자책·번아웃', text: '스스로를 몰아붙여 지쳤어요. 따뜻한 셀프 케어가 필요해요' },
  ];

  const missionContent = (
    <div className={`glass relative w-full ${isModal ? 'max-w-2xl max-h-[92vh]' : 'max-w-4xl mx-auto my-4'} flex flex-col bg-white/[0.04] sm:bg-white/[0.06] border border-emerald-400/25 rounded-[32px] sm:rounded-[40px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden text-white font-sans backdrop-blur-2xl`}>
      {/* Subtle emerald jade glass glow */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-teal-500/10 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="relative px-6 py-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <CheckCircle2 size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold font-mono tracking-widest text-emerald-400 uppercase">
                HEAL SPECIAL FEATURE
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                힐링미션
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              오늘의 힐링미션 (Healing Mission)
            </h2>
          </div>
        </div>

        {isModal && onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        )}
      </div>

        {/* Navigation Tabs */}
        <div className="px-4 sm:px-6 pt-3 border-b border-white/5 flex gap-2 shrink-0 bg-black/20">
          <button
            onClick={() => setActiveTab('recommend')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'recommend'
                ? 'text-emerald-400 border-emerald-400 bg-white/[0.04]'
                : 'text-white/40 border-transparent hover:text-white/70'
            }`}
          >
            <Sparkles size={13} />
            <span>맞춤 미션 받기</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('history');
              fetchHistory();
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'history'
                ? 'text-emerald-400 border-emerald-400 bg-white/[0.04]'
                : 'text-white/40 border-transparent hover:text-white/70'
            }`}
          >
            <History size={13} />
            <span>미션 보관함</span>
            {historyList.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500/20 text-emerald-300">
                {historyList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'guide'
                ? 'text-emerald-400 border-emerald-400 bg-white/[0.04]'
                : 'text-white/40 border-transparent hover:text-white/70'
            }`}
          >
            <BookOpen size={13} />
            <span>가이드</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 select-text premium-scroll">

          {/* TAB 1: RECOMMEND */}
          {activeTab === 'recommend' && (
            <>
              {/* Category Selector Grid */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <Leaf size={12} /> 미션 카테고리 선택
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {MISSION_CATEGORIES.map((cat) => {
                    const isSel = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                          isSel
                            ? `${cat.borderColor} bg-gradient-to-br ${cat.gradient} shadow-[0_0_20px_rgba(16,185,129,0.15)] scale-[1.02]`
                            : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xl">{cat.emoji}</span>
                          {isSel && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                          )}
                        </div>
                        <div>
                          <div className={`text-xs font-bold ${isSel ? 'text-white' : 'text-white/80'}`}>
                            {cat.label}
                          </div>
                          <div className="text-[10px] text-white/40 leading-tight line-clamp-1 mt-0.5">
                            {cat.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Condition Note Input */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/60 flex items-center gap-1">
                  <Activity size={12} /> 현재 나의 심신 상태 / 피로 증상 (선택)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PRESET_CONDITIONS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setConditionInput(preset.text)}
                      className="px-2.5 py-1 rounded-full text-[11px] bg-white/[0.04] hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/30 text-white/60 hover:text-emerald-200 transition-all"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <textarea
                    value={conditionInput}
                    onChange={(e) => setConditionInput(e.target.value)}
                    placeholder="예: 오늘 종일 앉아 있어서 허리가 뻐근해요, 머리가 복잡해서 3분 동안 가볍게 리셋하고 싶어요..."
                    rows={2}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-white/25 focus:outline-none focus:border-emerald-500/50 resize-none transition-colors"
                  />
                </div>
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={() => handleGenerate()}
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-sm shadow-[0_4px_25px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin text-emerald-200" />
                    <span>AURA가 나만을 위한 힐링미션을 설계하는 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="text-yellow-300" />
                    <span>오늘의 맞춤 힐링미션 받기</span>
                  </>
                )}
              </button>

              {/* Mission Result Card */}
              {currentResult && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 pt-2"
                >
                  <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-950/30 via-[#071311] to-black border border-emerald-500/30 shadow-[0_10px_35px_rgba(16,185,129,0.12)] space-y-4 relative overflow-hidden">

                    {/* Aura glow badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-3xl">{currentResult.emoji}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {currentResult.categoryLabel || activeCategoryMeta.label}
                            </span>
                            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                              <Clock size={10} /> {currentResult.durationText}
                            </span>
                          </div>
                          <h3 className="text-base sm:text-lg font-black text-white tracking-tight mt-1">
                            {currentResult.missionTitle}
                          </h3>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <TTSButton
                          text={`${currentResult.missionTitle}. ${currentResult.missionSubtitle}. ${currentResult.actionSteps.join('. ')}. ${currentResult.wellnessEffect}. 치유 확언: ${currentResult.affirmation}`}
                          voice="Kore"
                        />
                        <button
                          onClick={handleCopy}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all"
                          title="미션 복사하기"
                        >
                          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Mission Subtitle */}
                    <p className="text-xs text-emerald-300/80 font-medium leading-relaxed bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20">
                      🎯 <strong className="text-emerald-200">목적:</strong> {currentResult.missionSubtitle}
                    </p>

                    {/* Step-by-Step Action Guide */}
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
                        <Activity size={13} className="text-emerald-400" /> 단계별 실천 가이드
                      </h4>
                      <div className="space-y-2">
                        {currentResult.actionSteps.map((step, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5"
                          >
                            <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </div>
                            <p className="text-xs text-white/90 leading-relaxed font-sans flex-1">
                              {step}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Wellness Effect & Aura Energy */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <div className="p-3.5 rounded-2xl bg-teal-950/25 border border-teal-500/20 text-left">
                        <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest block mb-1">
                          🌿 생체 치유 효능
                        </span>
                        <p className="text-[11.5px] text-white/80 leading-relaxed">
                          {currentResult.wellnessEffect}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-indigo-950/25 border border-indigo-500/20 text-left">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-1">
                          💫 오라 에너지 조율
                        </span>
                        <p className="text-[11.5px] text-indigo-200 font-semibold mb-1">
                          {currentResult.auraEnergyKeyword}
                        </p>
                        <p className="text-[11px] text-white/60 leading-relaxed">
                          🧘 {currentResult.mindfulTip}
                        </p>
                      </div>
                    </div>

                    {/* Affirmation Banner */}
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-950/20 via-purple-950/20 to-emerald-950/20 border border-pink-500/20 text-center">
                      <span className="text-[10px] font-bold text-pink-300/80 uppercase tracking-widest block mb-0.5">
                        💖 나를 위한 치유 확언
                      </span>
                      <p className="text-xs font-bold text-white font-serif italic">
                        "{currentResult.affirmation}"
                      </p>
                    </div>

                    {/* Mission Complete Interactive Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleToggleComplete}
                        className={`w-full py-3 px-4 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          currentResult.completed
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                            : 'bg-white/5 hover:bg-emerald-600/30 border-white/10 hover:border-emerald-500/40 text-white/80 hover:text-white'
                        }`}
                      >
                        {currentResult.completed ? (
                          <>
                            <CheckCircle2 size={16} className="text-emerald-400" />
                            <span>미션 실천 완료됨 ✨ (다시 클릭 시 취소)</span>
                          </>
                        ) : (
                          <>
                            <Circle size={16} className="text-white/40" />
                            <span>지금 실천하고 미션 완료하기</span>
                          </>
                        )}
                      </button>
                      {justCompleted && (
                        <p className="text-[11px] text-center text-emerald-400 font-bold mt-2 animate-bounce">
                          🎉 멋져요! 오늘의 힐링 에너지가 성공적으로 오라에 충전되었습니다!
                        </p>
                      )}
                    </div>

                  </div>
                </motion.div>
              )}
            </>
          )}

          {/* TAB 2: HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <History size={14} /> 나의 힐링미션 실천 아카이브
                </h3>
                <span className="text-[11px] text-white/40">
                  총 {historyList.length}개의 미션 기록
                </span>
              </div>

              {loadingHistory ? (
                <div className="py-12 flex flex-col items-center justify-center text-white/40 gap-2">
                  <RefreshCw size={20} className="animate-spin text-emerald-400" />
                  <span className="text-xs">미션 기록을 불러오는 중...</span>
                </div>
              ) : historyList.length === 0 ? (
                <div className="py-12 text-center text-white/40 space-y-3 bg-white/[0.02] rounded-3xl border border-white/5 p-6">
                  <CheckCircle2 size={32} className="mx-auto text-white/20" />
                  <p className="text-xs">아직 처방받은 힐링미션 기록이 없습니다.</p>
                  <button
                    onClick={() => setActiveTab('recommend')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-colors cursor-pointer"
                  >
                    첫 힐링미션 받기
                  </button>
                </div>
              ) : (
                historyList.map((item, idx) => {
                  const itemId = item.id || `history-${idx}`;
                  const isExpanded = expandedHistoryId === itemId;

                  return (
                    <div
                      key={itemId}
                      className={`p-4 rounded-2xl border transition-all space-y-3 text-left ${
                        isExpanded
                          ? 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_4px_20px_rgba(16,185,129,0.1)]'
                          : 'bg-white/[0.02] border-white/10 hover:border-emerald-500/30'
                      }`}
                    >
                      <div
                        onClick={() => setExpandedHistoryId(isExpanded ? null : itemId)}
                        className="flex items-center justify-between cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{item.emoji}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-300">
                                {item.categoryLabel || item.category}
                              </span>
                              <span className="text-[10px] text-white/40 flex items-center gap-1">
                                <Clock size={10} /> {item.durationText}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-white mt-0.5">
                              {item.missionTitle}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleToggleHistoryComplete(item)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                              item.completed
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'
                            }`}
                          >
                            {item.completed ? (
                              <>
                                <Check size={11} /> 완료됨
                              </>
                            ) : (
                              '미완료'
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedHistoryId(isExpanded ? null : itemId)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
                            title={isExpanded ? '접기' : '상세 보기'}
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>

                      <p
                        onClick={() => setExpandedHistoryId(isExpanded ? null : itemId)}
                        className={`text-[11px] text-white/60 cursor-pointer ${isExpanded ? '' : 'line-clamp-2'}`}
                      >
                        {item.missionSubtitle}
                      </p>

                      {/* Expanded In-Place Details */}
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-2 border-t border-white/10 space-y-3"
                        >
                          {/* Step-by-Step Action Guide */}
                          {item.actionSteps && item.actionSteps.length > 0 && (
                            <div className="space-y-1.5">
                              <h5 className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                                <Activity size={11} /> 실천 가이드
                              </h5>
                              <div className="space-y-1.5">
                                {item.actionSteps.map((step, sIdx) => (
                                  <div
                                    key={sIdx}
                                    className="flex items-start gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/5 text-[11.5px] text-white/90"
                                  >
                                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                      {sIdx + 1}
                                    </span>
                                    <span className="flex-1">{step}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Wellness Effect & Mindful Tip */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            {item.wellnessEffect && (
                              <div className="p-2.5 rounded-xl bg-teal-950/30 border border-teal-500/20">
                                <span className="text-[9px] font-bold text-teal-400 uppercase tracking-wider block mb-0.5">
                                  🌿 생체 치유 효능
                                </span>
                                <p className="text-white/80 leading-relaxed">{item.wellnessEffect}</p>
                              </div>
                            )}
                            {item.auraEnergyKeyword && (
                              <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20">
                                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block mb-0.5">
                                  💫 {item.auraEnergyKeyword}
                                </span>
                                <p className="text-white/60 leading-relaxed">{item.mindfulTip}</p>
                              </div>
                            )}
                          </div>

                          {/* Affirmation */}
                          {item.affirmation && (
                            <div className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/20 text-center">
                              <p className="text-[11px] font-serif italic text-white/90">
                                "{item.affirmation}"
                              </p>
                            </div>
                          )}

                          {/* Action Bar */}
                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-1.5">
                              <TTSButton
                                text={`${item.missionTitle}. ${item.missionSubtitle}. ${item.actionSteps.join('. ')}. ${item.wellnessEffect}. 치유 확언: ${item.affirmation}`}
                                voice="Kore"
                              />
                              <button
                                type="button"
                                onClick={() => handleCopyHistoryItem(item, itemId)}
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
                                title="미션 복사하기"
                              >
                                {copiedHistoryId === itemId ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleHistoryComplete(item)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all cursor-pointer ${
                                item.completed
                                  ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-transparent'
                              }`}
                            >
                              {item.completed ? (
                                <>
                                  <CheckCircle2 size={13} className="text-emerald-400" />
                                  <span>실천 완료됨</span>
                                </>
                              ) : (
                                <>
                                  <Circle size={13} />
                                  <span>완료 처리하기</span>
                                </>
                              )}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-left text-xs leading-relaxed text-white/80">
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                <h3 className="font-bold text-emerald-300 text-sm flex items-center gap-2">
                  🌿 AURA 힐링미션(Healing Mission)이란?
                </h3>
                <p className="text-white/70">
                  지친 현대인의 뇌와 신경계는 큰 결심이나 무거운 운동보다, **하루 3~5분의 작은 마이크로 리추얼**에서 가장 빠르게 이완되고 회복됩니다.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider text-emerald-400">
                  ✨ 6대 힐링 카테고리
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MISSION_CATEGORIES.map((c) => (
                    <div key={c.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                      <div className="flex items-center gap-2">
                        <span>{c.emoji}</span>
                        <strong className="text-white text-xs">{c.label}</strong>
                      </div>
                      <p className="text-[11px] text-white/50">{c.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-teal-950/20 border border-teal-500/20 space-y-1.5">
                <h4 className="font-bold text-teal-300 text-xs">💡 미션 실천 꿀팁</h4>
                <ul className="list-disc list-inside text-[11px] text-white/70 space-y-1">
                  <li>완벽하게 해내려 하지 마세요. 1단계만 따라 해도 신경계는 안정을 찾습니다.</li>
                  <li>음성 듣기(TTS) 버튼을 누르고 아우라의 목소리를 들으며 천천히 따라 해보세요.</li>
                  <li>실천 후 [미션 완료하기]를 누르면 나만의 힐링 기록으로 영구 보관됩니다.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
    </div>
  );

  if (!isModal) {
    return missionContent;
  }

  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xl animate-fade-in font-sans" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full flex justify-center">
        {missionContent}
      </div>
    </div>
  );
}
