import { useId, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/cn'

/**
 * Horizontally scrollable "shelf" row (AGENTS.md §4.2): title + optional "See all",
 * hover arrow controls on desktop, native touch scroll on mobile, and a partial peek
 * of the next card to signal scrollability.
 */
export function Shelf({
  title,
  seeAllHref,
  children,
  testId,
}: {
  title: string
  seeAllHref?: string
  children: ReactNode
  testId?: string
}) {
  const headingId = useId()
  const trackRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const updateArrows = () => {
    const el = trackRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' })
  }

  return (
    <section className="group/shelf space-y-3" data-testid={testId} aria-labelledby={headingId}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-xl font-semibold text-[var(--text-primary)]">
          {title}
        </h2>
        {seeAllHref && (
          <Link
            to={seeAllHref}
            className="text-sm font-medium text-[var(--accent-color)] hover:underline"
            aria-label={`See all ${title}`}
          >
            See all
          </Link>
        )}
      </div>
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={updateArrows}
          className="no-scrollbar flex gap-4 overflow-x-auto scroll-smooth pb-1"
        >
          {children}
        </div>
        {canScrollLeft && (
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollBy(-1)}
            className="absolute inset-y-0 left-0 hidden w-10 items-center justify-center bg-gradient-to-r from-[var(--bg-base)] to-transparent opacity-0 transition-opacity group-hover/shelf:opacity-100 sm:flex"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-overlay)] text-[var(--text-primary)] shadow-lg">
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </span>
          </button>
        )}
        {canScrollRight && (
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollBy(1)}
            className="absolute inset-y-0 right-0 hidden w-10 items-center justify-center bg-gradient-to-l from-[var(--bg-base)] to-transparent opacity-0 transition-opacity group-hover/shelf:opacity-100 sm:flex"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-overlay)] text-[var(--text-primary)] shadow-lg">
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </span>
          </button>
        )}
      </div>
    </section>
  )
}

export function ShelfItem({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('w-[38%] shrink-0 sm:w-[28%] md:w-[20%] lg:w-[15%] xl:w-[12%]', className)}>{children}</div>
}
