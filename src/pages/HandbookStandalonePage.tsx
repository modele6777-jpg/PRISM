import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { 
  ReBibleVerse, 
  ReBibleAnnotation 
} from '@/types/rebible';
import { 
  subscribeToReBibleVerses, 
  saveVerseToFirestore, 
  deleteVerseFromFirestore, 
  saveLocalVerses,
  DEFAULT_SACRED_VERSES
} from '@/lib/rebibleStorage';
import { ReBibleHeader } from '@/components/rebible/ReBibleHeader';
import { ReBibleTimelineView } from '@/components/rebible/ReBibleTimelineView';
import { ReBibleBookshelfView } from '@/components/rebible/ReBibleBookshelfView';
import { ReBibleAnnotationModal } from '@/components/rebible/ReBibleAnnotationModal';
import { ReBibleCalendarModal } from '@/components/rebible/ReBibleCalendarModal';
import { ReBibleSyncEchoBanner } from '@/components/rebible/ReBibleSyncEchoBanner';
import { 
  buildTodaySyncEchoDraft, 
  createVerseFromDraft, 
  consecrateAllTopicVerses,
  SyncEchoDraft 
} from '@/lib/rebibleSyncEcho';
import { exportLibraryAsBookletPDF } from '@/utils/rebibleExporter';
import { playTTS, stopTTS } from '@/utils/tts';

export default function HandbookStandalonePage() {
  const [, navigate] = useLocation();
  const { firebaseUser, sharedState } = useApp();

  const rawNickname = sharedState?.userProfile?.basic?.nickname?.trim();
  const rawDisplayName = firebaseUser?.displayName?.trim();
  const userDisplayName = (rawNickname && rawNickname !== '여행자' && rawNickname !== '사용자')
    ? rawNickname
    : (rawDisplayName || '순례자');

  // View Mode: timeline vs bookshelf
  const [viewMode, setViewMode] = useState<'timeline' | 'bookshelf'>('timeline');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected date for day-by-day page view (YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Verses state synced via Firestore & LocalStorage
  const [verses, setVerses] = useState<ReBibleVerse[]>(() => DEFAULT_SACRED_VERSES);

  // Annotation Modal state (시간의 성찰)
  const [isAnnotationOpen, setIsAnnotationOpen] = useState(false);
  const [targetAnnotationVerse, setTargetAnnotationVerse] = useState<ReBibleVerse | null>(null);

  // Sync:Echo Draft State (오늘의 프리즘 활동 & 지혜 자동 집대성)
  const [syncEchoDraft, setSyncEchoDraft] = useState<SyncEchoDraft>(() => buildTodaySyncEchoDraft(verses));

  useEffect(() => {
    setSyncEchoDraft(buildTodaySyncEchoDraft(verses));
  }, [verses]);

  // Update Page Title, Favicon, and PWA manifest for Re:Bible
  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.title = 'Re:Bible - 삶의 서사가 자동으로 기록되는 인생 경전';

    let iconTag = document.querySelector<HTMLLinkElement>("link[rel*='apple-touch-icon']");
    if (!iconTag) {
      iconTag = document.createElement('link');
      iconTag.rel = 'apple-touch-icon';
      document.head.appendChild(iconTag);
    }
    iconTag.href = '/apple-touch-icon-rebible.png';

    let favTag = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (!favTag) {
      favTag = document.createElement('link');
      favTag.rel = 'icon';
      document.head.appendChild(favTag);
    }
    favTag.href = '/rebible-icon-192.png';

    let appleTitleTag = document.querySelector<HTMLMetaElement>("meta[name='apple-mobile-web-app-title']");
    if (!appleTitleTag) {
      appleTitleTag = document.createElement('meta');
      appleTitleTag.name = 'apple-mobile-web-app-title';
      document.head.appendChild(appleTitleTag);
    }
    appleTitleTag.setAttribute('content', 'Re:Bible');

    let manifestTag = document.querySelector<HTMLLinkElement>("link[rel='manifest']");
    if (manifestTag) {
      manifestTag.setAttribute('href', '/manifest-handbook.webmanifest');
    }
  }, []);

  // Real-time Firestore sync
  useEffect(() => {
    const unsub = subscribeToReBibleVerses(firebaseUser?.uid, (fetchedVerses) => {
      if (fetchedVerses && fetchedVerses.length > 0) {
        setVerses(fetchedVerses);
      }
    });
    return () => unsub();
  }, [firebaseUser?.uid]);

  // Automatic Living Scripture Compilation:
  // 그날 활동한 수만큼 일자별 기록에 각각의 독립된 서(구절)를 만들고,
  // 루시의 관점에서 해석한 지혜의 구절을 각각 등록합니다.
  useEffect(() => {
    if (syncEchoDraft.topicDrafts && syncEchoDraft.topicDrafts.length > 0) {
      const todayDateKey = syncEchoDraft.dateKey;
      const existingTodayTitles = new Set(
        verses
          .filter((v) => v.recordedAt?.startsWith(todayDateKey) || v.tags?.includes(`날짜:${todayDateKey}`))
          .map((v) => v.title)
      );

      const unrecordedTopics = syncEchoDraft.topicDrafts.filter(
        (t) => !existingTodayTitles.has(t.title)
      );

      if (unrecordedTopics.length > 0) {
        consecrateAllTopicVerses(unrecordedTopics, todayDateKey).then((newVerses) => {
          if (newVerses && newVerses.length > 0) {
            setVerses((prev) => {
              const prevMap = new Map(prev.map((v) => [v.id, v]));
              newVerses.forEach((nv) => prevMap.set(nv.id, nv));
              const merged = Array.from(prevMap.values()).sort(
                (a, b) => new Date(b.recordedAt || 0).getTime() - new Date(a.recordedAt || 0).getTime()
              );
              saveLocalVerses(merged);
              return merged;
            });
          }
        });
      }
    }
  }, [syncEchoDraft.topicDrafts, syncEchoDraft.dateKey, verses]);

  const handleRefreshSyncEcho = useCallback(async () => {
    const freshDraft = buildTodaySyncEchoDraft(verses);
    setSyncEchoDraft(freshDraft);
    if (freshDraft.topicDrafts && freshDraft.topicDrafts.length > 0) {
      const todayDateKey = freshDraft.dateKey;
      const existingTodayTitles = new Set(
        verses
          .filter((v) => v.recordedAt?.startsWith(todayDateKey) || v.tags?.includes(`날짜:${todayDateKey}`))
          .map((v) => v.title)
      );

      const unrecordedTopics = freshDraft.topicDrafts.filter(
        (t) => !existingTodayTitles.has(t.title)
      );

      if (unrecordedTopics.length > 0) {
        const createdVerses = await consecrateAllTopicVerses(unrecordedTopics, todayDateKey);
        if (createdVerses.length > 0) {
          setVerses((prev) => {
            const prevMap = new Map(prev.map((v) => [v.id, v]));
            createdVerses.forEach((nv) => prevMap.set(nv.id, nv));
            const merged = Array.from(prevMap.values()).sort(
              (a, b) => new Date(b.recordedAt || 0).getTime() - new Date(a.recordedAt || 0).getTime()
            );
            saveLocalVerses(merged);
            return merged;
          });
        }
      }
    }
  }, [verses]);

  // Search filtered verses
  const filteredVerses = useMemo(() => {
    if (!searchQuery.trim()) return verses;
    const q = searchQuery.toLowerCase().trim();
    return verses.filter((v) => {
      const matchTitle = v.title?.toLowerCase().includes(q);
      const matchRef = v.reference?.toLowerCase().includes(q);
      const matchFact = v.fact?.toLowerCase().includes(q);
      const matchInsight = v.insight?.toLowerCase().includes(q);
      const matchBook = v.bookTitle?.toLowerCase().includes(q);
      const matchEmotions = v.emotions?.some((e) => e.toLowerCase().includes(q));
      const matchTags = v.tags?.some((t) => t.toLowerCase().includes(q));
      const matchAnnotations = v.annotations?.some((a) => a.content?.toLowerCase().includes(q) || a.timeHorizon?.toLowerCase().includes(q));
      return matchTitle || matchRef || matchFact || matchInsight || matchBook || matchEmotions || matchTags || matchAnnotations;
    });
  }, [verses, searchQuery]);

  // Toggle Sacred Favorite Star
  const handleToggleFavorite = useCallback(async (verseId: string) => {
    const updated = verses.map((v) => {
      if (v.id === verseId) {
        const nextFav = !v.isSacredFavorite;
        const modified = { ...v, isSacredFavorite: nextFav, updatedAt: new Date().toISOString() };
        saveVerseToFirestore(modified);
        return modified;
      }
      return v;
    });
    setVerses(updated);
    saveLocalVerses(updated);
  }, [verses]);

  // Delete Verse
  const handleDeleteVerse = useCallback(async (verseId: string) => {
    const updated = verses.filter((v) => v.id !== verseId);
    setVerses(updated);
    saveLocalVerses(updated);
    await deleteVerseFromFirestore(verseId);
  }, [verses]);

  // Save New Annotation (시간의 성찰)
  const handleSaveAnnotation = useCallback(async (verseId: string, annotationData: { timeHorizon: string; content: string; shiftSummary?: string }) => {
    const newAnnot: ReBibleAnnotation = {
      id: `annot-${Date.now()}`,
      verseId,
      writtenAt: new Date().toISOString(),
      timeHorizon: annotationData.timeHorizon,
      content: annotationData.content,
      shiftSummary: annotationData.shiftSummary
    };

    const updated = verses.map((v) => {
      if (v.id === verseId) {
        const existingAnnots = Array.isArray(v.annotations) ? v.annotations : [];
        const modified = {
          ...v,
          annotations: [...existingAnnots, newAnnot],
          updatedAt: new Date().toISOString()
        };
        saveVerseToFirestore(modified);
        return modified;
      }
      return v;
    });

    setVerses(updated);
    saveLocalVerses(updated);
  }, [verses]);

  // Delete Annotation
  const handleDeleteAnnotation = useCallback(async (verseId: string, annotationId: string) => {
    const updated = verses.map((v) => {
      if (v.id === verseId) {
        const modified = {
          ...v,
          annotations: (v.annotations || []).filter((a) => a.id !== annotationId),
          updatedAt: new Date().toISOString()
        };
        saveVerseToFirestore(modified);
        return modified;
      }
      return v;
    });
    setVerses(updated);
    saveLocalVerses(updated);
  }, [verses]);

const CANONICAL_BOOKS_ORDER: Record<string, { order: number; subtitle: string; icon: string }> = {
  '운명의 서': { order: 1, subtitle: '삶의 타이밍과 영적 이정표', icon: '🔮' },
  '정화의 서': { order: 2, subtitle: '내면의 기억을 비워낸 평온', icon: '🕊️' },
  '치유의 서': { order: 3, subtitle: '호흡과 방하착의 생명력', icon: '🌿' },
  '성찰의 서': { order: 4, subtitle: '혼란을 지혜로 바꾼 연금술', icon: '🍊' },
  '영감의 서': { order: 5, subtitle: '예술적 공명과 창조성', icon: '🎨' },
  '지혜의 서': { order: 6, subtitle: '루시와 나눈 영혼의 해답', icon: '✨' },
  '각성의 서': { order: 7, subtitle: '일상의 영적 자각과 현존', icon: '📖' },
  '통합의 서': { order: 8, subtitle: '삶의 전체성과 신성한 합일', icon: '🌌' }
};

function cleanScriptureText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[#*`_~[\]()]/g, ' ')
    .replace(/날짜:[^\s]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

  // Full Scripture Bible-style recitation state (성경 읽어주듯이 권별/오래된 순서 연속 낭독)
  const [isSpeakingAll, setIsSpeakingAll] = useState(false);
  const [recitingProgress, setRecitingProgress] = useState<{
    bookTitle: string;
    verseRef: string;
    verseTitle: string;
    currentIndex: number;
    totalCount: number;
  } | null>(null);
  const speakingAbortRef = useRef(false);

  useEffect(() => {
    return () => {
      speakingAbortRef.current = true;
      stopTTS();
    };
  }, []);

  const handleToggleSpeakAll = useCallback(async () => {
    if (isSpeakingAll) {
      speakingAbortRef.current = true;
      stopTTS();
      setIsSpeakingAll(false);
      setRecitingProgress(null);
      return;
    }

    const targetList = filteredVerses.length > 0 ? filteredVerses : verses;
    if (targetList.length === 0) return;

    setIsSpeakingAll(true);
    speakingAbortRef.current = false;

    // 1. Group target verses by Book (서재 분류)
    const bookMap = new Map<string, ReBibleVerse[]>();
    targetList.forEach((v) => {
      const b = v.bookTitle || '지혜의 서';
      if (!bookMap.has(b)) bookMap.set(b, []);
      bookMap.get(b)!.push(v);
    });

    // 2. Sort Books by Canonical Scripture Order
    const orderedBooks = Array.from(bookMap.entries()).sort(([a], [b]) => {
      const orderA = CANONICAL_BOOKS_ORDER[a]?.order ?? 99;
      const orderB = CANONICAL_BOOKS_ORDER[b]?.order ?? 99;
      return orderA - orderB;
    });

    // 3. Within each Book, sort verses from OLDEST to NEWEST (오래된 순서부터)
    const preparedGroups = orderedBooks.map(([bookTitle, bVerses]) => {
      const sorted = [...bVerses].sort((a, b) => {
        const timeA = new Date(a.recordedAt || 0).getTime();
        const timeB = new Date(b.recordedAt || 0).getTime();
        if (timeA !== timeB) return timeA - timeB; // Oldest first
        return (a.verseNumber || 0) - (b.verseNumber || 0);
      });
      const meta = CANONICAL_BOOKS_ORDER[bookTitle] || {
        order: 99,
        subtitle: '인생 여정 및 영적 성찰',
        icon: '📖'
      };
      return { bookTitle, meta, verses: sorted };
    });

    const totalReciteCount = targetList.length;
    let globalIndex = 0;

    try {
      // (1) Introductory Holy Annunciation
      const introScript = `삶의 인생 경전, 리바이블 성서 낭독을 시작합니다. 총 ${preparedGroups.length}권의 서와, ${totalReciteCount}편의 지혜를 오래된 말씀부터 차례대로 낭독합니다.`;
      setRecitingProgress({
        bookTitle: '리바이블 인생 경전',
        verseRef: '서문',
        verseTitle: '성서 낭독 개시',
        currentIndex: 0,
        totalCount: totalReciteCount
      });
      await playTTS(introScript, 'Kore', true);

      // (2) Recite each Book and its verses in chronological sequence (성경 낭독 스타일)
      for (let bIdx = 0; bIdx < preparedGroups.length; bIdx++) {
        if (speakingAbortRef.current) break;
        const group = preparedGroups[bIdx];

        // Book Header Announcement (e.g. "제 1권. 운명의 서. 삶의 타이밍과 영적 이정표. 총 2절의 말씀입니다.")
        const bookAnnounce = `제 ${bIdx + 1}권. ${group.bookTitle}. ${group.meta.subtitle}. 총 ${group.verses.length}절의 말씀입니다.`;
        setRecitingProgress({
          bookTitle: group.bookTitle,
          verseRef: `제 ${bIdx + 1}권`,
          verseTitle: group.meta.subtitle,
          currentIndex: globalIndex,
          totalCount: totalReciteCount
        });
        await playTTS(bookAnnounce, 'Kore', true);

        // Verses within this book
        for (let vIdx = 0; vIdx < group.verses.length; vIdx++) {
          if (speakingAbortRef.current) break;
          globalIndex++;
          const v = group.verses[vIdx];

          const cleanFact = cleanScriptureText(v.fact);
          const cleanInsight = cleanScriptureText(v.insight);
          const cleanTitle = cleanScriptureText(v.title);
          const chapterNum = v.chapterNumber || 1;
          const verseNum = v.verseNumber || vIdx + 1;

          let dateAnnouncement = '';
          if (v.recordedAt) {
            const d = new Date(v.recordedAt);
            if (!isNaN(d.getTime())) {
              dateAnnouncement = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일의 기록.`;
            }
          }

          const verseScript = `제 ${chapterNum}장 ${verseNum}절. 《${cleanTitle}》. ${dateAnnouncement} 기록된 여정: ${cleanFact}. 루시의 관점, 지혜의 구절: ${cleanInsight}.`;

          setRecitingProgress({
            bookTitle: group.bookTitle,
            verseRef: `${group.bookTitle} ${chapterNum}:${verseNum}`,
            verseTitle: v.title,
            currentIndex: globalIndex,
            totalCount: totalReciteCount
          });

          await playTTS(verseScript, 'Kore', true);
        }
      }

      // (3) Concluding Blessing
      if (!speakingAbortRef.current) {
        const outroScript = `이상으로 리바이블 인생 경전 낭독을 모두 마칩니다. 기록된 모든 여정이 당신의 삶에 평화와 빛이 되기를 축복합니다.`;
        await playTTS(outroScript, 'Kore', true);
      }
    } catch (err) {
      console.warn('[ReBible] Speak all recitation finished or interrupted:', err);
    } finally {
      setIsSpeakingAll(false);
      setRecitingProgress(null);
    }
  }, [isSpeakingAll, filteredVerses, verses]);

  return (
    <div className="h-app-full w-full flex flex-col relative font-sans selection:bg-[#EADDC6] bg-[#FAF6EE] text-stone-900 overflow-hidden">
      {/* Sanctuary Top Header (Fixed Parchment Theme) */}
      <ReBibleHeader
        viewMode={viewMode}
        setViewMode={setViewMode}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onBackToPrism={() => navigate('/')}
        onNavigateToLucy={() => navigate('/chat')}
        totalVersesCount={verses.length}
        onOpenCalendar={() => setIsCalendarOpen(true)}
        onExportBookletPDF={() => exportLibraryAsBookletPDF(verses, userDisplayName)}
        isSpeakingAll={isSpeakingAll}
        onToggleSpeakAll={handleToggleSpeakAll}
      />

      {/* Floating Audio Playback Pill when reciting scripture */}
      {isSpeakingAll && recitingProgress && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-32px)] p-3 rounded-2xl bg-[#3D2614] text-[#FAF5EB] shadow-2xl border border-amber-500/40 backdrop-blur-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center animate-pulse shrink-0 shadow-xs">
              <Volume2 size={16} />
            </div>
            <div className="truncate">
              <div className="text-[10px] font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles size={11} className="fill-amber-300" />
                <span>성경식 연속 낭독 중 ({recitingProgress.currentIndex}/{recitingProgress.totalCount})</span>
                <span className="text-[10px] text-stone-300">• {recitingProgress.bookTitle}</span>
              </div>
              <p className="text-xs font-serif font-bold text-white truncate">
                {recitingProgress.verseRef} 《{recitingProgress.verseTitle}》
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleSpeakAll}
            className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition active:scale-95 flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <VolumeX size={13} />
            <span>중지</span>
          </button>
        </div>
      )}

      {/* Main Content Layout with smooth scrolling */}
      <main data-app-scroll-root className="flex-1 w-full overflow-x-hidden overflow-y-auto no-scrollbar scroll-smooth relative z-10">
        <div className="max-w-5xl w-full mx-auto px-3 sm:px-6 py-3 sm:py-4 space-y-4 pb-2 sm:pb-3">
          {/* Body View: Timeline vs Bookshelf */}
          {viewMode === 'timeline' ? (
            <ReBibleTimelineView
              verses={filteredVerses}
              selectedDateStr={selectedDateStr}
              onSelectDate={(newDate) => setSelectedDateStr(newDate)}
              onOpenCalendar={() => setIsCalendarOpen(true)}
              onToggleFavorite={handleToggleFavorite}
              onAddAnnotation={(verse) => {
                setTargetAnnotationVerse(verse);
                setIsAnnotationOpen(true);
              }}
              onDeleteVerse={handleDeleteVerse}
              onDeleteAnnotation={handleDeleteAnnotation}
            />
          ) : (
            <ReBibleBookshelfView
              verses={filteredVerses}
              onToggleFavorite={handleToggleFavorite}
              onAddAnnotation={(verse) => {
                setTargetAnnotationVerse(verse);
                setIsAnnotationOpen(true);
              }}
              onDeleteVerse={handleDeleteVerse}
              onDeleteAnnotation={handleDeleteAnnotation}
            />
          )}

          {/* Today's Auto-Compiled Footprints Banner (Placed at the bottom) */}
          <ReBibleSyncEchoBanner
            draft={syncEchoDraft}
            onRefreshSyncEcho={handleRefreshSyncEcho}
          />
        </div>
      </main>

      {/* Calendar Modal (달력으로 일자별 기록 및 성찰 시점 탐색) */}
      <ReBibleCalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        selectedDateStr={selectedDateStr}
        onSelectDate={(newDate) => setSelectedDateStr(newDate)}
        verses={verses}
      />

      {/* Annotation Modal (시간을 건너온 성찰 주석) */}
      <ReBibleAnnotationModal
        verse={targetAnnotationVerse}
        isOpen={isAnnotationOpen}
        onClose={() => {
          setIsAnnotationOpen(false);
          setTargetAnnotationVerse(null);
        }}
        onSaveAnnotation={handleSaveAnnotation}
      />
    </div>
  );
}
