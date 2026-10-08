import { setCurrentRoles } from '../lib/session';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ALL_CAPABILITIES, CapabilitiesContext } from '../lib/capabilities';
import Missing from './Missing';

beforeEach(() => setCurrentRoles(['admin']));

const listMissing = vi.fn();
const addWanted = vi.fn();
const searchNow = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      listMissing: (...args: unknown[]) => listMissing(...args),
      addWanted: (...args: unknown[]) => addWanted(...args),
      searchNow: (...args: unknown[]) => searchNow(...args),
    },
  };
});

describe('Missing page', () => {
  beforeEach(() => {
    listMissing.mockReset();
    addWanted.mockReset();
    searchNow.mockReset();
    addWanted.mockResolvedValue({ added: true, queue_id: 'w_movie_m1' });
    searchNow.mockResolvedValue({ started: true, message: 'ok' });
  });

  it('lists monitored movies and episodes without files', async () => {
    listMissing.mockResolvedValue({
      available: true,
      movies: {
        available: true,
        total: 1,
        items: [{
          kind: 'movie',
          id: 'm1',
          itemId: 'm1',
          seriesId: '',
          title: 'Dune',
          year: 2021,
          tmdbId: 438631,
          seasonNumber: 0,
          episodeNumber: 0,
          airDate: '',
          qualityProfileId: 'qp_hd',
          href: '/movies/m1',
        }],
      },
      tv: {
        available: true,
        total: 1,
        items: [{
          kind: 'tv',
          id: 'ep1',
          itemId: 's1',
          seriesId: 's1',
          title: 'Severance',
          year: 2022,
          tmdbId: 1396,
          seasonNumber: 1,
          episodeNumber: 2,
          airDate: '2022-02-25',
          qualityProfileId: '',
          href: '/tv/s1',
        }],
      },
    });
    render(
      <MemoryRouter>
        <Missing />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('missing-movies')).toHaveTextContent('Dune');
    expect(screen.getByTestId('missing-tv')).toHaveTextContent('S01E02');
    fireEvent.click(screen.getAllByRole('button', { name: 'Search now' })[0]!);
    await waitFor(() => {
      expect(addWanted).toHaveBeenCalledWith(expect.objectContaining({ itemType: 'movie', itemId: 'm1', title: 'Dune' }));
      expect(searchNow).toHaveBeenCalledWith({ item_type: 'movie', item_id: 'm1' });
    });
  });

  it('lists missing albums when the music library is on', async () => {
    listMissing.mockResolvedValue({
      available: true,
      movies: { available: false, items: [], total: 0 },
      tv: { available: false, items: [], total: 0 },
      music: {
        available: true,
        total: 1,
        items: [{
          kind: 'music',
          id: 'al1',
          itemId: 'al1',
          seriesId: '',
          artistId: 'ar1',
          artistName: 'Radiohead',
          title: 'OK Computer',
          year: 1997,
          tmdbId: 0,
          musicbrainzId: 'mb-ok',
          seasonNumber: 0,
          episodeNumber: 0,
          airDate: '',
          qualityProfileId: 'qp_lossy',
          href: '/music/ar1',
        }],
      },
    });
    render(
      <CapabilitiesContext.Provider value={{ caps: ALL_CAPABILITIES, loading: false, error: null, retry: () => {} }}>
        <MemoryRouter>
          <Missing />
        </MemoryRouter>
      </CapabilitiesContext.Provider>,
    );
    expect(await screen.findByTestId('missing-music')).toHaveTextContent('OK Computer');
    expect(screen.getByText('Radiohead · 1997')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Search now' }));
    await waitFor(() => {
      expect(addWanted).toHaveBeenCalledWith(expect.objectContaining({
        itemType: 'music',
        itemId: 'al1',
        title: 'OK Computer',
        seriesId: 'ar1',
      }));
      expect(searchNow).toHaveBeenCalledWith({ item_type: 'music', item_id: 'al1' });
    });
  });

  it('lists missing books, comics, and audiobooks when those libraries are on', async () => {
    listMissing.mockResolvedValue({
      available: true,
      movies: { available: false, items: [], total: 0 },
      tv: { available: false, items: [], total: 0 },
      music: { available: false, items: [], total: 0 },
      books: {
        available: true,
        total: 1,
        items: [{
          kind: 'book',
          id: 'b1',
          itemId: 'b1',
          seriesId: 'a1',
          artistId: 'a1',
          artistName: 'Herbert',
          title: 'Dune',
          year: 1965,
          href: '/books/a1',
        }],
      },
      comics: {
        available: true,
        total: 1,
        items: [{
          kind: 'comic',
          id: 'i1',
          itemId: 'i1',
          seriesId: 's1',
          artistName: 'Saga',
          title: 'Chapter One',
          issueNumber: '1',
          year: 2012,
          href: '/comics/s1',
        }],
      },
      audiobooks: {
        available: true,
        total: 1,
        items: [{
          kind: 'audiobook',
          id: 'ab1',
          itemId: 'ab1',
          seriesId: 'a2',
          artistId: 'a2',
          artistName: 'Herbert',
          title: 'Dune (narrated)',
          year: 1965,
          href: '/audiobooks/ab1',
        }],
      },
    });
    render(
      <CapabilitiesContext.Provider value={{ caps: ALL_CAPABILITIES, loading: false, error: null, retry: () => {} }}>
        <MemoryRouter>
          <Missing />
        </MemoryRouter>
      </CapabilitiesContext.Provider>,
    );
    expect(await screen.findByTestId('missing-books')).toHaveTextContent('Dune');
    expect(screen.getByTestId('missing-comics')).toHaveTextContent('Chapter One');
    expect(screen.getByTestId('missing-audiobooks')).toHaveTextContent('Dune (narrated)');
    fireEvent.click(screen.getAllByRole('button', { name: 'Search now' })[0]!);
    await waitFor(() => {
      expect(addWanted).toHaveBeenCalledWith(expect.objectContaining({
        itemType: 'book',
        itemId: 'b1',
        title: 'Dune',
        seriesId: 'a1',
      }));
      expect(searchNow).toHaveBeenCalledWith({ item_type: 'book', item_id: 'b1' });
    });
  });
});
