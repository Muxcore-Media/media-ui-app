import { describe, expect, it, beforeEach } from 'vitest'
import {
  continueWatching,
  isServerAuthoritative,
  listProgress,
  pullUserdataFromServer,
  resolveNextUp,
  showIdFromHref,
  upsertProgress,
} from './userdata'

describe('userdata server cache', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('marks server authoritative after successful pull and prefers server progress', async () => {
    upsertProgress({
      id: 'm1',
      kind: 'movie',
      title: 'Local',
      href: '/movies/m1',
      positionSec: 5,
      durationSec: 100,
      updatedAt: '2025-01-01T00:00:00.000Z',
    })

    const fetchMock = async () =>
      ({
        ok: true,
        json: async () => ({
          progress: {
            m1: {
              id: 'm1',
              kind: 'movie',
              title: 'Server',
              href: '/movies/m1',
              positionSec: 50,
              durationSec: 100,
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          },
          favorites: {},
        }),
      }) as Response
    globalThis.fetch = fetchMock as typeof fetch

    const ok = await pullUserdataFromServer()
    expect(ok).toBe(true)
    expect(isServerAuthoritative()).toBe(true)
    expect(listProgress()[0]?.positionSec).toBe(50)
    expect(continueWatching(1)[0]?.title).toBe('Server')
  })

  it('parses show id from progress href', () => {
    expect(showIdFromHref('/tv/show-42')).toBe('show-42')
    expect(showIdFromHref('/player?back=%2Ftv%2Fabc')).toBe(null)
    expect(showIdFromHref('/movies/m1')).toBe(null)
  })

  it('resolves next episode after a watched episode via TV detail', async () => {
    upsertProgress({
      id: 'ep1',
      kind: 'episode',
      title: 'S01E01',
      href: '/tv/show-1',
      positionSec: 0,
      durationSec: 100,
      watched: true,
      updatedAt: '2026-01-01T00:00:00.000Z',
    })

    const next = await resolveNextUp(async (id) => {
      expect(id).toBe('show-1')
      return {
        id: 'show-1',
        title: 'Demo Show',
        poster_url: '/p.jpg',
        seasons: [
          {
            season_number: 1,
            episodes: [
              { id: 'ep1', season_number: 1, episode_number: 1, title: 'Pilot', has_file: true },
              {
                id: 'ep2',
                season_number: 1,
                episode_number: 2,
                title: 'Next',
                has_file: true,
                stream_url: '/stream/tv/ep2',
              },
            ],
          },
        ],
      }
    })

    expect(next).toHaveLength(1)
    expect(next[0]?.id).toBe('ep2')
    expect(next[0]?.subtitle).toBe('Next up')
    expect(next[0]?.href).toContain('ep2')
  })
})
