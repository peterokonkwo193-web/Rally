import { useEffect, useState } from 'react'
import { RallyLogo } from '../../components/RallyLogo'
import { QuizCard } from '../../components/QuizCard'
import { fetchPublicQuizzes, type PublicQuiz } from '../../lib/discover'

type Status = 'loading' | 'ready' | 'error'

// No pagination or search in this pass — a flat list of the newest ~30
// public quizzes is enough at the current content volume; adding either
// before there's enough content to need them would be premature.
const DISCOVER_LIMIT = 30

export function DiscoverScreen() {
  const [quizzes, setQuizzes] = useState<PublicQuiz[]>([])
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    fetchPublicQuizzes(DISCOVER_LIMIT)
      .then((data) => {
        setQuizzes(data)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <div className="mb-10 flex flex-col items-center gap-4 text-center">
        <a href="/">
          <RallyLogo className="w-32" />
        </a>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">Discover</h1>
        <p className="text-slate-400">Quizzes other hosts have made public. Pick one to host.</p>
      </div>

      {status === 'loading' && (
        <p role="status" className="text-center text-slate-400">
          Loading quizzes…
        </p>
      )}
      {status === 'error' && (
        <p role="alert" className="text-center text-red-400">
          Could not load quizzes. Try reloading.
        </p>
      )}
      {status === 'ready' && quizzes.length === 0 && (
        <p className="text-center text-slate-400">
          No public quizzes yet — be the first by checking "Share this quiz publicly" when
          you host.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {quizzes.map((quiz) => (
          <QuizCard key={quiz.id} quiz={quiz} />
        ))}
      </div>
    </div>
  )
}
