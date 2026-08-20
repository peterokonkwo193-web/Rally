import { create } from 'zustand'
import { computeClockOffset } from '../lib/clock'

export type GamePhase =
  | 'lobby'
  | 'question_active'
  | 'revealing'
  | 'leaderboard'
  | 'finished'

export type QuestionType = 'multiple_choice' | 'true_false' | 'type_answer'

export interface RankedPlayer {
  playerId: string
  nickname: string
  avatarStyle: string
  avatarSeed: string
  score: number
  rank: number
}

interface HostQuestionData {
  questionIdx: number
  totalQuestions: number
  question: {
    id: string
    text: string
    timeLimitSec: number
    pointsFactor: number
    questionType: QuestionType
  }
  options: { id: string; position: number; text: string }[]
  endsAt: string
  serverNow: string
}

interface QuestionStartPayload {
  questionIdx: number
  questionType: QuestionType
  text: string
  optionCount: number
  options: { position: number; text: string }[]
  endsAt: string
  serverNow: string
}

type RevealPayload =
  | {
      questionType: 'multiple_choice' | 'true_false'
      correctPosition: number | null
      distribution: number[]
    }
  | {
      questionType: 'type_answer'
      acceptedAnswers: string[]
      correctCount: number
      incorrectCount: number
    }

type MyAnswer = {
  selectedPosition: number | null
  answerText: string | null
  isCorrect: boolean
  points: number
}

interface GameState {
  phase: GamePhase
  clockOffsetMs: number
  questionIdx: number
  questionType: QuestionType
  optionCount: number
  endsAt: string | null

  // Player-safe question/option text from the broadcast — position-keyed,
  // no ids (unlike hostQuestion/hostOptions below). Shown on the player's
  // own device now (product decision overriding the original "shapes
  // only, read the shared screen" design — SPEC.md §1).
  questionText: string | null
  optionTexts: { position: number; text: string }[]

  // Host-only — populated from start-question's HTTP response, not the
  // broadcast (players never receive question text/options, SPEC §3.2).
  hostQuestion: HostQuestionData['question'] | null
  hostOptions: HostQuestionData['options']
  totalQuestions: number

  answerCount: { answered: number; total: number }
  myAnswer: MyAnswer | null
  reveal: RevealPayload | null
  leaderboard: RankedPlayer[] | null
  podium: RankedPlayer[] | null
  kicked: boolean

  onQuestionStart: (payload: QuestionStartPayload) => void
  setHostQuestionData: (data: HostQuestionData) => void
  /** Host-only convenience: start-question's HTTP response carries both
   * the generic broadcast fields AND the full question/options the
   * broadcast never does — applying both together means the host UI is
   * correct immediately, without waiting for its own broadcast to round
   * -trip back. Used by every host action that calls start-question
   * (initial "Start Game" and "Next Question" alike), so hostQuestion
   * never goes stale after the first question. */
  applyHostStartQuestion: (data: HostQuestionData) => void
  setAnswerCount: (payload: { answered: number; total: number }) => void
  setMyAnswer: (answer: GameState['myAnswer']) => void
  onQuestionEnd: (payload: RevealPayload) => void
  onLeaderboard: (payload: { top: RankedPlayer[] }) => void
  onGameOver: (payload: { podium: RankedPlayer[] }) => void
  /** Caller (useGameChannel) already knows whether the kicked playerId
   * matches this client's own — this just records "yes, it was me." */
  onPlayerKicked: () => void
  reset: () => void
}

const initialState = {
  phase: 'lobby' as GamePhase,
  clockOffsetMs: 0,
  questionIdx: -1,
  questionType: 'multiple_choice' as QuestionType,
  optionCount: 4,
  endsAt: null as string | null,
  questionText: null as string | null,
  optionTexts: [] as { position: number; text: string }[],
  hostQuestion: null as HostQuestionData['question'] | null,
  hostOptions: [] as HostQuestionData['options'],
  totalQuestions: 0,
  answerCount: { answered: 0, total: 0 },
  myAnswer: null as MyAnswer | null,
  reveal: null as RevealPayload | null,
  leaderboard: null as RankedPlayer[] | null,
  podium: null as RankedPlayer[] | null,
  kicked: false,
}

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  onQuestionStart: (payload) =>
    set({
      phase: 'question_active',
      questionIdx: payload.questionIdx,
      questionType: payload.questionType,
      optionCount: payload.optionCount,
      endsAt: payload.endsAt,
      questionText: payload.text,
      optionTexts: payload.options,
      clockOffsetMs: computeClockOffset(payload.serverNow),
      answerCount: { answered: 0, total: 0 },
      myAnswer: null,
      reveal: null,
      leaderboard: null,
    }),

  setHostQuestionData: (data) =>
    set({
      hostQuestion: data.question,
      hostOptions: data.options,
      totalQuestions: data.totalQuestions,
      questionIdx: data.questionIdx,
    }),

  applyHostStartQuestion: (data) =>
    set({
      phase: 'question_active',
      questionIdx: data.questionIdx,
      questionType: data.question.questionType,
      optionCount: data.options.length,
      endsAt: data.endsAt,
      clockOffsetMs: computeClockOffset(data.serverNow),
      answerCount: { answered: 0, total: 0 },
      myAnswer: null,
      reveal: null,
      leaderboard: null,
      hostQuestion: data.question,
      hostOptions: data.options,
      totalQuestions: data.totalQuestions,
    }),

  setAnswerCount: (payload) => set({ answerCount: payload }),

  setMyAnswer: (answer) => set({ myAnswer: answer }),

  onQuestionEnd: (payload) => set({ phase: 'revealing', reveal: payload }),

  onLeaderboard: (payload) =>
    set({ phase: 'leaderboard', leaderboard: payload.top }),

  onGameOver: (payload) => set({ phase: 'finished', podium: payload.podium }),

  onPlayerKicked: () => set({ kicked: true }),

  reset: () => set(initialState),
}))
