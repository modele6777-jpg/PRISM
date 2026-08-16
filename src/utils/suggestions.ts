export const SUGGESTIONS_SYSTEM_SUFFIX =
  "\n\nAt the end of your response, you MUST include exactly 3 smart suggestions in this precise format: [SUGGESTIONS: s1 | s2 | s3]. Use the pipe character (|) as the separator between suggestions. IMPORTANT: Each suggestion MUST be phrased as a question or response that the USER would ask/say next to you (e.g. '그 기운을 실천에 옮기려면 어떻게 해? | 조금 더 자세히 알려줘 | 오늘 운세 더 깊게 봐줘'). Absolutely NEVER include your own advice, guidance, or instructions in the suggestions! They must sound like the USER's voice.";

export function parseSuggestions(text: string): string[] {
  const match = text.match(/\[SUGGESTIONS:\s*([\s\S]*?)\]/i);
  if (!match?.[1]) return [];

  const raw = match[1].trim();
  if (!raw) return [];

  if (raw.includes("|")) {
    return raw
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
  }

  const lookaheadSplit = raw
    .split(/,\s*(?=[가-힣A-Za-z「'"])/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (lookaheadSplit.length >= 2 && lookaheadSplit.length <= 4) {
    return lookaheadSplit.slice(0, 4);
  }

  const commaSplit = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (commaSplit.length <= 4) return commaSplit;

  return commaSplit.slice(0, 3);
}

export function cleanChatDisplayText(text: string): string {
  return text
    .replace(/\[EMOTION:\s*[^\]]*\]/gi, "")
    .replace(/\[EMOTION:[\s\S]*$/i, "")
    .replace(/\[SUGGESTIONS:\s*[\s\S]*$/i, "")
    .replace(/\[SUGGESTIONS:\s*[\s\S]*?\]/gi, "")
    .replace(/\[SOUL_UPDATE:\s*[\s\S]*$/i, "")
    .replace(/\[SOUL_UPDATE:\s*[\s\S]*?\]/gi, "")
    .trim();
}