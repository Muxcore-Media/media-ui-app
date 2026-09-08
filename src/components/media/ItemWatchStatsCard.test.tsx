import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ItemWatchStatsCard } from './ItemWatchStatsCard';

const getItemWatchStats = vi.fn();

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>('../../api/client');
  return {
    ...actual,
    api: {
      getItemWatchStats: (...args: unknown[]) => getItemWatchStats(...args),
    },
  };
});

describe('ItemWatchStatsCard', () => {
  it('shows household plays for a title', async () => {
    getItemWatchStats.mockResolvedValue({
      available: true,
      itemId: 'm1',
      playCount: 4,
      uniqueUsers: 2,
      watchMinutes: 90,
      neverWatched: false,
      hasActivity: true,
      lastWatchedAt: '2026-09-01T12:00:00Z',
      daysSinceLastWatch: 7,
    });
    render(<ItemWatchStatsCard id="m1" runtimeMinutes={139} />);
    expect(await screen.findByTestId('item-watch-stats')).toBeInTheDocument();
    expect(screen.getByText('4 plays · 2 watchers · 1h 30m')).toBeInTheDocument();
    expect(getItemWatchStats).toHaveBeenCalledWith('m1', 139);
  });

  it('hides when the monitor has no item stats', async () => {
    getItemWatchStats.mockResolvedValue({ available: false, itemId: 'm1', playCount: 0 });
    const { container } = render(<ItemWatchStatsCard id="m1" />);
    await waitFor(() => {
      expect(getItemWatchStats).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('item-watch-stats')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });
});
