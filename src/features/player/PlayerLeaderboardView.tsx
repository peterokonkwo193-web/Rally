import { useGameStore } from '../../stores/useGameStore'
import { useLobbyStore } from '../../stores/useLobbyStore'

export function PlayerLeaderboardView() {
  const leaderboard = useGameStore((s) => s.leaderboard)
  const playerId = useLobbyStore((s) => s.playerId)

  if (!leaderboard) {
    return (
      <p role="status" className="text-slate-400">
        Loading leaderboard…
      </p>
    )
  }

  const me = leaderboard.find((p) => p.playerId === playerId)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-lg text-slate-400">You're in</p>
      <h1 className="text-7xl font-black text-indigo-300">{me?.rank ?? '—'}</h1>
      <p className="text-2xl font-bold">{me?.score ?? 0} points</p>
      <p role="status" className="mt-4 animate-pulse text-slate-400">
        Waiting for the host to continue…
      </p>
    </div>
  )
}
