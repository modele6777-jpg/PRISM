import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { Volume2, VolumeX, Sparkles, BookOpen } from 'lucide-react';
import { 
  rebibleRecitationService, 
  ReBibleRecitationState,
  CANONICAL_BOOKS_ORDER
} from '@/services/rebibleRecitationService';

export const GlobalReBibleAudioWidget: React.FC = () => {
  const [location, navigate] = useLocation();
  const [recitationState, setRecitationState] = useState<ReBibleRecitationState>(() =>
    rebibleRecitationService.getState()
  );

  useEffect(() => {
    return rebibleRecitationService.subscribe((state) => {
      setRecitationState(state);
    });
  }, []);

  // When recitation is not speaking or active, render nothing
  if (!recitationState.isSpeaking) {
    return null;
  }

  const isStandaloneChat = location.startsWith('/chat') || location.startsWith('/lucy');
  const isReBiblePage = location.startsWith('/handbook') || location.startsWith('/rebible');
  
  // Position above bottom nav when bottom nav is present
  const bottomOffsetClass = isStandaloneChat 
    ? "bottom-4 md:bottom-6" 
    : isReBiblePage
      ? "bottom-5 md:bottom-6"
      : "bottom-20 md:bottom-6";

  const currentBookMeta = CANONICAL_BOOKS_ORDER[recitationState.currentBookTitle] || {
    icon: '📖',
    subtitle: '삶의 서사 집대성'
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    rebibleRecitationService.stopRecitation();
  };

  const handleNavigateToReBible = () => {
    if (!isReBiblePage) {
      navigate('/rebible');
    }
  };

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 25, scale: 0.95 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        aria-label="리바이블 성서 연속 낭독 플레이어"
        className={`fixed ${bottomOffsetClass} left-1/2 -translate-x-1/2 z-[90] max-w-lg w-[calc(100vw-28px)] md:w-full select-none`}
      >
        <div 
          onClick={handleNavigateToReBible}
          className="relative overflow-hidden rounded-3xl border-2 border-amber-500/60 bg-[#3D2614]/95 text-[#FAF5EB] p-3 sm:p-3.5 shadow-[0_16px_45px_rgba(0,0,0,0.65)] backdrop-blur-xl transition-all cursor-pointer hover:border-amber-400 group"
        >
          {/* Top golden glowing accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-300 to-amber-600 animate-pulse" />

          <div className="flex items-center justify-between gap-3">
            {/* Left Icon & Progress info */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-white flex items-center justify-center animate-pulse shrink-0 shadow-md">
                <span className="text-base leading-none">{currentBookMeta.icon}</span>
              </div>

              <div className="truncate">
                <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles size={11} className="fill-amber-300 shrink-0" />
                  <span className="truncate">
                    성서 낭독 ({recitationState.currentIndex}/{recitationState.totalCount})
                  </span>
                  <span className="text-[10px] text-stone-300 font-normal shrink-0">
                    • {recitationState.currentBookTitle}
                  </span>
                </div>
                <p className="text-xs font-serif font-bold text-white truncate">
                  {recitationState.currentVerseRef} 《{recitationState.currentVerseTitle}》
                </p>
              </div>
            </div>

            {/* Right: Stop & Re:Bible View Button */}
            <div className="flex items-center gap-1.5 shrink-0">
              {!isReBiblePage && (
                <button
                  type="button"
                  onClick={handleNavigateToReBible}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 text-[11px] font-bold hidden sm:flex items-center gap-1 transition cursor-pointer"
                  title="경전 화면으로 이동"
                >
                  <BookOpen size={12} />
                  <span>경전보기</span>
                </button>
              )}
              
              <button
                type="button"
                onClick={handleStop}
                className="px-3 py-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition active:scale-95 flex items-center gap-1.5 shadow-md cursor-pointer border border-amber-400/40"
                title="낭독 중지"
              >
                <VolumeX size={14} />
                <span>중지</span>
              </button>
            </div>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};
