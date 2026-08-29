import React from 'react';
import { 
  BookOpen, 
  Search, 
  ArrowLeft, 
  BookMarked,
  Sparkles,
  Layers,
  Calendar,
  MessageSquare,
  Printer
} from 'lucide-react';

interface ReBibleHeaderProps {
  viewMode: 'timeline' | 'bookshelf';
  setViewMode: (mode: 'timeline' | 'bookshelf') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onBackToPrism: () => void;
  onNavigateToLucy?: () => void;
  totalVersesCount: number;
  onOpenCalendar?: () => void;
  onExportBookletPDF?: () => void;
}

export const ReBibleHeader: React.FC<ReBibleHeaderProps> = ({
  viewMode,
  setViewMode,
  searchQuery,
  setSearchQuery,
  onBackToPrism,
  onNavigateToLucy,
  totalVersesCount,
  onOpenCalendar,
  onExportBookletPDF
}) => {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl border-b border-[#E3D6BF] bg-[#FAF6EE]/95 text-stone-900 shadow-xs">
      <div className="max-w-5xl w-full mx-auto px-3 sm:px-6 py-3 sm:py-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Left: Back Button & Title */}
          <div className="flex items-center justify-between sm:justify-start gap-2.5">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={onBackToPrism}
                className="p-2 rounded-xl transition flex items-center justify-center hover:bg-[#EFE6D4] text-stone-700 active:scale-95"
                title="프리즘 메인 허브로 이동"
                aria-label="뒤로가기"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-xs bg-[#4A321F] text-[#FAF5EB]">
                  <BookOpen size={18} className="stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h1 className="font-serif text-base sm:text-lg font-black tracking-tight text-stone-950">
                      Re:Bible
                    </h1>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EADDC6] text-[#3D2812] border border-[#D8C7A9]">
                      인생 경전
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 font-serif hidden sm:block">
                    자동으로 기록되는 삶의 여정과 지혜 ({totalVersesCount}편)
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile Actions: Lucy Chat, Calendar & Chronicle Toggle */}
            <div className="flex sm:hidden items-center gap-1.5">
              {onNavigateToLucy && (
                <button
                  onClick={onNavigateToLucy}
                  className="p-2 rounded-xl border border-amber-300/80 bg-amber-100/90 text-amber-950 hover:bg-amber-200 transition shadow-2xs active:scale-95 flex items-center justify-center"
                  title="루시와의 대화방으로 이동"
                >
                  <Sparkles size={15} className="text-amber-700" />
                </button>
              )}
              {onOpenCalendar && (
                <button
                  onClick={onOpenCalendar}
                  className="p-2 rounded-xl border border-[#DFCDB2] bg-[#EFE6D4] text-[#4A321F] hover:bg-[#E6D7BD] transition shadow-2xs"
                  title="경전 일자 달력"
                >
                  <Calendar size={15} />
                </button>
              )}
              {onExportBookletPDF && (
                <button
                  onClick={onExportBookletPDF}
                  className="p-2 rounded-xl border border-[#DFCDB2] bg-[#FAF6EE] text-[#854D0E] hover:bg-[#EFE6D4] transition shadow-2xs"
                  title="소책자 PDF 저장 / 인쇄"
                >
                  <Printer size={15} />
                </button>
              )}
              <button
                onClick={() => setViewMode(viewMode === 'timeline' ? 'bookshelf' : 'timeline')}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-[#DFCDB2] bg-[#4A321F] text-[#FAF5EB] shadow-xs active:scale-95"
                title={viewMode === 'timeline' ? '경전별 서재(전체 연대기) 보기' : '일자별 기록으로 돌아가기'}
              >
                {viewMode === 'timeline' ? (
                  <>
                    <BookMarked size={13} />
                    <span>전체 연대기</span>
                  </>
                ) : (
                  <>
                    <Calendar size={13} />
                    <span>일자별 기록</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Search, Calendar Button, PDF Export & Desktop Chronicle Toggle */}
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                type="text"
                placeholder="경전 검색 (키워드, 감정...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-[#F3ECE0] border border-[#DFCDB2] text-stone-900 placeholder:text-stone-500 focus:outline-none focus:ring-1 focus:ring-[#854D0E] transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-800 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Desktop Lucy Chat Button */}
            {onNavigateToLucy && (
              <button
                onClick={onNavigateToLucy}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300/80 bg-amber-100/90 hover:bg-amber-200 text-amber-950 text-xs font-bold transition shadow-2xs active:scale-95"
                title="루시와의 대화방으로 이동"
              >
                <Sparkles size={14} className="text-amber-700" />
                <span>루시 채팅</span>
              </button>
            )}

            {/* Desktop Calendar Button */}
            {onOpenCalendar && (
              <button
                onClick={onOpenCalendar}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DFCDB2] bg-[#EFE6D4] hover:bg-[#E5D7BE] text-[#4A321F] text-xs font-bold transition shadow-2xs active:scale-95"
                title="경전 일자 달력 열기"
              >
                <Calendar size={14} />
                <span>달력</span>
              </button>
            )}

            {/* Desktop PDF Booklet Export Button */}
            {onExportBookletPDF && (
              <button
                onClick={onExportBookletPDF}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DFCDB2] bg-[#FAF6EE] hover:bg-[#F0E6D5] text-[#854D0E] text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer"
                title="서재 전체를 아름다운 인생 경전 소책자(PDF)로 인쇄 및 저장"
              >
                <Printer size={14} />
                <span>소책자 PDF</span>
              </button>
            )}

            {/* Desktop Chronicle Toggle */}
            <button
              onClick={() => setViewMode(viewMode === 'timeline' ? 'bookshelf' : 'timeline')}
              className={`hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition shadow-xs active:scale-95 ${
                viewMode === 'bookshelf'
                  ? 'bg-[#854D0E] text-white border-[#854D0E]'
                  : 'bg-[#4A321F] text-[#FAF5EB] border-[#4A321F] hover:bg-[#3D2812]'
              }`}
              title={viewMode === 'timeline' ? '경전별 서재(전체 연대기) 보기' : '일자별 기록으로 돌아가기'}
            >
              {viewMode === 'timeline' ? (
                <>
                  <BookMarked size={14} />
                  <span>전체 연대기</span>
                </>
              ) : (
                <>
                  <Calendar size={14} />
                  <span>일자별 기록</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
