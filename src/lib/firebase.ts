import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence,
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

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
// Use the databaseId from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

import { OperationType, handleFirestoreError } from './firestoreUtils';
import { safeLocalStorage } from '../utils/safeStorage';

const isBypass = typeof window !== 'undefined' && safeLocalStorage.getItem('developer_bypass') === 'true';

// Mock event bus for bypass mode
const listeners: { [path: string]: Set<() => void> } = {};
function notifyListeners(path: string) {
  if (listeners[path]) {
    listeners[path].forEach(cb => cb());
  }
}

// Global test connection function
async function testConnection() {
  if (isBypass) return;
  try {
    // Non-blocking check with timeout
    const d = firestoreDoc(db, 'test', 'connection');
    await Promise.race([
      firestoreGetDoc(d),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
    ]);
  } catch (_error) {
    // Ignore initial connection warming check errors
  }
}
// Run connection check in background without blocking
if (typeof window !== 'undefined') {
  setTimeout(() => { testConnection(); }, 1000);
}

export const googleProvider = new GoogleAuthProvider();
export { OperationType, handleFirestoreError };
googleProvider.addScope('email');
googleProvider.addScope('profile');

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

// --- Polymorphic Wrapping for Bypass Mode ---

export function doc(dbInstance: any, path: string, ...pathSegments: string[]) {
  if (isBypass) {
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
  if (isBypass) {
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
  if (isBypass) {
    return {
      _type: 'query' as const,
      colRef,
      path: colRef.path
    } as any;
  }
  return firestoreQuery(colRef, ...constraints);
}

export function addDoc(colRef: any, data: any): Promise<any> {
  if (isBypass) {
    const path = colRef.path;
    const existing = JSON.parse(safeLocalStorage.getItem('isomorphic_db_' + path) || '[]');
    const mockTimestamp = {
      toMillis: () => Date.now(),
      toDate: () => new Date(),
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: 0
    };
    const newDoc = {
      id: 'mock-doc-' + Math.random().toString(36).substr(2, 9),
      ...data,
      createdAt: data.createdAt || mockTimestamp
    };
    existing.unshift(newDoc);
    safeLocalStorage.setItem('isomorphic_db_' + path, JSON.stringify(existing));
    notifyListeners(path);
    return Promise.resolve({ id: newDoc.id });
  }
  return firestoreAddDoc(colRef, data);
}

export function setDoc(docRef: any, data: any, options?: any): Promise<void> {
  if (isBypass) {
    const path = docRef.path;
    let mergedData = data;
    if (options?.merge) {
      const existing = JSON.parse(safeLocalStorage.getItem('isomorphic_db_doc_' + path) || '{}');
      mergedData = { ...existing, ...data };
    }
    safeLocalStorage.setItem('isomorphic_db_doc_' + path, JSON.stringify(mergedData));
    notifyListeners(path);
    return Promise.resolve();
  }
  return firestoreSetDoc(docRef, data, options);
}

export function updateDoc(docRef: any, data: any): Promise<void> {
  if (isBypass) {
    const path = docRef.path;
    const existing = JSON.parse(safeLocalStorage.getItem('isomorphic_db_doc_' + path) || '{}');
    const updated = { ...existing, ...data };
    safeLocalStorage.setItem('isomorphic_db_doc_' + path, JSON.stringify(updated));
    notifyListeners(path);
    return Promise.resolve();
  }
  return firestoreUpdateDoc(docRef, data);
}

export function getDoc(docRef: any): Promise<any> {
  if (isBypass) {
    const path = docRef.path;
    const data = JSON.parse(safeLocalStorage.getItem('isomorphic_db_doc_' + path) || 'null');
    return Promise.resolve({
      exists: () => data !== null,
      data: () => data,
      id: docRef.id
    });
  }
  return firestoreGetDoc(docRef);
}

export function getDocs(colOrQueryRef: any): Promise<any> {
  if (isBypass) {
    const path = colOrQueryRef.path || colOrQueryRef.colRef?.path;
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
  return firestoreGetDocs(colOrQueryRef);
}

export function getDocFromServer(docRef: any): Promise<any> {
  if (isBypass) {
    return getDoc(docRef);
  }
  return firestoreGetDocFromServer(docRef);
}

export function onSnapshot(ref: any, onNext: any, onError?: any): any {
  if (isBypass) {
    const path = ref.path || ref.colRef?.path;
    const fireOnNext = () => {
      try {
        if (ref._type === 'document') {
          const data = JSON.parse(safeLocalStorage.getItem('isomorphic_db_doc_' + path) || 'null');
          onNext({
            exists: () => data !== null,
            data: () => data,
            id: ref.id
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

    // Trigger immediately
    fireOnNext();

    if (!listeners[path]) {
      listeners[path] = new Set();
    }
    listeners[path].add(fireOnNext);

    return () => {
      listeners[path]?.delete(fireOnNext);
    };
  }
  return firestoreOnSnapshot(ref, onNext, onError);
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
