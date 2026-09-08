import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SearchSubtitlesButton } from './SearchSubtitlesButton';

const searchSubtitleWanted = vi.fn();

vi.mock('../../api/client', () => ({
  api: {
    searchSubtitleWanted: (...args: unknown[]) => searchSubtitleWanted(...args),
  },
}));

vi.mock('../../lib/session', () => ({
  canManageSubtitles: () => true,
}));

describe('SearchSubtitlesButton', () => {
  it('searches wanted subtitles for the title', async () => {
    searchSubtitleWanted.mockReset();
    searchSubtitleWanted.mockResolvedValue({ searched: 1, downloaded: 0 });
    render(<SearchSubtitlesButton id="mov1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Search subtitles' }));
    await waitFor(() => {
      expect(searchSubtitleWanted).toHaveBeenCalledWith({ mediaIds: ['mov1'] });
    });
    expect(screen.getByText('Searched 1, downloaded 0')).toBeInTheDocument();
  });
});
