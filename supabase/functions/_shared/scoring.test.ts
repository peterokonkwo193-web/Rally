import { describe, expect, it } from 'vitest'
import { calculateAnswerPoints } from './scoring'

describe('calculateAnswerPoints', () => {
  it('awards full base points for an instant correct answer', () => {
    const result = calculateAnswerPoints({
      isCorrect: true,
      responseMs: 0,
      timeLimitSec: 20,
      pointsFactor: 1,
      previousStreak: 0,
    })
    expect(result).toEqual({ points: 1000, newStreak: 1 })
  })

  it('awards half base points for a buzzer-beater (response at the deadline)', () => {
    const result = calculateAnswerPoints({
      isCorrect: true,
      responseMs: 20_000,
      timeLimitSec: 20,
      pointsFactor: 1,
      previousStreak: 0,
    })
    expect(result).toEqual({ points: 500, newStreak: 1 })
  })

  it('awards zero points and resets the streak for a wrong answer', () => {
    const result = calculateAnswerPoints({
      isCorrect: false,
      responseMs: 500,
      timeLimitSec: 20,
      pointsFactor: 1,
      previousStreak: 4,
    })
    expect(result).toEqual({ points: 0, newStreak: 0 })
  })

  it('a slow correct answer still beats a fast wrong answer', () => {
    const slowCorrect = calculateAnswerPoints({
      isCorrect: true,
      responseMs: 19_999,
      timeLimitSec: 20,
      pointsFactor: 1,
      previousStreak: 0,
    })
    const fastWrong = calculateAnswerPoints({
      isCorrect: false,
      responseMs: 1,
      timeLimitSec: 20,
      pointsFactor: 1,
      previousStreak: 0,
    })
    expect(slowCorrect.points).toBeGreaterThan(fastWrong.points)
  })

  it('accumulates the streak bonus on consecutive correct answers', () => {
    // previousStreak: 3 -> newStreak 4 -> bonus = min(4-1,5)*100 = 300
    const result = calculateAnswerPoints({
      isCorrect: true,
      responseMs: 0,
      timeLimitSec: 20,
      pointsFactor: 1,
      previousStreak: 3,
    })
    expect(result).toEqual({ points: 1000 + 300, newStreak: 4 })
  })

  it('caps the streak bonus at a streak of 6 and beyond', () => {
    const result = calculateAnswerPoints({
      isCorrect: true,
      responseMs: 0,
      timeLimitSec: 20,
      pointsFactor: 1,
      previousStreak: 10,
    })
    // newStreak = 11 -> bonus = min(10,5)*100 = 500, capped
    expect(result).toEqual({ points: 1000 + 500, newStreak: 11 })
  })

  it('resets streak to 0 on a wrong answer even after a long streak', () => {
    const result = calculateAnswerPoints({
      isCorrect: false,
      responseMs: 100,
      timeLimitSec: 20,
      pointsFactor: 1,
      previousStreak: 10,
    })
    expect(result.newStreak).toBe(0)
  })

  it('points_factor of 0 still pays the streak bonus (base is 0, bonus is independent)', () => {
    const result = calculateAnswerPoints({
      isCorrect: true,
      responseMs: 0,
      timeLimitSec: 20,
      pointsFactor: 0,
      previousStreak: 2,
    })
    // base = 0, basePoints = 0, newStreak = 3, bonus = min(2,5)*100 = 200
    expect(result).toEqual({ points: 200, newStreak: 3 })
  })

  it('points_factor of 2 doubles the base points', () => {
    const result = calculateAnswerPoints({
      isCorrect: true,
      responseMs: 0,
      timeLimitSec: 20,
      pointsFactor: 2,
      previousStreak: 0,
    })
    expect(result).toEqual({ points: 2000, newStreak: 1 })
  })

  it('clamps an out-of-range responseMs (defensive — server always sends a valid window)', () => {
    const result = calculateAnswerPoints({
      isCorrect: true,
      responseMs: 999_999,
      timeLimitSec: 20,
      pointsFactor: 1,
      previousStreak: 0,
    })
    // timeRatio clamped to 1 -> same as buzzer-beater
    expect(result.points).toBe(500)
  })
})
