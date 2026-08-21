import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import HeaderSearch from './HeaderSearch'

const navigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

describe('HeaderSearch', () => {
  it('navigates to search page with query on submit', () => {
    navigate.mockReset()
    render(
      <MemoryRouter initialEntries={['/movies']}>
        <Routes>
          <Route path="/movies" element={<HeaderSearch />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'Fight Club' } })
    fireEvent.submit(screen.getByRole('search'))

    expect(navigate).toHaveBeenCalledWith('/search?q=Fight+Club')
  })
})
