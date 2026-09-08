import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AlternateTitlesCard } from './AlternateTitlesCard';
import { setCurrentRoles } from '../../lib/session';

const listAlternateTitles = vi.fn();
const addAlternateTitle = vi.fn();
const deleteAlternateTitle = vi.fn();

vi.mock('../../api/client', () => ({
  api: {
    listAlternateTitles: (...args: unknown[]) => listAlternateTitles(...args),
    addAlternateTitle: (...args: unknown[]) => addAlternateTitle(...args),
    deleteAlternateTitle: (...args: unknown[]) => deleteAlternateTitle(...args),
  },
}));

describe('AlternateTitlesCard', () => {
  beforeEach(() => {
    setCurrentRoles(['admin']);
    listAlternateTitles.mockReset();
    addAlternateTitle.mockReset();
    deleteAlternateTitle.mockReset();
    listAlternateTitles.mockResolvedValue({
      available: true,
      titles: [
        { id: 'mt1', title: 'Fight Club', cleanTitle: 'fight club', source: 'primary', user: false },
        { id: 'mt2', title: 'El club de la lucha', cleanTitle: 'club de la lucha', source: 'user', user: true },
      ],
    });
    addAlternateTitle.mockResolvedValue({
      id: 'mt-new',
      title: 'Club de Combate',
      cleanTitle: 'club de combate',
      source: 'user',
      user: true,
    });
    deleteAlternateTitle.mockResolvedValue({ removed: true, id: 'mt2' });
  });

  it('adds a household alternate title', async () => {
    render(<AlternateTitlesCard kind="movie" id="m1" />);
    expect(await screen.findByTestId('alternate-titles')).toBeInTheDocument();
    expect(screen.getByText('El club de la lucha')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('New alternate title'), { target: { value: 'Club de Combate' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add title' }));
    await waitFor(() => {
      expect(addAlternateTitle).toHaveBeenCalledWith('movie', 'm1', 'Club de Combate');
    });
  });
});
