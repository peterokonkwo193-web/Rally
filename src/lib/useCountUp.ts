import { useEffect, useState } from 'react'

/** Animates from 0 to `target` over `durationMs` once `target` is known.
 * Purely presentational — the value itself is never fabricated by this
 * hook, only its reveal is animated. */
export function useCountUp(target: number | null, durationMs = 700): number {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (target === null) {
      setValue(0)
      return
    }

    const start = Date.now()
    let frame: number

    const tick = () => {
      const progress = Math.min(1, (Date.now() - start) / durationMs)
      setValue(Math.round(target * progress))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs])

  return value
}
