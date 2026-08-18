import { useGameChannel } from '../../hooks/useGameChannel'
import { useGameStore } from '../../stores/useGameStore'
import { useLobbyStore } from '../../stores/useLobbyStore'
import { PlayerWaitingView } from './PlayerWaitingView'
import { PlayerAnswerView } from './PlayerAnswerView'
import { PlayerRevealView } from './PlayerRevealView'
import { PlayerLeaderboardView } from './PlayerLeaderboardView'
import { PlayerPodiumView } from './PlayerPodiumView'

export function PlayerGameScreen({
  sessionId,
  playerId,
  nickname,
  avatarStyle,
  avatarSeed,
  onGameOver,
}: {
  sessionId: string
  playerId: string
  nickname: string
  avatarStyle: string
  avatarSeed: string
  onGameOver: () => void
}) {
  const { phase, kicked } = useGameStore((s) => ({ phase: s.phase, kicked: s.kicked }))

  useGameChannel(sessionId, {
    key: playerId,
    payload: { playerId, nickname, avatarStyle, avatarSeed },
  })

  if (kicked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-3xl font-bold text-red-400">You were removed from this game</h1>
        <p className="text-slate-400">The host removed you from this session.</p>
        <button
          type="button"
          onClick={() => {
            useGameStore.getState().reset()
            useLobbyStore.getState().reset()
            onGameOver()
          }}
          className="mt-4 rounded-xl bg-indigo-600 px-8 py-4 text-xl font-semibold text-white transition hover:bg-indigo-500"
        >
          Join Another Game
        </button>
      </div>
    )
  }

  if (phase === 'question_active') {
    return <PlayerAnswerView sessionId={sessionId} />
  }
  if (phase === 'revealing') {
    return <PlayerRevealView />
  }
  if (phase === 'leaderboard') {
    return <PlayerLeaderboardView />
  }
  if (phase === 'finished') {
    return <PlayerPodiumView onDone={onGameOver} />
  }

  return (
    <PlayerWaitingView
      nickname={nickname}
      avatarStyle={avatarStyle}
      avatarSeed={avatarSeed}
    />
  )
}
