export type PerfProfile = 'full' | 'galaxy' | 'pwa' | 'reduced' | 'legacy';

let cachedProfile: PerfProfile | null = null;
let cachedGalaxyS23: boolean | null = null;
let cachedGalaxyFoldSe: boolean | null = null;

export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return isIOSDevice() || isAndroidDevice();
}

export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isFoldableInnerScreen(): boolean {
  if (typeof window === 'undefined' || !isAndroidDevice()) return false;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const minSide = Math.min(w, h);
  const maxSide = Math.max(w, h);
  const dpr = window.devicePixelRatio || 1;
  return minSide >= 560 && maxSide >= 880 && dpr >= 2;
}

function isFoldableCoverScreen(): boolean {
  if (typeof window === 'undefined' || !isAndroidDevice()) return false;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  return w >= 320 && w <= 460 && h >= 640 && h / Math.max(w, 1) >= 2.1 && dpr >= 2.5;
}

/** Galaxy Z Fold SE / Special Edition (Snapdragon 8 Gen 3 foldable) */
export function isGalaxyFoldSeClass(): boolean {
  if (cachedGalaxyFoldSe !== null) return cachedGalaxyFoldSe;
  if (!isAndroidDevice() || typeof window === 'undefined') {
    cachedGalaxyFoldSe = false;
    return false;
  }

  const ua = navigator.userAgent;
  if (
    /SM-F9[456][0-9][A-Z]?|SM-F7[0-9]{2}|Galaxy Z Fold.*(SE|Special)|Z Fold SE|Fold Special/i.test(
      ua,
    )
  ) {
    cachedGalaxyFoldSe = true;
    return true;
  }

  cachedGalaxyFoldSe = isFoldableInnerScreen() || isFoldableCoverScreen();
  return cachedGalaxyFoldSe;
}

export function isFoldCoverScreen(): boolean {
  if (!isGalaxyFoldSeClass() || typeof window === 'undefined') return false;
  return window.innerWidth < 520;
}

/** Galaxy S23-class flagships — perf tuning only, no UI overrides */
export function isGalaxyS23Class(): boolean {
  if (cachedGalaxyS23 !== null) return cachedGalaxyS23;
  if (!isAndroidDevice() || typeof window === 'undefined') {
    cachedGalaxyS23 = false;
    return false;
  }

  const ua = navigator.userAgent;
  if (/SM-S91[1-8]|Galaxy S23/i.test(ua)) {
    cachedGalaxyS23 = true;
    return true;
  }

  if (isGalaxyFoldSeClass()) {
    cachedGalaxyS23 = false;
    return false;
  }

  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  const portrait = h >= w;

  cachedGalaxyS23 =
    portrait && w >= 360 && w <= 412 && dpr >= 2.5 && h >= 640;
  return cachedGalaxyS23;
}

export function isGalaxyPremiumClass(): boolean {
  return isGalaxyFoldSeClass() || isGalaxyS23Class();
}

function resolvePerfProfile(): PerfProfile {
  if (isNarrowPhone() && isIOSDevice()) return 'legacy';
  if (isGalaxyFoldSeClass() || isGalaxyS23Class()) return 'galaxy';
  if (isStandalonePWA() && isMobileDevice()) return 'pwa';
  if (isStandalonePWA() || isMobileDevice()) return 'reduced';
  return 'full';
}

function applyGalaxyDeviceFlags(): void {
  if (typeof document === 'undefined') return;

  const fold = isGalaxyFoldSeClass();
  const s23 = isGalaxyS23Class();

  document.documentElement.classList.toggle('perf-galaxy-fold', fold);
  document.documentElement.classList.toggle('perf-galaxy', s23 || fold);

  if (fold) {
    document.documentElement.dataset.device = 'galaxy-fold-se';
    document.documentElement.dataset.foldCover = isFoldCoverScreen() ? 'true' : 'false';
  } else if (s23) {
    document.documentElement.dataset.device = 'galaxy-s23';
    document.documentElement.dataset.foldCover = '';
  } else {
    document.documentElement.dataset.device = '';
    document.documentElement.dataset.foldCover = '';
  }
}

export function initPerfMode(): PerfProfile {
  if (cachedProfile) return cachedProfile;

  const profile = resolvePerfProfile();
  cachedProfile = profile;

  if (typeof document === 'undefined') return profile;

  document.documentElement.dataset.perf = profile;

  if (profile === 'reduced' || profile === 'pwa' || profile === 'legacy') {
    document.documentElement.classList.add('perf-reduced');
  }
  if (profile === 'legacy') {
    document.documentElement.classList.add('perf-legacy');
    document.documentElement.classList.add('prism-iphone-xs');
    document.documentElement.dataset.narrow = 'true';
  }
  if (isStandalonePWA()) {
    document.documentElement.classList.add('pwa-standalone');
  }

  applyGalaxyDeviceFlags();

  return profile;
}

export function getPerfProfile(): PerfProfile {
  return cachedProfile ?? initPerfMode();
}

export function isPerfReduced(): boolean {
  const profile = getPerfProfile();
  return profile === 'reduced' || profile === 'pwa' || profile === 'legacy';
}

export function isPwaStandalone(): boolean {
  return getPerfProfile() === 'pwa';
}

export function isLegacyMobile(): boolean {
  return getPerfProfile() === 'legacy';
}

export function isGalaxyPerfProfile(): boolean {
  return getPerfProfile() === 'galaxy';
}

export function getMaxSynthVoices(): number {
  const profile = getPerfProfile();
  if (profile === 'legacy') return 4;
  if (isGalaxyFoldSeClass()) return isFoldCoverScreen() ? 10 : 18;
  if (isGalaxyS23Class()) return 12;
  if (profile === 'pwa') return 6;
  if (profile === 'reduced') return 10;
  return 28;
}

export function getBinauralWatchdogMs(): number {
  const profile = getPerfProfile();
  if (profile === 'legacy') return 12000;
  if (isGalaxyFoldSeClass()) return isFoldCoverScreen() ? 7000 : 4000;
  if (isGalaxyS23Class()) return 6000;
  if (profile === 'pwa') return 8000;
  if (profile === 'reduced') return 5000;
  return 2500;
}

export function getAutoSyncIntervalMs(): number {
  const profile = getPerfProfile();
  if (profile === 'legacy') return 10 * 60 * 1000;
  if (isGalaxyFoldSeClass()) return isFoldCoverScreen() ? 7 * 60 * 1000 : 5 * 60 * 1000;
  if (isGalaxyS23Class()) return 6 * 60 * 1000;
  if (profile === 'pwa') return 8 * 60 * 1000;
  return 5 * 60 * 1000;
}

export function getHubMetricsIntervalMs(): number {
  if (isLegacyMobile()) return 120_000;
  if (isGalaxyFoldSeClass()) return isFoldCoverScreen() ? 105_000 : 75_000;
  if (isGalaxyS23Class()) return 90_000;
  return 60_000;
}

export function getSyncPendingPollMs(): number {
  if (isLegacyMobile()) return 10_000;
  if (isGalaxyFoldSeClass()) return isFoldCoverScreen() ? 8_000 : 5_000;
  if (isGalaxyS23Class()) return 7_000;
  return 5_000;
}

export function getSwUpdateIntervalMs(): number {
  if (isLegacyMobile()) return 45 * 60 * 1000;
  if (isGalaxyFoldSeClass()) return isFoldCoverScreen() ? 40 * 60 * 1000 : 30 * 60 * 1000;
  if (isGalaxyS23Class()) return 35 * 60 * 1000;
  if (isPwaStandalone()) return 30 * 60 * 1000;
  return 15 * 60 * 1000;
}

export function shouldUsePageTransitions(): boolean {
  const profile = getPerfProfile();
  if (profile === 'full' || profile === 'galaxy') {
    if (isGalaxyFoldSeClass() && isFoldCoverScreen()) return false;
    return true;
  }
  return false;
}

export function shouldMountBgMusicPlayer(): boolean {
  return true;
}

export function shouldPreloadBgmAudio(): boolean {
  return !isLegacyMobile();
}

const NARROW_PHONE_MAX_WIDTH = 390;
let narrowPhoneListenerAttached = false;

export function isNarrowPhone(): boolean {
  if (typeof window === 'undefined') return false;
  if (isGalaxyFoldSeClass() && !isFoldCoverScreen()) return false;
  return window.innerWidth <= NARROW_PHONE_MAX_WIDTH;
}

export function isIPhoneXSClass(): boolean {
  return isNarrowPhone() && isIOSDevice();
}

export function initNarrowPhoneClass(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const apply = () => {
    cachedGalaxyS23 = null;
    cachedGalaxyFoldSe = null;

    const narrow = isNarrowPhone();
    document.documentElement.classList.toggle('prism-iphone-xs', narrow);
    document.documentElement.dataset.narrow = narrow ? 'true' : 'false';

    applyGalaxyDeviceFlags();
  };

  apply();

  if (!narrowPhoneListenerAttached) {
    narrowPhoneListenerAttached = true;
    window.addEventListener('resize', apply, { passive: true });
    window.addEventListener('orientationchange', apply, { passive: true });
  }
}