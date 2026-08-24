import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTrickplay } from './useTrickplay'

const fetchTrickplaySprite = vi.fn()

vi.mock('../../../api/client', () => ({
  fetchTrickplaySprite: (...args: unknown[]) => fetchTrickplaySprite(...args),
}))

describe('useTrickplay', () => {
  beforeEach(() => {
    fetchTrickplaySprite.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('does not fetch when disabled', () => {
    renderHook(() =>
      useTrickplay({ src: '/stream/movies/m1', durationSec: 600, enabled: false }),
    )
    expect(fetchTrickplaySprite).not.toHaveBeenCalled()
  })

  it('loads manifest and resolves frame tiles', async () => {
    fetchTrickplaySprite.mockResolvedValueOnce({
      url: 'blob:trickplay',
      intervalSeconds: 10,
      cols: 4,
      rows: 3,
      count: 12,
    })

    const { result } = renderHook(() =>
      useTrickplay({ src: '/stream/movies/m1', durationSec: 600, enabled: true }),
    )

    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(fetchTrickplaySprite).toHaveBeenCalledWith('/stream/movies/m1', 600)

    const frame = result.current.frameAt(20)
    expect(frame).not.toBeNull()
    expect(frame?.sx).toBe(2)
    expect(frame?.sy).toBe(0)
    expect(frame?.url).toBe('blob:trickplay')
  })

  it('clamps frame lookup to the last tile', async () => {
    fetchTrickplaySprite.mockResolvedValueOnce({
      url: 'blob:trickplay',
      intervalSeconds: 10,
      cols: 2,
      rows: 2,
      count: 4,
    })

    const { result } = renderHook(() =>
      useTrickplay({ src: '/stream/movies/m1', durationSec: 120, enabled: true }),
    )

    await waitFor(() => expect(result.current.ready).toBe(true))
    const frame = result.current.frameAt(999)
    expect(frame?.sx).toBe(1)
    expect(frame?.sy).toBe(1)
  })
})
