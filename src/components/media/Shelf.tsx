import { useId, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';

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
  title: string;
  seeAllHref?: string;
  children: ReactNode;
  testId?: string;
}) {
  const headingId = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateArrows = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <section className="group/shelf space-y-3" data-testid={testId} aria-labelledby={headingId}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-xl font-semibold text-[var(--text-primary)]">
          {title}
        </h2>
        {seeAllHref && (
          <Link
            to={seeAllHref}
            className="text-sm font-medium text-[var(--accent-text)] hover:underline"
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
        {/* Keep endpoint controls mounted so keyboard scrolling never removes focus. */}
        <button
          type="button"
          aria-label="Scroll left"
          aria-disabled={!canScrollLeft}
          tabIndex={canScrollLeft ? 0 : -1}
          onClick={() => { if (canScrollLeft) scrollBy(-1); }}
          className={cn(
            'absolute inset-y-0 left-0 hidden w-10 items-center justify-center bg-gradient-to-r from-[var(--bg-base)] to-transparent opacity-0 transition-opacity group-hover/shelf:opacity-100 focus-visible:visible focus-visible:opacity-100 sm:flex',
            !canScrollLeft && 'invisible',
          )}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-overlay)] text-[var(--text-primary)] shadow-lg">
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </span>
        </button>
        <button
          type="button"
          aria-label="Scroll right"
          aria-disabled={!canScrollRight}
          tabIndex={canScrollRight ? 0 : -1}
          onClick={() => { if (canScrollRight) scrollBy(1); }}
          className={cn(
            'absolute inset-y-0 right-0 hidden w-10 items-center justify-center bg-gradient-to-l from-[var(--bg-base)] to-transparent opacity-0 transition-opacity group-hover/shelf:opacity-100 focus-visible:visible focus-visible:opacity-100 sm:flex',
            !canScrollRight && 'invisible',
          )}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-overlay)] text-[var(--text-primary)] shadow-lg">
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </span>
        </button>
      </div>
    </section>
  );
}

export function ShelfItem({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('w-[38%] shrink-0 sm:w-[28%] md:w-[20%] lg:w-[15%] xl:w-[12%]', className)}>
      {children}
    </div>
  );
}
