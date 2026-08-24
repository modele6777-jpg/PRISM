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
  setLogLevel as firestoreSetLogLevel,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { OperationType, handleFirestoreError } from './firestoreUtils';
import { safeLocalStorage } from '../utils/safeStorage';

// Cleanup any legacy quota lockout flags from previous sessions so real sync is never blocked
if (typeof window !== 'undefined') {
  try {
    safeLocalStorage.removeItem('firestore_quota_exhausted_v1');
    sessionStorage.removeItem('firestore_quota_exhausted_v1');
  } catch (_) {}
}

// Initialize Firestore
try {
  firestoreSetLogLevel('silent');
} catch (_) {}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
// Use the databaseId from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export { OperationType, handleFirestoreError };

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

// Export standard Firestore functions directly to ensure 100% reliable cross-device real-time sync
export const doc = firestoreDoc;
export const collection = firestoreCollection;
export const query = firestoreQuery;
export const orderBy = firestoreOrderBy;
export const where = firestoreWhere;
export const serverTimestamp = firestoreServerTimestamp;
export const Timestamp = firestoreTimestamp;
export const limit = firestoreLimit;
export const getDocFromServer = firestoreGetDocFromServer;
export const getDocs = firestoreGetDocs;
export const getDoc = firestoreGetDoc;
export const onSnapshot = firestoreOnSnapshot;

export async function addDoc(colRef: any, data: any): Promise<any> {
  try {
    return await firestoreAddDoc(colRef, data);
  } catch (err: any) {
    console.warn('[Firestore] addDoc error:', err?.message || err);
    throw err;
  }
}

export async function setDoc(docRef: any, data: any, options?: any): Promise<void> {
  try {
    if (options) {
      await firestoreSetDoc(docRef, data, options);
    } else {
      await firestoreSetDoc(docRef, data);
    }
  } catch (err: any) {
    console.warn('[Firestore] setDoc error:', err?.message || err);
    throw err;
  }
}

export async function updateDoc(docRef: any, data: any): Promise<void> {
  try {
    await firestoreUpdateDoc(docRef, data);
  } catch (err: any) {
    console.warn('[Firestore] updateDoc error:', err?.message || err);
    throw err;
  }
}

export {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  type User,
};
