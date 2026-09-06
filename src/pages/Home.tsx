import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Home as HomeIcon, Layers, ListMusic } from 'lucide-react';
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
  resolveNextUp,
  type FavoriteEntry,
  type NextUpEntry,
  type Playlist,
  type ProgressEntry,
  type WantToWatchEntry,
} from '../lib/userdata';
import { buildMoviePlayerHref, buildProgressPlayerHref, withPlayerContentRating } from '../lib/playHref';
import { formatAddedRelative, formatTimeRemaining } from '../lib/relativeDate';
import { prefetchPosterDetailRoute } from '../lib/routePreload';
import { isWatchable, mergeInProgressEntries } from '../lib/acquisition';
import {
  applyParentalFilter,
  applyUserdataParentalFilter,
  expandLibraryRatingsForUserdata,
} from '../lib/parental';
import { useBecauseYouWatched } from '../hooks/useBecauseYouWatched';
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

export default function Home() {
  const prefs = getPreferences();
  const [inProgressCount, setInProgressCount] = useState(0);
  const [readyMovies, setReadyMovies] = useState<Movie[]>([]);
  const [readyShows, setReadyShows] = useState<TVShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [nextUp, setNextUp] = useState<NextUpEntry[]>([]);
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

  const becauseYouWatched = useBecauseYouWatched(becauseExcludeIds);
  const recentlyAdded = useMemo(() => {
    type Row = { kind: 'movie' | 'tv'; item: Movie | TVShow; createdAt: string };
    const rows: Row[] = [];
    for (const m of applyParentalFilter(allMovies)) {
      if (!isWatchable(m) || !m.created_at) continue;
      rows.push({ kind: 'movie', item: m, createdAt: m.created_at });
    }
    for (const s of applyParentalFilter(allShows)) {
      if (!isWatchable(s) || !s.created_at) continue;
      rows.push({ kind: 'tv', item: s, createdAt: s.created_at });
    }
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 16);
  }, [allMovies, allShows]);

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
          [...progressRaw, ...favoritesRaw, ...wantToWatchRaw, ...derived],
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

  const showReadyFallback =
    prefs.home.showNextUp &&
    visibleNextUp.length === 0 &&
    (visibleReadyMovies.length > 0 || visibleReadyShows.length > 0);

  const hasContent =
    (prefs.home.showContinueWatching && visibleProgress.length > 0) ||
    (prefs.home.showNextUp && visibleNextUp.length > 0) ||
    (prefs.home.showRecentlyAdded && recentlyAdded.length > 0) ||
    becauseYouWatched.items.length > 0 ||
    (prefs.home.showFavorites && visibleFavorites.length > 0) ||
    (prefs.home.showWantToWatch && visibleWantToWatch.length > 0) ||
    (prefs.home.showCollections && serverCols.length > 0) ||
    (prefs.home.showPlaylists && playlists.length > 0) ||
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
    </div>
  );
}
