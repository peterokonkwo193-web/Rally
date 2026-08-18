import { useGameStore } from '../../stores/useGameStore'
import { ANSWER_SHAPES } from '../../lib/answerShapes'

export function PlayerRevealView() {
  const { myAnswer, reveal, optionCount } = useGameStore((s) => ({
    myAnswer: s.myAnswer,
    reveal: s.reveal,
    optionCount: s.optionCount,
  }))

  if (!reveal) {
    return (
      <p role="status" className="text-slate-400">
        Locking answers…
      </p>
    )
  }

  const didNotAnswer = !myAnswer

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      {didNotAnswer && (
        <>
          <h1 className="text-4xl font-bold text-slate-300">Time's up!</h1>
          <p className="text-lg text-slate-400">You didn't answer in time — no points this round.</p>
        </>
      )}
      {myAnswer?.isCorrect && (
        <>
          <h1 className="text-5xl font-black text-green-400">Correct!</h1>
          <p className="text-2xl font-bold text-white">+{myAnswer.points} points</p>
        </>
      )}
      {myAnswer && !myAnswer.isCorrect && (
        <>
          <h1 className="text-5xl font-black text-red-400">Wrong</h1>
          {myAnswer.answerText && (
            <p className="text-slate-400">
              You typed: <span className="text-white">{myAnswer.answerText}</span>
            </p>
          )}
          <p className="text-lg text-slate-400">No points this round.</p>
        </>
      )}

      {reveal.questionType === 'type_answer' ? (
        <p className="text-lg text-slate-300">
          Accepted answer{reveal.acceptedAnswers.length > 1 ? 's' : ''}:{' '}
          <span className="font-bold text-white">{reveal.acceptedAnswers.join(' / ')}</span>
        </p>
      ) : reveal.questionType === 'true_false' ? (
        <div className="grid w-full max-w-xs grid-cols-2 gap-3">
          <div
            className={`rounded-xl bg-green-600 py-6 text-xl font-bold text-white ${
              reveal.correctPosition === 0 ? 'ring-4 ring-white' : 'opacity-40'
            }`}
          >
            True
          </div>
          <div
            className={`rounded-xl bg-answer-red py-6 text-xl font-bold text-white ${
              reveal.correctPosition === 1 ? 'ring-4 ring-white' : 'opacity-40'
            }`}
          >
            False
          </div>
        </div>
      ) : (
        <div className="grid w-full max-w-xs grid-cols-2 gap-3">
          {Array.from({ length: optionCount }).map((_, position) => {
            const isCorrectShape = position === reveal.correctPosition
            const shape = ANSWER_SHAPES[position]
            return (
              <div
                key={position}
                className={`flex aspect-square items-center justify-center rounded-xl ${shape.colorClass} ${
                  isCorrectShape ? 'ring-4 ring-white' : 'opacity-40'
                }`}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
