import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { api } from '../api/client';
import { ShelfSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import { applyParentalFilter } from '../lib/parental';
import { calendarSearchNowBody } from '../lib/sessions';
import type { CalendarItem } from '../types';

function monthBounds(offset: number): { start: string; end: string; label: string } {
  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + offset);
  const y = base.getFullYear();
  const m = base.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  const iso = (d: Date) => {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  };
  return {
    start: iso(start),
    end: iso(end),
    label: base.toLocaleString(undefined, { month: 'long', year: 'numeric' }),
  };
}

export default function Upcoming() {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [missingOnly, setMissingOnly] = useState(false);
  const [searchingId, setSearchingId] = useState<string | null>(null);
  const [searchMsg, setSearchMsg] = useState<string | null>(null);

  const bounds = useMemo(() => monthBounds(monthOffset), [monthOffset]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [cal, shows, movies] = await Promise.all([
          api.listCalendar({ start: bounds.start, end: bounds.end }),
          api.listTVShows(1, 200).catch(() => ({ items: [] })),
          api.listMovies(1, 200).catch(() => ({ items: [] })),
        ]);
        if (cancelled) return;
        const ratings = new Map<string, string | undefined>();
        for (const s of shows.items || []) ratings.set(`tv:${s.id}`, s.content_rating);
        for (const m of movies.items || []) ratings.set(`movie:${m.id}`, m.content_rating);
        const rated = (cal.items || []).map((it) => ({
          ...it,
          content_rating:
            it.content_rating ||
            ratings.get(`${it.kind}:${it.parent_id}`) ||
            ratings.get(`${it.kind}:${it.id}`),
        }));
        setItems(applyParentalFilter(rated));
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bounds.start, bounds.end]);

  const visible = useMemo(
    () => (missingOnly ? items.filter((it) => !it.has_file) : items),
    [items, missingOnly],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const it of visible) {
      const key = (it.date || '').slice(0, 10);
      if (!key) continue;
      const arr = map.get(key) || [];
      arr.push(it);
      map.set(key, arr);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [visible]);

  async function searchMissing(row: CalendarItem) {
    const key = `${row.kind}-${row.id}`;
    setSearchingId(key);
    setSearchMsg(null);
    try {
      const out = await api.searchNow(calendarSearchNowBody(row));
      setSearchMsg(out.message || (out.started ? 'Search started' : 'Search did not start'));
    } catch (err) {
      setSearchMsg(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearchingId(null);
    }
  }

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden" data-testid="upcoming-page">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Upcoming</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Episode air dates and movie releases on one calendar — same daily view as Sonarr +
            Radarr. Search now grabs a missing title the day it airs.
          </p>
          <Link to="/missing" className="mt-1 inline-block text-sm font-semibold text-[var(--accent-color)] hover:underline">
            Library missing
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={missingOnly}
            onChange={(e) => setMissingOnly(e.target.checked)}
          />
          Missing only
        </label>
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
            {bounds.label}
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
        </div>
      </header>

      {loading && (
        <div data-testid="upcoming-loading" aria-busy="true">
          <LoadingStatus label="Loading upcoming episodes" />
          <ShelfSkeleton count={4} />
        </div>
      )}
      {error && <ErrorBanner message={error} />}
      {searchMsg ? (
        <p className="text-sm text-[var(--text-secondary)]" role="status">
          {searchMsg}
        </p>
      ) : null}
      {!loading && !error && byDay.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title="No upcoming episodes"
          message={`No air or release dates in ${bounds.label}.`}
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

      {!loading && !error && byDay.length > 0 && (
        <section className="space-y-4" aria-labelledby="upcoming-schedule-heading">
          <h2 id="upcoming-schedule-heading" className="sr-only">
            Schedule for {bounds.label}
          </h2>
          {byDay.map(([day, dayRows]) => (
            <section key={day} className="space-y-2" aria-labelledby={`upcoming-day-${day}`}>
              <h3
                id={`upcoming-day-${day}`}
                className="text-sm font-semibold uppercase tracking-wide text-[var(--text-tertiary)]"
              >
                {day}
              </h3>
              <ul className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                {dayRows.map((r) => {
                  const kindLabel = r.kind === 'movie' ? 'Movie' : 'TV';
                  const detail = r.subtitle || kindLabel;
                  const rowKey = `${r.kind}-${r.id}`;
                  return (
                    <li
                      key={rowKey}
                      className="flex min-w-0 items-center gap-3 px-4 py-3 transition hover:bg-[var(--bg-elevated-2)]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-[var(--text-primary)]">{r.title}</p>
                        <p className="truncate text-xs text-[var(--text-tertiary)]">
                          {kindLabel}
                          {detail ? ` · ${detail}` : ''}
                          {r.has_file ? ' · In library' : ' · Missing'}
                        </p>
                      </div>
                      {!r.has_file ? (
                        <button
                          type="button"
                          className="shrink-0 text-sm font-semibold text-[var(--accent-color)] hover:underline disabled:opacity-50"
                          disabled={searchingId === rowKey}
                          onClick={() => void searchMissing(r)}
                        >
                          {searchingId === rowKey ? 'Searching…' : 'Search now'}
                        </button>
                      ) : null}
                      <Link
                        to={r.href}
                        aria-label={`Open ${r.title}, ${detail}`}
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
