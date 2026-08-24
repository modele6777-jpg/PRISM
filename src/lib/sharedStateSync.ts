import { db, doc, getDoc, getDocFromServer, setDoc, serverTimestamp, collection, getDocs, query, orderBy, limit } from './firebase';
import type { SharedState, UserProfile } from './sharedState';
import { safeLocalStorage } from '../utils/safeStorage';
import { pickNewestVersion } from './appVersion';
import { loadProfileFromAllVaults, saveProfileToAllVaults } from './profileVault';

export const GUEST_STATE_KEY = 'lucy_state_guest';

export function sharedStateLocalKey(uid: string): string {
  return `lucy_state_${uid}`;
}

export function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

/**
 * Collects all local activity feeds and oracle records across all PRISM sub-apps.
 */
export function collectAllLocalActivities(uid?: string | null): Partial<SharedState> {
  if (typeof window === 'undefined') return {};

  const result: Partial<SharedState> = {};
  const todayKey = getTodayDateKey();
  const effectiveUid = uid || 'guest';

  // 1. Collect all local profile vaults
  const localVaultProfile = loadProfileFromAllVaults();
  if (localVaultProfile && Object.keys(localVaultProfile).length > 0) {
    result.userProfile = localVaultProfile;
    result.profileUpdatedAt = Date.now();
  }

  // 2. Collect feature activity history (prism_omni_feature_history)
  try {
    const rawFeat = safeLocalStorage.getItem('prism_omni_feature_history');
    if (rawFeat) {
      const parsed = JSON.parse(rawFeat);
      if (Array.isArray(parsed) && parsed.length > 0) {
        result.featureHistory = parsed;
      }
    }
  } catch (_) {}

  // 3. Collect all today and latest daily oracles from sub-apps
  const todayOracles: Record<string, Record<string, any>> = {};
  const latestDailyOracles: Record<string, any> = {};

  const subApps = ['trinity', 'orange', 'bluebird', 'heal', 'muse', 'hub', 'epilogue'];
  subApps.forEach((app) => {
    try {
      const todayRaw = safeLocalStorage.getItem(`prism_daily_oracle_${app}_${todayKey}`) ||
        safeLocalStorage.getItem(`${app}_daily_result_${effectiveUid}_${todayKey}`) ||
        safeLocalStorage.getItem(`${app}_daily_result_guest_${todayKey}`);
      if (todayRaw) {
        const parsed = JSON.parse(todayRaw);
        if (!todayOracles[todayKey]) todayOracles[todayKey] = {};
        todayOracles[todayKey][app] = parsed;
      }

      const latestRaw = safeLocalStorage.getItem(`prism_latest_daily_${app}`) ||
        safeLocalStorage.getItem(`${app}_daily_result_${effectiveUid}`) ||
        safeLocalStorage.getItem(`${app}_daily_result_guest`);
      if (latestRaw) {
        const parsed = JSON.parse(latestRaw);
        latestDailyOracles[app] = parsed;
      }
    } catch (_) {}
  });

  if (Object.keys(todayOracles).length > 0) {
    result.todayOracles = todayOracles;
  }
  if (Object.keys(latestDailyOracles).length > 0) {
    result.latestDailyOracles = latestDailyOracles;
  }

  // 4. Collect sub-app libraries & vaults
  try {
    const talisman = safeLocalStorage.getItem('prism_talisman_chest');
    if (talisman) result.orangeHistory = JSON.parse(talisman);
  } catch (_) {}

  try {
    const arts = safeLocalStorage.getItem('art_history');
    if (arts) result.museHistory = JSON.parse(arts);
  } catch (_) {}

  try {
    const secrets = safeLocalStorage.getItem('secret_messages');
    if (secrets) result.bluebirdHistory = JSON.parse(secrets);
  } catch (_) {}

  try {
    const sedona = safeLocalStorage.getItem('sedona_records') || safeLocalStorage.getItem('sedona_daily_latest');
    if (sedona) result.healHistory = [JSON.parse(sedona)];
  } catch (_) {}

  return result;
}

/**
 * Unpacks and restores merged cloud data into the current device's local storage and dispatches UI events.
 */
export function unpackAndHydrateLocalStorage(uid: string | null | undefined, state: SharedState): void {
  if (typeof window === 'undefined' || !state) return;

  const todayKey = getTodayDateKey();
  const effectiveUid = uid || 'guest';

  // 1. Hydrate User Profile to all 10 local vaults
  if (state.userProfile && Object.keys(state.userProfile).length > 0) {
    saveProfileToAllVaults(state.userProfile);
    try {
      safeLocalStorage.setItem('lucy_user_profile', JSON.stringify(state.userProfile));
    } catch (_) {}
  }

  // 2. Hydrate Feature Activity History (prism_omni_feature_history)
  if (Array.isArray(state.featureHistory) && state.featureHistory.length > 0) {
    try {
      const existingRaw = safeLocalStorage.getItem('prism_omni_feature_history');
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const mergedMap = new Map<string, any>();
      (state.featureHistory || []).forEach((item) => {
        if (item && item.id) mergedMap.set(item.id, item);
      });
      existing.forEach((item: any) => {
        if (item && item.id) mergedMap.set(item.id, item);
      });
      const combined = Array.from(mergedMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 80);
      safeLocalStorage.setItem('prism_omni_feature_history', JSON.stringify(combined));
    } catch (_) {}
  }

  // 3. Hydrate Today Oracles & Latest Daily Oracles
  if (state.todayOracles) {
    Object.entries(state.todayOracles).forEach(([dateKey, appObj]) => {
      if (appObj && typeof appObj === 'object') {
        Object.entries(appObj).forEach(([app, summary]) => {
          if (app !== 'lastUpdated' && summary) {
            try {
              safeLocalStorage.setItem(`prism_daily_oracle_${app}_${dateKey}`, JSON.stringify(summary));
              if (dateKey === todayKey) {
                safeLocalStorage.setItem(`prism_latest_daily_${app}`, JSON.stringify(summary));
                safeLocalStorage.setItem(`${app}_daily_result_${effectiveUid}_${todayKey}`, JSON.stringify(summary));
                safeLocalStorage.setItem(`${app}_daily_result_guest_${todayKey}`, JSON.stringify(summary));
                safeLocalStorage.setItem(`limit_daily_${app}_${effectiveUid}_${todayKey}`, 'true');
                safeLocalStorage.setItem(`limit_daily_${app}_guest_${todayKey}`, 'true');
              }
            } catch (_) {}
          }
        });
      }
    });
  }

  if (state.latestDailyOracles) {
    Object.entries(state.latestDailyOracles).forEach(([app, summary]) => {
      if (summary) {
        try {
          safeLocalStorage.setItem(`prism_latest_daily_${app}`, JSON.stringify(summary));
          safeLocalStorage.setItem(`${app}_daily_result_${effectiveUid}`, JSON.stringify(summary));
        } catch (_) {}
      }
    });
  }

  // 4. Hydrate Sub-App histories
  if (Array.isArray(state.orangeHistory) && state.orangeHistory.length > 0) {
    try {
      safeLocalStorage.setItem('prism_talisman_chest', JSON.stringify(state.orangeHistory));
    } catch (_) {}
  }

  if (Array.isArray(state.museHistory) && state.museHistory.length > 0) {
    try {
      safeLocalStorage.setItem('art_history', JSON.stringify(state.museHistory));
    } catch (_) {}
  }

  if (Array.isArray(state.bluebirdHistory) && state.bluebirdHistory.length > 0) {
    try {
      safeLocalStorage.setItem('secret_messages', JSON.stringify(state.bluebirdHistory));
    } catch (_) {}
  }

  // 5. Dispatch Custom Events across the whole app to instantly re-render UI
  try {
    window.dispatchEvent(new CustomEvent('prism:daily_oracle_updated', { detail: state.todayOracles }));
    window.dispatchEvent(new CustomEvent('prism:feature_updated', { detail: state }));
    window.dispatchEvent(new CustomEvent('prism:profile_updated', { detail: state.userProfile }));
  } catch (_) {}
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

  // 1. Lossless User Profile Merge
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

  // 2. Merge Today Oracles across all dates
  const mergedTodayOracles: Record<string, Record<string, any>> = {
    ...(remote.todayOracles || {}),
    ...(local.todayOracles || {}),
  };
  const allDates = new Set([...Object.keys(remote.todayOracles || {}), ...Object.keys(local.todayOracles || {})]);
  allDates.forEach((d) => {
    mergedTodayOracles[d] = {
      ...((remote.todayOracles || {})[d] || {}),
      ...((local.todayOracles || {})[d] || {}),
    };
  });
  merged.todayOracles = mergedTodayOracles;

  // 3. Merge Latest Daily Oracles
  merged.latestDailyOracles = {
    ...(remote.latestDailyOracles || {}),
    ...(local.latestDailyOracles || {}),
  };

  // 4. Merge Feature Activity History (newest first, deduped by ID, up to 100)
  const featMap = new Map<string, any>();
  (remote.featureHistory || []).forEach((item: any) => { if (item?.id) featMap.set(item.id, item); });
  (local.featureHistory || []).forEach((item: any) => { if (item?.id) featMap.set(item.id, item); });
  merged.featureHistory = Array.from(featMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 100);

  // 5. Merge Daily Sync Timestamps
  for (const key of DAILY_SYNC_KEYS) {
    const localValue = local[key];
    const remoteValue = remote[key];
    if (typeof localValue === 'number' || typeof remoteValue === 'number') {
      merged[key] = Math.max(localValue || 0, remoteValue || 0) as SharedState[typeof key];
    }
  }

  // 6. Merge History Keys
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

export function cleanFirestoreData<T>(input: T): T {
  if (input === null || input === undefined) return input;
  if (typeof input !== 'object') return input;
  if (input instanceof Date) return input;
  // Preserve Firestore Timestamp and FieldValue (such as serverTimestamp)
  if (
    'toMillis' in (input as any) ||
    '_methodName' in (input as any) ||
    (input as any).constructor?.name === 'FieldValue' ||
    (input as any).constructor?.name === 'Timestamp'
  ) {
    return input;
  }
  if (Array.isArray(input)) {
    return input
      .map((item) => cleanFirestoreData(item))
      .filter((item) => item !== undefined) as unknown as T;
  }
  const res: Record<string, any> = {};
  for (const [key, val] of Object.entries(input as Record<string, any>)) {
    if (val !== undefined && typeof val !== 'function') {
      res[key] = cleanFirestoreData(val);
    }
  }
  return res as T;
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
    console.warn('[SharedStateSync] Firestore load fallback:', error);
    return null;
  }
}

export async function loadSharedStateFromFirestoreServer(uid: string): Promise<{
  state: SharedState;
  updatedAt: number;
} | null> {
  try {
    const fetchPromise = promiseWithTimeout(
      getDocFromServer(doc(db, 'sharedState', uid)).then((snap) => {
        if (!snap.exists()) return null;
        const state = snap.data() as SharedState;
        return {
          state,
          updatedAt: (state.updatedAt as { toMillis?: () => number } | undefined)?.toMillis?.()
            || getSharedStateUpdatedAt(state),
        };
      }),
      3500,
      null
    );
    const result = await fetchPromise;
    if (result) return result;
    return await loadSharedStateFromFirestore(uid);
  } catch (error) {
    return loadSharedStateFromFirestore(uid);
  }
}

export async function saveSharedStateToFirestore(uid: string, state: SharedState): Promise<void> {
  try {
    const { clientUpdatedAt, updatedAt, ...rest } = state;
    const cleanPayload = cleanFirestoreData({
      ...rest,
      uid,
      updatedAt: serverTimestamp(),
    });
    const savePromise = setDoc(doc(db, 'sharedState', uid), cleanPayload, { merge: true });
    await promiseWithTimeout(savePromise, 4000, undefined);
  } catch (err: any) {
    console.warn('[SharedStateSync] Firestore save notice (cached locally):', err?.message || err);
  }
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
  // 1. Gather all local activities, vaults, and oracles before syncing
  const localActivities = collectAllLocalActivities(uid);
  const baseLocal = loadSharedStateFromLocal(uid) || currentState || {};
  const local: SharedState = {
    ...baseLocal,
    ...localActivities,
    userProfile: mergeUserProfile(baseLocal.userProfile, localActivities.userProfile),
    todayOracles: {
      ...(baseLocal.todayOracles || {}),
      ...(localActivities.todayOracles || {}),
    },
    latestDailyOracles: {
      ...(baseLocal.latestDailyOracles || {}),
      ...(localActivities.latestDailyOracles || {}),
    },
  };
  try {
    const localUpdatedAt = getSharedStateUpdatedAt(local);
    const subColls = [
      { key: 'trinity', coll: 'trinity_history' },
      { key: 'orange', coll: 'orange_history' },
      { key: 'muse', coll: 'muse_history' },
      { key: 'bluebird', coll: 'bluebird_history' },
      { key: 'heal', coll: 'heal_history' },
    ];

    const results = await Promise.allSettled([
      loadSharedStateFromFirestoreServer(uid),
      promiseWithTimeout(getDoc(doc(db, 'userProfiles', uid)), 3500, null).catch(() => null),
      ...subColls.map(({ key, coll }) =>
        promiseWithTimeout(
          getDocs(query(collection(db, coll, uid, 'entries'), orderBy('createdAt', 'desc'), limit(15))),
          3500,
          null
        )
          .then((snap: any) => ({
            key,
            entries: snap && snap.docs ? snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) : [],
          }))
          .catch(() => ({ key, entries: [] }))
      ),
    ]);

    const remoteRes = results[0].status === 'fulfilled' ? results[0].value : null;
    const userProfileRes = results[1].status === 'fulfilled' ? results[1].value : null;
    const subCollDocs = results.slice(2).map((r) => (r.status === 'fulfilled' ? r.value : { key: '', entries: [] }));

    let remoteState = remoteRes?.state;
    if (userProfileRes && userProfileRes.exists && userProfileRes.exists()) {
      const pData = userProfileRes.data() as UserProfile;
      if (remoteState) {
        remoteState.userProfile = mergeUserProfile(remoteState.userProfile, pData);
      }
    }

    const merged = remoteState
      ? mergeSharedState(local, remoteState, localUpdatedAt, remoteRes?.updatedAt || 0)
      : { ...local, clientUpdatedAt: Date.now() };

    // Inject entries from Firestore sub-collections into merged state
    subCollDocs.forEach((res) => {
      if (res && res.entries && res.entries.length > 0) {
        const { key, entries } = res;
        if (key === 'trinity') merged.trinityHistory = entries;
        else if (key === 'orange') merged.orangeHistory = entries;
        else if (key === 'muse') merged.museHistory = entries;
        else if (key === 'bluebird') merged.bluebirdHistory = entries;
        else if (key === 'heal') merged.healHistory = entries;

        entries.forEach((e: any) => {
          if (e && !merged.featureHistory?.some((f: any) => f.id === e.id)) {
            merged.featureHistory = merged.featureHistory || [];
            merged.featureHistory.unshift({
              id: e.id || `feat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              app: key,
              appName: key.toUpperCase(),
              featureName: e.title || e.type || '활동 기록',
              summary: e.content || e.summary || e.diagnosis || '',
              details: e,
              timestamp: e.createdAt?.toMillis?.() || e.timestamp || Date.now(),
              dateKey: getTodayDateKey(),
            });
          }
        });
      }
    });

    // Save locally
    saveSharedStateToLocal(uid, merged);

    // Save to Firestore sharedState & userProfiles in parallel safely
    try {
      const cleanProfile = merged.userProfile ? cleanFirestoreData(merged.userProfile) : null;
      await Promise.allSettled([
        saveSharedStateToFirestore(uid, merged),
        cleanProfile ? setDoc(doc(db, 'userProfiles', uid), cleanProfile, { merge: true }) : Promise.resolve(),
      ]);
    } catch (e) {
      console.warn('[SharedStateSync] Background save warning:', e);
    }

    // Unpack and hydrate all local storage slots on this device
    unpackAndHydrateLocalStorage(uid, merged);

    return {
      success: true,
      state: merged,
      hadRemote: !!remoteRes,
    };
  } catch (error) {
    console.warn('[SharedStateSync] Cloud sync fallback to local merge:', error);
    saveSharedStateToLocal(uid, local);
    unpackAndHydrateLocalStorage(uid, local);
    return {
      success: true,
      state: local,
      hadRemote: false,
    };
  }
}

export function migrateGuestProfileIntoAccount(uid: string): SharedState | null {
  const accountLocal = loadSharedStateFromLocal(uid);
  const guestLocal = loadSharedStateFromLocal(null);
  const guestActivities = collectAllLocalActivities(null);

  const guestCombined = {
    ...(guestLocal || {}),
    ...guestActivities,
    userProfile: mergeUserProfile(guestLocal?.userProfile, guestActivities.userProfile),
  };

  if (!guestCombined.userProfile && !guestCombined.featureHistory && !guestCombined.todayOracles) {
    return accountLocal;
  }

  const merged = mergeSharedState(
    accountLocal || {},
    { ...guestCombined, profileUpdatedAt: guestCombined.profileUpdatedAt || guestCombined.clientUpdatedAt },
    getProfileUpdatedAt(accountLocal),
    getProfileUpdatedAt(guestCombined),
  );

  saveSharedStateToLocal(uid, merged);
  unpackAndHydrateLocalStorage(uid, merged);
  return merged;
}