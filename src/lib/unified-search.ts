import { api } from '../api/client'
import { isWatchable } from './acquisition'
import type { Capabilities, LibraryKey } from './capabilities'
import { featureEnabled, libraryEnabled } from './capabilities'
import type { Movie, SearchResult, TVShow } from '../types'

export type SearchScope = 'all' | LibraryKey | 'add'

export type LibraryHit =
  | { kind: 'movie'; item: Movie }
  | { kind: 'tv'; item: TVShow }
  | { kind: 'other'; href: string; title: string; subtitle: string; poster?: string }

type ListRow = { id: string; title?: string; name?: string; poster_url?: string }

const SCOPE_LABELS: Record<SearchScope, string> = {
  all: 'All',
  movies: 'Movies',
  tv: 'TV',
  music: 'Music',
  books: 'Books',
  comics: 'Comics',
  audiobooks: 'Audiobooks',
  homevideos: 'Home Videos',
  musicvideos: 'Music Videos',
  add: 'Add new',
}

export function parseSearchScope(raw: string | null | undefined): SearchScope {
  const v = (raw || 'all').trim().toLowerCase()
  if (v === 'add' || v === 'request') return 'add'
  if (
    v === 'movies' ||
    v === 'tv' ||
    v === 'music' ||
    v === 'books' ||
    v === 'comics' ||
    v === 'audiobooks' ||
    v === 'homevideos' ||
    v === 'musicvideos'
  ) {
    return v
  }
  return 'all'
}

export function searchScopesForCaps(caps: Capabilities): { id: SearchScope; label: string }[] {
  const scopes: { id: SearchScope; label: string }[] = [{ id: 'all', label: SCOPE_LABELS.all }]
  const libs: LibraryKey[] = ['movies', 'tv', 'music', 'books', 'comics', 'audiobooks', 'homevideos', 'musicvideos']
  for (const lib of libs) {
    if (libraryEnabled(caps, lib)) {
      scopes.push({ id: lib, label: SCOPE_LABELS[lib] })
    }
  }
  if (
    featureEnabled(caps, 'search') ||
    featureEnabled(caps, 'request') ||
    libraryEnabled(caps, 'movies') ||
    libraryEnabled(caps, 'tv')
  ) {
    scopes.push({ id: 'add', label: SCOPE_LABELS.add })
  }
  return scopes
}

function rowTitle(m: ListRow) {
  return (m.title || m.name || '').toLowerCase()
}

function scopeIncludesLibrary(scope: SearchScope, lib: LibraryKey): boolean {
  return scope === 'all' || scope === lib
}

function scopeIncludesRemote(scope: SearchScope): boolean {
  return scope === 'all' || scope === 'add' || scope === 'movies' || scope === 'tv'
}

export async function runUnifiedSearch(
  caps: Capabilities,
  query: string,
  scope: SearchScope,
): Promise<{ library: LibraryHit[]; remote: SearchResult[] }> {
  const needle = query.trim().toLowerCase()
  if (needle.length < 2) {
    return { library: [], remote: [] }
  }

  const emptyLib = { items: [] as ListRow[] }
  const tasks: Promise<unknown>[] = []

  if (scopeIncludesLibrary(scope, 'movies') && libraryEnabled(caps, 'movies')) {
    tasks.push(api.listMovies(1, 200))
  } else tasks.push(Promise.resolve({ items: [] as Movie[] }))

  if (scopeIncludesLibrary(scope, 'tv') && libraryEnabled(caps, 'tv')) {
    tasks.push(api.listTVShows(1, 200))
  } else tasks.push(Promise.resolve({ items: [] as TVShow[] }))

  if (scopeIncludesLibrary(scope, 'music') && libraryEnabled(caps, 'music')) {
    tasks.push(api.listMusic().catch(() => emptyLib))
  } else tasks.push(Promise.resolve(emptyLib))

  if (scopeIncludesLibrary(scope, 'books') && libraryEnabled(caps, 'books')) {
    tasks.push(api.listBooks().catch(() => emptyLib))
  } else tasks.push(Promise.resolve(emptyLib))

  if (scopeIncludesLibrary(scope, 'comics') && libraryEnabled(caps, 'comics')) {
    tasks.push(api.listComics().catch(() => emptyLib))
  } else tasks.push(Promise.resolve(emptyLib))

  if (scopeIncludesLibrary(scope, 'audiobooks') && libraryEnabled(caps, 'audiobooks')) {
    tasks.push(api.listAudiobooks().catch(() => emptyLib))
  } else tasks.push(Promise.resolve(emptyLib))

  if (scopeIncludesRemote(scope)) {
    tasks.push(api.search(query.trim()).catch(() => [] as SearchResult[]))
  } else tasks.push(Promise.resolve([] as SearchResult[]))

  const [movies, shows, music, books, comics, audiobooks, tmdb] = (await Promise.all(tasks)) as [
    { items: Movie[] },
    { items: TVShow[] },
    typeof emptyLib,
    typeof emptyLib,
    typeof emptyLib,
    typeof emptyLib,
    SearchResult[],
  ]

  const lib: LibraryHit[] = []

  if (scopeIncludesLibrary(scope, 'movies')) {
    lib.push(
      ...movies.items
        .filter((m) => isWatchable(m) && m.title.toLowerCase().includes(needle))
        .map((item) => ({ kind: 'movie' as const, item })),
    )
  }
  if (scopeIncludesLibrary(scope, 'tv')) {
    lib.push(
      ...shows.items
        .filter((s) => isWatchable(s) && s.title.toLowerCase().includes(needle))
        .map((item) => ({ kind: 'tv' as const, item })),
    )
  }
  if (scopeIncludesLibrary(scope, 'music')) {
    lib.push(
      ...music.items
        .filter((m) => rowTitle(m).includes(needle))
        .map((m) => ({
          kind: 'other' as const,
          href: `/music/${m.id}`,
          title: m.title || m.name || m.id,
          subtitle: 'Music',
          poster: typeof m.poster_url === 'string' ? m.poster_url : undefined,
        })),
    )
  }
  if (scopeIncludesLibrary(scope, 'books')) {
    lib.push(
      ...books.items
        .filter((m) => rowTitle(m).includes(needle))
        .map((m) => ({
          kind: 'other' as const,
          href: `/books/${m.id}`,
          title: m.title || m.name || m.id,
          subtitle: 'Books',
          poster: typeof m.poster_url === 'string' ? m.poster_url : undefined,
        })),
    )
  }
  if (scopeIncludesLibrary(scope, 'comics')) {
    lib.push(
      ...comics.items
        .filter((m) => rowTitle(m).includes(needle))
        .map((m) => ({
          kind: 'other' as const,
          href: '/comics',
          title: m.title || m.name || m.id,
          subtitle: 'Comics',
          poster: typeof m.poster_url === 'string' ? m.poster_url : undefined,
        })),
    )
  }
  if (scopeIncludesLibrary(scope, 'audiobooks')) {
    lib.push(
      ...audiobooks.items
        .filter((m) => rowTitle(m).includes(needle))
        .map((m) => ({
          kind: 'other' as const,
          href: '/audiobooks',
          title: m.title || m.name || m.id,
          subtitle: 'Audiobooks',
          poster: typeof m.poster_url === 'string' ? m.poster_url : undefined,
        })),
    )
  }

  let remote = tmdb
  if (scope === 'movies') remote = remote.filter((r) => r.mediaType === 'movie')
  if (scope === 'tv') remote = remote.filter((r) => r.mediaType === 'tv')
  if (scope === 'add') {
    /* keep remote only — library cleared below when scope is add-only display */
  }

  return { library: scope === 'add' ? [] : lib, remote }
}

export function remoteNotInLibrary(library: LibraryHit[], remote: SearchResult[]): SearchResult[] {
  const titles = new Set(
    library.flatMap((h) => {
      if (h.kind === 'movie' || h.kind === 'tv') {
        return [`${h.kind}:${h.item.title.toLowerCase()}`]
      }
      return []
    }),
  )
  return remote.filter((r) => !titles.has(`${r.mediaType}:${r.title.toLowerCase()}`))
}

export function groupLibraryHits(library: LibraryHit[]) {
  return {
    movies: library.filter((h) => h.kind === 'movie'),
    shows: library.filter((h) => h.kind === 'tv'),
    other: library.filter((h) => h.kind === 'other') as Extract<LibraryHit, { kind: 'other' }>[],
  }
}
