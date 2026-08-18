import { useEffect, useState } from 'react'
import { RallyLogo } from '../../components/RallyLogo'
import { QuizCard } from '../../components/QuizCard'
import { fetchPublicQuizzes, type PublicQuiz } from '../../lib/discover'

const BENEFITS = [
  {
    title: 'Speed rewards you',
    body: 'Correct and fast beats correct and slow — every answer is timed and scored the instant it lands.',
  },
  {
    title: 'Any topic, instantly',
    body: 'Pick a category, add a topic if you like, and a full quiz is generated for you in seconds.',
  },
  {
    title: 'No setup required',
    body: "There's nothing to build ahead of time — generate a quiz and you're hosting within a minute.",
  },
  {
    title: 'Live leaderboard & podium',
    body: 'Standings update after every question, with a final podium to close out the game.',
  },
]

export function LandingPage() {
  const [quizzes, setQuizzes] = useState<PublicQuiz[]>([])

  useEffect(() => {
    fetchPublicQuizzes(6)
      .then(setQuizzes)
      .catch(() => setQuizzes([]))
  }, [])

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-6 py-16 text-center sm:py-24">
        <RallyLogo className="w-48 sm:w-64" />
        <p className="max-w-lg text-lg text-slate-300 sm:text-xl">
          A live multiplayer quiz game. Project it on a screen, everyone answers on
          their phone, speed and accuracy win.
        </p>

        <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
          <a
            href="/host"
            className="rounded-xl bg-indigo-600 px-10 py-5 text-xl font-bold text-white transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            Host a Game
          </a>
          <a
            href="/play"
            className="rounded-xl bg-slate-800 px-10 py-5 text-xl font-bold text-white transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            Join a Game
          </a>
        </div>
      </div>

      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 px-6 pb-16 sm:grid-cols-2">
        {BENEFITS.map((b) => (
          <div key={b.title} className="rounded-xl bg-slate-900 p-6">
            <h2 className="mb-2 text-xl font-bold text-white">{b.title}</h2>
            <p className="text-slate-400">{b.body}</p>
          </div>
        ))}
      </div>

      {quizzes.length > 0 && (
        <div className="mx-auto max-w-4xl px-6 pb-20">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-2xl font-bold text-white">Discover</h2>
            <a href="/discover" className="text-indigo-300 underline">
              See all
            </a>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {quizzes.map((quiz) => (
              <QuizCard key={quiz.id} quiz={quiz} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
