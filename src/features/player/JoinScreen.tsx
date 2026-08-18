import { useState, type FormEvent } from 'react'
import { ApiError, callEdgeFunction } from '../../lib/api'
import { RallyLogo } from '../../components/RallyLogo'
import { MuteToggle } from '../../components/MuteToggle'
import { useAuth } from '../auth/AuthContext'
import { useLobbyStore } from '../../stores/useLobbyStore'
import { PlayerGameScreen } from './PlayerGameScreen'

const NICKNAME_MAX_LENGTH = 20

interface JoinSessionResponse {
  playerId: string
  clientToken: string
  sessionId: string
  nickname: string
  avatarStyle: string
  avatarSeed: string
}

interface JoinedPlayer {
  sessionId: string
  playerId: string
  clientToken: string
  nickname: string
  avatarStyle: string
  avatarSeed: string
}

const STORAGE_KEY = 'rally:player'

function persistPlayer(player: JoinedPlayer) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(player))
  } catch {
    // localStorage can be unavailable (private browsing, quota). Not
    // fatal — reconnect (M6) is the only feature that needs it.
  }
}

export function JoinScreen() {
  const { profile, logout } = useAuth()
  const [pin, setPin] = useState('')
  const [nicknameOverride, setNicknameOverride] = useState('')
  const [showNicknameField, setShowNicknameField] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [joined, setJoined] = useState<JoinedPlayer | null>(null)

  const pinValid = /^[0-9]{6}$/.test(pin)
  const nicknameForSubmit = showNicknameField ? nicknameOverride.trim() : ''
  const canSubmit =
    pinValid && (!showNicknameField || nicknameForSubmit.length > 0)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit || submitting) return

    setSubmitting(true)
    setErrorMessage(null)
    try {
      const result = await callEdgeFunction<JoinSessionResponse>(
        'join-session',
        { pin, nickname: nicknameForSubmit || undefined },
      )
      const player: JoinedPlayer = {
        sessionId: result.sessionId,
        playerId: result.playerId,
        clientToken: result.clientToken,
        nickname: result.nickname,
        avatarStyle: result.avatarStyle,
        avatarSeed: result.avatarSeed,
      }
      persistPlayer(player)
      useLobbyStore.getState().setSession(player.sessionId, pin)
      useLobbyStore.getState().setPlayerId(player.playerId)
      setJoined(player)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'DUPLICATE_NICKNAME') {
        setShowNicknameField(true)
        setNicknameOverride((current) => current || profile.displayName)
      }
      setErrorMessage(
        err instanceof ApiError ? err.message : 'Could not join the game.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (joined) {
    return (
      <PlayerGameScreen
        sessionId={joined.sessionId}
        playerId={joined.playerId}
        nickname={joined.nickname}
        avatarStyle={joined.avatarStyle}
        avatarSeed={joined.avatarSeed}
        onGameOver={() => setJoined(null)}
      />
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-10">
      <div className="mb-4 flex w-full max-w-sm items-center justify-between">
        <span className="text-sm text-slate-400">
          Playing as {profile.displayName}
        </span>
        <div className="flex items-center gap-2">
          <MuteToggle />
          <button
            type="button"
            onClick={() => void logout()}
            className="text-sm text-slate-400 underline"
          >
            Log out
          </button>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-5"
      >
        <RallyLogo className="mx-auto w-40 sm:w-48" />
        <h1 className="text-center text-3xl font-bold">Join a game</h1>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-300">Game PIN</span>
          <input
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="123456"
            className="rounded-xl bg-slate-800 px-4 py-4 text-center text-3xl font-bold tracking-[0.3em] text-white placeholder-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          />
        </label>

        {showNicknameField && (
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-300">
              Someone here already has your name — pick one for this game
            </span>
            <input
              autoComplete="off"
              maxLength={NICKNAME_MAX_LENGTH}
              value={nicknameOverride}
              onChange={(e) => setNicknameOverride(e.target.value)}
              placeholder="Your name for this game"
              className="rounded-xl bg-slate-800 px-4 py-4 text-xl text-white placeholder-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            />
          </label>
        )}

        {errorMessage && (
          <p role="alert" className="text-center text-red-400">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="rounded-xl bg-indigo-600 py-4 text-xl font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Joining…' : 'Enter'}
        </button>
      </form>
    </div>
  )
}
