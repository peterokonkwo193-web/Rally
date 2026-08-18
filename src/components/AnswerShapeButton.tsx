import { ANSWER_SHAPES } from '../lib/answerShapes'

function ShapeIcon({ shape }: { shape: string }) {
  const common = { viewBox: '0 0 100 100', className: 'h-1/2 w-1/2', fill: 'white' }
  switch (shape) {
    case 'triangle':
      return (
        <svg {...common}>
          <polygon points="50,8 94,88 6,88" />
        </svg>
      )
    case 'diamond':
      return (
        <svg {...common}>
          <polygon points="50,4 96,50 50,96 4,50" />
        </svg>
      )
    case 'circle':
      return (
        <svg {...common}>
          <circle cx="50" cy="50" r="44" />
        </svg>
      )
    case 'square':
      return (
        <svg {...common}>
          <rect x="10" y="10" width="80" height="80" rx="8" />
        </svg>
      )
    default:
      return null
  }
}

export function AnswerShapeButton({
  position,
  onClick,
  disabled,
  selected,
}: {
  position: 0 | 1 | 2 | 3
  onClick: () => void
  disabled?: boolean
  selected?: boolean
}) {
  const shape = ANSWER_SHAPES[position]

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={shape.label}
      aria-pressed={selected}
      className={`flex aspect-square w-full items-center justify-center rounded-2xl transition-transform duration-150 ease-out active:scale-90 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed ${shape.colorClass} ${
        selected ? 'scale-95 ring-4 ring-white' : ''
      } ${disabled && !selected ? 'opacity-40' : ''}`}
    >
      <ShapeIcon shape={shape.shape} />
    </button>
  )
}
