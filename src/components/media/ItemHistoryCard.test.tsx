import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ItemHistoryCard } from './ItemHistoryCard';

const listItemHistory = vi.fn();

vi.mock('../../api/client', () => ({
  api: {
    listItemHistory: (...args: unknown[]) => listItemHistory(...args),
  },
}));

describe('ItemHistoryCard', () => {
  beforeEach(() => {
    listItemHistory.mockReset();
    listItemHistory.mockResolvedValue({
      available: true,
      total: 1,
      items: [
        {
          id: 'mh1',
          eventType: 'grab',
          itemId: 'm1',
          title: 'Fight Club',
          sourceTitle: 'Fight.Club.1999.1080p',
          quality: 'Bluray-1080p',
          indexer: 'Knaben',
          filePath: '',
          downloadId: 'dl1',
          createdAt: '2026-09-08T10:00:00Z',
        },
      ],
    });
  });

  it('renders grab history for a title', async () => {
    render(<ItemHistoryCard kind="movie" id="m1" />);
    expect(await screen.findByTestId('item-history')).toBeInTheDocument();
    expect(screen.getByTestId('item-history-list')).toHaveTextContent('Grabbed');
    expect(screen.getByTestId('item-history-list')).toHaveTextContent('Knaben');
  });

  it('hides when history is unavailable', async () => {
    listItemHistory.mockResolvedValue({ available: false, items: [], total: 0 });
    render(<ItemHistoryCard kind="tv" id="s1" />);
    await waitFor(() => {
      expect(screen.queryByTestId('item-history')).not.toBeInTheDocument();
    });
  });
});
