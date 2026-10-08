import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Bookmark, ExternalLink, ListPlus, Play, Star, Tv } from 'lucide-react';
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
import { RefreshMetadataButton } from '../components/media/RefreshMetadataButton';
import { RemoveLibraryButton } from '../components/media/RemoveLibraryButton';
import { SeriesOverrideCard } from '../components/media/SeriesOverrideCard';
import { PreviewRename } from '../components/media/PreviewRename';
import { DeleteEpisodeFileButton } from '../components/media/DeleteEpisodeFileButton';
import { DetailHero } from '../components/media/DetailHero';
import { DetailHeroSkeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { parentalTitleOr } from '../api/errors';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import {
  enqueue,
  isFavorite,
  isWantToWatch,
  listProgress,
  resolveShowPlayTargets,
  showIdFromHref,
  toggleFavorite,
  toggleWantToWatch,
} from '../lib/userdata';
import { buildEpisodePlayerHref } from '../lib/playHref';
import { PinGateDialog } from '../components/parental/PinGateDialog';
import { RestrictedOverlay } from '../components/parental/RestrictedOverlay';
import { getParentalState, isItemRestricted } from '../lib/parental';
import { FixedWindowList } from '../components/ui/FixedWindowList';
import type { DiscoverDetail, Episode, TVShow } from '../types';

const EPISODE_ROW_HEIGHT = 88;

function firstPlayableStreamUrl(show: TVShow | null): string | undefined {
  if (!show) return undefined;
  for (const season of show.seasons ?? []) {
    for (const episode of season.episodes) {
      if (episode.has_file && episode.stream_url) return episode.stream_url;
    }
  }
  return undefined;
}

export default function TVShowDetail() {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [show, setShow] = useState<TVShow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jellyfinURL, setJellyfinURL] = useState<string | null>(null);
  const [fav, setFav] = useState(false);
  const [wantToWatch, setWantToWatch] = useState(false);
  const [discover, setDiscover] = useState<DiscoverDetail | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const probe = usePlaybackAnalysis(firstPlayableStreamUrl(show));

  const parentalState = getParentalState();
  const restricted = !unlocked && show ? isItemRestricted(show, parentalState) : false;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setJellyfinURL(null);
      try {
        // Fetch show data and the optional Jellyfin deep-link in parallel so the
        // native "Play" button is never delayed by the linked-app handoff lookup.
        // jellyfinPlayURL already swallows 404s (unlinked server) and returns null.
        const [item, jf] = await Promise.all([
          api.getTVShow(id),
          api.jellyfinPlayURL(id),
        ]);
        if (!cancelled) {
          setShow(item);
          setFav(isFavorite(item.id));
          setWantToWatch(isWantToWatch(item.id));
          setJellyfinURL(jf);
        }
      } catch (err) {
        if (!cancelled) {
          setShow(null);
          setError(err instanceof Error ? err.message : 'Failed to load TV show');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const playTargets = useMemo(
    () => (show ? resolveShowPlayTargets(show) : { resume: null, fromBeginning: null }),
    [show],
  );
  const showHasProgress = useMemo(
    () =>
      show
        ? listProgress().some(
            (p) =>
              showIdFromHref(p.href) === show.id &&
              p.kind === 'episode' &&
              (p.watched || p.positionSec > 5),
          )
        : false,
    [show],
  );

  useEffect(() => {
    if (!show?.tmdb_id) {
      setDiscover(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const detail = await api.getDiscoverDetail('tv', show.tmdb_id!);
        if (!cancelled) setDiscover(detail);
      } catch {
        if (!cancelled) setDiscover(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [show?.tmdb_id]);

  if (loading) {
    return (
      <>
        <LoadingStatus label="Loading TV show" />
        <DetailHeroSkeleton />
      </>
    );
  }

  if (!show) {
    return (
      <div className="space-y-3" data-testid="tv-detail-page">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          {parentalTitleOr(error, 'TV show not found')}
        </h1>
        <ErrorBanner message={error || 'TV show not found.'} />
        <Link to="/tv" className="text-[var(--accent-color)] hover:underline">
          Back to TV
        </Link>
      </div>
    );
  }

  if (restricted) {
    return (
      <div data-testid="tv-detail-page">
        <RestrictedOverlay
          contentRating={show.content_rating}
          maxRating={parentalState.kidsMode && !parentalState.maxRating ? 'PG' : parentalState.maxRating}
          onUnlock={() => {
            if (!parentalState.pinEnabled || !parentalState.pinHash) {
              setUnlocked(true);
            } else {
              setPinOpen(true);
            }
          }}
          onBack={() => navigate('/tv')}
        />
        {pinOpen && (
          <PinGateDialog
            pinHash={parentalState.pinHash}
            onSuccess={() => { setPinOpen(false); setUnlocked(true); }}
            onCancel={() => setPinOpen(false)}
            actionLabel={`Unlock "${show.title}"`}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="tv-detail-page">
      <DetailHero
        backdropUrl={show.backdrop_url}
        posterUrl={show.poster_url}
        title={show.title}
        overview={show.overview || 'No overview.'}
        meta={
          <>
            {show.has_file && <Badge tone="accent">Available</Badge>}
            {probe.analysis?.info_line ? (
              <Badge tone="neutral">{probe.analysis.info_line}</Badge>
            ) : null}
            {show.vote_average > 0 && (
              <Badge tone="neutral">
                <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                {show.vote_average.toFixed(1)}
              </Badge>
            )}
            <span>{show.year || '—'}</span>
            {show.status ? <span>{show.status}</span> : null}
            {show.genres.length > 0 && <span>{show.genres.slice(0, 3).join(' · ')}</span>}
            {show.monitored ? <Badge tone="accent">Monitoring</Badge> : <Badge tone="neutral">Unmonitored</Badge>}
          </>
        }
        actions={
          <>
            {playTargets.resume ? (
              <Link
                to={playTargets.resume}
                aria-label={`Play ${show.title}`}
                className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent-color)] px-5 text-sm font-semibold text-[var(--text-on-accent)] transition hover:bg-[var(--accent-hover)]"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                Play
              </Link>
            ) : null}
            {playTargets.fromBeginning && showHasProgress ? (
              <Link
                to={playTargets.fromBeginning}
                aria-label={`Play ${show.title} from beginning`}
                className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent-color)]"
              >
                Play from beginning
              </Link>
            ) : null}
            <MonitorButton
              kind="tv"
              id={show.id}
              monitored={show.monitored}
              onChange={(next) => setShow((cur) => (cur ? { ...cur, monitored: next } : cur))}
            />
            <AddWantedButton
              itemType="tv"
              itemId={show.id}
              title={show.title}
              year={show.year}
              tmdbId={show.tmdb_id}
              qualityProfileId={show.quality_profile_id}
              seriesId={show.id}
            />
            <QualityProfileSelect
              kind="tv"
              id={show.id}
              value={show.quality_profile_id}
              onChange={(next) => setShow((cur) => (cur ? { ...cur, quality_profile_id: next } : cur))}
            />
            <TagSelect kind="tv" id={show.id} />
            <AlternateTitlesCard kind="tv" id={show.id} />
            <ItemHistoryCard kind="tv" id={show.id} />
            <ItemWatchStatsCard id={show.id} />
            <ArtworkCard kind="tv" id={show.id} />
            <SubtitleFilesCard kind="tv" id={show.id} />
            <SearchSubtitlesButton id={show.id} />
            <ProtectTitleButton kind="tv" id={show.id} title={show.title} />
            <RootFolderSelect
              kind="tv"
              id={show.id}
              value={show.root_folder_path}
              onChange={(next) => setShow((cur) => (cur ? { ...cur, root_folder_path: next } : cur))}
            />
            <RefreshMetadataButton
              kind="tv"
              id={show.id}
              onRefreshed={() => {
                void api.getTVShow(show.id).then(setShow).catch(() => undefined);
              }}
            />
            <RemoveLibraryButton
              kind="tv"
              id={show.id}
              title={show.title}
              hasFile={show.has_file}
              onRemoved={() => navigate('/tv')}
            />
            <Button
              variant={fav ? 'primary' : 'secondary'}
              icon={
                <Star className={fav ? 'h-4 w-4 fill-current' : 'h-4 w-4'} aria-hidden="true" />
              }
              onClick={() => {
                const on = toggleFavorite({
                  id: show.id,
                  kind: 'tv',
                  title: show.title,
                  poster_url: show.poster_url,
                  href: `/tv/${show.id}`,
                  year: show.year,
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
                  id: show.id,
                  kind: 'tv',
                  title: show.title,
                  poster_url: show.poster_url,
                  href: `/tv/${show.id}`,
                  year: show.year,
                  content_rating: show.content_rating,
                  tmdbId: show.tmdb_id,
                  overview: show.overview,
                  poster: show.poster_url,
                });
                setWantToWatch(on);
              }}
            >
              {wantToWatch ? 'On Want to Watch' : 'Want to Watch'}
            </Button>
            {jellyfinURL && (
              <a
                href={jellyfinURL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--accent-color)] transition hover:border-[var(--accent-color)]"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Open in linked app
              </a>
            )}
            <JellyfinLinkButton
              muxId={show.id}
              title={show.title}
              mediaKind="tv"
              tmdbId={show.tmdb_id}
              path={show.root_folder_path}
              linked={Boolean(jellyfinURL)}
              onLinked={(url) => setJellyfinURL(url)}
              onUnlinked={() => setJellyfinURL(null)}
            />
            <ReportIssueButton
              title={show.title}
              mediaType="tv"
              mediaId={show.id}
              tmdbId={show.tmdb_id}
            />
          </>
        }
      />

      <InteractiveSearch
        itemType="tv"
        itemId={show.id}
        title={show.title}
        year={show.year}
        tmdbId={show.tmdb_id}
        autoSearch={searchParams.get('search') === '1'}
      />

      <PreviewRename kind="tv" id={show.id} />

      <SeriesOverrideCard seriesId={show.id} />

      {show.seasons && show.seasons.length > 0 ? (
        <section className="space-y-6" aria-labelledby="tv-episodes-heading">
          <h2 id="tv-episodes-heading" className="text-xl font-semibold text-[var(--text-primary)]">
            Episodes
          </h2>
          {show.seasons.map((season) => {
            const seasonLabel = season.name || `Season ${season.season_number}`;
            const seasonHeadingId = `tv-season-${season.id}`;
            return (
              <div key={season.id} className="space-y-2" aria-labelledby={seasonHeadingId}>
                <div className="flex items-center justify-between gap-3">
                  <h3
                    id={seasonHeadingId}
                    className="text-sm font-semibold uppercase tracking-wide text-[var(--text-tertiary)]"
                  >
                    {seasonLabel}
                  </h3>
                  <MonitorButton
                    compact
                    kind="season"
                    id={season.id}
                    monitored={season.monitored}
                    onChange={(next) =>
                      setShow((cur) => {
                        if (!cur?.seasons) return cur;
                        return {
                          ...cur,
                          seasons: cur.seasons.map((s) =>
                            s.id !== season.id
                              ? s
                              : {
                                  ...s,
                                  monitored: next,
                                  episodes: s.episodes.map((e) => ({ ...e, monitored: next })),
                                },
                          ),
                        };
                      })
                    }
                  />
                </div>
                <FixedWindowList
                  items={season.episodes}
                  rowHeight={EPISODE_ROW_HEIGHT}
                  className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                  getKey={(ep) => ep.id}
                  renderRow={(ep) => (
                    <EpisodeRow
                      show={show}
                      ep={ep}
                      onMonitored={(next) =>
                        setShow((cur) => {
                          if (!cur?.seasons) return cur;
                          return {
                            ...cur,
                            seasons: cur.seasons.map((s) => ({
                              ...s,
                              episodes: s.episodes.map((e) =>
                                e.id === ep.id ? { ...e, monitored: next } : e,
                              ),
                            })),
                          };
                        })
                      }
                      onFileRemoved={() =>
                        setShow((cur) => {
                          if (!cur?.seasons) return cur;
                          return {
                            ...cur,
                            seasons: cur.seasons.map((s) => ({
                              ...s,
                              episodes: s.episodes.map((e) =>
                                e.id === ep.id ? { ...e, has_file: false, stream_url: '' } : e,
                              ),
                            })),
                          };
                        })
                      }
                    />
                  )}
                />
              </div>
            );
          })}
        </section>
      ) : (
        <EmptyState
          icon={Tv}
          title="No episodes yet"
          message="Episode listings will appear here once metadata is available for this series."
        />
      )}

      <TrailerSection
        trailer={discover?.trailer}
        titleLabel={show.title}
        headingId="tv-trailer-heading"
      />

      {discover?.cast?.length ? (
        <CastSection cast={discover.cast} headingId="tv-cast-heading" />
      ) : null}

      <MoreLikeThisShelf kind="tv" genres={show.genres} excludeId={show.id} />

      <RelatedShelf kind="tv" tmdbId={show.tmdb_id} />
    </div>
  );
}

function EpisodeRow({
  show,
  ep,
  onMonitored,
  onFileRemoved,
}: {
  show: TVShow;
  ep: Episode;
  onMonitored?: (next: boolean) => void;
  onFileRemoved?: () => void;
}) {
  const epTitle = `${show.title} S${ep.season_number}E${ep.episode_number}`;
  const playTo = buildEpisodePlayerHref(show, ep);

  return (
    <div className="flex h-full flex-wrap items-center justify-between gap-3 px-4 py-3 transition hover:bg-[var(--bg-elevated-2)]">
      <div className="min-w-0">
        <p className="text-sm">
          <span className="font-semibold text-[var(--text-primary)]">
            S{String(ep.season_number).padStart(2, '0')}E
            {String(ep.episode_number).padStart(2, '0')}
          </span>
          {ep.title ? <span className="text-[var(--text-secondary)]"> · {ep.title}</span> : null}
        </p>
        {ep.quality || ep.filename ? (
          <p className="truncate text-xs text-[var(--text-tertiary)]" data-testid="episode-file">
            {[ep.quality, ep.filename].filter(Boolean).join(' · ')}
          </p>
        ) : null}
        {ep.overview && (
          <p className="line-clamp-1 text-xs text-[var(--text-tertiary)]">{ep.overview}</p>
        )}
      </div>
      {playTo ? (
        <div className="flex items-center gap-2">
          <Link
            to={playTo}
            aria-label={`Play ${ep.title ? `${ep.title}, ` : ''}${epTitle}`}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--accent-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-on-accent)] transition hover:bg-[var(--accent-hover)]"
          >
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            Play
          </Link>
          <MonitorButton compact kind="episode" id={ep.id} monitored={ep.monitored} onChange={onMonitored} />
          <DeleteEpisodeFileButton id={ep.id} onRemoved={onFileRemoved} />
          <OfflineDownloadButton
            compact
            id={ep.id}
            title={epTitle}
            kind="episode"
            src={ep.stream_url}
            poster={show.poster_url}
            href={`/tv/${show.id}`}
          />
          <IconButton
            icon={<ListPlus className="h-4 w-4" aria-hidden="true" />}
            aria-label={`Add ${epTitle} to queue`}
            size="sm"
            onClick={() =>
              enqueue({
                id: ep.id,
                kind: 'episode',
                title: epTitle,
                href: playTo,
                stream_url: ep.stream_url,
                poster_url: show.poster_url,
              })
            }
          />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Badge tone="neutral">No file</Badge>
          <MonitorButton compact kind="episode" id={ep.id} monitored={ep.monitored} onChange={onMonitored} />
        </div>
      )}
    </div>
  );
}
