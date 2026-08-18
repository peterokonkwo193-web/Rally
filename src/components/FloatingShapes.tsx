import { useMemo } from 'react'
import { ANSWER_SHAPES } from '../lib/answerShapes'

const SHAPE_PATHS: Record<string, string> = {
  triangle: 'M50,6 94,88 6,88 Z',
  diamond: 'M50,2 96,50 50,98 4,50 Z',
  circle: '', // rendered as a <circle>, not a <path>
  square: 'M14,14 h72 v72 h-72 Z',
}

interface FloatingShape {
  shapeIndex: number
  top: number
  left: number
  size: number
  duration: number
  delay: number
  opacity: number
}

/** Ambient, looping decoration for the landing hero — the four answer
 * shapes drifting slowly in the background, tying the marketing page back
 * to the actual game's visual identity instead of a blank canvas. Purely
 * decorative: pointer-events-none, aria-hidden, never affects layout. */
export function FloatingShapes({ count = 10 }: { count?: number }) {
  const shapes = useMemo<FloatingShape[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        shapeIndex: i % ANSWER_SHAPES.length,
        top: Math.random() * 90,
        left: Math.random() * 92,
        size: 28 + Math.random() * 46,
        duration: 10 + Math.random() * 10,
        delay: -Math.random() * 12,
        opacity: 0.08 + Math.random() * 0.1,
      })),
    [count],
  )

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes rally-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-22px) rotate(8deg); }
        }
      `}</style>
      {shapes.map((s, i) => {
        const shape = ANSWER_SHAPES[s.shapeIndex]
        const fillColor = SHAPE_FILL[shape.shape]
        return (
          <svg
            key={i}
            viewBox="0 0 100 100"
            style={{
              position: 'absolute',
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
              animation: `rally-float ${s.duration}s ease-in-out ${s.delay}s infinite`,
            }}
          >
            {shape.shape === 'circle' ? (
              <circle cx="50" cy="50" r="46" fill={fillColor} />
            ) : (
              <path d={SHAPE_PATHS[shape.shape]} fill={fillColor} />
            )}
          </svg>
        )
      })}
    </div>
  )
}

const SHAPE_FILL: Record<string, string> = {
  triangle: '#E5253A',
  diamond: '#1368CE',
  circle: '#D89E00',
  square: '#26890C',
}
