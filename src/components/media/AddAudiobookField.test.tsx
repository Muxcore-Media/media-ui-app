import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AddAudiobookField } from './AddAudiobookField';

vi.mock('../../lib/session', () => ({
  canManageLibrary: () => true,
}));

describe('AddAudiobookField', () => {
  it('submits author, title, and year', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<AddAudiobookField onAdd={onAdd} />);
    fireEvent.change(screen.getByLabelText('Author'), { target: { value: 'Patrick Rothfuss' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'The Name of the Wind' } });
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2007' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add audiobook' }));
    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith({
        author: 'Patrick Rothfuss',
        title: 'The Name of the Wind',
        year: 2007,
      });
    });
  });
});
