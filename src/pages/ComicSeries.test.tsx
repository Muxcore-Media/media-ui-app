import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ComicSeries from './ComicSeries';
import { setCurrentRoles } from '../lib/session';

const getComicSeries = vi.fn();
const setMonitored = vi.fn();
const removeLibraryItem = vi.fn();
const addComicIssue = vi.fn();
const importLibraryFile = vi.fn();
const listRoots = vi.fn();
const pickRoot = vi.fn();
const setRootFolder = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      getComicSeries: (...args: unknown[]) => getComicSeries(...args),
      setMonitored: (...args: unknown[]) => setMonitored(...args),
      removeLibraryItem: (...args: unknown[]) => removeLibraryItem(...args),
      addComicIssue: (...args: unknown[]) => addComicIssue(...args),
      importLibraryFile: (...args: unknown[]) => importLibraryFile(...args),
      listRoots: (...args: unknown[]) => listRoots(...args),
      pickRoot: (...args: unknown[]) => pickRoot(...args),
      setRootFolder: (...args: unknown[]) => setRootFolder(...args),
      listItemArtwork: vi.fn().mockResolvedValue({ available: false, items: [] }),
      listItemHistory: vi.fn().mockResolvedValue({ available: false, items: [], total: 0 }),
    },
  };
});

describe('ComicSeries page', () => {
  beforeEach(() => {
    getComicSeries.mockReset();
    setMonitored.mockReset();
    removeLibraryItem.mockReset();
    addComicIssue.mockReset();
    importLibraryFile.mockReset();
    listRoots.mockReset();
    pickRoot.mockReset();
    setRootFolder.mockReset();
    setCurrentRoles([]);
    listRoots.mockResolvedValue({
      available: true,
      roots: [{ id: 'r1', path: '/data/comics', name: 'Comics', mediaKind: 'comics', accessible: true, freeBytes: 0, totalBytes: 0, isDefault: true }],
    });
    pickRoot.mockResolvedValue({ available: false, root: null, error: '' });
    setRootFolder.mockResolvedValue({ root_folder_path: '/data/comics' });
    setMonitored.mockResolvedValue({ monitored: false });
    addComicIssue.mockResolvedValue({ added: true, item: { id: 'ci-new', title: 'Romance Dawn', number: '1' } });
    importLibraryFile.mockResolvedValue({ imported: true });
    removeLibraryItem.mockResolvedValue({ removed: true, delete_files: false });
    getComicSeries.mockResolvedValue({
      series: { id: 's1', title: 'Saga', publisher: 'Image', monitored: true },
      issues: [
        { id: 'i1', title: 'Chapter One', number: '1', year: 2012, stream_url: '/stream/comics/i1' },
        { id: 'i2', title: 'Chapter Two', number: '2', year: 2012 },
      ],
    });
  });

  it('renders series and issues, and opens the reader for a file', async () => {
    render(
      <MemoryRouter initialEntries={['/comics/s1']}>
        <Routes>
          <Route path="/comics/:id" element={<ComicSeries />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('comic-series-page')).toBeInTheDocument();
    expect(screen.getByText('Saga')).toBeInTheDocument();
    expect(screen.getByTestId('comic-issues')).toHaveTextContent('Chapter One');
    expect(screen.getByText('Missing file')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Read #1' }));
    expect(screen.getByTitle('Chapter One')).toHaveAttribute('src', '/stream/comics/i1');
  });

  it('can unmonitor the series', async () => {
    render(
      <MemoryRouter initialEntries={['/comics/s1']}>
        <Routes>
          <Route path="/comics/:id" element={<ComicSeries />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click((await screen.findAllByRole('button', { name: 'Monitored' }))[0]!);
    await waitFor(() => {
      expect(setMonitored).toHaveBeenCalledWith({ kind: 'series', id: 's1', monitored: false });
    });
  });

  it('removes the series from the library', async () => {
    render(
      <MemoryRouter initialEntries={['/comics/s1']}>
        <Routes>
          <Route path="/comics/:id" element={<ComicSeries />} />
          <Route path="/comics" element={<p>Comics list</p>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByTestId('remove-library'));
    fireEvent.click(screen.getByRole('button', { name: 'Remove from library' }));
    await waitFor(() => {
      expect(removeLibraryItem).toHaveBeenCalledWith({
        kind: 'series',
        id: 's1',
        deleteFiles: false,
      });
    });
    expect(await screen.findByText('Comics list')).toBeInTheDocument();
  });

  it('adds an issue to the series', async () => {
    setCurrentRoles(['admin']);
    render(
      <MemoryRouter initialEntries={['/comics/s1']}>
        <Routes>
          <Route path="/comics/:id" element={<ComicSeries />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.change(await screen.findByLabelText('Number'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Issue title'), { target: { value: 'Chapter Three' } });
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2012' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add issue' }));
    await waitFor(() => {
      expect(addComicIssue).toHaveBeenCalledWith({
        seriesId: 's1',
        title: 'Chapter Three',
        number: '3',
        year: 2012,
      });
    });
    expect(getComicSeries).toHaveBeenCalledTimes(2);
  });
});
