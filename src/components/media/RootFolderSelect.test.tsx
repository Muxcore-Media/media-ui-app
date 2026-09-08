import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RootFolderSelect } from './RootFolderSelect';

const listRoots = vi.fn();
const pickRoot = vi.fn();
const setRootFolder = vi.fn();

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>('../../api/client');
  return {
    ...actual,
    api: {
      listRoots: (...args: unknown[]) => listRoots(...args),
      pickRoot: (...args: unknown[]) => pickRoot(...args),
      setRootFolder: (...args: unknown[]) => setRootFolder(...args),
    },
  };
});

describe('RootFolderSelect', () => {
  it('assigns a library root to a movie', async () => {
    pickRoot.mockResolvedValue({ available: false, root: null, error: '' });
    listRoots.mockResolvedValue({
      available: true,
      roots: [{ id: 'r1', path: '/data/uhd', name: 'UHD', mediaKind: 'movies', accessible: true, freeBytes: 0, totalBytes: 0, isDefault: true }],
    });
    setRootFolder.mockResolvedValue({ root_folder_path: '/data/uhd' });
    const onChange = vi.fn();
    render(<RootFolderSelect kind="movie" id="m1" onChange={onChange} />);
    fireEvent.change(await screen.findByLabelText('Root folder'), { target: { value: '/data/uhd' } });
    await waitFor(() => {
      expect(setRootFolder).toHaveBeenCalledWith({
        kind: 'movie',
        id: 'm1',
        rootFolderPath: '/data/uhd',
      });
    });
    expect(onChange).toHaveBeenCalledWith('/data/uhd');
  });

  it('assigns the picked default when a title has no root', async () => {
    listRoots.mockResolvedValue({
      available: true,
      roots: [{ id: 'r1', path: '/data/movies', name: 'Movies', mediaKind: 'movies', accessible: true, freeBytes: 0, totalBytes: 0, isDefault: true }],
    });
    pickRoot.mockResolvedValue({
      available: true,
      root: { id: 'r1', path: '/data/movies', name: 'Movies', mediaKind: 'movies', accessible: true, freeBytes: 0, totalBytes: 0, isDefault: true },
      error: '',
    });
    setRootFolder.mockResolvedValue({ root_folder_path: '/data/movies' });
    const onChange = vi.fn();
    render(<RootFolderSelect kind="movie" id="m1" onChange={onChange} />);
    fireEvent.click(await screen.findByTestId('assign-default-root'));
    await waitFor(() => {
      expect(setRootFolder).toHaveBeenCalledWith({
        kind: 'movie',
        id: 'm1',
        rootFolderPath: '/data/movies',
      });
    });
    expect(onChange).toHaveBeenCalledWith('/data/movies');
  });

  it('assigns a music root to an artist', async () => {
    pickRoot.mockResolvedValue({ available: false, root: null, error: '' });
    listRoots.mockResolvedValue({
      available: true,
      roots: [{ id: 'r2', path: '/data/music', name: 'Music', mediaKind: 'music', accessible: true, freeBytes: 0, totalBytes: 0, isDefault: true }],
    });
    setRootFolder.mockResolvedValue({ root_folder_path: '/data/music' });
    render(<RootFolderSelect kind="artist" id="ar1" />);
    fireEvent.change(await screen.findByLabelText('Root folder'), { target: { value: '/data/music' } });
    await waitFor(() => {
      expect(listRoots).toHaveBeenCalledWith('music');
      expect(setRootFolder).toHaveBeenCalledWith({
        kind: 'artist',
        id: 'ar1',
        rootFolderPath: '/data/music',
      });
    });
  });

  it('assigns a books root to an author', async () => {
    pickRoot.mockResolvedValue({ available: false, root: null, error: '' });
    listRoots.mockResolvedValue({
      available: true,
      roots: [{ id: 'r3', path: '/data/books', name: 'Books', mediaKind: 'books', accessible: true, freeBytes: 0, totalBytes: 0, isDefault: true }],
    });
    setRootFolder.mockResolvedValue({ root_folder_path: '/data/books' });
    render(<RootFolderSelect kind="author" id="au1" />);
    fireEvent.change(await screen.findByLabelText('Root folder'), { target: { value: '/data/books' } });
    await waitFor(() => {
      expect(listRoots).toHaveBeenCalledWith('books');
      expect(setRootFolder).toHaveBeenCalledWith({
        kind: 'author',
        id: 'au1',
        rootFolderPath: '/data/books',
      });
    });
  });
});
