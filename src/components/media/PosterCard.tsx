import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Film, Play, Star } from 'lucide-react';
import { prefetchPosterDetailRoute, type PosterDetailType } from '../../lib/routePreload';
import { tmdbImageUrl } from '../../lib/tmdbImages';
import type { Movie, SearchResult, TVShow } from '../../types';
import { Badge } from '../ui/Badge';

type Item = Movie | TVShow;

function isExternalType(type: PosterDetailType): type is 'discover' | 'external' {
  return type === 'discover' || type === 'external';
}

function cardLabel(item: Item, type: 'movie' | 'tv'): string {
  const kind = type === 'movie' ? 'movie' : 'TV show';
  const year = item.year ? `, ${item.year}` : '';
  const available = item.has_file ? ', available to watch' : '';
  return `View ${kind}: ${item.title}${year}${available}`;
}

function externalCardLabel(item: SearchResult): string {
  const kind = item.mediaType === 'tv' ? 'TV show' : 'movie';
  const year = item.year ? `, ${item.year}` : '';
  return `View ${kind}: ${item.title}${year}`;
}

/**
 * Poster-driven library card (AGENTS.md §5 Cards): focusable link with aria-label,
 * keyboard activation (Enter/Space), graceful image fallback, hover scale + elevation
 * with a "Play" quick action reveal, Ready badge, and a rating chip.
 */
export default function PosterCard({
  item,
  type,
  returnTo,
  subline,
}: {
  item: Item | SearchResult;
  type: PosterDetailType;
  returnTo?: string;
  /** Optional meta under the title (e.g. "Added 3 days ago" on home recently-added rows). */
  subline?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const external = isExternalType(type);
  const libraryItem = external ? null : (item as Item);
  const externalItem = external ? (item as SearchResult) : null;
  const to = external
    ? `/discover/${externalItem!.mediaType}/${externalItem!.id}${
        returnTo ? `?return=${encodeURIComponent(returnTo)}` : ''
      }`
    : type === 'movie'
      ? `/movies/${libraryItem!.id}`
      : `/tv/${libraryItem!.id}`;
  const posterUrl = external ? tmdbImageUrl(externalItem!.poster, 'w342') : libraryItem!.poster_url;
  const voteAverage = external ? externalItem!.voteAvg : libraryItem!.vote_average;
  const hasFile = external ? false : libraryItem!.has_file;
  const title = external ? externalItem!.title : libraryItem!.title;
  const year = external ? externalItem!.year : libraryItem!.year;
  const hasPoster = Boolean(posterUrl) && !imgError;
  const label = external ? externalCardLabel(externalItem!) : cardLabel(libraryItem!, type);
  const prefetchDetail = useCallback(() => {
    prefetchPosterDetailRoute(type);
  }, [type]);

  return (
    <Link
      to={to}
      aria-label={label}
      data-content-rating={libraryItem?.content_rating || undefined}
      onMouseEnter={prefetchDetail}
      onFocus={prefetchDetail}
      className="group block overflow-hidden rounded-[var(--radius-md)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
    >
      <div className="motion-safe-hover-lift relative aspect-[2/3] overflow-hidden rounded-[var(--radius-md)] bg-[var(--bg-elevated-2)] shadow-md group-hover:shadow-2xl">
        {hasPoster ? (
          <img
            src={posterUrl}
            alt=""
            className="motion-safe-scale h-full w-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[var(--bg-elevated-2)] to-[var(--bg-elevated)] text-[var(--text-tertiary)]">
            <Film className="h-8 w-8" aria-hidden="true" />
            <span className="px-2 text-center text-xs leading-snug">No poster</span>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--scrim-strong)] via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100" />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
          {hasFile && <Badge tone="accent">Available</Badge>}
          {voteAverage > 0 && (
            <Badge tone="neutral" className="ml-auto">
              <Star className="h-3 w-3 fill-current" aria-hidden="true" />
              {voteAverage.toFixed(1)}
            </Badge>
          )}
        </div>

        <div className="motion-safe-reveal pointer-events-none absolute inset-x-0 bottom-0 p-3">
          <div className="flex items-center gap-2">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-contrast)] text-[var(--text-on-accent)] shadow-lg"
              aria-hidden="true"
            >
              <Play className="h-4 w-4 fill-current" />
            </span>
          </div>
        </div>
      </div>
      <div className="space-y-0.5 pt-2">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)] transition group-hover:text-[var(--accent-color)] group-focus-visible:text-[var(--accent-color)]">
          {title}
        </h3>
        <p className="text-xs text-[var(--text-tertiary)]">
          {subline ? `${subline}${year ? ` · ${year}` : ''}` : year || '—'}
        </p>
      </div>
    </Link>
  );
}
