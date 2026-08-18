import { avatarUrl } from '../../lib/avatars'
import { useLobbyStore } from '../../stores/useLobbyStore'
import { useKickPlayer } from '../../hooks/useKickPlayer'

// Pure reader — the channel subscription that populates useLobbyStore now
// lives in useGameChannel (mounted once for the whole session), not here,
// so switching to a question/reveal/leaderboard view never tears down and
// recreates the websocket.
export function LobbyRoster({ sessionId }: { sessionId: string }) {
  const { roster, connectionStatus } = useLobbyStore((state) => ({
    roster: state.roster,
    connectionStatus: state.connectionStatus,
  }))
  const { kick, kickingId } = useKickPlayer(sessionId)

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-2xl font-semibold">Players</h2>
        <span
          className="min-w-[3ch] text-right text-2xl font-bold tabular-nums text-indigo-300"
          aria-live="polite"
        >
          {roster.length}
        </span>
      </div>

      {connectionStatus === 'error' && (
        <p role="alert" className="mb-4 text-red-400">
          Lost connection to the lobby. Players may not appear until this
          reconnects.
        </p>
      )}

      {connectionStatus === 'connecting' && roster.length === 0 && (
        <p role="status" className="text-slate-400">
          Connecting…
        </p>
      )}

      {connectionStatus === 'connected' && roster.length === 0 && (
        <p className="text-slate-400">
          Waiting for players to join — share the PIN above.
        </p>
      )}

      <ul className="flex flex-wrap gap-3">
        {roster.map((player) => (
          <li
            key={player.playerId}
            className="flex items-center gap-2 rounded-lg bg-slate-800 py-2 pl-2 pr-2 text-lg font-medium"
          >
            <img
              src={avatarUrl(player.avatarStyle, player.avatarSeed)}
              alt=""
              className="h-8 w-8 rounded-full bg-white"
            />
            {player.nickname}
            <button
              type="button"
              onClick={() => kick(player.playerId)}
              disabled={kickingId === player.playerId}
              aria-label={`Remove ${player.nickname}`}
              title={`Remove ${player.nickname}`}
              className="ml-1 rounded-full px-2 text-sm text-slate-500 transition hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
