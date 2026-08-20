import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import VideoPlayer from './VideoPlayer'

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

describe('VideoPlayer empty shell', () => {
  it('renders empty-state copy when src is blank', () => {
    render(<VideoPlayer src="" title="Anything" />)
    expect(screen.getByText('No stream available')).toBeInTheDocument()
    expect(document.querySelector('video')).toBeNull()
  })
})

describe('VideoPlayer OSD', () => {
  it('renders custom overlay and track controls when src is set', async () => {
    render(<VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />)
    await waitFor(() => {
      expect(screen.getByTestId('player-osd-overlay')).toBeInTheDocument()
    })
    expect(screen.getByTestId('player-osd')).toBeInTheDocument()
    expect(screen.getByTestId('player-seek')).toBeInTheDocument()
    expect(screen.getByTestId('player-mode')).toHaveTextContent('Direct play')
  })
})
