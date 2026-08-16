export function prepareNaturalSpeechText(text: string): string {
  if (!text) return "";
  // Removes markdown symbols, bracketed expressions, and trailing whitespaces for a natural sound
  return text
    .replace(/[*#_`~]/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\(.*?\)/g, "")
    .trim();
}
