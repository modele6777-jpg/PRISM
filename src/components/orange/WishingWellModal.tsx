import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Waves, X, Send, History, Droplet, Heart, Copy, Check, Volume2, Compass, ShieldCheck } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { TTSButton } from '@/components/TTSButton';
import {
  WISH_CATEGORIES,
  WishCategoryId,
  WishEntry,
  castWishIntoWell,
  loadWishesHistory,
  deduplicateWishes,
} from '@/lib/wishingWell';

interface WishingWellModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  isModal?: boolean;
}

export function WishingWellModal({ isOpen = true, onClose, isModal = true }: WishingWellModalProps) {
  const [activeTab, setActiveTab] = useState<'cast' | 'history'>('cast');
  const [selectedCategory, setSelectedCategory] = useState<WishCategoryId>('self_love');
  const [wishInput, setWishInput] = useState('');
  const [isCasting, setIsCasting] = useState(false);
  const [currentResult, setCurrentResult] = useState<WishEntry | null>(null);
  const [wishesHistory, setWishesHistory] = useState<WishEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    const uid = auth.currentUser?.uid || 'guest';
    setLoadingHistory(true);
    try {
      const list = await loadWishesHistory(uid);
      setWishesHistory(list);
    } catch (e) {
      console.error("[WishingWellModal] Failed to fetch history:", e);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen || !isModal) {
      setErrorMsg(null);
      fetchHistory();
    } else {
      setCurrentResult(null);
      setWishInput('');
    }
  }, [isOpen, isModal, fetchHistory]);

  const selectedCategoryMeta = WISH_CATEGORIES.find((c) => c.id === selectedCategory) || WISH_CATEGORIES[0];

  const handleCastWish = async () => {
    setIsCasting(true);
    setErrorMsg(null);

    const safetyTimer = setTimeout(() => {
      setIsCasting(false);
    }, 9000);

    try {
      const uid = auth.currentUser?.uid || 'guest';
      const effectiveWish = wishInput.trim() || selectedCategoryMeta.defaultWish || '내면의 평화와 안식을 찾길 소망합니다.';
      const result = await castWishIntoWell(uid, effectiveWish, selectedCategory);
      setCurrentResult(result);
      setWishInput('');
      setWishesHistory((prev) => deduplicateWishes([result, ...prev]));
    } catch (err: any) {
      console.error("[WishingWellModal] Error casting wish:", err);
      setErrorMsg(err?.message || '우물과 교감하는 중 오류가 발생했습니다.');
    } finally {
      clearTimeout(safetyTimer);
      setIsCasting(false);
    }
  };

  const handleCopyEcho = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (isOpen !== undefined && !isOpen && isModal) return null;

  const wellContent = (
    <div
      className={`relative w-full ${
        isModal
          ? 'max-w-2xl bg-[#090a12]/90 sm:bg-[#0c0d16]/92 max-h-[90vh]'
          : 'max-w-4xl mx-auto bg-[#090a12]/85 sm:bg-[#0c0d16]/90 my-4'
      } border border-amber-400/20 rounded-[32px] sm:rounded-[40px] shadow-[0_30px_90px_-20px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.18)] overflow-hidden flex flex-col backdrop-blur-3xl font-sans`}
    >
      {/* Dynamic Ambient Glass Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-gradient-to-b from-amber-500/15 via-orange-500/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-gradient-to-tr from-amber-600/10 via-yellow-500/5 to-transparent blur-[100px] pointer-events-none" />
      
      {/* Top Accent Light Ribbon */}
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-amber-400/50 via-orange-400/40 to-transparent shrink-0" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 sm:px-8 py-5 border-b border-white/[0.08] shrink-0 bg-white/[0.02]">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-white/5 border border-amber-400/30 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)] shrink-0">
            <Waves className="w-5 h-5 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                소원의 우물
                <span className="text-[11px] font-medium text-amber-300/80 font-serif italic">Wishing Well</span>
              </h2>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-300 border border-amber-400/30 uppercase tracking-widest font-mono">
                ORANGE
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-white/50 font-sans mt-0.5">
              마음 깊은 곳의 진실한 소망을 띄우고 우물의 신비로운 메아리를 만나보세요
            </p>
          </div>
        </div>

        {isModal && onClose && (
          <button
            id="wishing-well-close-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white transition-all flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
            title="닫기"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav Tabs */}
      <div className="flex items-center gap-2 px-6 sm:px-8 pt-3.5 pb-2 border-b border-white/[0.06] relative z-10 shrink-0 bg-black/20">
        <button
          id="tab-cast-wish"
          onClick={() => setActiveTab('cast')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'cast'
              ? 'bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/10 text-amber-200 border border-amber-400/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
              : 'text-white/40 hover:text-white/80 hover:bg-white/[0.03]'
          }`}
        >
          <Sparkles size={13} className={activeTab === 'cast' ? 'text-amber-400 animate-pulse' : ''} />
          <span>소원 띄우기</span>
        </button>
        <button
          id="tab-wishes-history"
          onClick={() => {
            setActiveTab('history');
            fetchHistory();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/10 text-amber-200 border border-amber-400/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
              : 'text-white/40 hover:text-white/80 hover:bg-white/[0.03]'
          }`}
        >
          <History size={13} className={activeTab === 'history' ? 'text-amber-400' : ''} />
          <span>우물의 기억</span>
          {wishesHistory.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 font-mono">
              {wishesHistory.length}
            </span>
          )}
        </button>
      </div>

      {/* Modal Body */}
      <div className="relative z-10 flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
        {activeTab === 'cast' ? (
          <div className="space-y-6">
            {/* Ethereal Wishing Pond Water Visual */}
            <div className="relative w-full h-44 sm:h-52 rounded-[28px] bg-gradient-to-b from-amber-500/[0.07] via-black/40 to-black/60 border border-amber-500/25 flex flex-col items-center justify-center overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_15px_35px_rgba(0,0,0,0.5)] backdrop-blur-2xl group">
              {/* Concentric Caustic Ripples */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div
                  animate={{ scale: [0.7, 1.5, 2.3], opacity: [0.5, 0.2, 0] }}
                  transition={{ duration: 4.5, repeat: Number.POSITIVE_INFINITY, ease: 'easeOut' }}
                  className="w-36 h-36 rounded-full border border-amber-400/30"
                />
                <motion.div
                  animate={{ scale: [0.7, 1.5, 2.3], opacity: [0.5, 0.2, 0] }}
                  transition={{ duration: 4.5, repeat: Number.POSITIVE_INFINITY, delay: 1.5, ease: 'easeOut' }}
                  className="w-36 h-36 rounded-full border border-orange-400/25"
                />
                <motion.div
                  animate={{ scale: [0.7, 1.5, 2.3], opacity: [0.4, 0.15, 0] }}
                  transition={{ duration: 4.5, repeat: Number.POSITIVE_INFINITY, delay: 3, ease: 'easeOut' }}
                  className="w-36 h-36 rounded-full border border-yellow-300/20"
                />
              </div>

              {/* Water Surface Glow Floor */}
              <div className="absolute inset-0 bg-radial from-amber-500/10 via-transparent to-transparent opacity-70 pointer-events-none" />

              {/* Center Soul Gem / Well Heart */}
              <div className="relative z-10 flex flex-col items-center gap-3 text-center px-4">
                <motion.div
                  animate={isCasting ? { scale: [1, 1.3, 0.85], rotate: 360 } : { y: [0, -5, 0] }}
                  transition={isCasting ? { duration: 1.5, repeat: Number.POSITIVE_INFINITY } : { duration: 3.5, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                  className="w-15 h-15 rounded-full bg-gradient-to-tr from-amber-500 via-orange-400 to-yellow-300 p-[2px] shadow-[0_0_30px_rgba(245,158,11,0.45)] flex items-center justify-center cursor-default"
                >
                  <div className="w-full h-full rounded-full bg-[#0a0b12] flex items-center justify-center shadow-inner">
                    <Droplet className="w-6 h-6 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
                  </div>
                </motion.div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-amber-200/90 tracking-wider font-sans">
                    {isCasting ? '소원이 수면 깊은 곳으로 가라앉고 있습니다...' : '고요한 수면에 진심을 담아 소원을 띄워보세요'}
                  </p>
                  <p className="text-[10px] text-white/40 font-mono">
                    {isCasting ? '우물이 당신의 마음에 화답하는 중' : 'Ask · Believe · Receive'}
                  </p>
                </div>
              </div>
            </div>

            {/* Result Echo Card */}
            <AnimatePresence>
              {currentResult && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-6 sm:p-7 rounded-[28px] bg-gradient-to-br from-amber-950/40 via-[#0e101c]/90 to-orange-950/30 border border-amber-400/35 space-y-5 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.15)] relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-60 h-60 bg-amber-500/10 rounded-full blur-[70px] pointer-events-none" />

                  {/* Result Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-3.5 relative z-10">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 shadow-xs">
                        #{currentResult.crystalKeyword}
                      </span>
                      <span className="text-xs text-white/50 font-medium">{currentResult.categoryLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TTSButton
                        text={`${currentResult.echo}. ${currentResult.innerChildGuidance}`}
                        voice="Kore"
                        className="scale-90 text-amber-300 border-amber-500/20"
                      />
                      <button
                        onClick={() => handleCopyEcho(currentResult.echo)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
                        title="메아리 복사"
                      >
                        {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* My Wish */}
                  <div className="relative z-10">
                    <div className="text-[10px] font-black text-amber-400/70 uppercase tracking-[0.2em] mb-1 font-mono">
                      MY WISH · 나의 소망
                    </div>
                    <p className="text-sm sm:text-base font-serif text-white/95 leading-relaxed italic">
                      &ldquo;{currentResult.wish}&rdquo;
                    </p>
                  </div>

                  {/* Well Echo */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/[0.08] border border-amber-400/20 space-y-2 relative z-10 shadow-inner">
                    <div className="flex items-center gap-1.5 text-[11px] font-black text-amber-300 uppercase tracking-widest font-mono">
                      <Sparkles size={13} className="text-amber-400 animate-pulse" />
                      <span>우물의 메아리 · Well's Echo</span>
                    </div>
                    <p className="text-sm text-white/90 leading-relaxed font-sans break-keep font-medium">
                      {currentResult.echo}
                    </p>
                  </div>

                  {/* Inner Child Prescription */}
                  <div className="p-4 rounded-2xl bg-emerald-500/[0.07] border border-emerald-500/20 flex items-start gap-3 relative z-10">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Heart size={15} className="text-emerald-400" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-[11px] font-bold text-emerald-300 tracking-wider">
                        내면 아이를 위한 실천 처방
                      </div>
                      <p className="text-xs text-white/80 leading-relaxed font-sans">
                        {currentResult.innerChildGuidance}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Category Selection */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-white/70 tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Compass size={13} className="text-amber-400" />
                  소원 영역 선택
                </span>
                <span className="text-[10px] text-white/40 font-mono">카테고리별 맞춤 주파수</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {WISH_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`p-3 sm:p-3.5 rounded-2xl text-left border transition-all flex items-center gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.2)] text-white ring-1 ring-amber-400/30'
                          : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      <span className="text-xl drop-shadow-sm shrink-0">{cat.emoji}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold tracking-tight truncate">{cat.label}</div>
                        <div className="text-[10px] text-white/40 truncate font-sans">
                          {cat.id === 'self_love' ? '자존감 & 셀프러브' : cat.id === 'inner_peace' ? '마음의 평온' : cat.id === 'courage' ? '도전과 용기' : cat.id === 'relationship' ? '연결과 화해' : '꿈과 비전'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Wish Input Area */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-white/70 tracking-wider flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-400" />
                  <span>소원 작성</span>
                  <span className="text-[10px] text-amber-400/80 font-normal font-sans">(선택 사항)</span>
                </div>
                <span className="text-[10px] font-mono text-white/40">{wishInput.length}/200자</span>
              </label>
              <textarea
                id="wishing-well-textarea"
                value={wishInput}
                onChange={(e) => setWishInput(e.target.value.slice(0, 200))}
                placeholder={`소원을 직접 적으셔도 좋고, 비워두시면 '${selectedCategoryMeta.label}'의 기본 소망으로 우물이 따뜻하게 응답합니다...`}
                rows={3}
                className="w-full p-4 rounded-2xl bg-black/40 border border-white/12 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-amber-400/60 focus:bg-black/60 transition-all resize-none leading-relaxed shadow-inner"
              />
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                {errorMsg}
              </div>
            )}

            {/* Submit Button */}
            <button
              id="wishing-well-submit-btn"
              type="button"
              disabled={isCasting}
              onClick={handleCastWish}
              className="w-full py-4 sm:py-4.5 rounded-2xl font-black text-sm sm:text-base text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none transition-all shadow-[0_10px_30px_rgba(245,158,11,0.35)] flex items-center justify-center gap-2.5 cursor-pointer tracking-wide"
            >
              {isCasting ? (
                <>
                  <Waves className="w-5 h-5 animate-spin text-slate-950" />
                  <span>소원의 메아리를 듣는 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-slate-950" />
                  <span>
                    {wishInput.trim()
                      ? "우물에 소원 띄우기 (Cast Wish)"
                      : `${selectedCategoryMeta.emoji} [${selectedCategoryMeta.label}] 소원 띄우기`}
                  </span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* 소원의 기억 (히스토리 탭) */
          <div className="space-y-4">
            {loadingHistory ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-white/40 text-xs font-sans">
                <Waves className="w-7 h-7 animate-pulse text-amber-400" />
                <span>우물에 담긴 기억들을 불러오고 있습니다...</span>
              </div>
            ) : wishesHistory.length === 0 ? (
              <div className="py-20 text-center text-white/40 space-y-3">
                <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-amber-400/40">
                  <Droplet className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-white/70">아직 우물에 띄운 소원이 없습니다.</p>
                <p className="text-xs text-white/40 font-sans">첫 번째 소원을 적고 내면 아이와 따뜻하게 교감해보세요.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {wishesHistory.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-5 sm:p-6 rounded-[24px] bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/10 hover:border-amber-400/30 transition-all space-y-3.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/20">
                          #{item.crystalKeyword}
                        </span>
                        <span className="text-xs text-white/50">{item.categoryLabel}</span>
                      </div>
                      <TTSButton
                        text={`${item.echo}. ${item.innerChildGuidance}`}
                        voice="Kore"
                        className="scale-90 text-amber-300 border-amber-500/20"
                      />
                    </div>

                    <div>
                      <div className="text-[10px] font-black text-amber-400/70 uppercase tracking-[0.2em] mb-1 font-mono">
                        나의 소망
                      </div>
                      <p className="text-sm font-medium text-white/90 font-serif italic">&ldquo;{item.wish}&rdquo;</p>
                    </div>

                    <div className="p-4 rounded-xl bg-amber-500/[0.06] border border-amber-400/15 space-y-1.5">
                      <div className="text-[10px] font-black text-amber-300 uppercase tracking-wider flex items-center gap-1 font-mono">
                        <Sparkles size={11} className="text-amber-400" />
                        <span>우물의 메아리</span>
                      </div>
                      <p className="text-xs sm:text-sm text-white/85 leading-relaxed font-sans">{item.echo}</p>
                    </div>

                    {item.innerChildGuidance && (
                      <div className="flex items-start gap-2 text-xs text-emerald-300/90 font-sans pt-1">
                        <Heart size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                        <span>{item.innerChildGuidance}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (!isModal) {
    return wellContent;
  }

  return (
    <div
      id="wishing-well-modal"
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xl overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full flex justify-center"
      >
        {wellContent}
      </motion.div>
    </div>
  );
}
