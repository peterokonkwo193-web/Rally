// True/False gets its own clearly-labeled two-button UI rather than the
// 4-shape grid — "which shape means true" has no established meaning the
// way the shape convention does for regular multiple choice. Position 0 =
// True, position 1 = False (matches how generate-quiz always orders the
// two options).
export function TrueFalseButtons({
  onSelect,
  disabled,
  selectedPosition,
}: {
  onSelect: (position: 0 | 1) => void
  disabled?: boolean
  selectedPosition: number | null
}) {
  return (
    <div className="grid w-full max-w-md grid-cols-2 gap-4">
      <button
        type="button"
        onClick={() => onSelect(0)}
        disabled={disabled}
        aria-pressed={selectedPosition === 0}
        className={`flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl bg-green-600 text-white transition-transform duration-150 ease-out active:scale-90 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed ${
          selectedPosition === 0 ? 'scale-95 ring-4 ring-white' : ''
        } ${disabled && selectedPosition !== 0 ? 'opacity-40' : ''}`}
      >
        <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="white" strokeWidth="3">
          <path d="M4 12l6 6L20 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-2xl font-black">True</span>
      </button>
      <button
        type="button"
        onClick={() => onSelect(1)}
        disabled={disabled}
        aria-pressed={selectedPosition === 1}
        className={`flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl bg-answer-red text-white transition-transform duration-150 ease-out active:scale-90 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed ${
          selectedPosition === 1 ? 'scale-95 ring-4 ring-white' : ''
        } ${disabled && selectedPosition !== 1 ? 'opacity-40' : ''}`}
      >
        <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="white" strokeWidth="3">
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-2xl font-black">False</span>
      </button>
    </div>
  )
}
