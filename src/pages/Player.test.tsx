import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Player from './Player'

function renderPlayer(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/player${search}`]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/player" element={<Player />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Player shell empty states', () => {
  it('shows empty stream shell when src query is missing', () => {
    renderPlayer('')
    expect(screen.getByText('No stream available')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Playback' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/movies')
  })

  it('mounts video element when stream src is provided', () => {
    renderPlayer('?src=%2Fstream%2Fmovies%2Fm1&title=Fight%20Club')
    expect(screen.getByRole('heading', { name: 'Fight Club' })).toBeInTheDocument()
    expect(screen.queryByText('No stream available')).not.toBeInTheDocument()
    const video = document.querySelector('video')
    expect(video).not.toBeNull()
    expect(video).toHaveAttribute('src', '/stream/movies/m1')
  })
})
