import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MusicArtist from './MusicArtist';
import { NowPlayingProvider } from '../lib/nowPlaying';
import { setCurrentRoles } from '../lib/session';

const getMusicArtist = vi.fn();
const getTrackLyrics = vi.fn();
const setMonitored = vi.fn();
const removeLibraryItem = vi.fn();
const refreshLibraryItem = vi.fn();
const deleteTrackFile = vi.fn();
const getFormats = vi.fn();
const setQualityProfile = vi.fn();
const listRoots = vi.fn();
const pickRoot = vi.fn();
const setRootFolder = vi.fn();
const importLibraryFile = vi.fn();
const addMusicAlbum = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      getMusicArtist: (...args: unknown[]) => getMusicArtist(...args),
      getTrackLyrics: (...args: unknown[]) => getTrackLyrics(...args),
      setMonitored: (...args: unknown[]) => setMonitored(...args),
      removeLibraryItem: (...args: unknown[]) => removeLibraryItem(...args),
      refreshLibraryItem: (...args: unknown[]) => refreshLibraryItem(...args),
      deleteTrackFile: (...args: unknown[]) => deleteTrackFile(...args),
      getFormats: (...args: unknown[]) => getFormats(...args),
      setQualityProfile: (...args: unknown[]) => setQualityProfile(...args),
      listRoots: (...args: unknown[]) => listRoots(...args),
      pickRoot: (...args: unknown[]) => pickRoot(...args),
      setRootFolder: (...args: unknown[]) => setRootFolder(...args),
      importLibraryFile: (...args: unknown[]) => importLibraryFile(...args),
      addMusicAlbum: (...args: unknown[]) => addMusicAlbum(...args),
      listTags: vi.fn().mockResolvedValue({ available: false, tags: [] }),
      getItemTags: vi.fn().mockResolvedValue({ available: false, tags: [] }),
      setItemTags: vi.fn(),
      listItemHistory: vi.fn().mockResolvedValue({ available: false, items: [], total: 0 }),
    },
  };
});

describe('MusicArtist page', () => {
  beforeEach(() => {
    getMusicArtist.mockReset();
    getTrackLyrics.mockReset();
    setMonitored.mockReset();
    removeLibraryItem.mockReset();
    refreshLibraryItem.mockReset();
    deleteTrackFile.mockReset();
    getFormats.mockReset();
    setQualityProfile.mockReset();
    listRoots.mockReset();
    pickRoot.mockReset();
    setRootFolder.mockReset();
    importLibraryFile.mockReset();
    addMusicAlbum.mockReset();
    setCurrentRoles([]);
    setMonitored.mockResolvedValue({ monitored: false });
    removeLibraryItem.mockResolvedValue({ removed: true, delete_files: false });
    refreshLibraryItem.mockResolvedValue({ refreshed: true });
    deleteTrackFile.mockResolvedValue({ removed: true, id: 'tr1', delete_files: true });
    getFormats.mockResolvedValue({
      available: true,
      formats: [],
      profiles: [{ id: 'qp_flac', name: 'FLAC', minScore: 0, cutoffScore: 10000, upgradeAllowed: true, formatScores: {} }],
    });
    setQualityProfile.mockResolvedValue({ quality_profile_id: 'qp_flac' });
    listRoots.mockResolvedValue({
      available: true,
      roots: [{ id: 'r2', path: '/data/music', name: 'Music', mediaKind: 'music', accessible: true, freeBytes: 0, totalBytes: 0, isDefault: true }],
    });
    pickRoot.mockResolvedValue({ available: false, root: null, error: '' });
    setRootFolder.mockResolvedValue({ root_folder_path: '/data/music' });
    importLibraryFile.mockResolvedValue({ id: 'tr2', stream_url: '/stream/music/tr2', imported: true });
    addMusicAlbum.mockResolvedValue({ added: true, album: { id: 'al-new', title: 'Homework', year: 1997 } });
    getMusicArtist.mockResolvedValue({
      artist: { id: 'a1', name: 'Daft Punk', path: '/music/daft', monitored: true },
      albums: [
        {
          id: 'al1',
          title: 'Discovery',
          year: 2001,
          monitored: true,
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
      <NowPlayingProvider>
      <MemoryRouter initialEntries={['/music/a1']}>
        <Routes>
          <Route path="/music/:id" element={<MusicArtist />} />
        </Routes>
      </MemoryRouter>
      </NowPlayingProvider>,
    );
    expect(await screen.findByTestId('music-artist-page')).toBeInTheDocument();
    expect(screen.getByText('Daft Punk')).toBeInTheDocument();
    expect(screen.getByText('Discovery')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Play One More Time/i }));
    expect(await screen.findByText(/one more time/i, { selector: 'pre' })).toBeInTheDocument();
    expect(getTrackLyrics).toHaveBeenCalledWith('tr1');
  });

  it('unmonitors an album', async () => {
    render(
      <NowPlayingProvider>
        <MemoryRouter initialEntries={['/music/a1']}>
          <Routes>
            <Route path="/music/:id" element={<MusicArtist />} />
          </Routes>
        </MemoryRouter>
      </NowPlayingProvider>,
    );
    expect(await screen.findByTestId('music-artist-page')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Monitored' })[1]!);
    await waitFor(() => {
      expect(setMonitored).toHaveBeenCalledWith({ kind: 'album', id: 'al1', monitored: false });
    });
  });

  it('removes the artist from the library', async () => {
    render(
      <NowPlayingProvider>
        <MemoryRouter initialEntries={['/music/a1']}>
          <Routes>
            <Route path="/music/:id" element={<MusicArtist />} />
            <Route path="/music" element={<p>Music list</p>} />
          </Routes>
        </MemoryRouter>
      </NowPlayingProvider>,
    );
    fireEvent.click(await screen.findByTestId('remove-library'));
    fireEvent.click(screen.getByRole('button', { name: 'Remove from library' }));
    await waitFor(() => {
      expect(removeLibraryItem).toHaveBeenCalledWith({
        kind: 'artist',
        id: 'a1',
        deleteFiles: false,
      });
    });
    expect(await screen.findByText('Music list')).toBeInTheDocument();
  });

  it('refreshes artist metadata', async () => {
    render(
      <NowPlayingProvider>
        <MemoryRouter initialEntries={['/music/a1']}>
          <Routes>
            <Route path="/music/:id" element={<MusicArtist />} />
          </Routes>
        </MemoryRouter>
      </NowPlayingProvider>,
    );
    fireEvent.click(await screen.findByTestId('refresh-metadata'));
    await waitFor(() => {
      expect(refreshLibraryItem).toHaveBeenCalledWith({ kind: 'artist', id: 'a1' });
    });
    expect(getMusicArtist).toHaveBeenCalledTimes(2);
  });

  it('deletes a track file when managing the library', async () => {
    setCurrentRoles(['admin']);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <NowPlayingProvider>
        <MemoryRouter initialEntries={['/music/a1']}>
          <Routes>
            <Route path="/music/:id" element={<MusicArtist />} />
          </Routes>
        </MemoryRouter>
      </NowPlayingProvider>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Delete One More Time' }));
    await waitFor(() => {
      expect(deleteTrackFile).toHaveBeenCalledWith('a1', 'tr1');
    });
    expect(screen.queryByText('One More Time')).not.toBeInTheDocument();
  });

  it('assigns a quality profile to the artist', async () => {
    render(
      <NowPlayingProvider>
        <MemoryRouter initialEntries={['/music/a1']}>
          <Routes>
            <Route path="/music/:id" element={<MusicArtist />} />
          </Routes>
        </MemoryRouter>
      </NowPlayingProvider>,
    );
    fireEvent.change(await screen.findByLabelText('Quality profile'), { target: { value: 'qp_flac' } });
    await waitFor(() => {
      expect(setQualityProfile).toHaveBeenCalledWith({
        kind: 'artist',
        id: 'a1',
        qualityProfileId: 'qp_flac',
      });
    });
  });

  it('assigns a root folder to the artist', async () => {
    render(
      <NowPlayingProvider>
        <MemoryRouter initialEntries={['/music/a1']}>
          <Routes>
            <Route path="/music/:id" element={<MusicArtist />} />
          </Routes>
        </MemoryRouter>
      </NowPlayingProvider>,
    );
    fireEvent.change(await screen.findByLabelText('Root folder'), { target: { value: '/data/music' } });
    await waitFor(() => {
      expect(setRootFolder).toHaveBeenCalledWith({
        kind: 'artist',
        id: 'a1',
        rootFolderPath: '/data/music',
      });
    });
  });

  it('imports a track file onto an album', async () => {
    setCurrentRoles(['admin']);
    render(
      <NowPlayingProvider>
        <MemoryRouter initialEntries={['/music/a1']}>
          <Routes>
            <Route path="/music/:id" element={<MusicArtist />} />
          </Routes>
        </MemoryRouter>
      </NowPlayingProvider>,
    );
    fireEvent.change(await screen.findByLabelText('File path'), { target: { value: '/data/music/Harder.Better.flac' } });
    fireEvent.click(screen.getByRole('button', { name: 'Import file' }));
    await waitFor(() => {
      expect(importLibraryFile).toHaveBeenCalledWith({
        kind: 'album',
        id: 'al1',
        path: '/data/music/Harder.Better.flac',
      });
    });
    expect(getMusicArtist).toHaveBeenCalledTimes(2);
  });

  it('adds an album to the artist', async () => {
    setCurrentRoles(['admin']);
    render(
      <NowPlayingProvider>
        <MemoryRouter initialEntries={['/music/a1']}>
          <Routes>
            <Route path="/music/:id" element={<MusicArtist />} />
          </Routes>
        </MemoryRouter>
      </NowPlayingProvider>,
    );
    fireEvent.change(await screen.findByLabelText('Album title'), { target: { value: 'Homework' } });
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '1997' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add album' }));
    await waitFor(() => {
      expect(addMusicAlbum).toHaveBeenCalledWith({
        artistId: 'a1',
        title: 'Homework',
        year: 1997,
      });
    });
    expect(getMusicArtist).toHaveBeenCalledTimes(2);
  });
});

describe('MusicArtist accessibility', () => {
  beforeEach(() => {
    getMusicArtist.mockReset();
    getTrackLyrics.mockReset();
    setCurrentRoles([]);
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
      <NowPlayingProvider>
      <MemoryRouter initialEntries={['/music/a1']}>
        <Routes>
          <Route path="/music/:id" element={<MusicArtist />} />
        </Routes>
      </MemoryRouter>
      </NowPlayingProvider>,
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'Daft Punk' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Discovery tracks' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play One More Time' })).toBeInTheDocument();
  });
});
