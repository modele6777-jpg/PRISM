import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'wouter';
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
  SyncEchoDraft 
} from '@/lib/rebibleSyncEcho';
import { exportLibraryAsBookletPDF } from '@/utils/rebibleExporter';

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
  // If today's activities from PRISM (tarot, ho'oponopono, sedona, lucy) exist and haven't been compiled yet,
  // automatically record today's verse into Re:Bible!
  useEffect(() => {
    if (syncEchoDraft.activityCount > 0 && !syncEchoDraft.isAlreadyConsecrated) {
      const newVerse = createVerseFromDraft(syncEchoDraft);
      const updated = [newVerse, ...verses.filter((v) => v.id !== newVerse.id)];
      setVerses(updated);
      saveLocalVerses(updated);
      saveVerseToFirestore(newVerse);
    }
  }, [syncEchoDraft.activityCount, syncEchoDraft.isAlreadyConsecrated]);

  const handleRefreshSyncEcho = useCallback(() => {
    const freshDraft = buildTodaySyncEchoDraft(verses);
    setSyncEchoDraft(freshDraft);
    if (freshDraft.activityCount > 0) {
      const newVerse = createVerseFromDraft(freshDraft);
      const updated = [newVerse, ...verses.filter((v) => v.id !== newVerse.id && !v.recordedAt.startsWith(freshDraft.dateKey))];
      setVerses(updated);
      saveLocalVerses(updated);
      saveVerseToFirestore(newVerse);
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
      />

      {/* Main Content Layout with smooth scrolling */}
      <main data-app-scroll-root className="flex-1 w-full overflow-x-hidden overflow-y-auto no-scrollbar scroll-smooth relative z-10">
        <div className="max-w-5xl w-full mx-auto px-3 sm:px-6 py-5 sm:py-7 space-y-5 pb-28">
          {/* Body View: Timeline vs Bookshelf */}
          {viewMode === 'timeline' ? (
            <ReBibleTimelineView
              verses={filteredVerses}
              selectedDateStr={selectedDateStr}
              onSelectDate={(newDate) => setSelectedDateStr(newDate)}
              onOpenCalendar={() => setIsCalendarOpen(true)}
              onOpenChronicle={() => setViewMode('bookshelf')}
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
              onBackToTimeline={() => setViewMode('timeline')}
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
