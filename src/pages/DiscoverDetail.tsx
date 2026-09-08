import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { api } from '../api/client';
import { DetailHero } from '../components/media/DetailHero';
import CastSection from '../components/media/CastSection';
import { DetailHeroSkeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import { tmdbImageUrl } from '../lib/tmdbImages';
import TrailerSection from '../components/media/TrailerSection';
import { isWantToWatch, toggleWantToWatch } from '../lib/userdata';
import { AcquisitionSetupBanner } from '../components/media/AcquisitionSetupBanner';
import { RequestQuotaBanner } from '../components/media/RequestQuotaBanner';
import { ReportIssueButton } from '../components/media/ReportIssueButton';
import type { RequestQuality } from '../lib/request-quality';
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
  const [wantToWatch, setWantToWatch] = useState(false);
  const [seasonNumber, setSeasonNumber] = useState(0);

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
        if (!cancelled) {
          setDetail(res);
          setWantToWatch(isWantToWatch(`tmdb:${mediaType}:${tmdbId}`));
        }
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

  async function requestTitle(quality: RequestQuality) {
    if (!detail) return;
    const res = await api.requestTitle({
      tmdbId: detail.id,
      title: detail.title,
      year: detail.year,
      overview: detail.overview,
      poster: detail.poster,
      mediaType: detail.mediaType,
      qualityProfile: quality,
      seasonNumber: detail.mediaType === 'tv' && seasonNumber > 0 ? seasonNumber : undefined,
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

      <AcquisitionSetupBanner />
      <RequestQuotaBanner />

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
          <>
            {requested ? (
              <span role="status">
                <Badge tone="success">{requested}</Badge>
              </span>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {detail.mediaType === 'tv' && (detail.seasons?.length ?? 0) > 0 ? (
                  <label className="text-sm text-[var(--text-secondary)]">
                    Season
                    <select
                      className="ml-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-2 text-sm text-[var(--text-primary)]"
                      value={seasonNumber}
                      onChange={(e) => setSeasonNumber(Number(e.target.value))}
                      data-testid="discover-season"
                    >
                      <option value={0}>All seasons</option>
                      {detail.seasons!.map((s) => (
                        <option key={s.seasonNumber} value={s.seasonNumber}>
                          {s.name}
                          {s.episodeCount ? ` (${s.episodeCount} ep)` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <button
                  type="button"
                  onClick={() => void requestTitle('hd')}
                  className="rounded-[var(--radius-md)] bg-[var(--accent-color)] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[var(--accent-hover)]"
                >
                  Request HD
                </button>
                <button
                  type="button"
                  onClick={() => void requestTitle('4k')}
                  className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-elevated-2)]"
                >
                  Request 4K
                </button>
              </div>
            )}
            <Button
              variant={wantToWatch ? 'primary' : 'secondary'}
              icon={
                <Bookmark
                  className={wantToWatch ? 'h-4 w-4 fill-current' : 'h-4 w-4'}
                  aria-hidden="true"
                />
              }
              onClick={() => {
                const on = toggleWantToWatch({
                  id: `tmdb:${detail.mediaType}:${detail.id}`,
                  kind: detail.mediaType,
                  title: detail.title,
                  poster_url: tmdbImageUrl(detail.poster, 'w342'),
                  href: `/discover/${detail.mediaType}/${detail.id}`,
                  year: detail.year,
                  tmdbId: detail.id,
                  overview: detail.overview,
                  poster: detail.poster,
                });
                setWantToWatch(on);
              }}
            >
              {wantToWatch ? 'On Want to Watch' : 'Want to Watch'}
            </Button>
            <ReportIssueButton
              title={detail.title}
              mediaType={detail.mediaType}
              tmdbId={detail.id}
            />
          </>
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

      <TrailerSection
        trailer={detail.trailer}
        titleLabel={detail.title}
        headingId="discover-trailer-heading"
      />

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
