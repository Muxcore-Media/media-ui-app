import { Link } from 'react-router-dom';
import { Badge } from '../ui/Badge';
import { tmdbImageUrl } from '../../lib/tmdbImages';
import type { SearchResult } from '../../types';

function mediaLabel(mediaType: SearchResult['mediaType']): string {
  switch (mediaType) {
    case 'tv':
      return 'TV';
    case 'music':
      return 'Artist';
    case 'music_album':
      return 'Album';
    case 'music_track':
      return 'Track';
    default:
      return 'Movie';
  }
}

function posterForItem(item: SearchResult): string {
  if (
    item.mediaType === 'music' ||
    item.mediaType === 'music_album' ||
    item.mediaType === 'music_track'
  ) {
    const p = (item.poster || '').trim();
    if (p.startsWith('http') || p.startsWith('/')) return p;
    return '';
  }
  return tmdbImageUrl(item.poster, 'w342');
}

function resultTestId(item: SearchResult): string {
  switch (item.mediaType) {
    case 'music':
      return item.musicbrainzId || item.title;
    case 'music_album':
      return item.releaseGroupId || item.title;
    case 'music_track':
      return item.recordingId || item.title;
    default:
      return String(item.id);
  }
}

export default function RequestableCard({
  item,
  requested,
  onRequest,
  returnTo,
}: {
  item: SearchResult;
  requested?: string;
  onRequest: (item: SearchResult) => void;
  returnTo?: string;
}) {
  const poster = posterForItem(item);
  const isMusicKind =
    item.mediaType === 'music' ||
    item.mediaType === 'music_album' ||
    item.mediaType === 'music_track';
  const discoverHref = isMusicKind
    ? null
    : `/discover/${item.mediaType}/${item.id}${returnTo ? `?return=${encodeURIComponent(returnTo)}` : ''}`;

  const body = (
    <>
      <div className="h-32 w-24 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-[var(--bg-elevated-2)] sm:h-36 sm:w-28">
        {poster ? (
          <img
            src={poster}
            alt=""
            className="motion-safe-scale h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-xs text-[var(--text-tertiary)]">
            No poster
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5 py-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{mediaLabel(item.mediaType)}</Badge>
          {item.year ? (
            <span className="text-xs text-[var(--text-tertiary)]">{item.year}</span>
          ) : null}
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)] group-hover:text-[var(--accent-text)]">
          {item.title}
        </h3>
        {item.albumTitle && item.mediaType === 'music_track' ? (
          <p className="text-xs text-[var(--text-tertiary)]">from {item.albumTitle}</p>
        ) : null}
        {item.overview ? (
          <p className="line-clamp-3 text-xs leading-relaxed text-[var(--text-secondary)]">
            {item.overview}
          </p>
        ) : null}
        {item.voteAvg > 0 ? (
          <p className="text-xs text-[var(--text-tertiary)]">Rating {item.voteAvg.toFixed(1)}</p>
        ) : null}
      </div>
    </>
  );

  return (
    <article
      className="group flex overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] transition hover:border-[var(--accent-color)]/40 hover:bg-[var(--bg-elevated-2)]"
      data-testid={`requestable-${item.mediaType}-${resultTestId(item)}`}
    >
      {discoverHref ? (
        <Link
          to={discoverHref}
          className="flex min-w-0 flex-1 gap-3 p-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-color)]"
        >
          {body}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 gap-3 p-3">{body}</div>
      )}
      <div className="flex shrink-0 flex-col justify-center gap-2 border-l border-[var(--border-subtle)] p-3">
        <button
          type="button"
          disabled={Boolean(requested)}
          onClick={() => onRequest(item)}
          className="rounded-[var(--radius-sm)] bg-[var(--accent-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-on-accent)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {requested ? 'Requested' : 'Request'}
        </button>
        {requested ? (
          <span className="text-center text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
            {requested}
          </span>
        ) : null}
      </div>
    </article>
  );
}
