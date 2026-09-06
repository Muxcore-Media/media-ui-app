import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Building2, Home as HomeIcon, Layers, ListMusic, Music2, Play, Tag, Tv2 } from 'lucide-react';
import { api } from '../api/client';
import MediaCard from '../components/MediaCard';
import { HeroBanner, type HeroItem } from '../components/media/HeroBanner';
import { Shelf, ShelfItem } from '../components/media/Shelf';
import { ProgressCard } from '../components/media/ProgressCard';
import { ShelfSkeleton, HeroBannerSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import {
  continueWatching,
  getPreferences,
  listFavorites,
  listPlaylists,
  listWantToWatch,
  pullUserdataFromServer,
  recentlyWatched,
  resolveNextUp,
  type FavoriteEntry,
  type NextUpEntry,
  type Playlist,
  type ProgressEntry,
  type WantToWatchEntry,
} from '../lib/userdata';
import { buildEpisodePlayerHref, buildMoviePlayerHref, buildProgressPlayerHref, withPlayerContentRating } from '../lib/playHref';
import { formatAddedRelative, formatTimeRemaining, formatWatchedRelative } from '../lib/relativeDate';
import { prefetchPosterDetailRoute } from '../lib/routePreload';
import { mergeInProgressEntries } from '../lib/acquisition';
import {
  applyParentalFilter,
  applyUserdataParentalFilter,
  expandLibraryRatingsForUserdata,
} from '../lib/parental';
import { useBecauseYouWatched } from '../hooks/useBecauseYouWatched';
import { useRecentlyAdded } from '../hooks/useRecentlyAdded';
import { useRecentlyWatched } from '../hooks/useRecentlyWatched';
import { useUpcomingEpisodes, type UpcomingEpisodeRow } from '../hooks/useUpcomingEpisodes';
import { useGenreRails } from '../hooks/useGenreRails';
import { useStudioNetworkRails } from '../hooks/useStudioNetworkRails';
import { useMusicShelves } from '../hooks/useMusicShelves';
import type { Movie, TVShow } from '../types';

function favoriteAsCardItem(f: FavoriteEntry): Movie | TVShow {
  return {
    id: f.id,
    title: f.title,
    year: f.year || 0,
    overview: '',
    runtime: 0,
    vote_average: 0,
    genres: [],
    poster_url: f.poster_url || '',
    has_file: false,
    stream_url: '',
    created_at: '',
    content_rating: f.content_rating,
  };
}

/** Compact tile for a named collection (box set or genre group) on the home shelf. */
function CollectionTile({ name, count }: { name: string; count: number }) {
  return (
    <Link
      to="/collections"
      className="flex h-full flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-4 text-center transition hover:border-[var(--accent-color)] hover:bg-[var(--bg-elevated-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
      aria-label={`${name} — ${count} title${count !== 1 ? 's' : ''}`}
    >
      <Layers className="h-6 w-6 text-[var(--text-tertiary)]" aria-hidden="true" />
      <span className="line-clamp-2 text-xs font-medium text-[var(--text-primary)]">{name}</span>
      <span className="text-xs text-[var(--text-tertiary)]">{count} title{count !== 1 ? 's' : ''}</span>
    </Link>
  );
}

/** Compact tile for a user playlist on the home shelf. */
function PlaylistTile({ playlist }: { playlist: Playlist }) {
  return (
    <Link
      to="/playlists"
      className="flex h-full flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-4 text-center transition hover:border-[var(--accent-color)] hover:bg-[var(--bg-elevated-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
      aria-label={`${playlist.name} — ${playlist.itemIds.length} item${playlist.itemIds.length !== 1 ? 's' : ''}`}
    >
      <ListMusic className="h-6 w-6 text-[var(--text-tertiary)]" aria-hidden="true" />
      <span className="line-clamp-2 text-xs font-medium text-[var(--text-primary)]">{playlist.name}</span>
      <span className="text-xs text-[var(--text-tertiary)]">{playlist.itemIds.length} item{playlist.itemIds.length !== 1 ? 's' : ''}</span>
    </Link>
  );
}

/** Compact tile for a genre on the home "Browse by Genre" shelf. */
function GenreTile({ name, count }: { name: string; count: number }) {
  return (
    <Link
      to={`/genre/${encodeURIComponent(name)}`}
      className="flex h-full flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-4 text-center transition hover:border-[var(--accent-color)] hover:bg-[var(--bg-elevated-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
      aria-label={`${name} — ${count} title${count !== 1 ? 's' : ''}`}
    >
      <Tag className="h-6 w-6 text-[var(--text-tertiary)]" aria-hidden="true" />
      <span className="line-clamp-2 text-xs font-medium text-[var(--text-primary)]">{name}</span>
      <span className="text-xs text-[var(--text-tertiary)]">{count} title{count !== 1 ? 's' : ''}</span>
    </Link>
  );
}

/** Compact tile for a studio on the home "Browse by Studio" shelf. */
function StudioTile({ name, count }: { name: string; count: number }) {
  return (
    <Link
      to={`/studio/${encodeURIComponent(name)}`}
      className="flex h-full flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-4 text-center transition hover:border-[var(--accent-color)] hover:bg-[var(--bg-elevated-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
      aria-label={`${name} — ${count} title${count !== 1 ? 's' : ''}`}
    >
      <Building2 className="h-6 w-6 text-[var(--text-tertiary)]" aria-hidden="true" />
      <span className="line-clamp-2 text-xs font-medium text-[var(--text-primary)]">{name}</span>
      <span className="text-xs text-[var(--text-tertiary)]">{count} title{count !== 1 ? 's' : ''}</span>
    </Link>
  );
}

/** Compact tile for a TV network on the home "Browse by Network" shelf. */
function NetworkTile({ name, count }: { name: string; count: number }) {
  return (
    <Link
      to={`/network/${encodeURIComponent(name)}`}
      className="flex h-full flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-4 text-center transition hover:border-[var(--accent-color)] hover:bg-[var(--bg-elevated-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
      aria-label={`${name} — ${count} title${count !== 1 ? 's' : ''}`}
    >
      <Tv2 className="h-6 w-6 text-[var(--text-tertiary)]" aria-hidden="true" />
      <span className="line-clamp-2 text-xs font-medium text-[var(--text-primary)]">{name}</span>
      <span className="text-xs text-[var(--text-tertiary)]">{count} title{count !== 1 ? 's' : ''}</span>
    </Link>
  );
}

/** Compact tile for a music artist on the home "Browse Artists" shelf. */
function ArtistTile({ id, name }: { id: string; name: string }) {
  return (
    <Link
      to={`/music/${id}`}
      className="flex h-full flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-4 text-center transition hover:border-[var(--accent-color)] hover:bg-[var(--bg-elevated-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
      aria-label={name}
    >
      <Music2 className="h-6 w-6 text-[var(--text-tertiary)]" aria-hidden="true" />
      <span className="line-clamp-2 text-xs font-medium text-[var(--text-primary)]">{name}</span>
    </Link>
  );
}

/** Compact tile for a music album on the home "Recently Added Albums" shelf. */
function AlbumTile({
  artistId,
  artistName,
  albumTitle,
  year,
}: {
  artistId: string;
  artistName: string;
  albumTitle: string;
  year?: number;
}) {
  return (
    <Link
      to={`/music/${artistId}`}
      className="flex h-full flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-4 text-center transition hover:border-[var(--accent-color)] hover:bg-[var(--bg-elevated-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
      aria-label={`${albumTitle} by ${artistName}`}
    >
      <Music2 className="h-6 w-6 text-[var(--text-tertiary)]" aria-hidden="true" />
      <span className="line-clamp-2 text-xs font-medium text-[var(--text-primary)]">{albumTitle}</span>
      <span className="text-xs text-[var(--text-tertiary)]">{artistName}{year ? ` · ${year}` : ''}</span>
    </Link>
  );
}

/** Format an ISO air-date string for display in the upcoming rail subtitle. */
function formatUpcomingAirDate(airIso: string): string {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
  const airDay = airIso.slice(0, 10);
  if (airDay === todayStr) return 'Today';
  if (airDay === tomorrowStr) return 'Tomorrow';
  // Parse at noon to avoid UTC vs. local off-by-one-day issues.
  const d = new Date(`${airDay}T12:00:00`);
  const formatted = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const isPast = airDay < todayStr;
  return isPast ? `Aired ${formatted}` : formatted;
}

/** Card for a single upcoming / recently-aired episode on the home rail. */
function UpcomingCard({ show, episode, air }: UpcomingEpisodeRow) {
  const [imgError, setImgError] = useState(false);
  const epCode = `S${String(episode.season_number).padStart(2, '0')}E${String(episode.episode_number).padStart(2, '0')}`;
  const epLabel = episode.title ? `${epCode} · ${episode.title}` : epCode;
  const airLabel = formatUpcomingAirDate(air);
  const playerHref = buildEpisodePlayerHref(show, episode);
  const href = playerHref ?? `/tv/${show.id}`;

  return (
    <Link
      to={href}
      aria-label={`${show.title}, ${epLabel}, ${airLabel}`}
      className="group block overflow-hidden rounded-[var(--radius-md)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
    >
      <div className="motion-safe-hover-lift relative aspect-[2/3] overflow-hidden rounded-[var(--radius-md)] bg-[var(--bg-elevated-2)] shadow-md group-hover:shadow-2xl">
        {show.poster_url && !imgError ? (
          <img
            src={show.poster_url}
            alt=""
            className="motion-safe-scale h-full w-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--bg-elevated-2)] to-[var(--bg-elevated)] text-[var(--text-tertiary)]">
            <CalendarDays className="h-8 w-8" aria-hidden="true" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--scrim-strong)] via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100" />
        {episode.has_file && (
          <div className="motion-safe-reveal pointer-events-none absolute inset-x-0 bottom-0 p-3">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-contrast)] text-[var(--text-on-accent)] shadow-lg"
              aria-hidden="true"
            >
              <Play className="h-4 w-4 fill-current" />
            </span>
          </div>
        )}
      </div>
      <div className="space-y-0.5 pt-2">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)] transition group-hover:text-[var(--accent-color)] group-focus-visible:text-[var(--accent-color)]">
          {show.title}
        </h3>
        <p className="text-xs text-[var(--text-tertiary)]">{epLabel}</p>
        <p className="text-xs text-[var(--text-secondary)]">{airLabel}</p>
      </div>
    </Link>
  );
}

export default function Home() {
  const prefs = getPreferences();
  const [inProgressCount, setInProgressCount] = useState(0);
  const [readyMovies, setReadyMovies] = useState<Movie[]>([]);
  const [readyShows, setReadyShows] = useState<TVShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [nextUp, setNextUp] = useState<NextUpEntry[]>([]);
  const [recentlyWatchedRaw, setRecentlyWatchedRaw] = useState<ProgressEntry[]>([]);
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [wantToWatch, setWantToWatch] = useState<WantToWatchEntry[]>([]);
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [allShows, setAllShows] = useState<TVShow[]>([]);
  const [joinMovies, setJoinMovies] = useState<Array<{ id: string; content_rating?: string }>>([]);
  const [joinShows, setJoinShows] = useState<Array<{ id: string; content_rating?: string }>>([]);
  const [serverCols, setServerCols] = useState<{ id: string; name: string; movie_count: number }[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  // IDs already shown in Continue Watching / Next Up — passed to the because-you-watched hook
  // so it can dedupe. Memoised to a stable Set identity.
  const becauseExcludeIds = useMemo(
    () => new Set([...progress.map((p) => p.id), ...nextUp.map((n) => n.id)]),
    [progress, nextUp],
  );

  const becauseYouWatched = useBecauseYouWatched(becauseExcludeIds, {
    movies: allMovies,
    shows: allShows,
  });

  // Dedupe Recently Added against every other home rail so the same title does
  // not appear twice: exclude CW + Next Up IDs (already in becauseExcludeIds)
  // plus anything surfaced by Because You Watched.
  const recentlyAddedExcludeIds = useMemo(
    () => new Set([...becauseExcludeIds, ...becauseYouWatched.items.map((i) => i.id)]),
    [becauseExcludeIds, becauseYouWatched.items],
  );

  const recentlyAdded = useRecentlyAdded(allMovies, allShows, recentlyAddedExcludeIds);

  // Upcoming / On The Air rail — deduplicates against Continue Watching + Next Up.
  const upcoming = useUpcomingEpisodes(allShows, becauseExcludeIds);

  // Recently Watched rail — deduplicates against Continue Watching + Next Up.
  const recentlyWatchedItems = useRecentlyWatched(recentlyWatchedRaw, becauseExcludeIds);

  // Genre rails — derived from the same library lists already in state.
  const genreRails = useGenreRails(allMovies, allShows);

  // Studio and network rails — derived from the same library lists.
  const { studioRails, networkRails } = useStudioNetworkRails(allMovies, allShows);

  // Music shelves — fetched independently; errors are swallowed so Home never breaks.
  const musicShelves = useMusicShelves();

  const hero = useMemo<HeroItem | null>(() => {
    const filteredReady = applyParentalFilter(readyMovies);
    const candidate = filteredReady.find((m) => m.backdrop_url) || filteredReady[0];
    if (!candidate) return null;
    return {
      id: candidate.id,
      title: candidate.title,
      overview: candidate.overview,
      year: candidate.year,
      vote_average: candidate.vote_average,
      genres: candidate.genres,
      backdropUrl: candidate.backdrop_url,
      posterUrl: candidate.poster_url,
      ready: candidate.has_file,
      playHref: candidate.has_file ? buildMoviePlayerHref(candidate) : `/movies/${candidate.id}`,
      detailHref: `/movies/${candidate.id}`,
    };
  }, [readyMovies]);

  useEffect(() => {
    if (!hero) return;
    prefetchPosterDetailRoute(hero.detailHref.startsWith('/tv/') ? 'tv' : 'movie');
  }, [hero]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Prefer server progress for continue-watching / next-up before painting rows.
        await pullUserdataFromServer();
        if (cancelled) return;
        const progressRaw = continueWatching(16);
        const recentlyWatchedFetch = recentlyWatched(16);
        const favoritesRaw = listFavorites().slice(0, 16);
        const wantToWatchRaw = listWantToWatch().slice(0, 16);
        setPlaylists(listPlaylists());
        const derived = await resolveNextUp((id) => api.getTVShow(id), 16);
        if (cancelled) return;
        const [list, movies, shows, cols] = await Promise.all([
          api.listRequests(),
          api.listMovies(1, 24),
          api.listTVShows(1, 24),
          api.listCollections().catch(() => ({ items: [] as { id: string; name: string; movie_count: number }[] })),
        ]);
        if (cancelled) return;

        const expanded = await expandLibraryRatingsForUserdata(
          [...progressRaw, ...recentlyWatchedFetch, ...favoritesRaw, ...wantToWatchRaw, ...derived],
          movies.items,
          shows.items,
          {
            getMovie: (id) => api.getMovie(id).catch(() => null),
            getTVShow: (id) => api.getTVShow(id).catch(() => null),
          },
        );
        if (cancelled) return;
        const ratingMovies = expanded.movies;
        const ratingShows = expanded.shows;

        setProgress(progressRaw);
        setFavorites(favoritesRaw);
        setWantToWatch(wantToWatchRaw);
        setNextUp(derived);
        setRecentlyWatchedRaw(recentlyWatchedFetch);
        setJoinMovies(ratingMovies);
        setJoinShows(ratingShows);
        setInProgressCount(mergeInProgressEntries(list, movies.items, shows.items).length);
        setReadyMovies(movies.items.filter((m) => m.has_file).slice(0, 16));
        setAllMovies(movies.items);
        setAllShows(shows.items);
        setReadyShows(shows.items.filter((s) => s.has_file).slice(0, 16));
        setServerCols(cols.items || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load home');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleProgress = useMemo(
    () => applyUserdataParentalFilter(progress, joinMovies, joinShows),
    [progress, joinMovies, joinShows],
  );
  const visibleNextUp = useMemo(
    () => applyUserdataParentalFilter(nextUp, joinMovies, joinShows),
    [nextUp, joinMovies, joinShows],
  );
  const visibleFavorites = useMemo(
    () => applyUserdataParentalFilter(favorites, joinMovies, joinShows),
    [favorites, joinMovies, joinShows],
  );
  const visibleWantToWatch = useMemo(
    () => applyUserdataParentalFilter(wantToWatch, joinMovies, joinShows),
    [wantToWatch, joinMovies, joinShows],
  );
  const visibleReadyMovies = useMemo(
    () => applyParentalFilter(readyMovies),
    [readyMovies],
  );
  const visibleReadyShows = useMemo(
    () => applyParentalFilter(readyShows),
    [readyShows],
  );
  const visibleRecentlyWatched = useMemo(
    () => applyUserdataParentalFilter(recentlyWatchedItems, joinMovies, joinShows),
    [recentlyWatchedItems, joinMovies, joinShows],
  );

  const showReadyFallback =
    prefs.home.showNextUp &&
    visibleNextUp.length === 0 &&
    (visibleReadyMovies.length > 0 || visibleReadyShows.length > 0);

  const hasContent =
    (prefs.home.showContinueWatching && visibleProgress.length > 0) ||
    (prefs.home.showNextUp && visibleNextUp.length > 0) ||
    (prefs.home.showRecentlyWatched && visibleRecentlyWatched.length > 0) ||
    (prefs.home.showUpcoming && upcoming.rows.length > 0) ||
    (prefs.home.showRecentlyAdded && recentlyAdded.length > 0) ||
    becauseYouWatched.items.length > 0 ||
    (prefs.home.showFavorites && visibleFavorites.length > 0) ||
    (prefs.home.showWantToWatch && visibleWantToWatch.length > 0) ||
    (prefs.home.showCollections && serverCols.length > 0) ||
    (prefs.home.showPlaylists && playlists.length > 0) ||
    (prefs.home.showGenres && genreRails.length > 0) ||
    (prefs.home.showStudios && studioRails.length > 0) ||
    (prefs.home.showNetworks && networkRails.length > 0) ||
    (prefs.home.showMusic && musicShelves.available && (musicShelves.artists.length > 0 || musicShelves.albums.length > 0)) ||
    showReadyFallback ||
    (prefs.home.showRecentRequests && inProgressCount > 0);

  const isFullyEmpty = !loading && !error && !hero && !hasContent;

  return (
    <div className="-mt-6 space-y-10 sm:-mt-0" data-testid="home-page">
      {loading && <LoadingStatus label="Loading home" />}
      {loading && <HeroBannerSkeleton />}
      {!loading && hero && <HeroBanner item={hero} />}

      {!loading && !hero && !isFullyEmpty && (
        <section className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">Home</h1>
          <p className="max-w-2xl text-[var(--muted)]">
            Pick up where you left off, see what&apos;s next, and jump back into your favorites.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/search"
              className="rounded-md bg-[var(--accent-color)] px-4 py-2 text-sm font-semibold text-[var(--text-on-accent)]"
            >
              Search
            </Link>
            <Link
              to="/movies"
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold"
            >
              Movies
            </Link>
            <Link
              to="/tv"
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold"
            >
              TV
            </Link>
          </div>
        </section>
      )}

      {loading && (
        <div className="space-y-8">
          <ShelfSkeleton />
          <ShelfSkeleton />
        </div>
      )}
      {error ? <ErrorBanner message={error} /> : null}

      {isFullyEmpty && (
        <section className="space-y-6" aria-labelledby="home-empty-heading">
          <h1 id="home-empty-heading" className="text-3xl font-bold tracking-tight">
            Home
          </h1>
          <EmptyState
            icon={HomeIcon}
            title="Your home feed is empty"
            message="Search for titles, browse movies and TV, or add favorites to populate this page."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  to="/search"
                  className="rounded-md bg-[var(--accent-color)] px-4 py-2 text-sm font-semibold text-[var(--text-on-accent)]"
                >
                  Search
                </Link>
                <Link
                  to="/movies"
                  className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
                >
                  Movies
                </Link>
                <Link
                  to="/tv"
                  className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
                >
                  TV
                </Link>
              </div>
            }
          />
        </section>
      )}

      {prefs.home.showContinueWatching && visibleProgress.length > 0 && (
        <Shelf title="Continue watching" testId="home-continue">
          {visibleProgress.map((p) => (
            <ShelfItem key={p.id}>
              <ProgressCard
                title={p.title}
                posterUrl={p.poster_url}
                href={buildProgressPlayerHref(p) || p.href}
                progressPct={p.durationSec > 0 ? (p.positionSec / p.durationSec) * 100 : 5}
                subtitle={formatTimeRemaining(p.positionSec, p.durationSec) ?? 'Resume'}
              />
            </ShelfItem>
          ))}
        </Shelf>
      )}

      {prefs.home.showNextUp && visibleNextUp.length > 0 && (
        <Shelf title="Next up" testId="home-next-up">
          {visibleNextUp.map((n) => (
            <ShelfItem key={n.id}>
              <ProgressCard
                title={n.title}
                posterUrl={n.poster_url}
                href={withPlayerContentRating(n.href, n.content_rating)}
                subtitle={n.subtitle || 'Next up'}
              />
            </ShelfItem>
          ))}
        </Shelf>
      )}

      {prefs.home.showRecentlyWatched && visibleRecentlyWatched.length > 0 && (
        <Shelf title="Recently watched" seeAllHref="/history" testId="home-recently-watched">
          {visibleRecentlyWatched.map((p) => (
            <ShelfItem key={p.id}>
              <ProgressCard
                title={p.title}
                posterUrl={p.poster_url}
                href={p.href}
                subtitle={formatWatchedRelative(p.updatedAt)}
                ariaLabel={`${p.title}, ${formatWatchedRelative(p.updatedAt)}`}
              />
            </ShelfItem>
          ))}
        </Shelf>
      )}

      {prefs.home.showUpcoming && !upcoming.loading && upcoming.rows.length > 0 && (
        <Shelf title="Upcoming / On The Air" seeAllHref="/upcoming" testId="home-upcoming">
          {upcoming.rows.map((row) => (
            <ShelfItem key={`${row.show.id}-${row.episode.id}`}>
              <UpcomingCard show={row.show} episode={row.episode} air={row.air} />
            </ShelfItem>
          ))}
        </Shelf>
      )}

      {prefs.home.showRecentlyAdded && recentlyAdded.length > 0 && (
        <Shelf title="Recently added" testId="home-recently-added">
          {recentlyAdded.map((row) => (
            <ShelfItem key={`${row.kind}-${row.item.id}`}>
              <MediaCard
                item={row.item}
                type={row.kind}
                subline={formatAddedRelative(row.createdAt)}
              />
            </ShelfItem>
          ))}
        </Shelf>
      )}

      {!becauseYouWatched.loading && becauseYouWatched.items.length > 0 && (
        <Shelf
          title={
            becauseYouWatched.seedTitle
              ? `Because you watched ${becauseYouWatched.seedTitle}`
              : 'Because you watched'
          }
          testId="home-because-you-watched"
        >
          {becauseYouWatched.items.map((item) => (
            <ShelfItem key={item.id}>
              <MediaCard
                item={item}
                type={'seasons' in item ? 'tv' : 'movie'}
              />
            </ShelfItem>
          ))}
        </Shelf>
      )}

      {prefs.home.showFavorites && visibleFavorites.length > 0 && (
        <Shelf title="Favorites" seeAllHref="/favorites">
          {visibleFavorites.map((f) => (
            <ShelfItem key={f.id}>
              <MediaCard type={f.kind === 'tv' ? 'tv' : 'movie'} item={favoriteAsCardItem(f)} />
            </ShelfItem>
          ))}
        </Shelf>
      )}

      {prefs.home.showWantToWatch && visibleWantToWatch.length > 0 && (
        <Shelf title="Want to Watch" seeAllHref="/want-to-watch" testId="home-want-to-watch">
          {visibleWantToWatch.map((entry) => (
            <ShelfItem key={entry.id}>
              <MediaCard
                type={entry.kind === 'tv' ? 'tv' : 'movie'}
                item={favoriteAsCardItem(entry)}
              />
            </ShelfItem>
          ))}
        </Shelf>
      )}

      {showReadyFallback && (
        <Shelf title="Available now" testId="home-ready">
          {visibleReadyMovies.map((item) => (
            <ShelfItem key={`m-${item.id}`}>
              <MediaCard item={item} type="movie" />
            </ShelfItem>
          ))}
          {visibleReadyShows.map((item) => (
            <ShelfItem key={`t-${item.id}`}>
              <MediaCard item={item} type="tv" />
            </ShelfItem>
          ))}
        </Shelf>
      )}

      {prefs.home.showRecentRequests && !loading && inProgressCount > 0 && (
        <section className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3">
          <p className="text-sm text-[var(--text-secondary)]">
            {inProgressCount} {inProgressCount === 1 ? 'title is' : 'titles are'} being requested or
            downloaded.{' '}
            <Link to="/requests" className="font-medium text-[var(--accent-color)] hover:underline">
              View in progress
            </Link>
          </p>
        </section>
      )}

      {prefs.home.showCollections && serverCols.length > 0 && (
        <Shelf title="Collections" seeAllHref="/collections" testId="home-collections">
          {serverCols.map((c) => (
            <ShelfItem key={c.id} className="w-[42%] shrink-0 sm:w-[30%] md:w-[22%] lg:w-[17%] xl:w-[14%]">
              <CollectionTile name={c.name} count={c.movie_count} />
            </ShelfItem>
          ))}
        </Shelf>
      )}

      {prefs.home.showPlaylists && playlists.length > 0 && (
        <Shelf title="Playlists" seeAllHref="/playlists" testId="home-playlists">
          {playlists.map((p) => (
            <ShelfItem key={p.id} className="w-[42%] shrink-0 sm:w-[30%] md:w-[22%] lg:w-[17%] xl:w-[14%]">
              <PlaylistTile playlist={p} />
            </ShelfItem>
          ))}
        </Shelf>
      )}

      {prefs.home.showGenres && genreRails.length > 0 && (
        <Shelf title="Browse by Genre" testId="home-genres">
          {genreRails.map((g) => (
            <ShelfItem key={g.name} className="w-[42%] shrink-0 sm:w-[30%] md:w-[22%] lg:w-[17%] xl:w-[14%]">
              <GenreTile name={g.name} count={g.count} />
            </ShelfItem>
          ))}
        </Shelf>
      )}

      {prefs.home.showStudios && studioRails.length > 0 && (
        <Shelf title="Browse by Studio" testId="home-studios">
          {studioRails.map((s) => (
            <ShelfItem key={s.name} className="w-[42%] shrink-0 sm:w-[30%] md:w-[22%] lg:w-[17%] xl:w-[14%]">
              <StudioTile name={s.name} count={s.count} />
            </ShelfItem>
          ))}
        </Shelf>
      )}

      {prefs.home.showNetworks && networkRails.length > 0 && (
        <Shelf title="Browse by Network" testId="home-networks">
          {networkRails.map((n) => (
            <ShelfItem key={n.name} className="w-[42%] shrink-0 sm:w-[30%] md:w-[22%] lg:w-[17%] xl:w-[14%]">
              <NetworkTile name={n.name} count={n.count} />
            </ShelfItem>
          ))}
        </Shelf>
      )}

      {prefs.home.showMusic && !musicShelves.loading && musicShelves.available && musicShelves.artists.length > 0 && (
        <Shelf title="Browse Artists" seeAllHref="/music" testId="home-music-artists">
          {musicShelves.artists.map((a) => (
            <ShelfItem key={a.id} className="w-[42%] shrink-0 sm:w-[30%] md:w-[22%] lg:w-[17%] xl:w-[14%]">
              <ArtistTile id={a.id} name={String(a.name || a.title || a.id)} />
            </ShelfItem>
          ))}
        </Shelf>
      )}

      {prefs.home.showMusic && !musicShelves.loading && musicShelves.available && musicShelves.albums.length > 0 && (
        <Shelf title="Albums from your artists" seeAllHref="/music" testId="home-music-albums">
          {musicShelves.albums.map((al) => (
            <ShelfItem key={`${al.artistId}-${al.id}`} className="w-[42%] shrink-0 sm:w-[30%] md:w-[22%] lg:w-[17%] xl:w-[14%]">
              <AlbumTile
                artistId={al.artistId}
                artistName={al.artistName}
                albumTitle={al.title}
                year={al.year}
              />
            </ShelfItem>
          ))}
        </Shelf>
      )}
    </div>
  );
}
