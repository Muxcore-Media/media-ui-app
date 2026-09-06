import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Home as HomeIcon } from 'lucide-react';
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
  pullUserdataFromServer,
  resolveNextUp,
  type FavoriteEntry,
  type NextUpEntry,
  type ProgressEntry,
} from '../lib/userdata';
import { buildMoviePlayerHref, buildProgressPlayerHref } from '../lib/playHref';
import { formatAddedRelative, formatTimeRemaining } from '../lib/relativeDate';
import { prefetchPosterDetailRoute } from '../lib/routePreload';
import { isWatchable, mergeInProgressEntries } from '../lib/acquisition';
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
  };
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
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [allShows, setAllShows] = useState<TVShow[]>([]);
  const recommended = useMemo(
    () =>
      [...allMovies]
        .filter((m) => isWatchable(m) && m.vote_average > 0)
        .sort((a, b) => b.vote_average - a.vote_average)
        .slice(0, 16),
    [allMovies],
  );

  const recentlyAdded = useMemo(() => {
    type Row = { kind: 'movie' | 'tv'; item: Movie | TVShow; createdAt: string };
    const rows: Row[] = [];
    for (const m of allMovies) {
      if (!isWatchable(m) || !m.created_at) continue;
      rows.push({ kind: 'movie', item: m, createdAt: m.created_at });
    }
    for (const s of allShows) {
      if (!isWatchable(s) || !s.created_at) continue;
      rows.push({ kind: 'tv', item: s, createdAt: s.created_at });
    }
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 16);
  }, [allMovies, allShows]);

  const hero = useMemo<HeroItem | null>(() => {
    const candidate =
      readyMovies.find((m) => m.backdrop_url) ||
      readyMovies[0] ||
      recommended.find((m) => m.backdrop_url) ||
      recommended[0];
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
  }, [readyMovies, recommended]);

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
        setProgress(continueWatching(16));
        setFavorites(listFavorites().slice(0, 16));
        const derived = await resolveNextUp((id) => api.getTVShow(id), 16);
        if (cancelled) return;
        setNextUp(derived);
        const [list, movies, shows] = await Promise.all([
          api.listRequests(),
          api.listMovies(1, 24),
          api.listTVShows(1, 24),
        ]);
        if (cancelled) return;
        setInProgressCount(mergeInProgressEntries(list, movies.items, shows.items).length);
        setReadyMovies(movies.items.filter((m) => m.has_file).slice(0, 16));
        setAllMovies(movies.items);
        setAllShows(shows.items);
        setReadyShows(shows.items.filter((s) => s.has_file).slice(0, 16));
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

  const showReadyFallback =
    prefs.home.showNextUp &&
    nextUp.length === 0 &&
    (readyMovies.length > 0 || readyShows.length > 0);

  const hasContent =
    (prefs.home.showContinueWatching && progress.length > 0) ||
    (prefs.home.showNextUp && nextUp.length > 0) ||
    (prefs.home.showRecentlyAdded && recentlyAdded.length > 0) ||
    recommended.length > 0 ||
    (prefs.home.showFavorites && favorites.length > 0) ||
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

      {prefs.home.showContinueWatching && progress.length > 0 && (
        <Shelf title="Continue watching" testId="home-continue">
          {progress.map((p) => (
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

      {prefs.home.showNextUp && nextUp.length > 0 && (
        <Shelf title="Next up" testId="home-next-up">
          {nextUp.map((n) => (
            <ShelfItem key={n.id}>
              <ProgressCard
                title={n.title}
                posterUrl={n.poster_url}
                href={n.href}
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

      {!loading && recommended.length > 0 && (
        <Shelf title="Recommended" seeAllHref="/movies">
          {recommended.map((m) => (
            <ShelfItem key={m.id}>
              <MediaCard item={m} type="movie" />
            </ShelfItem>
          ))}
        </Shelf>
      )}

      {prefs.home.showFavorites && favorites.length > 0 && (
        <Shelf title="Favorites" seeAllHref="/favorites">
          {favorites.map((f) => (
            <ShelfItem key={f.id}>
              <MediaCard type={f.kind === 'tv' ? 'tv' : 'movie'} item={favoriteAsCardItem(f)} />
            </ShelfItem>
          ))}
        </Shelf>
      )}

      {showReadyFallback && (
        <Shelf title="Available now" testId="home-ready">
          {readyMovies.map((item) => (
            <ShelfItem key={`m-${item.id}`}>
              <MediaCard item={item} type="movie" />
            </ShelfItem>
          ))}
          {readyShows.map((item) => (
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
    </div>
  );
}
