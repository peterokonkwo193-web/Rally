import { useState } from 'react'
import { RallyLogo } from '../../components/RallyLogo'
import type { Profile } from '../../lib/auth'
import { LoginForm } from './LoginForm'
import { SignUpForm } from './SignUpForm'

export function AuthScreen({
  onSignedIn,
  onSignedUp,
}: {
  onSignedIn: () => void
  onSignedUp: (profile: Profile) => void
}) {
  const [mode, setMode] = useState<'login' | 'signup'>('signup')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-10">
      <RallyLogo className="w-40 sm:w-48" />

      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex rounded-xl bg-slate-800 p-1">
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              mode === 'signup' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              mode === 'login' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            Log In
          </button>
        </div>

        {mode === 'signup' ? (
          <SignUpForm onSuccess={onSignedUp} />
        ) : (
          <LoginForm onSuccess={onSignedIn} />
        )}
      </div>
    </div>
  )
}
