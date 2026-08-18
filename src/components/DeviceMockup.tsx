import type { ReactNode } from 'react'
import { ANSWER_SHAPES } from '../lib/answerShapes'

const SHAPE_ICON: Record<string, ReactNode> = {
  triangle: <path d="M12,3 21,19 3,19 Z" />,
  diamond: <path d="M12,2 22,12 12,22 2,12 Z" />,
  circle: <circle cx="12" cy="12" r="9" />,
  square: <path d="M4,4 h16 v16 h-16 Z" />,
}

function ShapeGrid({ size = 'h-6 w-6' }: { size?: string }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {ANSWER_SHAPES.map((shape) => (
        <span
          key={shape.shape}
          className={`flex items-center justify-center rounded ${shape.colorClass} p-1.5`}
        >
          <svg viewBox="0 0 24 24" className={size} fill="white">
            {SHAPE_ICON[shape.shape]}
          </svg>
        </span>
      ))}
    </div>
  )
}

/** Illustrative "project on a screen, answer on your phone" diagram — built
 * entirely from the app's real answer-shape system, not a screenshot or
 * external asset. Purely decorative/explanatory, no live data. */
export function DeviceMockup() {
  return (
    <div className="flex items-center justify-center gap-4 sm:gap-8">
      <div className="w-40 rounded-lg border border-white/10 bg-slate-900 p-3 shadow-xl sm:w-56 sm:p-4">
        <div className="mb-2 h-2 w-3/4 rounded bg-white/20 sm:h-2.5" />
        <div className="mb-3 h-1.5 w-1/2 rounded bg-white/10" />
        <ShapeGrid size="h-4 w-4 sm:h-5 sm:w-5" />
        <div className="mx-auto mt-3 h-1.5 w-10 rounded bg-slate-700 sm:h-2" />
      </div>

      <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 animate-pulse text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <div className="w-20 rounded-xl border border-white/10 bg-slate-900 p-2 shadow-xl sm:w-28 sm:p-3">
        <div className="mx-auto mb-2 h-1 w-6 rounded bg-white/20" />
        <ShapeGrid size="h-3 w-3 sm:h-4 sm:w-4" />
      </div>
    </div>
  )
}
