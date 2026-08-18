import { describe, expect, it } from 'vitest'
import {
  containsProfanity,
  InvalidNicknameError,
  normalizeNickname,
} from './nickname'

describe('normalizeNickname', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeNickname('  Alex  ')).toBe('Alex')
  })

  it('collapses internal whitespace runs', () => {
    expect(normalizeNickname('Alex   Smith')).toBe('Alex Smith')
  })

  it('rejects an empty (or whitespace-only) nickname', () => {
    expect(() => normalizeNickname('   ')).toThrow(InvalidNicknameError)
  })

  it('rejects a nickname over the length cap', () => {
    expect(() => normalizeNickname('x'.repeat(21))).toThrow(
      InvalidNicknameError,
    )
  })

  it('accepts a nickname at exactly the length cap', () => {
    expect(normalizeNickname('x'.repeat(20))).toBe('x'.repeat(20))
  })
})

describe('containsProfanity', () => {
  it('flags a blocked word regardless of case', () => {
    expect(containsProfanity('BadWordShit')).toBe(true)
  })

  it('passes an ordinary nickname', () => {
    expect(containsProfanity('QuizWhiz42')).toBe(false)
  })
})
