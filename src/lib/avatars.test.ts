import { describe, expect, it } from 'vitest'
import {
  avatarSeedsForGender,
  avatarUrl,
  FEMALE_AVATAR_SEEDS,
  MALE_AVATAR_SEEDS,
} from './avatars'

describe('avatar seed pools', () => {
  it('are both non-empty', () => {
    expect(MALE_AVATAR_SEEDS.length).toBeGreaterThan(0)
    expect(FEMALE_AVATAR_SEEDS.length).toBeGreaterThan(0)
  })

  it('have no overlapping seeds between genders', () => {
    const overlap = MALE_AVATAR_SEEDS.filter((seed) =>
      FEMALE_AVATAR_SEEDS.includes(seed),
    )
    expect(overlap).toEqual([])
  })

  it('contain only unique seeds within each pool', () => {
    expect(new Set(MALE_AVATAR_SEEDS).size).toBe(MALE_AVATAR_SEEDS.length)
    expect(new Set(FEMALE_AVATAR_SEEDS).size).toBe(FEMALE_AVATAR_SEEDS.length)
  })
})

describe('avatarSeedsForGender', () => {
  it('returns the male pool for male', () => {
    expect(avatarSeedsForGender('male')).toBe(MALE_AVATAR_SEEDS)
  })

  it('returns the female pool for female', () => {
    expect(avatarSeedsForGender('female')).toBe(FEMALE_AVATAR_SEEDS)
  })
})

describe('avatarUrl', () => {
  it('builds a DiceBear URL with the style and seed', () => {
    expect(avatarUrl('adventurer', 'GusRider')).toBe(
      'https://api.dicebear.com/9.x/adventurer/svg?seed=GusRider',
    )
  })

  it('URL-encodes seeds with special characters', () => {
    expect(avatarUrl('adventurer', 'a b&c')).toBe(
      'https://api.dicebear.com/9.x/adventurer/svg?seed=a%20b%26c',
    )
  })
})
