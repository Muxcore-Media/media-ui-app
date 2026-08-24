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
    <div className="flex gap-4 overflow-hidden" data-testid="shelf-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-[160px] shrink-0 sm:w-[180px]">
          <PosterCardSkeleton />
        </div>
      ))}
    </div>
  )
}

/** Featured hero placeholder for Home while catalog data loads. */
export function HeroBannerSkeleton() {
  return (
    <section
      className="relative -mx-4 -mt-6 h-[52vh] min-h-[360px] overflow-hidden rounded-b-[var(--radius-lg)] sm:-mx-6 lg:-mx-10 lg:h-[64vh]"
      data-testid="hero-skeleton"
      aria-hidden="true"
    >
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-base)] via-[var(--bg-base)]/40 to-transparent" />
      <div className="relative flex h-full flex-col justify-end gap-4 px-4 pb-8 sm:px-6 lg:px-10">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-2/3 max-w-lg" />
        <Skeleton className="h-16 w-full max-w-xl" />
        <div className="flex gap-3">
          <Skeleton className="h-12 w-28" />
          <Skeleton className="h-12 w-32" />
        </div>
      </div>
    </section>
  )
}

/** Full-screen player shell while the player route chunk loads. */
export function PlayerSkeleton() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[var(--player-bg)]"
      data-testid="player-skeleton"
      aria-busy="true"
      aria-label="Loading player"
    >
      <Skeleton className="min-h-0 flex-1 rounded-none" />
      <div className="flex items-center gap-3 px-4 py-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
        <Skeleton className="h-4 max-w-xs flex-1" />
        <Skeleton className="h-2 flex-1 rounded-full" />
      </div>
    </div>
  )
}

/** Live TV page shell while the route chunk loads (guide layout with player pane). */
export function LiveTVSkeleton() {
  return (
    <div className="space-y-4" data-testid="livetv-skeleton" aria-busy="true" aria-label="Loading Live TV">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="max-h-[70vh] space-y-0 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border-b border-[var(--border-subtle)] px-3 py-2 last:border-0">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="mt-1.5 h-3 w-2/3" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="aspect-video w-full rounded-[var(--radius-md)]" />
          <Skeleton className="h-16 w-full rounded-[var(--radius-md)]" />
        </div>
      </div>
    </div>
  )
}

/** Settings page shell while the route chunk loads. */
export function SettingsSkeleton() {
  return (
    <div className="space-y-6" data-testid="settings-skeleton" aria-busy="true" aria-label="Loading settings">
      <div className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <div className="flex flex-wrap gap-1 border-b border-[var(--border-subtle)] pb-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24" />
        ))}
      </div>
      <div className="max-w-xl space-y-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-28" />
      </div>
    </div>
  )
}

/** Simple form page shell (Quick Connect, forgot password, invite join). */
export function FormPageSkeleton({ label = 'Loading page' }: { label?: string }) {
  return (
    <div
      className="mx-auto max-w-md space-y-6 py-8"
      data-testid="form-page-skeleton"
      aria-busy="true"
      aria-label={label}
    >
      <div className="space-y-2 text-center">
        <Skeleton className="mx-auto h-11 w-11 rounded-full" />
        <Skeleton className="mx-auto h-8 w-48" />
        <Skeleton className="mx-auto h-4 w-full max-w-sm" />
      </div>
      <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

/** Play queue list shell while the route chunk loads. */
export function QueueListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-6" data-testid="queue-skeleton" aria-busy="true" aria-label="Loading queue">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <div className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-14 w-10 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Detail page header placeholder (movie/show) — preserves layout without CLS. */
export function DetailHeroSkeleton() {
  return (
    <section
      className="relative -mx-4 -mt-6 overflow-hidden rounded-b-[var(--radius-lg)] sm:-mx-6 lg:-mx-10"
      data-testid="detail-hero-skeleton"
      aria-busy="true"
      aria-label="Loading title details"
    >
      <Skeleton className="h-[38vh] min-h-[240px] w-full rounded-none" />
      <div className="relative -mt-24 flex flex-col gap-6 px-4 pb-6 sm:-mt-28 sm:flex-row sm:px-6 lg:px-10">
        <Skeleton className="aspect-[2/3] w-32 shrink-0 sm:w-44" />
        <div className="min-w-0 flex-1 space-y-3 pt-2">
          <Skeleton className="h-9 w-3/4 max-w-md sm:h-11" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-20 w-full max-w-3xl" />
          <div className="flex flex-wrap gap-3 pt-1">
            <Skeleton className="h-11 w-24" />
            <Skeleton className="h-11 w-28" />
            <Skeleton className="h-11 w-24" />
          </div>
        </div>
      </div>
    </section>
  )
}
