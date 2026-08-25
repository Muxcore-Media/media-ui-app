import type { MediaKind } from './userdata';

export type PlayerHrefParams = {
  src: string;
  title: string;
  id: string;
  kind: MediaKind | 'episode';
  poster?: string;
  back?: string;
  showId?: string;
  season?: number;
  episode?: number;
};

export function buildPlayerHref(params: PlayerHrefParams): string {
  const q = new URLSearchParams();
  q.set('src', params.src);
  q.set('title', params.title);
  q.set('id', params.id);
  q.set('kind', params.kind);
  if (params.poster) q.set('poster', params.poster);
  if (params.back) q.set('back', params.back);
  if (params.showId) q.set('showId', params.showId);
  if (params.season != null) q.set('season', String(params.season));
  if (params.episode != null) q.set('episode', String(params.episode));
  return `/player?${q.toString()}`;
}

export function buildMoviePlayerHref(movie: {
  id: string;
  title: string;
  stream_url: string;
  poster_url?: string;
}): string {
  return buildPlayerHref({
    src: movie.stream_url,
    title: movie.title,
    id: movie.id,
    kind: 'movie',
    poster: movie.poster_url,
    back: `/movies/${movie.id}`,
  });
}

export function buildEpisodePlayerHref(
  show: { id: string; title: string; poster_url?: string },
  ep: {
    id: string;
    season_number: number;
    episode_number: number;
    title?: string;
    has_file?: boolean;
    stream_url?: string;
  },
): string | null {
  if (!ep.has_file || !ep.stream_url) return null;
  const code = `S${String(ep.season_number).padStart(2, '0')}E${String(ep.episode_number).padStart(2, '0')}`;
  const epTitle = ep.title ? `${show.title} ${code} · ${ep.title}` : `${show.title} ${code}`;
  return buildPlayerHref({
    src: ep.stream_url,
    title: epTitle,
    id: ep.id,
    kind: 'episode',
    poster: show.poster_url,
    back: `/tv/${show.id}`,
    showId: show.id,
    season: ep.season_number,
    episode: ep.episode_number,
  });
}

export function buildProgressPlayerHref(entry: {
  id: string;
  kind: MediaKind;
  title: string;
  stream_url?: string;
  poster_url?: string;
  href: string;
}): string | null {
  if (!entry.stream_url) return null;
  const showId = entry.href.match(/(?:^|\/)tv\/([^/?#]+)/)?.[1];
  return buildPlayerHref({
    src: entry.stream_url,
    title: entry.title,
    id: entry.id,
    kind: entry.kind,
    poster: entry.poster_url,
    back: entry.href,
    showId: showId ? decodeURIComponent(showId) : undefined,
  });
}
