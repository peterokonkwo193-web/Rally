import { useEffect, useState } from 'react'

/** True once `active` has been true for longer than `delayMs` — used to
 * show a "still working" message only once a wait has gone on long enough
 * to feel uncertain, rather than flickering it on every loading state. */
export function useDelayedFlag(active: boolean, delayMs = 2500): boolean {
  const [flag, setFlag] = useState(false)

  useEffect(() => {
    if (!active) {
      setFlag(false)
      return
    }
    const timeout = setTimeout(() => setFlag(true), delayMs)
    return () => clearTimeout(timeout)
  }, [active, delayMs])

  return flag
}
