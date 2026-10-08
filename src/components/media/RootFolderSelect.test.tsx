import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setCurrentRoles } from '../../lib/session';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RootFolderSelect } from './RootFolderSelect';
import { OperatorError } from '../../api/errors';
import { NON_ROOT_ROLE_CASES, ROOT_ROLE_CASES } from '../../test/operator-roles';

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
  // The BFF reserves these controls for admin (T-M5-12).
  beforeEach(() => setCurrentRoles(['admin']));

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

  it('assigns a comics root to a series', async () => {
    pickRoot.mockResolvedValue({ available: false, root: null, error: '' });
    listRoots.mockResolvedValue({
      available: true,
      roots: [{ id: 'r4', path: '/data/comics', name: 'Comics', mediaKind: 'comics', accessible: true, freeBytes: 0, totalBytes: 0, isDefault: true }],
    });
    setRootFolder.mockResolvedValue({ root_folder_path: '/data/comics' });
    render(<RootFolderSelect kind="series" id="s1" />);
    fireEvent.change(await screen.findByLabelText('Root folder'), { target: { value: '/data/comics' } });
    await waitFor(() => {
      expect(listRoots).toHaveBeenCalledWith('comics');
      expect(setRootFolder).toHaveBeenCalledWith({
        kind: 'series',
        id: 's1',
        rootFolderPath: '/data/comics',
      });
    });
  });
});

describe('RootFolderSelect admin-only gate (T-M5-12)', () => {
  const catalog = {
    available: true,
    roots: [{ id: 'r1', path: '/data/uhd', name: 'UHD', mediaKind: 'movies', accessible: true, freeBytes: 0, totalBytes: 0, isDefault: true }],
  };

  // The BFF answers 403 operator.admin_required to a manager that names root_folder_path.
  it.each(NON_ROOT_ROLE_CASES)('renders nothing and loads nothing for %s', (_label, roles) => {
    listRoots.mockReset();
    pickRoot.mockReset();
    listRoots.mockResolvedValue(catalog);
    pickRoot.mockResolvedValue({ available: false, root: null, error: '' });
    setCurrentRoles(roles);
    const { container } = render(<RootFolderSelect kind="movie" id="m1" />);
    expect(screen.queryByLabelText('Root folder')).toBeNull();
    expect(container).toBeEmptyDOMElement();
    expect(listRoots).not.toHaveBeenCalled();
  });

  it.each(ROOT_ROLE_CASES)('offers the picker to %s', async (_label, roles) => {
    listRoots.mockReset();
    pickRoot.mockReset();
    listRoots.mockResolvedValue(catalog);
    pickRoot.mockResolvedValue({ available: false, root: null, error: '' });
    setCurrentRoles(roles);
    render(<RootFolderSelect kind="movie" id="m1" />);
    expect(await screen.findByLabelText('Root folder')).toBeInTheDocument();
  });

  it('explains an admin_required 403 calmly and does not retry', async () => {
    listRoots.mockReset();
    pickRoot.mockReset();
    setRootFolder.mockReset();
    listRoots.mockResolvedValue(catalog);
    pickRoot.mockResolvedValue({ available: false, root: null, error: '' });
    setRootFolder.mockRejectedValue(new OperatorError('operator.admin_required', 403));
    setCurrentRoles(['admin']);
    render(<RootFolderSelect kind="movie" id="m1" />);
    fireEvent.change(await screen.findByLabelText('Root folder'), { target: { value: '/data/uhd' } });
    const note = await screen.findByTestId('root-folder-note');
    expect(note).toHaveTextContent("You don't have permission for this action. Changing a root folder needs an administrator.");
    expect(note).toHaveAttribute('role', 'status');
    expect(setRootFolder).toHaveBeenCalledTimes(1);
  });
});
