import { useState } from 'react'
import { isMuted, setMuted } from '../lib/sound'

export function MuteToggle() {
  const [muted, setMutedState] = useState(() => isMuted())

  function toggle() {
    const next = !muted
    setMuted(next)
    setMutedState(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      aria-pressed={muted}
      title={muted ? 'Unmute sound' : 'Mute sound'}
      className="rounded-full p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
    >
      {muted ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M16.5 12A4.5 4.5 0 0 0 14 8v1.79l2.48 2.48c.01-.09.02-.18.02-.27ZM19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71ZM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3ZM12 4 9.91 6.09 12 8.18V4Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M3 9v6h4l5 5V4L7 9H3Zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4Zm2.5 0c0 3.17-2.1 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77v2.06c2.9.86 5 3.54 5 6.71Z" />
        </svg>
      )}
    </button>
  )
}
