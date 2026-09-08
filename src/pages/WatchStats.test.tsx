import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WatchStats from './WatchStats';

const getWatchStats = vi.fn();
const getStaleLibrary = vi.fn();
const getLibraryDuplicates = vi.fn();
const getLibraryStorage = vi.fn();
const getLibraryStorageHistory = vi.fn();
const getWatchCharts = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      getWatchStats: (...args: unknown[]) => getWatchStats(...args),
      getStaleLibrary: (...args: unknown[]) => getStaleLibrary(...args),
      getLibraryDuplicates: (...args: unknown[]) => getLibraryDuplicates(...args),
      getLibraryStorage: (...args: unknown[]) => getLibraryStorage(...args),
      getLibraryStorageHistory: (...args: unknown[]) => getLibraryStorageHistory(...args),
      getWatchCharts: (...args: unknown[]) => getWatchCharts(...args),
    },
  };
});

describe('WatchStats page', () => {
  it('renders household play totals and top titles', async () => {
    getWatchStats.mockResolvedValue({
      available: true,
      days: 30,
      stats: [
        { key: 'plays', label: 'Plays', value: 12 },
        { key: 'watch_minutes', label: 'Watch minutes', value: 90 },
      ],
      topMovies: [{ title: 'Dune', mediaType: 'movie', playCount: 4, watchMinutes: 90 }],
      topShows: [],
      plays: [{ date: '2026-09-01', count: 3 }],
      libraries: [{ name: 'movies', playCount: 8, watchMinutes: 200 }],
    });
    getStaleLibrary.mockResolvedValue({
      available: true,
      neverWatched: 1,
      stale: 0,
      items: [{ title: 'Old Movie', itemId: 'm2', mediaType: 'movie', library: 'movies', category: 'never_watched', daysStale: 400, watchCount: 0 }],
    });
    getLibraryDuplicates.mockResolvedValue({
      available: true,
      groups: [{ title: 'Arrival', groupKey: 'mux:1', copyCount: 2, copies: [] }],
    });
    getLibraryStorage.mockResolvedValue({
      available: true,
      totalItems: 12,
      totalBytes: 1000,
      duplicateWasteBytes: 0,
      totalHuman: '931.3 MB',
      duplicateWasteHuman: '0 B',
      libraries: [{ name: 'uhd', itemCount: 4, bytes: 400 }],
    });
    getLibraryStorageHistory.mockResolvedValue({
      available: true,
      days: 90,
      history: [
        { day: '2026-08-01', bytes: 800_000_000, itemCount: 10 },
        { day: '2026-09-01', bytes: 1_000_000_000, itemCount: 12 },
      ],
      prediction: { growthBytesPerDay: 6_451_612, projectedBytes: 1_580_645_000, horizonDays: 90 },
    });
    getWatchCharts.mockResolvedValue({
      available: true,
      days: 30,
      hours: [{ key: '20', label: '20:00', count: 4 }],
      users: [{ key: 'pat', label: 'pat', count: 6 }],
      platforms: [{ key: 'web', label: 'Web', count: 5 }],
      daysOfWeek: [{ key: 'sat', label: 'Saturday', count: 7 }],
      months: [{ key: '2026-09', label: '2026-09', count: 12 }],
      streamTypes: [{ key: 'direct', label: 'Direct play', count: 9 }],
      streamResolutions: [{ key: '1080p', label: '1080p', count: 8 }],
      sourceResolutions: [{ key: '2160p', label: '2160p', count: 3 }],
      platformResolutions: [{ key: 'web|1080p', label: 'Web · 1080p', count: 4 }],
      concurrent: { peak: 3, series: [{ name: 'direct', peak: 3 }] },
    });
    render(
      <MemoryRouter>
        <WatchStats />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('watch-stats-page')).toBeInTheDocument();
    expect(screen.getByText('Plays')).toBeInTheDocument();
    expect(screen.getByTestId('watch-stats-totals')).toHaveTextContent('12');
    expect(screen.getByText('Dune')).toBeInTheDocument();
    expect(screen.getByText('movies')).toBeInTheDocument();
    expect(screen.getByTestId('watch-stats-plays')).toHaveTextContent('2026-09-01');
    expect(screen.getByTestId('watch-stats-stale')).toHaveTextContent('Old Movie');
    expect(screen.getByText('Never watched · 400d')).toBeInTheDocument();
    expect(screen.getByTestId('watch-stats-duplicates')).toHaveTextContent('Arrival');
    expect(screen.getByTestId('watch-stats-storage')).toHaveTextContent('12 titles');
    expect(screen.getByTestId('watch-stats-storage-history')).toHaveTextContent('2 snapshots');
    expect(screen.getByTestId('watch-stats-hours')).toHaveTextContent('20:00');
    expect(screen.getByTestId('watch-stats-dow')).toHaveTextContent('Saturday');
    expect(screen.getByTestId('watch-stats-stream-types')).toHaveTextContent('Direct play');
    expect(screen.getByTestId('watch-stats-users')).toHaveTextContent('pat');
    expect(screen.getByRole('link', { name: 'pat' })).toHaveAttribute('href', '/history?q=pat');
    expect(screen.getByTestId('watch-stats-concurrent')).toHaveTextContent('Peak 3');
  });
});
