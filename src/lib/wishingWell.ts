import { z } from "zod";
import {
  auth,
  db,
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
} from "@/lib/firebase";
import { invokeLLMStructured } from "@/lib/ai";

export const WISH_CATEGORIES = [
  { id: "inner_peace", label: "내면의 평화와 안식", emoji: "🌿", color: "#10b981" },
  { id: "self_love", label: "나를 향한 온전한 사랑", emoji: "🧡", color: "#f97316" },
  { id: "courage", label: "성장과 새로운 용기", emoji: "🔥", color: "#eab308" },
  { id: "relationship", label: "따뜻한 연결과 화해", emoji: "🤝", color: "#38bdf8" },
  { id: "dream", label: "간절한 꿈과 비전", emoji: "✨", color: "#a855f7" },
] as const;

export type WishCategoryId = typeof WISH_CATEGORIES[number]["id"];

export const WishingWellSchema = z.preprocess(
  (val: any) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const echo = val.echo ?? val.blessing ?? val.message ?? val.response ?? val.content ?? "";
      const innerChildGuidance = val.innerChildGuidance ?? val.guidance ?? val.advice ?? "";
      const crystalKeyword = val.crystalKeyword ?? val.keyword ?? val.gem ?? "온전한 수용";
      return {
        ...val,
        echo: typeof echo === "string" && echo.trim() ? echo.trim() : "깊은 수면 아래로 닿은 너의 소망은 이미 우주에 울려 퍼졌어. 조급해하지 않아도, 너의 길은 가장 따뜻한 순간에 스스로 빛을 낼 거야.",
        innerChildGuidance: typeof innerChildGuidance === "string" && innerChildGuidance.trim() ? innerChildGuidance.trim() : "가슴에 손을 얹고 세 번 깊게 숨을 들이쉬어봐. 내 안의 작은 내가 미소 짓고 있어.",
        crystalKeyword: typeof crystalKeyword === "string" && crystalKeyword.trim() ? crystalKeyword.trim() : "온전한 수용",
      };
    }
    return val;
  },
  z.object({
    echo: z
      .string()
      .describe(
        "소원의 우물 깊은 곳에서 울려 퍼지는 다정하고 성스러운 축복과 치유의 메아리 (2~3문장, 약 120~160자 내외). 내면 아이를 안아주듯 따뜻하고 솔직한 오렌지 특유의 어조.",
      ),
    innerChildGuidance: z
      .string()
      .describe(
        "내면 아이와 교감하며 오늘 실천할 수 있는 한 줄의 따뜻한 마음 처방 (1문장, 30~50자 내외).",
      ),
    crystalKeyword: z
      .string()
      .describe(
        "이 소원이 우물에 닿아 맺힌 영혼의 보석 키워드 (예: '무조건적인 자비', '새로운 용기', '평온한 쉼표', '진실된 사랑')",
      ),
  })
);

export type WishingWellResult = {
  echo: string;
  innerChildGuidance: string;
  crystalKeyword: string;
};

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

/**
 * Load history of wishes for the current user
 */
export async function loadWishesHistory(uid: string): Promise<WishEntry[]> {
  if (!uid) return [];
  try {
    const entriesRef = collection(db, "orange_history", uid, "entries");
    const snapshot = await getDocs(query(entriesRef, orderBy("createdAt", "desc")));

    const wishes: WishEntry[] = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.type === "wishing_well") {
        wishes.push({
          id: doc.id,
          wish: data.metadata?.wish || data.content || "",
          category: data.metadata?.category || "inner_peace",
          categoryLabel: data.metadata?.categoryLabel || "내면의 평화",
          echo: data.metadata?.echo || data.response || "",
          innerChildGuidance: data.metadata?.innerChildGuidance || "",
          crystalKeyword: data.metadata?.crystalKeyword || "영혼의 평온",
          createdAt: data.createdAt,
        });
      }
    }
    return wishes;
  } catch (err) {
    console.error("[WishingWell] Failed to load wishes history:", err);
    return [];
  }
}

/**
 * Make a wish into the well and get the well's echo response
 */
export async function castWishIntoWell(
  uid: string,
  wish: string,
  category: WishCategoryId = "inner_peace"
): Promise<WishEntry> {
  if (!wish || !wish.trim()) {
    throw new Error("소원 내용을 입력해주세요.");
  }

  const categoryMeta = WISH_CATEGORIES.find((c) => c.id === category) || WISH_CATEGORIES[0];

  const systemInstruction = `당신은 '오렌지(ORANGE) 치유 유니버스' 깊은 곳에 자리한 신비롭고 따뜻한 [소원의 우물]의 치유 영혼입니다.
사용자가 마음속 가장 솔직하고 소중한 소망이나 억눌린 감정의 바람을 우물에 띄웠습니다.

사용자의 소원 카테고리: [${categoryMeta.label} (${categoryMeta.emoji})]
사용자가 적은 소원: "${wish.trim()}"

당신의 임무:
1. 사용자가 소원을 비는 행위 자체가 "내면의 상처받은 아이를 인정하고 사랑해주는 위대한 자기 수용"임을 깊이 공감해주세요.
2. 우물 수면에서 울려 퍼지는 듯한 감미롭고 평온하며 신비로운 축복의 메아리(echo, 2~3문장)를 건네세요.
3. 오늘 하루 내면 아이를 보듬을 수 있는 다정한 한 줄의 실천 처방(innerChildGuidance, 1문장)을 작성하세요.
4. 이 소원이 우물 바닥에 닿아 맺힌 빛나는 영혼의 결정체 키워드(crystalKeyword, 2~4단어)를 제시하세요.

형식:
- 존댓말과 다정하고 솔직한 치유자의 어조를 사용합니다.
- 과도한 미사여구는 배제하고 영혼을 안아주는 깊은 온기를 담아주세요.`;

  const result = await invokeLLMStructured({
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: `사용자의 소원: "${wish.trim()}" (카테고리: ${categoryMeta.label})` },
    ],
    schema: WishingWellSchema,
  });

  const entry: WishEntry = {
    wish: wish.trim(),
    category,
    categoryLabel: categoryMeta.label,
    echo: result.echo,
    innerChildGuidance: result.innerChildGuidance,
    crystalKeyword: result.crystalKeyword,
  };

  if (uid) {
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
      entry.id = docRef.id;
    } catch (saveErr) {
      console.warn("[WishingWell] Failed to persist wish to Firestore:", saveErr);
    }
  }

  return entry;
}
