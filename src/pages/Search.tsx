import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import MediaCard from '../components/MediaCard'
import Spinner from '../components/Spinner'
import type { Movie, SearchResult, TVShow } from '../types'

type LibraryHit =
  | { kind: 'movie'; item: Movie }
  | { kind: 'tv'; item: TVShow }
  | { kind: 'other'; href: string; title: string; subtitle: string; poster?: string }

export default function Search() {
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [library, setLibrary] = useState<LibraryHit[]>([])
  const [remote, setRemote] = useState<SearchResult[]>([])
  const [requested, setRequested] = useState<Record<number, string>>({})

  const canSearch = q.trim().length >= 2

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault()
    if (!canSearch) return
    setLoading(true)
    setError(null)
    try {
      const needle = q.trim().toLowerCase()
      const [movies, shows, music, books, comics, audiobooks, tmdb] = await Promise.all([
        api.listMovies(1, 200),
        api.listTVShows(1, 200),
        api.listMusic().catch(() => ({ items: [] as Array<{ id: string; title?: string; name?: string; poster_url?: string }> })),
        api.listBooks().catch(() => ({ items: [] as Array<{ id: string; title?: string; name?: string; poster_url?: string }> })),
        api.listComics().catch(() => ({ items: [] as Array<{ id: string; title?: string; name?: string; poster_url?: string }> })),
        api.listAudiobooks().catch(() => ({ items: [] as Array<{ id: string; title?: string; name?: string; poster_url?: string }> })),
        api.search(q.trim()),
      ])
      const rowTitle = (m: { title?: string; name?: string }) => (m.title || m.name || '').toLowerCase()
      const lib: LibraryHit[] = [
        ...movies.items
          .filter((m) => m.title.toLowerCase().includes(needle))
          .map((item) => ({ kind: 'movie' as const, item })),
        ...shows.items
          .filter((s) => s.title.toLowerCase().includes(needle))
          .map((item) => ({ kind: 'tv' as const, item })),
        ...music.items
          .filter((m) => rowTitle(m).includes(needle))
          .map((m) => ({
            kind: 'other' as const,
            href: `/music/${m.id}`,
            title: m.title || m.name || m.id,
            subtitle: 'Music',
            poster: typeof m.poster_url === 'string' ? m.poster_url : undefined,
          })),
        ...books.items
          .filter((m) => rowTitle(m).includes(needle))
          .map((m) => ({
            kind: 'other' as const,
            href: `/books/${m.id}`,
            title: m.title || m.name || m.id,
            subtitle: 'Books',
            poster: typeof m.poster_url === 'string' ? m.poster_url : undefined,
          })),
        ...comics.items
          .filter((m) => rowTitle(m).includes(needle))
          .map((m) => ({
            kind: 'other' as const,
            href: `/comics`,
            title: m.title || m.name || m.id,
            subtitle: 'Comics',
            poster: typeof m.poster_url === 'string' ? m.poster_url : undefined,
          })),
        ...audiobooks.items
          .filter((m) => rowTitle(m).includes(needle))
          .map((m) => ({
            kind: 'other' as const,
            href: `/audiobooks`,
            title: m.title || m.name || m.id,
            subtitle: 'Audiobooks',
            poster: typeof m.poster_url === 'string' ? m.poster_url : undefined,
          })),
      ]
      setLibrary(lib)
      setRemote(tmdb)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setLibrary([])
      setRemote([])
    } finally {
      setLoading(false)
    }
  }

  const remoteOnly = useMemo(() => {
    const titles = new Set(
      library.flatMap((h) => {
        if (h.kind === 'movie' || h.kind === 'tv') {
          return [`${h.kind}:${h.item.title.toLowerCase()}`]
        }
        return []
      }),
    )
    return remote.filter((r) => !titles.has(`${r.mediaType}:${r.title.toLowerCase()}`))
  }, [library, remote])

  async function request(result: SearchResult) {
    const res = await api.requestTitle({
      tmdbId: result.id,
      title: result.title,
      year: result.year,
      overview: result.overview,
      poster: result.poster,
      mediaType: result.mediaType,
    })
    setRequested((prev) => ({ ...prev, [result.id]: res.status || 'requested' }))
  }

  return (
    <div className="space-y-8" data-testid="search-page">
      <div>
        <h1 className="text-2xl font-bold">Search</h1>
        <p className="text-sm text-[var(--muted)]">
          Search movies, TV, music, books, comics, and audiobooks — then TMDB to request missing titles.
        </p>
      </div>

      <form onSubmit={runSearch} className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Movies, series, music, books…"
          className="min-w-[16rem] flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          data-testid="search-input"
        />
        <button
          type="submit"
          disabled={!canSearch || loading}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && (
        <p className="rounded-md border border-red-500/40 bg-[var(--surface)] px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      {loading && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {!loading && library.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">In your library ({library.length})</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {library.map((hit) => {
              if (hit.kind === 'movie' || hit.kind === 'tv') {
                return <MediaCard key={`${hit.kind}-${hit.item.id}`} item={hit.item} type={hit.kind} />
              }
              return (
                <Link
                  key={`${hit.subtitle}-${hit.href}-${hit.title}`}
                  to={hit.href}
                  className="group block overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] transition hover:border-[var(--accent)]"
                >
                  <div className="relative aspect-[2/3] bg-[var(--surface-2)]">
                    {hit.poster ? (
                      <img src={hit.poster} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
                        {hit.subtitle}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 p-3">
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{hit.title}</h3>
                    <p className="text-xs text-[var(--muted)]">{hit.subtitle}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {!loading && remoteOnly.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Request from TMDB</h2>
          <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            {remoteOnly.map((r) => (
              <li key={`${r.mediaType}-${r.id}`} className="flex items-center gap-3 px-4 py-3">
                <div className="h-16 w-11 shrink-0 overflow-hidden rounded bg-[var(--surface-2)]">
                  {r.poster ? (
                    <img
                      src={r.poster.startsWith('/') ? `https://image.tmdb.org/t/p/w185${r.poster}` : r.poster}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.title}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {r.year || '—'} · {r.mediaType}
                  </p>
                </div>
                {requested[r.id] ? (
                  <span className="text-xs text-[var(--accent)]">{requested[r.id]}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void request(r)}
                    className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-semibold hover:border-[var(--accent)]"
                  >
                    Request
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && canSearch && library.length === 0 && remote.length === 0 && !error && (
        <p className="text-sm text-[var(--muted)]">No matches. Try another title.</p>
      )}

      <p className="text-xs text-[var(--muted)]">
        Tip: open <Link className="text-[var(--accent)]" to="/favorites">Favorites</Link> or{' '}
        <Link className="text-[var(--accent)]" to="/settings">Settings</Link> for Jellyfin-parity user prefs.
      </p>
    </div>
  )
}
