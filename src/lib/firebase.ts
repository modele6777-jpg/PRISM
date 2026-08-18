import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc as firestoreDoc,
  setDoc as firestoreSetDoc,
  getDoc as firestoreGetDoc,
  onSnapshot as firestoreOnSnapshot,
  collection as firestoreCollection,
  addDoc as firestoreAddDoc,
  query as firestoreQuery,
  orderBy as firestoreOrderBy,
  where as firestoreWhere,
  serverTimestamp as firestoreServerTimestamp,
  Timestamp as firestoreTimestamp,
  limit as firestoreLimit,
  getDocs as firestoreGetDocs,
  updateDoc as firestoreUpdateDoc,
  getDocFromServer as firestoreGetDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { OperationType, handleFirestoreError } from './firestoreUtils';
import { safeLocalStorage } from '../utils/safeStorage';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
// Use the databaseId from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export { OperationType, handleFirestoreError };

const isBypass = typeof window !== 'undefined' && safeLocalStorage.getItem('developer_bypass') === 'true';

// Quota exhaustion tracker
const QUOTA_STORAGE_KEY = 'firestore_quota_exhausted_v1';
let isQuotaExhaustedMemory = false;

function checkInitialQuota(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = sessionStorage.getItem(QUOTA_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Quota is usually reset daily (UTC/midnight) or after 1 hour test window
      if (Date.now() - parsed.timestamp < 3600000) {
        return true;
      }
    }
  } catch (_) {}
  return false;
}

isQuotaExhaustedMemory = checkInitialQuota();

export function isQuotaExhausted(): boolean {
  return isQuotaExhaustedMemory || isBypass;
}

export function markQuotaExhausted() {
  if (!isQuotaExhaustedMemory) {
    isQuotaExhaustedMemory = true;
    try {
      sessionStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify({ timestamp: Date.now(), reason: 'resource-exhausted' }));
    } catch (_) {}
    console.warn('[Firestore Storage] Daily write quota reached for free tier project. Seamlessly falling back to local persistent storage for uninterrupted user experience.');
  }
}

export function isQuotaError(err: unknown): boolean {
  if (!err) return false;
  const msg = (err as Error)?.message || String(err);
  const code = (err as { code?: string })?.code || '';
  return (
    code === 'resource-exhausted' ||
    msg.includes('resource-exhausted') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Quota exceeded') ||
    msg.includes('Free daily write units')
  );
}

// Local mock event bus for reactive local data updates
const listeners: { [path: string]: Set<() => void> } = {};
export function notifyListeners(path: string) {
  if (listeners[path]) {
    listeners[path].forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.warn('[Firestore LocalBus] listener error:', err);
      }
    });
  }
}

// Global test connection function
async function testConnection() {
  if (isBypass || isQuotaExhaustedMemory) return;
  try {
    const d = firestoreDoc(db, 'test', 'connection');
    await Promise.race([
      firestoreGetDoc(d),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
    ]);
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExhausted();
    }
  }
}

if (typeof window !== 'undefined') {
  setTimeout(() => { testConnection(); }, 1000);
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

// --- Polymorphic Wrapping with Local Storage Fallback & Offline Resilience ---

function getNormalizedPath(refOrPath: any, ...segments: string[]): string {
  if (typeof refOrPath === 'string') {
    return [refOrPath, ...segments].filter(Boolean).join('/');
  }
  return refOrPath?.path || refOrPath?.colRef?.path || '';
}

export function doc(dbInstance: any, path: string, ...pathSegments: string[]) {
  if (isBypass || isQuotaExhaustedMemory) {
    const fullPath = [path, ...pathSegments].filter(Boolean).join('/');
    return {
      _type: 'document' as const,
      path: fullPath,
      id: pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : path
    } as any;
  }
  return firestoreDoc(dbInstance, path, ...pathSegments);
}

export function collection(dbInstance: any, path: string, ...pathSegments: string[]) {
  if (isBypass || isQuotaExhaustedMemory) {
    const fullPath = [path, ...pathSegments].filter(Boolean).join('/');
    return {
      _type: 'collection' as const,
      path: fullPath,
      id: pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : path
    } as any;
  }
  return firestoreCollection(dbInstance, path, ...pathSegments);
}

export function query(colRef: any, ...constraints: any[]) {
  if (isBypass || isQuotaExhaustedMemory) {
    return {
      _type: 'query' as const,
      colRef,
      path: colRef.path
    } as any;
  }
  return firestoreQuery(colRef, ...constraints);
}

function saveLocalCollectionDoc(path: string, data: any): { id: string } {
  const existing = JSON.parse(safeLocalStorage.getItem('isomorphic_db_' + path) || '[]');
  const mockTimestamp = {
    toMillis: () => Date.now(),
    toDate: () => new Date(),
    seconds: Math.floor(Date.now() / 1000),
    nanoseconds: 0
  };
  const newDoc = {
    id: 'doc_' + Math.random().toString(36).substring(2, 11),
    ...data,
    createdAt: data.createdAt || mockTimestamp
  };
  existing.unshift(newDoc);
  safeLocalStorage.setItem('isomorphic_db_' + path, JSON.stringify(existing.slice(0, 100)));
  notifyListeners(path);
  return { id: newDoc.id };
}

function saveLocalSingleDoc(path: string, data: any, options?: { merge?: boolean }): void {
  let mergedData = data;
  if (options?.merge) {
    const existing = JSON.parse(safeLocalStorage.getItem('isomorphic_db_doc_' + path) || '{}');
    mergedData = { ...existing, ...data };
  }
  safeLocalStorage.setItem('isomorphic_db_doc_' + path, JSON.stringify(mergedData));
  notifyListeners(path);
}

export async function addDoc(colRef: any, data: any): Promise<any> {
  const path = getNormalizedPath(colRef);
  if (isBypass || isQuotaExhaustedMemory) {
    return Promise.resolve(saveLocalCollectionDoc(path, data));
  }
  try {
    const res = await firestoreAddDoc(colRef, data);
    // Keep local cache synced
    saveLocalCollectionDoc(path, { ...data, id: res.id });
    return res;
  } catch (err) {
    if (isQuotaError(err)) {
      markQuotaExhausted();
      return Promise.resolve(saveLocalCollectionDoc(path, data));
    }
    // For other unexpected errors, also save locally so user's work isn't lost
    console.warn('[addDoc] Write error, saved to local cache:', err);
    return Promise.resolve(saveLocalCollectionDoc(path, data));
  }
}

export async function setDoc(docRef: any, data: any, options?: any): Promise<void> {
  const path = getNormalizedPath(docRef);
  if (isBypass || isQuotaExhaustedMemory) {
    saveLocalSingleDoc(path, data, options);
    return Promise.resolve();
  }
  try {
    await firestoreSetDoc(docRef, data, options);
    saveLocalSingleDoc(path, data, options);
    return;
  } catch (err) {
    if (isQuotaError(err)) {
      markQuotaExhausted();
      saveLocalSingleDoc(path, data, options);
      return Promise.resolve();
    }
    console.warn('[setDoc] Write error, saved to local cache:', err);
    saveLocalSingleDoc(path, data, options);
    return Promise.resolve();
  }
}

export async function updateDoc(docRef: any, data: any): Promise<void> {
  const path = getNormalizedPath(docRef);
  if (isBypass || isQuotaExhaustedMemory) {
    saveLocalSingleDoc(path, data, { merge: true });
    return Promise.resolve();
  }
  try {
    await firestoreUpdateDoc(docRef, data);
    saveLocalSingleDoc(path, data, { merge: true });
    return;
  } catch (err) {
    if (isQuotaError(err)) {
      markQuotaExhausted();
      saveLocalSingleDoc(path, data, { merge: true });
      return Promise.resolve();
    }
    console.warn('[updateDoc] Write error, saved to local cache:', err);
    saveLocalSingleDoc(path, data, { merge: true });
    return Promise.resolve();
  }
}

export async function getDoc(docRef: any): Promise<any> {
  const path = getNormalizedPath(docRef);
  if (isBypass || isQuotaExhaustedMemory) {
    const data = JSON.parse(safeLocalStorage.getItem('isomorphic_db_doc_' + path) || 'null');
    return Promise.resolve({
      exists: () => data !== null,
      data: () => data,
      id: docRef.id || path.split('/').pop()
    });
  }
  try {
    const snap = await firestoreGetDoc(docRef);
    if (snap.exists()) {
      safeLocalStorage.setItem('isomorphic_db_doc_' + path, JSON.stringify(snap.data()));
    }
    return snap;
  } catch (err) {
    if (isQuotaError(err)) {
      markQuotaExhausted();
    }
    const data = JSON.parse(safeLocalStorage.getItem('isomorphic_db_doc_' + path) || 'null');
    return Promise.resolve({
      exists: () => data !== null,
      data: () => data,
      id: docRef.id || path.split('/').pop()
    });
  }
}

export async function getDocs(colOrQueryRef: any): Promise<any> {
  const path = getNormalizedPath(colOrQueryRef);
  if (isBypass || isQuotaExhaustedMemory) {
    const docsRaw = JSON.parse(safeLocalStorage.getItem('isomorphic_db_' + path) || '[]');
    const docs = docsRaw.map((docVal: any) => ({
      id: docVal.id,
      data: () => {
        const baseTime = typeof docVal.createdAt === 'number'
          ? docVal.createdAt
          : (docVal.createdAt?.toMillis?.() || Date.now());
        return {
          ...docVal,
          createdAt: {
            toMillis: () => baseTime,
            toDate: () => new Date(baseTime)
          }
        };
      }
    }));
    return Promise.resolve({
      docs,
      forEach: (cb: any) => docs.forEach(cb)
    });
  }
  try {
    const res = await firestoreGetDocs(colOrQueryRef);
    return res;
  } catch (err) {
    if (isQuotaError(err)) {
      markQuotaExhausted();
    }
    const docsRaw = JSON.parse(safeLocalStorage.getItem('isomorphic_db_' + path) || '[]');
    const docs = docsRaw.map((docVal: any) => ({
      id: docVal.id,
      data: () => {
        const baseTime = typeof docVal.createdAt === 'number'
          ? docVal.createdAt
          : (docVal.createdAt?.toMillis?.() || Date.now());
        return {
          ...docVal,
          createdAt: {
            toMillis: () => baseTime,
            toDate: () => new Date(baseTime)
          }
        };
      }
    }));
    return Promise.resolve({
      docs,
      forEach: (cb: any) => docs.forEach(cb)
    });
  }
}

export async function getDocFromServer(docRef: any): Promise<any> {
  const path = getNormalizedPath(docRef);
  if (isBypass || isQuotaExhaustedMemory) {
    return getDoc(docRef);
  }
  try {
    const snap = await firestoreGetDocFromServer(docRef);
    if (snap.exists()) {
      safeLocalStorage.setItem('isomorphic_db_doc_' + path, JSON.stringify(snap.data()));
    }
    return snap;
  } catch (err) {
    if (isQuotaError(err)) {
      markQuotaExhausted();
    }
    return getDoc(docRef);
  }
}

export function onSnapshot(ref: any, onNext: any, onError?: any): () => void {
  const path = getNormalizedPath(ref);
  
  const fireLocalOnNext = () => {
    try {
      const isDocument = ref._type === 'document' || !path.endsWith('entries');
      if (isDocument) {
        const data = JSON.parse(safeLocalStorage.getItem('isomorphic_db_doc_' + path) || 'null');
        onNext({
          exists: () => data !== null,
          data: () => data,
          id: ref.id || path.split('/').pop()
        });
      } else {
        const docsRaw = JSON.parse(safeLocalStorage.getItem('isomorphic_db_' + path) || '[]');
        const mappedDocs = docsRaw.map((d: any) => ({
          id: d.id,
          data: () => {
            const baseTime = typeof d.createdAt === 'number'
              ? d.createdAt
              : (d.createdAt?.toMillis?.() || Date.now());
            return {
              ...d,
              createdAt: {
                toMillis: () => baseTime,
                toDate: () => new Date(baseTime)
              }
            };
          }
        }));
        onNext({
          docs: mappedDocs,
          forEach: (cb: any) => mappedDocs.forEach(cb)
        });
      }
    } catch (e) {
      if (onError) onError(e);
    }
  };

  if (isBypass || isQuotaExhaustedMemory) {
    fireLocalOnNext();
    if (!listeners[path]) {
      listeners[path] = new Set();
    }
    listeners[path].add(fireLocalOnNext);
    return () => {
      listeners[path]?.delete(fireLocalOnNext);
    };
  }

  let firestoreUnsub: (() => void) | null = null;
  let hasFallenBackToLocal = false;

  const handleFallback = () => {
    if (hasFallenBackToLocal) return;
    hasFallenBackToLocal = true;
    if (firestoreUnsub) {
      try {
        firestoreUnsub();
      } catch (_) {}
    }
    fireLocalOnNext();
    if (!listeners[path]) {
      listeners[path] = new Set();
    }
    listeners[path].add(fireLocalOnNext);
  };

  try {
    firestoreUnsub = firestoreOnSnapshot(
      ref,
      (snap) => {
        try {
          if (snap.exists && typeof snap.exists === 'function' && snap.exists()) {
            safeLocalStorage.setItem('isomorphic_db_doc_' + path, JSON.stringify(snap.data()));
          }
        } catch (_) {}
        onNext(snap);
      },
      (error) => {
        if (isQuotaError(error)) {
          markQuotaExhausted();
          handleFallback();
          return;
        }
        if (onError) {
          onError(error);
        } else {
          console.warn('[onSnapshot] Stream error, switching to local cache:', error.message);
          handleFallback();
        }
      }
    );
  } catch (err) {
    if (isQuotaError(err)) {
      markQuotaExhausted();
    }
    handleFallback();
  }

  return () => {
    if (firestoreUnsub) {
      try {
        firestoreUnsub();
      } catch (_) {}
    }
    if (hasFallenBackToLocal) {
      listeners[path]?.delete(fireLocalOnNext);
    }
  };
}

export const orderBy = firestoreOrderBy;
export const where = firestoreWhere;
export const serverTimestamp = firestoreServerTimestamp;
export const Timestamp = firestoreTimestamp;
export const limit = firestoreLimit;

// Export common Firestore types & other functions as-is
export {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  type User,
};
