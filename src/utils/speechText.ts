export function prepareNaturalSpeechText(text: string): string {
  if (!text) return "";
  let clean = String(text);

  // 1. Remove URLs
  clean = clean.replace(/https?:\/\/\S+/gi, "");

  // 2. Remove system tags like [YOUTUBE:...], [EMOTION:...], [TOOL:...], [IMAGE:...]
  clean = clean.replace(/\[(?:YOUTUBE|EMOTION|TOOL|IMAGE|PROMPT|STAGE):.*?\]/gi, "");

  // 3. Parentheses & Brackets handling:
  // If bracket content contains Korean ([가-힣]), preserve the text.
  // If bracket content has NO Korean (e.g. (Synth), (100%), (Wishing Well)), skip it completely.
  const bracketRegexList = [
    /\(([^()]*)\)/g,
    /（([^（）]*)）/g,
    /\[([^\[\]]*)\]/g,
    /［([^［］]*)］/g,
    /\{([^{}]*)\}/g,
    /｛([^｛｝]*)｝/g,
    /【([^【】]*)】/g,
    /<([^<>]*)>/g,
  ];

  for (let pass = 0; pass < 3; pass++) {
    for (const regex of bracketRegexList) {
      clean = clean.replace(regex, (_match, inner) => {
        const trimmed = (inner || '').trim();
        if (/[가-힣]/.test(trimmed)) {
          return ` ${trimmed} `;
        }
        return " ";
      });
    }
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

