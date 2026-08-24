import { Link } from 'react-router-dom'
import { Info, Play, Star } from 'lucide-react'
import { Badge } from '../ui/Badge'

export type HeroItem = {
  id: string
  title: string
  overview: string
  year?: number
  vote_average?: number
  genres?: string[]
  backdropUrl?: string
  posterUrl?: string
  playHref: string
  detailHref: string
  ready?: boolean
}

/**
 * Full-bleed featured banner (AGENTS.md §4.2): backdrop image, gradient scrim so nav/text
 * stay legible, metadata chips, and primary Play / More Info actions.
 */
export function HeroBanner({ item }: { item: HeroItem }) {
  const backdrop = item.backdropUrl || item.posterUrl

  return (
    <section className="relative -mx-4 -mt-6 h-[52vh] min-h-[360px] overflow-hidden rounded-b-[var(--radius-lg)] sm:-mx-6 lg:-mx-10 lg:h-[64vh]">
      {backdrop ? (
        <img
          src={backdrop}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-elevated-2)] to-[var(--bg-base)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-base)] via-[var(--bg-base)]/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-base)]/80 via-transparent to-transparent" />

      <div className="relative flex h-full max-w-[1920px] flex-col justify-end gap-4 px-4 pb-8 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
          {item.ready && <Badge tone="accent">Available now</Badge>}
          {typeof item.vote_average === 'number' && item.vote_average > 0 && (
            <Badge tone="neutral">
              <Star className="h-3 w-3 fill-current" aria-hidden="true" />
              {item.vote_average.toFixed(1)}
            </Badge>
          )}
          {item.year ? <span>{item.year}</span> : null}
          {item.genres && item.genres.length > 0 ? <span>{item.genres.slice(0, 3).join(' · ')}</span> : null}
        </div>

        <h1 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-[var(--text-primary)] drop-shadow-lg sm:text-5xl">
          {item.title}
        </h1>

        {item.overview && (
          <p className="line-clamp-3 max-w-xl text-sm text-[var(--text-secondary)] drop-shadow sm:text-base">
            {item.overview}
          </p>
        )}

        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            to={item.playHref}
            className="inline-flex h-12 items-center justify-center gap-2.5 rounded-[var(--radius-md)] bg-[var(--accent-color)] px-6 text-base font-semibold text-[var(--text-on-accent)] transition hover:bg-[var(--accent-hover)]"
          >
            <Play className="h-5 w-5 fill-current" aria-hidden="true" />
            Play
          </Link>
          <Link
            to={item.detailHref}
            className="inline-flex h-12 items-center justify-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--border-on-media)] bg-[var(--surface-glass)] px-6 text-base font-semibold text-[var(--text-primary)] backdrop-blur transition hover:bg-[var(--surface-glass-hover)]"
          >
            <Info className="h-5 w-5" aria-hidden="true" />
            More info
          </Link>
        </div>
      </div>
    </section>
  )
}
