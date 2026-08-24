import { z } from "zod";
import {
  db,
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
} from "@/lib/firebase";
import { invokeLLM } from "@/lib/ai";

export const WISH_CATEGORIES = [
  { id: "inner_peace", label: "내면의 평화와 안식", emoji: "🌿", color: "#10b981", defaultWish: "지친 일상 속에서 온전한 내면의 평화와 고요한 안식을 찾길 소망합니다." },
  { id: "self_love", label: "나를 향한 온전한 사랑", emoji: "🧡", color: "#f97316", defaultWish: "있는 그대로의 나 자신을 따뜻하게 안아주고 온전히 사랑할 수 있기를 바랍니다." },
  { id: "courage", label: "성장과 새로운 용기", emoji: "🔥", color: "#eab308", defaultWish: "두려움을 넘어 새로운 도전과 성장을 향해 나아갈 수 있는 용기를 품길 희망합니다." },
  { id: "relationship", label: "따뜻한 연결과 화해", emoji: "🤝", color: "#38bdf8", defaultWish: "소중한 사람들과 따뜻하게 연결되고 진심 어린 화해와 이해가 피어나길 바랍니다." },
  { id: "dream", label: "간절한 꿈과 비전", emoji: "✨", color: "#a855f7", defaultWish: "가슴속에 품은 간절한 꿈과 비전이 눈부신 현실로 활짝 피어나길 기원합니다." },
] as const;

export type WishCategoryId = typeof WISH_CATEGORIES[number]["id"];

export const WishingWellSchema = z.object({
  echo: z.string(),
  innerChildGuidance: z.string(),
  crystalKeyword: z.string(),
});

export type WishingWellResult = z.infer<typeof WishingWellSchema>;

export type WishEntry = {
  id?: string;
  wish: string;
  category: WishCategoryId;
  categoryLabel: string;
  echo: string;
  innerChildGuidance: string;
  crystalKeyword: string;
  createdAt?: any;
};

const WISH_STORAGE_KEY_PREFIX = "orange_wishing_well_";

/**
 * Intelligent tailored fallback generator based on user's wish keywords and category
 */
export function getPersonalizedWishFallback(wish: string, category: WishCategoryId = "inner_peace"): WishingWellResult {
  const trimmed = wish.trim();
  const shortWish = trimmed.length > 35 ? trimmed.slice(0, 35) + "..." : trimmed;
  const lower = trimmed.toLowerCase();

  // 1. Topic detection
  let detectedTheme = "general";
  if (/(시험|공부|합격|면접|취업|이직|진로|자격증|학교|수능|성적|발표|커리어)/.test(lower)) {
    detectedTheme = "career_exam";
  } else if (/(돈|재정|부자|연봉|경제|사업|매출|계약|금전|투자|빚|수입)/.test(lower)) {
    detectedTheme = "wealth_work";
  } else if (/(건강|다이어트|치료|아프|통증|수면|잠|불면|병원|회복|운동|피로|체력)/.test(lower)) {
    detectedTheme = "health_body";
  } else if (/(사랑|연애|짝사랑|고백|결혼|이별|재회|남친|여친|애인|호감|설렘)/.test(lower)) {
    detectedTheme = "love_romance";
  } else if (/(가족|부모|엄마|아빠|자식|아이|친구|인간관계|상사|동료|소통|갈등|사람들)/.test(lower)) {
    detectedTheme = "family_social";
  } else if (/(불안|우울|스트레스|번아웃|지침|힘들|괴로|외로|울고|답답|포기|눈물|무기력)/.test(lower)) {
    detectedTheme = "mental_comfort";
  } else if (/(꿈|미래|창작|예술|도전|변화|시작|행복|여행|새로운)/.test(lower)) {
    detectedTheme = "dream_adventure";
  }

  // 2. Curated echo pool per theme
  const themeEchoMap: Record<string, { echoes: string[]; guidances: string[]; keywords: string[] }> = {
    career_exam: {
      echoes: [
        `우물 수면에 닿은 "${shortWish}"을(를) 향한 당신의 땀방울과 간절한 염원이 오렌지빛 서광으로 밝게 피어납니다. 지금까지 준비해온 모든 노력은 이미 당신의 뼈와 살이 되어 결실을 맺을 준비를 마쳤습니다. 스스로를 의심하지 말고, 당신의 당당한 잠재력을 굳게 믿으세요.`,
        `"${shortWish}"(이)라는 소망 속에 담긴 치열한 열정과 성실함이 우물 깊은 곳에서 단단한 확신으로 울려 퍼집니다. 불안감은 더 높이 도약하기 위한 숨 고르기일 뿐입니다. 당신이 꿈꾸는 눈부신 합격과 성장의 문이 활짝 열릴 것입니다.`,
      ],
      guidances: [
        `오늘만큼은 '나는 충분히 잘해내고 있어'라며 어깨를 가볍게 툭툭 털어주고 3분간 깊은 숨을 쉬어보세요.`,
        `노트 맨 위에 "${shortWish} 달성!"이라고 또렷이 적어보고 기분 좋은 미소를 지어보세요.`,
      ],
      keywords: ["당당한 합격의 토파즈", "성취와 도약의 앰버", "빛나는 성장의 오렌지 선스톤"],
    },
    wealth_work: {
      echoes: [
        `"${shortWish}"(을)를 품은 당신의 현명한 의지와 풍요의 소망이 우물의 잔잔한 수면에 풍성한 황금빛 파동을 일으킵니다. 궁핍이나 조급함의 두려움을 내려놓고, 당신이 만들어낼 가치와 기회를 향해 마음을 활짝 여세요. 풍요는 이미 당신을 향해 흐르고 있습니다.`,
        `우물 깊은 곳에서 울려 퍼지는 메아리가 전합니다. "${shortWish}"에 담긴 바람은 당신의 바른 성실함과 만나 가장 단단하고 안정적인 번영의 결실을 맺게 될 것입니다.`,
      ],
      guidances: [
        `오늘 내가 가진 작은 것들에 감사하는 마음을 품고, 나 자신에게 풍요로운 따뜻한 차 한 잔을 선물해보세요.`,
        `지갑이나 계좌를 정돈하며 '내 삶은 날마다 더욱 풍요롭고 단단해진다'고 확언해보세요.`,
      ],
      keywords: ["황금빛 풍요의 시트린", "번영과 확신의 앰버", "안정된 결실의 옥(Jade)"],
    },
    health_body: {
      echoes: [
        `우물에 띄운 "${shortWish}"의 마음은 지친 몸과 마음에 가장 다정한 생명 에너지를 불어넣는 신성한 치유의 시작입니다. 애써 무리하려 하지 말고, 지금 이 순간 세포 하나하나가 편안하게 호흡하고 재생되도록 몸의 신호에 귀를 기울여주세요.`,
        `"${shortWish}"(을)를 향한 당신의 소망에 우물이 맑고 시원한 생명수를 비춥니다. 당신의 몸은 스스로 회복하는 위대한 자연의 치유력을 품고 있습니다. 매일 조금씩 가볍고 건강해질 당신을 축복합니다.`,
      ],
      guidances: [
        `오늘 잠들기 전 따뜻한 물을 천천히 마시며 온몸의 긴장을 머리부터 발끝까지 툭 내려놓아보세요.`,
        `가슴에 두 손을 얹고 '내 몸아, 오늘도 애써줘서 고마워'라고 부드럽게 속삭여주세요.`,
      ],
      keywords: ["생명력과 치유의 에메랄드", "정화와 회복의 아쿠아마린", "온전한 활력의 페리도트"],
    },
    love_romance: {
      echoes: [
        `"${shortWish}"(이)라는 당신의 떨리는 진심이 우물 저편에 따뜻하고 부드러운 분홍빛 파동으로 전해졌습니다. 사랑받기 위해 억지로 애쓰거나 포장하지 않아도, 당신 고유의 순수하고 다정한 온기만으로 이미 충분히 눈부신 사랑을 이룰 자격이 있습니다.`,
        `소원으로 띄운 "${shortWish}"의 마음에 우물이 가장 설레고 따뜻한 축복을 보냅니다. 상대방과 나 자신 모두를 존중하는 당신의 열린 가슴이 진실하고 오래 지속될 사랑의 인연을 맺어줄 것입니다.`,
      ],
      guidances: [
        `거울 속 나를 향해 먼저 다정한 미소를 건네며 '나는 사랑받을 자격이 가득한 사람이야'라고 말해주세요.`,
        `마음속에 머뭇거리던 고마움이나 다정한 한마디를 오늘 소중한 사람에게 가볍게 전해보세요.`,
      ],
      keywords: ["따스한 사랑의 로즈쿼츠", "진솔한 인연의 핑크 오팔", "설레는 화합의 가넷"],
    },
    family_social: {
      echoes: [
        `"${shortWish}"(을)를 향한 당신의 배려와 고뇌가 우물 깊은 곳에서 평화로운 안식으로 어루만져집니다. 상대방의 감정까지 모두 짊어지려 하지 않아도 괜찮습니다. 건강한 경계와 다정한 진심이 만날 때 비로소 진정한 이해와 화해가 피어납니다.`,
        `우물이 전하는 메아리가 말합니다. "${shortWish}"(이)라는 소망은 이미 굳어있던 관계의 매듭을 풀고 따스한 소통의 온기를 피워내고 있습니다.`,
      ],
      guidances: [
        `오늘 대화할 때 상대의 말을 끝까지 경청해주고, 내 마음에도 너그러운 여백 한 조각을 남겨두세요.`,
        `복잡한 관계의 얽힘을 잠시 내려놓고 나만의 고요한 공간에서 편안히 휴식하세요.`,
      ],
      keywords: ["화해와 소통의 라피스", "너그러운 이해의 블루 사파이어", "평화로운 연결의 칼세도니"],
    },
    mental_comfort: {
      echoes: [
        `우물에 떨어진 소원 "${shortWish}"은(는) 겉으로 내색하지 못했던 당신의 무거운 짐을 대신 품어 안아줍니다. 많이 지치고 외로웠을 당신의 여린 마음에 우물이 오렌지빛 담요를 덮어드립니다. 더 이상 강한 척 버티지 않아도 당신은 이미 소중합니다.`,
        `"${shortWish}"(이)라는 진솔한 탄식이 우물의 맑은 수면에서 고요한 평온으로 정화됩니다. 어두운 터널도 결국 끝이 있으며, 지금의 쉼표가 당신을 더 따뜻하고 단단한 행복으로 인도할 것입니다.`,
      ],
      guidances: [
        `오늘 하루는 모든 자책을 멈추고 '그동안 참 많이 버텨왔구나'라며 나를 꼭 안아주세요.`,
        `5분 동안 아무 생각 없이 창밖의 하늘을 바라보며 깊은 들숨과 날숨을 반복해보세요.`,
      ],
      keywords: ["불안을 녹이는 문스톤", "깊은 위로의 자수정(Amethyst)", "따스한 안식의 앰버"],
    },
    dream_adventure: {
      echoes: [
        `우물 깊은 곳으로 던져진 찬란한 소망 "${shortWish}"은(는) 보이지 않는 곳에서 가장 단단하고 생명력 넘치게 뿌리를 내리고 있습니다. 세상의 잣대에 휘둘리지 않고 당신만의 길을 걷는 모든 순간마다 우주와 오렌지 유니버스가 힘차게 응원합니다.`,
        `"${shortWish}"을(를) 향해 반짝이는 당신의 비전은 이미 새로운 현실의 문을 활짝 열었습니다. 가슴속에 살아 숨 쉬는 창작과 열정의 불꽃을 따라 담대하게 날개를 펼치세요.`,
      ],
      guidances: [
        `꿈을 위해 오늘 당장 시작할 수 있는 가장 작고 재미있는 한 가지를 10분간 실행해보세요.`,
        `가슴을 활짝 펴고 '내 꿈은 가장 멋진 순간에 찬란하게 빛날 것이다'라고 확신을 담아 외쳐보세요.`,
      ],
      keywords: ["소망 실현의 다이아몬드", "창조적 비전의 탄자나이트", "기적을 부르는 루비"],
    },
    general: {
      echoes: [
        `우물 깊은 곳에 닿은 당신의 소원 "${shortWish}"은(는) 결코 헛된 바람이 아닙니다. 복잡한 생각과 짓누르던 부담을 잠시 내려놓으세요. 지금 품은 고요한 소망의 씨앗이 당신의 마음에 가장 평화롭고 따스한 축복으로 피어날 것입니다.`,
        `"${shortWish}"(이)라는 진솔한 고백이 우물의 수면에 맑은 파동을 일으킵니다. 깊은 쉼 속에서 내면의 평온과 지혜가 스스로 회복되어 당신을 온화하게 감싸 안아줄 것입니다.`,
      ],
      guidances: [
        `"${shortWish}"을(를) 마음에 품고, 어깨와 턱의 긴장을 툭 풀며 세 번 천천히 심호흡해보세요.`,
        `오늘 나 자신에게 온전한 10분의 정적과 휴식을 다정하게 선물해주세요.`,
      ],
      keywords: ["평온과 소망의 에메랄드", "축복의 오렌지 토파즈", "영혼의 평온 문스톤"],
    },
  };

  const themeData = themeEchoMap[detectedTheme] || themeEchoMap.general;
  const echo = themeData.echoes[Math.floor(Math.random() * themeData.echoes.length)];
  const innerChildGuidance = themeData.guidances[Math.floor(Math.random() * themeData.guidances.length)];
  const crystalKeyword = themeData.keywords[Math.floor(Math.random() * themeData.keywords.length)];

  return {
    echo,
    innerChildGuidance,
    crystalKeyword,
  };
}

export function getWishingWellFallback(category: WishCategoryId): WishingWellResult {
  return getPersonalizedWishFallback("내면의 평화와 소망", category);
}

export function getLocalWishes(uid: string): WishEntry[] {
  try {
    const raw = localStorage.getItem(`${WISH_STORAGE_KEY_PREFIX}${uid || "guest"}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function deduplicateWishes(list: WishEntry[]): WishEntry[] {
  const seenKeys = new Set<string>();
  const result: WishEntry[] = [];
  for (const item of list) {
    if (!item || !item.wish) continue;
    const cleanWish = (item.wish || '').trim().toLowerCase();
    const cleanEcho = (item.echo || '').trim().slice(0, 35);
    const key = item.id ? `id_${item.id}` : `sig_${cleanWish}_${item.category}_${cleanEcho}`;
    const contentKey = `sig_${cleanWish}_${item.category}_${cleanEcho}`;

    if (seenKeys.has(key) || seenKeys.has(contentKey)) {
      continue;
    }
    if (item.id) seenKeys.add(key);
    seenKeys.add(contentKey);
    result.push(item);
  }
  return result;
}

export function saveLocalWish(uid: string, entry: WishEntry, previousTempId?: string) {
  try {
    const key = `${WISH_STORAGE_KEY_PREFIX}${uid || "guest"}`;
    const list = getLocalWishes(uid);
    const filtered = list.filter((item) => {
      if (previousTempId && item.id === previousTempId) return false;
      if (entry.id && item.id === entry.id) return false;
      const isSameContent = item.wish?.trim() === entry.wish?.trim() 
        && item.category === entry.category 
        && item.echo?.trim().slice(0, 35) === entry.echo?.trim().slice(0, 35);
      return !isSameContent;
    });
    const updated = deduplicateWishes([entry, ...filtered]).slice(0, 50);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.warn("[WishingWell] Failed to save local wish:", e);
  }
}

/**
 * Load history of wishes for the current user
 */
export async function loadWishesHistory(uid: string): Promise<WishEntry[]> {
  const localList = getLocalWishes(uid);
  if (!uid || uid === "guest") {
    return deduplicateWishes(localList);
  }

  try {
    const entriesRef = collection(db, "orange_history", uid, "entries");
    const fetchPromise = getDocs(query(entriesRef, orderBy("createdAt", "desc")));
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Firestore fetch timeout")), 3000)
    );

    const snapshot = await Promise.race([fetchPromise, timeoutPromise]);
    const remoteWishes: WishEntry[] = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.type === "wishing_well") {
        remoteWishes.push({
          id: doc.id,
          wish: data.metadata?.wish || data.content || "",
          category: data.metadata?.category || "inner_peace",
          categoryLabel: data.metadata?.categoryLabel || "내면의 평화",
          echo: data.metadata?.echo || data.response || "",
          innerChildGuidance: data.metadata?.innerChildGuidance || "",
          crystalKeyword: data.metadata?.crystalKeyword || "영혼의 평온",
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        });
      }
    }

    // Merge remote with local using strict deduplication
    const all = [...remoteWishes, ...localList];
    const merged = deduplicateWishes(all).slice(0, 50);
    try {
      localStorage.setItem(`${WISH_STORAGE_KEY_PREFIX}${uid}`, JSON.stringify(merged));
    } catch {}
    return merged.length > 0 ? merged : deduplicateWishes(localList);
  } catch (err) {
    console.warn("[WishingWell] Failed to load remote wishes history, using local cache:", err);
    return deduplicateWishes(localList);
  }
}

/**
 * Make a wish into the well and get the well's echo response.
 * Uses fast AI completion with tailored fallback protection to completely eliminate infinite loading and repetitive replies.
 */
export async function castWishIntoWell(
  uid: string,
  wish?: string,
  category: WishCategoryId = "inner_peace"
): Promise<WishEntry> {
  const categoryMeta = WISH_CATEGORIES.find((c) => c.id === category) || WISH_CATEGORIES[0];
  const cleanWish = (wish && wish.trim()) 
    ? wish.trim() 
    : ((categoryMeta as any).defaultWish || "내면의 평화와 성장을 기원합니다.");

  const prompt = `당신은 치유와 몰입의 오렌지(ORANGE) 유니버스에 있는 [소원의 우물]입니다.
사용자가 우물에 다음과 같은 소원을 띄웠습니다:
- 소원 내용: "${cleanWish}"
- 소원 영역: ${categoryMeta.label} (${categoryMeta.emoji})

아래 형식의 유효한 JSON 문자열로만 응답하세요. 마크다운(\`\`\`json)이나 인사말을 포함하지 마세요.
{
  "echo": "사용자의 소원('${cleanWish}')의 구체적인 상황과 감정을 짚어주며 깊이 공감하고 축복하는 다정하고 따뜻한 메아리 (2~3문장, 120~180자 내외)",
  "innerChildGuidance": "이 소원과 관련하여 오늘 사용자가 당장 가볍게 실천해볼 수 있는 내면 아이 맞춤 처방 (1문장, 30~50자 내외)",
  "crystalKeyword": "소원에 어울리는 보석 상징 키워드 (예: '성취와 도약의 토파즈', '안도와 쉼의 문스톤' 등 2~4단어)"
}`;

  let result: WishingWellResult | null = null;

  // Strict 8-second timeout protection for instant responsiveness
  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), 8000)
  );

  try {
    const aiPromise = async (): Promise<WishingWellResult | null> => {
      try {
        const raw = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are the warm, empathetic Wishing Well spirit of the Orange healing sanctuary. Respond ONLY in valid JSON format in Korean.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          responseFormat: { type: "json_object" },
        });

        if (!raw) return null;
        let cleanJson = raw.trim();
        const match = cleanJson.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (match) cleanJson = match[1].trim();
        const firstBrace = cleanJson.indexOf("{");
        const lastBrace = cleanJson.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1) {
          cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
        }

        const parsed = JSON.parse(cleanJson);
        if (
          parsed &&
          typeof parsed.echo === "string" &&
          parsed.echo.length > 20 &&
          !parsed.echo.includes("고요한 파동으로") &&
          !parsed.echo.includes("생성하지") &&
          typeof parsed.innerChildGuidance === "string" &&
          typeof parsed.crystalKeyword === "string"
        ) {
          return {
            echo: parsed.echo.trim(),
            innerChildGuidance: parsed.innerChildGuidance.trim(),
            crystalKeyword: parsed.crystalKeyword.trim(),
          };
        }
        return null;
      } catch (err) {
        console.warn("[WishingWell] LLM parse error:", err);
        return null;
      }
    };

    result = await Promise.race([aiPromise(), timeoutPromise]);
  } catch (err) {
    console.warn("[WishingWell] LLM race error:", err);
  }

  // If LLM returned null or timed out or returned invalid format, apply rich tailored personalized fallback
  if (!result) {
    result = getPersonalizedWishFallback(cleanWish, category);
  }

  const tempId = `wish_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const entry: WishEntry = {
    id: tempId,
    wish: cleanWish,
    category,
    categoryLabel: categoryMeta.label,
    echo: result.echo,
    innerChildGuidance: result.innerChildGuidance,
    crystalKeyword: result.crystalKeyword,
    createdAt: new Date().toISOString(),
  };

  // Instant local storage cache
  saveLocalWish(uid, entry);

  // Background non-blocking Firestore persist
  if (uid && uid !== "guest") {
    (async () => {
      try {
        const entriesRef = collection(db, "orange_history", uid, "entries");
        const docRef = await addDoc(entriesRef, {
          type: "wishing_well",
          source: "orange",
          content: entry.wish,
          response: entry.echo,
          metadata: {
            wish: entry.wish,
            category: entry.category,
            categoryLabel: entry.categoryLabel,
            echo: entry.echo,
            innerChildGuidance: entry.innerChildGuidance,
            crystalKeyword: entry.crystalKeyword,
            channel: "orange",
          },
          createdAt: serverTimestamp(),
        });
        const updatedEntry: WishEntry = { ...entry, id: docRef.id };
        saveLocalWish(uid, updatedEntry, tempId);
      } catch (saveErr) {
        console.warn("[WishingWell] Background Firestore persist failed:", saveErr);
      }
    })();
  }

  return entry;
}
