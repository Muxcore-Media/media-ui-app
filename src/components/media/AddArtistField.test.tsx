import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AddArtistField } from './AddArtistField';

vi.mock('../../lib/session', () => ({
  canManageLibrary: () => true,
}));

describe('AddArtistField', () => {
  it('submits artist name', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<AddArtistField onAdd={onAdd} />);
    fireEvent.change(screen.getByLabelText('Artist name'), { target: { value: 'Daft Punk' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add artist' }));
    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith({ name: 'Daft Punk' });
    });
  });
});
