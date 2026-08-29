import React, { useState, useRef } from 'react';
import { 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  BookMarked,
  Layers,
  LayoutList,
  Calendar
} from 'lucide-react';
import { ReBibleVerse } from '../../types/rebible';
import { ReBibleVerseCard } from './ReBibleVerseCard';

interface ReBibleBookshelfViewProps {
  verses: ReBibleVerse[];
  onToggleFavorite: (id: string) => void;
  onAddAnnotation: (verse: ReBibleVerse) => void;
  onDeleteVerse?: (id: string) => void;
  onDeleteAnnotation?: (verseId: string, annotationId: string) => void;
}

const BOOK_ICONS: Record<string, string> = {
  '운명의 서': '🔮',
  '정화의 서': '🕊️',
  '치유의 서': '🌿',
  '성찰의 서': '🍊',
  '영감의 서': '🎨',
  '지혜의 서': '✨',
  '각성의 서': '📖',
  '평온의 서': '🍃',
  '통합의 서': '🌟'
};

export const ReBibleBookshelfView: React.FC<ReBibleBookshelfViewProps> = ({
  verses,
  onToggleFavorite,
  onAddAnnotation,
  onDeleteVerse,
  onDeleteAnnotation
}) => {
  const groupedBooks = React.useMemo(() => {
    const map: Record<string, ReBibleVerse[]> = {};
    verses.forEach((v) => {
      const b = v.bookTitle || '지혜의 서';
      if (!map[b]) map[b] = [];
      map[b].push(v);
    });
    return map;
  }, [verses]);

  const bookNames = Object.keys(groupedBooks);

  // Active book selection
  const [activeBook, setActiveBook] = useState<string>(() => bookNames[0] || '지혜의 서');
  // Current verse index per book for swipe carousel
  const [bookVerseIndices, setBookVerseIndices] = useState<Record<string, number>>({});
  // View mode: 'swipe' (Card Deck Swipe) vs 'list' (All verses list)
  const [viewStyle, setViewStyle] = useState<'swipe' | 'list'>('swipe');

  // Touch swipe state
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Sync activeBook if current active book is not in bookNames
  React.useEffect(() => {
    if (bookNames.length > 0 && !bookNames.includes(activeBook)) {
      setActiveBook(bookNames[0]);
    }
  }, [bookNames, activeBook]);

  const currentBookVerses = groupedBooks[activeBook] || [];
  const currentVerseIndex = Math.min(
    bookVerseIndices[activeBook] || 0,
    Math.max(0, currentBookVerses.length - 1)
  );

  const handlePrevVerse = () => {
    if (currentVerseIndex > 0) {
      setBookVerseIndices((prev) => ({
        ...prev,
        [activeBook]: currentVerseIndex - 1
      }));
    }
  };

  const handleNextVerse = () => {
    if (currentVerseIndex < currentBookVerses.length - 1) {
      setBookVerseIndices((prev) => ({
        ...prev,
        [activeBook]: currentVerseIndex + 1
      }));
    }
  };

  // Touch handlers for swipe gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45; // Minimum px to trigger swipe

    if (diff > minSwipeDistance) {
      // Swiped Left -> Next verse
      handleNextVerse();
    } else if (diff < -minSwipeDistance) {
      // Swiped Right -> Previous verse
      handlePrevVerse();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (bookNames.length === 0) {
    return (
      <div className="text-center py-16 px-4 space-y-3 rounded-2xl border border-dashed border-[#DFCDB2] bg-[#F9F5EC]/60">
        <BookOpen size={36} className="mx-auto text-[#854D0E]/60" />
        <h3 className="font-serif text-base font-bold text-stone-800">
          아직 서재에 보관된 경전이 없습니다
        </h3>
        <p className="text-xs text-stone-600 max-w-md mx-auto">
          프리즘 앱(타로, 정화, 세도나 명상, 루시와의 대화)을 이용하시면 당신의 여정이 자동으로 기록되어 이곳에 편찬됩니다.
        </p>
      </div>
    );
  }

  const currentVerse = currentBookVerses[currentVerseIndex];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Bookshelf Shelf Tab Bar */}
      <div className="rounded-3xl border border-[#D8C7A9] bg-[#F8F3E8] p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Book Selection Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {bookNames.map((bName) => {
              const count = groupedBooks[bName].length;
              const isSelected = activeBook === bName;
              return (
                <button
                  key={bName}
                  onClick={() => setActiveBook(bName)}
                  className={`px-3.5 py-1.5 rounded-2xl text-xs font-serif font-bold transition whitespace-nowrap flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                    isSelected
                      ? 'bg-[#4A321F] text-[#FAF5EB] shadow-xs ring-2 ring-amber-400/50'
                      : 'bg-[#FCFAF5] hover:bg-[#EFE6D4] text-stone-800 border border-[#DFCDB2]'
                  }`}
                >
                  <span>{BOOK_ICONS[bName] || '📖'}</span>
                  <span>{bName}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-amber-400 text-stone-900' : 'bg-[#EADDC6] text-[#4A321F]'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* View Mode & Return to Daily Controls */}
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => setViewStyle('swipe')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                viewStyle === 'swipe'
                  ? 'bg-[#854D0E] text-white border-[#854D0E] shadow-2xs'
                  : 'bg-[#FCFAF5] border-[#DFCDB2] text-stone-700 hover:bg-[#EFE6D4]'
              }`}
              title="좌우 스와이프로 넘겨보기"
            >
              <Layers size={13} />
              <span>스와이프 서재</span>
            </button>

            <button
              onClick={() => setViewStyle('list')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                viewStyle === 'list'
                  ? 'bg-[#854D0E] text-white border-[#854D0E] shadow-2xs'
                  : 'bg-[#FCFAF5] border-[#DFCDB2] text-stone-700 hover:bg-[#EFE6D4]'
              }`}
              title="목록 전체 펼쳐보기"
            >
              <LayoutList size={13} />
              <span>전체 목록</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Bookshelf Area */}
      {viewStyle === 'swipe' ? (
        /* Swipeable Deck Mode */
        <div className="space-y-3">
          {/* Swipe Guide & Pagination Bar */}
          <div className="flex items-center justify-between px-2 text-xs text-stone-600">
            <div className="flex items-center gap-1.5 font-serif font-bold text-stone-900">
              <BookMarked size={14} className="text-[#854D0E]" />
              <span>《{activeBook}》 제 {currentVerseIndex + 1}장 / 총 {currentBookVerses.length}편</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-stone-500 font-sans hidden sm:inline">
                👆 화면을 좌우로 스와이프하여 넘길 수 있습니다
              </span>

              {/* Prev / Next Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevVerse}
                  disabled={currentVerseIndex === 0}
                  className={`p-1.5 rounded-xl border transition shadow-2xs ${
                    currentVerseIndex > 0
                      ? 'bg-[#FCFAF5] border-[#DFCDB2] text-[#4A321F] hover:bg-[#EFE6D4] active:scale-95'
                      : 'bg-transparent border-transparent text-stone-300 cursor-not-allowed'
                  }`}
                  title="이전 구절 (오른쪽 스와이프)"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Dot Indicators */}
                <div className="flex items-center gap-1 px-1">
                  {currentBookVerses.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setBookVerseIndices((prev) => ({ ...prev, [activeBook]: idx }))}
                      className={`h-2 rounded-full transition-all ${
                        idx === currentVerseIndex
                          ? 'w-4 bg-[#854D0E]'
                          : 'w-2 bg-[#D5C2A3] hover:bg-[#B59E7E]'
                      }`}
                      title={`제 ${idx + 1}편으로 이동`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNextVerse}
                  disabled={currentVerseIndex === currentBookVerses.length - 1}
                  className={`p-1.5 rounded-xl border transition shadow-2xs ${
                    currentVerseIndex < currentBookVerses.length - 1
                      ? 'bg-[#FCFAF5] border-[#DFCDB2] text-[#4A321F] hover:bg-[#EFE6D4] active:scale-95'
                      : 'bg-transparent border-transparent text-stone-300 cursor-not-allowed'
                  }`}
                  title="다음 구절 (왼쪽 스와이프)"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Swipe Container */}
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="touch-pan-y select-none transition-all duration-300"
          >
            {currentVerse && (
              <ReBibleVerseCard
                key={currentVerse.id}
                verse={currentVerse}
                onToggleFavorite={onToggleFavorite}
                onAddAnnotation={onAddAnnotation}
                onDeleteVerse={onDeleteVerse}
                onDeleteAnnotation={onDeleteAnnotation}
              />
            )}
          </div>

          {/* Bottom Swipe Tip Pill for Mobile */}
          <div className="text-center pt-1">
            <p className="text-[11px] text-stone-500 font-sans">
              ← 손가락으로 좌우 스와이프하여 다음/이전 구절로 넘기기 →
            </p>
          </div>
        </div>
      ) : (
        /* List Mode (All Verses of Active Book) */
        <div className="space-y-4">
          <div className="px-2 font-serif font-bold text-xs sm:text-sm text-stone-900 flex items-center justify-between">
            <span>《{activeBook}》 총 {currentBookVerses.length}편의 경전 기록</span>
          </div>

          {currentBookVerses.map((verse) => (
            <ReBibleVerseCard
              key={verse.id}
              verse={verse}
              onToggleFavorite={onToggleFavorite}
              onAddAnnotation={onAddAnnotation}
              onDeleteVerse={onDeleteVerse}
              onDeleteAnnotation={onDeleteAnnotation}
            />
          ))}
        </div>
      )}
    </div>
  );
};
