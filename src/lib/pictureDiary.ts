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
import { isTimestampToday } from "@/lib/dailyCache";

export const PictureDiarySchema = z.preprocess(
  (val: any) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const text = val.text ?? val.diary ?? val.content ?? val.body ?? val.journal ?? val.story ?? val.message ?? "";
      const prompt = val.prompt ?? val.image_prompt ?? val.imagePrompt ?? val.image ?? val.dalle_prompt ?? val.illustration_prompt ?? val.description ?? "";
      return {
        ...val,
        text: typeof text === "string" && text.trim() ? text.trim() : "오늘 하루 마음에 머물렀던 순간들을 조용히 떠올려봅니다. 작은 이야기들이 모여 따뜻한 위로와 성장의 밑거름이 됩니다.",
        prompt: typeof prompt === "string" && prompt.trim() ? prompt.trim() : "A cozy emotional watercolor illustration with soft warm lighting, comforting atmosphere, cinematic soft pastel tones, high resolution",
      };
    }
    return val;
  },
  z.object({
    text: z
      .string()
      .describe(
        "감성적이고 따뜻한 감정 그림일기 내용 (약 3~4문장). 독백 형식으로 오늘 하루의 일과와 그에 따른 감정 변화, 성찰을 담아주세요.",
      ),
    prompt: z
      .string()
      .describe(
        "Dall-E/Flux용 고품질 영문 이미지 생성 프롬프트 (수채화 톤, 일러스트레이션, 따뜻한 오렌지 톤 베이스에 감정을 표현하는 다채로운 색감 추가, 감성적이고 따뜻한 무드)",
      ),
  })
);

export type PictureDiaryEntry = {
  text: string;
  imageUrl: string;
};

export type TodayPictureDiaryState = {
  diary: PictureDiaryEntry | null;
  chats: string[];
  canGenerate: boolean;
  coveredChatCount: number;
};

let autoGeneratePromise: Promise<PictureDiaryEntry | null> | null = null;

function formatChatEntry(data: Record<string, any>): string | null {
  if (data.type !== "chat" && data.type !== "chat_sync") return null;
  const userQ = data.metadata?.question || data.content || "(없음)";
  const aiR = data.response || data.content || "";
  return `나: ${userQ}\n오렌지: ${aiR}`;
}

export async function loadTodayPictureDiaryState(
  uid: string,
): Promise<TodayPictureDiaryState> {
  const entriesRef = collection(db, "orange_history", uid, "entries");
  const snapshot = await getDocs(query(entriesRef, orderBy("createdAt", "desc")));

  let diary: PictureDiaryEntry | null = null;
  let coveredChatCount = 0;
  const todayChats: string[] = [];

  for (const entry of snapshot.docs) {
    const data = entry.data();
    if (!data.createdAt) continue;

    if (!isTimestampToday(data.createdAt)) {
      break;
    }

    if (data.type === "picture_diary") {
      if (!diary) {
        diary = {
          text: data.content,
          imageUrl: data.metadata?.imageUrl || "",
        };
        coveredChatCount = Number(data.metadata?.chatCount) || 0;
      }
      continue;
    }

    const chatLine = formatChatEntry(data);
    if (chatLine) todayChats.push(chatLine);
  }

  const chats = todayChats.reverse();
  return {
    diary,
    chats,
    coveredChatCount,
    canGenerate: chats.length > 0 && chats.length > coveredChatCount,
  };
}

export async function generatePictureDiary(
  uid: string,
  chats: string[],
): Promise<PictureDiaryEntry> {
  if (chats.length === 0) {
    throw new Error("오늘의 대화 기록이 없어 그림일기를 생성할 수 없습니다.");
  }

  const chatContext = chats.join("\n\n");
  const response = await invokeLLMStructured({
    messages: [
      {
        role: "system",
        content:
          "당신은 오늘 사용자의 대화 내용을 읽고 이를 아름다운 한 편의 감정 그림일기로 만들어주는 따뜻한 은유의 마법사입니다. 대화를 바탕으로 사용자가 겪은 하루의 일과와 그에 따른 감정 변화, 성찰을 담아줄 수 있도록 독백 형식의 일기(한국어)와, 이 일기를 감성적인 그림으로 표현할 고도화된 영문 프롬프트를 묘사해주세요.",
      },
      {
        role: "user",
        content: `[오늘의 대화 내역]\n${chatContext}`,
      },
    ],
    schema: PictureDiarySchema,
  });

  const imgRes = await fetch("/api/ai/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: `Emotional illustration, storybook style, watercolor art, a heartwarming and comforting scene highlighting warm orange tones. ${response.prompt}`,
      aspectRatio: "1:1",
    }),
  });

  if (!imgRes.ok) {
    throw new Error("Image API responded with error.");
  }

  const imgData = await imgRes.json();
  const imageUrl = imgData.imageUrl as string;

  await addDoc(collection(db, "orange_history", uid, "entries"), {
    type: "picture_diary",
    content: response.text,
    metadata: { imageUrl, chatCount: chats.length },
    createdAt: serverTimestamp(),
  });

  return { text: response.text, imageUrl };
}

export async function autoGeneratePictureDiaryIfNeeded(
  uid?: string | null,
): Promise<PictureDiaryEntry | null> {
  const resolvedUid = uid || auth.currentUser?.uid;
  if (!resolvedUid) return null;
  if (localStorage.getItem("developer_bypass") === "true") return null;

  if (autoGeneratePromise) return autoGeneratePromise;

  autoGeneratePromise = (async () => {
    try {
      const state = await loadTodayPictureDiaryState(resolvedUid);
      if (!state.canGenerate) return null;
      return await generatePictureDiary(resolvedUid, state.chats);
    } catch (error) {
      console.error("[pictureDiary] auto-generate failed:", error);
      return null;
    } finally {
      autoGeneratePromise = null;
    }
  })();

  return autoGeneratePromise;
}

export function notifyOrangeChatSaved() {
  window.dispatchEvent(new CustomEvent("orange-chat-saved"));
}