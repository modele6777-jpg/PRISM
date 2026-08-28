import React, { useState } from 'react';
import { 
  BookOpen, 
  ChevronDown, 
  ChevronRight, 
  Sparkles, 
  Layers, 
  BookMarked,
  Plus
} from 'lucide-react';
import { ReBibleVerse, SacredAtmosphere } from '../../types/rebible';
import { ReBibleVerseCard } from './ReBibleVerseCard';

interface ReBibleBookshelfViewProps {
  verses: ReBibleVerse[];
  atmosphere: SacredAtmosphere;
  onToggleFavorite: (id: string) => void;
  onAddAnnotation: (verse: ReBibleVerse) => void;
  onEditVerse: (verse: ReBibleVerse) => void;
  onDeleteVerse: (id: string) => void;
  onDeleteAnnotation: (verseId: string, annotationId: string) => void;
  onOpenVersing: () => void;
}

export const ReBibleBookshelfView: React.FC<ReBibleBookshelfViewProps> = ({
  verses,
  atmosphere,
  onToggleFavorite,
  onAddAnnotation,
  onEditVerse,
  onDeleteVerse,
  onDeleteAnnotation,
  onOpenVersing
}) => {
  // Group verses by bookTitle
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

  const isParchment = atmosphere === 'parchment';

  if (bookNames.length === 0) {
    return (
      <div className="text-center py-16 px-4 space-y-3">
        <BookOpen size={36} className="mx-auto text-amber-500/60" />
        <h3 className="font-serif text-lg font-bold">아직 경전에 봉헌된 구절이 없습니다</h3>
        <p className="text-xs opacity-70 max-w-md mx-auto">
          오늘 있었던 사건과 그 안에서 피어난 지혜를 첫 구절로 기록해 보세요.
        </p>
        <button
          onClick={onOpenVersing}
          className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 shadow-md hover:brightness-105 transition"
        >
          첫 구절 봉헌하기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {bookNames.map((bookName) => {
        const bookVerses = groupedBooks[bookName];
        const isExpanded = expandedBooks[bookName] ?? true;
        const totalAnnotations = bookVerses.reduce((acc, v) => acc + (v.annotations?.length || 0), 0);

        return (
          <section
            key={bookName}
            className={`rounded-3xl border transition-all overflow-hidden ${
              isParchment
                ? 'bg-amber-100/30 border-amber-900/15'
                : 'bg-slate-950/40 border-slate-800/80'
            }`}
          >
            {/* Book Section Header */}
            <button
              onClick={() => toggleBook(bookName)}
              className={`w-full px-5 sm:px-6 py-4 flex items-center justify-between transition text-left ${
                isParchment ? 'hover:bg-amber-100/60' : 'hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                  isParchment
                    ? 'bg-amber-900 text-amber-50'
                    : 'bg-gradient-to-tr from-amber-600 to-yellow-400 text-slate-950'
                }`}>
                  <BookOpen size={18} />
                </div>
                <div>
                  <h2 className="font-serif text-base sm:text-lg font-black tracking-tight">
                    {bookName}
                  </h2>
                  <div className="text-[11px] opacity-70 flex items-center gap-2 mt-0.5">
                    <span>{bookVerses.length}개 구절</span>
                    <span>·</span>
                    <span>{totalAnnotations}개 주석</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  isParchment ? 'bg-amber-200/70 text-amber-900' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  Book Codex
                </span>
                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </div>
            </button>

            {/* Book Verses Grid */}
            {isExpanded && (
              <div className="p-4 sm:p-6 pt-0 space-y-4 border-t border-dashed border-amber-500/20 mt-2">
                {bookVerses.map((verse) => (
                  <ReBibleVerseCard
                    key={verse.id}
                    verse={verse}
                    atmosphere={atmosphere}
                    onToggleFavorite={onToggleFavorite}
                    onAddAnnotation={onAddAnnotation}
                    onEditVerse={onEditVerse}
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
