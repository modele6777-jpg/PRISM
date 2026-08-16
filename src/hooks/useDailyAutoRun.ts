import { useEffect, useRef } from "react";
import {
  getTodayDateKey,
  hasSeenResonanceModalToday,
  markResonanceModalSeen,
} from "../lib/dailyCache";

export type ResonanceSyncOptions = {
  silent?: boolean;
  auto?: boolean;
};

export function useDailyResonanceAutoRun(
  appType: string,
  uid: string | undefined,
  handleResonanceSync: (opts?: ResonanceSyncOptions) => void | Promise<void>,
  isSharedStateReady: boolean,
) {
  const autoRunKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!uid || !isSharedStateReady) return;

    const sessionKey = `${appType}:${uid}:${getTodayDateKey()}`;
    if (autoRunKeyRef.current === sessionKey) return;
    autoRunKeyRef.current = sessionKey;

    if (hasSeenResonanceModalToday(appType, uid)) {
      void handleResonanceSync({ silent: true });
      return;
    }

    markResonanceModalSeen(appType, uid);
    void handleResonanceSync({ auto: true });
  }, [appType, uid, isSharedStateReady]);
}