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

/**
 * 기존 '통합의 서' 등에 16개 또는 다수의 항목이 1개의 구절에 몰려있는 경우,
 * 이를 주제별 독립 구절(운명의 서, 정화의 서, 치유의 서, 성찰의 서, 영감의 서, 지혜의 서)로
 * 자동 분할하여 서재를 풍성하게 분류하는 마이그레이션 함수
 */
export function decomposeMultiTopicVerses(verses: ReBibleVerse[]): ReBibleVerse[] {
  let hasChanged = false;
  const result: ReBibleVerse[] = [];

  verses.forEach((v) => {
    const isMultiTopic =
      (v.bookTitle === '통합의 서' || v.title?.includes('통합 기록') || v.title?.includes('통합 여정')) &&
      v.fact &&
      (v.fact.includes('1. [') || v.fact.includes('2. [') || v.fact.split('\n\n').length >= 3);

    if (!isMultiTopic) {
      result.push(v);
      return;
    }

    hasChanged = true;
    const items = v.fact
      .split(/\n\s*(?=\d+\.\s*\[|\[)/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 5 && !s.startsWith('[') && !s.includes('프리즘 여정 활동 전체 기록'));

    if (items.length <= 1) {
      const altItems = v.fact
        .split('\n\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 10 && !s.includes('활동 전체 기록'));
      if (altItems.length > 1) {
        items.push(...altItems);
      }
    }

    if (items.length <= 1) {
      result.push(v);
      return;
    }

    // Convert each item to its own thematic verse
    items.forEach((item, idx) => {
      const cleanItem = item.replace(/^\d+\.\s*/, '').trim();
      let bookTitle = '지혜의 서';
      let title = v.title;
      let insight = v.insight;
      let emotions = v.emotions || ['통찰', '평온'];
      let tags = v.tags || ['프리즘여정'];

      if (cleanItem.includes('[트리니티') || cleanItem.includes('타로')) {
        bookTitle = '운명의 서';
        title = `타로 리딩으로 마주한 영적 이정표`;
        insight = `운명의 수레바퀴는 영혼의 성숙과 자유를 위해 길을 비춥니다. ${cleanItem}에서 전하는 계시는 하늘의 타이밍을 신뢰하라는 신성한 초대입니다. 당신 안에 깃든 창조자의 권능으로 최고의 미래를 선택하세요.`;
        emotions = ['직관', '수용', '용기', '신뢰'];
        tags = ['트리니티', '타로리딩', '운명의서'];
      } else if (cleanItem.includes('[블루버드') || cleanItem.includes('호오포노포노') || cleanItem.includes('비밀쪽지')) {
        bookTitle = '정화의 서';
        title = `호오포노포노 정화로 비워낸 내면의 평온`;
        insight = `모든 고통과 갈등은 내 잠재의식 속에 재생되는 낡은 기억의 투사일 뿐입니다. "미안합니다, 용서하세요, 고맙습니다, 사랑합니다"의 정화 파동을 통해 내면을 비워낼 때, 본래의 순수한 평온과 신성의 은총이 회복됩니다.`;
        emotions = ['정화', '용서', '해방', '평온'];
        tags = ['블루버드', '호오포노포노', '정화의서'];
      } else if (cleanItem.includes('[아우라') || cleanItem.includes('명상') || cleanItem.includes('세도나') || cleanItem.includes('생체')) {
        bookTitle = '치유의 서';
        title = `1분 호흡과 방하착으로 되찾은 생명력`;
        insight = `육체와 마음의 고통은 붙잡으려는 집착에서 비롯됩니다. 숨을 깊이 내쉬며 통제 욕구를 흘려보낼 때 몸과 마음은 본래의 온전함으로 스스로 회복됩니다. 이 호흡이 온 삶을 지탱하는 치유의 반석입니다.`;
        emotions = ['치유', '이완', '생명력', '안식'];
        tags = ['아우라', '1분명상', '치유의서'];
      } else if (cleanItem.includes('[오렌지') || cleanItem.includes('연금술') || cleanItem.includes('소원')) {
        bookTitle = '성찰의 서';
        title = `감정 연금술과 본질적 의사결정의 지혜`;
        insight = `삶의 혼란은 본질을 찾기 위한 연금술의 도가니입니다. 두려움이라는 납을 지혜라는 황금으로 바꾸는 비결은 제1원칙으로 파고드는 데 있습니다. 우물에 띄운 소망은 이미 우주의 중심에 닿아 있습니다.`;
        emotions = ['명료함', '통찰', '연금술', '확신'];
        tags = ['오렌지', '감정연금술', '성찰의서'];
      } else if (cleanItem.includes('[뮤즈') || cleanItem.includes('창작') || cleanItem.includes('예술') || cleanItem.includes('도슨트')) {
        bookTitle = '영감의 서';
        title = `예술적 공명과 창조성의 불꽃`;
        insight = `아름다움은 영혼이 신성을 기억해내는 가장 순수한 통로입니다. 예술과 음악이 전하는 전율은 굳어 있던 가슴을 열고 잠든 창의성을 깨웁니다. 당신의 삶 자체가 위대한 예술 작품입니다.`;
        emotions = ['영감', '환희', '창조', '경이'];
        tags = ['뮤즈', '예술추천', '영감의서'];
      } else if (cleanItem.includes('[루시') || cleanItem.includes('대화')) {
        bookTitle = '지혜의 서';
        title = `루시와 나눈 영혼의 대화와 조율`;
        insight = `모든 답은 이미 당신의 내면에 존재하며, 질문하는 순간 우주는 온 힘을 다해 응답합니다. 5대 지능의 거울을 통해 나 자신을 온전히 마주할 때 거룩한 지혜의 성전이 완성됩니다.`;
        emotions = ['통합', '자각', '사랑', '충만'];
        tags = ['루시', '영혼대화', '지혜의서'];
      }

      result.push({
        id: `${v.id}-sub-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        bookTitle,
        chapterNumber: 1,
        verseNumber: idx + 1,
        reference: `${bookTitle} 1:${idx + 1}`,
        title,
        fact: cleanItem,
        insight,
        emotions,
        tags: Array.from(new Set([...tags, ...(v.tags || [])])),
        annotations: v.annotations || [],
        isSacredFavorite: true,
        recordedAt: v.recordedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
  });

  if (hasChanged) {
    try {
      safeLocalStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(result));
    } catch (_) {}
  }

  return result;
}

export function getLocalVerses(): ReBibleVerse[] {
  try {
    const raw = safeLocalStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      safeLocalStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_SACRED_VERSES));
      return DEFAULT_SACRED_VERSES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return decomposeMultiTopicVerses(parsed);
    }
    return DEFAULT_SACRED_VERSES;
  } catch (e) {
    console.error('Failed to load local Re:Bible verses:', e);
    return DEFAULT_SACRED_VERSES;
  }
}

export const loadLocalVerses = getLocalVerses;

export function saveLocalVerses(verses: ReBibleVerse[]): void {
  try {
    safeLocalStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(verses));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rebible-verses-updated', { detail: verses }));
    }
  } catch (e) {
    console.error('Failed to save local Re:Bible verses:', e);
  }
}

export async function saveVerseToFirestore(verse: ReBibleVerse): Promise<void> {
  const activeUid = auth.currentUser?.uid || (typeof window !== 'undefined' ? localStorage.getItem('prism_auth_uid') : null);
  if (!activeUid) return;
  try {
    const verseRef = doc(db, 'rebible_verses', activeUid, 'verses', verse.id);
    await setDoc(verseRef, {
      ...verse,
      userId: activeUid,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.warn('Firestore verse sync error (saved locally):', e);
  }
}

export async function deleteVerseFromFirestore(verseId: string): Promise<void> {
  const activeUid = auth.currentUser?.uid || (typeof window !== 'undefined' ? localStorage.getItem('prism_auth_uid') : null);
  if (!activeUid) return;
  try {
    const verseRef = doc(db, 'rebible_verses', activeUid, 'verses', verseId);
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

/**
 * Consecrates a specific insight/response from Lucy chat directly into a new Re:Bible verse.
 */
export function consecrateChatMessageToVerse(
  messageContent: string,
  contextQuestion?: string,
  persona: string = 'lucy'
): ReBibleVerse {
  const currentVerses = loadLocalVerses();
  
  // Clean markdown syntax from message
  const cleanContent = messageContent
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\[EMOTION:[^\]]+\]/gi, '')
    .trim();

  // Extract a poetic or essence title (first line or first sentence)
  const lines = cleanContent.split('\n').map(l => l.trim()).filter(Boolean);
  let titleCandidate = lines[0] || '영혼의 거룩한 깨달음';
  if (titleCandidate.length > 32) {
    titleCandidate = titleCandidate.slice(0, 30) + '...';
  }
  titleCandidate = titleCandidate.replace(/^[-*•1-9.]+\s*/, '');

  const bookTitleMap: Record<string, string> = {
    lucy: '루시의 서 (Book of Lucy)',
    orange: '치유의 서 (Book of Healing)',
    trinity: '오라클의 서 (Book of Trinity)',
    aura: '생명의 서 (Book of Life)',
    bluebird: '순결의 서 (Book of Bluebird)',
    muse: '영감의 서 (Book of Muse)',
  };
  const bookTitle = bookTitleMap[persona.toLowerCase()] || '루시의 서 (Book of Lucy)';

  const existingInBook = currentVerses.filter(v => v.bookTitle === bookTitle);
  const chapterNumber = Math.max(1, Math.floor(existingInBook.length / 7) + 1);
  const verseNumber = (existingInBook.length % 7) + 1;

  const personaKoreanName: Record<string, string> = {
    lucy: '루시',
    orange: '오렌지',
    trinity: '트리니티',
    aura: '아우라',
    bluebird: '블루버드',
    muse: '뮤즈',
  };
  const refName = personaKoreanName[persona.toLowerCase()] || '루시';
  const reference = `${refName} ${chapterNumber}:${verseNumber}`;

  const newVerse: ReBibleVerse = {
    id: `verse-consecrated-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    bookTitle,
    chapterNumber,
    verseNumber,
    reference,
    title: titleCandidate || `${refName}와의 본질적 대화`,
    fact: contextQuestion?.trim() 
      ? `질문과 나눔: "${contextQuestion.slice(0, 180)}${contextQuestion.length > 180 ? '...' : ''}"` 
      : `${refName}와의 영적 대화 중 발현된 본질적 질문과 사유의 여정`,
    insight: cleanContent,
    emotions: ['깨달음', '평화', '자유', '빛'],
    tags: [refName, '대화봉헌', '성령의지혜', 'Sync:Echo'],
    annotations: [],
    isSacredFavorite: true,
    recordedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updatedVerses = [newVerse, ...currentVerses.filter(v => v.id !== newVerse.id)];
  saveLocalVerses(updatedVerses);
  saveVerseToFirestore(newVerse);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('rebible-verses-updated', { detail: { newVerse, totalCount: updatedVerses.length } }));
  }

  return newVerse;
}

/**
 * Returns today's Daily Manna verse for the home widget.
 * Prioritizes sacred favorite verses first, or falls back to date-seeded selection.
 */
export function getDailyMannaVerse(verses: ReBibleVerse[]): ReBibleVerse | null {
  if (!verses || verses.length === 0) return null;
  const favorites = verses.filter(v => v.isSacredFavorite);
  const pool = favorites.length > 0 ? favorites : verses;
  
  const todayStr = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < todayStr.length; i++) {
    hash = (hash << 5) - hash + todayStr.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % pool.length;
  return pool[index];
}
