import { useEffect } from 'react'
import { useGameStore } from '../../stores/useGameStore'
import { useLobbyStore } from '../../stores/useLobbyStore'
import { Confetti } from '../../components/Confetti'
import { playPodiumFanfare } from '../../lib/sound'

export function PlayerPodiumView({ onDone }: { onDone: () => void }) {
  const podium = useGameStore((s) => s.podium)
  const playerId = useLobbyStore((s) => s.playerId)

  useEffect(() => {
    if (podium) playPodiumFanfare()
  }, [podium])

  if (!podium) {
    return (
      <p role="status" className="text-slate-400">
        Loading final results…
      </p>
    )
  }

  const me = podium.find((p) => p.playerId === playerId)

  function handleDone() {
    useGameStore.getState().reset()
    useLobbyStore.getState().reset()
    onDone()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <Confetti />
      <h1 className="text-3xl font-bold sm:text-4xl">Game Over</h1>
      <p className="text-lg text-slate-400">You finished</p>
      <p className="text-7xl font-black text-indigo-300">
        {me ? `#${me.rank}` : '—'}
      </p>
      <p className="text-2xl font-bold">{me?.score ?? 0} points</p>

      <button
        type="button"
        onClick={handleDone}
        className="mt-6 rounded-xl bg-indigo-600 px-8 py-4 text-xl font-semibold text-white transition hover:bg-indigo-500"
      >
        Join Another Game
      </button>
    </div>
  )
}
