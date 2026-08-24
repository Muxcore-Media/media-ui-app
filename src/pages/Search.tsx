import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Search as SearchIcon } from 'lucide-react'
import { api, searchResultKey } from '../api/client'
import MediaCard from '../components/MediaCard'
import RequestableCard from '../components/search/RequestableCard'
import { PosterGridSkeleton } from '../components/media/PosterGrid'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { LoadingStatus } from '../components/ui/LoadingStatus'
import { useCapabilities } from '../lib/capabilities'
import {
  groupLibraryHits,
  parseSearchScope,
  remoteNotInLibrary,
  runUnifiedSearch,
  searchScopesForCaps,
  type SearchScope,
} from '../lib/unified-search'
import type { Movie, SearchResult, TVShow } from '../types'

export default function Search() {
  const { caps } = useCapabilities()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const q = params.get('q')?.trim() || ''
  const scope = parseSearchScope(params.get('scope'))

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [library, setLibrary] = useState<Awaited<ReturnType<typeof runUnifiedSearch>>['library']>([])
  const [remote, setRemote] = useState<SearchResult[]>([])
  const [requested, setRequested] = useState<Record<string, string>>({})

  const scopeOptions = useMemo(() => searchScopesForCaps(caps), [caps])
  const canSearch = q.length >= 2

  const setScope = useCallback(
    (next: SearchScope) => {
      const p = new URLSearchParams(params)
      if (next === 'all') p.delete('scope')
      else p.set('scope', next)
      setParams(p, { replace: true })
    },
    [params, setParams],
  )

  useEffect(() => {
    if (!canSearch) {
      setLibrary([])
      setRemote([])
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    void runUnifiedSearch(caps, q, scope)
      .then((res) => {
        if (cancelled) return
        setLibrary(res.library)
        setRemote(res.remote)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Search failed')
        setLibrary([])
        setRemote([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [caps, q, scope, canSearch])

  const remoteOnly = useMemo(() => remoteNotInLibrary(library, remote), [library, remote])
  const grouped = useMemo(() => groupLibraryHits(library), [library])
  const returnTo = useMemo(() => {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (scope !== 'all') p.set('scope', scope)
    const qs = p.toString()
    return qs ? `/search?${qs}` : '/search'
  }, [q, scope])

  async function request(result: SearchResult) {
    const res = await api.requestTitle({
      tmdbId: result.mediaType === 'movie' || result.mediaType === 'tv' ? result.id : undefined,
      musicbrainzId: result.musicbrainzId,
      releaseGroupId: result.releaseGroupId,
      recordingId: result.recordingId,
      artistName: result.artistName,
      albumTitle: result.albumTitle,
      title: result.title,
      year: result.year,
      overview: result.overview,
      poster: result.poster,
      mediaType: result.mediaType,
    })
    setRequested((prev) => ({ ...prev, [searchResultKey(result)]: res.status || 'requested' }))
  }

  return (
    <div className="space-y-6" data-testid="search-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Search</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          One place to find titles in your library or request something new.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Search filters">
        {scopeOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={scope === opt.id}
            onClick={() => setScope(opt.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              scope === opt.id
                ? 'bg-[var(--accent-color)] text-black'
                : 'border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent-color)] hover:text-[var(--text-primary)]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {!canSearch && (
        <p className="text-sm text-[var(--text-secondary)]">
          Use the search bar in the header and enter at least two characters.
        </p>
      )}

      {error ? <ErrorBanner message={error} /> : null}
      {loading && <LoadingStatus label="Searching" />}
      {loading && <PosterGridSkeleton count={6} />}

      {!loading && grouped.movies.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Movies ({grouped.movies.length})</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {grouped.movies.map((hit) => (
              <MediaCard key={`movie-${(hit as { item: Movie }).item.id}`} item={(hit as { item: Movie }).item} type="movie" />
            ))}
          </div>
        </section>
      )}

      {!loading && grouped.shows.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">TV Shows ({grouped.shows.length})</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {grouped.shows.map((hit) => (
              <MediaCard key={`tv-${(hit as { item: TVShow }).item.id}`} item={(hit as { item: TVShow }).item} type="tv" />
            ))}
          </div>
        </section>
      )}

      {!loading && grouped.other.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Other libraries ({grouped.other.length})</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {grouped.other.map((hit) => (
              <Link
                key={`${hit.subtitle}-${hit.href}-${hit.title}`}
                to={hit.href}
                className="group block overflow-hidden rounded-[var(--radius-md)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
              >
                <div className="motion-safe-hover-lift relative aspect-[2/3] overflow-hidden rounded-[var(--radius-md)] bg-[var(--bg-elevated-2)] shadow-md group-hover:shadow-2xl">
                  {hit.poster ? (
                    <img
                      src={hit.poster}
                      alt=""
                      className="motion-safe-scale h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[var(--text-tertiary)]">
                      {hit.subtitle}
                    </div>
                  )}
                  <Badge tone="neutral" className="absolute left-2 top-2">
                    {hit.subtitle}
                  </Badge>
                </div>
                <div className="space-y-0.5 pt-2">
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)]">{hit.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!loading && remoteOnly.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Add to your library</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {remoteOnly.map((r) => (
              <RequestableCard
                key={searchResultKey(r)}
                item={r}
                requested={requested[searchResultKey(r)]}
                onRequest={(item) => void request(item)}
                returnTo={returnTo}
              />
            ))}
          </div>
        </section>
      )}

      {!loading && canSearch && library.length === 0 && remoteOnly.length === 0 && !error && (
        <EmptyState
          icon={SearchIcon}
          title="No matches"
          message={`No results for "${q}". Try another title or filter.`}
          testId="search-empty"
        />
      )}

      {canSearch && (
        <p className="text-xs text-[var(--text-tertiary)]">
          Showing results for <span className="text-[var(--text-secondary)]">&ldquo;{q}&rdquo;</span>
          {scope !== 'all' ? (
            <>
              {' '}
              in{' '}
              <button type="button" className="text-[var(--accent-color)] hover:underline" onClick={() => setScope('all')}>
                {scopeOptions.find((o) => o.id === scope)?.label ?? scope}
              </button>
            </>
          ) : null}
          .{' '}
          <button type="button" className="text-[var(--accent-color)] hover:underline" onClick={() => navigate('/')}>
            Back home
          </button>
        </p>
      )}
    </div>
  )
}
