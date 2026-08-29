import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Star, 
  Filter, 
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { ReBibleVerse } from '../../types/rebible';
import { ReBibleVerseCard } from './ReBibleVerseCard';

interface ReBibleTimelineViewProps {
  verses: ReBibleVerse[];
  onToggleFavorite: (id: string) => void;
  onAddAnnotation: (verse: ReBibleVerse) => void;
  onDeleteVerse: (id: string) => void;
  onDeleteAnnotation: (verseId: string, annotationId: string) => void;
}

export const ReBibleTimelineView: React.FC<ReBibleTimelineViewProps> = ({
  verses,
  onToggleFavorite,
  onAddAnnotation,
  onDeleteVerse,
  onDeleteAnnotation
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

  const hasActiveFilters = onlyFavorites || !!selectedEmotionFilter || !!selectedTagFilter;

  const resetFilters = () => {
    setOnlyFavorites(false);
    setSelectedEmotionFilter(null);
    setSelectedTagFilter(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Quick Filter Pill Bar */}
      <div className="p-3 rounded-2xl border border-[#E3D6BE] bg-[#F7F2E6]/90 flex flex-wrap items-center gap-2 text-xs shadow-2xs">
        <div className="flex items-center gap-1 font-bold text-[#854D0E] mr-1 text-[11px]">
          <Filter size={12} />
          <span>분류:</span>
        </div>

        {/* Favorites only */}
        <button
          onClick={() => setOnlyFavorites(!onlyFavorites)}
          className={`px-2.5 py-1 rounded-xl transition flex items-center gap-1 border ${
            onlyFavorites
              ? 'bg-[#4A321F] text-[#FAF5EB] border-[#4A321F] font-bold'
              : 'bg-[#FCFAF5] border-[#DFCDB2] text-stone-700 hover:bg-[#EFE6D4]'
          }`}
        >
          <Star size={11} className={onlyFavorites ? "fill-amber-400 text-amber-400" : ""} />
          <span>황금 구절만</span>
        </button>

        {/* Emotion Pills */}
        {allEmotions.slice(0, 5).map((emotion) => {
          const isSelected = selectedEmotionFilter === emotion;
          return (
            <button
              key={emotion}
              onClick={() => setSelectedEmotionFilter(isSelected ? null : emotion)}
              className={`px-2.5 py-1 rounded-xl transition text-[11px] border ${
                isSelected
                  ? 'bg-[#854D0E] text-white border-[#854D0E] font-bold'
                  : 'bg-[#FCFAF5] border-[#DFCDB2] text-stone-700 hover:bg-[#EFE6D4]'
              }`}
            >
              #{emotion}
            </button>
          );
        })}

        {/* Tag Pills */}
        {allTags.slice(0, 4).map((tag) => {
          const isSelected = selectedTagFilter === tag;
          return (
            <button
              key={tag}
              onClick={() => setSelectedTagFilter(isSelected ? null : tag)}
              className={`px-2 py-1 rounded-xl transition text-[11px] border ${
                isSelected
                  ? 'bg-[#854D0E] text-white border-[#854D0E] font-bold'
                  : 'bg-[#FCFAF5] border-[#DFCDB2] text-stone-600 hover:bg-[#EFE6D4]'
              }`}
            >
              🏷️ {tag}
            </button>
          );
        })}

        {/* Reset */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="ml-auto text-[11px] font-bold text-stone-500 hover:text-stone-800 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[#EFE6D4] transition"
          >
            <RotateCcw size={11} />
            <span>초기화</span>
          </button>
        )}
      </div>

      {/* Verses List */}
      {filteredVerses.length === 0 ? (
        <div className="text-center py-16 px-4 space-y-3 rounded-2xl border border-dashed border-[#DFCDB2] bg-[#F9F5EC]/60">
          <BookOpen size={36} className="mx-auto text-[#854D0E]/60" />
          <h3 className="font-serif text-base font-bold text-stone-800">
            해당 조건의 경전 구절이 없습니다
          </h3>
          <p className="text-xs text-stone-600 max-w-sm mx-auto">
            필터를 초기화하거나 다른 검색어로 기록을 찾아보세요.
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#4A321F] text-[#FAF5EB] shadow-xs"
            >
              필터 초기화
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {filteredVerses.map((verse) => (
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
