import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { api } from '../api/client';
import { ShelfSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import { applyParentalFilter } from '../lib/parental';
import type { Episode, TVShow } from '../types';

type UpcomingRow = {
  show: TVShow;
  episode: Episode;
  air: string;
};

export default function Upcoming() {
  const [shows, setShows] = useState<TVShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.listTVShows(1, 100);
        const detailed: TVShow[] = [];
        for (const s of list.items.slice(0, 40)) {
          try {
            detailed.push(await api.getTVShow(s.id));
          } catch {
            detailed.push(s);
          }
        }
        if (!cancelled) setShows(detailed);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const out: UpcomingRow[] = [];
    const now = Date.now();
    const horizon = now + 1000 * 60 * 60 * 24 * 120;
    for (const show of applyParentalFilter(shows)) {
      for (const season of show.seasons || []) {
        for (const ep of season.episodes || []) {
          if (!ep.air_date) continue;
          const t = Date.parse(ep.air_date);
          if (!Number.isFinite(t)) continue;
          if (t >= now - 1000 * 60 * 60 * 24 * 14 && t <= horizon) {
            out.push({ show, episode: ep, air: ep.air_date });
          }
        }
      }
    }
    return out.sort((a, b) => a.air.localeCompare(b.air));
  }, [shows]);

  const view = useMemo(() => {
    const base = new Date();
    base.setDate(1);
    base.setMonth(base.getMonth() + monthOffset);
    const y = base.getFullYear();
    const m = base.getMonth();
    const label = base.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    const byDay = new Map<string, UpcomingRow[]>();
    for (const r of rows) {
      const d = new Date(r.air);
      if (d.getFullYear() !== y || d.getMonth() !== m) continue;
      const key = r.air.slice(0, 10);
      const arr = byDay.get(key) || [];
      arr.push(r);
      byDay.set(key, arr);
    }
    return { label, byDay: [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])) };
  }, [rows, monthOffset]);

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden" data-testid="upcoming-page">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Upcoming</h1>
          <p className="text-sm text-[var(--text-secondary)]">See when new episodes are airing.</p>
        </div>
        <div
          className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1"
          role="group"
          aria-label="Month navigation"
        >
          <button
            type="button"
            aria-label="Previous month"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated-2)] hover:text-[var(--text-primary)]"
            onClick={() => setMonthOffset((n) => n - 1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <span
            className="min-w-[9rem] text-center text-sm font-medium text-[var(--text-primary)]"
            aria-live="polite"
            aria-atomic="true"
          >
            {view.label}
          </span>
          <button
            type="button"
            aria-label="Next month"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated-2)] hover:text-[var(--text-primary)]"
            onClick={() => setMonthOffset((n) => n + 1)}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {loading && (
        <div data-testid="upcoming-loading" aria-busy="true">
          <LoadingStatus label="Loading upcoming episodes" />
          <ShelfSkeleton count={4} />
        </div>
      )}
      {error && <ErrorBanner message={error} />}
      {!loading && !error && view.byDay.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title="No upcoming episodes"
          message={`No air dates in ${view.label}.`}
          action={
            <Link
              to="/tv"
              className="text-sm font-medium text-[var(--accent-color)] hover:underline"
            >
              Browse TV
            </Link>
          }
          testId="upcoming-empty"
        />
      )}

      {!loading && !error && view.byDay.length > 0 && (
        <section className="space-y-4" aria-labelledby="upcoming-schedule-heading">
          <h2 id="upcoming-schedule-heading" className="sr-only">
            Episode schedule for {view.label}
          </h2>
          {view.byDay.map(([day, dayRows]) => (
            <section key={day} className="space-y-2" aria-labelledby={`upcoming-day-${day}`}>
              <h3
                id={`upcoming-day-${day}`}
                className="text-sm font-semibold uppercase tracking-wide text-[var(--text-tertiary)]"
              >
                {day}
              </h3>
              <ul className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                {dayRows.map((r) => {
                  const episodeLabel = `S${String(r.episode.season_number).padStart(2, '0')}E${String(r.episode.episode_number).padStart(2, '0')}${r.episode.title ? ` · ${r.episode.title}` : ''}`;
                  return (
                    <li
                      key={`${r.show.id}-${r.episode.id}`}
                      className="flex min-w-0 items-center gap-3 px-4 py-3 transition hover:bg-[var(--bg-elevated-2)]"
                    >
                      <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-[var(--bg-elevated-2)]">
                        {r.show.poster_url ? (
                          <img
                            src={r.show.poster_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-[var(--text-primary)]">
                          {r.show.title}
                        </p>
                        <p className="truncate text-xs text-[var(--text-tertiary)]">
                          {episodeLabel}
                        </p>
                      </div>
                      <Link
                        to={`/tv/${r.show.id}`}
                        aria-label={`Open ${r.show.title}, ${episodeLabel}`}
                        className="shrink-0 text-sm font-medium text-[var(--accent-color)] hover:underline"
                      >
                        Open
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </section>
      )}
    </div>
  );
}
