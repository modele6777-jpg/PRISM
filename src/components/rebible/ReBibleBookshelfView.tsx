import React, { useState } from 'react';
import { 
  BookOpen, 
  ChevronDown, 
  ChevronRight, 
  BookMarked
} from 'lucide-react';
import { ReBibleVerse } from '../../types/rebible';
import { ReBibleVerseCard } from './ReBibleVerseCard';

interface ReBibleBookshelfViewProps {
  verses: ReBibleVerse[];
  onToggleFavorite: (id: string) => void;
  onAddAnnotation: (verse: ReBibleVerse) => void;
  onDeleteVerse: (id: string) => void;
  onDeleteAnnotation: (verseId: string, annotationId: string) => void;
}

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
  const [expandedBooks, setExpandedBooks] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    bookNames.forEach((name) => {
      init[name] = true;
    });
    return init;
  });

  const toggleBook = (bookName: string) => {
    setExpandedBooks((prev) => ({
      ...prev,
      [bookName]: !prev[bookName]
    }));
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

  return (
    <div className="space-y-5">
      {bookNames.map((bookName) => {
        const bookVerses = groupedBooks[bookName];
        const isExpanded = expandedBooks[bookName] ?? true;
        const totalAnnotations = bookVerses.reduce((acc, v) => acc + (v.annotations?.length || 0), 0);

        return (
          <section
            key={bookName}
            className="rounded-3xl border border-[#E5DAC6] bg-[#FCFAF5] shadow-[0_2px_12px_rgba(74,50,31,0.06)] overflow-hidden transition-all"
          >
            {/* Book Section Header */}
            <button
              onClick={() => toggleBook(bookName)}
              className="w-full px-5 sm:px-6 py-4 flex items-center justify-between text-left hover:bg-[#F7F2E7]/80 transition border-b border-[#E8DFC8]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#4A321F] text-[#FAF5EB] flex items-center justify-center font-serif font-black text-sm shadow-xs">
                  {bookName.slice(0, 1)}
                </div>
                <div>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900 tracking-tight flex items-center gap-2">
                    <span>{bookName}</span>
                    <span className="text-xs font-sans font-normal text-stone-500">
                      ({bookVerses.length}편의 구절)
                    </span>
                  </h3>
                  <p className="text-[11px] text-stone-600 font-mono">
                    주석 {totalAnnotations}개 기록됨
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-stone-500">
                <span className="text-xs font-semibold hidden sm:inline">
                  {isExpanded ? '접기' : '펼치기'}
                </span>
                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </div>
            </button>

            {/* Book Verses List */}
            {isExpanded && (
              <div className="p-4 sm:p-5 space-y-4 bg-[#F9F5EC]/50">
                {bookVerses.map((verse) => (
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
          </section>
        );
      })}
    </div>
  );
};
