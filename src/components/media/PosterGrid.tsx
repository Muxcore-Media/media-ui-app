import type { ReactNode } from 'react'
import { PosterCardSkeleton } from '../ui/Skeleton'

/**
 * Responsive poster grid (AGENTS.md §4.3): auto-fit columns instead of a fixed count,
 * consistent 2:3 aspect ratio, and shimmer skeletons instead of a blocking spinner.
 */
export function PosterGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{children}</div>
  )
}

export function PosterGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <PosterGrid>
      {Array.from({ length: count }).map((_, i) => (
        <PosterCardSkeleton key={i} />
      ))}
    </PosterGrid>
  )
}
