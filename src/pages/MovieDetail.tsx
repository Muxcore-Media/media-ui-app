import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Bookmark, Check, ExternalLink, ListPlus, Play, Star } from 'lucide-react';
import { api } from '../api/client';
import { usePlaybackAnalysis } from '../components/player/hooks/usePlaybackAnalysis';
import CastSection from '../components/media/CastSection';
import TrailerSection from '../components/media/TrailerSection';
import MoreLikeThisShelf from '../components/media/MoreLikeThisShelf';
import RelatedShelf from '../components/media/RelatedShelf';
import InteractiveSearch from '../components/media/InteractiveSearch';
import { ReportIssueButton } from '../components/media/ReportIssueButton';
import { OfflineDownloadButton } from '../components/media/OfflineDownloadButton';
import { MonitorButton } from '../components/media/MonitorButton';
import { AddWantedButton } from '../components/media/AddWantedButton';
import { JellyfinLinkButton } from '../components/media/JellyfinLinkButton';
import { QualityProfileSelect } from '../components/media/QualityProfileSelect';
import { AlternateTitlesCard } from '../components/media/AlternateTitlesCard';
import { ItemHistoryCard } from '../components/media/ItemHistoryCard';
import { ItemWatchStatsCard } from '../components/media/ItemWatchStatsCard';
import { ArtworkCard } from '../components/media/ArtworkCard';
import { SearchSubtitlesButton } from '../components/media/SearchSubtitlesButton';
import { SubtitleFilesCard } from '../components/media/SubtitleFilesCard';
import { ProtectTitleButton } from '../components/media/ProtectTitleButton';
import { TagSelect } from '../components/media/TagSelect';
import { RootFolderSelect } from '../components/media/RootFolderSelect';
import { PreviewRename } from '../components/media/PreviewRename';
import { RefreshMetadataButton } from '../components/media/RefreshMetadataButton';
import { RemoveLibraryButton } from '../components/media/RemoveLibraryButton';
import { DeleteMovieFileButton } from '../components/media/DeleteMovieFileButton';
import { MovieFilesCard } from '../components/media/MovieFilesCard';
import { DetailHero } from '../components/media/DetailHero';
import { DetailHeroSkeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { parentalTitleOr } from '../api/errors';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import { PinGateDialog } from '../components/parental/PinGateDialog';
import { RestrictedOverlay } from '../components/parental/RestrictedOverlay';
import {
  getProgress,
  isFavorite,
  isWantToWatch,
  toggleFavorite,
  toggleWantToWatch,
  upsertProgress,
  enqueue,
} from '../lib/userdata';
import { buildMoviePlayerHref, buildMoviePlayerHrefFromBeginning } from '../lib/playHref';
import { getParentalState, isItemRestricted } from '../lib/parental';
import type { DiscoverDetail, Movie } from '../types';

export default function MovieDetail() {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jellyfinURL, setJellyfinURL] = useState<string | null>(null);
  const [fav, setFav] = useState(false);
  const [wantToWatch, setWantToWatch] = useState(false);
  const [watched, setWatched] = useState(false);
  const [queued, setQueued] = useState(false);
  const [discover, setDiscover] = useState<DiscoverDetail | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const probe = usePlaybackAnalysis(movie?.has_file ? movie.stream_url : undefined);

  const parentalState = getParentalState();
  const restricted = !unlocked && movie ? isItemRestricted(movie, parentalState) : false;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setJellyfinURL(null);
      setQueued(false);
      try {
        // Fetch movie data and the optional Jellyfin deep-link in parallel so the
        // native "Play" button is never delayed by the linked-app handoff lookup.
        // jellyfinPlayURL already swallows 404s (unlinked server) and returns null.
        const [item, jf] = await Promise.all([
          api.getMovie(id),
          api.jellyfinPlayURL(id),
        ]);
        if (!cancelled) {
          setMovie(item);
          setFav(isFavorite(item.id));
          setWantToWatch(isWantToWatch(item.id));
          setWatched(Boolean(getProgress(item.id)?.watched));
          setJellyfinURL(jf);
        }
      } catch (err) {
        if (!cancelled) {
          setMovie(null);
          setError(err instanceof Error ? err.message : 'Failed to load movie');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!movie?.tmdb_id) {
      setDiscover(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const detail = await api.getDiscoverDetail('movie', movie.tmdb_id!);
        if (!cancelled) setDiscover(detail);
      } catch {
        if (!cancelled) setDiscover(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [movie?.tmdb_id]);

  if (loading) {
    return (
      <>
        <LoadingStatus label="Loading movie" />
        <DetailHeroSkeleton />
      </>
    );
  }

  if (!movie) {
    return (
      <div className="space-y-3" data-testid="movie-detail-page">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          {parentalTitleOr(error, 'Movie not found')}
        </h1>
        <ErrorBanner message={error || 'Movie not found.'} />
        <Link to="/movies" className="text-[var(--accent-text)] hover:underline">
          Back to movies
        </Link>
      </div>
    );
  }

  if (restricted) {
    return (
      <div data-testid="movie-detail-page">
        <RestrictedOverlay
          contentRating={movie.content_rating}
          maxRating={parentalState.kidsMode && !parentalState.maxRating ? 'PG' : parentalState.maxRating}
          onUnlock={() => {
            if (!parentalState.pinEnabled || !parentalState.pinHash) {
              setUnlocked(true);
            } else {
              setPinOpen(true);
            }
          }}
          onBack={() => navigate('/movies')}
        />
        {pinOpen && (
          <PinGateDialog
            pinHash={parentalState.pinHash}
            onSuccess={() => { setPinOpen(false); setUnlocked(true); }}
            onCancel={() => setPinOpen(false)}
            actionLabel={`Unlock "${movie.title}"`}
          />
        )}
      </div>
    );
  }

  const playTo = movie.has_file && movie.stream_url ? buildMoviePlayerHref(movie) : null;
  const playFromBeginning =
    movie.has_file && movie.stream_url && getProgress(movie.id)?.positionSec
      ? buildMoviePlayerHrefFromBeginning(movie)
      : null;

  return (
    <div className="space-y-8" data-testid="movie-detail-page">
      <DetailHero
        backdropUrl={movie.backdrop_url}
        posterUrl={movie.poster_url}
        title={movie.title}
        tagline={movie.tagline}
        overview={movie.overview || 'No overview.'}
        meta={
          <>
            {movie.has_file && <Badge tone="accent">Available</Badge>}
            {probe.analysis?.info_line ? (
              <Badge tone="neutral">{probe.analysis.info_line}</Badge>
            ) : null}
            {watched && <Badge tone="neutral">Watched</Badge>}
            {movie.vote_average > 0 && (
              <Badge tone="neutral">
                <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                {movie.vote_average.toFixed(1)}
              </Badge>
            )}
            <span>{movie.year || '—'}</span>
            {movie.runtime ? (
              <span>
                {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
              </span>
            ) : null}
            {movie.genres.length > 0 && <span>{movie.genres.slice(0, 3).join(' · ')}</span>}
            {movie.monitored ? <Badge tone="accent">Monitoring</Badge> : <Badge tone="neutral">Unmonitored</Badge>}
          </>
        }
        actions={
          <>
            {playTo ? (
              <Link
                to={playTo}
                aria-label={`Play ${movie.title}`}
                className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent-color)] px-5 text-sm font-semibold text-[var(--text-on-accent)] transition hover:bg-[var(--accent-hover)]"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                Play
              </Link>
            ) : (
              <p className="flex items-center text-sm text-[var(--text-tertiary)]">
                Not available to stream yet.
              </p>
            )}
            {playFromBeginning ? (
              <Link
                to={playFromBeginning}
                aria-label={`Play ${movie.title} from beginning`}
                className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent-color)]"
              >
                Play from beginning
              </Link>
            ) : null}
            <MonitorButton
              kind="movie"
              id={movie.id}
              monitored={movie.monitored}
              onChange={(next) => setMovie((cur) => (cur ? { ...cur, monitored: next } : cur))}
            />
            <AddWantedButton
              itemType="movie"
              itemId={movie.id}
              title={movie.title}
              year={movie.year}
              tmdbId={movie.tmdb_id}
              qualityProfileId={movie.quality_profile_id}
            />
            <QualityProfileSelect
              kind="movie"
              id={movie.id}
              value={movie.quality_profile_id}
              onChange={(next) => setMovie((cur) => (cur ? { ...cur, quality_profile_id: next } : cur))}
            />
            <TagSelect kind="movie" id={movie.id} />
            <AlternateTitlesCard kind="movie" id={movie.id} />
            <ItemHistoryCard kind="movie" id={movie.id} />
            <ItemWatchStatsCard id={movie.id} runtimeMinutes={movie.runtime} />
            <ArtworkCard kind="movie" id={movie.id} />
            <SubtitleFilesCard kind="movie" id={movie.id} />
            <MovieFilesCard
              id={movie.id}
              onEmpty={() =>
                setMovie((cur) => (cur ? { ...cur, has_file: false, stream_url: '' } : cur))
              }
            />
            <SearchSubtitlesButton id={movie.id} />
            <ProtectTitleButton kind="movie" id={movie.id} title={movie.title} />
            <RootFolderSelect
              kind="movie"
              id={movie.id}
              value={movie.root_folder_path}
              onChange={(next) => setMovie((cur) => (cur ? { ...cur, root_folder_path: next } : cur))}
            />
            <RefreshMetadataButton
              kind="movie"
              id={movie.id}
              onRefreshed={() => {
                void api.getMovie(movie.id).then(setMovie).catch(() => undefined);
              }}
            />
            {movie.has_file ? (
              <DeleteMovieFileButton
                id={movie.id}
                onRemoved={() =>
                  setMovie((cur) => (cur ? { ...cur, has_file: false, stream_url: '' } : cur))
                }
              />
            ) : null}
            <RemoveLibraryButton
              kind="movie"
              id={movie.id}
              title={movie.title}
              hasFile={movie.has_file}
              onRemoved={() => navigate('/movies')}
            />
            <OfflineDownloadButton
              id={movie.id}
              title={movie.title}
              kind="movie"
              src={movie.has_file ? movie.stream_url : undefined}
              poster={movie.poster_url}
              href={`/movies/${movie.id}`}
            />
            <Button
              variant="secondary"
              icon={<ListPlus className="h-4 w-4" aria-hidden="true" />}
              onClick={() => {
                enqueue({
                  id: movie.id,
                  kind: 'movie',
                  title: movie.title,
                  href: playTo || `/movies/${movie.id}`,
                  stream_url: movie.stream_url,
                  poster_url: movie.poster_url,
                });
                setQueued(true);
              }}
            >
              {queued ? 'Queued' : 'Add to queue'}
            </Button>
            <Button
              variant={fav ? 'primary' : 'secondary'}
              icon={
                <Star className={fav ? 'h-4 w-4 fill-current' : 'h-4 w-4'} aria-hidden="true" />
              }
              onClick={() => {
                const on = toggleFavorite({
                  id: movie.id,
                  kind: 'movie',
                  title: movie.title,
                  poster_url: movie.poster_url,
                  href: `/movies/${movie.id}`,
                  year: movie.year,
                });
                setFav(on);
              }}
            >
              {fav ? 'Favorited' : 'Favorite'}
            </Button>
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
                  id: movie.id,
                  kind: 'movie',
                  title: movie.title,
                  poster_url: movie.poster_url,
                  href: `/movies/${movie.id}`,
                  year: movie.year,
                  content_rating: movie.content_rating,
                  tmdbId: movie.tmdb_id,
                  overview: movie.overview,
                  poster: movie.poster_url,
                });
                setWantToWatch(on);
              }}
            >
              {wantToWatch ? 'On Want to Watch' : 'Want to Watch'}
            </Button>
            <Button
              variant="secondary"
              icon={<Check className="h-4 w-4" aria-hidden="true" />}
              onClick={() => {
                const next = !watched;
                upsertProgress({
                  id: movie.id,
                  kind: 'movie',
                  title: movie.title,
                  poster_url: movie.poster_url,
                  href: `/movies/${movie.id}`,
                  stream_url: movie.stream_url,
                  positionSec: next ? 0 : getProgress(movie.id)?.positionSec || 0,
                  durationSec: (movie.runtime || 0) * 60,
                  watched: next,
                });
                setWatched(next);
              }}
            >
              {watched ? 'Mark unwatched' : 'Mark watched'}
            </Button>
            {jellyfinURL && (
              <a
                href={jellyfinURL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--accent-text)] transition hover:border-[var(--accent-color)]"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Open in linked app
              </a>
            )}
            <JellyfinLinkButton
              muxId={movie.id}
              title={movie.title}
              mediaKind="movie"
              tmdbId={movie.tmdb_id}
              path={movie.root_folder_path}
              linked={Boolean(jellyfinURL)}
              onLinked={(url) => setJellyfinURL(url)}
              onUnlinked={() => setJellyfinURL(null)}
            />
            <ReportIssueButton
              title={movie.title}
              mediaType="movie"
              mediaId={movie.id}
              tmdbId={movie.tmdb_id}
            />
          </>
        }
      />

      {movie.collection_name && movie.collection_id ? (
        <section className="px-4 sm:px-0" aria-labelledby="movie-collection-heading">
          <h2 id="movie-collection-heading" className="sr-only">
            Collection
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Part of{' '}
            <Link
              to="/collections"
              className="font-medium text-[var(--accent-text)] hover:underline"
            >
              {movie.collection_name}
            </Link>
          </p>
        </section>
      ) : null}

      <TrailerSection
        trailer={discover?.trailer}
        titleLabel={movie.title}
        headingId="movie-trailer-heading"
      />

      {discover?.cast?.length ? (
        <CastSection cast={discover.cast} headingId="movie-cast-heading" />
      ) : null}

      <MoreLikeThisShelf
        kind="movie"
        genres={movie.genres}
        excludeId={movie.id}
      />

      <PreviewRename kind="movie" id={movie.id} />

      <InteractiveSearch
        itemType="movie"
        itemId={movie.id}
        title={movie.title}
        year={movie.year}
        tmdbId={movie.tmdb_id}
        autoSearch={searchParams.get('search') === '1'}
      />

      <RelatedShelf kind="movie" tmdbId={movie.tmdb_id} />
    </div>
  );
}
