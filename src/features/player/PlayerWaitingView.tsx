import { avatarUrl } from '../../lib/avatars'
import { useLobbyStore } from '../../stores/useLobbyStore'

export function PlayerWaitingView({
  nickname,
  avatarStyle,
  avatarSeed,
}: {
  nickname: string
  avatarStyle: string
  avatarSeed: string
}) {
  const connectionStatus = useLobbyStore((s) => s.connectionStatus)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <img
        src={avatarUrl(avatarStyle, avatarSeed)}
        alt=""
        className="h-24 w-24 rounded-full bg-white sm:h-32 sm:w-32"
      />
      <p className="text-lg text-slate-400">You're in as</p>
      <h1 className="break-words text-4xl font-bold sm:text-5xl">{nickname}</h1>

      {connectionStatus === 'connecting' && (
        <p role="status" className="mt-4 text-slate-400">
          Connecting…
        </p>
      )}
      {connectionStatus === 'connected' && (
        <p role="status" className="mt-4 animate-pulse text-indigo-300">
          Waiting for the host to start the game…
        </p>
      )}
      {connectionStatus === 'error' && (
        <p role="alert" className="mt-4 text-red-400">
          Lost connection to the game. Try reloading.
        </p>
      )}
    </div>
  )
}
