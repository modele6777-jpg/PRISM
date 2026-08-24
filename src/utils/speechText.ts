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

  // 6. Natural pause and breathing gap insertion for titles, subtitles, bullet items, and section dividers
  // (a) Markdown headers: '# Title', '## Subtitle', '### Section' -> 'Title. ... \n\n'
  clean = clean.replace(/^#{1,6}\s*(.+)$/gm, (_m, title) => {
    let t = String(title || '')
      .replace(/[*#_~`>|\\]/g, " ")
      .trim();
    if (!t) return "";
    t = t.replace(/[.!?…,;:~]+$/, "");
    return `${t}. ... \n\n`;
  });

  // (b) Bold headings at start of line or sentence: '**제목**', '**1. 소제목:**' -> '제목. ... \n'
  clean = clean.replace(/(?:^|\n)\s*\*\*(.+?)\*\*\s*(?::|-)?\s*/gm, (_m, boldText) => {
    let b = String(boldText || '')
      .replace(/[*#_~`>|\\]/g, " ")
      .trim();
    if (!b) return "";
    b = b.replace(/[.!?…,;:~]+$/, "");
    return `\n${b}. ... \n`;
  });

  // (c) Section and title indicators (e.g. '소제목:', '핵심 원리:', '섹션 1:', '질문 1:') -> add natural breathing gap
  clean = clean.replace(/(?:^|\n)\s*([가-힣a-zA-Z0-9\s]{2,15})\s*:\s*/gm, (_m, label) => {
    const trimmed = label.trim();
    if (trimmed.length > 0 && trimmed.length <= 15) {
      return `\n${trimmed}. ... `;
    }
    return `\n${label}, `;
  });

  // (d) Inline section dividers like 'Ask · 원함' -> add natural breath commas
  clean = clean.replace(/([가-힣a-zA-Z0-9])\s*·\s*([가-힣a-zA-Z0-9])/g, "$1, $2");

  // 7. Structure paragraphs and lines with rhythmic pauses between Title, Subtitle, and Content
  const paragraphs = clean.split(/\r?\n\s*\r?\n+/);
  const formattedParagraphs: string[] = [];

  for (const para of paragraphs) {
    const lines = para.split(/\r?\n+/);
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

      // If line ends with pause marker '...' preserve it
      if (/\.{3,}$|…$/.test(line)) {
        line = line.replace(/\.{3,}$|…$/, ". ... ");
      } else if (!/[.!?…,;:~]$/.test(line)) {
        line += ".";
      }

      formattedLines.push(line);
    }

    if (formattedLines.length > 0) {
      formattedParagraphs.push(formattedLines.join(" "));
    }
  }

  // Join distinct paragraphs with breathing pause '. ... '
  let result = formattedParagraphs.join(" ... ");

  // 8. Clean up redundant punctuation artifacts (e.g. ",.", "..", " . ... . ... ")
  result = result
    .replace(/(?:\.\s*\.\s*\.\s*)+/g, "... ")
    .replace(/\s*,\s*,\s*/g, ", ")
    .replace(/,\s*\./g, ".")
    .replace(/\.\s*,/g, ".")
    .replace(/\.\s*\.\s*/g, ". ")
    .replace(/\.\s*\.\.\./g, ". ...")
    .replace(/(?:\.\s*\.\.\.\s*)+/g, ". ... ")
    .replace(/\s*([,.:;!?])\s*/g, "$1 ")
    .replace(/\s+/g, " ")
    .trim();

  return result;
}


