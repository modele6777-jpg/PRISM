import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Volume2,
  Sparkles,
  ChevronRight,
  Search,
  CheckCircle,
  Copy,
  X,
  Check,
  Pause,
  Play,
  Square,
  LocateFixed,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useLocation } from 'wouter';
import { safeSessionStorage } from '@/utils/safeStorage';
import { useNarrowPhone } from '@/hooks/useNarrowPhone';
import { isLegacyMobile } from '@/lib/perfMode';
import { FloatingParticles } from '@/components/FloatingParticles';
import {
  ALL_CHANNELS,
  HANDBOOK_DATA,
  HandbookChannel,
} from '@/data/handbookData';
import {
  handbookAudioService,
  HandbookAudioState,
} from '@/services/handbookAudioService';

export default function HandbookStandalonePage() {
  const narrow = useNarrowPhone();
  const legacy = isLegacyMobile();
  const [, navigate] = useLocation();
  const { openLucyChat, sendUnifiedMessage } = useApp();

  // Audio Service state
  const [audioState, setAudioState] = useState<HandbookAudioState>(() =>
    handbookAudioService.getState()
  );

  // Selected Channel State (supports URL query ?channel=prologue etc.)
  const [activeChannel, setActiveChannel] = useState<HandbookChannel>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('channel') as HandbookChannel;
      if (q && HANDBOOK_DATA[q]) return q;
      const pending = safeSessionStorage.getItem('prism_pending_handbook_theme') as HandbookChannel;
      if (pending && HANDBOOK_DATA[pending]) return pending;
    }
    return 'prologue';
  });

  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [copiedChapterId, setCopiedChapterId] = useState<string | null>(null);

  // 🧭 Smart Auto-Scroll Follow & User Gesture Detection
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState<boolean>(true);
  const isAutoScrollEnabledRef = useRef<boolean>(true);
  const isProgrammaticScrollingRef = useRef<boolean>(false);
  const programmaticScrollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mainScrollRef = useRef<HTMLElement | null>(null);

  const activeChannelRef = useRef<HandbookChannel>(activeChannel);
  const activeChapterIndexRef = useRef<number>(activeChapterIndex);

  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  useEffect(() => {
    activeChapterIndexRef.current = activeChapterIndex;
  }, [activeChapterIndex]);

  const currentUniverse = HANDBOOK_DATA[activeChannel] || HANDBOOK_DATA.prologue;
  const currentChapter = currentUniverse.chapters[activeChapterIndex] || currentUniverse.chapters[0];
  const currentChannelMeta = ALL_CHANNELS.find((c) => c.id === activeChannel) || ALL_CHANNELS[0];

  // When user actively touches, wheels, drags or scrolls manually: immediately release auto-follow!
  const handleUserManualGesture = useCallback(() => {
    // 1. Cancel any active programmatic scroll locks/timers
    if (programmaticScrollTimerRef.current) {
      clearTimeout(programmaticScrollTimerRef.current);
      programmaticScrollTimerRef.current = null;
    }
    isProgrammaticScrollingRef.current = false;

    // 2. If auto-scroll was active, immediately pause it so user can read freely
    if (isAutoScrollEnabledRef.current) {
      isAutoScrollEnabledRef.current = false;
      setIsAutoScrollEnabled(false);
    }
  }, []);

  // Helper to scroll to active segment DOM element smoothly
  const scrollToActiveSegment = useCallback((domId?: string, retryCount = 0) => {
    if (typeof window === 'undefined' || !domId) return;
    if (!isAutoScrollEnabledRef.current) return;

    isProgrammaticScrollingRef.current = true;
    if (programmaticScrollTimerRef.current) {
      clearTimeout(programmaticScrollTimerRef.current);
    }
    programmaticScrollTimerRef.current = setTimeout(() => {
      isProgrammaticScrollingRef.current = false;
      programmaticScrollTimerRef.current = null;
    }, 600);

    const el = document.getElementById(domId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (retryCount < 3) {
      setTimeout(() => {
        if (isAutoScrollEnabledRef.current) {
          scrollToActiveSegment(domId, retryCount + 1);
        }
      }, 70 * (retryCount + 1));
    }
  }, []);

  // Update Page Title, Favicon, and PWA manifest dynamically for Handbook
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'PRISM 핸드북 & 바이블 (PRISM HANDBOOK & BIBLE)';

    const appleIcons = document.querySelectorAll(
      'link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]'
    ) as NodeListOf<HTMLLinkElement>;
    const prevAppleHrefs: string[] = [];
    appleIcons.forEach((iconTag) => {
      prevAppleHrefs.push(iconTag.href);
      iconTag.href = '/apple-touch-icon-handbook.png';
    });

    const favicons = document.querySelectorAll(
      'link[rel="icon"], link[rel="shortcut icon"]'
    ) as NodeListOf<HTMLLinkElement>;
    const prevFaviconHrefs: string[] = [];
    favicons.forEach((favTag) => {
      prevFaviconHrefs.push(favTag.href);
      favTag.href = '/handbook-icon-192.png';
    });

    const appleTitleTag = document.querySelector(
      'meta[name="apple-mobile-web-app-title"]'
    ) as HTMLMetaElement | null;
    const prevAppleTitle = appleTitleTag ? appleTitleTag.getAttribute('content') : null;
    if (appleTitleTag) {
      appleTitleTag.setAttribute('content', '프리즘핸드북');
    }

    const manifestTag = document.querySelector(
      'link[rel="manifest"]'
    ) as HTMLLinkElement | null;
    const prevManifestHref = manifestTag ? manifestTag.getAttribute('href') : null;
    if (manifestTag) {
      manifestTag.setAttribute('href', '/manifest-handbook.webmanifest');
    }

    return () => {
      document.title = prevTitle;
      appleIcons.forEach((iconTag, idx) => {
        if (prevAppleHrefs[idx]) iconTag.href = prevAppleHrefs[idx];
      });
      favicons.forEach((favTag, idx) => {
        if (prevFaviconHrefs[idx]) favTag.href = prevFaviconHrefs[idx];
      });
      if (appleTitleTag && prevAppleTitle) {
        appleTitleTag.setAttribute('content', prevAppleTitle);
      }
      if (manifestTag && prevManifestHref) {
        manifestTag.setAttribute('href', prevManifestHref);
      }
    };
  }, []);

  // Handle pending channel from other sub-apps or URL query
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlChannel = params.get('channel') as HandbookChannel;
      const urlChapter = params.get('chapter');
      if (urlChannel && HANDBOOK_DATA[urlChannel]) {
        setActiveChannel(urlChannel);
        if (urlChapter !== null) {
          const chNum = parseInt(urlChapter, 10);
          if (!isNaN(chNum)) setActiveChapterIndex(chNum);
        }
        return;
      }

      const pending = safeSessionStorage.getItem('prism_pending_handbook_theme') as HandbookChannel;
      if (pending && HANDBOOK_DATA[pending]) {
        safeSessionStorage.removeItem('prism_pending_handbook_theme');
        setActiveChannel(pending);
      }
    } catch (_) {}
  }, []);

  // Subscribe to handbookAudioService
  useEffect(() => {
    return handbookAudioService.subscribe((state) => {
      setAudioState(state);

      if (state.isPlaying && state.activeSegment) {
        const seg = state.activeSegment;

        // ONLY automatically switch channel/chapter and scroll IF auto-scroll is enabled!
        if (isAutoScrollEnabledRef.current) {
          const isDifferentChannel = seg.channel !== activeChannelRef.current;
          const isDifferentChapter = seg.chapterIndex !== activeChapterIndexRef.current;

          if (isDifferentChannel) {
            setActiveChannel(seg.channel);
          }
          if (isDifferentChapter || isDifferentChannel) {
            setActiveChapterIndex(seg.chapterIndex);
          }

          if (seg.domId) {
            const delay = isDifferentChannel || isDifferentChapter ? 100 : 30;
            setTimeout(() => {
              if (isAutoScrollEnabledRef.current && seg.domId) {
                scrollToActiveSegment(seg.domId);
              }
            }, delay);
          }
        }
      }
    });
  }, [scrollToActiveSegment]);

  // Keep ref in sync
  useEffect(() => {
    isAutoScrollEnabledRef.current = isAutoScrollEnabled;
  }, [isAutoScrollEnabled]);

  // When changing channel
  const handleSelectChannel = (ch: HandbookChannel) => {
    // If user navigates away from currently playing channel, pause auto-scroll so user can read freely
    if (audioState.isPlaying && audioState.activeSegment?.channel !== ch) {
      isAutoScrollEnabledRef.current = false;
      setIsAutoScrollEnabled(false);
    }
    setActiveChannel(ch);
    setActiveChapterIndex(0);
    setSearchQuery('');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('channel', ch);
      window.history.replaceState({}, '', url.toString());
    }
  };

  // When clicking chapter from sidebar
  const handleSelectChapter = (idx: number) => {
    // If user navigates away from currently playing chapter, pause auto-scroll
    if (
      audioState.isPlaying &&
      (activeChannel !== audioState.activeSegment?.channel ||
        idx !== audioState.activeSegment?.chapterIndex)
    ) {
      isAutoScrollEnabledRef.current = false;
      setIsAutoScrollEnabled(false);
    }
    setActiveChapterIndex(idx);
  };

  // Detect manual user scrolls to pause auto-follow
  const handleMainUserScroll = useCallback(() => {
    if (!audioState.isPlaying) return;
    if (isProgrammaticScrollingRef.current) return;

    if (isAutoScrollEnabledRef.current) {
      isAutoScrollEnabledRef.current = false;
      setIsAutoScrollEnabled(false);
    }
  }, [audioState.isPlaying]);

  // Full 7-Channel Grand Audiobook
  const handleToggleAllHandbookAudiobook = () => {
    if (audioState.activePlaybackMode === 'all') {
      handbookAudioService.togglePlayPause();
    } else {
      isAutoScrollEnabledRef.current = true;
      setIsAutoScrollEnabled(true);
      handbookAudioService.startGrandAudiobook();
    }
  };

  // Single Channel Complete Audiobook
  const handleToggleChannelAudiobook = (channelKey: HandbookChannel = activeChannel) => {
    if (
      audioState.activePlaybackMode === 'channel' &&
      audioState.activeSegment?.channel === channelKey
    ) {
      handbookAudioService.togglePlayPause();
    } else {
      setActiveChannel(channelKey);
      isAutoScrollEnabledRef.current = true;
      setIsAutoScrollEnabled(true);
      handbookAudioService.startChannelAudiobook(channelKey);
    }
  };

  // Single Chapter In-Depth Detailed Narration
  const handleToggleChapterAudiobook = (
    channelKey: HandbookChannel = activeChannel,
    chapterIdx: number = activeChapterIndex
  ) => {
    if (
      audioState.activePlaybackMode === 'chapter' &&
      audioState.activeSegment?.channel === channelKey &&
      audioState.activeSegment?.chapterIndex === chapterIdx
    ) {
      handbookAudioService.togglePlayPause();
    } else {
      setActiveChannel(channelKey);
      setActiveChapterIndex(chapterIdx);
      isAutoScrollEnabledRef.current = true;
      setIsAutoScrollEnabled(true);
      handbookAudioService.startChapterAudiobook(channelKey, chapterIdx);
    }
  };

  // Direct ask to Lucy Pro
  const handleConsultLucy = (question: string, personaTarget: string) => {
    openLucyChat(personaTarget);
    sendUnifiedMessage(question, personaTarget as any);
  };

  // Copy current chapter text
  const handleCopyChapter = () => {
    const lines: string[] = [];
    lines.push(`[PRISM ${currentChannelMeta.name} 핸드북] ${currentChapter.title}`);
    lines.push(`설명: ${currentChapter.description}`);
    currentChapter.sections.forEach((sec, idx) => {
      lines.push(`${idx + 1}. ${sec.title}`);
      if (sec.details) lines.push(sec.details);
      if (sec.principles) sec.principles.forEach((p) => lines.push(`- ${p}`));
    });
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedChapterId(currentChapter.id);
    setTimeout(() => setCopiedChapterId(null), 2000);
  };

  // Filtered sections based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return currentChapter.sections;
    const q = searchQuery.toLowerCase();
    return currentChapter.sections.filter((sec) => {
      const matchTitle = sec.title.toLowerCase().includes(q);
      const matchDetails = sec.details?.toLowerCase().includes(q);
      const matchPrinciples = sec.principles?.some((p) => p.toLowerCase().includes(q));
      return matchTitle || matchDetails || matchPrinciples;
    });
  }, [currentChapter, searchQuery]);

  // Filtered coaching questions based on search query
  const filteredCoachingQuestions = useMemo(() => {
    if (!currentChapter.coachingQuestions) return [];
    if (!searchQuery.trim()) return currentChapter.coachingQuestions;
    const q = searchQuery.toLowerCase();
    return currentChapter.coachingQuestions.filter((cq) => {
      const matchCategory = cq.category.toLowerCase().includes(q);
      const matchQuestion = cq.question.toLowerCase().includes(q);
      return matchCategory || matchQuestion;
    });
  }, [currentChapter, searchQuery]);

  return (
    <div className="h-app-full w-full flex flex-col bg-[#05010a] text-white select-text overflow-hidden font-sans relative">
      {/* Background Ambience & Floating Galaxy Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {!legacy && <FloatingParticles count={narrow ? 6 : 22} />}
        <div
          className="absolute -top-40 -left-40 w-[450px] h-[450px] rounded-full blur-[150px] pointer-events-none transition-all duration-700"
          style={{ background: currentChannelMeta.glowColor }}
        />
        <div className="absolute -bottom-40 -right-40 w-[450px] h-[450px] rounded-full bg-purple-600/10 blur-[150px] pointer-events-none" />
        <div
          className="fixed inset-0 pointer-events-none opacity-[0.035]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '36px 36px',
          }}
        />
      </div>

      {/* 🌟 PRO Top Header Bar */}
      <header
        style={{ paddingTop: 'max(14px, calc(env(safe-area-inset-top, 0px) + 10px))' }}
        className="w-full px-3.5 sm:px-8 lg:px-12 pb-3 bg-black/75 backdrop-blur-xl border-b border-white/10 shadow-xs flex flex-col gap-2.5 z-40 shrink-0 relative"
      >
        <div className="flex items-center justify-between gap-2 min-w-0">
          {/* Brand Logo & Tagline & Home Button */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-all flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer active:scale-95 shadow-xs"
              title="프리즘 메인 홈으로 돌아가기"
            >
              <ArrowLeft size={15} />
              <span className="hidden sm:inline">프리즘 홈</span>
            </button>

            <div className="relative group">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center text-white shadow-sm font-bold text-base sm:text-lg shrink-0 ring-2 ring-amber-400/30 group-hover:scale-105 transition-transform">
                📖
              </div>
              <span
                className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-black ring-1 ring-emerald-300 animate-pulse"
                title="PRISM 핸드북 지혜 엔진 실시간 온라인"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                  HANDBOOK PRO
                </h1>
                <span className="text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full font-mono shadow-xs shrink-0 tracking-wider bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-black">
                  바이블 가이드
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-white/50 font-medium truncate">
                {currentChannelMeta.tagline}
              </p>
            </div>
          </div>

          {/* Right Action Tools: Search, All Channels Audiobook, Channel Audiobook, Copy */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* 🔍 Search Toggle */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isSearchOpen
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                  : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10'
              }`}
              title="핸드북 지혜 검색"
            >
              <Search size={15} />
            </button>

            {/* 🌟 7대 채널 전체 완독 낭독 Button */}
            <button
              type="button"
              onClick={handleToggleAllHandbookAudiobook}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer shrink-0 ${
                audioState.activePlaybackMode === 'all'
                  ? audioState.isPaused
                    ? 'bg-amber-500/30 text-amber-200 border border-amber-400/60 ring-1 ring-amber-400 font-bold'
                    : 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-black border border-amber-300 ring-2 ring-amber-400/50 animate-pulse font-black'
                  : 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-200 border border-amber-400/40 hover:border-amber-400/60'
              }`}
              title={
                audioState.activePlaybackMode === 'all'
                  ? audioState.isPaused
                    ? '7대 채널 완독 이어듣기'
                    : '7대 채널 완독 일시정지'
                  : '프롤로그부터 에필로그까지 7대 전 채널 모든 챕터 연속 완독 낭독 듣기'
              }
            >
              {audioState.activePlaybackMode === 'all' ? (
                audioState.isPaused ? (
                  <>
                    <Play size={13} className="text-amber-300 translate-x-0.5" />
                    <span className="truncate max-w-[90px] sm:max-w-none">완독 이어듣기</span>
                  </>
                ) : (
                  <>
                    <Pause size={13} className="text-black" />
                    <span className="truncate max-w-[90px] sm:max-w-none">완독 일시정지</span>
                  </>
                )
              ) : (
                <>
                  <Sparkles size={13} className="text-amber-300" />
                  <span className="truncate max-w-[90px] sm:max-w-none">7대 채널 완독</span>
                </>
              )}
            </button>

            {/* 🎙️ 현재 채널 전체 낭독 Button */}
            <button
              type="button"
              onClick={() => handleToggleChannelAudiobook(activeChannel)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer shrink-0 ${
                audioState.activePlaybackMode === 'channel' &&
                audioState.activeSegment?.channel === activeChannel
                  ? audioState.isPaused
                    ? `${currentChannelMeta.bgActive} border ${currentChannelMeta.borderActive} ring-1 ring-white/20`
                    : `${currentChannelMeta.bgActive} border ${currentChannelMeta.borderActive} ring-2 ring-white/30 animate-pulse`
                  : 'bg-white/10 hover:bg-white/15 text-white/90 border border-white/15 hover:border-white/30'
              }`}
              title={
                audioState.activePlaybackMode === 'channel' &&
                audioState.activeSegment?.channel === activeChannel
                  ? audioState.isPaused
                    ? `${currentChannelMeta.name} 채널 낭독 이어듣기`
                    : `${currentChannelMeta.name} 채널 낭독 일시정지`
                  : `현재 ${currentChannelMeta.name} 채널의 모든 챕터와 세부 원리 연속 낭독 듣기`
              }
            >
              {audioState.activePlaybackMode === 'channel' &&
              audioState.activeSegment?.channel === activeChannel ? (
                audioState.isPaused ? (
                  <>
                    <Play size={13} className={currentChannelMeta.textActive} />
                    <span className="truncate max-w-[80px] sm:max-w-none">채널 이어듣기</span>
                  </>
                ) : (
                  <>
                    <Pause size={13} className={currentChannelMeta.textActive} />
                    <span className="truncate max-w-[80px] sm:max-w-none">채널 일시정지</span>
                  </>
                )
              ) : (
                <>
                  <Volume2 size={14} className="text-white/80" />
                  <span className="truncate max-w-[80px] sm:max-w-none">
                    {currentChannelMeta.shortName} 낭독
                  </span>
                </>
              )}
            </button>

            {/* 📋 Copy Chapter Wisdom */}
            <button
              type="button"
              onClick={handleCopyChapter}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 text-xs font-semibold transition-all cursor-pointer hidden xs:flex items-center justify-center"
              title="현재 챕터 지혜 복사"
            >
              {copiedChapterId === currentChapter.id ? (
                <Check size={15} className="text-emerald-400 animate-scale" />
              ) : (
                <Copy size={15} />
              )}
            </button>
          </div>
        </div>

        {/* 🔍 Search Input Dropdown */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-xl px-3 py-1.5 focus-within:border-amber-400 focus-within:bg-white/10 transition-all">
                <Search size={14} className="text-white/40 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="핸드북 지혜 검색 (키워드 입력)..."
                  className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-white/40 outline-none"
                  autoFocus
                />
                {searchQuery && (
                  <span className="text-[11px] font-medium text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                    {filteredSections.length}개 발견
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }}
                  className="text-white/40 hover:text-white p-1 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🎛️ 7 Rainbow Booster Channels Bar (Clean Navigation Tabs) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 -mb-1">
          {ALL_CHANNELS.map((ch) => {
            const isActive = activeChannel === ch.id;
            const Icon = ch.icon;

            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => handleSelectChannel(ch.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs active:scale-95 group ${
                  isActive
                    ? `${ch.bgActive} border ${ch.borderActive} font-black shadow-sm`
                    : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white/60'
                }`}
                title={`${ch.name} 채널로 이동`}
              >
                <div
                  className={`w-2 h-2 rounded-full transition-all ${
                    isActive ? `${ch.dotColor} animate-pulse scale-110` : 'bg-white/20'
                  }`}
                />
                <Icon size={13} className={isActive ? ch.textActive : 'text-white/40'} />
                <span>{ch.shortName}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* 📖 Standalone Dual-Pane Body Area */}
      <div className="flex-1 w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto flex flex-col md:flex-row overflow-hidden relative z-10">
        {/* Left Sidebar: Chapter Pills */}
        <aside className="w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-white/10 bg-white/[0.01] backdrop-blur-md overflow-x-auto md:overflow-y-auto no-scrollbar p-2.5 sm:p-4 flex md:flex-col gap-1.5 sm:gap-2 shrink-0">
          <div className="hidden md:flex items-center justify-between pb-2 border-b border-white/10 mb-1">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-mono">
              CHAPTERS
            </span>
            <span className="text-[10px] font-mono text-amber-300/80 font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
              {currentUniverse.chapters.length}개 챕터
            </span>
          </div>

          {currentUniverse.chapters.map((chap, idx) => {
            const isChapActive = activeChapterIndex === idx;
            const isChapPlaying =
              audioState.activeSegment?.channel === activeChannel &&
              audioState.activeSegment?.chapterIndex === idx;
            return (
              <button
                key={chap.id}
                type="button"
                onClick={() => {
                  handleSelectChapter(idx);
                }}
                className={`flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl text-left transition-all shrink-0 md:shrink md:w-full cursor-pointer relative ${
                  isChapActive
                    ? 'bg-white/15 border border-white/20 text-white shadow-lg shadow-black/40'
                    : 'bg-white/[0.02] hover:bg-white/[0.06] text-white/50 border border-transparent'
                } ${isChapPlaying ? 'ring-1 ring-amber-400/50' : ''}`}
              >
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                    isChapPlaying
                      ? 'bg-amber-400 text-black font-black animate-pulse shadow-md'
                      : isChapActive
                      ? 'bg-white text-black font-black shadow-md'
                      : 'bg-white/5 text-white/40'
                  }`}
                >
                  {isChapPlaying ? <Volume2 size={13} className="text-black" /> : chap.roman}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{chap.title}</div>
                  <div className="text-[10px] text-white/40 truncate mt-0.5 hidden md:block">
                    {chap.shortLabel}
                  </div>
                </div>

                <ChevronRight
                  size={15}
                  className={`hidden md:block transition-transform shrink-0 ${
                    isChapActive ? 'text-white translate-x-1' : 'text-white/20'
                  }`}
                />
              </button>
            );
          })}
        </aside>

        {/* Right Main Reading Content */}
        <main
          data-app-scroll-root
          ref={(el) => {
            mainScrollRef.current = el;
          }}
          onTouchStart={handleUserManualGesture}
          onTouchMove={handleUserManualGesture}
          onWheel={handleUserManualGesture}
          onPointerDown={handleUserManualGesture}
          onScroll={handleMainUserScroll}
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 no-scrollbar space-y-5 w-full select-text pb-32 scroll-smooth"
        >
          {/* Epigraph Charter Card */}
          {(() => {
            const isSpeakingIntro =
              audioState.activeSegment?.domId === 'handbook-epigraph-card' &&
              audioState.activeSegment?.channel === activeChannel;

            return (
              <div
                id="handbook-epigraph-card"
                className={`p-5 sm:p-6 rounded-3xl transition-all duration-300 space-y-2 relative overflow-hidden shadow-xl ${
                  isSpeakingIntro
                    ? 'bg-amber-500/[0.12] border-2 border-amber-400/80 ring-4 ring-amber-400/30 shadow-[0_0_35px_rgba(251,191,36,0.35)] scale-[1.01]'
                    : 'bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent border border-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <Sparkles size={14} className="text-amber-400 animate-pulse" />
                    <span>{currentUniverse.title}</span>
                  </div>
                  {isSpeakingIntro && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md animate-pulse">
                      <Volume2 size={11} className="fill-black" />
                      <span>서문 낭독 중</span>
                    </span>
                  )}
                </div>
                <p className="text-sm sm:text-base font-serif italic text-white/90 leading-relaxed">
                  "{currentUniverse.epigraph}"
                </p>
                <p className="text-[10px] text-white/40 font-mono text-right">
                  — {currentUniverse.source} · {currentUniverse.author}
                </p>
              </div>
            );
          })()}

          {/* Chapter Header with Dedicated Chapter Audio Button */}
          {(() => {
            const isSpeakingHeader =
              audioState.activeSegment?.domId === 'handbook-chapter-overview' &&
              audioState.activeSegment?.channel === activeChannel &&
              audioState.activeSegment?.chapterIndex === activeChapterIndex;

            return (
              <div
                id="handbook-chapter-overview"
                className={`space-y-1.5 border-b pb-4 rounded-2xl p-3 transition-all duration-300 ${
                  isSpeakingHeader
                    ? 'border-amber-400/80 bg-amber-500/[0.12] ring-4 ring-amber-400/30 shadow-[0_0_35px_rgba(251,191,36,0.35)] scale-[1.01]'
                    : 'border-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-xs font-mono font-bold text-white/70">
                      Chapter {currentChapter.roman}
                    </span>
                    <span className="text-xs font-bold text-white/40 uppercase tracking-widest">
                      {currentChapter.shortLabel}
                    </span>
                    {isSpeakingHeader && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md animate-pulse">
                        <Volume2 size={11} className="fill-black" />
                        <span>개요 낭독 중</span>
                      </span>
                    )}
                  </div>

                  {/* 📖 Dedicated Chapter Audio Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleChapterAudiobook(activeChannel, activeChapterIndex)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                      audioState.activePlaybackMode === 'chapter' &&
                      audioState.activeSegment?.channel === activeChannel &&
                      audioState.activeSegment?.chapterIndex === activeChapterIndex
                        ? audioState.isPaused
                          ? 'bg-amber-500/30 text-amber-200 border border-amber-400/60 font-bold'
                          : 'bg-amber-400 text-black border border-amber-300 font-black animate-pulse'
                        : 'bg-white/10 hover:bg-white/20 text-amber-200 border border-amber-400/30'
                    }`}
                    title="현재 챕터의 모든 섹션과 핵심 원리를 상세 낭독 듣기 (클릭시 재생/일시정지)"
                  >
                    {audioState.activePlaybackMode === 'chapter' &&
                    audioState.activeSegment?.channel === activeChannel &&
                    audioState.activeSegment?.chapterIndex === activeChapterIndex ? (
                      audioState.isPaused ? (
                        <>
                          <Play size={13} className="text-amber-300" />
                          <span>챕터 이어듣기</span>
                        </>
                      ) : (
                        <>
                          <Pause size={13} className="text-black" />
                          <span>챕터 일시정지</span>
                        </>
                      )
                    ) : (
                      <>
                        <Volume2 size={13} className="text-amber-300" />
                        <span>챕터 상세 낭독</span>
                      </>
                    )}
                  </button>
                </div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-black text-white tracking-tight">
                  {currentChapter.title}
                </h2>
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed font-sans pt-1">
                  {currentChapter.description}
                </p>
              </div>
            );
          })()}

          {/* Filtered Sections List */}
          <div className="space-y-4">
            {filteredSections.map((sec, sIdx) => {
              const isSpeakingSec =
                audioState.activeSegment?.domId === `handbook-section-${sIdx}` &&
                audioState.activeSegment?.channel === activeChannel &&
                audioState.activeSegment?.chapterIndex === activeChapterIndex;

              return (
                <motion.div
                  key={sIdx}
                  id={`handbook-section-${sIdx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: sIdx * 0.05 }}
                  className={`p-5 sm:p-6 rounded-3xl backdrop-blur-xl transition-all duration-300 space-y-3 shadow-lg group relative overflow-hidden ${
                    isSpeakingSec
                      ? 'bg-amber-500/[0.12] border-2 border-amber-400/80 ring-4 ring-amber-400/30 shadow-[0_0_35px_rgba(251,191,36,0.35)] scale-[1.01]'
                      : 'bg-white/[0.03] border border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3
                          className={`text-base sm:text-lg font-bold transition-colors ${
                            isSpeakingSec
                              ? 'text-amber-300 font-black'
                              : 'text-white group-hover:text-amber-200'
                          }`}
                        >
                          {sec.title}
                        </h3>
                        {isSpeakingSec && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md animate-pulse">
                            <Volume2 size={11} className="fill-black" />
                            <span>낭독 중</span>
                          </span>
                        )}
                      </div>
                      {sec.subtitle && (
                        <p className="text-xs font-mono text-white/40 mt-0.5">{sec.subtitle}</p>
                      )}
                    </div>
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-mono font-bold shrink-0 transition-colors ${
                        isSpeakingSec
                          ? 'bg-amber-400 text-black font-black shadow-md'
                          : 'bg-white/5 border border-white/10 text-white/40'
                      }`}
                    >
                      {sIdx + 1}
                    </div>
                  </div>

                  {sec.details && (
                    <p
                      className={`text-xs sm:text-sm leading-relaxed font-sans break-keep ${
                        isSpeakingSec ? 'text-white font-medium' : 'text-white/80'
                      }`}
                    >
                      {sec.details}
                    </p>
                  )}

                  {sec.principles && sec.principles.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="text-[11px] font-bold text-white/40 uppercase tracking-wider font-mono">
                        핵심 원리 &amp; 통찰 (Principles)
                      </div>
                      <div className="space-y-1.5">
                        {sec.principles.map((pr, pIdx) => (
                          <div
                            key={pIdx}
                            className={`flex items-start gap-2.5 p-3 rounded-2xl border text-xs leading-relaxed transition-colors ${
                              isSpeakingSec
                                ? 'bg-amber-400/[0.08] border-amber-400/30 text-white'
                                : 'bg-white/[0.02] border-white/5 text-white/85'
                            }`}
                          >
                            <CheckCircle size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                            <span>{pr}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {sec.steps && sec.steps.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {sec.steps.map((st, stIdx) => (
                        <span
                          key={stIdx}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                            isSpeakingSec
                              ? 'bg-amber-400/20 text-amber-200 border-amber-400/40'
                              : 'bg-white/10 text-white/90 border border-white/10'
                          }`}
                        >
                          ✓ {st}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}

            {searchQuery.trim() &&
              filteredSections.length === 0 &&
              filteredCoachingQuestions.length === 0 && (
                <div className="p-8 text-center text-white/40 space-y-2">
                  <p className="text-sm">
                    &apos;{searchQuery}&apos;에 대한 검색 결과가 없습니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="px-3 py-1 rounded-xl bg-white/10 text-xs text-white hover:bg-white/20 transition-all cursor-pointer"
                  >
                    검색 초기화
                  </button>
                </div>
              )}
          </div>

          {/* Interactive Coaching Questions (Direct Ask to Lucy Pro) */}
          {filteredCoachingQuestions.length > 0 &&
            (() => {
              const isSpeakingCoaching =
                audioState.activeSegment?.domId === 'handbook-coaching-box' &&
                audioState.activeSegment?.channel === activeChannel &&
                audioState.activeSegment?.chapterIndex === activeChapterIndex;

              return (
                <div
                  id="handbook-coaching-box"
                  className={`space-y-3 pt-4 rounded-3xl p-3 sm:p-4 transition-all duration-300 ${
                    isSpeakingCoaching
                      ? 'bg-amber-500/[0.12] border-2 border-amber-400/80 ring-4 ring-amber-400/30 shadow-[0_0_35px_rgba(251,191,36,0.35)] scale-[1.01]'
                      : ''
                  }`}
                >
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/15 via-pink-500/10 to-amber-500/15 border border-purple-500/30 text-xs text-purple-200 leading-relaxed flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-yellow-300 animate-pulse" />
                      <span>
                        질문을 클릭하시면 <strong>루시 AI 프로</strong>와 즉시 1:1 심층 대화가 시작됩니다.
                      </span>
                    </div>
                    {isSpeakingCoaching && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md animate-pulse">
                        <Volume2 size={11} className="fill-black" />
                        <span>성찰 질문 낭독 중</span>
                      </span>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {filteredCoachingQuestions.map((cq, qIdx) => (
                      <button
                        key={qIdx}
                        type="button"
                        onClick={() => handleConsultLucy(cq.question, cq.personaTarget)}
                        className="w-full text-left p-4 rounded-3xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 hover:border-purple-400/50 transition-all duration-200 group flex items-start gap-3.5 cursor-pointer shadow-md active:scale-[0.99]"
                      >
                        <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold font-mono border border-purple-500/30">
                          {qIdx + 1}
                        </div>

                        <div className="flex-1 space-y-1">
                          <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest font-mono">
                            {cq.category}
                          </div>
                          <div className="text-xs sm:text-sm text-white group-hover:text-purple-200 font-sans leading-relaxed break-keep font-medium">
                            &ldquo;{cq.question}&rdquo;
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-[11px] font-bold text-purple-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1.5">
                          <span>질문하기</span>
                          <ChevronRight size={15} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
        </main>
      </div>

      {/* 🎧 Floating Bottom Audiobook Player Bar (Rendered when audiobook is active) */}
      <AnimatePresence>
        {audioState.activePlaybackMode !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-xl bg-black/90 backdrop-blur-2xl border border-amber-400/50 shadow-2xl rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-2.5 sm:gap-3 text-white ring-1 ring-amber-400/30"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => handbookAudioService.togglePlayPause()}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black shrink-0 shadow-md transition-transform active:scale-95 cursor-pointer ${
                  audioState.isPaused
                    ? 'bg-amber-400 text-black ring-2 ring-amber-300 scale-105 shadow-amber-400/30'
                    : 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-black animate-pulse ring-1 ring-white/30'
                }`}
                title={audioState.isPaused ? '낭독 이어듣기' : '낭독 일시정지'}
              >
                {audioState.isPaused ? (
                  <Play size={18} className="translate-x-0.5 fill-black" />
                ) : (
                  <Pause size={18} />
                )}
              </button>

              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-amber-400 text-black">
                    {audioState.activePlaybackMode === 'all'
                      ? '7대 채널 대완독'
                      : audioState.activePlaybackMode === 'channel'
                      ? `${currentChannelMeta.name} 채널 낭독`
                      : `${currentChapter.shortLabel} 챕터 낭독`}
                  </span>
                  <span className="text-[10px] text-amber-300 font-mono font-bold">
                    ({audioState.segmentProgress.current}/{audioState.segmentProgress.total})
                  </span>
                  {audioState.isPaused && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                      일시정지됨
                    </span>
                  )}
                </div>
                <div className="text-xs sm:text-sm font-bold text-white truncate max-w-[170px] sm:max-w-xs">
                  {audioState.activeSegment?.label || currentChapter.title}
                </div>
              </div>
            </div>

            {/* 🎯 Smart Auto-Follow Resync Button (Shows when user manually scrolled away) */}
            {!isAutoScrollEnabled && (
              <button
                type="button"
                onClick={() => {
                  isAutoScrollEnabledRef.current = true;
                  setIsAutoScrollEnabled(true);
                  if (audioState.activeSegment) {
                    setActiveChannel(audioState.activeSegment.channel);
                    setActiveChapterIndex(audioState.activeSegment.chapterIndex);
                    setTimeout(() => {
                      scrollToActiveSegment(audioState.activeSegment?.domId);
                    }, 50);
                  }
                }}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-400 text-black border border-amber-300 font-bold text-xs flex items-center gap-1.5 shadow-lg animate-bounce cursor-pointer active:scale-95 shrink-0"
                title="현재 낭독 중인 화면 위치로 즉시 이동하고 자동 따라가기를 다시 켭니다"
              >
                <LocateFixed size={13} className="text-black" />
                <span className="hidden sm:inline">낭독 위치로 이동</span>
                <span className="sm:hidden">위치 복귀</span>
              </button>
            )}

            {/* Stop Button Control */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handbookAudioService.stop()}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
                title="낭독 완전 정지"
              >
                <Square size={12} className="fill-rose-300" />
                <span>정지</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
