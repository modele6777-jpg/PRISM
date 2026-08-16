import { useCallback, useEffect, useRef } from 'react';
import { applyServiceWorkerUpdate, type PrismSyncResult } from '@/lib/prismSync';
import { getAutoSyncIntervalMs, getSyncPendingPollMs } from '@/lib/perfMode';
const MIN_SYNC_GAP_MS = 30 * 1000;

type UseAutoPrismSyncOptions = {
  enabled: boolean;
  sync: () => Promise<PrismSyncResult>;
  isSessionBusy: () => boolean;
  onMessage?: (message: string | null) => void;
  onCheckingChange?: (checking: boolean) => void;
};

export function useAutoPrismSync({
  enabled,
  sync,
  isSessionBusy,
  onMessage,
  onCheckingChange,
}: UseAutoPrismSyncOptions) {
  const pendingReloadRef = useRef(false);
  const pendingReloadResultRef = useRef<PrismSyncResult | null>(null);
  const lastSyncAtRef = useRef(0);
  const runningRef = useRef(false);
  const syncRef = useRef(sync);
  syncRef.current = sync;
  const isSessionBusyRef = useRef(isSessionBusy);
  isSessionBusyRef.current = isSessionBusy;

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
      const result = await syncRef.current();

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
      console.error('[AutoPrismSync] Failed:', err);
      if (!silent) {
        onMessage?.('동기화에 실패했습니다. 다시 시도해 주세요.');
        window.setTimeout(() => onMessage?.(null), 3000);
      }
      return undefined;
    } finally {
      if (!willReload && !silent) onCheckingChange?.(false);
      runningRef.current = false;
    }
  }, [enabled, applyReload, onMessage, onCheckingChange]);

  const runSyncRef = useRef(runSync);
  runSyncRef.current = runSync;

  const applyDeferredReload = useCallback(async () => {
    const result = pendingReloadResultRef.current;
    if (!result) return false;
    pendingReloadResultRef.current = null;
    onCheckingChange?.(true);
    await applyReload(result, false);
    return true;
  }, [applyReload, onCheckingChange]);

  useEffect(() => {
    if (!enabled) return;
    void runSyncRef.current({ silent: true, force: true });

    const intervalId = window.setInterval(() => {
      void runSyncRef.current({ silent: true });
    }, getAutoSyncIntervalMs());

    return () => window.clearInterval(intervalId);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const onResume = () => {
      if (document.visibilityState !== 'visible') return;
      void runSyncRef.current({ silent: true });
    };

    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('focus', onResume);
    return () => {
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('focus', onResume);
    };
  }, [enabled]);

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

  return { runSync, applyDeferredReload };
}