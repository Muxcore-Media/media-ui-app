import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Layout from './Layout'

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<div>home body</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('Layout (session / login shell)', () => {
  it('exposes BFF logout so auth-local session cookie can be cleared', () => {
    renderLayout()
    const logout = screen.getByRole('link', { name: 'Logout' })
    expect(logout).toHaveAttribute('href', '/logout')
  })

  it('renders consumer nav used after successful login redirect', () => {
    renderLayout()
    expect(screen.getByRole('link', { name: 'MuxCore Media' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Movies' })).toHaveAttribute('href', '/movies')
    expect(screen.getByRole('link', { name: 'TV' })).toHaveAttribute('href', '/tv')
    expect(screen.getByRole('link', { name: 'Music' })).toHaveAttribute('href', '/music')
    expect(screen.getByRole('link', { name: 'Books' })).toHaveAttribute('href', '/books')
    expect(screen.getByRole('link', { name: 'Comics' })).toHaveAttribute('href', '/comics')
    expect(screen.getByRole('link', { name: 'Audiobooks' })).toHaveAttribute('href', '/audiobooks')
    expect(screen.getByRole('link', { name: 'Search' })).toHaveAttribute('href', '/search')
    expect(screen.getByRole('link', { name: 'Favorites' })).toHaveAttribute('href', '/favorites')
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings')
    expect(screen.getByText('home body')).toBeInTheDocument()
  })
})
