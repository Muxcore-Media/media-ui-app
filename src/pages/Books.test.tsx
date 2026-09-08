import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Books from './Books';
import { setCurrentRoles } from '../lib/session';

const listBooks = vi.fn();
const addBookAuthor = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      listBooks: (...args: unknown[]) => listBooks(...args),
      addBookAuthor: (...args: unknown[]) => addBookAuthor(...args),
    },
  };
});

describe('Books library page', () => {
  beforeEach(() => {
    listBooks.mockReset();
    addBookAuthor.mockReset();
    setCurrentRoles([]);
    addBookAuthor.mockResolvedValue({ added: true, item: { id: 'au-new', name: 'Octavia E. Butler' } });
    listBooks.mockResolvedValue({
      items: [{ id: 'a1', name: 'Tolkien', title: 'Tolkien', available: true }],
      available: true,
      total: 1,
    });
  });

  it('lists authors from BFF', async () => {
    render(
      <MemoryRouter>
        <Books />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('books-page')).toBeInTheDocument();
    expect(await screen.findByText('Tolkien')).toBeInTheDocument();
  });

  it('adds an author from the library list', async () => {
    setCurrentRoles(['admin']);
    listBooks
      .mockResolvedValueOnce({
        items: [{ id: 'a1', name: 'Tolkien', title: 'Tolkien', available: true }],
        available: true,
        total: 1,
      })
      .mockResolvedValueOnce({
        items: [
          { id: 'a1', name: 'Tolkien', title: 'Tolkien', available: true },
          { id: 'au-new', name: 'Octavia E. Butler', title: 'Octavia E. Butler', available: true },
        ],
        available: true,
        total: 2,
      });
    render(
      <MemoryRouter>
        <Books />
      </MemoryRouter>,
    );
    fireEvent.change(await screen.findByLabelText('Author name'), { target: { value: 'Octavia E. Butler' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add author' }));
    await waitFor(() => {
      expect(addBookAuthor).toHaveBeenCalledWith({ name: 'Octavia E. Butler' });
    });
    expect(await screen.findByRole('link', { name: 'Octavia E. Butler' })).toBeInTheDocument();
  });
});

describe('Books accessibility', () => {
  beforeEach(() => {
    listBooks.mockReset();
    listBooks.mockResolvedValue({
      items: [{ id: 'a1', name: 'Tolkien', title: 'Tolkien', available: true }],
      available: true,
      total: 1,
    });
  });

  it('has a page h1 and labelled library list', async () => {
    render(
      <MemoryRouter>
        <Books />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Books' })).toBeInTheDocument();
    expect(await screen.findByRole('list', { name: 'Books items' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tolkien' })).toBeInTheDocument();
  });
});
