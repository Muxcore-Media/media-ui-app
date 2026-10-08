import { setCurrentRoles } from '../lib/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AudiobookDetailPage from './AudiobookDetail';
import { NowPlayingProvider } from '../lib/nowPlaying';

const getAudiobook = vi.fn();
const setMonitored = vi.fn();
const removeLibraryItem = vi.fn();
const listRoots = vi.fn();
const pickRoot = vi.fn();
const setRootFolder = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      getAudiobook: (...args: unknown[]) => getAudiobook(...args),
      setMonitored: (...args: unknown[]) => setMonitored(...args),
      removeLibraryItem: (...args: unknown[]) => removeLibraryItem(...args),
      listRoots: (...args: unknown[]) => listRoots(...args),
      pickRoot: (...args: unknown[]) => pickRoot(...args),
      setRootFolder: (...args: unknown[]) => setRootFolder(...args),
      listItemArtwork: vi.fn().mockResolvedValue({ available: false, items: [] }),
      listItemHistory: vi.fn().mockResolvedValue({ available: false, items: [], total: 0 }),
    },
  };
});

function renderDetail() {
  return render(
    <NowPlayingProvider>
      <MemoryRouter initialEntries={['/audiobooks/ab1']}>
        <Routes>
          <Route path="/audiobooks/:id" element={<AudiobookDetailPage />} />
        </Routes>
      </MemoryRouter>
    </NowPlayingProvider>,
  );
}

describe('AudiobookDetail page', () => {
  beforeEach(() => {
    getAudiobook.mockReset();
    setMonitored.mockReset();
    removeLibraryItem.mockReset();
    setMonitored.mockResolvedValue({ monitored: false });
    removeLibraryItem.mockResolvedValue({ removed: true, delete_files: false });
    listRoots.mockReset();
    pickRoot.mockReset();
    setRootFolder.mockReset();
    listRoots.mockResolvedValue({
      available: true,
      roots: [{ id: 'r-ab', path: '/data/audiobooks', name: 'Audiobooks', mediaKind: 'audiobooks', accessible: true, freeBytes: 0, totalBytes: 0, isDefault: true }],
    });
    pickRoot.mockResolvedValue({ available: false, root: null, error: '' });
    setRootFolder.mockResolvedValue({ root_folder_path: '/data/audiobooks' });
    getAudiobook.mockResolvedValue({
      author: { id: 'au1', name: 'Andy Weir' },
      audiobook: {
        id: 'ab1',
        title: 'Project Hail Mary',
        narrator: 'Ray Porter',
        year: 2021,
        monitored: true,
        duration_seconds: 9600,
        files: [
          { id: 'f1', title: 'Part 1', stream_url: '/stream/audiobooks/f1' },
          { id: 'f2', title: 'Part 2', stream_url: '/stream/audiobooks/f2' },
        ],
      },
    });
  });

  it('renders title, narrator, and chapters', async () => {
    renderDetail();
    expect(await screen.findByTestId('audiobook-detail-page')).toBeInTheDocument();
    expect(screen.getByText('Project Hail Mary')).toBeInTheDocument();
    expect(screen.getByText(/Narrated by Ray Porter/)).toBeInTheDocument();
    expect(screen.getByText('Part 1')).toBeInTheDocument();
    expect(screen.getByText('Part 2')).toBeInTheDocument();
  });

  it('plays a chapter from the file list', async () => {
    renderDetail();
    const play = await screen.findByRole('button', { name: /Play Part 1/i });
    fireEvent.click(play);
    expect(await screen.findByRole('button', { name: /Pause Part 1/i })).toBeInTheDocument();
  });

  it('can unmonitor the audiobook', async () => {
    setCurrentRoles(['admin']);
    renderDetail();
    fireEvent.click(await screen.findByRole('button', { name: 'Monitored' }));
    await waitFor(() => {
      expect(setMonitored).toHaveBeenCalledWith({ kind: 'audiobook', id: 'ab1', monitored: false });
    });
  });

  it('removes the audiobook from the library', async () => {
    setCurrentRoles(['admin']);
    render(
      <NowPlayingProvider>
        <MemoryRouter initialEntries={['/audiobooks/ab1']}>
          <Routes>
            <Route path="/audiobooks/:id" element={<AudiobookDetailPage />} />
            <Route path="/audiobooks" element={<p>Audiobooks list</p>} />
          </Routes>
        </MemoryRouter>
      </NowPlayingProvider>,
    );
    fireEvent.click(await screen.findByTestId('remove-library'));
    fireEvent.click(screen.getByRole('button', { name: 'Remove from library' }));
    await waitFor(() => {
      expect(removeLibraryItem).toHaveBeenCalledWith({
        kind: 'audiobook',
        id: 'ab1',
        deleteFiles: false,
      });
    });
    expect(await screen.findByText('Audiobooks list')).toBeInTheDocument();
  });

  it('assigns a root folder to the audiobook author', async () => {
    setCurrentRoles(['admin']);
    renderDetail();
    fireEvent.change(await screen.findByLabelText('Root folder'), { target: { value: '/data/audiobooks' } });
    await waitFor(() => {
      expect(setRootFolder).toHaveBeenCalledWith({
        kind: 'audiobook',
        id: 'ab1',
        rootFolderPath: '/data/audiobooks',
      });
    });
  });
});
