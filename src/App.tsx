import React from "react";
import { Route, Switch, Redirect, useLocation } from "wouter";
import { motion, AnimatePresence } from "motion/react";
import { LogOut, User, Volume2, VolumeX, Download, Triangle, RefreshCw, HelpCircle } from "lucide-react";

import { AppProvider, useApp } from "./contexts/AppContext";
import { LoginScreen } from "./components/LoginScreen";
import BottomNav from "./components/BottomNav";
import ErrorBoundary from "./components/ErrorBoundary";
import ReloadPrompt from "./components/ReloadPrompt";
import InstallPrompt from "./components/InstallPrompt";
import { GuideModal } from "./components/GuideModal";

import ProfileModal from "./components/ProfileModal";
import { PageLoader } from "./components/PageLoader";

import { BgMusicPlayer } from "./components/trinity/BgMusicPlayer";
import { getSharedAudioContext, initTTSAudioLifecycle, primeTTSAudioElement } from "./lib/audio";
import { shouldUsePageTransitions, shouldMountBgMusicPlayer } from "./lib/perfMode";
import AuroraBackground from "./components/AuroraBackground";
import HubHome from "./pages/HubHome";

function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return React.lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return await componentImport();
      } catch (retryError) {
        console.error("Failed to dynamically import module after retry:", retryError);
        throw retryError;
      }
    }
  });
}

const TrinityApp = lazyWithRetry(() => import("./pages/TrinityApp"));
const MuseApp = lazyWithRetry(() => import("./pages/MuseApp"));
const OrangeApp = lazyWithRetry(() => import("./pages/OrangeApp"));
const BluebirdApp = lazyWithRetry(() => import("./pages/BluebirdApp"));
const HealApp = lazyWithRetry(() => import("./pages/HealApp"));
const ProfilePage = lazyWithRetry(() => import("./pages/ProfilePage"));
const LibraryPage = lazyWithRetry(() => import("./pages/LibraryPage"));
const EpilogueApp = lazyWithRetry(() => import("./pages/EpilogueApp"));
const UnifiedChat = lazyWithRetry(() =>
  import("./components/UnifiedChat").then((m) => ({ default: m.UnifiedChat })),
);
import { resetAppScroll } from "./utils/scrollToTop";
import { useAutoPrismSync } from "./hooks/useAutoPrismSync";
import { useUpdateNotice } from "./hooks/useUpdateNotice";
import { UpdateNoticeModal } from "./components/UpdateNoticeModal";
import { PinLockScreen } from "./components/PinLockScreen";
import { UPDATE_ACK_KEY } from "./lib/updateNotice";
import { applyServiceWorkerUpdate } from "./lib/prismSync";
import { safeLocalStorage, safeSessionStorage } from "./utils/safeStorage";
import { usePinScreenLock } from "./hooks/usePinScreenLock";

const ROUTES_MAP = [
  { path: "/", Component: HubHome },
  { path: "/trinity", Component: TrinityApp },
  { path: "/muse", Component: MuseApp },
  { path: "/orange", Component: OrangeApp },
  { path: "/bluebird", Component: BluebirdApp },
  { path: "/heal", Component: HealApp },
  { path: "/epilogue", Component: EpilogueApp },
  { path: "/library", Component: LibraryPage },
  { path: "/profile", Component: ProfilePage },
];

function ActivePage({ loc }: { loc: string }) {
  const [frozenLoc] = React.useState(loc);
  return (
    <React.Suspense fallback={<PageLoader />}>
      <Switch location={frozenLoc}>
        <Route path="/"><HubHome /></Route>
        <Route path="/trinity"><TrinityApp /></Route>
        <Route path="/muse"><MuseApp /></Route>
        <Route path="/orange"><OrangeApp /></Route>
        <Route path="/bluebird"><BluebirdApp /></Route>
        <Route path="/heal"><HealApp /></Route>
        <Route path="/epilogue"><EpilogueApp /></Route>
        <Route path="/library"><LibraryPage /></Route>
        <Route path="/profile"><ProfilePage /></Route>
      </Switch>
    </React.Suspense>
  );
}

function AppContent() {
  const { firebaseUser, isAuthReady, logout, sharedState, isUnlocked, unlock, isChatOpen, syncPrismDevices } = useApp();
  const [location, navigate] = useLocation();
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [isGuideOpen, setIsGuideOpen] = React.useState(false);

  // Loading transition state with the rainbow triangle emblem
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [transitionLocation, setTransitionLocation] = React.useState(location);
  const isFirstMount = React.useRef(true);
  const usePageTransitions = shouldUsePageTransitions();

  const [checkingUpdate, setCheckingUpdate] = React.useState(false);
  const [updateMessage, setUpdateMessage] = React.useState<string | null>(null);
  const [isTarotActive, setIsTarotActive] = React.useState(false);
  const isTarotActiveRef = React.useRef(isTarotActive);
  isTarotActiveRef.current = isTarotActive;
  const isSessionBusy = React.useCallback(() => isTarotActiveRef.current, []);

  const pinScreenActive = !isUnlocked && !!firebaseUser;
  usePinScreenLock(pinScreenActive);

  React.useEffect(() => {
    const handleActive = () => setIsTarotActive(true);
    const handleInactive = () => setIsTarotActive(false);

    window.addEventListener("tarot-active", handleActive);
    window.addEventListener("tarot-inactive", handleInactive);
    window.addEventListener("special-feature-active", handleActive);
    window.addEventListener("special-feature-inactive", handleInactive);

    return () => {
      window.removeEventListener("tarot-active", handleActive);
      window.removeEventListener("tarot-inactive", handleInactive);
      window.removeEventListener("special-feature-active", handleActive);
      window.removeEventListener("special-feature-inactive", handleInactive);
    };
  }, []);

  const syncEnabled = isAuthReady && !!firebaseUser && isUnlocked;

  const { runSync, applyDeferredReload } = useAutoPrismSync({
    enabled: syncEnabled,
    sync: syncPrismDevices,
    isSessionBusy,
    onMessage: setUpdateMessage,
    onCheckingChange: setCheckingUpdate,
    stateDependency: sharedState,
  });

  const {
    isOpen: isUpdateNoticeOpen,
    entries: updateEntries,
    mode: updateNoticeMode,
    noticeKey: updateNoticeKey,
    dismiss: dismissUpdateNotice,
    showManualSyncNotice,
  } = useUpdateNotice(syncEnabled);

  const handleApplyUpdateNow = async () => {
    dismissUpdateNotice();
    setCheckingUpdate(true);
    setUpdateMessage("최신 업데이트 적용 중...");
    const reloading = await applyDeferredReload();
    if (!reloading) {
      const swState = await applyServiceWorkerUpdate();
      if (swState === 'reloading') return;
      window.setTimeout(() => window.location.reload(), 400);
    }
  };

  const handleUpdateCheck = async () => {
    const result = await runSync({ silent: false, force: true, deferReload: true });

    await showManualSyncNotice(result?.targetVersion);

    if (result) {
      safeLocalStorage.setItem(UPDATE_ACK_KEY, result.targetVersion);

      if (result.needsReload) {
        const reloading = await applyDeferredReload();
        if (!reloading) {
          setCheckingUpdate(false);
          setUpdateMessage(null);
        }
        return;
      }
    }

    setCheckingUpdate(false);
    window.setTimeout(() => setUpdateMessage(null), 3500);
  };

  React.useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setIsTarotActive(false);
    if (!usePageTransitions) {
      setTransitionLocation(location);
      setIsTransitioning(false);
      return;
    }
    setIsTransitioning(true);
    const timer = setTimeout(() => {
      setTransitionLocation(location);
      setIsTransitioning(false);
    }, 240);
    return () => clearTimeout(timer);
  }, [location, usePageTransitions]);

  React.useEffect(() => {
    if (isTransitioning) return;
    resetAppScroll();
  }, [transitionLocation, isTransitioning]);

  // Redirect unknown routes
  React.useEffect(() => {
    const validPaths = ROUTES_MAP.map(r => r.path);
    if (!validPaths.includes(location)) {
      navigate("/");
    }
  }, [location, navigate]);

  React.useEffect(() => {
    initTTSAudioLifecycle();
  }, []);

  // Global Audio Unlocker for bypassing browser autoplay restrictions
  React.useEffect(() => {
    const unlockAudio = () => {
      // 1. Warm up & unlock shared AudioContext
      try {
        const audioCtx = getSharedAudioContext();
        if (audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }
      } catch (e) {
        console.warn("[AudioUnlock] AudioContext unlock failed:", e);
      }

      // 2. Warm up & unlock HTMLAudioElement (TTS background playback)
      try {
        primeTTSAudioElement();
        const audio = new Audio();
        audio.play().catch(() => {});
      } catch (e) {
        console.warn("[AudioUnlock] HTMLAudioElement unlock failed:", e);
      }

      // Clean up event listeners once unlocked
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      console.log("[AudioUnlock] Global audio systems successfully unlocked.");
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);


  // 잠금 해제 후에만 테마 색 적용 (PIN 배경은 usePinScreenLock이 고정)
  React.useEffect(() => {
    if (!isUnlocked) return;
    if (sharedState?.themeColor) {
      document.body.style.backgroundColor = sharedState.themeColor;
      document.body.style.transition = 'background-color 2s ease-in-out';
    } else {
      document.body.style.backgroundColor = 'oklch(0.08 0.02 270)';
    }
  }, [isUnlocked, sharedState?.themeColor]);

  if (!isAuthReady) {
    return (
      <div className="h-dvh bg-[oklch(0.08_0.02_270)] flex items-center justify-center pt-safe pb-safe">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
      </div>
    );
  }

  const hasStoredAuthUid = (() => {
    try {
      return !!safeSessionStorage.getItem('prism_auth_uid');
    } catch {
      return false;
    }
  })();

  if (!firebaseUser) {
    if (hasStoredAuthUid && safeLocalStorage.getItem('developer_bypass') !== 'true') {
      return (
        <div className="h-dvh bg-[oklch(0.08_0.02_270)] flex flex-col items-center justify-center gap-3 pt-safe pb-safe">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
          <p className="text-white/30 text-[10px] tracking-widest uppercase">세션 복원 중</p>
        </div>
      );
    }
    return (
      <div className="prism-app-shell relative z-[1] bg-transparent">
        <LoginScreen />
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="prism-app-shell relative z-[1] bg-transparent">
        <PinLockScreen onUnlock={unlock} />
      </div>
    );
  }

  return (
    <div className="prism-app-shell relative z-[1] bg-transparent">
      {shouldMountBgMusicPlayer() && (
        <div className={`fixed bottom-safe-music left-4 z-[999] transition-opacity duration-200 ${isChatOpen || isTransitioning ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
          <BgMusicPlayer />
        </div>
      )}

      <div className={`prism-top-chrome fixed top-safe-2 right-2 sm:right-4 z-[999] flex items-center gap-1 sm:gap-2 transition-all duration-300 ${isTarotActive ? "opacity-0 pointer-events-none scale-90 translate-y-[-10px]" : "opacity-100"}`}>

        <button
          onClick={() => setIsGuideOpen(true)}
          className="p-1.5 rounded-full glass border border-white/10 text-white/30 hover:text-white hover:bg-white/10 transition-all shadow-xl group relative"
          title="은하 가이드북"
        >
          <HelpCircle size={13} className="text-white/40 group-hover:text-white" />
          <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-1.5 py-1 rounded bg-white/10 text-[9px] font-bold text-white/80 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Guide
          </span>
        </button>

        <button
          onClick={logout}
          className="p-1.5 rounded-full glass border border-white/10 text-white/30 hover:text-white hover:bg-white/10 transition-all shadow-xl group relative"
          title="로그아웃"
        >
          <LogOut size={13} />
          <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-1.5 py-1 rounded bg-white/10 text-[9px] font-bold text-white/80 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Logout
          </span>
        </button>

        <button
          onClick={() => setIsProfileOpen(true)}
          className="p-1.5 rounded-full glass border border-white/10 text-white/30 hover:text-white hover:bg-white/10 transition-all shadow-xl group relative"
          title="프로필 설정"
        >
          <User size={13} />
          <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-1.5 py-1 rounded bg-white/10 text-[9px] font-bold text-white/80 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Profile
          </span>
        </button>

        <button
          onClick={handleUpdateCheck}
          disabled={checkingUpdate}
          className="p-1.5 rounded-full glass border border-white/10 text-white/30 hover:text-white hover:bg-white/10 transition-all shadow-xl group relative"
          title="PC·모바일 수동 동기화 (자동 동기화 활성)"
        >
          <RefreshCw size={13} className={checkingUpdate ? "animate-spin text-yellow-400" : ""} />
          <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-1.5 py-1 rounded bg-white/10 text-[9px] font-bold text-white/80 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            {checkingUpdate ? "동기화 중" : "수동 동기화"}
          </span>
        </button>

      </div>

      {/* Floating System Update Status Toast */}
      <AnimatePresence>
        {updateMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-14 right-4 z-[9999] p-4 rounded-2xl bg-yellow-950/70 border border-yellow-500/30 text-[11px] font-bold text-yellow-400 tracking-wide shadow-[0_10px_35px_rgba(234,179,8,0.25)] backdrop-blur-xl flex items-center gap-2 max-w-xs font-sans"
          >
            <RefreshCw size={12} className="animate-spin text-yellow-400 shrink-0" />
            <span>{updateMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      <GuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      <main
        className={
        transitionLocation === '/library' || transitionLocation === '/epilogue'
          ? "flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative"
          : "flex-1 min-h-0 overflow-hidden flex flex-col relative w-full"
      }>
        <AnimatePresence mode="wait">
          <motion.div
            key={transitionLocation}
            initial={{ opacity: 0, scale: 0.98, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -12 }}
            transition={{
              duration: usePageTransitions ? 0.35 : 0.12,
              ease: usePageTransitions ? [0.16, 1, 0.3, 1] : 'easeOut',
            }}
            className="w-full h-full flex flex-col min-h-0"
          >
            <ActivePage loc={transitionLocation} />
          </motion.div>
        </AnimatePresence>

        {/* Rainbow Triangle portal transitional loader */}
        <AnimatePresence>
          {isTransitioning && usePageTransitions && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-[oklch(0.08_0.02_270)]/90 backdrop-blur-md"
            >
              <div className="flex flex-col items-center gap-6">
                <div className="relative w-24 h-24 rounded-full border border-white/10 flex items-center justify-center shadow-[0_0_25px_rgba(255,255,255,0.15)] group backdrop-blur-md bg-white/[0.02]">
                  {/* Glowing rainbow background layer */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#ff6b6b] via-[#feca57] via-[#1dd1a1] via-[#54a0ff] to-[#5f27cd] opacity-40 mix-blend-screen rounded-full animate-pulse" />
                  
                  {/* Rotating dashed border line */}
                  <motion.div 
                    animate={{ rotate: 360 }} 
                    transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "linear" }} 
                    className="absolute inset-0 rounded-full border border-dashed border-white/40" 
                  />
                  
                  {/* Inner container with the glowing triangle */}
                  <div className="absolute inset-[6px] rounded-full border border-white/5 bg-white/5 flex items-center justify-center">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.15, 1],
                        rotate: [0, 5, 0, -5, 0]
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Number.POSITIVE_INFINITY, 
                        ease: "easeInOut" 
                      }}
                    >
                      <Triangle 
                        className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,1)] -translate-y-[2px]" 
                        fill="transparent"
                        strokeWidth={2} 
                        size={28} 
                      />
                    </motion.div>
                  </div>
                </div>
                
                {/* Subtle text design */}
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 0.8, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-[10px] font-bold tracking-[0.3em] text-white/60 uppercase font-sans animate-pulse"
                >
                  TRANSLATING DIMENSION...
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      {!isChatOpen && <BottomNav />}
      {isChatOpen && (
        <React.Suspense fallback={null}>
          <UnifiedChat />
        </React.Suspense>
      )}
      <ReloadPrompt />
      <InstallPrompt />
      <UpdateNoticeModal
        key={updateNoticeKey}
        isOpen={isUpdateNoticeOpen}
        entries={updateEntries}
        mode={updateNoticeMode}
        onClose={dismissUpdateNotice}
        onApply={handleApplyUpdateNow}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuroraBackground />
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}

// Prism Universe dev auto-bump anchor
