import { getDateSeed } from "@/lib/dailyCache";
import { extractOriginalLanguage } from "@/utils/artSearchQuery";

export type ArtworkImageSource =
  | "google"
  | "wikimedia"
  | "wikipedia"
  | "artic"
  | "met"
  | "pollinations"
  | "ai_replica"
  | "dailyart";

export interface ArtworkImageInput {
  title: string;
  titleOriginal?: string;
  creator: string;
  creatorOriginal?: string;
  artworkType: string;
  era: string;
  description: string;
  aestheticTone: string;
  dailyArtImageUrl?: string;
}

export interface ResolvedArtworkImage {
  url: string;
  displayUrl: string;
  source: ArtworkImageSource;
}

function sanitizeForPrompt(text: string): string {
  return text.replace(/["'\\/]/g, "").trim();
}

export function buildFaithfulArtPrompt(art: ArtworkImageInput): string {
  const title = sanitizeForPrompt(
    art.titleOriginal || extractOriginalLanguage(art.title) || art.title,
  );
  const creator = sanitizeForPrompt(
    art.creatorOriginal || extractOriginalLanguage(art.creator) || art.creator,
  );
  const description = sanitizeForPrompt(art.description.slice(0, 220));
  const palette = sanitizeForPrompt(art.aestheticTone || "authentic period colors");

  return [
    `Faithful museum-quality reproduction of the famous masterpiece "${title}" by ${creator}.`,
    `${art.artworkType}, ${art.era} movement.`,
    "Preserve exact composition, subject matter, figures, perspective, brushwork and historical color palette of the original artwork.",
    description,
    `Color palette: ${palette}.`,
    "Fine art oil painting on canvas, neutral gallery lighting, photorealistic museum photograph.",
    "No fantasy elements, no sci-fi, no glowing effects, no modern reinterpretation, no text, no watermark.",
  ].join(" ");
}

export function buildPollinationsArtUrl(
  art: ArtworkImageInput,
  width = 1024, height = 768,
): string {
  const prompt = buildFaithfulArtPrompt(art);
  const seed = getDateSeed(`muse_art_${art.title}_${art.creator}`);
  const trimmed = prompt.slice(0, 1400);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(trimmed)}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;
}

export async function resolveArtworkImage(
  art: ArtworkImageInput,
  options?: { forcePollinations?: boolean },
): Promise<ResolvedArtworkImage> {
  const response = await fetch("/api/muse/artwork-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...art, ...options }),
  });

  const raw = await response.text();
  let data: { url?: string; displayUrl?: string; source?: ArtworkImageSource; error?: string } = {};
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(raw.trim().slice(0, 120) || "작품 이미지를 불러오지 못했습니다.");
  }

  if (!response.ok) {
    throw new Error(data.error || "작품 이미지를 불러오지 못했습니다.");
  }

  return {
    url: data.url || "",
    displayUrl: data.displayUrl || data.url || "",
    source: data.source || "pollinations",
  };
}