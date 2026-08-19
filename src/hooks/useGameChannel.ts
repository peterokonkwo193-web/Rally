import { useEffect } from 'react'
import {
  getRoomChannel,
  presenceStateToRoster,
  subscribeChannel,
  subscribeToPresenceSync,
  trackPresence,
} from '../lib/realtime'
import { requireSupabase } from '../lib/supabase'
import { useLobbyStore } from '../stores/useLobbyStore'
import { useGameStore } from '../stores/useGameStore'

/**
 * One channel subscription for the entire time a client is "in a
 * session" — lobby through podium. Every broadcast listener is
 * registered up front (channel.on() has to happen before .subscribe()
 * anyway) and writes straight into useGameStore/useLobbyStore, so phase
 * transitions never tear down and recreate the websocket the way a
 * per-screen subscription would.
 */
export function useGameChannel(
  sessionId: string | null,
  presence?: { key: string; payload: Record<string, unknown> },
) {
  const setRoster = useLobbyStore((s) => s.setRoster)
  const setConnectionStatus = useLobbyStore((s) => s.setConnectionStatus)

  useEffect(() => {
    if (!sessionId) return

    // Guards against a stale channel instance's terminal status (e.g. the
    // CLOSED it gets from this same effect's own cleanup on unmount/
    // sessionId-change) landing after a newer effect run already has its
    // own channel connected, which would otherwise overwrite 'connected'
    // with 'error' for a channel nothing is using anymore.
    let stale = false

    setConnectionStatus('connecting')
    const channel = getRoomChannel(sessionId, presence?.key)

    subscribeToPresenceSync(channel, (state) => {
      setRoster(presenceStateToRoster(state))
    })

    channel.on('broadcast', { event: 'question_start' }, ({ payload }) => {
      useGameStore.getState().onQuestionStart(payload as never)
    })
    channel.on('broadcast', { event: 'answer_count' }, ({ payload }) => {
      useGameStore.getState().setAnswerCount(payload as never)
    })
    channel.on('broadcast', { event: 'question_end' }, ({ payload }) => {
      useGameStore.getState().onQuestionEnd(payload as never)
    })
    channel.on('broadcast', { event: 'leaderboard' }, ({ payload }) => {
      useGameStore.getState().onLeaderboard(payload as never)
    })
    channel.on('broadcast', { event: 'game_over' }, ({ payload }) => {
      useGameStore.getState().onGameOver(payload as never)
    })
    channel.on('broadcast', { event: 'player_kicked' }, ({ payload }) => {
      // Broadcast to the whole room — only the client whose own presence
      // key matches the kicked playerId reacts. Host never passes
      // `presence`, so this is a no-op for the host, which is correct.
      if (presence && (payload as { playerId?: string }).playerId === presence.key) {
        useGameStore.getState().onPlayerKicked()
      }
    })

    subscribeChannel(
      channel,
      () => {
        if (stale) return
        if (presence) trackPresence(channel, presence.payload)
        setConnectionStatus('connected')
      },
      () => {
        if (stale) return
        setConnectionStatus('error')
      },
    )

    return () => {
      stale = true
      requireSupabase().removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])
}
