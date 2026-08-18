/** Organic section seam, replacing a flat border — a low-opacity brand-color
 * wave instead of a hard line. `flip` mirrors it vertically so consecutive
 * dividers don't repeat the same silhouette. */
export function WaveDivider({
  fillClassName = 'fill-answer-blue/10',
  flip = false,
}: {
  fillClassName?: string
  flip?: boolean
}) {
  return (
    <div className={`relative h-16 w-full overflow-hidden sm:h-24 ${flip ? 'rotate-180' : ''}`} aria-hidden="true">
      <svg
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        className={`absolute inset-0 h-full w-full ${fillClassName}`}
      >
        <path d="M0,32 C200,96 400,0 600,40 C800,80 1000,16 1200,56 L1200,120 L0,120 Z" />
      </svg>
    </div>
  )
}
