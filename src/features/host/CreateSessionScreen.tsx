import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, callEdgeFunction } from '../../lib/api'
import { requireSupabase } from '../../lib/supabase'
import { useLobbyStore } from '../../stores/useLobbyStore'
import { useGameStore, type QuestionType } from '../../stores/useGameStore'
import { useGameChannel } from '../../hooks/useGameChannel'
import { RallyLogo } from '../../components/RallyLogo'
import { MuteToggle } from '../../components/MuteToggle'
import { useAuth } from '../auth/AuthContext'
import { LobbyRoster } from './LobbyRoster'
import { HostQuestionView } from './HostQuestionView'
import { HostRevealView } from './HostRevealView'
import { HostLeaderboardView } from './HostLeaderboardView'
import { HostPodiumView } from './HostPodiumView'

type Phase = 'choosing' | 'generating' | 'creating' | 'ready' | 'error'

interface Category {
  id: string
  name: string
}

interface GenerateQuizResponse {
  quizId: string
  title: string
  questionCount: number
}

interface CreateSessionResponse {
  sessionId: string
  pin: string
}

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

export function CreateSessionScreen() {
  const { profile, logout } = useAuth()
  const [phase, setPhase] = useState<Phase>('choosing')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesError, setCategoriesError] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [topic, setTopic] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [startingGame, setStartingGame] = useState(false)
  // /discover and the landing page link here as /host?quizId=<id> to skip
  // straight to hosting a specific existing quiz, no category/generate
  // step. Read once — this is set by the link that brought us here, not
  // something that changes during the page's lifetime.
  const [directQuizId] = useState(() =>
    new URLSearchParams(window.location.search).get('quizId'),
  )
  const { sessionId, pin, setSession } = useLobbyStore((state) => ({
    sessionId: state.sessionId,
    pin: state.pin,
    setSession: state.setSession,
  }))
  const gamePhase = useGameStore((s) => s.phase)

  useGameChannel(phase === 'ready' ? sessionId : null)

  useEffect(() => {
    requireSupabase()
      .from('categories')
      .select('id, name')
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (error || !data) {
          setCategoriesError('Could not load categories.')
          return
        }
        setCategories(data)
        setSelectedCategoryId((current) => current ?? data[0]?.id ?? null)
      })
  }, [])

  const generateAndHost = useCallback(async () => {
    if (!selectedCategoryId) return
    setPhase('generating')
    setErrorMessage(null)
    try {
      const generated = await callEdgeFunction<GenerateQuizResponse>(
        'generate-quiz',
        { categoryId: selectedCategoryId, topic: topic.trim() || undefined, isPublic },
      )
      setPhase('creating')
      const session = await callEdgeFunction<CreateSessionResponse>(
        'create-session',
        { quizId: generated.quizId },
      )
      setSession(session.sessionId, session.pin)
      setPhase('ready')
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? err.message : 'Could not start the game.',
      )
      setPhase('error')
    }
  }, [selectedCategoryId, topic, isPublic, setSession])

  // Arrived via a Discover/landing-page "Host This Quiz" link — go
  // straight to create-session with that quiz, no category/generate step.
  // Guarded by a ref (not just the dependency array) because React 18
  // StrictMode double-invokes mount effects in dev, and without the guard
  // that fires create-session twice — two real sessions/PINs from one
  // page load, which also raced useGameChannel into joining the first
  // session's channel and then immediately abandoning it for the second.
  const directHostStarted = useRef(false)
  useEffect(() => {
    if (!directQuizId || directHostStarted.current) return
    directHostStarted.current = true
    setPhase('creating')
    callEdgeFunction<CreateSessionResponse>('create-session', { quizId: directQuizId })
      .then((session) => {
        setSession(session.sessionId, session.pin)
        setPhase('ready')
      })
      .catch((err) => {
        setErrorMessage(
          err instanceof ApiError ? err.message : 'Could not host that quiz.',
        )
        setPhase('error')
      })
    // Runs once on mount for a static, URL-derived id — deliberately not
    // re-running if setSession's identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directQuizId])

  const startGame = useCallback(async () => {
    if (!sessionId) return
    setStartingGame(true)
    setErrorMessage(null)
    try {
      const resp = await callEdgeFunction<StartQuestionResponse>('start-question', {
        sessionId,
      })
      useGameStore.getState().applyHostStartQuestion(resp)
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? err.message : 'Could not start the game.',
      )
    } finally {
      setStartingGame(false)
    }
  }, [sessionId])

  if (phase === 'ready' && sessionId && pin) {
    if (gamePhase === 'question_active') {
      return <HostQuestionView sessionId={sessionId} />
    }
    if (gamePhase === 'revealing') {
      return <HostRevealView sessionId={sessionId} />
    }
    if (gamePhase === 'leaderboard') {
      return <HostLeaderboardView sessionId={sessionId} />
    }
    if (gamePhase === 'finished') {
      return <HostPodiumView onHostAnother={() => setPhase('choosing')} />
    }

    return (
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center gap-8 px-6 py-10 sm:py-16">
        <div className="text-center">
          <RallyLogo className="mx-auto mb-4 w-24 sm:w-28" />
          <p className="text-lg font-medium text-slate-400 sm:text-xl">
            Join at {window.location.host}
          </p>
          <p
            className="mt-2 text-6xl font-black tracking-widest text-white sm:text-8xl"
            aria-label={`Game PIN ${pin.split('').join(' ')}`}
          >
            {pin}
          </p>
        </div>
        <LobbyRoster sessionId={sessionId} />

        {errorMessage && (
          <p role="alert" className="text-red-400">
            {errorMessage}
          </p>
        )}

        <button
          type="button"
          onClick={startGame}
          disabled={startingGame}
          className="rounded-xl bg-indigo-600 px-10 py-5 text-2xl font-bold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {startingGame ? 'Starting…' : 'Start Game'}
        </button>
      </div>
    )
  }

  if (directQuizId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <RallyLogo className="w-40" />
        {phase === 'error' ? (
          <div role="alert" className="flex flex-col items-center gap-3">
            <p className="text-red-400">{errorMessage}</p>
            <a href="/host" className="text-indigo-300 underline">
              Host a different quiz instead
            </a>
          </div>
        ) : (
          <p role="status" className="text-slate-400">
            Starting your game…
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <div className="flex w-full items-center justify-between">
        <span className="text-sm text-slate-400">Hosting as {profile.displayName}</span>
        <div className="flex items-center gap-2">
          <MuteToggle />
          <button
            type="button"
            onClick={() => void logout()}
            className="text-sm text-slate-400 underline"
          >
            Log out
          </button>
        </div>
      </div>

      <RallyLogo className="w-40 sm:w-48" />
      <h1 className="text-3xl font-bold sm:text-4xl">Host a game</h1>

      <div className="flex w-full flex-col gap-4 text-left">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">Category</span>
          {categoriesError && (
            <p role="alert" className="text-red-400">
              {categoriesError}
            </p>
          )}
          <select
            value={selectedCategoryId ?? ''}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            disabled={categories.length === 0}
            className="rounded-xl bg-slate-800 px-4 py-4 text-lg text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            {categories.length === 0 && <option value="">Loading…</option>}
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">
            Topic (optional)
          </span>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Premier League, 90s movies…"
            maxLength={200}
            className="rounded-xl bg-slate-800 px-4 py-4 text-lg text-white placeholder-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          />
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-5 w-5 rounded accent-indigo-600"
          />
          <span className="text-sm text-slate-300">
            Share this quiz publicly so others can discover and host it
          </span>
        </label>
      </div>

      {(phase === 'choosing' || phase === 'generating' || phase === 'creating') && (
        <button
          type="button"
          onClick={generateAndHost}
          disabled={!selectedCategoryId || phase !== 'choosing'}
          className="w-full rounded-xl bg-indigo-600 px-8 py-4 text-xl font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {phase === 'generating'
            ? 'Generating your quiz…'
            : phase === 'creating'
              ? 'Starting…'
              : 'Generate & Host'}
        </button>
      )}

      {phase === 'error' && (
        <div role="alert" className="flex w-full flex-col items-center gap-3">
          <p className="text-red-400">{errorMessage}</p>
          <button
            type="button"
            onClick={generateAndHost}
            className="w-full rounded-xl bg-indigo-600 px-8 py-4 text-xl font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
