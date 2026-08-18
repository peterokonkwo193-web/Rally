// Pure PIN generation/validation logic. No Deno-only APIs here on purpose —
// this file is imported both by the create-session edge function (Deno)
// and directly by Vitest (Node) unit tests, so it has to run on both.

const REPEATED_DIGIT_PINS = new Set(
  Array.from({ length: 10 }, (_, digit) => String(digit).repeat(6)),
)

const SEQUENTIAL_PINS = new Set(['123456', '654321'])

export function isRejectedPin(pin: string): boolean {
  return REPEATED_DIGIT_PINS.has(pin) || SEQUENTIAL_PINS.has(pin)
}

export function generateCandidatePin(): string {
  const n = Math.floor(Math.random() * 1_000_000)
  return String(n).padStart(6, '0')
}

/** Generates PINs until one passes isRejectedPin. Guards against an
 * unbounded loop (impossible in practice — only 12 of 1,000,000 codes are
 * rejected — but a stray infinite loop in an edge function is worth never
 * allowing). */
export function generateValidPin(maxAttempts = 50): string {
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = generateCandidatePin()
    if (!isRejectedPin(candidate)) return candidate
  }
  throw new Error('Failed to generate a valid PIN candidate')
}
