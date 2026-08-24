import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ExternalLink, ListPlus, Play, Star, Tv } from 'lucide-react'
import { api } from '../api/client'
import { usePlaybackAnalysis } from '../components/player/hooks/usePlaybackAnalysis'
import { DetailHero } from '../components/media/DetailHero'
import { DetailHeroSkeleton } from '../components/ui/Skeleton'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { IconButton } from '../components/ui/IconButton'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { enqueue, isFavorite, toggleFavorite } from '../lib/userdata'
import { buildEpisodePlayerHref } from '../lib/playHref'
import { FixedWindowList } from '../components/ui/FixedWindowList'
import type { Episode, TVShow } from '../types'

const EPISODE_ROW_HEIGHT = 72

function firstPlayableStreamUrl(show: TVShow | null): string | undefined {
  if (!show) return undefined
  for (const season of show.seasons ?? []) {
    for (const episode of season.episodes) {
      if (episode.has_file && episode.stream_url) return episode.stream_url
    }
  }
  return undefined
}

export default function TVShowDetail() {
  const { id = '' } = useParams()
  const [show, setShow] = useState<TVShow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [jellyfinURL, setJellyfinURL] = useState<string | null>(null)
  const [fav, setFav] = useState(false)
  const probe = usePlaybackAnalysis(firstPlayableStreamUrl(show))

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      setJellyfinURL(null)
      try {
        const item = await api.getTVShow(id)
        if (!cancelled) {
          setShow(item)
          setFav(isFavorite(item.id))
        }
        const jf = await api.jellyfinPlayURL(id)
        if (!cancelled) setJellyfinURL(jf)
      } catch (err) {
        if (!cancelled) {
          setShow(null)
          setError(err instanceof Error ? err.message : 'Failed to load TV show')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return <DetailHeroSkeleton />
  }

  if (!show) {
    return (
      <div className="space-y-3">
        <ErrorBanner message={error || 'TV show not found.'} />
        <Link to="/tv" className="text-[var(--accent-color)]">
          Back to TV
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8" data-testid="tv-detail-page">
      <DetailHero
        backdropUrl={show.backdrop_url}
        posterUrl={show.poster_url}
        title={show.title}
        overview={show.overview || 'No overview.'}
        meta={
          <>
            {show.has_file && <Badge tone="accent">Available</Badge>}
            {probe.analysis?.info_line ? <Badge tone="neutral">{probe.analysis.info_line}</Badge> : null}
            {show.vote_average > 0 && (
              <Badge tone="neutral">
                <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                {show.vote_average.toFixed(1)}
              </Badge>
            )}
            <span>{show.year || '—'}</span>
            {show.status ? <span>{show.status}</span> : null}
            {show.genres.length > 0 && <span>{show.genres.slice(0, 3).join(' · ')}</span>}
          </>
        }
        actions={
          <>
            <Button
              variant={fav ? 'primary' : 'secondary'}
              icon={<Star className={fav ? 'h-4 w-4 fill-current' : 'h-4 w-4'} aria-hidden="true" />}
              onClick={() => {
                const on = toggleFavorite({
                  id: show.id,
                  kind: 'tv',
                  title: show.title,
                  poster_url: show.poster_url,
                  href: `/tv/${show.id}`,
                  year: show.year,
                })
                setFav(on)
              }}
            >
              {fav ? 'Favorited' : 'Favorite'}
            </Button>
            {jellyfinURL && (
              <a
                href={jellyfinURL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--accent-color)] transition hover:border-[var(--accent-color)]"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Open in linked app
              </a>
            )}
          </>
        }
      />

      {show.seasons && show.seasons.length > 0 ? (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Episodes</h2>
          {show.seasons.map((season) => (
            <div key={season.id} className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                {season.name || `Season ${season.season_number}`}
              </h3>
              <FixedWindowList
                items={season.episodes}
                rowHeight={EPISODE_ROW_HEIGHT}
                className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                getKey={(ep) => ep.id}
                renderRow={(ep) => <EpisodeRow show={show} ep={ep} />}
              />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Tv}
          title="No episodes yet"
          message="Episode listings will appear here once metadata is available for this series."
        />
      )}
    </div>
  )
}

function EpisodeRow({ show, ep }: { show: TVShow; ep: Episode }) {
  const epTitle = `${show.title} S${ep.season_number}E${ep.episode_number}`
  const playTo = buildEpisodePlayerHref(show, ep)

  return (
    <div className="flex h-full flex-wrap items-center justify-between gap-3 px-4 py-3 transition hover:bg-[var(--bg-elevated-2)]">
      <div className="min-w-0">
        <p className="text-sm">
          <span className="font-semibold text-[var(--text-primary)]">
            S{String(ep.season_number).padStart(2, '0')}E{String(ep.episode_number).padStart(2, '0')}
          </span>
          {ep.title ? <span className="text-[var(--text-secondary)]"> · {ep.title}</span> : null}
        </p>
        {ep.overview && <p className="line-clamp-1 text-xs text-[var(--text-tertiary)]">{ep.overview}</p>}
      </div>
      {playTo ? (
        <div className="flex items-center gap-2">
          <Link
            to={playTo}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--accent-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-on-accent)] transition hover:bg-[var(--accent-hover)]"
          >
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            Play
          </Link>
          <IconButton
            icon={<ListPlus className="h-4 w-4" aria-hidden="true" />}
            aria-label={`Add ${epTitle} to queue`}
            size="sm"
            onClick={() =>
              enqueue({
                id: ep.id,
                kind: 'episode',
                title: epTitle,
                href: playTo,
                stream_url: ep.stream_url,
                poster_url: show.poster_url,
              })
            }
          />
        </div>
      ) : (
        <Badge tone="neutral">No file</Badge>
      )}
    </div>
  )
}
