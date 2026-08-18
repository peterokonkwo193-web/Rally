import type { PublicQuiz } from '../lib/discover'

export function QuizCard({ quiz }: { quiz: PublicQuiz }) {
  return (
    <a
      href={`/host?quizId=${quiz.id}`}
      className="flex flex-col gap-2 rounded-xl bg-slate-800 p-5 text-left transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
    >
      {quiz.categoryName && (
        <span className="w-fit rounded-full bg-indigo-600/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-300">
          {quiz.categoryName}
        </span>
      )}
      <h3 className="text-lg font-bold text-white">{quiz.title}</h3>
      {quiz.description && (
        <p className="line-clamp-2 text-sm text-slate-400">{quiz.description}</p>
      )}
      <p className="mt-auto text-sm font-medium text-slate-300">
        {quiz.questionCount} question{quiz.questionCount === 1 ? '' : 's'} · Host This Quiz →
      </p>
    </a>
  )
}
