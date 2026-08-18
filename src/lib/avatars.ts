// Cartoon avatar characters, generated on the fly via DiceBear's free
// avatar API (https://www.dicebear.com) — no image assets to ship, no new
// npm dependency, just a deterministic seed -> image URL.
//
// DiceBear seeds are opaque hashes — the string itself doesn't predict
// what renders, so seeds below aren't "named" for their gender, they were
// picked by actually rendering a batch and eyeballing which ones read as
// clearly male- or female-presenting in the "avataaars" style (the one
// style, of the ones tried, with genuinely legible gendered features —
// hair, facial hair, etc. — rather than mostly-androgynous results).
// Renaming a seed string changes which character it points to, so these
// exact strings are load-bearing, not cosmetic.

export const AVATAR_STYLE = 'avataaars'

export const MALE_AVATAR_SEEDS = [
  'seed2',
  'seed3',
  'seed10',
  'seed14',
  'seed18',
  'seed21',
  'seed27',
  'seed29',
]

export const FEMALE_AVATAR_SEEDS = [
  'seed0',
  'seed1',
  'seed5',
  'seed7',
  'seed13',
  'seed16',
  'seed19',
  'seed23',
]

export function avatarUrl(style: string, seed: string): string {
  return `https://api.dicebear.com/9.x/${encodeURIComponent(style)}/svg?seed=${encodeURIComponent(seed)}`
}

export function avatarSeedsForGender(gender: 'male' | 'female'): string[] {
  return gender === 'male' ? MALE_AVATAR_SEEDS : FEMALE_AVATAR_SEEDS
}

/** Signup doesn't ask anyone to pick a character — one is assigned
 * automatically from their gender's curated set so there's no extra step
 * between choosing a gender and being signed in. */
export function randomAvatarSeedForGender(gender: 'male' | 'female'): string {
  const seeds = avatarSeedsForGender(gender)
  return seeds[Math.floor(Math.random() * seeds.length)]
}
