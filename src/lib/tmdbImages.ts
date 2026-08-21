const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

export type TmdbImageSize = 'w185' | 'w342' | 'w500' | 'w780' | 'original'

export function tmdbImageUrl(path: string | undefined | null, size: TmdbImageSize = 'w342'): string {
  const raw = (path || '').trim()
  if (!raw) return ''
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  if (raw.startsWith('/images/')) return raw
  const normalized = raw.startsWith('/') ? raw : `/${raw}`
  return `${TMDB_IMAGE_BASE}/${size}${normalized}`
}

export function youtubeEmbedUrl(key: string): string {
  return `https://www.youtube.com/embed/${encodeURIComponent(key)}?rel=0`
}
