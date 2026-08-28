import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Star, 
  Filter, 
  Heart, 
  Tag, 
  BookOpen, 
  RotateCcw,
  Calendar
} from 'lucide-react';
import { ReBibleVerse, SacredAtmosphere } from '../../types/rebible';
import { ReBibleVerseCard } from './ReBibleVerseCard';

interface ReBibleTimelineViewProps {
  verses: ReBibleVerse[];
  atmosphere: SacredAtmosphere;
  onToggleFavorite: (id: string) => void;
  onAddAnnotation: (verse: ReBibleVerse) => void;
  onEditVerse: (verse: ReBibleVerse) => void;
  onDeleteVerse: (id: string) => void;
  onDeleteAnnotation: (verseId: string, annotationId: string) => void;
  onOpenVersing: () => void;
}

export const ReBibleTimelineView: React.FC<ReBibleTimelineViewProps> = ({
  verses,
  atmosphere,
  onToggleFavorite,
  onAddAnnotation,
  onEditVerse,
  onDeleteVerse,
  onDeleteAnnotation,
  onOpenVersing
}) => {
  const [selectedEmotionFilter, setSelectedEmotionFilter] = useState<string | null>(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Extract all unique emotions and tags from verses
  const { allEmotions, allTags } = useMemo(() => {
    const emSet = new Set<string>();
    const tgSet = new Set<string>();
    verses.forEach((v) => {
      v.emotions?.forEach((e) => emSet.add(e));
      v.tags?.forEach((t) => tgSet.add(t));
    });
    return {
      allEmotions: Array.from(emSet),
      allTags: Array.from(tgSet)
    };
  }, [verses]);

  // Filter verses
  const filteredVerses = useMemo(() => {
    return verses.filter((v) => {
      if (onlyFavorites && !v.isSacredFavorite) return false;
      if (selectedEmotionFilter && !v.emotions?.includes(selectedEmotionFilter)) return false;
      if (selectedTagFilter && !v.tags?.includes(selectedTagFilter)) return false;
      return true;
    });
  }, [verses, onlyFavorites, selectedEmotionFilter, selectedTagFilter]);

  const isParchment = atmosphere === 'parchment';
  const hasActiveFilters = onlyFavorites || !!selectedEmotionFilter || !!selectedTagFilter;

  const resetFilters = () => {
    setOnlyFavorites(false);
    setSelectedEmotionFilter(null);
    setSelectedTagFilter(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Quick Filter Pill Bar */}
      <div className={`p-3 rounded-2xl border transition flex flex-wrap items-center gap-2 text-xs ${
        isParchment ? 'bg-amber-100/40 border-amber-900/10' : 'bg-slate-950/40 border-slate-800/80'
      }`}>
        <div className="flex items-center gap-1 font-bold text-amber-500 mr-1 text-[11px]">
          <Filter size={12} />
          <span>필터:</span>
        </div>

        {/* Favorites only */}
        <button
          onClick={() => setOnlyFavorites(!onlyFavorites)}
          className={`px-2.5 py-1 rounded-xl transition flex items-center gap-1 border ${
            onlyFavorites
              ? isParchment
                ? 'bg-amber-900 text-white border-amber-900 font-bold'
                : 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
              : isParchment
              ? 'bg-white border-amber-900/15 text-stone-700'
              : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}
        >
          <Star size={11} className={onlyFavorites ? "fill-current" : ""} />
          <span>황금 구절만</span>
        </button>

        {/* Top Emotions */}
        {allEmotions.slice(0, 5).map((em) => {
          const isSelected = selectedEmotionFilter === em;
          return (
            <button
              key={em}
              onClick={() => setSelectedEmotionFilter(isSelected ? null : em)}
              className={`px-2.5 py-1 rounded-xl transition border text-[11px] ${
                isSelected
                  ? isParchment
                    ? 'bg-amber-900 text-white border-amber-900 font-bold'
                    : 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                  : isParchment
                  ? 'bg-white border-amber-900/15 text-stone-700'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              #{em}
            </button>
          );
        })}

        {/* Top Tags */}
        {allTags.slice(0, 4).map((tg) => {
          const isSelected = selectedTagFilter === tg;
          return (
            <button
              key={tg}
              onClick={() => setSelectedTagFilter(isSelected ? null : tg)}
              className={`px-2.5 py-1 rounded-xl transition border text-[11px] ${
                isSelected
                  ? isParchment
                    ? 'bg-amber-900 text-white border-amber-900 font-bold'
                    : 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                  : isParchment
                  ? 'bg-white border-amber-900/15 text-stone-700'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              🏷️ {tg}
            </button>
          );
        })}

        {/* Reset button if active */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className={`px-2 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 transition ${
              isParchment ? 'text-stone-600 hover:text-stone-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            <RotateCcw size={10} />
            <span>초기화</span>
          </button>
        )}
      </div>

      {/* Verses List */}
      {filteredVerses.length > 0 ? (
        <div className="space-y-4">
          {filteredVerses.map((verse) => (
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
      ) : (
        <div className="text-center py-16 px-4 space-y-3">
          <BookOpen size={36} className="mx-auto text-amber-500/60" />
          <h3 className="font-serif text-lg font-bold">조건에 맞는 경전 구절이 없습니다</h3>
          <p className="text-xs opacity-70 max-w-md mx-auto">
            필터를 초기화하거나 새로운 사건과 지혜의 구절을 봉헌해 보세요.
          </p>
          <div className="flex justify-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-amber-500/30"
              >
                필터 초기화
              </button>
            )}
            <button
              onClick={onOpenVersing}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 shadow-md hover:brightness-105 transition"
            >
              새 구절 봉헌하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
