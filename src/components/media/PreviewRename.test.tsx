import { setCurrentRoles } from '../../lib/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PreviewRename } from './PreviewRename';

beforeEach(() => setCurrentRoles(['admin']));

const previewRename = vi.fn();
const applyRename = vi.fn();

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>('../../api/client');
  return {
    ...actual,
    api: {
      previewRename: (...args: unknown[]) => previewRename(...args),
      applyRename: (...args: unknown[]) => applyRename(...args),
    },
  };
});

describe('PreviewRename', () => {
  it('applies changed movie files', async () => {
    previewRename.mockResolvedValue({
      available: true,
      items: [
        {
          fileId: 'f1',
          episodeId: '',
          title: 'Fight Club',
          currentPath: '/data/movies/Fight.Club.1999.mkv',
          newPath: '/data/movies/Fight Club (1999)/Fight Club (1999) [1080p].mkv',
          newFilename: 'Fight Club (1999) [1080p].mkv',
          changed: true,
          quality: '1080p',
        },
      ],
    });
    applyRename.mockResolvedValue({
      available: true,
      renamed: 1,
      errors: 0,
      items: [
        {
          fileId: 'f1',
          episodeId: '',
          title: 'Fight Club',
          currentPath: '/data/movies/Fight.Club.1999.mkv',
          newPath: '/data/movies/Fight Club (1999)/Fight Club (1999) [1080p].mkv',
          newFilename: 'Fight Club (1999) [1080p].mkv',
          changed: false,
          quality: '1080p',
        },
      ],
    });
    render(<PreviewRename kind="movie" id="m1" />);
    expect(await screen.findByTestId('preview-rename')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rename 1 file' }));
    await waitFor(() => {
      expect(applyRename).toHaveBeenCalledWith({ movieId: 'm1' });
    });
  });

  it('hides when rename is unavailable', async () => {
    previewRename.mockResolvedValue({ available: false, items: [] });
    const { container } = render(<PreviewRename kind="tv" id="s1" />);
    await waitFor(() => {
      expect(previewRename).toHaveBeenCalledWith({ tvId: 's1' });
    });
    expect(container).toBeEmptyDOMElement();
  });
});
