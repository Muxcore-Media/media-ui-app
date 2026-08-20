import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Player from './Player'

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            stream_url: '/stream/movies/m1',
            mode: 'direct',
            resume_enabled: true,
            transcoder_enabled: false,
            prefer_direct_play: true,
            max_bitrate_mbps: '80',
            trickplay_enabled: false,
            transcoder_available: false,
          }),
      }),
    ),
  )
})

function renderPlayer(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/player${search}`]}>
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

  it('mounts video element when stream src is provided', async () => {
    renderPlayer('?src=%2Fstream%2Fmovies%2Fm1&title=Fight%20Club')
    expect(screen.getByRole('heading', { name: 'Fight Club' })).toBeInTheDocument()
    expect(screen.queryByText('No stream available')).not.toBeInTheDocument()
    await waitFor(() => {
      const video = document.querySelector('video')
      expect(video).not.toBeNull()
      expect(video).toHaveAttribute('src', '/stream/movies/m1')
    })
  })
})
