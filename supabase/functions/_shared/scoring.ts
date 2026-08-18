// The one scoring implementation (CLAUDE.md rule 3) — imported by
// submit-answer (scoring a correct/wrong answer) and lock-question
// (resetting streaks for players who never answered). Pure, no Deno-only
// APIs, so it's directly Vitest-importable too. See SPEC.md §6.

export interface ScoreAnswerParams {
  isCorrect: boolean
  responseMs: number
  timeLimitSec: number
  pointsFactor: number
  previousStreak: number
}

export interface ScoreAnswerResult {
  points: number
  newStreak: number
}

const MAX_STREAK_BONUS_STREAK = 5
const STREAK_BONUS_PER_LEVEL = 100
const BASE_POINTS = 1000

export function calculateAnswerPoints(
  params: ScoreAnswerParams,
): ScoreAnswerResult {
  if (!params.isCorrect) {
    return { points: 0, newStreak: 0 }
  }

  const base = BASE_POINTS * params.pointsFactor
  const timeRatio = Math.min(
    1,
    Math.max(0, params.responseMs / (params.timeLimitSec * 1000)),
  )
  const basePoints = Math.round(base * (1 - timeRatio / 2))

  const newStreak = params.previousStreak + 1
  const streakBonus =
    Math.min(newStreak - 1, MAX_STREAK_BONUS_STREAK) * STREAK_BONUS_PER_LEVEL

  return { points: basePoints + streakBonus, newStreak }
}
