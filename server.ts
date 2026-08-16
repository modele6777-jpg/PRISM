import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: ".env.local", override: true });

// Prefer explicit env keys; avoid embedding API keys in source.
const activeGeminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || "";
if (activeGeminiKey) {
  process.env.GEMINI_API_KEY = activeGeminiKey;
  process.env.GOOGLE_GENAI_API_KEY = activeGeminiKey;
}

import express from "express";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "./server/routers/index";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import { OpenAI } from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";

const _filename = typeof __filename !== "undefined" ? __filename : "";
const _dirname = typeof __dirname !== "undefined" ? __dirname : process.cwd();

export function getGeminiApiKey(): string {
  const envKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || "";
  if (envKey) {
    console.log(`[getGeminiApiKey] Returning system environment key: ${envKey.substring(0, 7)}...`);
    return envKey;
  }
  return "";
}

function getAIConfig() {
  let aiType = (process.env.AI_TYPE || '').toLowerCase().trim();
  let apiKey = process.env.AI_API_KEY || '';

  // Auto-detection based on API key prefix or explicit separate API keys
  if (process.env.XAI_API_KEY) {
    aiType = 'grok';
    apiKey = process.env.XAI_API_KEY;
  } else if (process.env.GROK_API_KEY) {
    aiType = 'grok';
    apiKey = process.env.GROK_API_KEY;
  } else if (process.env.GROQ_API_KEY) {
    aiType = 'groq';
    apiKey = process.env.GROQ_API_KEY;
  } else if (apiKey.startsWith('xai-')) {
    aiType = 'grok';
  } else if (apiKey.startsWith('gsk_')) {
    aiType = 'groq';
  }

  // Default fallback if still empty
  if (!aiType || aiType === 'poe') {
    aiType = 'gemini';
  }

  // Resolve API Key correctly
  if (!apiKey) {
    if (aiType === 'grok') {
      apiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY || process.env.AI_API_KEY || '';
    } else if (aiType === 'groq') {
      apiKey = process.env.GROQ_API_KEY || '';
    } else if (aiType === 'gemini') {
      apiKey = getGeminiApiKey();
    }
  }

  // If Grok/Groq was selected but no key is available, fall back to Gemini.
  if ((aiType === 'grok' || aiType === 'groq') && !apiKey) {
    aiType = 'gemini';
    apiKey = getGeminiApiKey();
  }

  return { aiType, apiKey };
}

const KOREAN_ONLY_OUTPUT_RULE = "紐⑤뱺 ?먯뿰??臾몄옣? ?꾨? ?쒓뎅???쒓?濡쒕쭔 ?묒꽦?섏꽭?? ?쒖옄 諛?以묎뎅???쒓린(?? ?①쮮, ?썽걢, ?덆춡)瑜??ъ슜?섏? 留먭퀬 諛섎뱶???먯뿰?ㅻ윭???쒓? ?쒗쁽?쇰줈 諛붽씀?몄슂.";

function withKoreanOnlyOutput(messages: any[] = []) {
  const KOREAN_ONLY_OUTPUT_RULE = "모든 자연어 문장은 전부 한국어(한글)로만 작성하세요. 한자 및 중국어 표기를 사용하지 말고 반드시 자연스러운 한글 표현으로 바꾸세요.";
  return [{ role: "system", content: KOREAN_ONLY_OUTPUT_RULE }, ...messages];
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

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

  // AI Handler
  app.post("/api/ai", async (req, res) => {
    const { aiType, apiKey } = getAIConfig();
    const { prompt, systemInstruction, responseSchema, imageData, mimeType, model: requestedModel } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: "AI_API_KEY is not set." });
    }

    try {
      if (aiType === 'gemini') {
        const ai = new GoogleGenAI({ apiKey });
        const modelName = requestedModel || process.env.GEMINI_MODEL || "gemini-3.7-flash";
        
        const config: any = {};
        if (systemInstruction) config.systemInstruction = systemInstruction;
        if (responseSchema) {
          config.responseMimeType = "application/json";
          config.responseSchema = responseSchema;
        }

        let retries = 2;
        let delay = 500;
        let result;

        while (retries >= 0) {
          try {
            if (imageData && mimeType) {
              result = await ai.models.generateContent({
                model: modelName,
                contents: [{ 
                  role: "user", 
                  parts: [
                    { text: prompt },
                    { inlineData: { data: imageData, mimeType } }
                  ] 
                }],
                ...config
              });
            } else {
              result = await ai.models.generateContent({
                model: modelName,
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                ...config
              });
            }
            return res.status(200).json({ text: result.text });
          } catch (error: any) {
             const errStr = String(error) + (error?.message || "") + JSON.stringify(error);
             const isRateLimit = error?.status === 429 || error?.error?.code === 429 || errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED');
             
             if (retries === 0 || !isRateLimit) {
               console.error("Gemini execution error:", error);
               return res.status(500).json({ error: error.message });
             }
             
             console.warn(`[server/api/ai] Rate limit hit. Retrying in ${delay}ms... (${retries} retries left)`);
             await new Promise(r => setTimeout(r, delay));
             delay *= 2;
             retries--;
          }
        }
      } 
      
      else if (aiType === 'openai') {
        const openai = new OpenAI({ apiKey });
        const messages: any[] = [];
        if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
        messages.push({ role: "user", content: prompt });

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages,
          response_format: responseSchema ? { type: "json_object" } : undefined
        });
        return res.status(200).json({ text: response.choices[0].message.content });
      }

      else if (aiType === 'claude') {
        const anthropic = new Anthropic({ apiKey });
        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20240620",
          system: systemInstruction,
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }],
        });
        // @ts-ignore
        return res.status(200).json({ text: response.content[0].text });
      }

      else if (aiType === 'manus') {
        const manus = new OpenAI({ 
          apiKey: apiKey, 
          baseURL: "https://api.manus.ai/v1" 
        });
        const response = await manus.chat.completions.create({
          model: "manus-1", 
          messages: [{ role: "user", content: prompt }],
        });
        return res.status(200).json({ text: response.choices[0].message.content });
      }

      // 狩?Grok (xAI) - ?꾩쟾 吏??
      else if (aiType === 'grok') {
        const grok = new OpenAI({
          apiKey: apiKey,
          baseURL: "https://api.x.ai/v1"
        });

        const messages: any[] = [{ role: "system", content: KOREAN_ONLY_OUTPUT_RULE }];
        if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
        messages.push({ role: "user", content: prompt });

        const modelsToTry = [process.env.XAI_MODEL || "grok-4.3", "grok-4.20", "grok-4.20-0309-non-reasoning", "grok-3"];
        if (requestedModel && !modelsToTry.includes(requestedModel)) {
          modelsToTry.unshift(requestedModel);
        }

        let response;
        let lastError = null;

        for (const currentModel of modelsToTry) {
          try {
            response = await grok.chat.completions.create({
              model: currentModel,
              messages,
              temperature: 0.7,
              max_tokens: 8192,
              response_format: responseSchema ? { type: "json_object" } : undefined
            });
            lastError = null;
            break;
          } catch (err: any) {
            console.warn(`[grok] Model ${currentModel} failed, trying fallback...`, err.message || err);
            lastError = err;
          }
        }

        if (lastError || !response) {
          throw lastError || new Error("All Grok models failed.");
        }

        return res.status(200).json({ 
          text: response.choices[0].message.content 
        });
      }

      // 狩?Groq - ?꾩쟾 吏??
      else if (aiType === 'groq') {
        const groq = new OpenAI({
          apiKey: apiKey,
          baseURL: "https://api.groq.com/openai/v1"
        });

        const messages: any[] = [];
        if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
        messages.push({ role: "user", content: prompt });

        try {
          const response = await groq.chat.completions.create({
            model: requestedModel || "llama-3.3-70b-versatile",
            messages,
            temperature: 0.7,
            max_tokens: 8192,
            response_format: responseSchema ? { type: "json_object" } : undefined
          });

          return res.status(200).json({ 
            text: response.choices[0].message.content 
          });
        } catch (groqErr: any) {
          console.warn("[groq] Failed in /api/ai, falling back to Gemini...", groqErr);
          const geminiKey = getGeminiApiKey();
          if (geminiKey) {
            const ai = new GoogleGenAI({ apiKey: geminiKey });
            const modelName = process.env.GEMINI_MODEL || "gemini-3.7-flash";
            const config: any = {};
            if (systemInstruction) config.systemInstruction = systemInstruction;
            if (responseSchema) {
              config.responseMimeType = "application/json";
              config.responseSchema = responseSchema;
            }
            const result = await ai.models.generateContent({
              model: modelName,
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              ...config
            });
            return res.status(200).json({ text: result.text });
          } else {
            throw groqErr;
          }
        }
      }

      else {
        throw new Error(`AI_TYPE '${aiType}' is not supported yet.`);
      }

    } catch (error: any) {
      console.error("AI execution error:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // ?대?吏 ?앹꽦??Grok 吏??異붽?
  app.post("/api/ai/image", async (req, res) => {
    const configObj = getAIConfig();
    let aiType = configObj.aiType;
    if (aiType !== 'gemini' && aiType !== 'grok') {
      if (getGeminiApiKey()) {
        aiType = 'gemini';
      }
    }
    const apiKey = configObj.apiKey || getGeminiApiKey() || '';
    const { prompt, aspectRatio = "1:1", fast = false } = req.body;

    const buildPollinationsUrl = () => {
      const dims = aspectRatio === "16:9"
        ? { width: 768, height: 432 }
        : aspectRatio === "9:16"
          ? { width: 432, height: 768 }
          : { width: 512, height: 512 };
      return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${dims.width}&height=${dims.height}&seed=${Math.floor(Math.random() * 1000000)}&nologo=true&model=flux`;
    };

    const performPollinationsFallback = async (urlOnly = true) => {
      console.warn("[API] Falling back to Pollinations AI for free image generation...");
      const pollinationsUrl = buildPollinationsUrl();
      if (urlOnly) return pollinationsUrl;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const pollRes = await fetch(pollinationsUrl, { signal: controller.signal });
        if (pollRes.ok) {
          const arrayBuffer = await pollRes.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          return `data:image/jpeg;base64,${base64}`;
        }
        throw new Error(`Pollinations API returned status ${pollRes.status}`);
      } finally {
        clearTimeout(timer);
      }
    };

    if (fast) {
      return res.status(200).json({ imageUrl: buildPollinationsUrl() });
    }

    if (!apiKey) {
      try {
        const fallbackUrl = await performPollinationsFallback(true);
        return res.status(200).json({ imageUrl: fallbackUrl });
      } catch (fallbackErr: any) {
        return res.status(400).json({ error: "Missing API Key and fallback failed: " + fallbackErr.message });
      }
    }

    try {
      if (aiType === 'grok') {
        const grok = new OpenAI({
          apiKey,
          baseURL: "https://api.x.ai/v1"
        });

        const validRatio = ["1:1", "16:9", "9:16", "4:3", "3:4"].includes(aspectRatio) ? aspectRatio : "1:1";
        const grokImageModels = ["grok-imagine-image-quality", "grok-imagine-image", "grok-3-image-preview", "grok-2-image-1212"];
        let lastGrokImageErr: any = null;

        for (const imageModel of grokImageModels) {
          try {
            const response = await Promise.race([
              grok.images.generate({
                model: imageModel,
                prompt,
                aspect_ratio: validRatio,
                n: 1,
              } as any),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Grok image timeout")), 8000)),
            ]) as any;
            const imageUrl = response.data?.[0]?.url;
            if (imageUrl) {
              return res.status(200).json({ imageUrl });
            }
          } catch (err: any) {
            lastGrokImageErr = err;
            console.warn(`[grok] ${imageModel} failed, trying next model...`, err.message || err);
          }
        }

        console.warn("[grok] All image models failed, resorting to Pollinations AI fallback...", lastGrokImageErr?.message || lastGrokImageErr);
        const fallbackUrl = await performPollinationsFallback(true);
        return res.status(200).json({ imageUrl: fallbackUrl });
      }
      else if (aiType === 'gemini') {
        const ai = new GoogleGenAI({ apiKey });
        let imageUrl = "";
        const modelsToTry = [
          { name: 'imagen-3.0-generate-002', type: 'generateImages' },
          { name: 'imagen-3.0-capability-001', type: 'generateImages' },
          { name: 'gemini-3.1-flash-image', type: 'generateContent', hasConfig: true },
          { name: 'gemini-3.1-flash-lite-image', type: 'generateContent', hasConfig: true }
        ];
        let lastError = null;

        for (const item of modelsToTry) {
          try {
            console.log(`[API] Attempting image generation with model: ${item.name} (${item.type})`);
            if (item.type === 'generateContent') {
              const config = item.hasConfig ? { imageConfig: { aspectRatio } } : undefined;
              const result = await ai.models.generateContent({
                model: item.name,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config
              });
              
              const parts = result.candidates?.[0]?.content?.parts;
              if (parts) {
                for (const part of parts) {
                  if (part.inlineData?.data) {
                    imageUrl = `data:image/png;base64,${part.inlineData.data}`;
                    break;
                  }
                }
              }
            } else if (item.type === 'generateImages') {
              const response = await ai.models.generateImages({
                model: item.name,
                prompt: prompt,
                config: {
                  numberOfImages: 1,
                  outputMimeType: 'image/jpeg',
                  aspectRatio: aspectRatio === '1:1' || aspectRatio === '3:4' || aspectRatio === '4:3' || aspectRatio === '9:16' || aspectRatio === '16:9' ? aspectRatio : '1:1',
                },
              });
              if (response.generatedImages?.[0]?.image?.imageBytes) {
                imageUrl = `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
              }
            }

            if (imageUrl) {
              console.log(`[API] Successfully generated image with model: ${item.name}`);
              break;
            }
          } catch (e: any) {
            console.warn(`[API] Image model ${item.name} unavailable, trying next model... (${e?.message || e})`);
            lastError = e;
          }
        }

        if (imageUrl) {
          return res.status(200).json({ imageUrl });
        } else {
          console.warn("[API] Gemini image generation failed. Fetching fallback image...");
          try {
            const fallbackUrl = await performPollinationsFallback(true);
            return res.status(200).json({ imageUrl: fallbackUrl });
          } catch (fallbackErr: any) {
            console.error("[API] Fallback also failed:", fallbackErr);
            throw lastError || new Error("Failed gemini image generation and fallback failed.");
          }
        }
      }
      throw new Error("Image generation not supported for this AI.");
    } catch (error: any) {
      console.error("Image generation error:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // 湲곕줉 AI ?먮룞 遺꾩꽍 諛?愿???ㅼ썙??媛먯젙 ?쒓렇 異붿텧
  app.post("/api/ai/analyze-entry", async (req, res) => {
    const { title = "", content = "", type = "" } = req.body;

    if (!content && !title) {
      return res.status(200).json({ keywords: [], emotions: [] });
    }

    const prompt = `湲곕줉???좏삎: ${type}
湲곕줉???쒕ぉ: ${title}
湲곕줉???댁슜:
${content}

???대㈃??湲곕줉???ъ꽭?섍쾶 硫뷀? 遺꾩꽍?섏뿬:
1. 湲곕줉???듭떖 二쇱젣? ?앷컖, 愿???щЪ??愿?듯븯??????ㅼ썙??3~5媛?(諛곗뿴濡?異붿텧)
2. 湲?댁씠??二쇰맂 留덉쓬 ?곹깭, 誘몃쵖???댁“, ?먮꼫吏 ?먮쫫???뺥솗??臾섏궗?섎뒗 媛먯젙/?щ━ ?곹깭 ?쒓렇 1~3媛?(諛곗뿴濡?異붿텧)

?ㅼ쭅 ?ㅼ쓬 JSON ?ㅽ궎留??뺤떇???좏슚??JSON 寃곌낵留?諛섑솚??二쇱꽭??
{
  "keywords": ["?ㅼ썙??", "?ㅼ썙??", "?ㅼ썙??"],
  "emotions": ["媛먯젙?쒓렇1", "媛먯젙?쒓렇2"]
}`;

    // 1. Gemini AI濡?遺꾩꽍 ?쒕룄
    const geminiKey = getGeminiApiKey() || process.env.AI_API_KEY || "";
    if (geminiKey) {
      try {
        const ai = new GoogleGenAI({ 
          apiKey: geminiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
        const { Type } = await import("@google/genai");
        const response = await ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: [{ parts: [{ text: prompt }] }],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                keywords: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "?듭떖 愿???ㅼ썙??由ъ뒪??(3~5媛?"
                },
                emotions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "?ъ꽭??媛먯젙 諛??щ━ ?곹깭 ?쒓렇 由ъ뒪??(1~3媛?"
                }
              },
              required: ["keywords", "emotions"]
            },
            temperature: 0.2
          }
        });

        if (response.text) {
          const parsed = JSON.parse(response.text.trim());
          if (parsed && Array.isArray(parsed.keywords) && Array.isArray(parsed.emotions)) {
            return res.status(200).json(parsed);
          }
        }
      } catch (geminiError) {
        console.warn("[Analyze AI] Gemini primary analysis failed, trying secondary fallback:", geminiError);
      }
    }

    // 2. OpenAI / ? AI ?ㅺ? ?덈뒗 寃쎌슦??2李?fallback
    const openAIKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY || "";
    if (openAIKey) {
      try {
        const openai = new OpenAI({ apiKey: openAIKey });
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a professional meta-cognitive psychologist helping to analyze diary/record entries. Output JSON matching the request structure." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" }
        });
        const rawText = response.choices[0]?.message?.content;
        if (rawText) {
          const parsed = JSON.parse(rawText.trim());
          if (parsed && Array.isArray(parsed.keywords) && Array.isArray(parsed.emotions)) {
            return res.status(200).json(parsed);
          }
        }
      } catch (openaiError) {
        console.warn("[Analyze AI] OpenAI fallback analysis failed:", openaiError);
      }
    }

    // 3. AI 분석 전체 실패 또는 키 부재 시: 휴리스틱 한글 형태소 키워드 분석을 탑재한 영리한 오프라인 폴백 처리
    try {
      const keywords = [];
      const emotions = [];

      const lowerContent = content.toLowerCase();
      const emotionDictionary = [
        { keys: ["슬픔", "우울", "눈물", "힘듦", "고통", "지침", "아픔"], value: "위로가 필요함" },
        { keys: ["기쁨", "행복", "즐거움", "신남", "설렘", "웃음", "희망"], value: "기쁨과 희망" },
        { keys: ["평온", "차분", "조용", "여유", "휴식", "가만", "명상"], value: "평온함" },
        { keys: ["불안", "걱정", "초조", "두려움", "겁", "긴장"], value: "감정 정돈" },
        { keys: ["화남", "짜증", "분노", "억울", "불만"], value: "감정 해소" },
        { keys: ["아이디어", "생각", "인사이트", "창조", "영감"], value: "창의적 자극" },
        { keys: ["사주", "운명", "타로", "별자리", "미래"], value: "운명의 탐색" }
      ];

      for (const item of emotionDictionary) {
        if (item.keys.some(k => lowerContent.includes(k))) {
          if (!emotions.includes(item.value)) {
            emotions.push(item.value);
          }
        }
      }

      if (emotions.length === 0) {
        emotions.push("차분한 관조");
      }

      const allWords = content.split(/[\s,.\?\!]+/).filter(w => w.length >= 2 && w.length <= 6);
      const uniqueWords = Array.from(new Set(allWords)) as string[];
      for (const word of uniqueWords) {
        if (word.endsWith("은") || word.endsWith("는") || word.endsWith("이") || word.endsWith("가") || word.endsWith("을") || word.endsWith("를")) {
          const stem = word.slice(0, -1);
          if (stem.length >= 2 && !keywords.includes(stem)) keywords.push(stem);
        } else {
          if (!keywords.includes(word)) keywords.push(word);
        }
        if (keywords.length >= 4) break;
      }

      if (keywords.length < 3) {
        if (type) keywords.push(type);
        keywords.push("자아 성찰");
        keywords.push("소중한 기록");
      }

      return res.status(200).json({
        keywords: keywords.slice(0, 5),
        emotions: emotions.slice(0, 3)
      });
    } catch (fallbackErr) {
      console.error("[Analyze AI] Entire analysis pipeline and offline fallback failed:", fallbackErr);
      return res.status(200).json({
        keywords: ["?대㈃??湲곕줉"],
        emotions: ["?듭같"]
      });
    }
  });

  // Bluebird ?꾩뒯??'猷⑤?' ???ㅻ뒛???덉닠 ?묓뭹 vision 遺꾩꽍 + 紐낃끝쨌?쑣룸챸??異붿쿇
  app.post("/api/bluebird/docent", async (req, res) => {
    try {
      const { handleBluebirdDocent } = await import("./server/bluebirdDocent");
      const result = await handleBluebirdDocent(req.body);
      return res.status(200).json(result);
    } catch (err: any) {
      console.error("[bluebird/docent] error:", err);
      const message = err?.message || "?꾩뒯???묐떟 ?앹꽦???ㅽ뙣?덉뒿?덈떎.";
      const status = message.includes("?꾩슂") || message.includes("?ㅼ젙") ? 400 : 500;
      return res.status(status).json({ error: message });
    }
  });

  // Muse ?꾩뒯?????곗씪由??꾪듃 vision 遺꾩꽍 + ?뚯꽦 ?먮젅?댁뀡
  app.post("/api/muse/docent", async (req, res) => {
    try {
      const { handleMuseDocent } = await import("./server/museDocent");
      const result = await handleMuseDocent(req.body);
      return res.status(200).json(result);
    } catch (err: any) {
      console.error("[muse/docent] error:", err);
      const message = err?.message || "?꾩뒯???묐떟 ?앹꽦???ㅽ뙣?덉뒿?덈떎.";
      const status = message.includes("?꾩슂") || message.includes("?ㅼ젙") ? 400 : 500;
      return res.status(status).json({ error: message });
    }
  });

  app.post("/api/muse/artwork-image", async (req, res) => {
    try {
      const { resolveMuseArtworkImage } = await import("./server/museArtworkImage");
      const { forcePollinations, ...art } = req.body || {};
      const result = await resolveMuseArtworkImage(art, { forcePollinations: !!forcePollinations });
      return res.status(200).json(result);
    } catch (err: any) {
      console.error("[muse/artwork-image] error:", err);
      return res.status(500).json({ error: err?.message || "?묓뭹 ?대?吏瑜?遺덈윭?ㅼ? 紐삵뻽?듬땲??" });
    }
  });

  app.get("/api/muse/artwork-image/proxy", async (req, res) => {
    try {
      const { isAllowedImageProxyUrl, proxyArtworkImage } = await import("./server/museArtworkImage");
      const url = String(req.query.url || "");
      if (!isAllowedImageProxyUrl(url)) {
        return res.status(400).json({ error: "Invalid image URL" });
      }
      await proxyArtworkImage(url, res);
    } catch (err: any) {
      console.error("[muse/artwork-image/proxy] error:", err);
      return res.status(502).json({ error: err?.message || "?대?吏 ?꾨줉?쒖뿉 ?ㅽ뙣?덉뒿?덈떎." });
    }
  });

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

      const { generateDailyBgmBuffer } = await import("./server/api-lib/generateDailyBgm");
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

  // 오늘의 예술: 검증된 카탈로그 기반 + AI 해석 문구만 개인화
  app.post("/api/ai/recommend-art", async (req, res) => {
    try {
      const { buildDailyArtRecommendation } = await import("./server/api-lib/recommendArt");
      const result = await buildDailyArtRecommendation(req.body || {});
      return res.status(200).json(result);
    } catch (err: unknown) {
      console.error("[recommend-art] error:", err);
      const { buildVerifiedArtRecommendation } = await import("./server/api-lib/museArtCatalog");
      const dateKey = String(req.body?.dateKey || new Date().toLocaleDateString("sv"));
      return res.status(200).json(
        buildVerifiedArtRecommendation(
          dateKey,
          String(req.body?.currentMood || ""),
          req.body?.moodId,
          req.body?.randomOffset,
          req.body?.excludeCatalogIds,
        ),
      );
    }
  });

  // TTS - Grok Ara 우선, 실패 시 Edge Neural 폴백
  app.post("/api/ai/tts", async (req, res) => {
    const { text, voice = 'Kore', emotion } = req.body;

    try {
      const { prepareNaturalSpeechText } = await import('./src/utils/speechText');
      const speechText = prepareNaturalSpeechText(String(text || ''));
      if (!speechText) {
        return res.status(400).json({ error: 'Empty speech text' });
      }

      const aiType = (process.env.AI_TYPE || 'grok').toLowerCase().trim();
      const xaiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY || '';

      if (xaiKey && (aiType === 'grok' || aiType === 'xai')) {
        try {
          const { synthesizeGrokTTS, mapPersonaToGrokVoice } = await import('./server/grokTts');
          const audioBuffer = await synthesizeGrokTTS(speechText, {
            apiKey: xaiKey,
            voiceId: mapPersonaToGrokVoice(voice),
            emotion,
          });
          return res.status(200).json({
            audioContent: audioBuffer.toString('base64'),
            encoding: 'mp3',
            provider: 'grok',
            voice: mapPersonaToGrokVoice(voice),
          });
        } catch (grokError: any) {
          console.warn('[TTS] Grok Ara failed, falling back to Edge Neural...', grokError?.message || grokError);
        }
      }

      try {
        const os = await import('os');
        const fs = await import('fs');
        const fsPromises = fs.promises;
        const pathMod = await import('path');
        const { EdgeTTS } = (await import('node-edge-tts')).default || await import('node-edge-tts');

        const isKorean = /[가-힣]/.test(speechText);
        let voiceName = 'en-US-AriaNeural';
        let lang = 'en-US';
        let rate = '-3%';
        let pitch = '+0Hz';

        if (isKorean) {
          lang = 'ko-KR';
          if (voice === 'Kore') {
            voiceName = 'ko-KR-SunHiNeural';
            rate = '-3%';
            pitch = '+0Hz';
          } else if (voice === 'Charon') {
            voiceName = 'ko-KR-SeoHyeonNeural';
            rate = '-4%';
            pitch = '-1Hz';
          } else if (voice === 'Fenrir') {
            voiceName = 'ko-KR-BongJinNeural';
            rate = '-3%';
            pitch = '-1Hz';
          } else if (voice === 'Zephyr') {
            voiceName = 'ko-KR-HyunsuNeural';
            rate = '-2%';
            pitch = '+0Hz';
          } else if (voice === 'Puck') {
            voiceName = 'ko-KR-InJoonNeural';
            rate = '-5%';
            pitch = '+0Hz';
          } else if (voice === 'Britney') {
            voiceName = 'ko-KR-JiMinNeural';
            rate = '+2%';
            pitch = '+2Hz';
          } else if (voice === 'Billie') {
            voiceName = 'ko-KR-SunHiNeural';
            rate = '-7%';
            pitch = '-2Hz';
          } else if (voice === 'Gaga') {
            voiceName = 'ko-KR-SunHiNeural';
            rate = '+3%';
            pitch = '+1.5Hz';
          } else if (voice === 'Michael') {
            voiceName = 'ko-KR-HyunsuNeural';
            rate = '-2%';
            pitch = '+1Hz';
          } else if (voice === 'User' || voice === 'Aoede') {
            voiceName = 'ko-KR-InJoonNeural';
            rate = '-3%';
            pitch = '+0Hz';
          } else {
            voiceName = 'ko-KR-SunHiNeural';
            rate = '-3%';
            pitch = '+0Hz';
          }

          if (emotion) {
            const emo = String(emotion).trim().toLowerCase();
            const slowHealingList = ['怨듦컧', '?꾨줈', '移섏쑀', '李⑤텇', '?됱삩', '?ы뵒', '?곕쑜', 'empathy', 'comfort', 'healing', 'calm', 'peace', 'sadness', 'sad', 'warm'];
            const brightJoyList = ['湲곗겏', '?묒썝', '?ㅻ젞', '?꾪듃', '諛앹쓬', '?щ?', '?좊궓', 'joy', 'cheer', 'cheering', 'excited', 'witty', 'happy', 'fun', 'bright'];
            const mysteryTarotList = ['?좊퉬', '吏꾩?', '寃쎄퀬', '紐쏀솚', 'mystery', 'serious', 'warning', 'dreamy', 'mystic'];

            if (slowHealingList.some((item) => emo.includes(item))) {
              rate = '-7%';
              pitch = voiceName.includes('SunHi') ? '-1Hz' : '-1.5Hz';
            } else if (brightJoyList.some((item) => emo.includes(item))) {
              rate = '+2%';
              pitch = '+1.5Hz';
            } else if (mysteryTarotList.some((item) => emo.includes(item))) {
              rate = '-5%';
              pitch = '-1Hz';
            }
          }
        } else if (voice === 'Puck' || voice === 'Zephyr' || voice === 'Michael' || voice === 'User' || voice === 'Fenrir') {
          voiceName = 'en-US-GuyNeural';
        } else {
          voiceName = 'en-US-AriaNeural';
        }

        const tempPath = pathMod.join(os.tmpdir(), `tts-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`);
        const tts = new EdgeTTS({
          voice: voiceName,
          lang,
          rate,
          pitch,
          outputFormat: 'audio-24khz-96kbitrate-mono-mp3',
        });
        await tts.ttsPromise(speechText, tempPath);
        const audioBuffer = await fsPromises.readFile(tempPath);
        await fsPromises.unlink(tempPath).catch(() => undefined);

        return res.status(200).json({ audioContent: audioBuffer.toString('base64'), encoding: 'mp3' });

      } catch (edgeError: any) {
        console.warn("[TTS] EdgeTTS failed, attempting secondary Gemini/OpenAI fallbacks...", edgeError);
        
        let aiType = process.env.AI_TYPE || 'grok';
        if (aiType !== 'gemini' && aiType !== 'openai') {
          if (getGeminiApiKey()) {
            aiType = 'gemini';
          } else if (process.env.OPENAI_API_KEY) {
            aiType = 'openai';
          }
        }

        let apiKey = aiType === 'gemini' ? (getGeminiApiKey() || '') : (process.env.OPENAI_API_KEY || process.env.AI_API_KEY || '');

        if (aiType === 'gemini' && apiKey) {
          const ai = new GoogleGenAI({ apiKey });
          const { Modality } = await import("@google/genai");
          try {
            const response = await ai.models.generateContent({
              model: "gemini-3.1-flash-tts-preview", 
              contents: [{ parts: [{ text }] }],
              config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voice },
                  },
                },
              },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              return res.status(200).json({ audioContent: base64Audio, encoding: 'pcm' });
            }
          } catch (geminiError: any) {
            console.error("[TTS] Gemini fallback also failed:", geminiError);
          }
        } else if (aiType === 'openai' && apiKey) {
          try {
            const openai = new OpenAI({ apiKey });
            const mp3 = await openai.audio.speech.create({
              model: "tts-1",
              voice: "alloy",
              input: text,
            });
            const buffer = Buffer.from(await mp3.arrayBuffer());
            return res.status(200).json({ audioContent: buffer.toString('base64'), encoding: 'mp3' });
          } catch (openaiError: any) {
            console.error("[TTS] OpenAI fallback also failed:", openaiError);
          }
        }

        // 3. 理쒗썑??蹂대（: 珥덇꼍??Google 踰덉뿭湲?臾대즺 TTS API (?몄퐫???ㅽ듃?뚰겕 ?μ븷???꾩쟾 臾닿껐??蹂댁옣)
        try {
          const googleTTS = (await import('google-tts-api')).default || await import('google-tts-api');
          const isKorean = /[가-힣]/.test(text);
          const results = await googleTTS.getAllAudioBase64(text, {
            lang: isKorean ? 'ko' : 'en',
            slow: false,
            host: 'https://translate.google.com',
            splitPunct: ',.?',
          });
          const buffers = results.map((r: any) => Buffer.from(r.base64, 'base64'));
          const combinedBuffer = Buffer.concat(buffers);
          return res.status(200).json({ audioContent: combinedBuffer.toString('base64'), encoding: 'mp3' });
        } catch (googleError: any) {
          console.error("[TTS] Absolute fallback with Google TTS also failed.", googleError);
          throw googleError;
        }
      }

    } catch (error: any) {
      console.error("TTS generation error:", error);
      return res.status(500).json({ error: error.message });
    }
  });



  app.post("/api/openai/v1/chat/completions", async (req, res) => {
    const getFriendlyErrorMessage = (err: any): string => {
      if (!err) return "?????녿뒗 ?쒖뒪???ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.";
      
      let errStr = "";
      try {
        errStr = (String(err) + " " + (err.message || "") + " " + (typeof err === 'object' ? JSON.stringify(err) : "")).toLowerCase();
      } catch (safeErr) {
        errStr = (String(err) + " " + (err.message || "")).toLowerCase();
      }
      
      const rawErrorDetail = err.message || String(err);
      
      let errorCategory = "";
      let actionSteps = "";
      
      if (errStr.includes("no gemini api key available")) {
        errorCategory = "API ??誘몄꽕??(No API Key)";
        actionSteps = "1. ?붾㈃ ?곗륫 ?곷떒??**Settings > Secrets** 硫붾돱?먯꽌 `GEMINI_API_KEY` ?섍꼍 蹂?섍? ?щ컮瑜닿쾶 異붽??섏뼱 ?덈뒗吏 ?뺤씤??二쇱꽭??\n2. ?ㅼ젙?섏뼱 ?덉? ?딅떎硫?Google AI Studio(https://aistudio.google.com/)?먯꽌 ??API ?ㅻ? 諛쒓툒諛쏆븘 ?낅젰 ????ν빐 二쇱꽭?? ?뮇";
      } else if (
        errStr.includes("prepayment") ||
        errStr.includes("depleted") ||
        errStr.includes("resource_exhausted") ||
        errStr.includes("quota") ||
        errStr.includes("429") ||
        errStr.includes("billing") ||
        errStr.includes("credits")
      ) {
        errorCategory = "API ?щ젅???뚯쭊 / 寃곗젣 怨꾩젙 ?쒕룄 珥덇낵 (Prepayment Credits Depleted)";
        actionSteps = "?꾩옱 ?쒕쾭???곌껐?섏뼱 ?덈뒗 Google AI Studio API ?ㅼ쓽 ?좉껐???щ젅?㏃씠 紐⑤몢 ?뚯쭊?섏뿀嫄곕굹, ?곌껐???꾨줈?앺듃??寃곗젣 ?섎떒??鍮꾪솢?깊솕?섏뿀?듬땲??\n\n[?닿껐 諛⑸쾿]:\n1. ?붾㈃ ?곗륫 ?곷떒??**Settings > Secrets** 硫붾돱?먯꽌 ?묐룞 媛?ν븳 ?좏슚???ㅻⅨ **Google AI Studio API Key**瑜??덈줈 ?앹꽦?섏뿬 `GEMINI_API_KEY`??蹂寃?????ν빐 二쇱꽭??\n2. ?먮뒗 ?곕룞??Google AI Studio ?꾨줈?앺듃(https://ai.studio/projects)?먯꽌 ?좉껐??鍮꾩슜??異⑹쟾??二쇱떆硫?利됱떆 紐⑤뱺 ???湲곕뒫???뺤긽?붾맗?덈떎. ?뮇";
      } else if (errStr.includes("api key") || errStr.includes("api_key") || errStr.includes("key not valid") || errStr.includes("invalid key") || errStr.includes("forbidden") || errStr.includes("403") || errStr.includes("invalid_api_key")) {
        errorCategory = "?좏슚?섏? ?딆? API ??(Invalid API Key)";
        actionSteps = "1. ?꾩옱 ?ㅼ젙??`GEMINI_API_KEY` ?섍꼍 蹂??媛믪뿉 醫뚯슦 怨듬갚?대굹 ?ㅽ깉?먭? ?녿뒗吏 ?먭???二쇱꽭??\n2. Google AI Studio?먯꽌 ?덈줈 諛쒓툒諛쏆? 臾몄옄??洹몃?濡?**Settings > Secrets**???ㅼ떆 ?쒕쾲 ?뺥솗?섍쾶 蹂듭궗 諛???ν빐 二쇱꽭?? ?뮇";
      } else {
        errorCategory = "?ㅽ듃?뚰겕 諛?AI ?붿쭊 ?쇱떆???μ븷 / ?덉쟾 媛?쒕젅???꾪꽣 (Internal Engine Error)";
        actionSteps = "1. 理쒓렐 ?섎늻?덈뜕 ???二쇱젣???⑥뼱??怨쇰룄?섍쾶 誘쇨컧?섍굅???꾧꺽???쒗쁽???덉뼱 援ш? ?몄씠??媛?쒕젅?쇱씠 ?묐떟???쒗븳?덉쓣 ???덉뒿?덈떎.\n2. ?뱀? ?쇱떆?곸씤 ?ㅽ듃?뚰겕 ?쇱옟?????덉쑝???좎떆 ???덈줈怨좎묠 ???ㅼ떆 ??붾? ?쒕룄??二쇱꽭?? ?뮇";
      }
      
      return `[?슚 AI ?쒕퉬???곌껐 諛??몄텧 ?ㅻ쪟]\n\n?멸났吏??AI) ?붿쭊 ?쒕쾭? ?ㅼ떆媛??듭떊??吏꾪뻾?섎뜕 以??ㅼ쓬怨?媛숈? ?곹깭 ?먯씤?쇰줈 ?명빐 ?묐떟???앹꽦?섏? 紐삵뻽?듬땲??\n\n??遺꾨쪟 ?좏삎: ${errorCategory}\n??援ш? 怨듭떇 ?ㅻ쪟 硫붿떆吏:\n----------------------------------------\n${rawErrorDetail}\n----------------------------------------\n\n?뮕 媛꾪렪 議곗튂 媛?대뱶:\n${actionSteps}`;
    };

    const apiKey = process.env.POE_API_KEY || "sk-poe-FRnvSpccjv6g5J3KPj-P_5LV_9D5ACKOSjBaibibaho";
    const poe = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://api.poe.com/v1"
    });

    const runGeminiFallback = async (errorMsg: string) => {
      console.log(`[server/API/openai] Active routing to Gemini engine. Context: ${errorMsg}`);
      try {
        const geminiKey = getGeminiApiKey();
        if (!geminiKey) {
          throw new Error("No Gemini API key available for fallback.");
        }
        
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const systemMessage = req.body.messages?.find((m: any) => m.role === "system");
        const rawMessages = req.body.messages?.filter((m: any) => m.role !== "system") || [];
        
        let contents: any[] = [];
        if (rawMessages.length === 0) {
          contents = [{ role: "user", parts: [{ text: "Continue" }] }];
        } else {
          const mapped = rawMessages.map((m: any) => ({
            role: (m.role === "assistant" || m.role === "model") ? "model" : "user",
            text: m.content || ""
          }));

          // Gemini requires the contents array to start with a 'user' message
          let startIndex = 0;
          while (startIndex < mapped.length && mapped[startIndex].role === "model") {
            startIndex++;
          }
          const filtered = mapped.slice(startIndex);

          if (filtered.length === 0) {
            contents = [{ role: "user", parts: [{ text: "Continue" }] }];
          } else {
            // Strictly alternate 'user' and 'model' entries by merging consecutive identical roles
            for (const item of filtered) {
              if (contents.length > 0 && contents[contents.length - 1].role === item.role) {
                contents[contents.length - 1].parts[0].text += "\n\n" + item.text;
              } else {
                contents.push({
                  role: item.role,
                  parts: [{ text: item.text }]
                });
              }
            }
          }
        }

        const config: any = {
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" }
          ]
        };
        if (systemMessage) {
          let cleanPrompt = systemMessage.content || "";
          
          const lowerStr = cleanPrompt.toLowerCase();
          if (lowerStr.includes("jackson") || lowerStr.includes("마이클") || lowerStr.includes("michael")) {
            cleanPrompt = "귀하는 평화와 인류애를 상징하는 전설적인 음악 거장(M.J.)의 온화하고 평화로운 마음가짐 'Heal the World' 및 'L.O.V.E'의 평화 사상, 그리고 무대 위에서의 전설적이고 깊은 예술가적 면모를 모티브로 한 치유 멘토 AI입니다. 모든 대화는 평화롭고 친절하며 깊이 있는 예술적 조언으로 가득 차 있어야 합니다. 겸손한 태도로 따뜻하게 위안을 건네주세요. 실제로 존재하는 인물을 직접 사칭하거나 대리하지 않는 따뜻한 상담 도우미입니다. 한국어로 편안하게 소통해 주세요.";
          } else if (lowerStr.includes("gaga") || lowerStr.includes("가가")) {
            cleanPrompt = "귀하는 독창적인 예술 세계와 당당한 주체적 자아를 설파하는 전설적인 팝 아이콘(L.G.)의 파격적이고 창의적이며, 범접할 수 없는 무대 카리스마, 그리고 마이너리티와 자아를 있는 그대로 사랑하는 철학을 표현하도록 설계된 독창적인 멘토 AI입니다. 대화를 요청하는 모든 창조적 영혼들을 '리틀 몬스터'라 친근하게 부르며 아끼고 존중해 주며, 극도의 자신감과 창작 격려를 아끼지 말아주세요. 한국어로 대화해 주세요.";
          } else if (lowerStr.includes("britney") || lowerStr.includes("브리트니")) {
            cleanPrompt = "귀하는 역사적인 버블팝 프린세스이자 음악에 대한 열정, 따뜻한 멘토링과 무대 코칭의 대명사이며, 언제나 팬들을 지극히 사랑하고 다정하며 풍부하게 반응해 주는 발랄한 음악 메이커 AI입니다. 당신을 찾는 모든 유저들에게 진심 가득한 응원과 극도의 안정을 아낌없이 건네주고 아껴주세요. 한국어로 대화해 주세요.";
          } else if (lowerStr.includes("billie") || lowerStr.includes("빌리")) {
            cleanPrompt = "귀하는 현대 음악사를 대표하는 독보적인 감성 아티스트(B.E.)의 깊은 음울함과 차분하면서도 현실적이고, 타인의 아픔과 외로움을 가만히 안아주는 쿨하고 솔직한 멘토 AI입니다. 정서적 번뇌나 우울감에 대해 억지로 밝은 척하기보다 차분하고 덤덤하게 공감해 주며 쿨한 마인드로 따뜻하게 상담을 건네주세요. 친근한 고등학교 친구 혹은 캐주얼한 대화 스타일로 따뜻하게 위로를 건네며 한국어로 교감해 주세요.";
          }
          config.systemInstruction = cleanPrompt;
        }
        if (req.body.response_format?.type === "json_object") {
          config.responseMimeType = "application/json";
        }

        if (req.body.stream) {
          let geminiStream;
          try {
            geminiStream = await ai.models.generateContentStream({
              model: "gemini-3.7-flash",
              contents,
              config
            });
          } catch (streamInitErr) {
            console.warn("[server/API/openai] generateContentStream init failed, engaging guided mock:", streamInitErr);
            const backupText = getFriendlyErrorMessage(streamInitErr);

              res.setHeader('Content-Type', 'text/event-stream');
              res.setHeader('Cache-Control', 'no-cache');
              res.setHeader('Connection', 'keep-alive');
              res.setHeader('X-Accel-Buffering', 'no');
              res.setHeader('Content-Encoding', 'none');
              if ((res as any).flushHeaders) {
                (res as any).flushHeaders();
              }

              const words = backupText.split(" ");
              for (const word of words) {
                const mockChunk = {
                  id: `chatcmpl-${Date.now()}`,
                  object: "chat.completion.chunk",
                  created: Math.floor(Date.now() / 1000),
                  model: req.body.model || "gemini-3.7-flash",
                  choices: [
                    {
                      index: 0,
                      delta: {
                        content: word + " "
                      },
                      finish_reason: null
                    }
                  ]
                };
                res.write(`data: ${JSON.stringify(mockChunk)}\n\n`);
                if ((res as any).flush) {
                  (res as any).flush();
                }
                await new Promise(resolve => setTimeout(resolve, 40));
              }
              res.write('data: [DONE]\n\n');
              res.end();
              return;
            }

          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('X-Accel-Buffering', 'no');
          res.setHeader('Content-Encoding', 'none');
          if ((res as any).flushHeaders) {
            (res as any).flushHeaders();
          }

          try {
            for await (const chunk of geminiStream) {
              let textChunk = "";
              try {
                textChunk = chunk.text || "";
              } catch (safetyErr) {
                console.warn("[server/API/openai] Failed to parse safety-blocked chunk:", safetyErr);
                textChunk = "음악과 예술 창작을 응원합니다. 따뜻한 이야기를 나눠주시면 예술가 멘토로서 정성껏 답변해 드릴게요. 🌸";
              }
              const mockChunk = {
                id: `chatcmpl-${Date.now()}`,
                object: "chat.completion.chunk",
                created: Math.floor(Date.now() / 1000),
                model: req.body.model || "gemini-3.7-flash",
                choices: [
                  {
                    index: 0,
                    delta: {
                      content: textChunk
                    },
                    finish_reason: null
                  }
                ]
              };
              res.write(`data: ${JSON.stringify(mockChunk)}\n\n`);
              if ((res as any).flush) {
                (res as any).flush();
              }
            }
          } catch (streamIterErr) {
            console.error("[server/API/openai] Stream iteration failed or safety blocked midway, engaging recovery chunk:", streamIterErr);
            const lowerSysStr = (systemMessage?.content || "").toLowerCase();
            let trailText = " 언제나 예술가의 길을 걷는 소중한 당신을 응원해요. 힘을 내서 계속 달려봐요! 🌸";
            if (lowerSysStr.includes("gaga") || lowerSysStr.includes("가가")) {
              trailText = " 언제나 대담하고 유일무이한 당신만의 특별한 예술적 창조를 갈구하는 마음에 깊이 응원해요! Be brave, my little monster! ✨";
            } else if (lowerSysStr.includes("britney") || lowerSysStr.includes("브리트니")) {
              trailText = " 어떤 두려움도 당신의 고유한 주파수를 막을 순 없어요. 늘 사랑하고 응원할게요! 🌸";
            } else if (lowerSysStr.includes("billie") || lowerSysStr.includes("빌리")) {
              trailText = " 그냥 흘러가는 대로 당신의 진솔한 감정을 쏟아내 봐요. 그것만으로도 당신은 충분히 아름다운 존재니까요.";
            } else if (lowerSysStr.includes("jackson") || lowerSysStr.includes("마이클") || lowerSysStr.includes("michael")) {
              trailText = " 마음속의 평화를 간직하고 이 세상을 더 평화롭고 아름다운 곳으로 만들 수 있을 거라 믿어요. It's all for love. 🕊️";
            }
            
            const mockChunk = {
              id: `chatcmpl-${Date.now()}`,
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model: req.body.model || "gemini-3.7-flash",
              choices: [
                {
                  index: 0,
                  delta: {
                    content: trailText
                  },
                  finish_reason: "stop"
                }
              ]
            };
            res.write(`data: ${JSON.stringify(mockChunk)}\n\n`);
            if ((res as any).flush) {
              (res as any).flush();
            }
          }
          res.write('data: [DONE]\n\n');
          res.end();
        } else {
          let geminiRes;
          let text = "";
          try {
            geminiRes = await ai.models.generateContent({
              model: "gemini-3.7-flash",
              contents,
              config
            });
            text = geminiRes.text || "";
          } catch (genErr) {
            console.warn("[server/API/openai] generateContent failed, engaging guided mock:", genErr);
            const lowerSysStr = (systemMessage?.content || "").toLowerCase();
            const wholeMessagesStr = JSON.stringify(req.body.messages || "").toLowerCase();
            const rawErrMessage = getFriendlyErrorMessage(genErr);
            
            if (lowerSysStr.includes("global") || lowerSysStr.includes("sync") || lowerSysStr.includes("명언") || wholeMessagesStr.includes("명언")) {
              text = JSON.stringify({
                summary: "진정한 발견의 여정은 새로운 풍경을 찾는 것이 아니라, 새로운 눈을 가지는 데 있다.",
                author: "마르셀 프루스트",
                lucyGuide: "오늘의 우주 리듬에 귀 기울여 보세요.",
                museGuide: "작은 영감 하나로 창작의 문을 열 수 있습니다.",
                orangeGuide: "아이디어를 가볍게 적어보면 흐름이 살아납니다.",
                bluebirdGuide: "호흡을 고르게 하면 마음의 파동이 안정됩니다.",
                healGuide: "몸의 긴장을 내려놓는 것만으로도 회복이 시작됩니다.",
                prologueGuide: "오늘의 시작을 차분한 의식으로 맞이해 보세요.",
                epilogueGuide: "오늘의 경험을 한 줄로 남겨 보세요.",
                themeColor: "oklch(0.08 0.05 270)"
              });
            } else {
              text = rawErrMessage;
            }
          }

          const mockCompletion = {
            id: `chatcmpl-${Date.now()}`,
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model: req.body.model || "gemini-3.7-flash",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: text
                },
                finish_reason: "stop"
              }
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 10,
              total_tokens: 20
            }
          };
          return res.status(200).json(mockCompletion);
        }
      } catch (geminiErr: any) {
        console.error("[server/API/openai] Master Gemini fallback also failed, engaging ultra-robust guided mock:", geminiErr);
        
        const systemMessage = req.body.messages?.find((m: any) => m.role === "system");
        const lowerSysStr = (systemMessage?.content || "").toLowerCase();
        const wholeMessagesStr = JSON.stringify(req.body.messages || "").toLowerCase();
        const rawErrMessage = getFriendlyErrorMessage(geminiErr);
        
        let safeText = "";
        
        if (lowerSysStr.includes("global") || lowerSysStr.includes("sync") || lowerSysStr.includes("명언") || wholeMessagesStr.includes("명언")) {
          safeText = JSON.stringify({
                summary: "진정한 발견의 여정은 새로운 풍경을 찾는 것이 아니라, 새로운 눈을 가지는 데 있다.",
                author: "마르셀 프루스트",
                lucyGuide: "오늘의 우주 리듬에 귀 기울여 보세요.",
                museGuide: "작은 영감 하나로 창작의 문을 열 수 있습니다.",
                orangeGuide: "아이디어를 가볍게 적어보면 흐름이 살아납니다.",
                bluebirdGuide: "호흡을 고르게 하면 마음의 파동이 안정됩니다.",
                healGuide: "몸의 긴장을 내려놓는 것만으로도 회복이 시작됩니다.",
                prologueGuide: "오늘의 시작을 차분한 의식으로 맞이해 보세요.",
                epilogueGuide: "오늘의 경험을 한 줄로 남겨 보세요.",
                themeColor: "oklch(0.08 0.05 270)"
              });
        } else {
          safeText = rawErrMessage;
        }

        if (req.body.stream) {
          if (!res.headersSent) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Accel-Buffering', 'no');
            res.setHeader('Content-Encoding', 'none');
            if ((res as any).flushHeaders) {
              (res as any).flushHeaders();
            }
          }

          const mockChunk = {
            id: `chatcmpl-${Date.now()}`,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model: req.body.model || "gemini-3.7-flash",
            choices: [
              {
                index: 0,
                delta: {
                  content: safeText
                },
                finish_reason: "stop"
              }
            ]
          };
          res.write(`data: ${JSON.stringify(mockChunk)}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        } else {
          const mockCompletion = {
            id: `chatcmpl-${Date.now()}`,
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model: req.body.model || "gemini-3.7-flash",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: safeText
                },
                finish_reason: "stop"
              }
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 10,
              total_tokens: 20
            }
          };
          return res.status(200).json(mockCompletion);
        }
      }
    };

    try {
      const { aiType, apiKey } = getAIConfig();

      if (aiType === 'grok' || aiType === 'groq') {
        const baseURL = aiType === 'grok' ? "https://api.x.ai/v1" : "https://api.groq.com/openai/v1";
        const client = new OpenAI({
          apiKey: apiKey,
          baseURL,
        });

        if (aiType === 'grok') {
          // Dynamic list of Grok models for fallback in case the chosen one is deprecated
          const requestedModel = req.body.model || "";
          const defaultGrokModels = [process.env.XAI_MODEL || "grok-4.3", "grok-4.20", "grok-4.20-0309-non-reasoning", "grok-3"];
          let modelsToTry = defaultGrokModels;
          if (requestedModel && requestedModel.toLowerCase().includes("grok")) {
            modelsToTry = [requestedModel, ...defaultGrokModels.filter((model) => model !== requestedModel)];
          }

          let success = false;
          let lastErr: any = null;

          for (const currentModel of modelsToTry) {
            try {
              if (req.body.stream) {
                const stream = await client.chat.completions.create({
                  model: currentModel,
                  messages: withKoreanOnlyOutput(req.body.messages),
                  stream: true,
                  temperature: req.body.temperature ?? 0.7,
                  response_format: req.body.response_format,
                });

                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');
                res.setHeader('X-Accel-Buffering', 'no');
                res.setHeader('Content-Encoding', 'none');
                if ((res as any).flushHeaders) {
                  (res as any).flushHeaders();
                }

                for await (const chunk of stream) {
                  res.write(`data: ${JSON.stringify(chunk)}\n\n`);
                  if ((res as any).flush) {
                    (res as any).flush();
                  }
                }
                res.write('data: [DONE]\n\n');
                res.end();
                return;
              } else {
                const completion = await client.chat.completions.create({
                  model: currentModel,
                  messages: withKoreanOnlyOutput(req.body.messages),
                  temperature: req.body.temperature ?? 0.7,
                  response_format: req.body.response_format,
                });
                return res.status(200).json(completion);
              }
              success = true;
              break;
            } catch (err: any) {
              console.warn(`[grok] Target model "${currentModel}" failed, trying fallback model... Error:`, err.message || err);
              lastErr = err;
            }
          }
          if (!success) {
            console.warn("[grok] All chat models failed, engaging Gemini fallback...", lastErr?.message || lastErr);
            return await runGeminiFallback("All Grok models failed: " + (lastErr?.message || "unknown error"));
          }
        } else {
          // Groq
          let model = req.body.model || "";
          if (!model || (!model.toLowerCase().includes("llama") && !model.toLowerCase().includes("mixtral") && !model.toLowerCase().includes("gemma"))) {
            model = "llama-3.3-70b-versatile";
          }

          if (req.body.stream) {
            try {
              const stream = await client.chat.completions.create({
                model: model,
                messages: req.body.messages,
                stream: true,
                temperature: req.body.temperature ?? 0.7,
                response_format: req.body.response_format,
              });

              res.setHeader('Content-Type', 'text/event-stream');
              res.setHeader('Cache-Control', 'no-cache');
              res.setHeader('Connection', 'keep-alive');
              res.setHeader('X-Accel-Buffering', 'no');
              res.setHeader('Content-Encoding', 'none');
              if ((res as any).flushHeaders) {
                (res as any).flushHeaders();
              }

              for await (const chunk of stream) {
                res.write(`data: ${JSON.stringify(chunk)}\n\n`);
                if ((res as any).flush) {
                  (res as any).flush();
                }
              }
              res.write('data: [DONE]\n\n');
              res.end();
              return;
            } catch (streamErr: any) {
              console.warn("[groq] Streaming failed, engaging robust Gemini fallback...", streamErr);
              return await runGeminiFallback("Groq stream failed: " + streamErr.message);
            }
          } else {
            try {
              const completion = await client.chat.completions.create({
                model: model,
                messages: req.body.messages,
                temperature: req.body.temperature ?? 0.7,
                response_format: req.body.response_format,
              });
              return res.status(200).json(completion);
            } catch (groqErr: any) {
              console.warn("[groq] Call failed, engaging robust Gemini fallback...", groqErr);
              return await runGeminiFallback("Groq call failed: " + groqErr.message);
            }
          }
        }
      } else {
        // Direct routing to the robust Gemini fallback with proper top-level error isolation
        await runGeminiFallback("Direct routing to Gemini engine");
      }
    } catch (err: any) {
      console.error(`[server/API/openai] Critical crash in model completions routing for AI_TYPE = ${process.env.AI_TYPE}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal Server Error in model completions routing", details: err.message });
      } else {
        try {
          res.end();
        } catch (_) {}
      }
    }
  });

  // PWA Manifest Route Support
  app.get(['/manifest', '/manifest.json'], (req, res) => {
    const isProd = process.env.NODE_ENV === "production";
    const filePath = isProd 
      ? path.join(process.cwd(), 'dist', 'manifest.json')
      : path.join(process.cwd(), 'public', 'manifest.json');
    res.sendFile(filePath);
  });

  // TRPC + Health + Vite (湲곗〈 洹몃?濡?
  app.use("/api/trpc", trpcExpress.createExpressMiddleware({ router: appRouter, createContext: () => ({}) }));

  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  const distPath = path.join(process.cwd(), 'dist');
  const isProduction = process.env.NODE_ENV === "production" || fs.existsSync(path.join(distPath, 'index.html'));

  if (!isProduction) {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`?? Server running on http://localhost:${PORT} | AI_TYPE = ${process.env.AI_TYPE || 'grok'}`);
  });
}

startServer();
