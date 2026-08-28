import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'wouter';
import { useApp } from '@/contexts/AppContext';
import { safeLocalStorage, safeSessionStorage } from '@/utils/safeStorage';
import { 
  ReBibleVerse, 
  ReBibleAnnotation, 
  SacredAtmosphere, 
  ReBibleStats 
} from '@/types/rebible';
import { 
  subscribeToReBibleVerses, 
  saveVerseToFirestore, 
  deleteVerseFromFirestore, 
  saveLocalVerses,
  calculateReBibleStats,
  DEFAULT_SACRED_VERSES
} from '@/lib/rebibleStorage';
import { ReBibleHeader } from '@/components/rebible/ReBibleHeader';
import { ReBibleTimelineView } from '@/components/rebible/ReBibleTimelineView';
import { ReBibleBookshelfView } from '@/components/rebible/ReBibleBookshelfView';
import { ReBibleVersingModal } from '@/components/rebible/ReBibleVersingModal';
import { ReBibleAnnotationModal } from '@/components/rebible/ReBibleAnnotationModal';
import { ReBibleDailyContemplationModal } from '@/components/rebible/ReBibleDailyContemplationModal';
import { ReBibleStatsModal } from '@/components/rebible/ReBibleStatsModal';
import { ReBibleSyncEchoModal } from '@/components/rebible/ReBibleSyncEchoModal';
import { ReBibleSyncEchoBanner } from '@/components/rebible/ReBibleSyncEchoBanner';
import { buildTodaySyncEchoDraft, SyncEchoDraft } from '@/lib/rebibleSyncEcho';
import { FloatingParticles } from '@/components/FloatingParticles';

const ATMOSPHERE_KEY = 'prism_rebible_atmosphere_v2';

export default function HandbookStandalonePage() {
  const [, navigate] = useLocation();
  const { firebaseUser } = useApp();

  // Atmosphere State (Sanctuary / Parchment / Candlelight)
  const [atmosphere, setAtmosphere] = useState<SacredAtmosphere>(() => {
    if (typeof window !== 'undefined') {
      const saved = safeLocalStorage.getItem(ATMOSPHERE_KEY) as SacredAtmosphere;
      if (saved && ['sanctuary', 'parchment', 'candlelight'].includes(saved)) {
        return saved;
      }
    }
    return 'sanctuary';
  });

  const handleSetAtmosphere = useCallback((atm: SacredAtmosphere) => {
    setAtmosphere(atm);
    safeLocalStorage.setItem(ATMOSPHERE_KEY, atm);
  }, []);

  // View Mode: timeline vs bookshelf
  const [viewMode, setViewMode] = useState<'timeline' | 'bookshelf'>('timeline');
  const [searchQuery, setSearchQuery] = useState('');

  // Verses state synced via Firestore & LocalStorage
  const [verses, setVerses] = useState<ReBibleVerse[]>(() => DEFAULT_SACRED_VERSES);

  // Modals state
  const [isVersingOpen, setIsVersingOpen] = useState(false);
  const [isSyncEchoOpen, setIsSyncEchoOpen] = useState(false);
  const [editingVerse, setEditingVerse] = useState<ReBibleVerse | null>(null);
  const [isAnnotationOpen, setIsAnnotationOpen] = useState(false);
  const [targetAnnotationVerse, setTargetAnnotationVerse] = useState<ReBibleVerse | null>(null);
  const [isContemplationOpen, setIsContemplationOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  // Sync:Echo Draft State
  const [syncEchoDraft, setSyncEchoDraft] = useState<SyncEchoDraft>(() => buildTodaySyncEchoDraft(verses));

  useEffect(() => {
    setSyncEchoDraft(buildTodaySyncEchoDraft(verses));
  }, [verses]);

  const handleRefreshSyncEcho = useCallback(() => {
    setSyncEchoDraft(buildTodaySyncEchoDraft(verses));
  }, [verses]);

  // Update Page Title, Favicon, and PWA manifest for Re:Bible
  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.title = 'Re:Bible - 삶의 서사를 재구성하는 디지털 성전';

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

  // Existing book titles for autocompletion
  const existingBooks = useMemo(() => {
    const set = new Set<string>();
    verses.forEach((v) => {
      if (v.bookTitle) set.add(v.bookTitle);
    });
    return Array.from(set);
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

  // Stats calculation
  const stats = useMemo(() => calculateReBibleStats(verses), [verses]);

  // Toggle favorite
  const handleToggleFavorite = useCallback((id: string) => {
    setVerses((prev) => {
      const updated = prev.map((v) => {
        if (v.id === id) {
          const next = { ...v, isSacredFavorite: !v.isSacredFavorite, updatedAt: new Date().toISOString() };
          saveVerseToFirestore(next);
          return next;
        }
        return v;
      });
      saveLocalVerses(updated);
      return updated;
    });
  }, []);

  // Save Verse (Create or Update)
  const handleSaveVerse = useCallback((verseData: Partial<ReBibleVerse>) => {
    setVerses((prev) => {
      let updated: ReBibleVerse[];
      const isExisting = prev.some((v) => v.id === verseData.id);

      if (isExisting) {
        updated = prev.map((v) => {
          if (v.id === verseData.id) {
            const merged: ReBibleVerse = {
              ...v,
              ...verseData,
              updatedAt: new Date().toISOString()
            } as ReBibleVerse;
            saveVerseToFirestore(merged);
            return merged;
          }
          return v;
        });
      } else {
        const newVerse: ReBibleVerse = {
          id: `verse-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          bookTitle: verseData.bookTitle || '지혜의 서',
          chapterNumber: verseData.chapterNumber || 1,
          verseNumber: verseData.verseNumber || (prev.filter(v => v.bookTitle === verseData.bookTitle).length + 1),
          reference: verseData.reference || `${verseData.bookTitle || '지혜의 서'} 1:1`,
          title: verseData.title || '삶의 통찰',
          fact: verseData.fact || '',
          insight: verseData.insight || '',
          emotions: verseData.emotions || [],
          tags: verseData.tags || [],
          annotations: [],
          isSacredFavorite: verseData.isSacredFavorite || false,
          recordedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        saveVerseToFirestore(newVerse);
        updated = [newVerse, ...prev];
      }

      saveLocalVerses(updated);
      return updated;
    });
  }, []);

  // Delete Verse
  const handleDeleteVerse = useCallback((id: string) => {
    setVerses((prev) => {
      const updated = prev.filter((v) => v.id !== id);
      deleteVerseFromFirestore(id);
      saveLocalVerses(updated);
      return updated;
    });
  }, []);

  // Add Annotation to a Verse
  const handleSaveAnnotation = useCallback((verseId: string, annotationData: { timeHorizon: string; content: string; shiftSummary?: string }) => {
    setVerses((prev) => {
      const updated = prev.map((v) => {
        if (v.id === verseId) {
          const newAnnot: ReBibleAnnotation = {
            id: `annot-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            verseId,
            writtenAt: new Date().toISOString(),
            timeHorizon: annotationData.timeHorizon,
            content: annotationData.content,
            shiftSummary: annotationData.shiftSummary
          };
          const next = {
            ...v,
            annotations: [newAnnot, ...(v.annotations || [])],
            updatedAt: new Date().toISOString()
          };
          saveVerseToFirestore(next);
          return next;
        }
        return v;
      });
      saveLocalVerses(updated);
      return updated;
    });
  }, []);

  // Delete Annotation from a Verse
  const handleDeleteAnnotation = useCallback((verseId: string, annotationId: string) => {
    setVerses((prev) => {
      const updated = prev.map((v) => {
        if (v.id === verseId) {
          const next = {
            ...v,
            annotations: (v.annotations || []).filter((a) => a.id !== annotationId),
            updatedAt: new Date().toISOString()
          };
          saveVerseToFirestore(next);
          return next;
        }
        return v;
      });
      saveLocalVerses(updated);
      return updated;
    });
  }, []);

  // Atmosphere Styles
  const isParchment = atmosphere === 'parchment';
  const isCandlelight = atmosphere === 'candlelight';

  return (
    <div className={`min-h-screen relative font-sans transition-colors duration-500 selection:bg-amber-500/30 ${
      isParchment
        ? 'bg-[#FDFBF7] text-stone-900'
        : isCandlelight
        ? 'bg-[#0a0a0a] text-zinc-100'
        : 'bg-[#030712] text-slate-100'
    }`}>
      {/* Ambient Celestial / Candlelight Background */}
      {!isParchment && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-amber-500/10 via-amber-700/5 to-transparent blur-[140px] opacity-70" />
          <FloatingParticles />
        </div>
      )}

      {/* Main Content Layout */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Sanctuary Top Header */}
        <ReBibleHeader
          atmosphere={atmosphere}
          setAtmosphere={handleSetAtmosphere}
          viewMode={viewMode}
          setViewMode={setViewMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenVersing={() => {
            setEditingVerse(null);
            setIsVersingOpen(true);
          }}
          onOpenSyncEcho={() => setIsSyncEchoOpen(true)}
          hasUnconsecratedEcho={!syncEchoDraft.isAlreadyConsecrated}
          onOpenContemplation={() => setIsContemplationOpen(true)}
          onOpenStats={() => setIsStatsOpen(true)}
          onBackToPrism={() => navigate('/')}
          totalVersesCount={verses.length}
          totalAnnotationsCount={stats.totalAnnotations}
        />

        {/* Main Body View */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6">
          {/* Sync:Echo (프리즘 활동 & 루시 지혜 자동 통합 배너) */}
          <ReBibleSyncEchoBanner
            draft={syncEchoDraft}
            atmosphere={atmosphere}
            onOpenSyncEchoModal={() => setIsSyncEchoOpen(true)}
            onRefreshSyncEcho={handleRefreshSyncEcho}
          />

          {viewMode === 'timeline' ? (
            <ReBibleTimelineView
              verses={filteredVerses}
              atmosphere={atmosphere}
              onToggleFavorite={handleToggleFavorite}
              onAddAnnotation={(v) => {
                setTargetAnnotationVerse(v);
                setIsAnnotationOpen(true);
              }}
              onEditVerse={(v) => {
                setEditingVerse(v);
                setIsVersingOpen(true);
              }}
              onDeleteVerse={handleDeleteVerse}
              onDeleteAnnotation={handleDeleteAnnotation}
              onOpenVersing={() => {
                setEditingVerse(null);
                setIsVersingOpen(true);
              }}
            />
          ) : (
            <ReBibleBookshelfView
              verses={filteredVerses}
              atmosphere={atmosphere}
              onToggleFavorite={handleToggleFavorite}
              onAddAnnotation={(v) => {
                setTargetAnnotationVerse(v);
                setIsAnnotationOpen(true);
              }}
              onEditVerse={(v) => {
                setEditingVerse(v);
                setIsVersingOpen(true);
              }}
              onDeleteVerse={handleDeleteVerse}
              onDeleteAnnotation={handleDeleteAnnotation}
              onOpenVersing={() => {
                setEditingVerse(null);
                setIsVersingOpen(true);
              }}
            />
          )}
        </main>
      </div>

      {/* Versing Modal (사건 Fact & 지혜 Insight 봉헌) */}
      <ReBibleVersingModal
        isOpen={isVersingOpen}
        onClose={() => setIsVersingOpen(false)}
        onSave={handleSaveVerse}
        editingVerse={editingVerse}
        atmosphere={atmosphere}
        existingBooks={existingBooks}
      />

      {/* Annotation Modal (시간의 주석 & 서사 재해석) */}
      <ReBibleAnnotationModal
        verse={targetAnnotationVerse}
        isOpen={isAnnotationOpen}
        onClose={() => setIsAnnotationOpen(false)}
        onSaveAnnotation={handleSaveAnnotation}
        atmosphere={atmosphere}
      />

      {/* Daily Contemplation Modal (오늘의 경전 소환) */}
      <ReBibleDailyContemplationModal
        isOpen={isContemplationOpen}
        onClose={() => setIsContemplationOpen(false)}
        verses={verses}
        atmosphere={atmosphere}
        onOpenAnnotation={(v) => {
          setTargetAnnotationVerse(v);
          setIsAnnotationOpen(true);
        }}
      />

      {/* Narrative Evolution Stats Modal */}
      <ReBibleStatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        stats={stats}
        atmosphere={atmosphere}
      />

      {/* Sync:Echo Modal (프리즘 활동 & 루시 지혜 자동 통합 및 각인) */}
      <ReBibleSyncEchoModal
        isOpen={isSyncEchoOpen}
        onClose={() => setIsSyncEchoOpen(false)}
        verses={verses}
        atmosphere={atmosphere}
        onSaveVerse={handleSaveVerse}
        onOpenVerseInDetail={(verseId) => {
          const target = verses.find((v) => v.id === verseId);
          if (target) {
            setEditingVerse(target);
            setIsVersingOpen(true);
          }
        }}
      />
    </div>
  );
}
