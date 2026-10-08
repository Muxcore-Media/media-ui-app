import { setCurrentRoles } from '../../lib/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DeleteMovieFileButton } from './DeleteMovieFileButton';

beforeEach(() => setCurrentRoles(['admin']));

const removeMovieFile = vi.fn();

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>('../../api/client');
  return {
    ...actual,
    api: {
      removeMovieFile: (...args: unknown[]) => removeMovieFile(...args),
    },
  };
});

describe('DeleteMovieFileButton', () => {
  it('deletes a movie file after confirm', async () => {
    removeMovieFile.mockResolvedValue({ removed: true, delete_files: true, files: 1 });
    vi.stubGlobal('confirm', vi.fn(() => true));
    const onRemoved = vi.fn();
    render(<DeleteMovieFileButton id="m1" onRemoved={onRemoved} />);
    fireEvent.click(screen.getByTestId('delete-movie-file'));
    await waitFor(() => {
      expect(removeMovieFile).toHaveBeenCalledWith({ id: 'm1', deleteFiles: true });
    });
    expect(onRemoved).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
