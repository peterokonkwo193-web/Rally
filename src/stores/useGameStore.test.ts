import { afterEach, describe, expect, it } from 'vitest'
import { useGameStore } from './useGameStore'

afterEach(() => {
  useGameStore.getState().reset()
})

describe('useGameStore', () => {
  it('onQuestionStart moves to question_active, sets questionType, and clears prior round data', () => {
    useGameStore.setState({
      myAnswer: { selectedPosition: 1, answerText: null, isCorrect: true, points: 500 },
      reveal: { questionType: 'multiple_choice', correctPosition: 1, distribution: [1, 2, 0, 0] },
      leaderboard: [],
    })

    useGameStore.getState().onQuestionStart({
      questionIdx: 0,
      questionType: 'true_false',
      text: 'The sky is blue.',
      optionCount: 2,
      options: [
        { position: 0, text: 'True' },
        { position: 1, text: 'False' },
      ],
      endsAt: new Date(Date.now() + 20_000).toISOString(),
      serverNow: new Date().toISOString(),
    })

    const state = useGameStore.getState()
    expect(state.phase).toBe('question_active')
    expect(state.questionType).toBe('true_false')
    expect(state.questionText).toBe('The sky is blue.')
    expect(state.optionTexts).toEqual([
      { position: 0, text: 'True' },
      { position: 1, text: 'False' },
    ])
    expect(state.myAnswer).toBeNull()
    expect(state.reveal).toBeNull()
    expect(state.leaderboard).toBeNull()
  })

  it('applyHostStartQuestion sets both the generic and host-only fields together', () => {
    useGameStore.getState().applyHostStartQuestion({
      questionIdx: 2,
      totalQuestions: 5,
      question: {
        id: 'q1',
        text: 'What?',
        timeLimitSec: 20,
        pointsFactor: 1,
        questionType: 'multiple_choice',
      },
      options: [
        { id: 'o1', position: 0, text: 'A' },
        { id: 'o2', position: 1, text: 'B' },
      ],
      endsAt: new Date(Date.now() + 20_000).toISOString(),
      serverNow: new Date().toISOString(),
    })

    const state = useGameStore.getState()
    expect(state.phase).toBe('question_active')
    expect(state.questionIdx).toBe(2)
    expect(state.questionType).toBe('multiple_choice')
    expect(state.totalQuestions).toBe(5)
    expect(state.hostQuestion?.text).toBe('What?')
    expect(state.hostOptions).toHaveLength(2)
  })

  it('onQuestionEnd moves to revealing (multiple_choice/true_false shape)', () => {
    useGameStore.getState().onQuestionEnd({
      questionType: 'multiple_choice',
      correctPosition: 2,
      distribution: [1, 1, 3, 0],
    })
    const state = useGameStore.getState()
    expect(state.phase).toBe('revealing')
    expect(state.reveal).toEqual({
      questionType: 'multiple_choice',
      correctPosition: 2,
      distribution: [1, 1, 3, 0],
    })
  })

  it('onQuestionEnd accepts the type_answer reveal shape', () => {
    useGameStore.getState().onQuestionEnd({
      questionType: 'type_answer',
      acceptedAnswers: ['Paris'],
      correctCount: 3,
      incorrectCount: 1,
    })
    const state = useGameStore.getState()
    expect(state.phase).toBe('revealing')
    expect(state.reveal).toEqual({
      questionType: 'type_answer',
      acceptedAnswers: ['Paris'],
      correctCount: 3,
      incorrectCount: 1,
    })
  })

  it('onLeaderboard moves to leaderboard', () => {
    useGameStore.getState().onLeaderboard({
      top: [{ playerId: 'p1', nickname: 'Alex', avatarStyle: 'a', avatarSeed: 's', score: 100, rank: 1 }],
    })
    expect(useGameStore.getState().phase).toBe('leaderboard')
    expect(useGameStore.getState().leaderboard).toHaveLength(1)
  })

  it('onGameOver moves to finished', () => {
    useGameStore.getState().onGameOver({
      podium: [{ playerId: 'p1', nickname: 'Alex', avatarStyle: 'a', avatarSeed: 's', score: 100, rank: 1 }],
    })
    expect(useGameStore.getState().phase).toBe('finished')
    expect(useGameStore.getState().podium).toHaveLength(1)
  })

  it('onPlayerKicked sets kicked to true', () => {
    expect(useGameStore.getState().kicked).toBe(false)
    useGameStore.getState().onPlayerKicked()
    expect(useGameStore.getState().kicked).toBe(true)
  })
})
