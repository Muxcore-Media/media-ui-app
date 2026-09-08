import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Comics from './Comics';
import { setCurrentRoles } from '../lib/session';

const listComics = vi.fn();
const addComicSeries = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      listComics: (...args: unknown[]) => listComics(...args),
      addComicSeries: (...args: unknown[]) => addComicSeries(...args),
    },
  };
});

describe('Comics library page', () => {
  beforeEach(() => {
    listComics.mockReset();
    addComicSeries.mockReset();
    setCurrentRoles([]);
    addComicSeries.mockResolvedValue({ added: true, item: { id: 'cs-new', title: 'One Piece' } });
    listComics.mockResolvedValue({
      items: [{ id: 's1', name: 'Saga', title: 'Saga' }],
      available: true,
      total: 1,
    });
  });

  it('lists series from BFF', async () => {
    render(
      <MemoryRouter>
        <Comics />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('comics-page')).toBeInTheDocument();
    expect(await screen.findByText('Saga')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Saga' }).getAttribute('href')).toBe('/comics/s1');
  });

  it('adds a series from the library list', async () => {
    setCurrentRoles(['admin']);
    listComics
      .mockResolvedValueOnce({
        items: [{ id: 's1', name: 'Saga', title: 'Saga' }],
        available: true,
        total: 1,
      })
      .mockResolvedValueOnce({
        items: [
          { id: 's1', name: 'Saga', title: 'Saga' },
          { id: 'cs-new', name: 'One Piece', title: 'One Piece' },
        ],
        available: true,
        total: 2,
      });
    render(
      <MemoryRouter>
        <Comics />
      </MemoryRouter>,
    );
    fireEvent.change(await screen.findByLabelText('Series title'), { target: { value: 'One Piece' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add series' }));
    await waitFor(() => {
      expect(addComicSeries).toHaveBeenCalledWith({ title: 'One Piece' });
    });
    expect(await screen.findByRole('link', { name: 'One Piece' })).toBeInTheDocument();
  });
});
