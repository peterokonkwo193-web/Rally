import { createContext, useContext } from 'react'
import type { Profile } from '../../lib/auth'

interface AuthContextValue {
  profile: Profile
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth() called outside <AuthGate>')
  }
  return value
}
