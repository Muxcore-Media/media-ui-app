import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import BookAuthor from './BookAuthor';
import { setCurrentRoles } from '../lib/session';

const getBookAuthor = vi.fn();
const setMonitored = vi.fn();
const importLibraryFile = vi.fn();
const removeLibraryItem = vi.fn();
const addBook = vi.fn();
const listRoots = vi.fn();
const pickRoot = vi.fn();
const setRootFolder = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      getBookAuthor: (...args: unknown[]) => getBookAuthor(...args),
      setMonitored: (...args: unknown[]) => setMonitored(...args),
      importLibraryFile: (...args: unknown[]) => importLibraryFile(...args),
      removeLibraryItem: (...args: unknown[]) => removeLibraryItem(...args),
      addBook: (...args: unknown[]) => addBook(...args),
      listRoots: (...args: unknown[]) => listRoots(...args),
      pickRoot: (...args: unknown[]) => pickRoot(...args),
      setRootFolder: (...args: unknown[]) => setRootFolder(...args),
      listItemHistory: vi.fn().mockResolvedValue({ available: false, items: [], total: 0 }),
      listItemArtwork: vi.fn().mockResolvedValue({ available: false, items: [] }),
      listTags: vi.fn().mockResolvedValue({ available: false, tags: [] }),
      getItemTags: vi.fn().mockResolvedValue({ available: false, tags: [] }),
    },
  };
});

describe('BookAuthor page', () => {
  beforeEach(() => {
    getBookAuthor.mockReset();
    setMonitored.mockReset();
    importLibraryFile.mockReset();
    removeLibraryItem.mockReset();
    addBook.mockReset();
    // The BFF reserves these controls for admin (T-M5-12).
    setCurrentRoles(['admin']);
    setMonitored.mockResolvedValue({ monitored: false });
    removeLibraryItem.mockResolvedValue({ removed: true, delete_files: false });
    importLibraryFile.mockResolvedValue({ id: 'f2', stream_url: '/stream/books/f2' });
    addBook.mockResolvedValue({ added: true, item: { id: 'bk-new', title: 'The Dispossessed', year: 1974 } });
    listRoots.mockReset();
    pickRoot.mockReset();
    setRootFolder.mockReset();
    listRoots.mockResolvedValue({
      available: true,
      roots: [{ id: 'r-books', path: '/data/books', name: 'Books', mediaKind: 'books', accessible: true, freeBytes: 0, totalBytes: 0, isDefault: true }],
    });
    pickRoot.mockResolvedValue({ available: false, root: null, error: '' });
    setRootFolder.mockResolvedValue({ root_folder_path: '/data/books' });
    getBookAuthor.mockResolvedValue({
      author: { id: 'auth1', name: 'Ursula K. Le Guin', monitored: true },
      books: [
        {
          id: 'b1',
          title: 'The Left Hand of Darkness',
          year: 1969,
          monitored: true,
          files: [{ id: 'f1', title: 'ebook', path: '/books/f1', stream_url: '/stream/books/f1' }],
        },
      ],
    });
  });

  it('renders author and book list', async () => {
    render(
      <MemoryRouter initialEntries={['/books/auth1']}>
        <Routes>
          <Route path="/books/:id" element={<BookAuthor />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('book-author-page')).toBeInTheDocument();
    expect(screen.getByText('Ursula K. Le Guin')).toBeInTheDocument();
    expect(screen.getByText('The Left Hand of Darkness')).toBeInTheDocument();
  });

  it('can unmonitor the author', async () => {
    render(
      <MemoryRouter initialEntries={['/books/auth1']}>
        <Routes>
          <Route path="/books/:id" element={<BookAuthor />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click((await screen.findAllByRole('button', { name: 'Monitored' }))[0]!);
    await waitFor(() => {
      expect(setMonitored).toHaveBeenCalledWith({ kind: 'author', id: 'auth1', monitored: false });
    });
  });

  it('imports a file onto a book without files', async () => {
    setCurrentRoles(['admin']);
    getBookAuthor.mockResolvedValue({
      author: { id: 'auth1', name: 'Ursula K. Le Guin', monitored: true },
      books: [{ id: 'b1', title: 'The Left Hand of Darkness', year: 1969, monitored: true, files: [] }],
    });
    render(
      <MemoryRouter initialEntries={['/books/auth1']}>
        <Routes>
          <Route path="/books/:id" element={<BookAuthor />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.change(await screen.findByLabelText('File path'), { target: { value: '/library/left-hand.epub' } });
    fireEvent.click(screen.getByRole('button', { name: 'Import file' }));
    await waitFor(() => {
      expect(importLibraryFile).toHaveBeenCalledWith({
        kind: 'book',
        id: 'b1',
        path: '/library/left-hand.epub',
      });
    });
  });

  it('removes the author from the library', async () => {
    render(
      <MemoryRouter initialEntries={['/books/auth1']}>
        <Routes>
          <Route path="/books/:id" element={<BookAuthor />} />
          <Route path="/books" element={<p>Books list</p>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByTestId('remove-library'));
    fireEvent.click(screen.getByRole('button', { name: 'Remove from library' }));
    await waitFor(() => {
      expect(removeLibraryItem).toHaveBeenCalledWith({
        kind: 'author',
        id: 'auth1',
        deleteFiles: false,
      });
    });
    expect(await screen.findByText('Books list')).toBeInTheDocument();
  });

  it('adds a book to the author', async () => {
    setCurrentRoles(['admin']);
    render(
      <MemoryRouter initialEntries={['/books/auth1']}>
        <Routes>
          <Route path="/books/:id" element={<BookAuthor />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.change(await screen.findByLabelText('Book title'), { target: { value: 'The Dispossessed' } });
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '1974' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add book' }));
    await waitFor(() => {
      expect(addBook).toHaveBeenCalledWith({
        authorId: 'auth1',
        title: 'The Dispossessed',
        year: 1974,
      });
    });
    expect(getBookAuthor).toHaveBeenCalledTimes(2);
  });

  it('assigns a root folder to the author', async () => {
    render(
      <MemoryRouter initialEntries={['/books/auth1']}>
        <Routes>
          <Route path="/books/:id" element={<BookAuthor />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.change(await screen.findByLabelText('Root folder'), { target: { value: '/data/books' } });
    await waitFor(() => {
      expect(setRootFolder).toHaveBeenCalledWith({
        kind: 'author',
        id: 'auth1',
        rootFolderPath: '/data/books',
      });
    });
  });
});
