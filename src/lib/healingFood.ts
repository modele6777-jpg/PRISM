import { z } from 'zod';
import { invokeLLMStructured } from '@/lib/ai';
import { auth, db, collection, addDoc, getDocs, query, orderBy, serverTimestamp } from '@/lib/firebase';
import { recordPrismFeature } from '@/lib/prismOmniSync';

export interface FoodCategory {
  id: 'detox' | 'calm' | 'energy' | 'digestion' | 'focus' | 'warmth';
  label: string;
  subLabel: string;
  emoji: string;
  color: string;
  badgeBg: string;
  borderColor: string;
  gradient: string;
  description: string;
}

export const FOOD_CATEGORIES: FoodCategory[] = [
  {
    id: 'calm',
    label: '긴장 완화 & 숙면',
    subLabel: 'Calm & Restful Sleep',
    emoji: '🌙',
    color: 'text-indigo-300',
    badgeBg: 'bg-indigo-500/20 text-indigo-200 border-indigo-500/30',
    borderColor: 'border-indigo-500/30',
    gradient: 'from-indigo-900/40 via-purple-900/30 to-emerald-950/20',
    description: '복잡한 생각과 굳어있던 신체 긴장을 부드럽게 이완시키는 숙면 위로식',
  },
  {
    id: 'energy',
    label: '활력 충전 & 피로 회복',
    subLabel: 'Vitality & Rejuvenation',
    emoji: '⚡',
    color: 'text-amber-300',
    badgeBg: 'bg-amber-500/20 text-amber-200 border-amber-500/30',
    borderColor: 'border-amber-500/30',
    gradient: 'from-amber-900/40 via-orange-900/30 to-emerald-950/20',
    description: '지친 세포에 깨끗한 생명력과 면역력을 불어넣는 온전한 활력식',
  },
  {
    id: 'digestion',
    label: '속 편안함 & 장 정화',
    subLabel: 'Comfort & Gut Health',
    emoji: '🥣',
    color: 'text-emerald-300',
    badgeBg: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30',
    borderColor: 'border-emerald-500/30',
    gradient: 'from-emerald-900/40 via-teal-900/30 to-zinc-950/20',
    description: '예민해진 위장을 온화하게 감싸고 장내 생태계를 정화하는 온기식',
  },
  {
    id: 'detox',
    label: '디톡스 & 가벼운 비움',
    subLabel: 'Detox & Lightness',
    emoji: '🌿',
    color: 'text-teal-300',
    badgeBg: 'bg-teal-500/20 text-teal-200 border-teal-500/30',
    borderColor: 'border-teal-500/30',
    gradient: 'from-teal-900/40 via-emerald-900/30 to-zinc-950/20',
    description: '몸 안에 묵은 붓기와 찌꺼기를 맑게 배출하는 순수 자연식',
  },
  {
    id: 'focus',
    label: '두뇌 명료 & 맑은 정신',
    subLabel: 'Mental Clarity & Focus',
    emoji: '🧘',
    color: 'text-cyan-300',
    badgeBg: 'bg-cyan-500/20 text-cyan-200 border-cyan-500/30',
    borderColor: 'border-cyan-500/30',
    gradient: 'from-cyan-900/40 via-blue-900/30 to-emerald-950/20',
    description: '머리의 열감을 내리고 뇌세포와 오감을 맑게 깨우는 영양식',
  },
  {
    id: 'warmth',
    label: '온기 순환 & 체온 상승',
    subLabel: 'Warmth & Circulation',
    emoji: '🫖',
    color: 'text-rose-300',
    badgeBg: 'bg-rose-500/20 text-rose-200 border-rose-500/30',
    borderColor: 'border-rose-500/30',
    gradient: 'from-rose-900/40 via-amber-900/30 to-zinc-950/20',
    description: '차가운 기운을 녹이고 말초 혈관까지 따스한 온기를 전하는 테라피식',
  },
];

export type FoodCategoryId = FoodCategory['id'];

export const HealingFoodSchema = z.object({
  dishName: z.string().describe("추천 요리/음식의 이름 (예: '따뜻한 단호박 귀리 영양 수프', '구운 버섯 두부 온샐러드')"),
  dishSubtitle: z.string().describe("요리의 한 줄 매력/특징 요약 (예: '지친 신경계를 어루만지는 천연 트립토판의 온기')"),
  emoji: z.string().describe("이 요리를 가장 잘 나타내는 상징 이모지 1개 (예: 🥣, 🍲, 🥗, 🥑, 🍠, 🍵)"),
  ingredients: z.array(z.string()).describe("핵심 치유 식재료 3~4가지 (예: ['단호박', '볶은 귀리', '아몬드 밀크', '호두 분태'])"),
  healingTea: z.string().describe("함께 곁들이면 시너지를 내는 추천 힐링 차/음료 (예: '카모마일 레몬밤 블렌딩 티')"),
  wellnessEffect: z.string().describe("신체 생체 전압 및 장기 컨디션에 미치는 구체적인 치유 효능 (2~3문장, 약 100~150자)"),
  mindfulEatingTip: z.string().describe("음식을 먹을 때 감각을 깨우는 섭식 명상(마인드풀 이팅) 한 줄 가이드 (30~60자)"),
  simpleTip: z.string().describe("집에서 5분 만에 간편히 즐길 수 있는 초간단 섭취/조리 꿀팁 1줄"),
  affirmation: z.string().describe("이 음식을 마주하며 마음에 새길 다정한 치유 확언 (1문장, 20~40자)"),
  auraEnergyKeyword: z.string().describe("이 음식이 보충해주는 오라 생체 에너지 키워드 (예: '차크라 안정의 에메랄드', '부드러운 이완의 바이올렛')"),
});

export type HealingFoodRecommendation = z.infer<typeof HealingFoodSchema> & {
  id?: string;
  category: FoodCategoryId;
  categoryLabel?: string;
  createdAt?: string | number;
  userInput?: string;
};

export const DEFAULT_HEALING_FOODS: Record<FoodCategoryId, HealingFoodRecommendation[]> = {
  calm: [
    {
      dishName: "구운 연어와 따뜻한 아스파라거스 퀴노아볼",
      dishSubtitle: "풍부한 오메가-3와 마그네슘으로 뇌파를 알파파로 유도하는 저녁식",
      emoji: "🥗",
      category: "calm",
      categoryLabel: "긴장 완화 & 숙면",
      ingredients: ["신선한 연어 구이", "아스파라거스", "삶은 퀴노아", "올리브유 & 레몬 드레싱"],
      healingTea: "따뜻한 루이보스 카모마일 허브티",
      wellnessEffect: "연어의 양질의 단백질과 불포화지방산이 뇌 신경 전달물질 생성을 돕고, 아스파라거스의 아스파라긴산이 피로 누적 물질을 분해하여 몸의 긴장을 사르르 녹여냅니다.",
      mindfulEatingTip: "한 입을 베어 물고 세 번 천천히 씹으며 입안에 퍼지는 고소한 온기와 향을 온전히 느껴보세요.",
      simpleTip: "팬에 올리브유를 두르고 연어와 아스파라거스를 약불에서 노릇하게 구워내면 10분 완성!",
      affirmation: "오늘 하루 애쓴 내 몸에게 가장 안전하고 부드러운 안식을 선물합니다.",
      auraEnergyKeyword: "심신 이완의 바이올렛 오라",
    },
    {
      dishName: "단호박 캐슈넛 크림 수프",
      dishSubtitle: "세로토닌 생성을 촉진해 굳어있던 신경계를 감싸주는 황금빛 스프",
      emoji: "🥣",
      category: "calm",
      categoryLabel: "긴장 완화 & 숙면",
      ingredients: ["익힌 단호박", "불린 캐슈넛", "두유 or 오트밀크", "시나몬 파우더 한 꼬집"],
      healingTea: "따스한 라벤더 바닐라 루이보스티",
      wellnessEffect: "단호박의 풍부한 베타카로틴과 캐슈넛의 트립토판 성분이 멜라토닌 분비를 유도하여 깊은 숙면을 유도하고 불안정한 교감신경을 가라앉힙니다.",
      mindfulEatingTip: "수프의 따뜻한 온기가 목을 지나 위장으로 부드럽게 퍼져나가는 감각에 집중해봅니다.",
      simpleTip: "찐 단호박과 캐슈넛, 오트밀크를 믹서에 넣고 1분간 곱게 갈아 데우면 완성됩니다.",
      affirmation: "내 안의 조급함은 흘려보내고, 깊고 고요한 평화 속으로 스며듭니다.",
      auraEnergyKeyword: "포근한 안정의 앰버 골드",
    },
  ],
  energy: [
    {
      dishName: "아보카도 수란 훈제오리 웜볼",
      dishSubtitle: "비타민 B군과 고단백의 조화로 세포 속 미토콘드리아를 깨우는 파워 푸드",
      emoji: "🥑",
      category: "energy",
      categoryLabel: "활력 충전 & 피로 회복",
      ingredients: ["기름 뺀 훈제오리", "잘 익은 아보카도", "반숙 수란", "새싹 채소 & 현미밥"],
      healingTea: "유기농 페퍼민트 그린티",
      wellnessEffect: "불포화지방산이 풍부한 오리고기와 아보카도가 산화 스트레스를 억제하고, 수란의 레시틴이 지친 뇌세포에 즉각적인 에너지를 충전합니다.",
      mindfulEatingTip: "생명의 다채로운 색감과 질감을 눈으로 먼저 음미하며 감사한 마음으로 식사를 시작하세요.",
      simpleTip: "에어프라이어에 훈제오리를 5분간 구운 뒤 밥 위에 썰어둔 아보카도와 수란을 얹어보세요.",
      affirmation: "내 몸의 모든 세포가 깨끗하고 힘찬 생명력으로 가득 차오릅니다.",
      auraEnergyKeyword: "활력 충전의 에메랄드 스파크",
    },
    {
      dishName: "바나나 치아씨드 베리 그릭요거트 보울",
      dishSubtitle: "천연 당분과 항산화 베리가 전하는 맑고 빠른 에너지 충전",
      emoji: "🫐",
      category: "energy",
      categoryLabel: "활력 충전 & 피로 회복",
      ingredients: ["무가당 그릭요거트", "바나나 슬라이스", "블루베리", "치아씨드 & 호두"],
      healingTea: "레몬 슬라이스를 띄운 미온수",
      wellnessEffect: "바나나의 포도당과 칼륨이 근육 피로를 해소하고, 블루베리의 안토시아닌이 활성산소를 제거하여 맑은 생기를 되찾아줍니다.",
      mindfulEatingTip: "톡톡 터지는 블루베리와 부드러운 요거트의 조화를 입안 가득 음미해보세요.",
      simpleTip: "그릭요거트에 준비된 토핑을 듬뿍 얹고 꿀 반 스푼을 둘러주면 3분 만에 완성!",
      affirmation: "나는 언제나 풍성한 활력과 건강한 회복력을 지니고 있습니다.",
      auraEnergyKeyword: "찬란한 생기의 오렌지 광채",
    },
  ],
  digestion: [
    {
      dishName: "연근 표고버섯 들깨 맑은 영양죽",
      dishSubtitle: "뮤신과 감칠맛이 위 점막을 코팅하고 속을 다정하게 감싸는 정화식",
      emoji: "🍲",
      category: "digestion",
      categoryLabel: "속 편안함 & 장 정화",
      ingredients: ["다진 연근", "표고버섯", "껍질 벗긴 들깻가루", "부드러운 찹쌀"],
      healingTea: "구수한 작두콩차 or 매실 미온수",
      wellnessEffect: "연근의 뮤신과 탄닌 성분이 손상된 위 점막을 보호하고 소염 작용을 하며, 들깨의 감마리놀렌산이 장내 염증을 가라앉힙니다.",
      mindfulEatingTip: "음식이 위장에 닿는 순간의 편안함과 은은한 고소함을 천천히 느껴보세요.",
      simpleTip: "밥에 물과 연근, 버섯을 넣고 끓이다가 마지막에 들깻가루 2스푼을 풀어주면 속 편한 죽 완성.",
      affirmation: "내 몸은 들어오는 모든 영양을 조화롭게 소화하고 불필요한 것은 편안히 비웁니다.",
      auraEnergyKeyword: "온화한 조화의 옥빛 아우라",
    },
    {
      dishName: "양배추 사과 찜 & 두부 스테이크",
      dishSubtitle: "비타민 U와 부드러운 식물성 단백질이 장내 부담을 덜어주는 안심 식단",
      emoji: "🥬",
      category: "digestion",
      categoryLabel: "속 편안함 & 장 정화",
      ingredients: ["부드럽게 찐 양배추", "얇게 썬 사과", "구운 부침두부", "간장 들기름 소스"],
      healingTea: "따뜻한 보리차 or 카모마일차",
      wellnessEffect: "양배추의 천연 비타민 U가 소화관 궤양을 예방하고, 사과의 펙틴이 장내 유익균의 먹이가 되어 장 환경을 쾌적하게 개선합니다.",
      mindfulEatingTip: "자극 없는 담백한 본연의 단맛에 집중하며 깊은 숨과 함께 식사해보세요.",
      simpleTip: "양배추를 전자레인지에 3분간 찐 뒤 들기름에 노릇하게 구운 두부와 곁들이세요.",
      affirmation: "나의 소화계는 날마다 맑고 편안하며 최상의 균형을 유지합니다.",
      auraEnergyKeyword: "청정한 회복의 민트 그린",
    },
  ],
  detox: [
    {
      dishName: "구운 비트와 루꼴라 시트러스 샐러드",
      dishSubtitle: "베타인과 항산화 성분이 간 해독과 혈액 순환을 돕는 정화 샐러드",
      emoji: "🥗",
      category: "detox",
      categoryLabel: "디톡스 & 가벼운 비움",
      ingredients: ["익힌 비트 큐브", "루꼴라", "오렌지 자몽 조각", "엑스트라 버진 올리브유"],
      healingTea: "따뜻한 히비스커스 로즈힙 티",
      wellnessEffect: "비트의 베타인 성분이 간세포 재생을 돕고 노폐물 배출을 촉진하며, 감귤류의 구연산이 림프 순환을 도와 몸을 한결 가볍게 만듭니다.",
      mindfulEatingTip: "상큼하고 쌉싸름한 풀내음을 맡으며 몸속 정체의 에너지가 씻겨 나감을 상상해보세요.",
      simpleTip: "시판 찐 비트와 루꼴라에 오렌지를 얹고 올리브유와 소금 한 꼬집만 뿌려 드세요.",
      affirmation: "나는 내 안의 무거운 찌꺼기를 기꺼이 비우고 맑고 투명해집니다.",
      auraEnergyKeyword: "정화의 루비 마젠타",
    },
  ],
  focus: [
    {
      dishName: "로즈마리 호두 브로콜리 볶음밥",
      dishSubtitle: "두뇌 항산화제 콜린과 허브 향이 뇌혈류를 자극하는 브레인 푸드",
      emoji: "🥦",
      category: "focus",
      categoryLabel: "두뇌 명료 & 맑은 정신",
      ingredients: ["잘게 썬 브로콜리", "다진 호두", "신선한 로즈마리", "발아현미밥"],
      healingTea: "상쾌한 로즈마리 레몬 티",
      wellnessEffect: "호두의 풍부한 알파리놀렌산이 뇌 신경망을 보호하고, 브로콜리의 설포라판이 뇌세포의 산화적 스트레스를 줄여 집중력을 명료하게 끌어올립니다.",
      mindfulEatingTip: "입안 가득 퍼지는 로즈마리의 청량한 향을 음미하며 뇌가 맑아지는 감각을 느껴보세요.",
      simpleTip: "올리브유에 로즈마리와 마늘을 볶다가 밥, 브로콜리, 호두를 넣고 가볍게 볶아냅니다.",
      affirmation: "나의 직관과 지성은 맑고 선명하며, 지금 이 순간에 온전히 깨어있습니다.",
      auraEnergyKeyword: "명료한 통찰의 사파이어 블루",
    },
  ],
  warmth: [
    {
      dishName: "대추 생강 배숙 & 꿀 구운 단호박",
      dishSubtitle: "차가운 하복부와 손발을 따스하게 덥히는 전통 온열 테라피",
      emoji: "🫖",
      category: "warmth",
      categoryLabel: "온기 순환 & 체온 상승",
      ingredients: ["달콤한 꿀 배숙", "편 생강", "말린 대추", "구운 단호박 조각"],
      healingTea: "진한 계피 생강차",
      wellnessEffect: "생강의 진저롤과 대추의 따뜻한 성질이 말초 모세혈관을 확장하여 체온을 1도 상승시키고 전신 면역 방어력을 높여줍니다.",
      mindfulEatingTip: "한 모금, 한 입마다 가슴과 아랫배가 포근하게 데워지는 기분 좋은 온기에 젖어보세요.",
      simpleTip: "배 속을 파내어 꿀, 대추, 생강을 넣고 찜기에 15분간 쪄내면 극상의 힐링 디저트.",
      affirmation: "따스한 사랑의 온기가 나의 온몸을 구석구석 어루만져 치유합니다.",
      auraEnergyKeyword: "심신 보온의 선셋 코랄",
    },
  ],
};

const FOOD_HISTORY_KEY_PREFIX = 'aura_healing_food_history_';

export function getLocalFoodHistory(uid: string): HealingFoodRecommendation[] {
  try {
    const raw = localStorage.getItem(`${FOOD_HISTORY_KEY_PREFIX}${uid || 'guest'}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalFoodEntry(uid: string, entry: HealingFoodRecommendation) {
  try {
    const key = `${FOOD_HISTORY_KEY_PREFIX}${uid || 'guest'}`;
    const list = getLocalFoodHistory(uid);
    const updated = [entry, ...list.filter((item) => (item.id && entry.id ? item.id !== entry.id : true))].slice(0, 50);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.warn('[HealingFood] Failed to save local food entry:', e);
  }
}

export async function loadFoodHistory(uid: string): Promise<HealingFoodRecommendation[]> {
  const localList = getLocalFoodHistory(uid);
  if (!uid || uid === 'guest') {
    return localList;
  }

  try {
    const entriesRef = collection(db, 'orange_history', uid, 'entries');
    const fetchPromise = getDocs(query(entriesRef, orderBy('createdAt', 'desc')));
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore fetch timeout')), 4000)
    );

    const snapshot = await Promise.race([fetchPromise, timeoutPromise]);
    const remoteList: HealingFoodRecommendation[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.type === 'healing_food' && data.metadata) {
        remoteList.push({
          id: doc.id,
          dishName: data.metadata.dishName || data.content,
          dishSubtitle: data.metadata.dishSubtitle || '',
          emoji: data.metadata.emoji || '🥗',
          category: data.metadata.category || 'calm',
          categoryLabel: data.metadata.categoryLabel || '힐링 푸드',
          ingredients: data.metadata.ingredients || [],
          healingTea: data.metadata.healingTea || '',
          wellnessEffect: data.metadata.wellnessEffect || data.response || '',
          mindfulEatingTip: data.metadata.mindfulEatingTip || '',
          simpleTip: data.metadata.simpleTip || '',
          affirmation: data.metadata.affirmation || '',
          auraEnergyKeyword: data.metadata.auraEnergyKeyword || '생체 치유 에너지',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
          userInput: data.metadata.userInput,
        });
      }
    }

    const map = new Map<string, HealingFoodRecommendation>();
    for (const item of remoteList) {
      if (item.id) map.set(item.id, item);
    }
    for (const item of localList) {
      if (item.id && !map.has(item.id)) map.set(item.id, item);
      else if (!item.id) map.set(item.dishName + item.category, item);
    }
    const merged = Array.from(map.values()).slice(0, 50);
    try {
      localStorage.setItem(`${FOOD_HISTORY_KEY_PREFIX}${uid}`, JSON.stringify(merged));
    } catch {}
    return merged.length > 0 ? merged : localList;
  } catch (err) {
    console.warn('[HealingFood] Failed to load remote food history, using local cache:', err);
    return localList;
  }
}

export function getPersonalizedFoodFallback(
  userInput: string,
  category: FoodCategoryId
): HealingFoodRecommendation {
  const categoryMeta = FOOD_CATEGORIES.find((c) => c.id === category) || FOOD_CATEGORIES[0];
  const list = DEFAULT_HEALING_FOODS[category] || DEFAULT_HEALING_FOODS.calm;
  const picked = { ...list[Math.floor(Math.random() * list.length)] };

  if (userInput.trim()) {
    const clean = userInput.trim().slice(0, 20);
    picked.dishSubtitle = `"${clean}" 컨디션을 보듬는 맞춤 ${categoryMeta.label} 처방`;
  }

  return {
    ...picked,
    id: `food_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    category,
    categoryLabel: categoryMeta.label,
    userInput: userInput.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generate a personalized healing food recommendation for the user.
 */
export async function generateHealingFoodRecommendation(
  uid: string,
  category: FoodCategoryId,
  userConditionNote?: string
): Promise<HealingFoodRecommendation> {
  const categoryMeta = FOOD_CATEGORIES.find((c) => c.id === category) || FOOD_CATEGORIES[0];
  const note = (userConditionNote || '').trim();

  const systemInstruction = `당신은 'AURA (아우라) 웰니스 코칭 룸'의 최고 힐링 영양 테라피스트이자 마인드풀 셰프입니다.
사용자의 지친 신체 상태, 오라 생체 에너지, 그리고 현재 컨디션에 딱 맞춘 '오늘의 추천 치유 음식(Healing Soul Food)'을 정성스럽게 처방해주세요.

[선택된 힐링 테마]: ${categoryMeta.label} (${categoryMeta.subLabel})
[테마 설명]: ${categoryMeta.description}
${note ? `[사용자가 적은 오늘의 몸 상태/요청사항]: "${note}"` : '[사용자 상태]: 오늘 이 테마에 가장 적합한 최상의 데일리 힐링 푸드 요청'}

당신의 임무:
1. 'dishName': 영양학적으로 훌륭하면서도 따뜻하고 감각적인 힐링 요리명 1개.
2. 'dishSubtitle': 요리의 핵심 매력과 힐링 포인트를 요약한 부제 (1문장, 약 30~50자).
3. 'emoji': 이 음식을 상징하는 예쁜 이모지 1개 (예: 🥣, 🥗, 🍲, 🥑, 🍠, 🫖, 🍵 등).
4. 'ingredients': 가정이나 주변에서 쉽게 구할 수 있는 핵심 치유 식재료 3~4가지 배열.
5. 'healingTea': 이 음식과 함께 마시면 기운 순환을 극대화하는 추천 힐링 차/음료 1종.
6. 'wellnessEffect': 사용자에게 이 음식이 신체 및 생체 에너지에 전하는 실제적인 치유 효능 (2~3문장, 약 100~150자). 사용자의 입력이 있다면 반드시 그 증상(${note || '피로/긴장'})을 짚어주세요.
7. 'mindfulEatingTip': 식사 중 오감을 깨우고 마음을 챙길 수 있는 따뜻한 섭식 명상 가이드 (1문장, 30~60자).
8. 'simpleTip': 5~10분 만에 손쉽게 조리하거나 시판 재료로 대체해 즐기는 꿀팁 1줄.
9. 'affirmation': 식사 전후 가슴에 품을 다정한 한 줄의 치유 확언 (1문장).
10. 'auraEnergyKeyword': 이 음식이 조율해주는 생체 오라 에너지 키워드 (2~4단어, 예: '평온한 숙면의 바이올렛', '생기 회복의 에메랄드').

어조: 다정하고 전문적이며 온화한 존댓말. 미식과 신체 치유의 온기를 가득 담아주세요.`;

  let result: z.infer<typeof HealingFoodSchema>;

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('HealingFood LLM Timeout')), 25000)
  );

  try {
    result = await Promise.race([
      invokeLLMStructured({
        messages: [
          { role: 'system', content: systemInstruction },
          {
            role: 'user',
            content: `선택 카테고리: ${categoryMeta.label}\n사용자 컨디션 메모: ${note || '전반적인 밸런스 회복'}\n\n위 내용에 맞추어 오늘의 추천 치유 음식을 상세히 처방해주세요.`,
          },
        ],
        schema: HealingFoodSchema,
        maxRetries: 1,
      }),
      timeoutPromise,
    ]);
  } catch (err) {
    console.warn('[HealingFood] LLM call failed or timed out, using personalized fallback:', err);
    result = getPersonalizedFoodFallback(note, category);
  }

  const entry: HealingFoodRecommendation = {
    id: `food_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    dishName: result.dishName,
    dishSubtitle: result.dishSubtitle,
    emoji: result.emoji,
    category,
    categoryLabel: categoryMeta.label,
    ingredients: result.ingredients,
    healingTea: result.healingTea,
    wellnessEffect: result.wellnessEffect,
    mindfulEatingTip: result.mindfulEatingTip,
    simpleTip: result.simpleTip,
    affirmation: result.affirmation,
    auraEnergyKeyword: result.auraEnergyKeyword,
    userInput: note || undefined,
    createdAt: new Date().toISOString(),
  };

  // Local storage cache
  saveLocalFoodEntry(uid, entry);

  // Sync with global Prism Feature History
  try {
    recordPrismFeature({
      app: 'heal',
      appName: '아우라/힐 (신체웰니스/세도나)',
      featureName: '오늘의 추천 음식',
      summary: `[${categoryMeta.label}] ${entry.dishName} - ${entry.dishSubtitle}`,
      details: {
        dishName: entry.dishName,
        category: entry.category,
        categoryLabel: categoryMeta.label,
        healingTea: entry.healingTea,
        ingredients: entry.ingredients,
        wellnessEffect: entry.wellnessEffect,
        affirmation: entry.affirmation,
        auraEnergyKeyword: entry.auraEnergyKeyword,
      },
    });
  } catch (e) {
    console.warn('[HealingFood] Failed to record prism feature:', e);
  }

  // Background non-blocking Firestore persist
  if (uid && uid !== 'guest') {
    (async () => {
      try {
        const entriesRef = collection(db, 'orange_history', uid, 'entries');
        const docRef = await addDoc(entriesRef, {
          type: 'healing_food',
          source: 'aura',
          content: entry.dishName,
          response: entry.wellnessEffect,
          metadata: {
            dishName: entry.dishName,
            dishSubtitle: entry.dishSubtitle,
            emoji: entry.emoji,
            category: entry.category,
            categoryLabel: entry.categoryLabel,
            ingredients: entry.ingredients,
            healingTea: entry.healingTea,
            wellnessEffect: entry.wellnessEffect,
            mindfulEatingTip: entry.mindfulEatingTip,
            simpleTip: entry.simpleTip,
            affirmation: entry.affirmation,
            auraEnergyKeyword: entry.auraEnergyKeyword,
            userInput: entry.userInput,
            channel: 'aura',
          },
          createdAt: serverTimestamp(),
        });
        entry.id = docRef.id;
        saveLocalFoodEntry(uid, entry);
      } catch (saveErr) {
        console.warn('[HealingFood] Background Firestore persist failed:', saveErr);
      }
    })();
  }

  return entry;
}
