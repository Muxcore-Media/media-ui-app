import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MusicArtist from './MusicArtist';

const getMusicArtist = vi.fn();
const getTrackLyrics = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      getMusicArtist: (...args: unknown[]) => getMusicArtist(...args),
      getTrackLyrics: (...args: unknown[]) => getTrackLyrics(...args),
    },
  };
});

describe('MusicArtist page', () => {
  beforeEach(() => {
    getMusicArtist.mockReset();
    getTrackLyrics.mockReset();
    getMusicArtist.mockResolvedValue({
      artist: { id: 'a1', name: 'Daft Punk', path: '/music/daft' },
      albums: [
        {
          id: 'al1',
          title: 'Discovery',
          year: 2001,
          tracks: [
            {
              id: 'tr1',
              title: 'One More Time',
              duration_sec: 320,
              stream_url: '/stream/music/tr1',
            },
          ],
        },
      ],
    });
    getTrackLyrics.mockResolvedValue({
      found: true,
      text: 'One more time',
      title: 'One More Time',
    });
  });

  it('renders artist albums and loads lyrics on play', async () => {
    render(
      <MemoryRouter initialEntries={['/music/a1']}>
        <Routes>
          <Route path="/music/:id" element={<MusicArtist />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('music-artist-page')).toBeInTheDocument();
    expect(screen.getByText('Daft Punk')).toBeInTheDocument();
    expect(screen.getByText('Discovery')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Play One More Time/i }));
    expect(await screen.findByText(/one more time/i, { selector: 'pre' })).toBeInTheDocument();
    expect(getTrackLyrics).toHaveBeenCalledWith('tr1');
  });
});

describe('MusicArtist accessibility', () => {
  beforeEach(() => {
    getMusicArtist.mockReset();
    getTrackLyrics.mockReset();
    getMusicArtist.mockResolvedValue({
      artist: { id: 'a1', name: 'Daft Punk', path: '/music/daft' },
      albums: [
        {
          id: 'al1',
          title: 'Discovery',
          year: 2001,
          tracks: [
            {
              id: 'tr1',
              title: 'One More Time',
              duration_sec: 320,
              stream_url: '/stream/music/tr1',
            },
          ],
        },
      ],
    });
  });

  it('has a page h1 and labelled album tracks', async () => {
    render(
      <MemoryRouter initialEntries={['/music/a1']}>
        <Routes>
          <Route path="/music/:id" element={<MusicArtist />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'Daft Punk' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Discovery tracks' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play One More Time' })).toBeInTheDocument();
  });
});
