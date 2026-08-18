import { useEffect, useState } from 'react'

// Server-owns-time helpers (SPEC.md §3.1). The client never sends a
// timestamp anywhere — these exist purely to render a display-only
// countdown that's corrected for clock skew against the server.

/** offsetMs such that Date.now() + offsetMs ≈ the server's clock. Computed
 * once per `question_start` broadcast (or any server timestamp), from the
 * `serverNow` value the edge function stamped at the same instant it
 * computed `endsAt`. */
export function computeClockOffset(serverNowIso: string): number {
  return new Date(serverNowIso).getTime() - Date.now()
}

function remainingSeconds(endsAtIso: string, offsetMs: number): number {
  const endsAtMs = new Date(endsAtIso).getTime()
  const correctedNowMs = Date.now() + offsetMs
  return Math.max(0, (endsAtMs - correctedNowMs) / 1000)
}

/** Ticks a display-only countdown to `endsAtIso`, corrected by `offsetMs`.
 * Pass `null` for endsAtIso when there's nothing to count down to. */
export function useCountdown(
  endsAtIso: string | null,
  offsetMs: number,
): number {
  const [seconds, setSeconds] = useState(() =>
    endsAtIso ? remainingSeconds(endsAtIso, offsetMs) : 0,
  )

  useEffect(() => {
    if (!endsAtIso) {
      setSeconds(0)
      return
    }
    setSeconds(remainingSeconds(endsAtIso, offsetMs))
    const interval = setInterval(() => {
      setSeconds(remainingSeconds(endsAtIso, offsetMs))
    }, 100)
    return () => clearInterval(interval)
  }, [endsAtIso, offsetMs])

  return seconds
}
