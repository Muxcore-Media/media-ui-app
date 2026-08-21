import { cn } from '../../lib/cn'

/** Shimmering placeholder — never a blank flash while data/images load (AGENTS.md §4.3, §6). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-[var(--radius-md)]', className)} aria-hidden="true" />
}

export function PosterCardSkeleton() {
  return (
    <div className="space-y-2" data-testid="poster-skeleton">
      <Skeleton className="aspect-[2/3] w-full" />
      <Skeleton className="h-3.5 w-4/5" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}

export function ShelfSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-[160px] shrink-0 sm:w-[180px]">
          <PosterCardSkeleton />
        </div>
      ))}
    </div>
  )
}
