import type { ReactNode } from 'react'
import { Film } from 'lucide-react'

/**
 * Full-bleed backdrop header for movie/show detail pages (AGENTS.md §4.4): poster
 * thumbnail, title, metadata row, synopsis, and a primary actions row below.
 */
export function DetailHero({
  backdropUrl,
  posterUrl,
  title,
  tagline,
  meta,
  overview,
  actions,
}: {
  backdropUrl?: string
  posterUrl?: string
  title: string
  tagline?: string
  meta?: ReactNode
  overview?: string
  actions?: ReactNode
}) {
  return (
    <section className="relative -mx-4 -mt-6 overflow-hidden rounded-b-[var(--radius-lg)] sm:-mx-6 lg:-mx-10">
      <div className="relative h-[38vh] min-h-[240px] w-full">
        {backdropUrl ? (
          <img src={backdropUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-top" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-elevated-2)] to-[var(--bg-base)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-base)] via-[var(--bg-base)]/50 to-transparent" />
      </div>

      <div className="relative -mt-24 flex flex-col gap-6 px-4 pb-6 sm:-mt-28 sm:flex-row sm:px-6 lg:px-10">
        <div className="w-32 shrink-0 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-on-media)] bg-[var(--bg-elevated-2)] shadow-2xl sm:w-44">
          {posterUrl ? (
            <img src={posterUrl} alt={title} className="aspect-[2/3] w-full object-cover" />
          ) : (
            <div className="flex aspect-[2/3] flex-col items-center justify-center gap-2 text-[var(--text-tertiary)]">
              <Film className="h-8 w-8" aria-hidden="true" />
              <span className="px-2 text-center text-xs">No poster</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3 pt-2">
          <h1 className="line-clamp-2 text-2xl font-extrabold tracking-tight text-[var(--text-primary)] drop-shadow sm:text-4xl">
            {title}
          </h1>
          {meta && <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">{meta}</div>}
          {tagline && <p className="italic text-[var(--accent-color)]">{tagline}</p>}
          {overview && <p className="max-w-3xl leading-relaxed text-[var(--text-secondary)]">{overview}</p>}
          {actions && <div className="flex flex-wrap gap-3 pt-1">{actions}</div>}
        </div>
      </div>
    </section>
  )
}
