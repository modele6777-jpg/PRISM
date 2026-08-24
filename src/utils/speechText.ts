export function prepareNaturalSpeechText(text: string): string {
  if (!text) return "";
  let clean = String(text);

  // 1. Remove URLs
  clean = clean.replace(/https?:\/\/\S+/gi, "");

  // 2. Remove system tags like [YOUTUBE:...], [EMOTION:...], [TOOL:...], [IMAGE:...]
  clean = clean.replace(/\[(?:YOUTUBE|EMOTION|TOOL|IMAGE|PROMPT|STAGE):.*?\]/gi, "");

  // 3. Remove all parenthetical and bracketed annotations along with their contents (both half-width & full-width)
  for (let i = 0; i < 3; i++) {
    clean = clean
      .replace(/\([^()]*\)/g, " ")
      .replace(/（[^（）]*）/g, " ")
      .replace(/\[[^\[\]]*\]/g, " ")
      .replace(/［[^［］]*］/g, " ")
      .replace(/\{[^{}]*\}/g, " ")
      .replace(/｛[^｛｝]*｝/g, " ")
      .replace(/【[^【】]*】/g, " ")
      .replace(/<[^<>]*>/g, " ");
  }

  // 4. Remove all emojis, pictographs, and symbols
  try {
    clean = clean.replace(/\p{Extended_Pictographic}/gu, "");
  } catch (_) {
    clean = clean.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, "");
  }

  // 5. Remove HTML entities
  clean = clean
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/&ldquo;|&rdquo;|&quot;|&apos;/gi, "")
    .replace(/&lt;|&gt;|&amp;/gi, " ");

  // 6. Remove markdown formatting and stray symbols
  clean = clean
    .replace(/[*#_~`>|\\]/g, " ")
    .replace(/[\[\](){}<>【】「」『』]/g, " ")
    .replace(/[-=]{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return clean;
}

