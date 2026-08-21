import type { MediaRequest, Movie, TVShow } from '../types'

/** True when the title can be played from the library right now. */
export function isWatchable(item: { has_file: boolean }): boolean {
  return item.has_file
}

/** Request-media statuses that mean acquisition is still underway. */
export function isActiveRequestStatus(status: string | undefined): boolean {
  const s = (status || '').trim().toLowerCase()
  return s !== '' && s !== 'available'
}

export function requestStatusLabel(status: string): string {
  switch (status.trim().toLowerCase()) {
    case 'downloading':
      return 'Downloading'
    case 'searching':
      return 'Searching'
    case 'queued':
      return 'Queued'
    case 'added':
      return 'In library'
    case 'requested':
      return 'Requested'
    case 'workflow':
      return 'Pending approval'
    case 'available':
      return 'Available'
    default:
      return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }
}

export type RequestStatusTone = 'success' | 'accent' | 'neutral' | 'warning'

export function requestStatusTone(status: string): RequestStatusTone {
  switch (status.trim().toLowerCase()) {
    case 'available':
    case 'added':
      return 'success'
    case 'downloading':
      return 'accent'
    case 'searching':
    case 'queued':
      return 'warning'
    default:
      return 'neutral'
  }
}

export function requestPhase(status: string): 'downloading' | 'searching' | 'requested' {
  switch (status.trim().toLowerCase()) {
    case 'downloading':
      return 'downloading'
    case 'searching':
    case 'queued':
      return 'searching'
    default:
      return 'requested'
  }
}

export function posterUrlForRequest(poster: string | undefined): string {
  const p = (poster || '').trim()
  if (!p) return ''
  if (p.startsWith('http') || p.startsWith('/images')) return p
  if (p.startsWith('/')) return `https://image.tmdb.org/t/p/w185${p}`
  return p
}

export function detailHrefForRequest(req: MediaRequest): string | null {
  if (!req.itemId) return null
  return req.itemType === 'tv' ? `/tv/${req.itemId}` : `/movies/${req.itemId}`
}

export type InProgressEntry =
  | { source: 'request'; request: MediaRequest }
  | { source: 'library'; kind: 'movie' | 'tv'; item: Movie | TVShow }

function requestKey(req: MediaRequest): string {
  if (req.itemId) return `${req.itemType}:${req.itemId}`
  if (req.tmdbId) return `${req.itemType}:tmdb:${req.tmdbId}`
  return `${req.itemType}:${req.title.toLowerCase()}`
}

/** Merge active request-media rows with library titles that are not watchable yet. */
export function mergeInProgressEntries(
  requests: MediaRequest[],
  movies: Movie[],
  shows: TVShow[],
): InProgressEntry[] {
  const active = requests.filter((r) => isActiveRequestStatus(r.status))
  const keys = new Set(active.map(requestKey))
  const out: InProgressEntry[] = active.map((request) => ({ source: 'request', request }))

  for (const item of movies) {
    if (isWatchable(item)) continue
    const key = item.id ? `movie:${item.id}` : item.tmdb_id ? `movie:tmdb:${item.tmdb_id}` : `movie:${item.title.toLowerCase()}`
    if (keys.has(key)) continue
    keys.add(key)
    out.push({ source: 'library', kind: 'movie', item })
  }

  for (const item of shows) {
    if (isWatchable(item)) continue
    const key = item.id ? `tv:${item.id}` : item.tmdb_id ? `tv:tmdb:${item.tmdb_id}` : `tv:${item.title.toLowerCase()}`
    if (keys.has(key)) continue
    keys.add(key)
    out.push({ source: 'library', kind: 'tv', item })
  }

  return out.sort((a, b) => {
    const rank = (entry: InProgressEntry) => {
      if (entry.source === 'request') {
        const phase = requestPhase(entry.request.status)
        if (phase === 'downloading') return 0
        if (phase === 'searching') return 1
        return 2
      }
      return 3
    }
    const diff = rank(a) - rank(b)
    if (diff !== 0) return diff
    const titleA = a.source === 'request' ? a.request.title : a.item.title
    const titleB = b.source === 'request' ? b.request.title : b.item.title
    return titleA.localeCompare(titleB)
  })
}

export function groupInProgressByPhase(entries: InProgressEntry[]) {
  const downloading: InProgressEntry[] = []
  const searching: InProgressEntry[] = []
  const requested: InProgressEntry[] = []

  for (const entry of entries) {
    const status = entry.source === 'request' ? entry.request.status : 'added'
    const phase = requestPhase(status)
    if (phase === 'downloading') downloading.push(entry)
    else if (phase === 'searching') searching.push(entry)
    else requested.push(entry)
  }

  return { downloading, searching, requested }
}
