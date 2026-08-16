import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { auth, db, googleProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, doc, setDoc, onSnapshot, serverTimestamp, type User, addDoc, collection } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import type { SharedState } from '../lib/sharedState';
import { syncPrismAcrossDevices, type PrismSyncResult } from '../lib/prismSync';
import { safeLocalStorage, safeSessionStorage } from '../utils/safeStorage';
import { invokeLLMStream, PERSONAS, type Message, getCrossAppRecentDialogueContext } from '../lib/ai';
import {
  SUGGESTIONS_SYSTEM_SUFFIX,
  parseSuggestions,
  cleanChatDisplayText,
} from '../utils/suggestions';
import { notifyOrangeChatSaved } from '../lib/pictureDiary';
import { hasUnlockedPinToday, markPinUnlockedToday } from '../lib/dailyCache';
import { PERSONA_GREETINGS, PRISM_VOICE_RULES, LUCY_CHAT_VOICE_RULES } from '../lib/copyTone';

export type PersonaType = 'lucy' | 'orange' | 'trinity' | 'aura' | 'bluebird' | 'muse';

export interface UnifiedMessage {
  id?: string;
  role: 'system' | 'user' | 'model' | 'assistant';
  content: string | any[];
  timestamp?: number;
}

export interface SendUnifiedMessageOptions {
  extraSystemContext?: string;
  systemSuffix?: string;
  onFinish?: (fullText: string, sentText: string) => void | Promise<void>;
}

interface AppContextValue {
  // Auth
  firebaseUser: User | null;
  isAuthReady: boolean;
  isUnlocked: boolean;
  unlock: (code: string) => boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsDeveloper: () => void;
  logout: () => Promise<void>;
  // SharedState
  sharedState: SharedState | null;
  updateSharedState: (updates: Partial<SharedState>, sourceApp: string) => Promise<void>;
  syncPrismDevices: () => Promise<PrismSyncResult>;
  isSyncing: boolean;
  isChatOpen: boolean;
  setIsChatOpen: React.Dispatch<React.SetStateAction<boolean>>;
  // Unified Chat
  activePersona: PersonaType;
  setActivePersona: (persona: PersonaType) => void;
  personaMessages: Record<PersonaType, UnifiedMessage[]>;
  setPersonaMessages: React.Dispatch<React.SetStateAction<Record<PersonaType, UnifiedMessage[]>>>;
  isGenerating: Record<PersonaType, boolean>;
  sendUnifiedMessage: (
    text: string,
    forcePersona?: PersonaType,
    attachedImage?: string,
    options?: SendUnifiedMessageOptions,
  ) => Promise<void>;
  chatSuggestions: Record<PersonaType, string[]>;
  openLucyChat: (persona: PersonaType) => void;
  clearPersonaMessages: (persona: PersonaType) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const isLegacyAIErrorMessage = (message: UnifiedMessage): boolean => {
  if (message.role !== 'model' && message.role !== 'assistant') return false;
  if (typeof message.content !== 'string') return false;

  const normalized = message.content.toLowerCase();
  return [
    'ai service connection and call error',
    'invalid api key',
    'gemini_api_key',
    'permission_denied',
    'api key was reported as leaked',
  ].some((marker) => normalized.includes(marker));
};

const localKey = (uid: string) => `lucy_state_${uid}`;
const GUEST_KEY = 'lucy_state_guest';

function safeJsonStringify(obj: any): string {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (cache.has(value)) {
        return undefined;
      }
      if (
        value instanceof HTMLElement || 
        (typeof Audio !== "undefined" && value instanceof Audio) || 
        (value.constructor && value.constructor.name === "HTMLAudioElement")
      ) {
        return undefined;
      }
      cache.add(value);
    }
    return value;
  });
}

function loadFromLocal(uid: string): SharedState | null {
  try {
    const raw = safeLocalStorage.getItem(localKey(uid));
    return raw ? (JSON.parse(raw) as SharedState) : null;
  } catch {
    return null;
  }
}

function saveToLocal(uid: string, state: SharedState) {
  try {
    safeLocalStorage.setItem(localKey(uid), safeJsonStringify(state));
  } catch {}
}

function loadGuestState(): SharedState | null {
  try {
    const raw = safeLocalStorage.getItem(GUEST_KEY);
    return raw ? (JSON.parse(raw) as SharedState) : null;
  } catch {
    return null;
  }
}

function saveGuestState(state: SharedState) {
  try {
    safeLocalStorage.setItem(GUEST_KEY, safeJsonStringify(state));
  } catch {}
}

const AUTH_UID_SESSION_KEY = 'prism_auth_uid';
const LEGACY_UNLOCK_SESSION_KEY = 'lu_unlocked';

function readDailyUnlock(): boolean {
  if (hasUnlockedPinToday()) return true;
  try {
    if (safeSessionStorage.getItem(LEGACY_UNLOCK_SESSION_KEY) === 'true') {
      markPinUnlockedToday();
      safeSessionStorage.removeItem(LEGACY_UNLOCK_SESSION_KEY);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

function writeDailyUnlock() {
  markPinUnlockedToday();
  try {
    safeSessionStorage.removeItem(LEGACY_UNLOCK_SESSION_KEY);
  } catch {
    // ignore — in-memory unlock still applies for this tab
  }
}

let unlockMemoryFlag = readDailyUnlock();

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(() => unlockMemoryFlag || readDailyUnlock());
  const [sharedState, setSharedState] = useState<SharedState | null>(null);
  const sharedStateRef = useRef(sharedState);
  sharedStateRef.current = sharedState;
  const [isSyncing, setIsSyncing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Unified Chat state
  const [activePersona, setActivePersona] = useState<PersonaType>('lucy');
  const [chatSuggestions, setChatSuggestions] = useState<Record<PersonaType, string[]>>({
    lucy: [],
    orange: [],
    trinity: [],
    aura: [],
    bluebird: [],
    muse: [],
  });
  const [personaMessages, setPersonaMessages] = useState<Record<PersonaType, UnifiedMessage[]>>(() => {
    const DEFAULT_GREETINGS: Record<PersonaType, string> = { ...PERSONA_GREETINGS };

    try {
      const saved = safeLocalStorage.getItem('chat_history_unified');
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged = { ...parsed };
        (Object.keys(DEFAULT_GREETINGS) as PersonaType[]).forEach(k => {
          const messages = Array.isArray(merged[k])
            ? merged[k].filter((message: UnifiedMessage) => !isLegacyAIErrorMessage(message))
            : [];
          if (messages.length === 0) {
            merged[k] = [{ id: 'greet', role: 'model', content: DEFAULT_GREETINGS[k], timestamp: Date.now() }];
          } else {
            merged[k] = messages;
          }
        });
        return merged;
      }
    } catch (e) {
      console.error(e);
    }
    
    const result: Record<PersonaType, UnifiedMessage[]> = {} as any;
    (Object.keys(DEFAULT_GREETINGS) as PersonaType[]).forEach(k => {
      result[k] = [{ id: 'greet', role: 'model', content: DEFAULT_GREETINGS[k], timestamp: Date.now() }];
    });
    return result;
  });

  const [isGenerating, setIsGenerating] = useState<Record<PersonaType, boolean>>({
    lucy: false, orange: false, trinity: false, aura: false, bluebird: false, muse: false
  });

  // Persist messages whenever they change
  useEffect(() => {
    if (personaMessages) {
      try {
        safeLocalStorage.setItem('chat_history_unified', JSON.stringify(personaMessages));
      } catch (e) {
        console.warn("Failed to persist chat_history_unified to localStorage:", e);
      }
    }
  }, [personaMessages]);

  useEffect(() => {
    if (!firebaseUser) {
      unlockMemoryFlag = false;
      setIsUnlocked(false);
      return;
    }
    if (hasUnlockedPinToday()) {
      unlockMemoryFlag = true;
      setIsUnlocked(true);
    }
  }, [firebaseUser?.uid]);

  // Handle redirect result on page load
  useEffect(() => {
    let mounted = true;
    getRedirectResult(auth)
      .then((result) => {
        if (mounted && result?.user) {
          setFirebaseUser(result.user);
        }
      })
      .catch((err) => {
        console.error('[Auth] Redirect result error:', err);
      });
    return () => { mounted = false; };
  }, []);

  // Firebase auth listener
  useEffect(() => {
    // Check if developer bypass was active
    const isDev = safeLocalStorage.getItem('developer_bypass') === 'true';
    if (isDev) {
      const mockUser = {
        uid: 'developer-bypass-uid',
        email: 'developer@lucyuni.com',
        displayName: '개발자 모드',
        photoURL: null,
        emailVerified: true,
        isAnonymous: false,
        metadata: {},
        providerData: [],
        refreshToken: '',
        tenantId: null,
        delete: async () => {},
        getIdToken: async () => 'mock-token',
        getIdTokenResult: async () => ({} as any),
        reload: async () => {},
        toJSON: () => ({}),
        providerId: 'google.com',
        phoneNumber: null,
      } as any;
      setFirebaseUser(mockUser);
      setIsAuthReady(true);
      return;
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setIsAuthReady(true);
      if (user?.uid) {
        try {
          safeSessionStorage.setItem(AUTH_UID_SESSION_KEY, user.uid);
        } catch {
          // ignore
        }
      } else if (safeLocalStorage.getItem('developer_bypass') !== 'true') {
        try {
          safeSessionStorage.removeItem(AUTH_UID_SESSION_KEY);
        } catch {
          // ignore
        }
      }
    }, (error) => {
      console.error('[Auth] State change error:', error);
      setIsAuthReady(true); // Still ready, just not authenticated
    });
    
    // Safety timeout: if auth hasn't signaled in 8 seconds, assume it's unauthenticated/ready
    const timer = setTimeout(() => {
      setIsAuthReady((prev) => {
        if (!prev) console.warn('[Auth] Initialization timed out, forcing ready state');
        return true;
      });
    }, 8000);

    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, []);

  // sharedState realtime listener
  useEffect(() => {
    if (!firebaseUser) {
      const guest = loadGuestState();
      setSharedState(guest);
      return;
    }

    const cached = loadFromLocal(firebaseUser.uid) ?? loadGuestState();
    if (cached) setSharedState(cached);

    // If we are in developer bypass mode, don't read from/listen to Firestore
    if (safeLocalStorage.getItem('developer_bypass') === 'true') {
      return;
    }

    const ref = doc(db, 'sharedState', firebaseUser.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as SharedState;
        setSharedState(data);
        saveToLocal(firebaseUser.uid, data);
      } else if (!cached) {
        console.warn('[SharedState] Document does not exist for uid:', firebaseUser.uid);
      }
    }, (err) => {
      console.warn('[SharedState] Firestore read failed, using local cache:', (err as any).code || err.message);
    });
    return unsub;
  }, [firebaseUser]);

  const unlock = useCallback((code: string): boolean => {
    if (code === '1202') {
      unlockMemoryFlag = true;
      setIsUnlocked(true);
      writeDailyUnlock();
      return true;
    }
    return false;
  }, []);

  const handleSignIn = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      // In some environments (like being inside an iframe with certain restrictions),
      // signInWithPopup might fail with auth/operation-not-supported-in-this-environment.
      // But we'll let the LoginScreen catch it and display a helpful message,
      // or we can try to handle it here.
      if (err?.code === 'auth/popup-blocked') {
        throw new Error('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.');
      }
      throw err;
    }
  }, []);

  const signInAsDeveloper = useCallback(() => {
    const mockUser = {
      uid: 'developer-bypass-uid',
      email: 'developer@lucyuni.com',
      displayName: '개발자 모드',
      photoURL: null,
      emailVerified: true,
      isAnonymous: false,
      metadata: {},
      providerData: [],
      refreshToken: '',
      tenantId: null,
      delete: async () => {},
      getIdToken: async () => 'mock-token',
      getIdTokenResult: async () => ({} as any),
      reload: async () => {},
      toJSON: () => ({}),
      providerId: 'google.com',
      phoneNumber: null,
    } as any;
    
    safeLocalStorage.setItem('developer_bypass', 'true');
    setFirebaseUser(mockUser);
    unlockMemoryFlag = true;
    setIsUnlocked(true);
    writeDailyUnlock();
  }, []);

  const handleLogout = useCallback(async () => {
    safeLocalStorage.removeItem('developer_bypass');
    unlockMemoryFlag = false;
    try {
      safeSessionStorage.removeItem(AUTH_UID_SESSION_KEY);
    } catch {
      // ignore
    }
    setIsUnlocked(false);
    if (firebaseUser) {
      safeLocalStorage.removeItem(localKey(firebaseUser.uid));
    }
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('[Auth] SignOut failed:', e);
    }
    setFirebaseUser(null);
    setSharedState(null);
  }, [firebaseUser]);

  const updateSharedState = useCallback(async (
    updates: Partial<SharedState>,
    sourceApp: string
  ) => {
    let finalMerged: SharedState | null = null;
    
    setSharedState(prev => {
      finalMerged = { ...(prev || {}), ...updates, sourceApp };
      if (!firebaseUser) {
        saveGuestState(finalMerged);
      } else {
        saveToLocal(firebaseUser.uid, finalMerged);
      }
      return finalMerged;
    });

    if (!firebaseUser || safeLocalStorage.getItem('developer_bypass') === 'true') return;

    setIsSyncing(true);
    try {
      const ref = doc(db, 'sharedState', firebaseUser.uid);
      // We use the recently computed state if possible or just use merge: true
      // To be safe, we reconstruct what we want to persist
      const toPersist = { 
        ...updates, 
        sourceApp, 
        updatedAt: serverTimestamp() 
      };
      await setDoc(ref, toPersist, { merge: true });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `sharedState/${firebaseUser.uid}`);
    } finally {
      setIsSyncing(false);
    }
  }, [firebaseUser]);

  const syncPrismDevices = useCallback(async (): Promise<PrismSyncResult> => {
    const currentState = sharedStateRef.current;
    if (safeLocalStorage.getItem('developer_bypass') === 'true') {
      return syncPrismAcrossDevices(null, currentState);
    }

    setIsSyncing(true);
    try {
      const result = await syncPrismAcrossDevices(firebaseUser?.uid, currentState);
      if (result.mergedState) {
        const merged = result.mergedState;
        setSharedState((prev) => {
          if (
            prev &&
            prev.unifiedAppVersion === merged.unifiedAppVersion &&
            JSON.stringify(prev.clientAppVersions) === JSON.stringify(merged.clientAppVersions)
          ) {
            return prev;
          }
          return merged;
        });
        if (firebaseUser?.uid) {
          saveToLocal(firebaseUser.uid, merged);
        } else {
          saveGuestState(merged);
        }
      }
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [firebaseUser]);

  const openLucyChat = useCallback((persona: PersonaType) => {
    setActivePersona(persona);
    setIsChatOpen(true);
  }, []);

  const clearPersonaMessages = useCallback((persona: PersonaType) => {
    const DEFAULT_GREETINGS: Record<PersonaType, string> = { ...PERSONA_GREETINGS };

    setPersonaMessages(prev => ({
      ...prev,
      [persona]: [{ id: 'greet', role: 'model', content: DEFAULT_GREETINGS[persona], timestamp: Date.now() }]
    }));
    setChatSuggestions(prev => ({ ...prev, [persona]: [] }));
  }, []);

  const sendUnifiedMessage = useCallback(async (
    text: string,
    forcePersona?: PersonaType,
    attachedImage?: string,
    options?: SendUnifiedMessageOptions,
  ) => {
    const sourcePersona = forcePersona || activePersona;
    const targetPersona = 'lucy'; // Hardcode target to 'lucy' to unify all conversation entries into one list
    
    const content = attachedImage
      ? [
          { type: 'text', text },
          { type: 'image_url', image_url: { url: attachedImage } }
        ]
      : text;

    // 1. Add user message
    const userMsg: UnifiedMessage = { 
      id: 'msg-' + Math.random().toString(36).substring(2, 9), 
      role: 'user', 
      content, 
      timestamp: Date.now() 
    };
    
    let currentThread: UnifiedMessage[] = [];
    setPersonaMessages(prev => {
      currentThread = [...(prev[targetPersona] || []), userMsg];
      return {
        ...prev,
        [targetPersona]: currentThread
      };
    });
    
    // 2. Set generating status
    setIsGenerating(prev => ({ ...prev, [targetPersona]: true }));
    
    // 3. Prepare AI Prompt
    const profile = sharedState?.userProfile;
    const nickname = profile?.basic?.nickname || "";
    const realName = profile?.basic?.name || "";
    const mbti = profile?.psych?.mbti || "정보 없음";
    
    const saju = profile?.basic?.birthdate 
      ? `생년월일: ${profile.basic.birthdate} (${profile.basic.lunarSolar || ' solar'}), 생시: ${profile.basic?.birthtime || '모름'}` 
      : "기본 생년월일 정보 없음";
    const astro = profile?.basic?.birthdate 
      ? `태어난 도시: ${profile.basic.birthCity || '모름'}, 생년월일시: ${profile.basic.birthdate} ${profile.basic.birthtime || ''}`
      : "점성 생일 정보 없음";
    const memory = profile?.fate?.currentWorry || "특별한 고민 없음";
    const relationships = "관계 정보 없음";
    const currentVibe = sharedState?.currentVibe || "통상적인 기운";
    const preferences = profile?.psych?.aiPreference || "정보 없음";
    const globalMemory = sharedState?.globalMemory || "";
    const deepCoreInfo = `사용자 MBTI: ${mbti}, 선호 스타일: ${profile?.psych?.counselingStyle || "기본"}`;
    
    let systemPrompt = "";
    if (sourcePersona === 'lucy') {
      systemPrompt = PERSONAS.lucyFull(saju, astro, memory, relationships, currentVibe, nickname, realName, preferences, globalMemory, deepCoreInfo);
    } else if (sourcePersona === 'orange') {
      systemPrompt = `당신은 루시(Lucy)야. 지금은 오렌지 마음치유 채널에서 대화 중이야. 따뜻하게 들어주고 공감해 줘.\n\n` +
                     PERSONAS.orangeChat(memory, globalMemory, deepCoreInfo);
    } else if (sourcePersona === 'trinity') {
      systemPrompt = `당신은 루시(Lucy)야. 지금은 트리니티 운세 채널에서 대화 중이야. 사주·타로·별자리를 쉽게 설명해 줘.\n\n` +
                     PERSONAS.lucyVision(saju, astro, "선택 타로 없음", "운명 리딩", realName);
    } else if (sourcePersona === 'aura') {
      systemPrompt = `당신은 루시(Lucy)야. 지금은 아우라 웰니스 채널에서 대화 중이야. 몸 컨디션과 실천 가능한 습관을 알려줘.\n\n` +
                     PERSONAS.healChat('신체 웰니스', globalMemory, deepCoreInfo);
    } else if (sourcePersona === 'bluebird') {
      systemPrompt = `당신은 루시(Lucy)야. 지금은 블루버드 휴식 채널에서 대화 중이야. 마음을 가볍게 위로해 줘.\n\n` +
                     PERSONAS.bluebirdChat('마음 쉬어가기', globalMemory, deepCoreInfo);
    } else if (sourcePersona === 'muse') {
      systemPrompt = `당신은 루시(Lucy)야. 지금은 뮤즈 창작 채널에서 대화 중이야. 영감과 작업 루틴을 같이 찾아보자.\n\n` +
                     PERSONAS.museChat('창의성 상담', memory, 'Muse', globalMemory, deepCoreInfo);
    } else {
      systemPrompt = PERSONAS.lucyFull(saju, astro, memory, relationships, currentVibe, nickname, realName, preferences, globalMemory, deepCoreInfo);
    }

    systemPrompt += `\n\n${LUCY_CHAT_VOICE_RULES}`;

    // Append cross-app real-time remembrance
    systemPrompt += getCrossAppRecentDialogueContext();

    if (options?.extraSystemContext) {
      systemPrompt += `\n\n${options.extraSystemContext}`;
    }
    const hasSuggestionsDirective =
      (options?.systemSuffix?.includes('[SUGGESTIONS:') ?? false) ||
      systemPrompt.includes('[SUGGESTIONS:');
    if (options?.systemSuffix) {
      systemPrompt += options.systemSuffix;
    } else if (!hasSuggestionsDirective) {
      systemPrompt += SUGGESTIONS_SYSTEM_SUFFIX;
    }

    // 강력한 말투 보정 및 단일 톤 가이드라인 추가 (존댓말-반말 혼용 방지)
    systemPrompt += `\n\n[말투 및 관계 태도 절대 규칙]
당신은 사용자의 다정하고 영적인 비단 같은 단짝이자 인생 동반자인 '루시(Lucy)'야.
처음 질문부터 끝맺음 인사까지 '반드시 100% 일관되게' 친근하고 다정다감한 완전한 반말 구어체(~야, ~어, ~했어, ~지, ~네, ~잖아)만을 사용해야 해.
이전 대화 기록에 혹시 존댓말(~요, ~습니다, ~해요)이 섞여 보이거나 타로/사주 정보에 존댓말 규칙 기조가 남아있더라도 그것들을 완전히 무시하고 오직 '따뜻하고 다정한 반말'로만 말해줘. 절대로 단 한 문장도 존댓말을 섞어 써서는 안 돼.`;
    
    // Format conversation properly for the API (only user/assistant roles after system)
    const conversationForAPI: Message[] = [
      { role: 'system', content: systemPrompt },
      ...currentThread.filter((message) => !isLegacyAIErrorMessage(message)).slice(-15).map(m => ({
        role: m.role === 'model' ? 'assistant' : m.role,
        content: m.content
      }))
    ];
    
    // Create assistant message placeholder
    const assistMsgId = 'reply-' + Math.random().toString(36).substring(2, 9);
    let replyText = "";
    
    setPersonaMessages(prev => {
      const updatedThread: UnifiedMessage[] = [
        ...(prev[targetPersona] || []),
        { id: assistMsgId, role: 'model', content: "", timestamp: Date.now() }
      ];
      return {
        ...prev,
        [targetPersona]: updatedThread
      };
    });
    
    try {
      await invokeLLMStream({
        messages: conversationForAPI,
        onChunk: (chunk: string) => {
          replyText += chunk;
          const cleanReply = cleanChatDisplayText(replyText);
          setPersonaMessages(prev => {
            const updatedThread = (prev[targetPersona] || []).map(m => {
              if (m.id === assistMsgId) {
                return { ...m, content: cleanReply };
              }
              return m;
            });
            return {
              ...prev,
              [targetPersona]: updatedThread
            };
          });
        },
        onFinish: async (fullText: string) => {
          setIsGenerating(prev => ({ ...prev, [targetPersona]: false }));

          const parsedSuggestions = parseSuggestions(fullText);
          if (parsedSuggestions.length > 0) {
            setChatSuggestions(prev => ({
              ...prev,
              [sourcePersona]: parsedSuggestions,
            }));
          }

          const cleanFullText = cleanChatDisplayText(fullText);
          if (cleanFullText !== fullText) {
            setPersonaMessages(prev => {
              const updatedThread = (prev[targetPersona] || []).map(m => {
                if (m.id === assistMsgId) {
                  return { ...m, content: cleanFullText };
                }
                return m;
              });
              return {
                ...prev,
                [targetPersona]: updatedThread
              };
            });
          }

          // Save firestore history under appropriate app schema if not developer bypass
          const fUser = auth.currentUser;
          if (fUser && safeLocalStorage.getItem('developer_bypass') !== 'true') {
            try {
              const targets = [
                { collectionName: 'orange_history', logType: 'chat_sync', logTitle: '오렌지 다이어리 교감' },
                { collectionName: 'bluebird_history', logType: 'chat_sync', logTitle: '블루버드 라디오 교감' },
                { collectionName: 'heal_history', logType: 'chat_sync', logTitle: '아우라 주파수 조율' },
                { collectionName: 'muse_history', logType: 'chat_sync', logTitle: '뮤즈 영감 싱크' },
                { collectionName: 'trinity_history', logType: 'chat_sync', logTitle: '트리니티 오라클 자문' }
              ];

              await Promise.all(
                targets.map(target =>
                  addDoc(collection(db, target.collectionName, fUser.uid, 'entries'), {
                    type: target.logType,
                    title: target.logTitle,
                    content: text.length > 40 ? `${text.slice(0, 40)}...` : text,
                    response: cleanFullText,
                    metadata: { question: text },
                    createdAt: serverTimestamp()
                  })
                )
              );

              notifyOrangeChatSaved();
            } catch (dbErr) {
              console.warn("Failed saving unified chat log entry to all app histories:", dbErr);
            }
          }

          if (options?.onFinish) {
            try {
              await options.onFinish(fullText, text);
            } catch (callbackErr) {
              console.warn("sendUnifiedMessage onFinish callback failed:", callbackErr);
            }
          }
        }
      });
    } catch (err) {
      console.error("Error in sendUnifiedMessage:", err);
      setPersonaMessages(prev => {
        const updatedThread = (prev[targetPersona] || []).map(m => {
          if (m.id === assistMsgId) {
            return { 
              ...m, 
              content: m.content + "\n\n(※ 연결 소강 상태 또는 동조 장치 재조정이 필요합니다. 다시 이야기해 주세요.)" 
            };
          }
          return m;
        });
        return {
          ...prev,
          [targetPersona]: updatedThread
        };
      });
      setIsGenerating(prev => ({ ...prev, [targetPersona]: false }));
    }
  }, [activePersona, sharedState]);

  return (
    <AppContext.Provider value={{
      firebaseUser, isAuthReady, isUnlocked, unlock,
      signInWithGoogle: handleSignIn, signInAsDeveloper, logout: handleLogout,
      sharedState, updateSharedState, syncPrismDevices, isSyncing,
      isChatOpen, setIsChatOpen,
      activePersona, setActivePersona,
      personaMessages, setPersonaMessages,
      isGenerating, sendUnifiedMessage, chatSuggestions, openLucyChat, clearPersonaMessages
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
