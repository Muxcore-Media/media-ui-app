import { setCurrentRoles } from '../../lib/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RemoveLibraryButton } from './RemoveLibraryButton';

beforeEach(() => setCurrentRoles(['admin']));

const removeLibraryItem = vi.fn();

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>('../../api/client');
  return {
    ...actual,
    api: {
      removeLibraryItem: (...args: unknown[]) => removeLibraryItem(...args),
    },
  };
});

describe('RemoveLibraryButton', () => {
  it('removes a movie and can delete files', async () => {
    removeLibraryItem.mockResolvedValue({ removed: true, delete_files: true });
    const onRemoved = vi.fn();
    render(<RemoveLibraryButton kind="movie" id="m1" title="Dune" hasFile onRemoved={onRemoved} />);
    fireEvent.click(screen.getByTestId('remove-library'));
    fireEvent.click(screen.getByTestId('remove-library-delete-files'));
    fireEvent.click(screen.getByRole('button', { name: 'Remove and delete files' }));
    await waitFor(() => {
      expect(removeLibraryItem).toHaveBeenCalledWith({ kind: 'movie', id: 'm1', deleteFiles: true });
    });
    expect(onRemoved).toHaveBeenCalled();
  });
});
