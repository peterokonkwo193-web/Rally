import { useState } from 'react'
import { useGameStore, type QuestionType } from '../../stores/useGameStore'
import { avatarUrl } from '../../lib/avatars'
import { ApiError, callEdgeFunction } from '../../lib/api'
import { useKickPlayer } from '../../hooks/useKickPlayer'

interface StartQuestionResponse {
  questionIdx: number
  totalQuestions: number
  endsAt: string
  serverNow: string
  question: {
    id: string
    text: string
    timeLimitSec: number
    pointsFactor: number
    questionType: QuestionType
  }
  options: { id: string; position: number; text: string }[]
}

export function HostLeaderboardView({ sessionId }: { sessionId: string }) {
  const { leaderboard, questionIdx, totalQuestions } = useGameStore((s) => ({
    leaderboard: s.leaderboard,
    questionIdx: s.questionIdx,
    totalQuestions: s.totalQuestions,
  }))
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { kick, kickingId } = useKickPlayer(sessionId)

  const hasMoreQuestions = questionIdx + 1 < totalQuestions

  async function handleAdvance() {
    setSubmitting(true)
    setErrorMessage(null)
    try {
      if (hasMoreQuestions) {
        const resp = await callEdgeFunction<StartQuestionResponse>(
          'start-question',
          { sessionId },
        )
        useGameStore.getState().applyHostStartQuestion(resp)
      } else {
        await callEdgeFunction('end-session', { sessionId })
      }
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? err.message : 'Could not continue the game.',
      )
      setSubmitting(false)
    }
  }

  if (!leaderboard) {
    return (
      <p role="status" className="text-slate-400">
        Loading leaderboard…
      </p>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-8 px-6 py-10 text-center">
      <h1 className="text-4xl font-bold">Leaderboard</h1>

      <ol className="flex w-full flex-col gap-3">
        {leaderboard.slice(0, 5).map((player) => (
          <li
            key={player.playerId}
            className="flex items-center gap-4 rounded-xl bg-slate-800 px-5 py-3 text-left"
          >
            <span className="w-8 text-xl font-black text-indigo-300">
              {player.rank}
            </span>
            <img
              src={avatarUrl(player.avatarStyle, player.avatarSeed)}
              alt=""
              className="h-10 w-10 rounded-full bg-white"
            />
            <span className="flex-1 text-lg font-semibold">{player.nickname}</span>
            <span className="text-lg font-bold tabular-nums">{player.score}</span>
            <button
              type="button"
              onClick={() => kick(player.playerId)}
              disabled={kickingId === player.playerId}
              aria-label={`Remove ${player.nickname}`}
              title={`Remove ${player.nickname}`}
              className="rounded-full px-2 text-sm text-slate-500 transition hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50"
            >
              ✕
            </button>
          </li>
        ))}
      </ol>

      {errorMessage && (
        <p role="alert" className="text-red-400">
          {errorMessage}
        </p>
      )}

      <button
        type="button"
        onClick={handleAdvance}
        disabled={submitting}
        className="rounded-xl bg-indigo-600 px-8 py-4 text-xl font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting
          ? 'Loading…'
          : hasMoreQuestions
            ? 'Next Question'
            : 'Final Results'}
      </button>
    </div>
  )
}
