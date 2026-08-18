import { useEffect, useState } from 'react'
import { fetchCategoryNames, type CategoryName } from '../lib/discover'

/** Horizontally auto-scrolling strip of real category names — the list is
 * duplicated back-to-back and the animation runs exactly one list-length so
 * the loop is seamless. Renders nothing until categories are loaded, and
 * nothing at all if there are none — no placeholder categories. */
export function CategoryMarquee() {
  const [categories, setCategories] = useState<CategoryName[]>([])

  useEffect(() => {
    fetchCategoryNames()
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  if (categories.length === 0) return null

  const items = [...categories, ...categories]

  return (
    <div className="relative w-full overflow-hidden py-3" aria-hidden="true">
      <div
        className="flex w-max gap-3"
        style={{ animation: `rally-marquee ${categories.length * 3}s linear infinite` }}
      >
        {items.map((category, i) => (
          <span
            key={`${category.id}-${i}`}
            className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-slate-300"
          >
            {category.name}
          </span>
        ))}
      </div>
    </div>
  )
}
