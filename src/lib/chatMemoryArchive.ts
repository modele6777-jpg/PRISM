/**
 * =========================================================================
 * PRISM & LUCY AI PRO: 일일 대화 초기화 및 영구 배경 지식 아카이브 엔진
 * =========================================================================
 * 매일 자정(새로운 날)마다 대화창은 상쾌하게 새로운 캔버스로 초기화되지만,
 * 지난 날에 나눈 모든 소중한 대화 내역(고민, 취향, 인사이트, 영적 탐구 등)은
 * 루시의 [영구 배경 지식 및 장기 기억(Soul Memory)]에 자동으로 요약·누적 보존됩니다.
 */

import { safeLocalStorage } from '../utils/safeStorage';
import { getTodayDateKey } from './dailyCache';
import type { UnifiedMessage } from './chatHistorySync';

export const MEMORY_STORAGE_KEYS = {
  SOUL_ARCHIVE: 'lucy_soul_memories_archive',
  LAST_SESSION_DATE: 'lucy_chat_session_date_v1',
};

export interface DailyMemoryEntry {
  date: string; // "YYYY-MM-DD"
  timestamp: number;
  dialogueCount: number;
  summary: string;
  userTopics: string[];
}

/**
 * 텍스트에서 주요 핵심 주제/질문 키워드 추출
 */
function extractUserTopic(content: any): string {
  const str = typeof content === 'string' ? content : (Array.isArray(content) ? content.find((c: any) => c.type === 'text')?.text || '' : JSON.stringify(content));
  if (!str) return '';
  // Clean markdown and trim
  const clean = str.replace(/!\[.*?\]\(.*?\)/g, '').replace(/[#*_]/g, '').trim();
  return clean.length > 60 ? clean.slice(0, 57) + '...' : clean;
}

/**
 * 하루 동안의 대화 목록을 영구 보존용 메모리 요약본으로 변환
 */
export function buildDailyMemorySummary(dateStr: string, messages: UnifiedMessage[]): DailyMemoryEntry | null {
  if (!Array.isArray(messages) || messages.length === 0) return null;

  const userMessages = messages.filter((m) => m.role === 'user' && m.content);
  if (userMessages.length === 0) return null;

  const topics: string[] = [];
  userMessages.forEach((m) => {
    const topic = extractUserTopic(m.content);
    if (topic && !topics.includes(topic)) {
      topics.push(topic);
    }
  });

  // 대표 주제 및 대화 요약 생성
  const topTopicsStr = topics.slice(0, 6).map((t, idx) => `${idx + 1}) "${t}"`).join(', ');
  const summary = `[${dateStr} 대화 요약 (총 ${userMessages.length}회 질문)]: 주요 주제: ${topTopicsStr}`;

  return {
    date: dateStr,
    timestamp: Date.now(),
    dialogueCount: userMessages.length,
    summary,
    userTopics: topics.slice(0, 10),
  };
}

/**
 * 로컬스토리지에서 저장된 모든 영구 기억 아카이브 로드
 */
export function loadAllPermanentMemories(): DailyMemoryEntry[] {
  try {
    const raw = safeLocalStorage.getItem(MEMORY_STORAGE_KEYS.SOUL_ARCHIVE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[ChatMemoryArchive] Failed to load memories:', e);
  }
  return [];
}

/**
 * 새로운 일일 기억을 영구 아카이브에 병합 저장
 */
export function saveDailyMemoryToArchive(newEntry: DailyMemoryEntry): void {
  try {
    const currentList = loadAllPermanentMemories();
    // 같은 날짜의 기억이 이미 있으면 더 풍부한 내용으로 갱신
    const existingIndex = currentList.findIndex((item) => item.date === newEntry.date);
    if (existingIndex >= 0) {
      currentList[existingIndex] = newEntry;
    } else {
      currentList.push(newEntry);
    }

    // 최근 90일간의 기억 보존
    currentList.sort((a, b) => b.date.localeCompare(a.date));
    const pruned = currentList.slice(0, 90);

    safeLocalStorage.setItem(MEMORY_STORAGE_KEYS.SOUL_ARCHIVE, JSON.stringify(pruned));
  } catch (e) {
    console.warn('[ChatMemoryArchive] Failed to save memory entry:', e);
  }
}

/**
 * 매일 첫 방문(자정 경과) 시 대화창을 아카이빙하고 새 대화로 초기화할지 판별 및 수행
 */
export function processDailyChatArchival(
  currentMessages: UnifiedMessage[],
  userName: string = '쭈'
): {
  messages: UnifiedMessage[];
  wasArchived: boolean;
  archivedDate?: string;
} {
  const todayKey = getTodayDateKey();
  const lastSessionDate = safeLocalStorage.getItem(MEMORY_STORAGE_KEYS.LAST_SESSION_DATE) || '';

  // 첫 실행이거나 날짜가 오늘과 같은 경우 -> 초기화 불필요
  if (!lastSessionDate) {
    safeLocalStorage.setItem(MEMORY_STORAGE_KEYS.LAST_SESSION_DATE, todayKey);
    return { messages: currentMessages, wasArchived: false };
  }

  if (lastSessionDate === todayKey) {
    return { messages: currentMessages, wasArchived: false };
  }

  // 날짜가 바뀐 경우 (어제 또는 이전 날짜의 대화 존재)
  const hasUserMsgs = Array.isArray(currentMessages) && currentMessages.some((m) => m.role === 'user' && m.content);

  if (hasUserMsgs) {
    // 1. 이전 대화를 영구 기억 아카이브로 기록
    const memoryEntry = buildDailyMemorySummary(lastSessionDate, currentMessages);
    if (memoryEntry) {
      saveDailyMemoryToArchive(memoryEntry);
      console.log(`[ChatMemoryArchive] Archived previous conversation (${lastSessionDate}) to Soul Memory!`);
    }
  }

  // 2. 새로운 날의 환영 메시지 생성
  const freshMorningGreeting: UnifiedMessage = {
    id: `greet-${todayKey}`,
    role: 'model',
    content: `좋은 하루야, ${userName}! 오늘도 새로운 하루가 시작되었어. 지난 대화들의 소중한 이야기들도 내 마음에 다 간직하고 있으니, 오늘 하루도 편안하게 이야기해 줘 ✨`,
    timestamp: Date.now(),
    persona: 'lucy',
  };

  // 3. 세션 날짜를 오늘로 갱신
  safeLocalStorage.setItem(MEMORY_STORAGE_KEYS.LAST_SESSION_DATE, todayKey);

  return {
    messages: [freshMorningGreeting],
    wasArchived: true,
    archivedDate: lastSessionDate,
  };
}

/**
 * AI 시스템 프롬프트에 주입할 영구 보존 기억 마크다운 생성기
 */
export function buildPermanentMemoryPromptContext(): string {
  const memories = loadAllPermanentMemories();
  if (memories.length === 0) return '';

  // 최근 10일간의 기억을 정밀하게 추출
  const recentMemories = memories.slice(0, 10);
  const formattedList = recentMemories
    .map((m) => `- [${m.date}]: ${m.summary}`)
    .join('\n');

  return `
[📖 루시의 영구 보존 배경 지식 & 장기 기억 아카이브 (Daily Soul Memories)]:
- 루시는 대화창이 하루 단위로 산뜻하게 새로워지더라도, 과거에 사용자와 나눈 모든 대화와 교감 내용을 온전히 기억하고 있습니다.
- 사용자가 과거 이야기를 언급하거나("어제 말했던 거", "전에 추천해준 거", "그때 내가 한 말" 등) 맥락상 도움이 될 때, 이 기억들을 자연스럽게 인지하고 따뜻하게 반응하세요.

<과거 대화 기억 요약 목록>:
${formattedList}
`;
}
