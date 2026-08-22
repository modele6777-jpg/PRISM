import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, BookOpen, Bookmark, ChevronRight } from 'lucide-react';

export type BookAppTheme = 'bluebird' | 'orange' | 'trinity' | 'heal' | 'muse';

export interface BookChapterTab {
  id: string;
  romanNumeral: string;
  title: string;
  shortLabel: string;
  icon?: React.ReactNode;
}

export interface RealBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: BookAppTheme;
  bookTitle: string;
  bookSubtitle: string;
  bookAuthor?: string;
  epigraphQuote?: string;
  epigraphSource?: string;
  chapterTabs: BookChapterTab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  leftPageHeaderExtra?: React.ReactNode;
  leftPageContent?: React.ReactNode;
  children: React.ReactNode;
  footerPageNumber?: string;
}

interface ThemeBookStyle {
  leatherCover: string;
  leatherBorder: string;
  accentColor: string;
  accentText: string;
  accentBadge: string;
  accentGlow: string;
  goldBorder: string;
  ribbonColor: string;
  parchmentBg: string;
  parchmentInnerBorder: string;
  sealEmoji: string;
  latinMotto: string;
  crestLabel: string;
}

const THEME_STYLES: Record<BookAppTheme, ThemeBookStyle> = {
  bluebird: {
    leatherCover: 'from-[#07131e] via-[#0b1c2b] to-[#040a10]',
    leatherBorder: 'border-sky-500/40',
    accentColor: '#38bdf8',
    accentText: 'text-sky-400',
    accentBadge: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
    accentGlow: 'rgba(56, 189, 248, 0.25)',
    goldBorder: 'border-sky-400/30',
    ribbonColor: 'bg-gradient-to-b from-sky-400 via-blue-500 to-sky-600 shadow-sky-500/40',
    parchmentBg: 'from-[#091522]/95 via-[#0c1a29]/95 to-[#060f18]/95',
    parchmentInnerBorder: 'border-sky-500/20',
    sealEmoji: '🕊️',
    latinMotto: 'Pax Omnis "Ego" · 모든 평화는 나로부터',
    crestLabel: 'HOʻOPONOPONO SACRED CODEX',
  },
  orange: {
    leatherCover: 'from-[#1a0e05] via-[#261508] to-[#0d0702]',
    leatherBorder: 'border-amber-500/40',
    accentColor: '#f59e0b',
    accentText: 'text-amber-400',
    accentBadge: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
    accentGlow: 'rgba(245, 158, 11, 0.25)',
    goldBorder: 'border-amber-400/30',
    ribbonColor: 'bg-gradient-to-b from-amber-400 via-orange-500 to-amber-600 shadow-amber-500/40',
    parchmentBg: 'from-[#1c1106]/95 via-[#231509]/95 to-[#120a03]/95',
    parchmentInnerBorder: 'border-amber-500/20',
    sealEmoji: '✨',
    latinMotto: 'Quod Intus, Sic Extra · 내면이 그러하듯 외부도 그러하다',
    crestLabel: 'THE SECRET GOLDEN MANUSCRIPT',
  },
  trinity: {
    leatherCover: 'from-[#110f08] via-[#1a170a] to-[#080703]',
    leatherBorder: 'border-yellow-500/40',
    accentColor: '#eab308',
    accentText: 'text-yellow-400',
    accentBadge: 'bg-yellow-500/15 text-yellow-300 border-yellow-400/30',
    accentGlow: 'rgba(234, 179, 8, 0.25)',
    goldBorder: 'border-yellow-400/30',
    ribbonColor: 'bg-gradient-to-b from-yellow-300 via-amber-500 to-yellow-600 shadow-yellow-500/40',
    parchmentBg: 'from-[#141208]/95 via-[#1c190c]/95 to-[#0b0a04]/95',
    parchmentInnerBorder: 'border-yellow-500/20',
    sealEmoji: '👑',
    latinMotto: 'Lux In Tenebris Lucet · 어둠 속에 신성의 빛이 비치나니',
    crestLabel: 'A COURSE IN MIRACLES CODEX',
  },
  heal: {
    leatherCover: 'from-[#05140d] via-[#091f14] to-[#020a06]',
    leatherBorder: 'border-emerald-500/40',
    accentColor: '#10b981',
    accentText: 'text-emerald-400',
    accentBadge: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
    accentGlow: 'rgba(16, 185, 129, 0.25)',
    goldBorder: 'border-emerald-400/30',
    ribbonColor: 'bg-gradient-to-b from-emerald-400 via-teal-500 to-emerald-600 shadow-emerald-500/40',
    parchmentBg: 'from-[#07170f]/95 via-[#0c2217]/95 to-[#040e09]/95',
    parchmentInnerBorder: 'border-emerald-500/20',
    sealEmoji: '🌿',
    latinMotto: 'Dimitte Et Liberare · 집착을 놓아주고 온전히 해방되라',
    crestLabel: 'SEDONA & LETTING GO GRIMOIRE',
  },
  muse: {
    leatherCover: 'from-[#12081c] via-[#1c0d2b] to-[#09030e]',
    leatherBorder: 'border-purple-500/40',
    accentColor: '#a855f7',
    accentText: 'text-purple-400',
    accentBadge: 'bg-purple-500/15 text-purple-300 border-purple-400/30',
    accentGlow: 'rgba(168, 85, 247, 0.25)',
    goldBorder: 'border-purple-400/30',
    ribbonColor: 'bg-gradient-to-b from-fuchsia-400 via-purple-500 to-indigo-600 shadow-purple-500/40',
    parchmentBg: 'from-[#150a22]/95 via-[#1e0f2f]/95 to-[#0d0515]/95',
    parchmentInnerBorder: 'border-purple-500/20',
    sealEmoji: '🎨',
    latinMotto: 'Creatio Ex Animo · 영혼에서 솟아나는 무한한 창조성',
    crestLabel: 'THE ARTIST\'S WAY TOME',
  },
};

export function RealBookModal({
  isOpen,
  onClose,
  theme,
  bookTitle,
  bookSubtitle,
  bookAuthor,
  epigraphQuote,
  epigraphSource,
  chapterTabs,
  activeTabId,
  onTabChange,
  leftPageHeaderExtra,
  leftPageContent,
  children,
  footerPageNumber = '- Page Ⅰ -',
}: RealBookModalProps) {
  if (!isOpen) return null;

  const style = THEME_STYLES[theme] || THEME_STYLES.bluebird;
  const currentTabIndex = chapterTabs.findIndex((t) => t.id === activeTabId);
  const currentTab = chapterTabs[currentTabIndex >= 0 ? currentTabIndex : 0];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto"
        onClick={onClose}
      >
        {/* Book Open Animation Wrapper */}
        <motion.div
          initial={{ scale: 0.9, rotateX: 10, y: 30, opacity: 0 }}
          animate={{ scale: 1, rotateX: 0, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, rotateX: 10, y: 30, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 85, damping: 18 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-6xl max-h-[94vh] flex flex-col my-auto select-text font-serif"
          style={{ perspective: '1600px' }}
        >
          {/* Hanging Satin Ribbon Bookmark 🔖 */}
          <div className="absolute -top-3 right-16 sm:right-28 z-40 flex flex-col items-center pointer-events-none drop-shadow-xl animate-pulse">
            <div className={`w-5 sm:w-6 h-12 sm:h-16 ${style.ribbonColor} rounded-b-md shadow-2xl relative`}>
              <div className="absolute inset-x-0 bottom-0 h-3 border-b-2 border-amber-300/80" />
            </div>
            {/* Ribbon V-Cut point */}
            <div className="w-0 h-0 border-l-[10px] sm:border-l-[12px] border-l-transparent border-r-[10px] sm:border-r-[12px] border-r-transparent border-t-[8px] sm:border-t-[10px] border-t-amber-400" />
          </div>

          {/* Hardcover Leather Spine & Outer Frame Container */}
          <div
            className={`relative w-full rounded-[28px] sm:rounded-[40px] p-2 sm:p-3.5 md:p-5 bg-gradient-to-b ${style.leatherCover} border-2 ${style.leatherBorder} shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_50px_${style.accentGlow}] flex flex-col overflow-hidden`}
          >
            {/* Outer Leather Grain & Vintage Gold Leaf Corner Brackets */}
            <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-amber-400/60 rounded-tl-xl pointer-events-none" />
            <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-amber-400/60 rounded-tr-xl pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-amber-400/60 rounded-bl-xl pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-amber-400/60 rounded-br-xl pointer-events-none" />

            {/* Embossed Book Top Header Bar with Chapter Ribbon Tabs */}
            <div className="relative z-30 flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 border-b border-white/10 shrink-0">
              {/* Left Title Crest */}
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-base sm:text-xl shadow-[0_0_15px_rgba(245,158,11,0.2)] shrink-0">
                  {style.sealEmoji}
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-[0.25em] text-amber-300/80 uppercase block truncate">
                    {style.crestLabel}
                  </span>
                  <h2 className="text-sm sm:text-base md:text-lg font-bold text-white tracking-tight truncate">
                    {bookTitle}
                  </h2>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 sm:p-2.5 rounded-full bg-white/5 hover:bg-white/15 text-white/50 hover:text-white border border-white/10 transition-all cursor-pointer shadow-lg shrink-0"
                title="책 덮기 (닫기)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Chapter Bookmark Ribbon Tabs (Roman Numerals Ⅰ, Ⅱ, Ⅲ, Ⅳ) */}
            <div className="relative z-20 px-2 sm:px-6 pt-2 sm:pt-3 pb-1 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar border-b border-white/5 bg-black/30 shrink-0">
              {chapterTabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-t-xl sm:rounded-t-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer border-t-2 border-x ${
                      isActive
                        ? `${style.parchmentInnerBorder} bg-white/[0.08] ${style.accentText} border-t-amber-400 shadow-[0_-4px_15px_rgba(0,0,0,0.5)]`
                        : 'border-transparent text-white/40 hover:text-white/70 hover:bg-white/[0.02]'
                    }`}
                  >
                    <span className="font-mono text-[10px] sm:text-xs text-amber-400/90 font-bold">
                      {tab.romanNumeral}
                    </span>
                    <span className="font-sans font-semibold text-xs sm:text-sm">
                      {tab.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Open Book Spread (Dual Pages on Desktop / Seamless Single Page on Mobile) */}
            <div
              className={`relative z-10 flex-1 min-h-[460px] md:min-h-[580px] max-h-[76vh] rounded-[20px] sm:rounded-[28px] bg-gradient-to-r ${style.parchmentBg} border ${style.parchmentInnerBorder} shadow-inner flex flex-col md:flex-row overflow-hidden`}
            >
              {/* Central Spine Shadow & Crease Gradient (책 중앙 바인딩 골드 섀도우) */}
              <div className="hidden md:block absolute inset-y-0 left-1/2 -translate-x-1/2 w-12 bg-gradient-to-r from-transparent via-black/70 to-transparent pointer-events-none z-20" />
              <div className="hidden md:block absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-amber-500/20 pointer-events-none z-20" />

              {/* LEFT PAGE (서문, 목차, 라틴어 격언, 핵심 요약) */}
              <div className="hidden md:flex md:w-5/12 flex-col justify-between p-6 lg:p-8 border-r border-white/5 relative z-10 overflow-y-auto no-scrollbar bg-black/20">
                {/* Left Page Top: Gilded Book Title & Crest */}
                <div className="space-y-6">
                  <div className="text-center space-y-3 pb-4 border-b border-white/10">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-b from-amber-400/20 to-transparent border border-amber-400/40 text-2xl shadow-[0_0_25px_rgba(245,158,11,0.2)]">
                      {style.sealEmoji}
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-white tracking-tight">
                        {bookTitle}
                      </h3>
                      <p className="text-xs text-white/50 font-sans mt-1">
                        {bookSubtitle}
                      </p>
                      {bookAuthor && (
                        <p className="text-[10px] font-mono text-amber-400/80 mt-1 uppercase tracking-wider">
                          Author · {bookAuthor}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Epigraph Quote Card */}
                  {epigraphQuote && (
                    <div className="p-4 rounded-2xl bg-amber-500/[0.03] border border-amber-500/20 space-y-2 relative overflow-hidden">
                      <div className="text-amber-400/40 text-2xl font-serif leading-none">“</div>
                      <p className="text-xs text-amber-100/90 italic leading-relaxed font-serif pl-2">
                        {epigraphQuote}
                      </p>
                      {epigraphSource && (
                        <p className="text-[10px] text-amber-400/70 text-right font-sans">
                          — {epigraphSource}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Left Page Extra Custom Content or Chapter Summary */}
                  {leftPageContent ? (
                    <div className="space-y-3 font-sans text-xs">
                      {leftPageContent}
                    </div>
                  ) : (
                    /* Default Chapter Table of Contents */
                    <div className="space-y-2.5 font-sans">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 block">
                        TABLE OF CONTENTS · 목차
                      </span>
                      <div className="space-y-1.5">
                        {chapterTabs.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => onTabChange(t.id)}
                            className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                              t.id === activeTabId
                                ? 'bg-amber-500/15 border-amber-400/30 text-amber-200 shadow-sm'
                                : 'bg-white/[0.02] border-white/5 text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[10px] font-bold text-amber-400">
                                {t.romanNumeral}
                              </span>
                              <span className="text-xs font-medium truncate">
                                {t.title}
                              </span>
                            </div>
                            <ChevronRight size={13} className="text-white/30 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Left Page Footer Motto */}
                <div className="pt-6 border-t border-white/5 text-center space-y-1">
                  <p className="text-[10px] font-serif italic text-amber-300/70">
                    {style.latinMotto}
                  </p>
                  <p className="text-[9px] font-mono text-white/30">
                    LIBER SAPIENTIAE · PRISM UNIVERSE
                  </p>
                </div>
              </div>

              {/* RIGHT PAGE (본문 스크롤 영역, 상호작용 카드, 실천 가이드, Lucy 바이블) */}
              <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative z-10 overflow-y-auto select-text custom-scrollbar">
                {/* Chapter Heading Banner */}
                <div className="pb-4 sm:pb-5 border-b border-white/10 mb-5 sm:mb-6 shrink-0 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-400/20">
                        CHAPTER {currentTab?.romanNumeral}
                      </span>
                      <span className="text-[10px] text-white/40 font-sans hidden sm:inline">
                        ✦ ──────────────── ✦
                      </span>
                    </div>
                    <h3 className="text-base sm:text-xl font-extrabold text-white tracking-tight">
                      {currentTab?.title}
                    </h3>
                  </div>

                  {leftPageHeaderExtra && (
                    <div className="shrink-0">
                      {leftPageHeaderExtra}
                    </div>
                  )}
                </div>

                {/* Main Scrollable Content */}
                <div className="flex-1 space-y-6 font-sans">
                  {children}
                </div>

                {/* Right Page Footer with Page Number */}
                <div className="pt-6 border-t border-white/10 flex items-center justify-between text-[10px] text-white/40 font-mono shrink-0 mt-8">
                  <span>PRISM COMPENDIUM</span>
                  <span className="text-amber-400 font-bold tracking-widest">
                    {footerPageNumber}
                  </span>
                  <span>ALL RIGHTS RESERVED</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
