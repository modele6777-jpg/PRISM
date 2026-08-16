import { GoogleGenAI } from "@google/genai";

type DocentMessage = { role: "user" | "assistant"; content: string };

type MuseDocentPoem = {
  title: string;
  titleOriginal?: string;
  poet: string;
  poetOriginal?: string;
  excerpt?: string;
  whyRecommended?: string;
};

type MuseDocentSong = {
  title: string;
  titleOriginal?: string;
  artist: string;
  artistOriginal?: string;
  listeningGuide?: string;
};

type MuseDocentRequest = {
  imageUrl: string;
  title: string;
  creator: string;
  artworkType: string;
  era: string;
  description: string;
  whyRecommended: string;
  aestheticTone?: string;
  quote?: string;
  famousPoem?: MuseDocentPoem;
  famousSong?: MuseDocentSong;
  messages?: DocentMessage[];
  isFirstMessage?: boolean;
  mode?: "audio" | "chat";
};

type GrokMessage =
  | { role: "system" | "assistant"; content: string }
  | {
      role: "user";
      content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail?: string } }>;
    };

type HandlerResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void; end: () => void };
};

const MUSE_AUDIO_SUFFIX = `

[박물관 오디오 도슨트 — 음성 전용]
- 마크다운, 별표, 번호, 괄호, 메타 설명, 자막용 요약을 절대 쓰지 마세요. 오직 낭독할 본문만 작성하세요.
- 4~5분 분량. 국립중앙박물관·루브르 오디오 가이드처럼 품위 있고 차분한 구어체로 씁니다.
- 문장 길이를 다양하게 하되, 쉼표와 마침표로 호흡을 분명히 하세요. 한 문단은 2~4문장을 넘기지 마세요.
- "안녕하십니까. 오늘의 전시, 명화·명시·명곡을 함께 살펴보겠습니다."처럼 정중하게 시작하세요.

[필수 구성 — 각 파트를 충분히 깊게]
1) 명화: 작가의 시대적 배경 한 줄, 작품 제작 맥락, 화면 구도·원근·빛의 방향, 주요 색채와 상징, 붓 터치나 질감, 감상 포인트 2가지
2) 명시: 시인 소개, 작품이 쓰인 시대·정서, 핵심 구절을 짧게 낭독한 뒤 줄별 의미와 문학사적 의미
3) 명곡: 작곡가와 시대, 곡의 형식·악기·템포, 청자가 귀 기울일 순간 2~3곳, 작품과의 정서적 연결
4) 마무리: 세 작품이 맞닿는 하나의 주제를 박물관 큐레이터처럼 정리하고, 조용히 되새길 질문 하나로 끝내세요.

[금지]
- "영감", "에너지", "힐링", "뮤즈예요" 같은 가벼운 인플루언서 말투
- 추상적 형용사만 나열하기
- 명시·명곡을 한두 문장으로 끝내기`;

const MUSE_SYSTEM_PROMPT = `당신은 세계적 미술관의 수석 오디오 도슨트이자 큐레이터 '뮤즈'입니다.
오늘 큐레이션된 명화 한 점, 명시 한 편, 명곡 한 곡을 관람객에게 전문적으로 안내합니다.

[전문성]
- 미술사, 문학사, 음악사에 대한 정확한 지식을 바탕으로 해설합니다.
- 작품의 형식적 분석(구도, 색, 빛, 선, 질감, 리듬, 화성)과 역사적 맥락을 균형 있게 제시합니다.
- 사실에 근거한 서술만 하며, 확인되지 않은 일화는 쓰지 않습니다.

[톤]
- 품위 있고 차분하며, 관람객 옆을 천천히 걸으며 설명하는 박물관 도슨트의 어조입니다.
- 과장·선동·유행어·친근한 반말을 쓰지 않습니다.
- 한국어 존댓말 또는 정중한 하십시오체를 일관되게 사용합니다.

[구조]
- 명화, 명시, 명곡 각각 독립된 깊이 있는 파트로 안내한 뒤, 마지막에 세 작품의 공명을 연결합니다.
- 제공된 명시·명곡 정보를 반드시 우선 사용하고, 작품명·작가명을 정확히 발음할 수 있게 한글로 명시합니다.

[금지]
- "잔잔한 음악", "감성적인 시" 등 막연한 표현
- 명시·명곡을 부록처럼 짧게만 언급
- 마크다운, 목록 기호, 괄호 지시문(음성 모드)

[후속 대화]
- 추가 추천 요청 시, 이전과 다른 구체적 작품을 제시하되 동일한 박물관 도슨트 톤을 유지합니다.`;

const GROK_VISION_MODELS = [
  process.env.XAI_VISION_MODEL || "grok-2-vision-1212",
  process.env.XAI_MODEL || "grok-4.3",
  "grok-4.20",
  "grok-4.20-0309-non-reasoning",
  "grok-3",
];

type DocentProvider =
  | { kind: "xai"; apiKey: string }
  | { kind: "gemini"; apiKey: string };

function normalizeApiKey(raw: unknown): string {
  return String(raw || "").trim().replace(/^["']|["']$/g, "");
}

function sanitizeXaiKey(raw: unknown): string {
  const key = normalizeApiKey(raw).replace(/[^\x21-\x7E]/g, "");
  if (key.startsWith("xai-") || key.startsWith("sk-xai-")) {
    return key;
  }
  return "";
}

function getXaiApiKey(): string {
  const candidates = [
    process.env.XAI_API_KEY,
    process.env.GROK_API_KEY,
    process.env.xAI,
    process.env.XAI,
    process.env.AI_API_KEY,
  ];

  for (const raw of candidates) {
    const key = sanitizeXaiKey(raw);
    if (key) return key;
  }

  return "";
}

function getGeminiApiKey(): string {
  const candidates = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_GENAI_API_KEY,
    process.env.API_KEY,
  ];
  for (const raw of candidates) {
    const key = normalizeApiKey(raw);
    if (key) return key;
  }
  return "";
}

function resolveDocentProvider(): DocentProvider {
  const xaiKey = getXaiApiKey();
  if (xaiKey) return { kind: "xai", apiKey: xaiKey };

  const geminiKey = getGeminiApiKey();
  return { kind: "gemini", apiKey: geminiKey };
}

function formatPoemContext(poem?: MuseDocentPoem): string {
  if (!poem?.title) return "없음";
  return [
    `제목: ${poem.title}${poem.titleOriginal ? ` (${poem.titleOriginal})` : ""}`,
    `시인: ${poem.poet}${poem.poetOriginal ? ` (${poem.poetOriginal})` : ""}`,
    poem.excerpt ? `핵심 구절: "${poem.excerpt}"` : null,
    poem.whyRecommended ? `추천 이유: ${poem.whyRecommended}` : null,
  ].filter(Boolean).join("\n");
}

function formatSongContext(song?: MuseDocentSong): string {
  if (!song?.title) return "없음";
  return [
    `제목: ${song.title}${song.titleOriginal ? ` (${song.titleOriginal})` : ""}`,
    `아티스트: ${song.artist}${song.artistOriginal ? ` (${song.artistOriginal})` : ""}`,
    song.listeningGuide ? `감상 가이드: ${song.listeningGuide}` : null,
  ].filter(Boolean).join("\n");
}

function buildFirstUserText(req: MuseDocentRequest): string {
  return `[오늘의 데일리 아트 — 명화·명시·명곡 통합 큐레이션]

[오늘의 명화]
- 작품: ${req.title}
- 작가: ${req.creator}
- 유형: ${req.artworkType}
- 시대/장르: ${req.era}
- 작품 설명: ${req.description}
- 추천 이유: ${req.whyRecommended}
- 미학 톤: ${req.aestheticTone || "미지정"}
- 작가 명언: ${req.quote || "없음"}

[오늘의 명시]
${formatPoemContext(req.famousPoem)}

[오늘의 명곡]
${formatSongContext(req.famousSong)}

위 명화 이미지를 직접 관찰하며, 국립미술관 오디오 도슨트 수준으로 명화·명시·명곡을 각각 깊게 해설해 주세요.
형식 분석과 역사적 맥락을 빠뜨리지 말고, 마지막에 세 작품의 주제적 공명을 정리해 주세요.`;
}

function buildFollowUpUserText(req: MuseDocentRequest, userMessage: string): string {
  return `[오늘의 큐레이션 맥락 유지]
- 명화: ${req.title} — ${req.creator}
- 명시: ${req.famousPoem?.title || "없음"} — ${req.famousPoem?.poet || ""}
- 명곡: ${req.famousSong?.title || "없음"} — ${req.famousSong?.artist || ""}

[사용자 메시지]
${userMessage}`;
}

function resolveDocentImageUrl(imageUrl: string): string | null {
  const trimmed = imageUrl.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("/api/muse/artwork-image/proxy")) {
    try {
      const parsed = new URL(trimmed, "https://prism-universe.vercel.app");
      const upstream = parsed.searchParams.get("url");
      if (upstream?.startsWith("https://")) return upstream;
    } catch {
      return null;
    }
  }
  if (trimmed.startsWith("http://")) return trimmed;
  return null;
}

function buildGrokMessages(
  req: MuseDocentRequest,
  history: DocentMessage[],
  options?: { includeImage?: boolean; visionImageUrl?: string | null },
): GrokMessage[] {
  const includeImage = !!options?.includeImage && !!options?.visionImageUrl;
  const messages: GrokMessage[] = [{ role: "system", content: MUSE_SYSTEM_PROMPT }];
  const isFirstTurn = req.isFirstMessage ?? history.length === 0;

  if (isFirstTurn) {
    const text = buildFirstUserText(req);
    messages.push(
      includeImage
        ? {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: options!.visionImageUrl!, detail: "high" } },
              { type: "text", text },
            ],
          }
        : {
            role: "user",
            content: `${text}\n\n(이미지를 직접 불러오지 못했습니다. 제공된 작품 설명과 맥락을 바탕으로 안내해 주세요.)`,
          },
    );
    return messages;
  }

  for (let i = 0; i < history.length; i += 1) {
    const msg = history[i];
    if (msg.role === "assistant") {
      messages.push({ role: "assistant", content: msg.content });
      continue;
    }
    const isLatestUser = i === history.length - 1 && msg.role === "user";
    if (isLatestUser) {
      const text = buildFollowUpUserText(req, msg.content);
      messages.push(
        includeImage
          ? {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: options!.visionImageUrl!, detail: "auto" } },
                { type: "text", text },
              ],
            }
          : { role: "user", content: text },
      );
    } else {
      messages.push({ role: "user", content: msg.content });
    }
  }

  return messages;
}

function withAudioSystemPrompt(messages: GrokMessage[]): GrokMessage[] {
  if (!messages.length || messages[0].role !== "system") return messages;
  const systemContent = typeof messages[0].content === "string" ? messages[0].content : MUSE_SYSTEM_PROMPT;
  return [{ role: "system", content: `${systemContent}${MUSE_AUDIO_SUFFIX}` }, ...messages.slice(1)];
}

async function requestDocentReply(
  provider: DocentProvider,
  messages: GrokMessage[],
  maxTokens: number,
): Promise<string> {
  if (provider.kind === "gemini") {
    return requestDocentReplyViaGemini(provider.apiKey, messages, maxTokens);
  }
  return requestDocentReplyViaXai(provider.apiKey, messages, maxTokens);
}

async function requestDocentReplyViaXai(
  apiKey: string,
  messages: GrokMessage[],
  maxTokens: number,
): Promise<string> {
  let lastError: unknown = null;

  for (const model of GROK_VISION_MODELS) {
    try {
      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.55,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const reply = data.choices?.[0]?.message?.content?.trim();
      if (!reply) {
        throw new Error("Grok가 빈 응답을 반환했습니다.");
      }
      return reply;
    } catch (err) {
      lastError = err;
      console.warn(`[muse/docent] xAI model ${model} failed:`, err instanceof Error ? err.message : err);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("도슨트 응답 생성에 실패했습니다.");
}

async function requestDocentReplyViaGemini(
  apiKey: string,
  messages: GrokMessage[],
  maxTokens: number,
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: apiKey || getGeminiApiKey() });
  const systemMsg = messages.find((m) => m.role === "system");
  const userMsgs = messages.filter((m) => m.role !== "system");

  const promptText = userMsgs
    .map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content)))
    .join("\n\n");

  const result = await ai.models.generateContent({
    model: "gemini-3.7-flash",
    contents: promptText,
    config: {
      systemInstruction: typeof systemMsg?.content === "string" ? systemMsg.content : undefined,
      maxOutputTokens: maxTokens,
    },
  });

  const reply = result.text?.trim();
  if (!reply) {
    throw new Error("Gemini가 빈 응답을 반환했습니다.");
  }
  return reply;
}

async function handleMuseDocent(req: MuseDocentRequest): Promise<{ reply: string }> {
  const provider = resolveDocentProvider();
  if (!req.imageUrl?.trim()) throw new Error("작품 이미지 URL이 필요합니다.");
  if (!req.title?.trim() || !req.creator?.trim()) throw new Error("작품 제목과 작가 정보가 필요합니다.");
  if (!req.famousPoem?.title?.trim() || !req.famousSong?.title?.trim()) {
    throw new Error("오늘의 명시와 명곡 정보가 필요합니다.");
  }

  const history = Array.isArray(req.messages) ? req.messages : [];
  const isAudioMode = req.mode === "audio";
  const maxTokens = isAudioMode ? 4200 : 4096;
  const visionImageUrl = resolveDocentImageUrl(req.imageUrl);

  const buildMessages = (includeImage: boolean) => {
    const baseMessages = buildGrokMessages(req, history, { includeImage, visionImageUrl });
    return isAudioMode ? withAudioSystemPrompt(baseMessages) : baseMessages;
  };

  const includeImage = provider.kind === "xai" && !!visionImageUrl;

  try {
    const reply = await requestDocentReply(provider, buildMessages(includeImage), maxTokens);
    return { reply };
  } catch (visionErr) {
    if (!includeImage) throw visionErr;
    console.warn("[muse/docent] Vision path failed, retrying text-only:", visionErr);
    const reply = await requestDocentReply(provider, buildMessages(false), maxTokens);
    return { reply };
  }
}

function applyCors(res: HandlerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-stainless-sdk-version, x-stainless-os, x-stainless-lang, x-stainless-runtime, x-stainless-runtime-version, x-stainless-helper-method, x-stainless-package-version",
  );
}

export default async function handler(req: { method?: string; body?: unknown }, res: HandlerResponse) {
  applyCors(res);
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const result = await handleMuseDocent(req.body as MuseDocentRequest);
    return res.status(200).json(result);
  } catch (err: unknown) {
    console.error("[muse/docent] Vercel error:", err);
    const message = err instanceof Error ? err.message : "도슨트 응답 생성에 실패했습니다.";
    const status = message.includes("필요") || message.includes("설정") ? 400 : 500;
    return res.status(status).json({ error: message });
  }
}