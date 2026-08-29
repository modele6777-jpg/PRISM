import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  orderBy,
  where
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { safeLocalStorage } from '../utils/safeStorage';
import { ReBibleVerse, ReBibleAnnotation, ReBibleStats, ReBibleBookSummary } from '../types/rebible';

const LOCAL_STORAGE_KEY = 'prism_rebible_verses_v2';

export const DEFAULT_SACRED_VERSES: ReBibleVerse[] = [
  {
    id: 'seed-verse-1',
    bookTitle: '각성의 서',
    chapterNumber: 1,
    verseNumber: 1,
    reference: '각성의 서 1:1',
    title: '거절의 고통 뒤에 온 진정한 방향',
    fact: '오랜 시간 준비했던 중요한 제안에서 거절을 겪었다. 모든 노력이 물거품이 된 것 같아 깊은 무기력과 자책감이 밀려왔다.',
    insight: '거절은 나의 본질적 가치를 부정한 것이 아니라, 내 영혼이 가야 할 진짜 목적지로 물길을 돌리는 우주의 축복이자 보호였다. 닫힌 문 앞에서 슬퍼하는 대신 열려 있는 새로운 길을 향해 고개를 들어야 한다.',
    emotions: ['상실', '수용', '용기', '해방'],
    tags: ['커리어', '자아성찰', '방향성'],
    annotations: [
      {
        id: 'seed-annot-1',
        verseId: 'seed-verse-1',
        writtenAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
        timeHorizon: '3개월 후의 성찰',
        content: '그때 거절당하지 않았다면 지금 시작한 이 가슴 뛰는 프로젝트를 결코 마주하지 못했을 것이다. 상처라 믿었던 사건이 내 삶에서 가장 위대한 전환점이었음을 깨닫는다.',
        shiftSummary: '절망이 가장 큰 은총으로 승화됨'
      }
    ],
    isSacredFavorite: true,
    recordedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'seed-verse-2',
    bookTitle: '정화의 서',
    chapterNumber: 1,
    verseNumber: 1,
    reference: '정화의 서 1:1',
    title: '모든 기억을 지우는 네 마디의 기적',
    fact: '타인과의 오해와 갈등으로 인해 분노와 억울함이 온종일 가슴속에 소용돌이쳤다. 상대를 탓하느라 내면의 에너지가 완전히 고갈되었다.',
    insight: '내가 타인에게서 본 갈등은 내 잠재의식 속에 재생되는 낡은 기억의 투사일 뿐이다. "미안합니다, 용서하세요, 고맙습니다, 사랑합니다"를 읊조리며 내 안의 기억을 정화할 때 외부의 현실 또한 거짓말처럼 평화로워진다.',
    emotions: ['분노', '정화', '용서', '평온'],
    tags: ['관계', '호오포노포노', '정화'],
    annotations: [
      {
        id: 'seed-annot-2',
        verseId: 'seed-verse-2',
        writtenAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
        timeHorizon: '정화 3주 차의 깨달음',
        content: '문제를 밖에서 고치려 하지 않고 내 안의 기억을 닦아내자, 상대방의 태도와 관계의 기류가 저절로 부드럽게 풀렸다.',
        shiftSummary: '비난에서 온전한 내면 정화로의 전환'
      }
    ],
    isSacredFavorite: true,
    recordedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'seed-verse-3',
    bookTitle: '평온의 서',
    chapterNumber: 1,
    verseNumber: 1,
    reference: '평온의 서 1:1',
    title: '모든 통제를 내려놓은 순간의 자유',
    fact: '상대방의 반응과 내일의 결과를 완벽하게 통제하려 안간힘을 썼다. 가슴이 조여오고 숨이 턱 끝까지 차올라 극심한 불안에 휩싸였다.',
    insight: '통제하려는 마음 자체가 두려움의 변형이다. 내가 쥐고 있으려 할수록 삶은 어긋난다. 손을 활짝 펴고 흐름에 맡길 때 비로소 진정한 내면의 권능과 평온이 회복된다.',
    emotions: ['불안', '내려놓음', '평온', '자유'],
    tags: ['심리치유', '세도나', '방하착'],
    annotations: [
      {
        id: 'seed-annot-3',
        verseId: 'seed-verse-3',
        writtenAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
        timeHorizon: '오늘의 주석',
        content: '쥐고 있던 손을 놓았을 때 세상은 무너지지 않았고, 오히려 더 큰 기적과 조화가 채워졌다. 내려놓음은 포기가 아니라 가장 강력한 신뢰다.',
        shiftSummary: '통제욕구에서 온전한 맡김으로 전환'
      }
    ],
    isSacredFavorite: true,
    recordedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'seed-verse-4',
    bookTitle: '지혜의 서',
    chapterNumber: 1,
    verseNumber: 1,
    reference: '지혜의 서 1:1',
    title: '내면의 신성한 불꽃과 자아의 만남',
    fact: '남들의 기대와 평가에 맞추어 살아가느라 내가 진정 무엇을 원하는지 잊고 있었다. 칭찬을 들어도 마음은 텅 빈 것처럼 공허했다.',
    insight: '타인의 인정은 바닷물과 같아서 마실수록 갈증만 더해진다. 오직 내 안의 참된 목소리에 귀 기울이고 영혼이 인도하는 진실된 한 걸음을 내딛을 때 마르지 않는 생명수 같은 충만함이 차오른다.',
    emotions: ['공허', '자기발견', '충만', '감사'],
    tags: ['자아성찰', '루시의조언', '영성'],
    annotations: [],
    isSacredFavorite: false,
    recordedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export function getLocalVerses(): ReBibleVerse[] {
  try {
    const raw = safeLocalStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      safeLocalStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_SACRED_VERSES));
      return DEFAULT_SACRED_VERSES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_SACRED_VERSES;
  } catch (e) {
    console.error('Failed to load local Re:Bible verses:', e);
    return DEFAULT_SACRED_VERSES;
  }
}

export function saveLocalVerses(verses: ReBibleVerse[]): void {
  try {
    safeLocalStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(verses));
  } catch (e) {
    console.error('Failed to save local Re:Bible verses:', e);
  }
}

export async function saveVerseToFirestore(verse: ReBibleVerse): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const verseRef = doc(db, 'rebible_verses', user.uid, 'verses', verse.id);
    await setDoc(verseRef, {
      ...verse,
      userId: user.uid,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.warn('Firestore verse sync error (saved locally):', e);
  }
}

export async function deleteVerseFromFirestore(verseId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const verseRef = doc(db, 'rebible_verses', user.uid, 'verses', verseId);
    await deleteDoc(verseRef);
  } catch (e) {
    console.warn('Firestore verse delete error:', e);
  }
}

export function subscribeToReBibleVerses(
  userId: string | undefined, 
  callback: (verses: ReBibleVerse[]) => void
): () => void {
  const localData = getLocalVerses();
  callback(localData);

  if (!userId) {
    return () => {};
  }

  try {
    const versesCol = collection(db, 'rebible_verses', userId, 'verses');
    const q = query(versesCol);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const cloudVerses: ReBibleVerse[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as ReBibleVerse;
          cloudVerses.push({
            ...data,
            id: docSnap.id,
            annotations: Array.isArray(data.annotations) ? data.annotations : []
          });
        });

        cloudVerses.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
        saveLocalVerses(cloudVerses);
        callback(cloudVerses);
      } else if (localData.length > 0) {
        localData.forEach((v) => saveVerseToFirestore(v));
      }
    }, (error) => {
      console.warn('Re:Bible onSnapshot error (using local cache):', error);
      callback(getLocalVerses());
    });

    return unsubscribe;
  } catch (e) {
    console.warn('Error subscribing to Re:Bible Firestore:', e);
    return () => {};
  }
}

export function calculateReBibleStats(verses: ReBibleVerse[]): ReBibleStats {
  const totalVerses = verses.length;
  let totalAnnotations = 0;
  let favoriteCount = 0;
  const emotionMap: Record<string, number> = {};
  const tagMap: Record<string, number> = {};

  verses.forEach((v) => {
    if (v.isSacredFavorite) favoriteCount++;
    if (Array.isArray(v.annotations)) {
      totalAnnotations += v.annotations.length;
    }
    v.emotions?.forEach((em) => {
      if (em) emotionMap[em] = (emotionMap[em] || 0) + 1;
    });
    v.tags?.forEach((tg) => {
      if (tg) tagMap[tg] = (tagMap[tg] || 0) + 1;
    });
  });

  const topEmotions = Object.entries(emotionMap)
    .map(([emotion, count]) => ({ emotion, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const topTags = Object.entries(tagMap)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    totalVerses,
    totalAnnotations,
    favoriteCount,
    topEmotions,
    topTags,
    transmutationRatio: totalVerses > 0 ? 100 : 0
  };
}

export function groupVersesByBook(verses: ReBibleVerse[]): Record<string, ReBibleVerse[]> {
  const grouped: Record<string, ReBibleVerse[]> = {};
  verses.forEach((v) => {
    const b = v.bookTitle || '지혜의 서';
    if (!grouped[b]) {
      grouped[b] = [];
    }
    grouped[b].push(v);
  });
  return grouped;
}
