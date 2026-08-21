import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import VideoPlayer from './VideoPlayer'

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/playback/subtitles')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ tracks: [] }),
        })
      }
      return Promise.resolve({
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
      })
    }),
  )
})

describe('VideoPlayer empty shell', () => {
  it('renders empty-state copy when src is blank', () => {
    render(
      <MemoryRouter>
        <VideoPlayer src="" title="Anything" />
      </MemoryRouter>,
    )
    expect(screen.getByText(/isn't available to play/i)).toBeInTheDocument()
    expect(document.querySelector('video')).toBeNull()
  })
})

describe('VideoPlayer OSD', () => {
  it('renders immersive overlay controls when src is set', async () => {
    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByTestId('player-osd-overlay')).toBeInTheDocument()
    })
    expect(screen.getByTestId('player-osd')).toBeInTheDocument()
    expect(screen.getByTestId('player-seek')).toBeInTheDocument()
    expect(screen.getByLabelText('Playback speed')).toBeInTheDocument()
    expect(screen.getByLabelText('Subtitles')).toBeInTheDocument()
  })
})
