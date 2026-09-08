import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DeleteEpisodeFileButton } from './DeleteEpisodeFileButton';

const removeEpisodeFile = vi.fn();

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>('../../api/client');
  return {
    ...actual,
    api: {
      removeEpisodeFile: (...args: unknown[]) => removeEpisodeFile(...args),
    },
  };
});

describe('DeleteEpisodeFileButton', () => {
  it('deletes an episode file after confirm', async () => {
    removeEpisodeFile.mockResolvedValue({ removed: true, delete_files: true });
    vi.stubGlobal('confirm', vi.fn(() => true));
    const onRemoved = vi.fn();
    render(<DeleteEpisodeFileButton id="e1" onRemoved={onRemoved} />);
    fireEvent.click(screen.getByTestId('delete-episode-file'));
    await waitFor(() => {
      expect(removeEpisodeFile).toHaveBeenCalledWith({ id: 'e1', deleteFiles: true });
    });
    expect(onRemoved).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
