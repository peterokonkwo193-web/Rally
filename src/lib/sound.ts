// All sound effects are synthesized via the Web Audio API — no audio
// files, no new dependency, no licensing question. Every call site here
// only ever fires from a moment that's already downstream of a real user
// interaction (tapping an answer, a broadcast arriving after the user
// clicked into the game), so there's no browser autoplay-policy issue.

const MUTE_STORAGE_KEY = 'rally:muted'

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioContext) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    audioContext = new Ctor()
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {})
  }
  return audioContext
}

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function setMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, String(muted))
  } catch {
    // localStorage unavailable — mute preference just won't persist.
  }
}

interface Tone {
  freq: number
  startOffset: number
  duration: number
  type?: OscillatorType
}

function playTones(tones: Tone[], gainLevel = 0.15): void {
  if (isMuted()) return
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  for (const tone of tones) {
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = tone.type ?? 'sine'
    oscillator.frequency.value = tone.freq
    oscillator.connect(gain)
    gain.connect(ctx.destination)

    const start = now + tone.startOffset
    const end = start + tone.duration
    // Short envelope so notes don't click at the start/end.
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(gainLevel, start + 0.01)
    gain.gain.linearRampToValueAtTime(0, end)

    oscillator.start(start)
    oscillator.stop(end)
  }
}

/** Countdown tick — call at most once per displayed second. */
export function playTickSound(): void {
  playTones([{ freq: 880, startOffset: 0, duration: 0.08, type: 'square' }], 0.06)
}

export function playCorrectSound(): void {
  // Short ascending major arpeggio.
  playTones([
    { freq: 523.25, startOffset: 0, duration: 0.12 },
    { freq: 659.25, startOffset: 0.1, duration: 0.12 },
    { freq: 783.99, startOffset: 0.2, duration: 0.2 },
  ])
}

export function playWrongSound(): void {
  // Short descending minor-second buzz.
  playTones(
    [
      { freq: 220, startOffset: 0, duration: 0.18, type: 'sawtooth' },
      { freq: 196, startOffset: 0.15, duration: 0.25, type: 'sawtooth' },
    ],
    0.1,
  )
}

/** Neutral chime for the host's own reveal moment — the host doesn't
 * personally answer, so this isn't correct/wrong-flavored. */
export function playRevealFanfare(): void {
  playTones([
    { freq: 659.25, startOffset: 0, duration: 0.1 },
    { freq: 987.77, startOffset: 0.08, duration: 0.25 },
  ])
}

export function playPodiumFanfare(): void {
  // Short victory arpeggio, wider range than the correct-answer chime.
  playTones([
    { freq: 523.25, startOffset: 0, duration: 0.15 },
    { freq: 659.25, startOffset: 0.12, duration: 0.15 },
    { freq: 783.99, startOffset: 0.24, duration: 0.15 },
    { freq: 1046.5, startOffset: 0.36, duration: 0.4 },
  ])
}
