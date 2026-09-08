import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AddAlbumField } from './AddAlbumField';

vi.mock('../../lib/session', () => ({
  canManageLibrary: () => true,
}));

describe('AddAlbumField', () => {
  it('submits title and year', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<AddAlbumField onAdd={onAdd} />);
    fireEvent.change(screen.getByLabelText('Album title'), { target: { value: 'Homework' } });
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '1997' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add album' }));
    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith({ title: 'Homework', year: 1997 });
    });
  });
});
