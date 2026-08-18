import { describe, expect, it } from 'vitest'
import { generateCandidatePin, generateValidPin, isRejectedPin } from './pin'

describe('isRejectedPin', () => {
  it('rejects 000000', () => {
    expect(isRejectedPin('000000')).toBe(true)
  })

  it('rejects every repeated-digit code', () => {
    for (let digit = 0; digit <= 9; digit++) {
      expect(isRejectedPin(String(digit).repeat(6))).toBe(true)
    }
  })

  it('rejects the two sequential runs', () => {
    expect(isRejectedPin('123456')).toBe(true)
    expect(isRejectedPin('654321')).toBe(true)
  })

  it('accepts an ordinary code', () => {
    expect(isRejectedPin('482913')).toBe(false)
  })
})

describe('generateCandidatePin', () => {
  it('always produces a 6-digit zero-padded string', () => {
    for (let i = 0; i < 200; i++) {
      const pin = generateCandidatePin()
      expect(pin).toMatch(/^[0-9]{6}$/)
    }
  })
})

describe('generateValidPin', () => {
  it('never returns a rejected pin', () => {
    for (let i = 0; i < 200; i++) {
      expect(isRejectedPin(generateValidPin())).toBe(false)
    }
  })
})
