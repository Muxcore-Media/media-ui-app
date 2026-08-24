import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Playlists from './Playlists'
import { toggleFavorite } from '../lib/userdata'

describe('Playlists page', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('creates a playlist from the form', async () => {
    render(
      <MemoryRouter>
        <Playlists />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('playlists-page')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('New playlist name'), { target: { value: 'Road trip' } })
    fireEvent.submit(screen.getByPlaceholderText('New playlist name').closest('form')!)
    expect(await screen.findByText('Road trip')).toBeInTheDocument()
  })

  it('lists favorites to add into a playlist', () => {
    toggleFavorite({
      id: 'm1',
      kind: 'movie',
      title: 'Playlist Pick',
      href: '/movies/m1',
    })
    render(
      <MemoryRouter>
        <Playlists />
      </MemoryRouter>,
    )
    fireEvent.change(screen.getByPlaceholderText('New playlist name'), { target: { value: 'Favs' } })
    fireEvent.submit(screen.getByPlaceholderText('New playlist name').closest('form')!)
    expect(screen.getByRole('button', { name: /Playlist Pick/i })).toBeInTheDocument()
  })
})
