import { create } from 'zustand'
import type { RosterEntry } from '../lib/realtime'

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'

interface LobbyState {
  sessionId: string | null
  pin: string | null
  playerId: string | null
  roster: RosterEntry[]
  connectionStatus: ConnectionStatus
  setSession: (sessionId: string, pin: string) => void
  setPlayerId: (playerId: string) => void
  setRoster: (roster: RosterEntry[]) => void
  setConnectionStatus: (status: ConnectionStatus) => void
  reset: () => void
}

// Derived UI state only — the authoritative roster lives in Presence, this
// just mirrors it for rendering (CLAUDE.md: "don't duplicate authoritative
// game state client-side"). playerId is the one exception worth a comment:
// it's this client's own identity (returned once by join-session), not
// server state that could drift — safe to hold here alongside sessionId.
export const useLobbyStore = create<LobbyState>((set) => ({
  sessionId: null,
  pin: null,
  playerId: null,
  roster: [],
  connectionStatus: 'idle',
  setSession: (sessionId, pin) => set({ sessionId, pin }),
  setPlayerId: (playerId) => set({ playerId }),
  setRoster: (roster) => set({ roster }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  reset: () =>
    set({ sessionId: null, pin: null, playerId: null, roster: [], connectionStatus: 'idle' }),
}))
