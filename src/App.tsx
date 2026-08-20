import { lazy, Suspense } from 'react'
import { isSupabaseConfigured } from './lib/supabase'
import { AuthGate } from './features/auth/AuthGate'

// Route-level code-splitting — each route pulls in a meaningfully
// different slice of the app (host quiz-editor + game-master views,
// player game UI, landing decoration, discover grid), and a visitor to
// any one of these previously downloaded all of them in a single bundle.
// A landing-page-only visitor now never fetches host/player game code.
const CreateSessionScreen = lazy(() =>
  import('./features/host/CreateSessionScreen').then((m) => ({ default: m.CreateSessionScreen })),
)
const JoinScreen = lazy(() =>
  import('./features/player/JoinScreen').then((m) => ({ default: m.JoinScreen })),
)
const LandingPage = lazy(() =>
  import('./features/landing/LandingPage').then((m) => ({ default: m.LandingPage })),
)
const DiscoverScreen = lazy(() =>
  import('./features/discover/DiscoverScreen').then((m) => ({ default: m.DiscoverScreen })),
)

function RouteFallback() {
  return <div className="min-h-screen bg-slate-950" />
}

function SupabaseNotConfigured() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold text-red-400">
        Supabase is not configured
      </h1>
      <p className="max-w-md text-slate-400">
        Copy <code className="rounded bg-slate-800 px-1.5 py-0.5">.env.example</code> to{' '}
        <code className="rounded bg-slate-800 px-1.5 py-0.5">.env</code> and fill in{' '}
        <code className="rounded bg-slate-800 px-1.5 py-0.5">VITE_SUPABASE_URL</code> and{' '}
        <code className="rounded bg-slate-800 px-1.5 py-0.5">VITE_SUPABASE_ANON_KEY</code>{' '}
        from your Supabase project's API settings, then restart the dev server.
      </p>
    </div>
  )
}

// No router dependency (SPEC's stack list doesn't include one) — a plain
// path check is enough. / and /discover are public (no account needed to
// see what Rally is or browse what's on it); /host and /play sit behind
// AuthGate exactly as before, just moved off the default route.
function App() {
  if (!isSupabaseConfigured) {
    return <SupabaseNotConfigured />
  }

  const path = window.location.pathname

  if (path.startsWith('/host')) {
    return (
      <AuthGate>
        <Suspense fallback={<RouteFallback />}>
          <CreateSessionScreen />
        </Suspense>
      </AuthGate>
    )
  }
  if (path.startsWith('/play')) {
    return (
      <AuthGate>
        <Suspense fallback={<RouteFallback />}>
          <JoinScreen />
        </Suspense>
      </AuthGate>
    )
  }
  if (path.startsWith('/discover')) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <DiscoverScreen />
      </Suspense>
    )
  }
  return (
    <Suspense fallback={<RouteFallback />}>
      <LandingPage />
    </Suspense>
  )
}

export default App
