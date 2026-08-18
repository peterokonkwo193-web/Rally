import { isSupabaseConfigured } from './lib/supabase'
import { AuthGate } from './features/auth/AuthGate'
import { CreateSessionScreen } from './features/host/CreateSessionScreen'
import { JoinScreen } from './features/player/JoinScreen'
import { LandingPage } from './features/landing/LandingPage'
import { DiscoverScreen } from './features/discover/DiscoverScreen'

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
        <CreateSessionScreen />
      </AuthGate>
    )
  }
  if (path.startsWith('/play')) {
    return (
      <AuthGate>
        <JoinScreen />
      </AuthGate>
    )
  }
  if (path.startsWith('/discover')) {
    return <DiscoverScreen />
  }
  return <LandingPage />
}

export default App
