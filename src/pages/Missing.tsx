import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Search } from 'lucide-react';
import { api } from '../api/client';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import { ShelfSkeleton } from '../components/ui/Skeleton';
import { libraryEnabled, useCapabilities } from '../lib/capabilities';
import { missingEpisodeLabel, type MissingItem, type MissingResponse } from '../lib/missing';

function MissingRow({
  item,
  busy,
  onSearch,
}: {
  item: MissingItem;
  busy: boolean;
  onSearch: () => void;
}) {
  return (
    <li className="flex min-w-0 items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <Link to={item.href} className="truncate text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent-color)]">
          {item.title}
        </Link>
        <p className="truncate text-xs text-[var(--text-tertiary)]">
          {item.kind === 'movie' ? item.year || 'Movie' : missingEpisodeLabel(item)}
        </p>
      </div>
      <button
        type="button"
        className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-md)] px-2 py-1 text-xs font-semibold text-[var(--accent-color)] hover:bg-[var(--bg-elevated-2)] disabled:opacity-50"
        disabled={busy}
        onClick={onSearch}
      >
        <Search className="h-3.5 w-3.5" aria-hidden="true" />
        Search now
      </button>
    </li>
  );
}

export default function Missing() {
  const { caps } = useCapabilities();
  const [data, setData] = useState<MissingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .listMissing({ pageSize: 80 })
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load missing titles');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function search(item: MissingItem) {
    const key = `${item.kind}-${item.id}`;
    setBusyKey(key);
    setFlash(null);
    try {
      await api.addWanted({
        itemType: item.kind,
        itemId: item.itemId,
        title: item.title,
        year: item.year,
        tmdbId: item.tmdbId,
        qualityProfileId: item.qualityProfileId,
        seasonNumber: item.seasonNumber,
        episodeNumber: item.episodeNumber,
        seriesId: item.seriesId || item.artistId || undefined,
      });
      await api.searchNow({ item_type: item.kind, item_id: item.itemId });
      setFlash(`Search started for ${item.title}.`);
    } catch (err) {
      setFlash(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setBusyKey(null);
    }
  }

  const movies = data?.movies?.items ?? [];
  const episodes = data?.tv?.items ?? [];
  const albums = libraryEnabled(caps, 'music') ? (data?.music?.items ?? []) : [];
  const books = libraryEnabled(caps, 'books') ? (data?.books?.items ?? []) : [];
  const comics = libraryEnabled(caps, 'comics') ? (data?.comics?.items ?? []) : [];
  const audiobooks = libraryEnabled(caps, 'audiobooks') ? (data?.audiobooks?.items ?? []) : [];
  const empty =
    !loading &&
    movies.length === 0 &&
    episodes.length === 0 &&
    albums.length === 0 &&
    books.length === 0 &&
    comics.length === 0 &&
    audiobooks.length === 0;

  return (
    <div className="space-y-6" data-testid="missing-page">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Missing</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Monitored library titles without a file — movies, episodes, albums, books, comics, and audiobooks.
        </p>
        <Link to="/upcoming" className="inline-block text-sm font-semibold text-[var(--accent-color)] hover:underline">
          Upcoming calendar
        </Link>
      </header>
      {loading ? (
        <div aria-busy="true">
          <LoadingStatus label="Loading missing titles" />
          <ShelfSkeleton count={3} />
        </div>
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}
      {flash ? (
        <p className="text-sm text-[var(--text-secondary)]" data-testid="missing-flash">
          {flash}
        </p>
      ) : null}
      {!loading && data && !data.available ? (
        <p className="text-sm text-[var(--text-secondary)]">Library modules are not listing missing titles right now.</p>
      ) : null}
      {empty && data?.available ? (
        <EmptyState
          icon={CalendarDays}
          title="Nothing missing"
          message="Monitored movies, episodes, albums, books, comics, and audiobooks show up here when they still need a file."
        />
      ) : null}
      {movies.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Movies <span className="text-[var(--text-tertiary)]">({data?.movies.total || movies.length})</span>
          </h2>
          <ul className="grid gap-2" data-testid="missing-movies">
            {movies.map((item) => (
              <MissingRow
                key={`movie-${item.id}`}
                item={item}
                busy={busyKey !== null}
                onSearch={() => void search(item)}
              />
            ))}
          </ul>
        </section>
      ) : null}
      {episodes.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Episodes <span className="text-[var(--text-tertiary)]">({data?.tv.total || episodes.length})</span>
          </h2>
          <ul className="grid gap-2" data-testid="missing-tv">
            {episodes.map((item) => (
              <MissingRow
                key={`tv-${item.id}`}
                item={item}
                busy={busyKey !== null}
                onSearch={() => void search(item)}
              />
            ))}
          </ul>
        </section>
      ) : null}
      {albums.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Albums <span className="text-[var(--text-tertiary)]">({data?.music.total || albums.length})</span>
          </h2>
          <ul className="grid gap-2" data-testid="missing-music">
            {albums.map((item) => (
              <MissingRow
                key={`music-${item.id}`}
                item={item}
                busy={busyKey !== null}
                onSearch={() => void search(item)}
              />
            ))}
          </ul>
        </section>
      ) : null}
      {books.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Books <span className="text-[var(--text-tertiary)]">({data?.books.total || books.length})</span>
          </h2>
          <ul className="grid gap-2" data-testid="missing-books">
            {books.map((item) => (
              <MissingRow
                key={`book-${item.id}`}
                item={item}
                busy={busyKey !== null}
                onSearch={() => void search(item)}
              />
            ))}
          </ul>
        </section>
      ) : null}
      {comics.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Comics <span className="text-[var(--text-tertiary)]">({data?.comics.total || comics.length})</span>
          </h2>
          <ul className="grid gap-2" data-testid="missing-comics">
            {comics.map((item) => (
              <MissingRow
                key={`comic-${item.id}`}
                item={item}
                busy={busyKey !== null}
                onSearch={() => void search(item)}
              />
            ))}
          </ul>
        </section>
      ) : null}
      {audiobooks.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Audiobooks <span className="text-[var(--text-tertiary)]">({data?.audiobooks.total || audiobooks.length})</span>
          </h2>
          <ul className="grid gap-2" data-testid="missing-audiobooks">
            {audiobooks.map((item) => (
              <MissingRow
                key={`audiobook-${item.id}`}
                item={item}
                busy={busyKey !== null}
                onSearch={() => void search(item)}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
