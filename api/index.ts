import "dotenv/config";
import express from "express";

const app = express();

app.use(express.json({ limit: "50mb" }));

// CORS & OPTIONS Preflight Handler
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-stainless-sdk-version, x-stainless-os, x-stainless-lang, x-stainless-runtime, x-stainless-runtime-version, x-stainless-helper-method, x-stainless-package-version");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Vercel catch-all functions may deliver paths without the /api prefix.
app.use((req, _res, next) => {
  const [pathname, ...queryParts] = (req.url || "/").split("?");
  const query = queryParts.length ? `?${queryParts.join("?")}` : "";
  if (pathname && !pathname.startsWith("/api") && pathname !== "/health") {
    req.url = `/api${pathname.startsWith("/") ? pathname : `/${pathname}`}${query}`;
  }
  next();
});

// Chat completions proxy using Gemini API
import { GoogleGenAI } from "@google/genai";

app.post([/.*\/chat\/completions$/, "/api/openai/v1/chat/completions", "/openai/v1/chat/completions"], async (req, res) => {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || "";
  if (!geminiApiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const model = req.body.model || "gemini-3.7-flash";
    const messages = req.body.messages || [];
    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop()?.content || "";
    const systemPrompt = messages.filter((m: any) => m.role === "system").map((m: any) => m.content).join("\n");

    const response = await ai.models.generateContent({
      model: model,
      contents: lastUserMessage,
      config: systemPrompt ? { systemInstruction: systemPrompt } : undefined
    });

    const replyText = response.text || "";

    if (req.body.stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const chunk = {
        id: "chatcmpl-" + Date.now(),
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{ index: 0, delta: { content: replyText }, finish_reason: null }]
      };
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
      return;
    } else {
      return res.status(200).json({
        id: "chatcmpl-" + Date.now(),
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{ index: 0, message: { role: "assistant", content: replyText }, finish_reason: "stop" }]
      });
    }
  } catch (err: any) {
    console.error("Gemini completion proxy error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// EdgeTTS integration on Vercel (using /tmp directory for write operations)
app.post("/api/ai/tts", async (req, res) => {
  const { text, voice = "Kore", emotion } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Empty speech text" });
  }

  try {
    const { EdgeTTS } = await import("node-edge-tts");
    const cleanText = text.replace(/[*#_`~]/g, "").replace(/\[.*?\]/g, "").replace(/\(.*?\)/g, "").trim();
    
    let voiceName = "ko-KR-SunHiNeural";
    let lang = "ko-KR";
    let rate = "-3%";
    let pitch = "+0Hz";
    
    if (voice === "Kore") {
      voiceName = "ko-KR-SunHiNeural";
    } else if (voice === "Charon") {
      voiceName = "ko-KR-SeoHyeonNeural";
      rate = "-4%";
      pitch = "-1Hz";
    } else if (voice === "Fenrir") {
      voiceName = "ko-KR-BongJinNeural";
      rate = "-3%";
      pitch = "-1Hz";
    } else if (voice === "Zephyr") {
      voiceName = "ko-KR-HyunsuNeural";
      rate = "-2%";
      pitch = "+0Hz";
    } else if (voice === "Puck") {
      voiceName = "ko-KR-InJoonNeural";
      rate = "-5%";
      pitch = "+0Hz";
    } else if (voice === "Britney") {
      voiceName = "ko-KR-JiMinNeural";
      rate = "+2%";
      pitch = "+2Hz";
    } else if (voice === "Billie") {
      voiceName = "ko-KR-SunHiNeural";
      rate = "-7%";
      pitch = "-2Hz";
    } else if (voice === "Gaga") {
      voiceName = "ko-KR-SunHiNeural";
      rate = "+3%";
      pitch = "+1.5Hz";
    } else if (voice === "Michael") {
      voiceName = "ko-KR-HyunsuNeural";
      rate = "-2%";
      pitch = "+1Hz";
    } else {
      voiceName = "ko-KR-SunHiNeural";
    }

    if (emotion) {
      const emo = String(emotion).trim().toLowerCase();
      const slowHealingList = ["공감", "위로", "치유", "차분", "평온", "슬픔", "따뜻", "empathy", "comfort", "healing", "calm", "peace", "sadness", "sad", "warm"];
      const brightJoyList = ["기쁨", "응원", "설렘", "위트", "밝음", "재미", "신남", "joy", "cheer", "cheering", "excited", "witty", "happy", "fun", "bright"];
      const mysteryTarotList = ["신비", "진지", "경고", "몽환", "mystery", "serious", "warning", "dreamy", "mystic"];

      if (slowHealingList.some((item) => emo.includes(item))) {
        rate = "-7%";
        pitch = voiceName.includes("SunHi") ? "-1Hz" : "-1.5Hz";
      } else if (brightJoyList.some((item) => emo.includes(item))) {
        rate = "+2%";
        pitch = "+1.5Hz";
      } else if (mysteryTarotList.some((item) => emo.includes(item))) {
        rate = "-5%";
        pitch = "-1Hz";
      }
    }

    const os = await import("os");
    const fs = await import("fs");
    const pathMod = await import("path");
    const tempPath = pathMod.join(os.tmpdir(), `tts-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`);
    
    const tts = new EdgeTTS({
      voice: voiceName,
      lang,
      rate,
      pitch,
      outputFormat: "audio-24khz-96kbitrate-mono-mp3",
    });
    
    await tts.ttsPromise(cleanText, tempPath);
    const audioBuffer = await fs.promises.readFile(tempPath);
    await fs.promises.unlink(tempPath).catch(() => undefined);
    
    return res.status(200).json({
      audioContent: audioBuffer.toString("base64"),
      encoding: "mp3"
    });
  } catch (err: any) {
    console.error("Vercel TTS generation error:", err);
    return res.status(500).json({ error: err.message || "Failed to generate TTS" });
  }
});

// Image generation endpoint using free Pollinations AI on Vercel
app.post("/api/ai/image", async (req, res) => {
  const { prompt, aspectRatio = "1:1" } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Empty prompt" });
  }

  const dims = aspectRatio === "16:9"
    ? { width: 768, height: 432 }
    : aspectRatio === "9:16"
      ? { width: 432, height: 768 }
      : { width: 512, height: 512 };

  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${dims.width}&height=${dims.height}&seed=${Math.floor(Math.random() * 1000000)}&nologo=true&model=flux`;
  return res.status(200).json({ imageUrl: pollinationsUrl });
});

// Diary analysis endpoint on Vercel
app.post("/api/ai/analyze-entry", async (req, res) => {
  const { title = "", content = "", type = "" } = req.body;
  if (!content && !title) {
    return res.status(200).json({ keywords: [], emotions: [] });
  }

  const prompt = `기록의 유형: ${type}
기록의 제목: ${title}
기록의 내용:
${content}

위 내면의 기록을 섬세하게 메타 분석하여:
1. 기록의 핵심 주제와 생각, 관련 사물을 관통하는 대표 키워드 3~5개 (배열로 추출)
2. 글쓴이의 주된 마음 상태, 미묘한 어조, 에너지 흐름을 정확히 묘사하는 감정/심리 상태 태그 1~3개 (배열로 추출)

오직 다음 JSON 스키마 형식의 유효한 JSON 결과만 반환해 주세요:
{
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "emotions": ["감정태그1", "감정태그2"]
}`;

  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || "";

  if (geminiApiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const geminiRes = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const rawText = geminiRes.text;
      if (rawText) {
        const parsed = JSON.parse(rawText.trim());
        if (parsed && Array.isArray(parsed.keywords) && Array.isArray(parsed.emotions)) {
          return res.status(200).json(parsed);
        }
      }
    } catch (err) {
      console.warn("Gemini analysis failed on Vercel, falling back to heuristic offline analysis:", err);
    }
  }

  // Heuristic Offline Fallback
  const keywords: string[] = [];
  const emotions: string[] = [];
  const lowerContent = content.toLowerCase();

  const emotionDictionary = [
    { keys: ["기쁨", "행복", "감사", "사랑", "설렘", "즐거", "happy", "love", "joy"], tag: "평온/기쁨" },
    { keys: ["슬픔", "우울", "눈물", "외롭", "쓸쓸", "sad", "blue", "lonely"], tag: "내면의 슬픔" },
    { keys: ["불안", "걱정", "두려", "초조", "긴장", "scared", "anxious", "worry"], tag: "정서적 초조" },
    { keys: ["분노", "화가", "짜증", "억울", "미움", "angry", "irritated"], tag: "의식의 마찰" },
    { keys: ["지침", "피곤", "소진", "번아웃", "무기력", "tired", "exhausted"], tag: "에너지 소진" },
  ];

  for (const dict of emotionDictionary) {
    if (dict.keys.some(k => lowerContent.includes(k))) {
      emotions.push(dict.tag);
    }
  }
  if (emotions.length === 0) {
    emotions.push("미묘한 중립");
  }

  const words = (content as string).split(/\s+/).filter(w => w.length > 1 && !w.startsWith("#"));
  const uniqueWords = Array.from(new Set(words)) as string[];
  keywords.push(...uniqueWords.slice(0, 4));
  if (keywords.length === 0) {
    keywords.push("내면 기록", "일상");
  }

  return res.status(200).json({ keywords, emotions });
});

// 데일리 카드 전용 BGM 생성 (시드 기반 고유 WAV)
app.post("/api/ai/daily-bgm", async (req, res) => {
  try {
    const {
      focusPlaylist,
      frequency,
      cardName,
      symbol,
      dateKey,
      trackKey,
    } = req.body || {};

    if (!focusPlaylist || !dateKey || !trackKey) {
      return res.status(400).json({ error: "focusPlaylist, dateKey, trackKey are required" });
    }

    const { generateDailyBgmBuffer } = await import("../server/api-lib/generateDailyBgm");
    const { buffer, durationSec } = generateDailyBgmBuffer({
      focusPlaylist: String(focusPlaylist),
      frequency: frequency ? String(frequency) : undefined,
      cardName: cardName ? String(cardName) : undefined,
      symbol: symbol ? String(symbol) : undefined,
      dateKey: String(dateKey),
      trackKey: String(trackKey),
    });

    return res.status(200).json({
      audioContent: buffer.toString("base64"),
      encoding: "wav",
      trackKey: String(trackKey),
      durationSec,
    });
  } catch (err: unknown) {
    console.error("[daily-bgm] error:", err);
    const message = err instanceof Error ? err.message : "Daily BGM generation failed";
    return res.status(500).json({ error: message });
  }
});

// 오늘의 예술: 검증된 카탈로그 기반 + AI는 해석 문구만 개인화
app.post("/api/ai/recommend-art", async (req, res) => {
  try {
    const { buildDailyArtRecommendation } = await import("../server/api-lib/recommendArt");
    const result = await buildDailyArtRecommendation(req.body || {});
    return res.status(200).json(result);
  } catch (err: unknown) {
    console.error("[recommend-art] error:", err);
    const { buildVerifiedArtRecommendation } = await import("../server/api-lib/museArtCatalog");
    const dateKey = String(req.body?.dateKey || new Date().toLocaleDateString("sv"));
    return res.status(200).json(
      buildVerifiedArtRecommendation(dateKey, String(req.body?.currentMood || ""), req.body?.moodId),
    );
  }
});

app.get(["/api/health", "/health"], (_req, res) => res.json({ status: "ok" }));

export default app;
