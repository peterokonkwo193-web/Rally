import { useMemo } from 'react'

const COLORS = ['#E5253A', '#1368CE', '#D89E00', '#26890C', '#6366F1', '#EC4899']
const PARTICLE_COUNT = 60

interface Particle {
  left: number
  color: string
  delay: number
  duration: number
  size: number
  rotation: number
}

// Pure CSS particles — no canvas, no library. Runs once per mount (the
// animation is finite, not looping), meant for the podium screens only.
export function Confetti() {
  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: PARTICLE_COUNT }, () => ({
        left: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.6,
        duration: 2.5 + Math.random() * 1.5,
        size: 6 + Math.random() * 6,
        rotation: Math.random() * 360,
      })),
    [],
  )

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes rally-confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0.8; }
        }
      `}</style>
      {particles.map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: 0,
            width: p.size,
            height: p.size * 0.4,
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg)`,
            animation: `rally-confetti-fall ${p.duration}s ease-in ${p.delay}s 1 forwards`,
          }}
        />
      ))}
    </div>
  )
}
