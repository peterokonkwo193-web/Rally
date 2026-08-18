import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../stores/useGameStore'
import { useCountdown } from '../../lib/clock'
import { ANSWER_SHAPES } from '../../lib/answerShapes'
import { ApiError, callEdgeFunction } from '../../lib/api'
import { playTickSound } from '../../lib/sound'

export function HostQuestionView({ sessionId }: { sessionId: string }) {
  const { hostQuestion, hostOptions, questionType, endsAt, clockOffsetMs, answerCount } =
    useGameStore((s) => ({
      hostQuestion: s.hostQuestion,
      hostOptions: s.hostOptions,
      questionType: s.questionType,
      endsAt: s.endsAt,
      clockOffsetMs: s.clockOffsetMs,
      answerCount: s.answerCount,
    }))
  const secondsRemaining = useCountdown(endsAt, clockOffsetMs)
  const lockingRef = useRef(false)
  const [skipping, setSkipping] = useState(false)

  // Auto-lock when time's up or everyone's answered (SPEC.md §5) — the
  // client only ever *triggers* this; lock-question re-validates both
  // conditions server-side before actually locking anything.
  useEffect(() => {
    const timeIsUp = secondsRemaining <= 0
    const allAnswered = answerCount.total > 0 && answerCount.answered >= answerCount.total
    if ((timeIsUp || allAnswered) && !lockingRef.current) {
      lockingRef.current = true
      callEdgeFunction('lock-question', { sessionId }).catch(() => {
        lockingRef.current = false
      })
    }
  }, [secondsRemaining, answerCount, sessionId])

  useEffect(() => {
    if (secondsRemaining <= 5 && secondsRemaining > 0) {
      playTickSound()
    }
  }, [Math.ceil(secondsRemaining)]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSkip() {
    if (skipping || lockingRef.current) return
    setSkipping(true)
    lockingRef.current = true
    try {
      await callEdgeFunction('lock-question', { sessionId, force: true })
    } catch (err) {
      lockingRef.current = false
      setSkipping(false)
      // Non-fatal — the auto-lock effect above will still fire once the
      // real deadline passes, so a failed skip just means "wait it out."
      console.error(err instanceof ApiError ? err.message : err)
    }
  }

  if (!hostQuestion) {
    return (
      <p role="status" className="text-slate-400">
        Loading question…
      </p>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-8 px-6 py-10 text-center">
      <div
        className={`text-7xl font-black tabular-nums transition-colors sm:text-8xl ${
          secondsRemaining <= 5 ? 'text-red-400' : 'text-white'
        }`}
        aria-live="polite"
        aria-label={`${Math.ceil(secondsRemaining)} seconds remaining`}
      >
        {Math.ceil(secondsRemaining)}
      </div>

      <h1 className="text-3xl font-bold sm:text-5xl">{hostQuestion.text}</h1>

      {questionType === 'type_answer' && (
        <p className="text-lg text-slate-400">Players are typing their answers…</p>
      )}

      {questionType === 'true_false' && (
        <div className="grid w-full max-w-md grid-cols-2 gap-4">
          <div className="rounded-xl bg-green-600 px-6 py-5 text-xl font-bold text-white">True</div>
          <div className="rounded-xl bg-answer-red px-6 py-5 text-xl font-bold text-white">False</div>
        </div>
      )}

      {questionType === 'multiple_choice' && (
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          {hostOptions.map((option, i) => (
            <div
              key={option.id}
              className={`rounded-xl px-6 py-5 text-left text-xl font-semibold text-white ${ANSWER_SHAPES[i].colorClass}`}
            >
              {option.text}
            </div>
          ))}
        </div>
      )}

      <p className="min-w-[12ch] text-xl text-slate-300" aria-live="polite">
        {answerCount.answered} / {answerCount.total} answered
      </p>

      <button
        type="button"
        onClick={handleSkip}
        disabled={skipping}
        className="text-sm text-slate-400 underline disabled:cursor-not-allowed disabled:opacity-50"
      >
        {skipping ? 'Skipping…' : 'Skip Question'}
      </button>
    </div>
  )
}
