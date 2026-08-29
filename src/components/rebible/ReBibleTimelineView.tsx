import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Star, 
  Filter, 
  RotateCcw,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  CalendarDays,
  ArrowRight,
  History
} from 'lucide-react';
import { ReBibleVerse } from '../../types/rebible';
import { ReBibleVerseCard } from './ReBibleVerseCard';

interface ReBibleTimelineViewProps {
  verses: ReBibleVerse[];
  selectedDateStr: string;
  onSelectDate: (dateStr: string) => void;
  onOpenCalendar: () => void;
  onToggleFavorite: (id: string) => void;
  onAddAnnotation: (verse: ReBibleVerse) => void;
  onDeleteVerse: (id: string) => void;
  onDeleteAnnotation: (verseId: string, annotationId: string) => void;
}

export const ReBibleTimelineView: React.FC<ReBibleTimelineViewProps> = ({
  verses,
  selectedDateStr,
  onSelectDate,
  onOpenCalendar,
  onToggleFavorite,
  onAddAnnotation,
  onDeleteVerse,
  onDeleteAnnotation
}) => {
  const [selectedEmotionFilter, setSelectedEmotionFilter] = useState<string | null>(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [viewAllPages, setViewAllPages] = useState(false); // false = Day-by-Day page mode, true = all pages list

  // All unique dates from verses (YYYY-MM-DD), sorted newest first
  const allRecordDates = useMemo(() => {
    const set = new Set<string>();
    verses.forEach((v) => {
      if (v.recordedAt) {
        set.add(v.recordedAt.slice(0, 10));
      }
    });
    // Add today if not present
    const today = new Date().toISOString().slice(0, 10);
    set.add(today);
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [verses]);

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

  // Milestone verses calculation for selectedDateStr (1개월, 3개월, 1년, 3년 전 기록)
  const milestoneVersesForDate = useMemo(() => {
    if (!selectedDateStr) return [];
    const targetDate = new Date(selectedDateStr);
    if (isNaN(targetDate.getTime())) return [];

    const results: Array<{
      verse: ReBibleVerse;
      label: string;
      horizonName: string;
      diffYearsOrMonths: string;
    }> = [];

    verses.forEach((v) => {
      if (!v.recordedAt) return;
      const vDate = new Date(v.recordedAt);
      if (isNaN(vDate.getTime())) return;
      const vDateStr = v.recordedAt.slice(0, 10);
      if (vDateStr === selectedDateStr) return; // Same day entries are already in the main list

      // Helper to check same month & day or exact offset
      const checkDiff = (target: Date, orig: Date) => {
        const yDiff = target.getFullYear() - orig.getFullYear();
        const mDiff = (target.getFullYear() - orig.getFullYear()) * 12 + (target.getMonth() - orig.getMonth());
        const isSameDayOfMonth = target.getDate() === orig.getDate();

        if (yDiff === 3 && target.getMonth() === orig.getMonth() && isSameDayOfMonth) {
          return { label: '3년 전 오늘', horizonName: '3년 후의 나', diffYearsOrMonths: '3년 전' };
        }
        if (yDiff === 1 && target.getMonth() === orig.getMonth() && isSameDayOfMonth) {
          return { label: '1년 전 오늘', horizonName: '1년 후의 성찰', diffYearsOrMonths: '1년 전' };
        }
        if (mDiff === 3 && isSameDayOfMonth) {
          return { label: '3개월 전 오늘', horizonName: '3개월 후의 통찰', diffYearsOrMonths: '3개월 전' };
        }
        if (mDiff === 1 && isSameDayOfMonth) {
          return { label: '1개월 전 오늘', horizonName: '1개월 후의 성찰', diffYearsOrMonths: '1개월 전' };
        }
        return null;
      };

      const match = checkDiff(targetDate, vDate);
      if (match) {
        results.push({
          verse: v,
          label: match.label,
          horizonName: match.horizonName,
          diffYearsOrMonths: match.diffYearsOrMonths
        });
      }
    });

    return results;
  }, [verses, selectedDateStr]);

  // Current page verses (either filtered by selectedDateStr or all)
  const displayedVerses = useMemo(() => {
    return verses.filter((v) => {
      if (!viewAllPages && v.recordedAt.slice(0, 10) !== selectedDateStr) {
        return false;
      }
      if (onlyFavorites && !v.isSacredFavorite) return false;
      if (selectedEmotionFilter && !v.emotions?.includes(selectedEmotionFilter)) return false;
      if (selectedTagFilter && !v.tags?.includes(selectedTagFilter)) return false;
      return true;
    });
  }, [verses, selectedDateStr, viewAllPages, onlyFavorites, selectedEmotionFilter, selectedTagFilter]);

  // Pagination navigation helpers
  const currentDateIndex = allRecordDates.indexOf(selectedDateStr);
  const hasPrevDate = currentDateIndex < allRecordDates.length - 1; // Older date
  const hasNextDate = currentDateIndex > 0; // Newer date

  const handleGoToPrevDate = () => {
    if (hasPrevDate) {
      onSelectDate(allRecordDates[currentDateIndex + 1]);
    }
  };

  const handleGoToNextDate = () => {
    if (hasNextDate) {
      onSelectDate(allRecordDates[currentDateIndex - 1]);
    }
  };

  const formattedSelectedDate = useMemo(() => {
    const d = new Date(selectedDateStr);
    if (isNaN(d.getTime())) return selectedDateStr;
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  }, [selectedDateStr]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const isToday = selectedDateStr === todayStr;

  const hasActiveFilters = onlyFavorites || !!selectedEmotionFilter || !!selectedTagFilter;

  const resetFilters = () => {
    setOnlyFavorites(false);
    setSelectedEmotionFilter(null);
    setSelectedTagFilter(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Date-by-Date Page Navigator Bar */}
      <div className="rounded-3xl border border-[#D8C7A9] bg-gradient-to-r from-[#F9F4EA] via-[#F5EEDF] to-[#F9F4EA] p-3 sm:p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Date Switcher Controls */}
          <div className="flex items-center justify-between sm:justify-start gap-2">
            {/* Prev Date Button (Older) */}
            <button
              onClick={handleGoToPrevDate}
              disabled={!hasPrevDate}
              className={`p-2 rounded-xl border flex items-center gap-1 text-xs font-bold transition shadow-2xs ${
                hasPrevDate
                  ? 'bg-[#FCFAF5] border-[#DFCDB2] text-[#4A321F] hover:bg-[#EFE6D4] active:scale-95'
                  : 'bg-transparent border-transparent text-stone-300 cursor-not-allowed'
              }`}
              title="이전 기록 일자 (이전 페이지)"
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">이전 일자</span>
            </button>

            {/* Current Date Display */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#FCFAF5] border border-[#DFCDB2] shadow-2xs">
              <CalendarDays size={16} className="text-[#854D0E]" />
              <div className="text-center sm:text-left">
                <div className="font-serif font-black text-xs sm:text-sm text-stone-950 flex items-center gap-1.5">
                  <span>{formattedSelectedDate}</span>
                  {isToday && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-[#854D0E] text-white">
                      오늘
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-stone-600 font-mono">
                  당일 기록 {displayedVerses.length}편
                  {milestoneVersesForDate.length > 0 && ` • 성찰 시점 ${milestoneVersesForDate.length}건`}
                </div>
              </div>
            </div>

            {/* Next Date Button (Newer) */}
            <button
              onClick={handleGoToNextDate}
              disabled={!hasNextDate}
              className={`p-2 rounded-xl border flex items-center gap-1 text-xs font-bold transition shadow-2xs ${
                hasNextDate
                  ? 'bg-[#FCFAF5] border-[#DFCDB2] text-[#4A321F] hover:bg-[#EFE6D4] active:scale-95'
                  : 'bg-transparent border-transparent text-stone-300 cursor-not-allowed'
              }`}
              title="다음 기록 일자 (다음 페이지)"
            >
              <span className="hidden sm:inline">다음 일자</span>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Quick Actions (Calendar Button & Mode Toggle) */}
          <div className="flex items-center justify-end gap-2">
            {/* Calendar Picker Trigger */}
            <button
              onClick={onOpenCalendar}
              className="px-3 py-1.5 rounded-xl border border-[#CDB58E] bg-[#EFE4CE] hover:bg-[#E6D7BD] text-[#3D2812] text-xs font-bold transition flex items-center gap-1.5 shadow-2xs active:scale-95"
            >
              <Calendar size={13} className="text-[#854D0E]" />
              <span>달력으로 일자 선택</span>
            </button>

            {/* View Mode Toggle: Day Page vs All List */}
            <button
              onClick={() => setViewAllPages(!viewAllPages)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                viewAllPages
                  ? 'bg-[#4A321F] text-[#FAF5EB] border-[#4A321F] shadow-xs'
                  : 'bg-[#FCFAF5] border-[#DFCDB2] text-stone-700 hover:bg-[#EFE6D4]'
              }`}
              title="한 페이지씩 보기 / 전체 연대기 모드 전환"
            >
              {viewAllPages ? '일자별 한 페이지로' : '전체 연대기'}
            </button>
          </div>
        </div>
      </div>

      {/* Filter Pill Bar */}
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

      {/* Special Section: Milestone Reflection Arrival (성찰 시점 도래한 과거 기록 - 3년 후의 나 등) */}
      {milestoneVersesForDate.length > 0 && (
        <div className="rounded-3xl border-2 border-[#D8C29D] bg-gradient-to-br from-[#FDF9F0] via-[#F7EFE1] to-[#F2E7D3] p-4 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E3D4B9] pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Clock size={16} />
              </div>
              <div>
                <h3 className="font-serif text-sm sm:text-base font-bold text-stone-900 flex items-center gap-2">
                  <span>시간을 건너온 성찰 시점 도래</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-600 text-white shadow-2xs">
                    Q&A 3년 다이어리
                  </span>
                </h3>
                <p className="text-xs text-stone-600">
                  과거 같은 날 기록되었던 구절이 오늘의 성찰 시점에 도달했습니다
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {milestoneVersesForDate.map(({ verse, label, horizonName, diffYearsOrMonths }) => (
              <div key={`milestone-${verse.id}`} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#854D0E] bg-[#EFE3CA] px-3 py-1.5 rounded-xl border border-[#D8C49E]">
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={13} className="fill-[#854D0E]" />
                    <span>⏳ {label}의 기록 ({verse.reference} 《{verse.title}》) ➔ '{horizonName}' 작성 시점!</span>
                  </span>
                  <span className="text-[11px] font-mono text-stone-600">
                    원문: {new Date(verse.recordedAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <ReBibleVerseCard
                  verse={verse}
                  onToggleFavorite={onToggleFavorite}
                  onAddAnnotation={onAddAnnotation}
                  onDeleteVerse={onDeleteVerse}
                  onDeleteAnnotation={onDeleteAnnotation}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Day Verses List */}
      {displayedVerses.length === 0 && milestoneVersesForDate.length === 0 ? (
        <div className="text-center py-16 px-4 space-y-3 rounded-2xl border border-dashed border-[#DFCDB2] bg-[#F9F5EC]/60">
          <BookOpen size={36} className="mx-auto text-[#854D0E]/60" />
          <h3 className="font-serif text-base font-bold text-stone-800">
            {formattedSelectedDate}에 기록된 경전이 없습니다
          </h3>
          <p className="text-xs text-stone-600 max-w-sm mx-auto">
            달력 버튼을 눌러 기록이 있는 다른 일자를 선택하거나 이전/다음 일자 페이지로 이동해 보세요.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={onOpenCalendar}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#4A321F] text-[#FAF5EB] hover:bg-[#382515] transition shadow-xs flex items-center gap-1.5"
            >
              <Calendar size={13} />
              <span>달력에서 기록일 찾기</span>
            </button>
            {hasPrevDate && (
              <button
                onClick={handleGoToPrevDate}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-[#DFCDB2] bg-[#FCFAF5] text-stone-800 hover:bg-[#EFE6D4] transition"
              >
                최근 기록일로 이동
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {displayedVerses.map((verse) => (
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
