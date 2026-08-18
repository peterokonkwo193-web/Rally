const BLOBS = [
  { color: 'bg-answer-blue/10', top: '6%', left: '-10%', size: 'h-96 w-96' },
  { color: 'bg-answer-red/10', top: '32%', left: '70%', size: 'h-[28rem] w-[28rem]' },
  { color: 'bg-answer-yellow/10', top: '58%', left: '-6%', size: 'h-96 w-96' },
  { color: 'bg-answer-green/10', top: '80%', left: '65%', size: 'h-[26rem] w-[26rem]' },
  { color: 'bg-answer-blue/10', top: '100%', left: '10%', size: 'h-80 w-80' },
]

/** Large soft color blobs positioned down the full page so scrolling never
 * hits flat, empty background — the whole-page counterpart to the hero-only
 * glow. Purely decorative: absolute, pointer-events-none, aria-hidden. */
export function GradientBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {BLOBS.map((blob, i) => (
        <div
          key={i}
          className={`absolute rounded-full blur-3xl ${blob.color} ${blob.size}`}
          style={{ top: blob.top, left: blob.left }}
        />
      ))}
    </div>
  )
}
