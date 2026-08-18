import { useState } from 'react'
import { AnswerShapeButton } from '../../components/AnswerShapeButton'
import { TrueFalseButtons } from '../../components/TrueFalseButtons'
import { TypeAnswerForm } from '../../components/TypeAnswerForm'
import { useGameStore } from '../../stores/useGameStore'
import { callEdgeFunction } from '../../lib/api'
import { playCorrectSound, playWrongSound } from '../../lib/sound'

interface SubmitAnswerResponse {
  isCorrect: boolean
  points: number
  newStreak: number
}

// Players never receive real option ids (SPEC.md §3.2 — question_start
// carries only optionCount). Tapping a shape/true-false button submits a
// position (0-3); submit-answer resolves that to a real answer_options
// row server-side. type_answer submits raw text instead — see submit
// -answer's branching for how that's matched.
export function PlayerAnswerView({ sessionId }: { sessionId: string }) {
  const { optionCount, questionType } = useGameStore((s) => ({
    optionCount: s.optionCount,
    questionType: s.questionType,
  }))
  const [submittedPosition, setSubmittedPosition] = useState<number | null>(null)
  const [submittedText, setSubmittedText] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const hasSubmitted = submittedPosition !== null || submittedText !== null

  async function submit(body: { selectedPosition: number } | { answerText: string }) {
    if (hasSubmitted || submitting) return
    setSubmitting(true)
    setErrorMessage(null)
    try {
      const result = await callEdgeFunction<SubmitAnswerResponse>('submit-answer', {
        sessionId,
        ...body,
      })
      if ('selectedPosition' in body) setSubmittedPosition(body.selectedPosition)
      else setSubmittedText(body.answerText)
      useGameStore.getState().setMyAnswer({
        selectedPosition: 'selectedPosition' in body ? body.selectedPosition : null,
        answerText: 'answerText' in body ? body.answerText : null,
        isCorrect: result.isCorrect,
        points: result.points,
      })
      if (result.isCorrect) playCorrectSound()
      else playWrongSound()
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not submit your answer.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-8">
      {hasSubmitted && (
        <p role="status" className="animate-pulse text-xl font-semibold text-indigo-300">
          Locked in!
        </p>
      )}
      {errorMessage && (
        <p role="alert" className="text-red-400">
          {errorMessage}
        </p>
      )}

      {questionType === 'true_false' && (
        <TrueFalseButtons
          selectedPosition={submittedPosition}
          disabled={hasSubmitted || submitting}
          onSelect={(position) => submit({ selectedPosition: position })}
        />
      )}

      {questionType === 'type_answer' && (
        <TypeAnswerForm
          submittedText={submittedText}
          disabled={submitting}
          onSubmit={(text) => submit({ answerText: text })}
        />
      )}

      {questionType === 'multiple_choice' && (
        <div className="grid w-full max-w-md grid-cols-2 gap-4">
          {Array.from({ length: optionCount }).map((_, position) => (
            <AnswerShapeButton
              key={position}
              position={position as 0 | 1 | 2 | 3}
              disabled={hasSubmitted || submitting}
              selected={submittedPosition === position}
              onClick={() => submit({ selectedPosition: position })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
