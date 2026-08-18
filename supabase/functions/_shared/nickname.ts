// Pure nickname validation. Same dual Deno/Vitest-importable pattern as
// pin.ts — see that file's header comment.

export const NICKNAME_MAX_LENGTH = 20

// Deliberately small and generic — a first line of defence for a classroom
// tool (SPEC.md §12), not a complete moderation system. Swap for a
// maintained wordlist/service if this ever needs to be exhaustive.
const BLOCKED_SUBSTRINGS = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'dick',
  'piss',
  'cunt',
  'whore',
  'slut',
  'nigger',
  'faggot',
  'retard',
]

export class InvalidNicknameError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidNicknameError'
  }
}

export function normalizeNickname(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ')
  if (trimmed.length === 0) {
    throw new InvalidNicknameError('Nickname cannot be empty.')
  }
  if (trimmed.length > NICKNAME_MAX_LENGTH) {
    throw new InvalidNicknameError(
      `Nickname must be ${NICKNAME_MAX_LENGTH} characters or fewer.`,
    )
  }
  return trimmed
}

export function containsProfanity(nickname: string): boolean {
  const lowered = nickname.toLowerCase()
  return BLOCKED_SUBSTRINGS.some((word) => lowered.includes(word))
}
