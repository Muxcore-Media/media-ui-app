import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setCurrentRoles } from '../../lib/session';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PreviewRename } from './PreviewRename';
import { OperatorError } from '../../api/errors';
import { MEMBER_ROLE_CASES, OPERATOR_ROLE_CASES } from '../../test/operator-roles';

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
  // The BFF reserves these controls for admin/manager (T-M5-12).
  beforeEach(() => setCurrentRoles(['manager']));

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

describe('PreviewRename operator gate (T-M5-12)', () => {
  const preview = {
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
  };

  // The preview is a read and stays visible; only applying the rename is operator-only.
  it.each(MEMBER_ROLE_CASES)('shows the preview but no apply button for %s', async (_label, roles) => {
    previewRename.mockReset();
    previewRename.mockResolvedValue(preview);
    setCurrentRoles(roles);
    render(<PreviewRename kind="movie" id="m1" />);
    expect(await screen.findByTestId('preview-rename')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it.each(OPERATOR_ROLE_CASES)('offers apply to %s', async (_label, roles) => {
    previewRename.mockReset();
    previewRename.mockResolvedValue(preview);
    setCurrentRoles(roles);
    render(<PreviewRename kind="movie" id="m1" />);
    expect(await screen.findByRole('button', { name: 'Rename 1 file' })).toBeInTheDocument();
  });

  it('explains a stale-role 403 calmly and does not retry', async () => {
    previewRename.mockReset();
    previewRename.mockResolvedValue(preview);
    applyRename.mockReset();
    applyRename.mockRejectedValue(new OperatorError('operator.forbidden', 403));
    setCurrentRoles(['manager']);
    render(<PreviewRename kind="movie" id="m1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Rename 1 file' }));
    const notice = await screen.findByTestId('preview-rename-error');
    expect(notice).toHaveTextContent("You don't have permission for this action.");
    expect(notice).toHaveAttribute('role', 'status');
    expect(applyRename).toHaveBeenCalledTimes(1);
  });
});
