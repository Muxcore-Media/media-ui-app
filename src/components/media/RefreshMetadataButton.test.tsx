import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RefreshMetadataButton } from './RefreshMetadataButton';

const refreshLibraryItem = vi.fn();

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>('../../api/client');
  return {
    ...actual,
    api: {
      refreshLibraryItem: (...args: unknown[]) => refreshLibraryItem(...args),
    },
  };
});

describe('RefreshMetadataButton', () => {
  it('refreshes a series', async () => {
    refreshLibraryItem.mockResolvedValue({ refreshed: true });
    const onRefreshed = vi.fn();
    render(<RefreshMetadataButton kind="tv" id="s1" onRefreshed={onRefreshed} />);
    fireEvent.click(screen.getByTestId('refresh-metadata'));
    await waitFor(() => {
      expect(refreshLibraryItem).toHaveBeenCalledWith({ kind: 'tv', id: 's1' });
    });
    expect(onRefreshed).toHaveBeenCalled();
    expect(screen.getByText('Refreshed')).toBeInTheDocument();
  });

  it('refreshes an artist', async () => {
    refreshLibraryItem.mockResolvedValue({ refreshed: true });
    render(<RefreshMetadataButton kind="artist" id="ar1" />);
    fireEvent.click(screen.getByTestId('refresh-metadata'));
    await waitFor(() => {
      expect(refreshLibraryItem).toHaveBeenCalledWith({ kind: 'artist', id: 'ar1' });
    });
  });
});
