export function prepareNaturalSpeechText(text: string): string {
  if (!text) return "";
  let clean = String(text);

  // 1. Remove URLs
  clean = clean.replace(/https?:\/\/\S+/gi, "");

  // 2. Remove system tags like [YOUTUBE:...], [EMOTION:...], [TOOL:...], [IMAGE:...]
  clean = clean.replace(/\[(?:YOUTUBE|EMOTION|TOOL|IMAGE|PROMPT|STAGE):.*?\]/gi, "");

  // 3. Parentheses & Brackets handling:
  // If bracket content contains Korean ([가-힣]), preserve the text with natural commas.
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
          return `, ${trimmed}, `;
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

  // 6. Natural pause insertion for titles, subtitles, bullet items, and section dividers
  // (a) Markdown headers: '# Title', '## Subtitle' -> 'Title. '
  clean = clean.replace(/^#{1,6}\s*(.+)$/gm, (_m, title) => {
    const t = String(title || '').trim();
    if (!t) return "";
    return /[.!?~]$/.test(t) ? `${t}\n` : `${t}.\n`;
  });

  // (b) Section dividers like 'Ask · 원함', '키워드: 내용' -> add natural breath commas
  clean = clean.replace(/([가-힣a-zA-Z0-9])\s*·\s*([가-힣a-zA-Z0-9])/g, "$1, $2");
  clean = clean.replace(/([가-힣a-zA-Z0-9]+)\s*:\s*([가-힣a-zA-Z0-9])/g, "$1, $2");

  // 7. Structure paragraphs and lines with rhythmic pauses between Title, Subtitle, and Content
  const lines = clean.split(/\r?\n+/);
  const formattedLines: string[] = [];

  for (const rawLine of lines) {
    let line = rawLine
      .replace(/[*#_~`>|\\]/g, " ")
      .replace(/[\[\](){}<>【】「」『』]/g, " ")
      .replace(/[-=]{2,}/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!line) continue;

    // Clean leading list bullets
    line = line.replace(/^[-*•]\s+/, "");

    // If the line/title/subtitle doesn't end with a punctuation mark, add a period to ensure a natural breath pause
    if (!/[.!?…,;:~]$/.test(line)) {
      line += ".";
    }

    formattedLines.push(line);
  }

  let result = formattedLines.join(" ");

  // 8. Clean up redundant punctuation artifacts (e.g. ",.", "..", " , ")
  result = result
    .replace(/\s*,\s*,\s*/g, ", ")
    .replace(/\s*\.\s*\.\s*/g, ". ")
    .replace(/,\s*\./g, ".")
    .replace(/\.\s*,/g, ".")
    .replace(/\s*([,.:;!?])\s*/g, "$1 ")
    .replace(/\s+/g, " ")
    .trim();

  return result;
}

