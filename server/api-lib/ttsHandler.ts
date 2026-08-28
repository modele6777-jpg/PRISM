import { prepareNaturalSpeechText } from "../../src/utils/speechText";

const ttsServerCache = new Map<string, { base64: string; timestamp: number }>();

export interface TTSHandlerOptions {
  text: string;
  voice?: string;
  emotion?: string;
}

export interface TTSHandlerResult {
  audioContent: string;
  encoding: "mp3";
  sampleRate?: number;
}

export async function handleTTS(options: TTSHandlerOptions): Promise<TTSHandlerResult> {
  const { text, voice = "Kore", emotion } = options;
  if (!text) {
    throw new Error("Empty speech text");
  }

  const cleanText = prepareNaturalSpeechText(String(text || ""));
  if (!cleanText) {
    throw new Error("Empty speech text");
  }

  // All voices in Lucy Pro and PRISM app resolve to the warm, natural female voice (ko-KR-SunHiNeural / en-US-AriaNeural)
  const isMaleVoice = false;
  const resolvedVoiceKey = "female_sunhi";
  const cacheKey = `${resolvedVoiceKey}_${emotion || ""}_${cleanText}`;

  // 1. Check in-memory cache
  const cached = ttsServerCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 3600000) {
    return {
      audioContent: cached.base64,
      encoding: "mp3",
    };
  }

  const isKorean = /[가-힣]/.test(cleanText);

  // 2. Primary Engine: Edge Neural TTS with 2600ms fast race timeout
  try {
    const os = await import("os");
    const fs = await import("fs");
    const fsPromises = fs.promises;
    const pathMod = await import("path");
    const { EdgeTTS } = (await import("node-edge-tts")).default || (await import("node-edge-tts"));

    let voiceName = isMaleVoice ? "ko-KR-InJoonNeural" : "ko-KR-SunHiNeural";
    let lang = "ko-KR";
    let rate = "+0%";
    let pitch = "+0Hz";

    if (!isKorean) {
      lang = "en-US";
      voiceName = isMaleVoice ? "en-US-GuyNeural" : "en-US-AriaNeural";
    }

    if (emotion) {
      const emo = String(emotion).trim().toLowerCase();
      const slowHealingList = ["공감", "위로", "치유", "차분", "평온", "슬픔", "따뜻", "empathy", "comfort", "healing", "calm", "peace", "sadness", "sad", "warm"];
      const brightJoyList = ["기쁨", "응원", "설렘", "위트", "밝음", "재미", "신남", "joy", "cheer", "cheering", "excited", "witty", "happy", "fun", "bright"];
      const mysteryTarotList = ["신비", "진지", "경고", "몽환", "mystery", "serious", "warning", "dreamy", "mystic"];

      if (slowHealingList.some((item) => emo.includes(item))) {
        rate = "-5%";
        pitch = voiceName.includes("SunHi") ? "-1Hz" : "-1.5Hz";
      } else if (brightJoyList.some((item) => emo.includes(item))) {
        rate = "+2%";
        pitch = "+1Hz";
      } else if (mysteryTarotList.some((item) => emo.includes(item))) {
        rate = "-4%";
        pitch = "-1Hz";
      }
    }

    const tts = new EdgeTTS({
      voice: voiceName,
      lang,
      rate,
      pitch,
      outputFormat: "audio-24khz-96kbitrate-mono-mp3",
    });

    const tempPath = pathMod.join(os.tmpdir(), `tts-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`);

    await Promise.race([
      tts.ttsPromise(cleanText, tempPath),
      new Promise((_, reject) => setTimeout(() => reject(new Error("EdgeTTS timeout (8000ms)")), 8000)),
    ]);

    const finalBuffer = await fsPromises.readFile(tempPath);
    await fsPromises.unlink(tempPath).catch(() => undefined);

    if (finalBuffer && finalBuffer.length > 0) {
      const base64 = finalBuffer.toString("base64");
      if (ttsServerCache.size > 500) {
        const oldestKey = ttsServerCache.keys().next().value;
        if (oldestKey) ttsServerCache.delete(oldestKey);
      }
      ttsServerCache.set(cacheKey, { base64, timestamp: Date.now() });

      return {
        audioContent: base64,
        encoding: "mp3",
      };
    }
  } catch (edgeError: any) {
    console.warn("[TTS] EdgeTTS failed or timed out on Vercel/Node, falling back to Google TTS:", edgeError?.message || edgeError);
  }

  // 3. High-speed Direct Fallback: Google TTS (ultra-fast, 100% reliable on Vercel / serverless)
  try {
    const googleTTS = (await import("google-tts-api")).default || (await import("google-tts-api"));
    const results = await googleTTS.getAllAudioBase64(cleanText, {
      lang: isKorean ? "ko" : "en",
      slow: false,
      host: "https://translate.google.com",
      splitPunct: ",.?!;:\n",
    });

    const buffers = results.map((r: any) => Buffer.from(r.base64, "base64"));
    const combinedBuffer = Buffer.concat(buffers);
    const base64 = combinedBuffer.toString("base64");

    if (ttsServerCache.size > 500) {
      const oldestKey = ttsServerCache.keys().next().value;
      if (oldestKey) ttsServerCache.delete(oldestKey);
    }
    ttsServerCache.set(cacheKey, { base64, timestamp: Date.now() });

    return {
      audioContent: base64,
      encoding: "mp3",
    };
  } catch (googleError: any) {
    console.error("[TTS] Google TTS fallback failed:", googleError);
  }

  // 4. OpenAI TTS Fallback (if configured)
  if (process.env.OPENAI_API_KEY) {
    try {
      const openaiModule = await import("openai");
      const OpenAIClass = (openaiModule as any).default || openaiModule.OpenAI || openaiModule;
      const openai = new OpenAIClass({ apiKey: process.env.OPENAI_API_KEY });
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: isMaleVoice ? "onyx" : "nova",
        input: cleanText,
      });
      const buffer = Buffer.from(await mp3.arrayBuffer());
      const base64 = buffer.toString("base64");

      ttsServerCache.set(cacheKey, { base64, timestamp: Date.now() });
      return {
        audioContent: base64,
        encoding: "mp3",
      };
    } catch (openaiError: any) {
      console.error("[TTS] OpenAI TTS fallback failed:", openaiError);
    }
  }

  throw new Error("All TTS engines failed to generate audio.");
}
