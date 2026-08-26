import type { Response } from "express";
import { applyCors } from "../../server/api-lib/cors";

export default async function handler(req: { method?: string; body?: unknown }, res: Response) {
  applyCors(res);
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = (req.body || {}) as Record<string, unknown>;
    const text = String(body.text || "");
    const voice = body.voice ? String(body.voice) : undefined;
    const emotion = body.emotion ? String(body.emotion) : undefined;

    if (!text.trim()) {
      return res.status(400).json({ error: "Empty speech text" });
    }

    const { handleTTS } = await import("../../server/api-lib/ttsHandler");
    const result = await handleTTS({ text, voice, emotion });
    return res.status(200).json(result);
  } catch (err: unknown) {
    console.error("[ai/tts] Vercel error:", err);
    const message = err instanceof Error ? err.message : "TTS generation failed";
    return res.status(500).json({ error: message });
  }
}
