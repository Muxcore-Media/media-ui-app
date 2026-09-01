import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { DetailHero } from '../components/media/DetailHero';
import CastSection from '../components/media/CastSection';
import { DetailHeroSkeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import { tmdbImageUrl, youtubeEmbedUrl } from '../lib/tmdbImages';
import type { DiscoverDetail } from '../types';

export default function DiscoverDetail() {
  const { type, id } = useParams();
  const [params] = useSearchParams();
  const mediaType = type === 'tv' ? 'tv' : type === 'movie' ? 'movie' : null;
  const tmdbId = Number(id);

  const [detail, setDetail] = useState<DiscoverDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState<string | null>(null);

  const backHref = params.get('return') || '/search';

  useEffect(() => {
    if (!mediaType || !Number.isFinite(tmdbId) || tmdbId <= 0) {
      setLoading(false);
      setError('Invalid title');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void api
      .getDiscoverDetail(mediaType, tmdbId)
      .then((res) => {
        if (!cancelled) setDetail(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load details');
          setDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mediaType, tmdbId]);

  const meta = useMemo(() => {
    if (!detail) return null;
    const bits: string[] = [];
    if (detail.year) bits.push(String(detail.year));
    if (detail.runtime) bits.push(`${detail.runtime} min`);
    if (detail.status) bits.push(detail.status);
    if (detail.voteAvg > 0) bits.push(`${detail.voteAvg.toFixed(1)} rating`);
    return bits.join(' · ');
  }, [detail]);

  async function requestTitle() {
    if (!detail) return;
    const res = await api.requestTitle({
      tmdbId: detail.id,
      title: detail.title,
      year: detail.year,
      overview: detail.overview,
      poster: detail.poster,
      mediaType: detail.mediaType,
    });
    setRequested(res.status || 'requested');
  }

  if (loading) {
    return (
      <>
        <LoadingStatus label="Loading title details" />
        <DetailHeroSkeleton />
      </>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-3" data-testid="discover-detail-page">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Title not found
        </h1>
        <ErrorBanner message={error || 'Title not found'} />
        <Link to={backHref} className="text-sm text-[var(--accent-color)] hover:underline">
          Back to search
        </Link>
      </div>
    );
  }

  const posterUrl = tmdbImageUrl(detail.poster, 'w500');
  const backdropUrl =
    tmdbImageUrl(detail.backdrop, 'w780') || tmdbImageUrl(detail.backdrop, 'original');

  return (
    <div className="space-y-8" data-testid="discover-detail-page">
      <nav aria-label="Breadcrumb">
        <Link
          to={backHref}
          className="inline-flex text-sm text-[var(--text-secondary)] hover:text-[var(--accent-color)]"
        >
          ← Back to search
        </Link>
      </nav>

      <DetailHero
        backdropUrl={backdropUrl}
        posterUrl={posterUrl}
        title={detail.title}
        tagline={detail.tagline}
        meta={
          <>
            <Badge tone="neutral">{detail.mediaType === 'tv' ? 'TV Series' : 'Movie'}</Badge>
            {meta ? <span>{meta}</span> : null}
          </>
        }
        overview={detail.overview}
        actions={
          requested ? (
            <span role="status">
              <Badge tone="success">{requested}</Badge>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => void requestTitle()}
              className="rounded-[var(--radius-md)] bg-[var(--accent-color)] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[var(--accent-hover)]"
            >
              Request {detail.mediaType === 'tv' ? 'series' : 'movie'}
            </button>
          )
        }
      />

      {detail.genres.length > 0 && (
        <section className="space-y-3" aria-labelledby="discover-genres-heading">
          <h2
            id="discover-genres-heading"
            className="text-lg font-semibold text-[var(--text-primary)]"
          >
            Genres
          </h2>
          <div className="flex flex-wrap gap-2">
            {detail.genres.map((genre) => (
              <Badge key={genre} tone="neutral">
                {genre}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {detail.trailer?.youtubeKey && (
        <section className="space-y-3" aria-labelledby="discover-trailer-heading">
          <h2
            id="discover-trailer-heading"
            className="text-lg font-semibold text-[var(--text-primary)]"
          >
            Trailer
          </h2>
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--player-bg)] shadow-xl">
            <div className="relative aspect-video w-full">
              <iframe
                title={detail.trailer.name || `${detail.title} trailer`}
                src={youtubeEmbedUrl(detail.trailer.youtubeKey)}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
          {detail.trailer.name ? (
            <p className="text-sm text-[var(--text-secondary)]">{detail.trailer.name}</p>
          ) : null}
        </section>
      )}

      {detail.cast?.length ? (
        <CastSection
          cast={detail.cast}
          headingId="discover-cast-heading"
          testId="discover-cast"
        />
      ) : null}
    </div>
  );
}
