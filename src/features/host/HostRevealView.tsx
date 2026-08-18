import { useEffect, useState } from 'react'
import { useGameStore } from '../../stores/useGameStore'
import { ANSWER_SHAPES } from '../../lib/answerShapes'
import { ApiError, callEdgeFunction } from '../../lib/api'
import { playRevealFanfare } from '../../lib/sound'

export function HostRevealView({ sessionId }: { sessionId: string }) {
  const { hostQuestion, hostOptions, reveal } = useGameStore((s) => ({
    hostQuestion: s.hostQuestion,
    hostOptions: s.hostOptions,
    reveal: s.reveal,
  }))
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (reveal) playRevealFanfare()
  }, [reveal])

  if (!hostQuestion || !reveal) {
    return (
      <p role="status" className="text-slate-400">
        Locking answers…
      </p>
    )
  }

  async function handleShowLeaderboard() {
    setSubmitting(true)
    setErrorMessage(null)
    try {
      await callEdgeFunction('show-leaderboard', { sessionId })
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Could not show the leaderboard.')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-8 px-6 py-10 text-center">
      <h1 className="text-3xl font-bold sm:text-4xl">{hostQuestion.text}</h1>

      {reveal.questionType === 'type_answer' ? (
        <div className="flex w-full flex-col items-center gap-4">
          <p className="text-lg text-slate-300">
            Accepted answer{reveal.acceptedAnswers.length > 1 ? 's' : ''}:{' '}
            <span className="font-bold text-white">{reveal.acceptedAnswers.join(' / ')}</span>
          </p>
          <p className="text-xl font-semibold">
            <span className="text-green-400">{reveal.correctCount} correct</span>
            {' · '}
            <span className="text-red-400">{reveal.incorrectCount} incorrect</span>
          </p>
        </div>
      ) : (
        <div className="flex w-full flex-col gap-3">
          {hostOptions.map((option, i) => {
            const isCorrect = i === reveal.correctPosition
            const count = reveal.distribution[i] ?? 0
            const maxCount = Math.max(1, ...reveal.distribution)
            return (
              <div
                key={option.id}
                className={`flex items-center gap-4 rounded-xl px-6 py-4 text-left text-lg font-semibold text-white ${ANSWER_SHAPES[i].colorClass} ${
                  isCorrect ? 'ring-4 ring-white' : 'opacity-60'
                }`}
              >
                <span className="flex-1">
                  {option.text} {isCorrect && '✓'}
                </span>
                <div className="h-3 w-32 overflow-hidden rounded-full bg-black/20">
                  <div
                    className="h-full bg-white transition-all duration-300"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right tabular-nums">{count}</span>
              </div>
            )
          })}
        </div>
      )}

      {errorMessage && (
        <p role="alert" className="text-red-400">
          {errorMessage}
        </p>
      )}

      <button
        type="button"
        onClick={handleShowLeaderboard}
        disabled={submitting}
        className="rounded-xl bg-indigo-600 px-8 py-4 text-xl font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Loading…' : 'Show Leaderboard'}
      </button>
    </div>
  )
}
