import { db, doc, getDoc, getDocFromServer, setDoc, serverTimestamp } from './firebase';
import type { SharedState, UserProfile } from './sharedState';
import { safeLocalStorage } from '../utils/safeStorage';
import { pickNewestVersion } from './appVersion';

export const GUEST_STATE_KEY = 'lucy_state_guest';

export function sharedStateLocalKey(uid: string): string {
  return `lucy_state_${uid}`;
}

const DAILY_SYNC_KEYS = [
  'lastMuseSync',
  'lastOrangeRefine',
  'lastBluebirdSync',
  'lastTrinitySync',
  'lastDailyOracleSync',
  'lastTrinityDailySync',
  'lastTrinitySoulSync',
  'lastOrangeDailySync',
  'lastOrangeSoulSync',
  'lastBluebirdDailySync',
  'lastBluebirdSoulSync',
  'lastHealDailySync',
  'lastHealSoulSync',
  'lastMuseDailySync',
  'lastMuseSoulSync',
  'lastEnergyAnalysis',
] as const;

const HISTORY_KEYS = [
  'deepSyncHistory',
  'museHistory',
  'orangeHistory',
  'bluebirdHistory',
  'healHistory',
  'trinityHistory',
  'prologueHistory',
  'epilogueHistory',
  'soulHistory',
  'emotionHistory',
] as const;

function profileCompleteness(profile?: UserProfile): number {
  if (!profile) return 0;
  let score = 0;
  const b = profile.basic;
  if (b?.name?.trim()) score += 3;
  if (b?.nickname?.trim()) score += 3;
  if (b?.birthdate?.trim()) score += 2;
  if (b?.birthtime?.trim()) score += 1;
  if (b?.gender) score += 1;
  if (b?.birthCity?.trim()) score += 1;
  if (profile.fate?.fateInterests?.length) score += 2;
  if (profile.fate?.lifeGoal?.trim()) score += 1;
  if (profile.fate?.currentWorry?.trim()) score += 1;
  if (profile.music?.favoriteGenres?.length) score += 1;
  if (profile.psych?.mbti?.trim()) score += 2;
  if (profile.art?.favoriteArtStyle?.length) score += 1;
  return score;
}

function mergeProfileSection<T extends any>(local?: T, remote?: T): T | undefined {
  if (!local && !remote) return undefined;
  if (!local) return remote;
  if (!remote) return local;

  const merged = { ...(remote as any), ...(local as any) } as T;
  for (const key of Object.keys(merged as any)) {
    const localValue = (local as any)[key];
    const remoteValue = (remote as any)[key];

    if (Array.isArray(localValue) || Array.isArray(remoteValue)) {
      const localArr = Array.isArray(localValue) ? localValue : [];
      const remoteArr = Array.isArray(remoteValue) ? remoteValue : [];
      merged[key as keyof T] = (localArr.length >= remoteArr.length ? localArr : remoteArr) as T[keyof T];
      continue;
    }

    if (typeof localValue === 'string' || typeof remoteValue === 'string') {
      const localStr = typeof localValue === 'string' ? localValue.trim() : '';
      const remoteStr = typeof remoteValue === 'string' ? remoteValue.trim() : '';
      if (localStr && remoteStr) {
        merged[key as keyof T] = (localStr.length >= remoteStr.length ? localStr : remoteStr) as T[keyof T];
      } else {
        merged[key as keyof T] = (localStr || remoteStr) as T[keyof T];
      }
      continue;
    }

    if (localValue !== undefined && localValue !== null && localValue !== '') {
      merged[key as keyof T] = localValue as T[keyof T];
    }
  }

  return merged;
}

export function mergeUserProfile(
  local?: UserProfile,
  remote?: UserProfile,
  localUpdatedAt = 0,
  remoteUpdatedAt = 0,
): UserProfile | undefined {
  if (!local && !remote) return undefined;
  if (!local) return remote;
  if (!remote) return local;

  const localScore = profileCompleteness(local);
  const remoteScore = profileCompleteness(remote);
  let preferLocal = localUpdatedAt > remoteUpdatedAt;
  if (localUpdatedAt === remoteUpdatedAt) {
    preferLocal = localScore >= remoteScore;
  }

  const primary = preferLocal ? local : remote;
  const secondary = preferLocal ? remote : local;

  return {
    ...secondary,
    ...primary,
    basic: mergeProfileSection(remote.basic, local.basic),
    fate: mergeProfileSection(remote.fate, local.fate),
    music: mergeProfileSection(remote.music, local.music),
    psych: mergeProfileSection(remote.psych, local.psych),
    art: mergeProfileSection(remote.art, local.art),
    completedAt: local.completedAt || remote.completedAt,
  };
}

export function getSharedStateUpdatedAt(state?: SharedState | null): number {
  if (!state) return 0;
  if (typeof state.clientUpdatedAt === 'number') return state.clientUpdatedAt;
  const updatedAt = state.updatedAt as { toMillis?: () => number } | number | undefined;
  if (typeof updatedAt === 'number') return updatedAt;
  return updatedAt?.toMillis?.() || 0;
}

export function getProfileUpdatedAt(state?: SharedState | null): number {
  if (!state) return 0;
  if (typeof state.profileUpdatedAt === 'number') return state.profileUpdatedAt;
  if (state.sourceApp === 'profile') return getSharedStateUpdatedAt(state);
  return 0;
}

export function mergeSharedState(
  local: SharedState,
  remote: SharedState,
  localUpdatedAt = getSharedStateUpdatedAt(local),
  remoteUpdatedAt = getSharedStateUpdatedAt(remote),
): SharedState {
  const newerIsLocal = localUpdatedAt >= remoteUpdatedAt;
  const merged: SharedState = newerIsLocal
    ? { ...remote, ...local }
    : { ...local, ...remote };

  merged.userProfile = mergeUserProfile(
    local.userProfile,
    remote.userProfile,
    getProfileUpdatedAt(local),
    getProfileUpdatedAt(remote),
  );

  merged.profileUpdatedAt = Math.max(
    getProfileUpdatedAt(local),
    getProfileUpdatedAt(remote),
    local.profileUpdatedAt || 0,
    remote.profileUpdatedAt || 0,
  );

  for (const key of DAILY_SYNC_KEYS) {
    const localValue = local[key];
    const remoteValue = remote[key];
    if (typeof localValue === 'number' || typeof remoteValue === 'number') {
      merged[key] = Math.max(localValue || 0, remoteValue || 0) as SharedState[typeof key];
    }
  }

  for (const key of HISTORY_KEYS) {
    const localValue = local[key];
    const remoteValue = remote[key];
    if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
      merged[key] = (localValue.length >= remoteValue.length ? localValue : remoteValue) as SharedState[typeof key];
    } else if (Array.isArray(localValue)) {
      merged[key] = localValue as SharedState[typeof key];
    } else if (Array.isArray(remoteValue)) {
      merged[key] = remoteValue as SharedState[typeof key];
    }
  }

  merged.clientAppVersions = {
    desktop: pickNewestVersion(local.clientAppVersions?.desktop, remote.clientAppVersions?.desktop),
    mobile: pickNewestVersion(local.clientAppVersions?.mobile, remote.clientAppVersions?.mobile),
    tablet: pickNewestVersion(local.clientAppVersions?.tablet, remote.clientAppVersions?.tablet),
  };
  merged.unifiedAppVersion = pickNewestVersion(
    local.unifiedAppVersion,
    remote.unifiedAppVersion,
    merged.clientAppVersions.desktop,
    merged.clientAppVersions.mobile,
    merged.clientAppVersions.tablet,
  );
  merged.lastAppSyncAt = Math.max(local.lastAppSyncAt || 0, remote.lastAppSyncAt || 0) || undefined;
  merged.clientUpdatedAt = Math.max(localUpdatedAt, remoteUpdatedAt, Date.now());
  return merged;
}

export function loadSharedStateFromLocal(uid?: string | null): SharedState | null {
  try {
    const key = uid ? sharedStateLocalKey(uid) : GUEST_STATE_KEY;
    const raw = safeLocalStorage.getItem(key);
    return raw ? (JSON.parse(raw) as SharedState) : null;
  } catch {
    return null;
  }
}

export function saveSharedStateToLocal(uid: string | null | undefined, state: SharedState) {
  try {
    const key = uid ? sharedStateLocalKey(uid) : GUEST_STATE_KEY;
    const payload: SharedState = {
      ...state,
      clientUpdatedAt: Date.now(),
    };
    safeLocalStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore quota errors
  }
}

const FIRESTORE_TIMEOUT_MS = 4500;

function promiseWithTimeout<T>(promise: Promise<T>, ms: number, fallbackValue: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallbackValue), ms)),
  ]);
}

export async function loadSharedStateFromFirestore(uid: string): Promise<{
  state: SharedState;
  updatedAt: number;
} | null> {
  try {
    const fetchPromise = getDoc(doc(db, 'sharedState', uid)).then((snap) => {
      if (!snap.exists()) return null;
      const state = snap.data() as SharedState;
      return {
        state,
        updatedAt: (state.updatedAt as { toMillis?: () => number } | undefined)?.toMillis?.()
          || getSharedStateUpdatedAt(state),
      };
    });
    return await promiseWithTimeout(fetchPromise, FIRESTORE_TIMEOUT_MS, null);
  } catch (error) {
    console.warn('[SharedStateSync] Firestore load failed:', error);
    return null;
  }
}

export async function loadSharedStateFromFirestoreServer(uid: string): Promise<{
  state: SharedState;
  updatedAt: number;
} | null> {
  try {
    const fetchPromise = getDocFromServer(doc(db, 'sharedState', uid)).then((snap) => {
      if (!snap.exists()) return null;
      const state = snap.data() as SharedState;
      return {
        state,
        updatedAt: (state.updatedAt as { toMillis?: () => number } | undefined)?.toMillis?.()
          || getSharedStateUpdatedAt(state),
      };
    });
    return await promiseWithTimeout(fetchPromise, FIRESTORE_TIMEOUT_MS, null);
  } catch (error) {
    console.warn('[SharedStateSync] Firestore server load failed, falling back to cache:', error);
    return loadSharedStateFromFirestore(uid);
  }
}

export async function saveSharedStateToFirestore(uid: string, state: SharedState) {
  const { clientUpdatedAt, updatedAt, ...rest } = state;
  const savePromise = setDoc(doc(db, 'sharedState', uid), {
    ...rest,
    uid,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  await promiseWithTimeout(savePromise, FIRESTORE_TIMEOUT_MS, undefined);
}

export type SharedStateSyncResult = {
  success: boolean;
  state: SharedState;
  error?: string;
  hadRemote: boolean;
};

export async function syncSharedStateWithCloud(
  uid: string,
  currentState?: SharedState | null,
): Promise<SharedStateSyncResult> {
  const local = loadSharedStateFromLocal(uid) || currentState || {};
  const localUpdatedAt = getSharedStateUpdatedAt(local);

  try {
    const remote = await loadSharedStateFromFirestoreServer(uid);
    const merged = remote
      ? mergeSharedState(local, remote.state, localUpdatedAt, remote.updatedAt)
      : { ...local, clientUpdatedAt: Date.now() };

    saveSharedStateToLocal(uid, merged);
    void saveSharedStateToFirestore(uid, merged).catch((e) =>
      console.warn('[SharedStateSync] Background save warning:', e)
    );

    return {
      success: true,
      state: merged,
      hadRemote: !!remote,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '프로필 동기화에 실패했습니다.';
    console.warn('[SharedStateSync] Manual sync failed:', error);
    return {
      success: false,
      state: local,
      error: message,
      hadRemote: false,
    };
  }
}

export function migrateGuestProfileIntoAccount(uid: string): SharedState | null {
  const accountLocal = loadSharedStateFromLocal(uid);
  const guestLocal = loadSharedStateFromLocal(null);

  if (!guestLocal?.userProfile) return accountLocal;

  const merged = mergeSharedState(
    accountLocal || {},
    { ...(guestLocal || {}), profileUpdatedAt: guestLocal.profileUpdatedAt || guestLocal.clientUpdatedAt },
    getProfileUpdatedAt(accountLocal),
    getProfileUpdatedAt(guestLocal),
  );

  saveSharedStateToLocal(uid, merged);
  return merged;
}