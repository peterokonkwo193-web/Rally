import { useEffect } from 'react'
import { useGameStore } from '../../stores/useGameStore'
import { useLobbyStore } from '../../stores/useLobbyStore'
import { avatarUrl } from '../../lib/avatars'
import { Confetti } from '../../components/Confetti'
import { playPodiumFanfare } from '../../lib/sound'

export function HostPodiumView({ onHostAnother }: { onHostAnother: () => void }) {
  const podium = useGameStore((s) => s.podium)

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

  const [first, second, third, ...rest] = podium

  function handleHostAnother() {
    useGameStore.getState().reset()
    useLobbyStore.getState().reset()
    onHostAnother()
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-8 px-6 py-10 text-center">
      <Confetti />
      <h1 className="text-4xl font-bold sm:text-5xl">Final Results</h1>

      <div className="flex w-full items-end justify-center gap-3">
        {second && <PodiumSpot player={second} heightClass="h-28" />}
        {first && <PodiumSpot player={first} heightClass="h-36" />}
        {third && <PodiumSpot player={third} heightClass="h-20" />}
      </div>

      {rest.length > 0 && (
        <ol className="flex w-full flex-col gap-2">
          {rest.map((player) => (
            <li
              key={player.playerId}
              className="flex items-center gap-4 rounded-xl bg-slate-800 px-5 py-2 text-left"
            >
              <span className="w-8 font-bold text-indigo-300">{player.rank}</span>
              <span className="flex-1">{player.nickname}</span>
              <span className="font-bold tabular-nums">{player.score}</span>
            </li>
          ))}
        </ol>
      )}

      <button
        type="button"
        onClick={handleHostAnother}
        className="rounded-xl bg-indigo-600 px-8 py-4 text-xl font-semibold text-white transition hover:bg-indigo-500"
      >
        Host Another Game
      </button>
    </div>
  )
}

function PodiumSpot({
  player,
  heightClass,
}: {
  player: { nickname: string; score: number; avatarStyle: string; avatarSeed: string; rank: number }
  heightClass: string
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <img
        src={avatarUrl(player.avatarStyle, player.avatarSeed)}
        alt=""
        className="h-14 w-14 rounded-full bg-white sm:h-16 sm:w-16"
      />
      <span className="max-w-full truncate text-sm font-semibold sm:text-base">
        {player.nickname}
      </span>
      <span className="text-sm text-slate-300">{player.score}</span>
      <div
        className={`flex w-full items-start justify-center rounded-t-lg bg-indigo-600 pt-2 text-2xl font-black text-white ${heightClass}`}
      >
        {player.rank}
      </div>
    </div>
  )
}
