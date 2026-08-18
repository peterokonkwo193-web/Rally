import { describe, expect, it } from 'vitest'
import { answerTextMatches, normalizeAnswerText } from './textAnswer'

describe('normalizeAnswerText', () => {
  it('trims and lowercases', () => {
    expect(normalizeAnswerText('  Paris  ')).toBe('paris')
  })

  it('collapses internal whitespace runs', () => {
    expect(normalizeAnswerText('New   York')).toBe('new york')
  })
})

describe('answerTextMatches', () => {
  it('matches regardless of case/whitespace differences', () => {
    expect(answerTextMatches('paris', 'Paris')).toBe(true)
    expect(answerTextMatches('  PARIS ', 'Paris')).toBe(true)
  })

  it('does not match a genuinely different answer', () => {
    expect(answerTextMatches('London', 'Paris')).toBe(false)
  })

  it('does not match a partial/substring answer', () => {
    expect(answerTextMatches('Par', 'Paris')).toBe(false)
  })
})
