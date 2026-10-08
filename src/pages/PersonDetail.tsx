import { useEffect, useId, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, User } from 'lucide-react';
import { api } from '../api/client';
import { tmdbImageUrl } from '../lib/tmdbImages';
import { applyParentalFilter } from '../lib/parental';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import { EmptyState } from '../components/ui/EmptyState';
import { PosterCardSkeleton } from '../components/ui/Skeleton';
import PosterCard from '../components/media/PosterCard';
import type { Movie, PersonDetail as PersonDetailType, TVShow } from '../types';

/** Max library items fetched for the tmdb_id join — covers most personal libraries. */
const LIBRARY_JOIN_PAGE_SIZE = 500;

export default function PersonDetail() {
  const headingId = useId();
  const { id = '' } = useParams();
  const personId = Number(id);

  const [person, setPerson] = useState<PersonDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Library movies and shows indexed by their tmdb_id for O(1) credit matching. */
  const [moviesByTmdb, setMoviesByTmdb] = useState<Map<number, Movie>>(new Map());
  const [showsByTmdb, setShowsByTmdb] = useState<Map<number, TVShow>>(new Map());

  useEffect(() => {
    if (!Number.isFinite(personId) || personId <= 0) {
      setLoading(false);
      setError('Invalid person ID');
      return;
    }
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [personData, moviesData, showsData] = await Promise.all([
          api.getPersonCredits(personId),
          api.listMovies(1, LIBRARY_JOIN_PAGE_SIZE),
          api.listTVShows(1, LIBRARY_JOIN_PAGE_SIZE),
        ]);

        if (cancelled) return;

        const mByTmdb = new Map<number, Movie>();
        for (const m of moviesData.items) {
          if (m.tmdb_id != null) mByTmdb.set(m.tmdb_id, m);
        }

        const sByTmdb = new Map<number, TVShow>();
        for (const s of showsData.items) {
          if (s.tmdb_id != null) sByTmdb.set(s.tmdb_id, s);
        }

        setPerson(personData);
        setMoviesByTmdb(mByTmdb);
        setShowsByTmdb(sByTmdb);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load person');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [personId]);

  if (loading) {
    return (
      <div className="space-y-8" data-testid="person-detail-page" aria-busy="true">
        <LoadingStatus label="Loading person" />
        <div className="flex items-center gap-4">
          <div className="h-28 w-20 shrink-0 animate-pulse rounded-[var(--radius-md)] bg-[var(--bg-elevated-2)] sm:h-36 sm:w-24" />
          <div className="space-y-2">
            <div className="h-6 w-40 animate-pulse rounded bg-[var(--bg-elevated-2)]" />
            <div className="h-4 w-64 animate-pulse rounded bg-[var(--bg-elevated-2)]" />
          </div>
        </div>
        <ul
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          aria-label="Loading library titles"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i}>
              <PosterCardSkeleton />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="space-y-3" data-testid="person-detail-page">
        <Link
          to="/"
          className="flex items-center gap-1 text-sm font-medium text-[var(--accent-text)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Home
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Person not found
        </h1>
        <ErrorBanner message={error || 'Person not found.'} />
      </div>
    );
  }

  // Resolve credits → library items; apply parental filter to the library lists
  const rawMovieMatches: Array<Movie & { character?: string }> = [];
  const rawShowMatches: Array<TVShow & { character?: string }> = [];

  for (const credit of person.credits) {
    if (credit.mediaType === 'movie') {
      const m = moviesByTmdb.get(credit.tmdbId);
      if (m) rawMovieMatches.push({ ...m, character: credit.character });
    } else {
      const s = showsByTmdb.get(credit.tmdbId);
      if (s) rawShowMatches.push({ ...s, character: credit.character });
    }
  }

  const movieMatches = applyParentalFilter(rawMovieMatches);
  const showMatches = applyParentalFilter(rawShowMatches);
  const hasLibraryHits = movieMatches.length > 0 || showMatches.length > 0;

  const profileUrl = tmdbImageUrl(person.profilePath, 'w185');

  return (
    <div className="space-y-8" data-testid="person-detail-page">
      {/* Back navigation */}
      <Link
        to="/"
        className="flex items-center gap-1 text-sm font-medium text-[var(--accent-text)] hover:underline"
        aria-label="Back to home"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Home
      </Link>

      {/* Person header */}
      <header className="flex items-start gap-4 sm:gap-6">
        <div className="h-28 w-20 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-[var(--bg-elevated-2)] sm:h-36 sm:w-24">
          {profileUrl ? (
            <img
              src={profileUrl}
              alt={person.name}
              className="h-full w-full object-cover"
              loading="eager"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-[var(--text-tertiary)]"
              aria-hidden="true"
            >
              <User className="h-8 w-8" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            {person.name}
          </h1>
          {person.birthday ? (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Born {person.birthday}
            </p>
          ) : null}
          {person.biography ? (
            <p className="mt-2 line-clamp-4 text-sm text-[var(--text-secondary)]">
              {person.biography}
            </p>
          ) : null}
        </div>
      </header>

      {/* Library titles */}
      <section aria-labelledby={headingId}>
        <h2
          id={headingId}
          className="mb-4 text-lg font-semibold text-[var(--text-primary)]"
        >
          In Your Library
        </h2>

        {!hasLibraryHits ? (
          <EmptyState
            icon={User}
            title="Nothing in your library yet"
            message={`No titles featuring ${person.name} have been added to your library.`}
            testId="person-empty"
          />
        ) : (
          <ul
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            aria-label={`Library titles featuring ${person.name}`}
          >
            {movieMatches.map((m) => (
              <li key={`movie-${m.id}`}>
                <PosterCard
                  item={m}
                  type="movie"
                  subline={m.character}
                />
              </li>
            ))}
            {showMatches.map((s) => (
              <li key={`tv-${s.id}`}>
                <PosterCard
                  item={s}
                  type="tv"
                  subline={s.character}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
