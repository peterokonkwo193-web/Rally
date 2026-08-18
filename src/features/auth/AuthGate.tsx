import { useEffect, useState, type ReactNode } from 'react'
import { getCurrentProfile, logout, subscribeToAuthState, type Profile } from '../../lib/auth'
import { AuthContext } from './AuthContext'
import { AuthScreen } from './AuthScreen'
import { CompleteProfileForm } from './CompleteProfileForm'

type GateState =
  | { phase: 'loading' }
  | { phase: 'signed-out' }
  | { phase: 'needs-profile'; userId: string }
  | { phase: 'ready'; profile: Profile }

export function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>({ phase: 'loading' })

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((session) => {
      if (!session) {
        setState({ phase: 'signed-out' })
        return
      }
      getCurrentProfile().then((profile) => {
        setState(
          profile
            ? { phase: 'ready', profile }
            : { phase: 'needs-profile', userId: session.user.id },
        )
      })
    })
    return unsubscribe
  }, [])

  if (state.phase === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p role="status" className="text-slate-400">
          Loading…
        </p>
      </div>
    )
  }

  if (state.phase === 'signed-out') {
    return (
      <AuthScreen
        onSignedIn={() => {
          /* subscribeToAuthState's listener updates state automatically */
        }}
        onSignedUp={(profile) => setState({ phase: 'ready', profile })}
      />
    )
  }

  if (state.phase === 'needs-profile') {
    return (
      <CompleteProfileForm
        userId={state.userId}
        onSuccess={(profile) => setState({ phase: 'ready', profile })}
      />
    )
  }

  return (
    <AuthContext.Provider value={{ profile: state.profile, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
