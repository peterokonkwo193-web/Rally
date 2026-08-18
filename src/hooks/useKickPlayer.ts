import { useState } from 'react'
import { callEdgeFunction } from '../lib/api'

/** Shared between LobbyRoster and HostLeaderboardView — the two natural
 * moments to remove a player (SPEC §12: nickname/behavior abuse is a real
 * classroom requirement). No local roster/leaderboard mutation needed on
 * success — Presence and the next leaderboard broadcast both reflect the
 * removal on their own once the kicked client's connection drops. */
export function useKickPlayer(sessionId: string) {
  const [kickingId, setKickingId] = useState<string | null>(null)

  async function kick(playerId: string) {
    if (kickingId) return
    setKickingId(playerId)
    try {
      await callEdgeFunction('kick-player', { sessionId, playerId })
    } catch (err) {
      console.error('kick-player failed', err)
    } finally {
      setKickingId(null)
    }
  }

  return { kick, kickingId }
}
