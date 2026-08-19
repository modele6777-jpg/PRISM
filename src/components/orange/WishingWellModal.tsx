import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Waves, X, Send, History, Droplet, Heart, ShieldCheck, Copy, Check, Volume2 } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { TTSButton } from '@/components/TTSButton';
import {
  WISH_CATEGORIES,
  WishCategoryId,
  WishEntry,
  castWishIntoWell,
  loadWishesHistory,
} from '@/lib/wishingWell';

interface WishingWellModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function WishingWellModal({ isOpen, onClose }: WishingWellModalProps) {
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
    if (!auth.currentUser) return;
    setLoadingHistory(true);
    try {
      const list = await loadWishesHistory(auth.currentUser.uid);
      setWishesHistory(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      fetchHistory();
    } else {
      setCurrentResult(null);
      setWishInput('');
    }
  }, [isOpen, fetchHistory]);

  const handleCastWish = async () => {
    if (!wishInput.trim()) {
      setErrorMsg('소원 내용을 적어주세요.');
      return;
    }

    setIsCasting(true);
    setErrorMsg(null);

    try {
      const uid = auth.currentUser?.uid || '';
      const result = await castWishIntoWell(uid, wishInput, selectedCategory);
      setCurrentResult(result);
      setWishInput('');
      fetchHistory();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || '우물과 교감하는 중 오류가 발생했습니다.');
    } finally {
      setIsCasting(false);
    }
  };

  const handleCopyEcho = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      id="wishing-well-modal"
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-zinc-950/95 border border-orange-500/30 rounded-[32px] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-orange-500/15 blur-[90px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-emerald-500/10 blur-[90px] pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500/30 to-amber-500/20 border border-orange-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.3)]">
              <Waves className="w-5 h-5 text-orange-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">소원의 우물</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 uppercase tracking-wider">
                  ORANGE 특수기능
                </span>
              </div>
              <p className="text-xs text-white/50 font-sans">
                마음속 가장 솔직한 소망을 우물에 띄우고 내면 아이의 축복을 만나보세요
              </p>
            </div>
          </div>

          <button
            id="wishing-well-close-btn"
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-1 border-b border-white/5 relative z-10 shrink-0">
          <button
            id="tab-cast-wish"
            onClick={() => setActiveTab('cast')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'cast'
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30 shadow-sm'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <Sparkles size={14} />
            <span>소원 띄우기</span>
          </button>
          <button
            id="tab-wishes-history"
            onClick={() => {
              setActiveTab('history');
              fetchHistory();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30 shadow-sm'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <History size={14} />
            <span>우물의 기억 ({wishesHistory.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="relative z-10 flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {activeTab === 'cast' ? (
            <div className="space-y-6">
              {/* 우물 수면 인터랙션 비주얼 */}
              <div className="relative w-full h-44 sm:h-52 rounded-[28px] bg-gradient-to-b from-[#140b06] via-[#0d1217] to-[#08080c] border border-orange-500/20 flex flex-col items-center justify-center overflow-hidden shadow-inner group">
                {/* Ripple animations */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <motion.div
                    animate={{ scale: [0.8, 1.6, 2.2], opacity: [0.6, 0.25, 0] }}
                    transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: 'easeOut' }}
                    className="w-32 h-32 rounded-full border border-orange-500/30"
                  />
                  <motion.div
                    animate={{ scale: [0.8, 1.6, 2.2], opacity: [0.6, 0.25, 0] }}
                    transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, delay: 1.5, ease: 'easeOut' }}
                    className="w-32 h-32 rounded-full border border-amber-400/20"
                  />
                  <motion.div
                    animate={{ scale: [0.8, 1.6, 2.2], opacity: [0.5, 0.2, 0] }}
                    transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, delay: 3, ease: 'easeOut' }}
                    className="w-32 h-32 rounded-full border border-emerald-400/20"
                  />
                </div>

                {/* Center Soul Gem / Well Heart */}
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <motion.div
                    animate={isCasting ? { scale: [1, 1.4, 0.8], rotate: 360 } : { y: [0, -4, 0] }}
                    transition={isCasting ? { duration: 1.5, repeat: Number.POSITIVE_INFINITY } : { duration: 3, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                    className="w-16 h-16 rounded-full bg-gradient-to-tr from-orange-500 via-amber-400 to-emerald-400 p-[2px] shadow-[0_0_25px_rgba(249,115,22,0.5)] flex items-center justify-center"
                  >
                    <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center">
                      <Droplet className="w-7 h-7 text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                    </div>
                  </motion.div>
                  <p className="text-[11px] font-bold text-orange-300/80 tracking-widest uppercase font-sans">
                    {isCasting ? '소원이 수면 깊은 곳으로 가라앉고 있습니다...' : '진심을 담아 소원을 띄워보세요'}
                  </p>
                </div>
              </div>

              {/* 결과 카드가 있을 경우 표시 */}
              <AnimatePresence>
                {currentResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-orange-950/40 via-zinc-900/60 to-zinc-900/40 border border-orange-500/40 space-y-4 shadow-xl"
                  >
                    <div className="flex items-center justify-between border-b border-orange-500/20 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                          #{currentResult.crystalKeyword}
                        </span>
                        <span className="text-xs text-white/40">{currentResult.categoryLabel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TTSButton
                          text={`${currentResult.echo}. ${currentResult.innerChildGuidance}`}
                          voice="Kore"
                          className="scale-90"
                        />
                        <button
                          onClick={() => handleCopyEcho(currentResult.echo)}
                          className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white transition-colors"
                          title="메아리 복사"
                        >
                          {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-orange-400/80 uppercase tracking-widest mb-1.5">
                        나의 소망
                      </div>
                      <p className="text-sm font-medium text-white/90 italic">"{currentResult.wish}"</p>
                    </div>

                    <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 space-y-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-orange-400 uppercase tracking-wider">
                        <Sparkles size={13} />
                        <span>우물의 메아리 (Well's Echo)</span>
                      </div>
                      <p className="text-sm text-white/90 leading-relaxed font-sans break-keep">
                        {currentResult.echo}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5">
                      <Heart size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[11px] font-bold text-emerald-400 tracking-wider">내면 아이를 위한 실천 처방</div>
                        <p className="text-xs text-white/80 mt-0.5 leading-relaxed">
                          {currentResult.innerChildGuidance}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 카테고리 선택 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/60 tracking-wider flex items-center gap-1.5">
                  <span>소원 영역 선택</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {WISH_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`p-3 rounded-2xl text-left border transition-all flex items-center gap-2.5 ${
                          isSelected
                            ? 'bg-orange-500/20 border-orange-500/60 shadow-[0_0_12px_rgba(249,115,22,0.2)] text-white'
                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span className="text-lg">{cat.emoji}</span>
                        <div className="text-xs font-bold tracking-tight">{cat.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 소원 입력창 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/60 tracking-wider flex items-center justify-between">
                  <span>우물에 띄울 소원 작성</span>
                  <span className="text-[10px] text-white/40">{wishInput.length}/200자</span>
                </label>
                <textarea
                  id="wishing-well-textarea"
                  value={wishInput}
                  onChange={(e) => setWishInput(e.target.value.slice(0, 200))}
                  placeholder="예: 지친 마음을 탓하지 않고 스스로를 따뜻하게 안아줄 수 있는 여유가 생기길 바랍니다..."
                  rows={3}
                  className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-orange-500/60 focus:bg-white/10 transition-all resize-none leading-relaxed"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {errorMsg}
                </div>
              )}

              {/* 제출 버튼 */}
              <button
                id="wishing-well-submit-btn"
                type="button"
                disabled={isCasting || !wishInput.trim()}
                onClick={handleCastWish}
                className="w-full py-4 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
              >
                {isCasting ? (
                  <>
                    <Waves className="w-4 h-4 animate-spin text-white" />
                    <span>소원의 메아리를 듣는 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-white" />
                    <span>우물에 소원 띄우기 (Cast Wish)</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* 소원의 기억 (히스토리 탭) */
            <div className="space-y-4">
              {loadingHistory ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-white/40 text-xs">
                  <Waves className="w-6 h-6 animate-pulse text-orange-400" />
                  <span>우물에 담긴 기억들을 불러오고 있습니다...</span>
                </div>
              ) : wishesHistory.length === 0 ? (
                <div className="py-16 text-center text-white/40 space-y-2">
                  <Droplet className="w-8 h-8 mx-auto text-white/20 mb-2" />
                  <p className="text-sm font-medium">아직 우물에 띄운 소원이 없습니다.</p>
                  <p className="text-xs text-white/30">첫 번째 소원을 적고 내면 아이와 따뜻하게 교감해보세요.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {wishesHistory.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-orange-500/30 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/20">
                            #{item.crystalKeyword}
                          </span>
                          <span className="text-xs text-white/50">{item.categoryLabel}</span>
                        </div>
                        <TTSButton
                          text={`${item.echo}. ${item.innerChildGuidance}`}
                          voice="Kore"
                          className="scale-90"
                        />
                      </div>

                      <div>
                        <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">
                          나의 소망
                        </div>
                        <p className="text-sm font-medium text-white/90">"{item.wish}"</p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-orange-500/5 border border-orange-500/15 space-y-1.5">
                        <div className="text-[10px] font-bold text-orange-400 flex items-center gap-1">
                          <Sparkles size={11} />
                          <span>우물의 메아리</span>
                        </div>
                        <p className="text-xs text-white/80 leading-relaxed font-sans">{item.echo}</p>
                      </div>

                      {item.innerChildGuidance && (
                        <div className="flex items-center gap-2 text-xs text-emerald-400/90 font-sans">
                          <Heart size={12} className="shrink-0" />
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
      </motion.div>
    </div>
  );
}
