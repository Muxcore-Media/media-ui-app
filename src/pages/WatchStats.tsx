import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { api } from '../api/client';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import { ShelfSkeleton } from '../components/ui/Skeleton';
import {
  formatLibraryBytes,
  formatWatchMinutes,
  formatWatchStatValue,
  staleItemLabel,
  storageHistoryLabel,
  storageSummaryLabel,
  type DuplicatesResponse,
  type StorageHistoryResponse,
  type StaleLibraryResponse,
  type StorageResponse,
  type WatchChartsResponse,
  type WatchChartBucket,
  type WatchStatsResponse,
  type WatchTopTitle,
} from '../lib/watch-stats';

function TopList({ title, rows }: { title: string; rows: WatchTopTitle[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
      <ul className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
        {rows.map((row) => (
          <li key={`${title}-${row.title}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <p className="min-w-0 truncate text-sm text-[var(--text-primary)]">{row.title}</p>
            <p className="shrink-0 text-xs text-[var(--text-tertiary)]">
              {row.playCount} plays
              {row.watchMinutes > 0 ? ` · ${formatWatchMinutes(row.watchMinutes)}` : ''}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function BucketList({
  title,
  testId,
  rows,
  hrefFor,
}: {
  title: string;
  testId: string;
  rows: WatchChartBucket[];
  hrefFor?: (row: WatchChartBucket) => string;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
      <ul className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]" data-testid={testId}>
        {rows.map((row) => {
          const href = hrefFor?.(row);
          return (
            <li key={row.key || row.label} className="flex items-center justify-between gap-3 px-4 py-2.5">
              {href ? (
                <Link to={href} className="min-w-0 truncate text-sm font-medium text-[var(--accent-color)] hover:underline">
                  {row.label}
                </Link>
              ) : (
                <p className="min-w-0 truncate text-sm text-[var(--text-primary)]">{row.label}</p>
              )}
              <p className="shrink-0 text-xs text-[var(--text-tertiary)]">{Math.round(row.count)}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function WatchStats() {
  const [data, setData] = useState<WatchStatsResponse | null>(null);
  const [stale, setStale] = useState<StaleLibraryResponse | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicatesResponse | null>(null);
  const [storage, setStorage] = useState<StorageResponse | null>(null);
  const [storageHistory, setStorageHistory] = useState<StorageHistoryResponse | null>(null);
  const [charts, setCharts] = useState<WatchChartsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      api.getWatchStats(30),
      api.getStaleLibrary(90).catch(() => ({ available: false, items: [], neverWatched: 0, stale: 0 })),
      api.getLibraryDuplicates().catch(() => ({ available: false, groups: [] })),
      api.getLibraryStorage().catch(() => ({
        available: false,
        totalItems: 0,
        totalBytes: 0,
        duplicateWasteBytes: 0,
        totalHuman: '',
        duplicateWasteHuman: '',
        libraries: [],
      })),
      api.getLibraryStorageHistory(90).catch(() => ({
        available: false,
        days: 90,
        history: [],
        prediction: { growthBytesPerDay: 0, projectedBytes: 0, horizonDays: 90 },
      })),
      api.getWatchCharts(30).catch(() => ({
        available: false,
        days: 30,
        hours: [],
        users: [],
        platforms: [],
        daysOfWeek: [],
        months: [],
        streamTypes: [],
        streamResolutions: [],
        sourceResolutions: [],
        platformResolutions: [],
        concurrent: { peak: 0, series: [] },
      })),
    ])
      .then(([res, staleRes, dupRes, storageRes, historyRes, chartsRes]) => {
        if (!cancelled) {
          setData(res);
          setStale(staleRes);
          setDuplicates(dupRes);
          setStorage(storageRes);
          setStorageHistory(historyRes);
          setCharts(chartsRes);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load watch stats');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6" data-testid="watch-stats-page">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Watch stats</h1>
        <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
          Household plays from the playback monitor — the same totals Tautulli shows for the last 30 days.
        </p>
        <Link to="/sessions" className="inline-block text-sm font-semibold text-[var(--accent-color)] hover:underline">
          Now watching
        </Link>
      </header>
      {loading ? (
        <div aria-busy="true">
          <LoadingStatus label="Loading watch stats" />
          <ShelfSkeleton count={3} />
        </div>
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}
      {!loading && data && !data.available ? (
        <p className="text-sm text-[var(--text-secondary)]">Playback monitor is not listing watch stats right now.</p>
      ) : null}
      {!loading && data?.available && data.stats.length === 0 && data.topMovies.length === 0 && data.plays.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No plays yet"
          message="Stats appear after someone in the house watches a title on the native player."
        />
      ) : null}
      {data?.available && data.stats.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="watch-stats-totals">
          {data.stats.map((stat) => (
            <li
              key={stat.key || stat.label}
              className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-4 py-3"
            >
              <p className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{formatWatchStatValue(stat)}</p>
            </li>
          ))}
        </ul>
      ) : null}
      {data?.available ? (
        <>
          <TopList title="Top movies" rows={data.topMovies} />
          <TopList title="Top shows" rows={data.topShows} />
          {data.libraries.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Libraries</h2>
              <ul className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                {data.libraries.map((row) => (
                  <li key={row.name} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <p className="text-sm text-[var(--text-primary)]">{row.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {row.playCount} plays
                      {row.watchMinutes > 0 ? ` · ${formatWatchMinutes(row.watchMinutes)}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {data.plays.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Plays by day</h2>
              <ul className="space-y-1" data-testid="watch-stats-plays">
                {data.plays.map((row) => (
                  <li key={row.date} className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
                    <span>{row.date}</span>
                    <span>{row.count}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
      {charts?.available ? (
        <>
          <BucketList title="Plays by hour" testId="watch-stats-hours" rows={charts.hours} />
          <BucketList title="Plays by weekday" testId="watch-stats-dow" rows={charts.daysOfWeek} />
          <BucketList title="Plays by month" testId="watch-stats-months" rows={charts.months} />
          <BucketList
            title="Top watchers"
            testId="watch-stats-users"
            rows={charts.users}
            hrefFor={(row) => `/history?q=${encodeURIComponent(row.key || row.label)}`}
          />
          <BucketList title="Platforms" testId="watch-stats-platforms" rows={charts.platforms} />
          <BucketList title="Stream type" testId="watch-stats-stream-types" rows={charts.streamTypes} />
          <BucketList title="Stream resolution" testId="watch-stats-stream-res" rows={charts.streamResolutions} />
          <BucketList title="Source resolution" testId="watch-stats-source-res" rows={charts.sourceResolutions} />
          <BucketList title="Platform · resolution" testId="watch-stats-platform-res" rows={charts.platformResolutions} />
          {charts.concurrent.peak > 0 || charts.concurrent.series.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Concurrent streams</h2>
              <p className="text-xs text-[var(--text-tertiary)]" data-testid="watch-stats-concurrent">
                Peak {Math.round(charts.concurrent.peak)}
              </p>
              {charts.concurrent.series.length > 0 ? (
                <ul className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                  {charts.concurrent.series.map((row) => (
                    <li key={row.name} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <p className="text-sm text-[var(--text-primary)]">{row.name}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{Math.round(row.peak)}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}
      {stale?.available && stale.items.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Never watched and stale</h2>
          <p className="text-xs text-[var(--text-tertiary)]">
            {Math.round(stale.neverWatched)} never watched · {Math.round(stale.stale)} stale past 90 days
          </p>
          <ul className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]" data-testid="watch-stats-stale">
            {stale.items.map((row) => (
              <li key={`${row.itemId}-${row.title}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <p className="min-w-0 truncate text-sm text-[var(--text-primary)]">{row.title}</p>
                <p className="shrink-0 text-xs text-[var(--text-tertiary)]">{staleItemLabel(row)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {duplicates?.available && duplicates.groups.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Duplicate copies</h2>
          <ul className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]" data-testid="watch-stats-duplicates">
            {duplicates.groups.map((row) => (
              <li key={row.groupKey || row.title} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <p className="min-w-0 truncate text-sm text-[var(--text-primary)]">{row.title}</p>
                <p className="shrink-0 text-xs text-[var(--text-tertiary)]">{Math.round(row.copyCount || row.copies.length)} copies</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {storage?.available && (storage.totalItems > 0 || storage.libraries.length > 0) ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Library storage</h2>
          <p className="text-xs text-[var(--text-tertiary)]" data-testid="watch-stats-storage">
            {storageSummaryLabel(storage)}
          </p>
          {storage.libraries.length > 0 ? (
            <ul className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
              {storage.libraries.map((row) => (
                <li key={row.name} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <p className="text-sm text-[var(--text-primary)]">{row.name}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {Math.round(row.itemCount)} titles
                    {row.bytes > 0 ? ` · ${formatLibraryBytes(row.bytes)}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
      {storageHistory?.available && storageHistory.history.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Storage over time</h2>
          <p className="text-xs text-[var(--text-tertiary)]" data-testid="watch-stats-storage-history">
            {storageHistoryLabel(storageHistory)}
          </p>
          <ul className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
            {storageHistory.history.slice(-8).map((row) => (
              <li key={row.day} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <p className="text-sm text-[var(--text-primary)]">{row.day}</p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {Math.round(row.itemCount)} titles
                  {row.bytes > 0 ? ` · ${formatLibraryBytes(row.bytes)}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
