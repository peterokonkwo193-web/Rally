import { useEffect, useState } from 'react'
import { RallyLogo } from '../../components/RallyLogo'
import { QuizCard } from '../../components/QuizCard'
import { FloatingShapes } from '../../components/FloatingShapes'
import { GradientBlobs } from '../../components/GradientBlobs'
import { WaveDivider } from '../../components/WaveDivider'
import { CategoryMarquee } from '../../components/CategoryMarquee'
import { DeviceMockup } from '../../components/DeviceMockup'
import { useCountUp } from '../../lib/useCountUp'
import {
  fetchLandingStats,
  fetchPublicQuizzes,
  type LandingStats,
  type PublicQuiz,
} from '../../lib/discover'

const BENEFITS = [
  {
    title: 'Speed rewards you',
    body: 'Correct and fast beats correct and slow — every answer is timed and scored the instant it lands.',
    color: 'bg-answer-red',
    icon: (
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" strokeLinejoin="round" strokeLinecap="round" />
    ),
  },
  {
    title: 'Any topic, instantly',
    body: 'Pick a category, add a topic if you like, and a full quiz is generated for you in seconds.',
    color: 'bg-answer-blue',
    icon: (
      <path
        d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"
        strokeLinecap="round"
      />
    ),
  },
  {
    title: 'No setup required',
    body: "There's nothing to build ahead of time — generate a quiz and you're hosting within a minute.",
    color: 'bg-answer-green',
    icon: <path d="M4 12.5 9.5 18 20 6" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: 'Live leaderboard & podium',
    body: 'Standings update after every question, with a final podium to close out the game.',
    color: 'bg-answer-yellow',
    icon: (
      <path
        d="M7 4h10v4a5 5 0 0 1-10 0V4Z M7 5H4a3 3 0 0 0 3 4 M17 5h3a3 3 0 0 1-3 4 M12 13v4 M8 21h8 M9 17h6v4H9Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
]

const STEPS = [
  { n: 1, title: 'Generate a quiz', body: 'Pick a category, add a topic, done in seconds.' },
  { n: 2, title: 'Share the PIN', body: 'Players join in seconds — no app, no signup friction.' },
  { n: 3, title: 'Answer fast, win big', body: 'Speed and accuracy decide the podium.' },
]

const USE_CASES = [
  {
    label: 'Classrooms',
    icon: (
      <path
        d="M12 3 2 8l10 5 10-5-10-5Z M6 10.5V16c0 1 3 2.5 6 2.5s6-1.5 6-2.5v-5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    label: 'Team meetings',
    icon: (
      <path
        d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M2 20c0-3 2.5-5 6-5s6 2 6 5 M17 8a2.5 2.5 0 1 0 0-5 M16 13c2.8 0 5 1.8 5 4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    label: 'Trivia nights',
    icon: <path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    label: 'Family game night',
    icon: (
      <path
        d="M3 11 12 3l9 8 M5 10v10h14V10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
]

export function LandingPage() {
  const [quizzes, setQuizzes] = useState<PublicQuiz[]>([])
  const [stats, setStats] = useState<LandingStats | null>(null)

  useEffect(() => {
    fetchPublicQuizzes(6)
      .then(setQuizzes)
      .catch(() => setQuizzes([]))
    fetchLandingStats()
      .then(setStats)
      .catch(() => setStats(null))
  }, [])

  const categoryCount = useCountUp(stats?.categoryCount ?? null)
  const quizCount = useCountUp(stats?.publicQuizCount ?? null)

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <GradientBlobs />
      <FloatingShapes count={24} />

      <div className="relative z-10">
        {/* Hero */}
        <div className="relative">
          <FloatingShapes count={16} />
          <div
            className="pointer-events-none absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -left-10 top-6 h-56 w-56 rounded-full bg-answer-red/10 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -right-10 bottom-0 h-56 w-56 rounded-full bg-answer-green/10 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-5 px-6 py-10 text-center sm:gap-6 sm:py-14">
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-300">
              Live multiplayer · Speed-scored
            </span>
            <RallyLogo className="w-48 sm:w-64" />
            <p className="max-w-lg text-lg text-slate-300 sm:text-xl">
              A live multiplayer quiz game. Project it on a screen, everyone answers on
              their phone, speed and accuracy win.
            </p>

            <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
              <a
                href="/host"
                className="rounded-xl bg-indigo-600 px-10 py-5 text-xl font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:-translate-y-0.5 hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              >
                Host a Game
              </a>
              <a
                href="/play"
                className="rounded-xl bg-slate-800 px-10 py-5 text-xl font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              >
                Join a Game
              </a>
            </div>

            {stats && (stats.categoryCount > 0 || stats.publicQuizCount > 0) && (
              <div className="flex items-center gap-6 text-sm text-slate-400">
                <span>
                  <span className="font-bold text-white">{categoryCount}</span> categories
                </span>
                <span className="h-1 w-1 rounded-full bg-slate-600" />
                <span>
                  <span className="font-bold text-white">{quizCount}</span> public quizzes
                  and counting
                </span>
              </div>
            )}

            <DeviceMockup />
          </div>
        </div>

        <CategoryMarquee />

        <WaveDivider fillClassName="fill-answer-blue/10" />

        {/* How it works */}
        <div className="bg-slate-900/40">
          <div className="mx-auto max-w-4xl px-6 pb-16">
            <h2 className="mb-10 text-center text-2xl font-bold text-white sm:text-3xl">
              How it works
            </h2>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              {STEPS.map((step) => (
                <div key={step.n} className="flex flex-col items-center gap-3 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-xl font-black text-white">
                    {step.n}
                  </span>
                  <h3 className="text-lg font-bold text-white">{step.title}</h3>
                  <p className="text-sm text-slate-400">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <WaveDivider fillClassName="fill-answer-yellow/10" flip />

        {/* Benefits */}
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 px-6 py-16 sm:grid-cols-2">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className="flex flex-col gap-3 rounded-xl bg-slate-900 p-6 transition hover:-translate-y-1 hover:bg-slate-800"
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${b.color}`}>
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="white" strokeWidth="2">
                  {b.icon}
                </svg>
              </span>
              <h3 className="text-xl font-bold text-white">{b.title}</h3>
              <p className="text-slate-400">{b.body}</p>
            </div>
          ))}
        </div>

        {/* Built for */}
        <div className="mx-auto max-w-4xl px-6 pb-16">
          <h2 className="mb-6 text-center text-sm font-semibold uppercase tracking-wide text-slate-500">
            Built for
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {USE_CASES.map((useCase) => (
              <span
                key={useCase.label}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2">
                  {useCase.icon}
                </svg>
                {useCase.label}
              </span>
            ))}
          </div>
        </div>

        <WaveDivider fillClassName="fill-answer-green/10" />

        {/* Discover preview */}
        {quizzes.length > 0 && (
          <div className="bg-slate-900/40">
            <div className="mx-auto max-w-4xl px-6 pb-16">
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
          </div>
        )}

        <WaveDivider fillClassName="fill-answer-red/10" flip />

        {/* Bottom CTA */}
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-20 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to play?</h2>
          <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
            <a
              href="/host"
              className="rounded-xl bg-indigo-600 px-10 py-5 text-xl font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:-translate-y-0.5 hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Host a Game
            </a>
            <a
              href="/play"
              className="rounded-xl bg-slate-800 px-10 py-5 text-xl font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Join a Game
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
