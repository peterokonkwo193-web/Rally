import type { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js'
import { requireSupabase } from './supabase'

/**
 * One broadcast+presence channel per session, named by session id (not the
 * PIN — the PIN is guessable). SPEC.md §8.
 *
 * broadcast.self is always on: the host is a sender that also needs to
 * receive its own events (CLAUDE.md gotcha), and it's harmless for
 * players, who never send broadcasts in M1.
 */
export function getRoomChannel(
  sessionId: string,
  presenceKey?: string,
): RealtimeChannel {
  const supabase = requireSupabase()
  return supabase.channel(`room:${sessionId}`, {
    config: {
      broadcast: { self: true },
      presence: presenceKey ? { key: presenceKey } : undefined,
    },
  })
}

export function subscribeToPresenceSync(
  channel: RealtimeChannel,
  onSync: (state: RealtimePresenceState) => void,
): void {
  channel.on('presence', { event: 'sync' }, () => {
    onSync(channel.presenceState())
  })
}

export function subscribeChannel(
  channel: RealtimeChannel,
  onSubscribed: () => void,
  onError?: (status: string) => void,
): void {
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      onSubscribed()
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      onError?.(status)
    }
  })
}

export async function trackPresence(
  channel: RealtimeChannel,
  payload: Record<string, unknown>,
): Promise<void> {
  await channel.track(payload)
}

export type RosterEntry = {
  playerId: string
  nickname: string
  avatarStyle: string
  avatarSeed: string
}

/** Pure conversion from Supabase's presence-state shape to the roster the
 * host screen renders — kept separate from the subscription plumbing so
 * it's trivially unit-testable. */
export function presenceStateToRoster(
  state: RealtimePresenceState,
): RosterEntry[] {
  return Object.values(state)
    .map((presences) => presences[0])
    .filter((presence): presence is typeof presence & RosterEntry =>
      Boolean(
        presence &&
          'playerId' in presence &&
          'nickname' in presence &&
          'avatarStyle' in presence &&
          'avatarSeed' in presence,
      ),
    )
    .map((presence) => ({
      playerId: presence.playerId as string,
      nickname: presence.nickname as string,
      avatarStyle: presence.avatarStyle as string,
      avatarSeed: presence.avatarSeed as string,
    }))
}
