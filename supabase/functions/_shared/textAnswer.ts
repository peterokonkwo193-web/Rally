// Pure text-answer matching for type_answer questions — dual Deno/Vitest
// -importable like pin.ts/nickname.ts/scoring.ts. Deliberately forgiving:
// trims, lowercases, and collapses internal whitespace so "  Paris",
// "paris", and "Paris  " all match "Paris" — exact-string matching would
// punish normal typing variance that has nothing to do with knowing the
// answer.

export function normalizeAnswerText(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function answerTextMatches(submitted: string, accepted: string): boolean {
  return normalizeAnswerText(submitted) === normalizeAnswerText(accepted)
}
