import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import BookAuthor from './BookAuthor'

const getBookAuthor = vi.fn()

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    api: {
      getBookAuthor: (...args: unknown[]) => getBookAuthor(...args),
    },
  }
})

describe('BookAuthor page', () => {
  beforeEach(() => {
    getBookAuthor.mockReset()
    getBookAuthor.mockResolvedValue({
      author: { id: 'auth1', name: 'Ursula K. Le Guin' },
      books: [
        {
          id: 'b1',
          title: 'The Left Hand of Darkness',
          year: 1969,
          files: [{ id: 'f1', title: 'ebook', path: '/books/f1', stream_url: '/stream/books/f1' }],
        },
      ],
    })
  })

  it('renders author and book list', async () => {
    render(
      <MemoryRouter initialEntries={['/books/auth1']}>
        <Routes>
          <Route path="/books/:id" element={<BookAuthor />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByTestId('book-author-page')).toBeInTheDocument()
    expect(screen.getByText('Ursula K. Le Guin')).toBeInTheDocument()
    expect(screen.getByText('The Left Hand of Darkness')).toBeInTheDocument()
  })
})
