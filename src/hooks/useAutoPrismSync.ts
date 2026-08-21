import { useCallback, useEffect, useRef } from 'react';
import { applyServiceWorkerUpdate, type PrismSyncResult } from '@/lib/prismSync';
import { getAutoSyncIntervalMs, getSyncPendingPollMs } from '@/lib/perfMode';

// Responsive gap: reduced from 30s to 1s to allow immediate state-driven sync while preventing socket floods
const MIN_SYNC_GAP_MS = 1000;
const STATE_CHANGE_DEBOUNCE_MS = 400;

export type UseAutoPrismSyncOptions = {
  enabled: boolean;
  sync: () => Promise<PrismSyncResult>;
  isSessionBusy: () => boolean;
  onMessage?: (message: string | null) => void;
  onCheckingChange?: (checking: boolean) => void;
  stateDependency?: unknown;
};

export function useAutoPrismSync({
  enabled,
  sync,
  isSessionBusy,
  onMessage,
  onCheckingChange,
  stateDependency,
}: UseAutoPrismSyncOptions) {
  const pendingReloadRef = useRef(false);
  const pendingReloadResultRef = useRef<PrismSyncResult | null>(null);
  const lastSyncAtRef = useRef(0);
  const runningRef = useRef(false);
  const syncRef = useRef(sync);
  syncRef.current = sync;
  const isSessionBusyRef = useRef(isSessionBusy);
  isSessionBusyRef.current = isSessionBusy;
  const debounceTimerRef = useRef<number | null>(null);
  const isFirstMountRef = useRef(true);
  const lastStateFingerprintRef = useRef<string>('');

  const applyReload = useCallback(async (result: PrismSyncResult, silent: boolean) => {
    if (isSessionBusyRef.current()) {
      pendingReloadRef.current = true;
      onMessage?.(`최신 v${result.targetVersion} 준비됨 — 세션 종료 후 자동 적용됩니다.`);
      window.setTimeout(() => onMessage?.(null), 5000);
      return true;
    }

    onMessage?.(
      silent
        ? `최신 v${result.targetVersion}으로 자동 업데이트 중...`
        : `${result.message}`,
    );

    const swState = await applyServiceWorkerUpdate();
    if (swState === 'reloading') return true;

    if (swState === 'updating') {
      window.setTimeout(() => window.location.reload(), 4000);
      return true;
    }

    window.setTimeout(() => window.location.reload(), 800);
    return true;
  }, [onMessage]);

  const runSync = useCallback(async (opts?: {
    silent?: boolean;
    force?: boolean;
    deferReload?: boolean;
  }): Promise<PrismSyncResult | undefined> => {
    if (!enabled) return undefined;
    if (runningRef.current && !opts?.force) return undefined;

    const now = Date.now();
    if (!opts?.force && now - lastSyncAtRef.current < MIN_SYNC_GAP_MS) return undefined;

    runningRef.current = true;
    lastSyncAtRef.current = now;
    const silent = opts?.silent !== false;
    if (!silent) onCheckingChange?.(true);

    let willReload = false;
    try {
      const syncTimeoutPromise = new Promise<PrismSyncResult>((_, reject) =>
        setTimeout(() => reject(new Error('Sync timeout')), 5000)
      );
      const result = await Promise.race([syncRef.current(), syncTimeoutPromise]);

      if (result.needsReload) {
        if (opts?.deferReload) {
          pendingReloadResultRef.current = result;
          if (!silent) {
            onMessage?.(result.message);
          }
          return result;
        }
        willReload = await applyReload(result, silent);
        return result;
      }

      pendingReloadRef.current = false;
      pendingReloadResultRef.current = null;
      if (!silent) {
        onMessage?.(result.message);
        window.setTimeout(() => onMessage?.(null), 3500);
      }
      return result;
    } catch (err) {
      console.warn('[AutoPrismSync] Failed or timed out:', err);
      if (!silent) {
        onMessage?.('동기화에 실패했습니다. 다시 시도해 주세요.');
        window.setTimeout(() => onMessage?.(null), 3000);
      }
      return undefined;
    } finally {
      if (!willReload) onCheckingChange?.(false);
      runningRef.current = false;
    }
  }, [enabled, applyReload, onMessage, onCheckingChange]);

  const runSyncRef = useRef(runSync);
  runSyncRef.current = runSync;

  const scheduleDebouncedSync = useCallback((delayMs: number = STATE_CHANGE_DEBOUNCE_MS) => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null;
      void runSyncRef.current({ silent: true });
    }, delayMs);
  }, []);

  const applyDeferredReload = useCallback(async () => {
    const result = pendingReloadResultRef.current;
    if (!result) return false;
    pendingReloadResultRef.current = null;
    onCheckingChange?.(true);
    await applyReload(result, false);
    return true;
  }, [applyReload, onCheckingChange]);

  // Initial sync on mount or enable
  useEffect(() => {
    if (!enabled) return;
    void runSyncRef.current({ silent: true, force: true });
  }, [enabled]);

  // Reactive State-Change Detection: syncs immediately when state updates
  useEffect(() => {
    if (!enabled || stateDependency === undefined) return;

    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      try {
        lastStateFingerprintRef.current = JSON.stringify(stateDependency);
      } catch (_) {}
      return;
    }

    let fingerprint = '';
    try {
      fingerprint = JSON.stringify(stateDependency);
    } catch (_) {
      fingerprint = String(Date.now());
    }

    if (fingerprint && fingerprint !== lastStateFingerprintRef.current) {
      lastStateFingerprintRef.current = fingerprint;
      scheduleDebouncedSync(STATE_CHANGE_DEBOUNCE_MS);
    }
  }, [enabled, stateDependency, scheduleDebouncedSync]);

  // Reactive Event-Driven Detection: custom sync events, storage, visibility, and network reconnection
  useEffect(() => {
    if (!enabled) return;

    const handleStateEvent = () => {
      scheduleDebouncedSync(STATE_CHANGE_DEBOUNCE_MS);
    };

    const onResume = () => {
      if (document.visibilityState !== 'visible') return;
      scheduleDebouncedSync(100);
    };

    window.addEventListener('prism:state_changed', handleStateEvent);
    window.addEventListener('prism:daily_oracle_updated', handleStateEvent);
    window.addEventListener('prism:feature_updated', handleStateEvent);
    window.addEventListener('storage', handleStateEvent);
    window.addEventListener('online', onResume);
    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('focus', onResume);

    return () => {
      window.removeEventListener('prism:state_changed', handleStateEvent);
      window.removeEventListener('prism:daily_oracle_updated', handleStateEvent);
      window.removeEventListener('prism:feature_updated', handleStateEvent);
      window.removeEventListener('storage', handleStateEvent);
      window.removeEventListener('online', onResume);
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('focus', onResume);
    };
  }, [enabled, scheduleDebouncedSync]);

  // Background fallback safety interval
  useEffect(() => {
    if (!enabled) return;

    const intervalId = window.setInterval(() => {
      void runSyncRef.current({ silent: true });
    }, getAutoSyncIntervalMs());

    return () => window.clearInterval(intervalId);
  }, [enabled]);

  // Deferred reload queue polling
  useEffect(() => {
    if (!enabled) return;

    const pendingPollMs = getSyncPendingPollMs();
    const intervalId = window.setInterval(() => {
      if (!pendingReloadRef.current || isSessionBusyRef.current()) return;
      pendingReloadRef.current = false;
      void runSyncRef.current({ silent: false, force: true });
    }, pendingPollMs);

    return () => window.clearInterval(intervalId);
  }, [enabled]);

  // Cleanup pending debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return { runSync, applyDeferredReload };
}