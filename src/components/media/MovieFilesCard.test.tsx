import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MovieFilesCard } from './MovieFilesCard';

const listMovieFiles = vi.fn();
const deleteMovieFile = vi.fn();

vi.mock('../../api/client', () => ({
  api: {
    listMovieFiles: (...args: unknown[]) => listMovieFiles(...args),
    deleteMovieFile: (...args: unknown[]) => deleteMovieFile(...args),
  },
}));

vi.mock('../../lib/session', () => ({
  canManageLibrary: () => true,
}));

describe('MovieFilesCard', () => {
  it('lists movie files and deletes one', async () => {
    listMovieFiles.mockReset();
    deleteMovieFile.mockReset();
    listMovieFiles.mockResolvedValue({
      available: true,
      items: [
        { id: 'f1', filename: 'Fight.Club.1999.mkv', quality: 'Bluray-1080p', sizeBytes: 12_000_000_000, container: 'mkv', createdAt: '' },
      ],
    });
    deleteMovieFile.mockResolvedValue({ removed: true, id: 'f1', delete_files: true });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onEmpty = vi.fn();
    render(<MovieFilesCard id="m1" onEmpty={onEmpty} />);
    expect(await screen.findByTestId('movie-file-list')).toHaveTextContent('Fight.Club.1999.mkv');
    fireEvent.click(screen.getByRole('button', { name: 'Delete Fight.Club.1999.mkv' }));
    await waitFor(() => {
      expect(deleteMovieFile).toHaveBeenCalledWith('m1', 'f1');
    });
    expect(onEmpty).toHaveBeenCalled();
  });
});
