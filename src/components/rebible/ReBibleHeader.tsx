import React from 'react';
import { 
  BookOpen, 
  Plus, 
  Sparkles, 
  Moon, 
  Sun, 
  Flame, 
  Search, 
  ArrowLeft, 
  BarChart3, 
  BookMarked, 
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Compass
} from 'lucide-react';
import { SacredAtmosphere } from '../../types/rebible';

interface ReBibleHeaderProps {
  atmosphere: SacredAtmosphere;
  setAtmosphere: (atm: SacredAtmosphere) => void;
  viewMode: 'timeline' | 'bookshelf';
  setViewMode: (mode: 'timeline' | 'bookshelf') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onOpenVersing: () => void;
  onOpenSyncEcho: () => void;
  hasUnconsecratedEcho?: boolean;
  onOpenContemplation: () => void;
  onOpenStats: () => void;
  onBackToPrism: () => void;
  totalVersesCount: number;
  totalAnnotationsCount: number;
}

export const ReBibleHeader: React.FC<ReBibleHeaderProps> = ({
  atmosphere,
  setAtmosphere,
  viewMode,
  setViewMode,
  searchQuery,
  setSearchQuery,
  onOpenVersing,
  onOpenSyncEcho,
  hasUnconsecratedEcho,
  onOpenContemplation,
  onOpenStats,
  onBackToPrism,
  totalVersesCount,
  totalAnnotationsCount
}) => {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl border-b transition-colors duration-300 ${
      atmosphere === 'sanctuary' 
        ? 'bg-slate-950/85 border-amber-500/20 text-slate-100'
        : atmosphere === 'parchment'
        ? 'bg-amber-50/90 border-amber-900/15 text-stone-900'
        : 'bg-zinc-950/90 border-zinc-800 text-zinc-100'
    }">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
        {/* Top Row: Brand & Main Navigation Actions */}
        <div className="flex items-center justify-between gap-3">
          {/* Back to Prism & Re:Bible Title */}
          <div className="flex items-center gap-2 sm:gap-3.5">
            <button
              onClick={onBackToPrism}
              className={`p-2 rounded-xl transition flex items-center justify-center ${
                atmosphere === 'parchment'
                  ? 'hover:bg-amber-200/60 text-stone-700'
                  : 'hover:bg-white/10 text-slate-300'
              }`}
              title="프리즘 메인 허브로 이동"
              aria-label="뒤로가기"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-md ${
                atmosphere === 'parchment'
                  ? 'bg-amber-800 text-amber-100'
                  : 'bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 text-slate-950'
              }`}>
                <BookOpen size={18} className="stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="font-serif text-base sm:text-xl font-black tracking-tight flex items-center gap-1">
                    Re:Bible
                  </h1>
                  <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                    atmosphere === 'parchment'
                      ? 'bg-amber-900/10 text-amber-900 border border-amber-900/20'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    인생 경전
                  </span>
                </div>
                <p className={`text-[10px] sm:text-[11px] font-medium hidden sm:block ${
                  atmosphere === 'parchment' ? 'text-stone-600' : 'text-slate-400'
                }`}>
                  기록을 통해 삶의 서사를 재구성하는 디지털 성전
                </p>
              </div>
            </div>
          </div>

          {/* Center/Right Atmosphere & Quick Modals */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Atmosphere Switcher */}
            <div className={`flex items-center p-1 rounded-xl border ${
              atmosphere === 'parchment'
                ? 'bg-amber-100/80 border-amber-900/15 text-stone-700'
                : 'bg-slate-900/80 border-slate-800 text-slate-300'
            }`}>
              <button
                onClick={() => setAtmosphere('sanctuary')}
                className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
                  atmosphere === 'sanctuary'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'hover:opacity-70'
                }`}
                title="Sacred Dark Sanctuary (심야 성전 모드)"
              >
                <Moon size={13} />
                <span className="hidden md:inline text-[11px]">성전</span>
              </button>
              <button
                onClick={() => setAtmosphere('parchment')}
                className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
                  atmosphere === 'parchment'
                    ? 'bg-amber-800 text-amber-50 font-bold shadow-xs'
                    : 'hover:opacity-70'
                }`}
                title="Warm Ancient Parchment (양피지 경전 모드)"
              >
                <Sun size={13} />
                <span className="hidden md:inline text-[11px]">양피지</span>
              </button>
              <button
                onClick={() => setAtmosphere('candlelight')}
                className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
                  atmosphere === 'candlelight'
                    ? 'bg-zinc-100 text-zinc-950 font-bold shadow-xs'
                    : 'hover:opacity-70'
                }`}
                title="Candlelight Contemplation (촛불 묵상 모드)"
              >
                <Flame size={13} />
                <span className="hidden md:inline text-[11px]">촛불</span>
              </button>
            </div>

            {/* Sync:Echo Auto-Integration Button */}
            <button
              onClick={onOpenSyncEcho}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition active:scale-95 relative ${
                hasUnconsecratedEcho
                  ? 'bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-500/20 border-amber-500/50 text-amber-300 hover:brightness-110 shadow-xs'
                  : atmosphere === 'parchment'
                  ? 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200/70'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
              title="Sync:Echo (프리즘 활동 및 루시 지혜 자동 동기화)"
            >
              <Sparkles size={14} className="text-amber-400 animate-pulse" />
              <span className="hidden sm:inline">Sync:Echo</span>
              {hasUnconsecratedEcho && (
                <span className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-300/40 absolute -top-0.5 -right-0.5 animate-ping" />
              )}
            </button>

            {/* Daily Contemplation Prompt */}
            <button
              onClick={onOpenContemplation}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition active:scale-95 ${
                atmosphere === 'parchment'
                  ? 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200/70'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
              }`}
              title="오늘의 경전 소환 및 재해석 묵상"
            >
              <Compass size={14} className="text-amber-400 animate-pulse" />
              <span className="hidden sm:inline">오늘의 묵상</span>
            </button>

            {/* Narrative Stats Overview */}
            <button
              onClick={onOpenStats}
              className={`p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-medium border transition ${
                atmosphere === 'parchment'
                  ? 'bg-stone-200/60 border-stone-300 text-stone-700 hover:bg-stone-200'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
              title="서사 진화 지수 및 통계"
            >
              <BarChart3 size={15} />
            </button>

            {/* Consecrate New Verse Button (Versing) */}
            <button
              onClick={onOpenVersing}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 shadow-md hover:shadow-amber-500/20 hover:brightness-105 active:scale-95 transition flex items-center gap-1.5"
            >
              <Plus size={15} className="stroke-[3]" />
              <span>새 구절 봉헌</span>
            </button>
          </div>
        </div>

        {/* Secondary Sub-Bar: Search & View Toggles */}
        <div className="mt-3 sm:mt-3.5 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative w-full sm:max-w-md">
            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${
              atmosphere === 'parchment' ? 'text-stone-500' : 'text-slate-400'
            }`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="사건, 깨달음, 주석, 감정 키워드 검색..."
              className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs outline-none border transition ${
                atmosphere === 'parchment'
                  ? 'bg-white/80 border-amber-900/20 text-stone-900 placeholder:text-stone-400 focus:border-amber-700 focus:bg-white'
                  : 'bg-slate-900/90 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:bg-slate-900'
              }`}
            />
          </div>

          {/* View Mode Toggle & Verse Counter */}
          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3">
            <div className={`text-[11px] font-medium ${
              atmosphere === 'parchment' ? 'text-stone-600' : 'text-slate-400'
            }`}>
              총 <span className="font-bold text-amber-500">{totalVersesCount}</span>개 구절 · <span className="font-bold text-amber-500">{totalAnnotationsCount}</span>개 주석
            </div>

            <div className={`flex items-center p-0.5 rounded-lg border text-xs ${
              atmosphere === 'parchment'
                ? 'bg-amber-100/80 border-amber-900/15'
                : 'bg-slate-900 border-slate-800'
            }`}>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-2.5 py-1 rounded-md transition font-medium text-[11px] ${
                  viewMode === 'timeline'
                    ? atmosphere === 'parchment'
                      ? 'bg-amber-800 text-white font-bold'
                      : 'bg-amber-500 text-slate-950 font-bold'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                연대기
              </button>
              <button
                onClick={() => setViewMode('bookshelf')}
                className={`px-2.5 py-1 rounded-md transition font-medium text-[11px] ${
                  viewMode === 'bookshelf'
                    ? atmosphere === 'parchment'
                      ? 'bg-amber-800 text-white font-bold'
                      : 'bg-amber-500 text-slate-950 font-bold'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                경전별 (서)
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
