import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Books from './Books'

const listBooks = vi.fn()

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    api: {
      listBooks: (...args: unknown[]) => listBooks(...args),
    },
  }
})

describe('Books library page', () => {
  beforeEach(() => {
    listBooks.mockReset()
    listBooks.mockResolvedValue({
      items: [{ id: 'a1', name: 'Tolkien', title: 'Tolkien', available: true }],
      available: true,
      total: 1,
    })
  })

  it('lists authors from BFF', async () => {
    render(
      <MemoryRouter>
        <Books />
      </MemoryRouter>,
    )
    expect(await screen.findByTestId('books-page')).toBeInTheDocument()
    expect(await screen.findByText('Tolkien')).toBeInTheDocument()
  })
})
