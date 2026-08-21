import { describe, expect, it } from 'vitest'
import {
  groupInProgressByPhase,
  isActiveRequestStatus,
  isWatchable,
  mergeInProgressEntries,
  requestStatusLabel,
} from './acquisition'
import type { MediaRequest, Movie, TVShow } from '../types'

describe('acquisition helpers', () => {
  it('treats only has_file titles as watchable', () => {
    expect(isWatchable({ has_file: true })).toBe(true)
    expect(isWatchable({ has_file: false })).toBe(false)
  })

  it('filters active request statuses', () => {
    expect(isActiveRequestStatus('downloading')).toBe(true)
    expect(isActiveRequestStatus('available')).toBe(false)
  })

  it('labels request statuses for display', () => {
    expect(requestStatusLabel('searching')).toBe('Searching')
    expect(requestStatusLabel('workflow')).toBe('Pending approval')
  })

  it('merges requests with unmatched in-progress library rows', () => {
    const requests: MediaRequest[] = [
      {
        id: 'r1',
        itemType: 'movie',
        itemId: 'm1',
        tmdbId: 1,
        title: 'Alpha',
        year: 2020,
        poster: '',
        status: 'downloading',
        createdAt: '',
        updatedAt: '',
      },
    ]
    const movies: Movie[] = [
      {
        id: 'm1',
        title: 'Alpha',
        year: 2020,
        overview: '',
        runtime: 0,
        vote_average: 0,
        genres: [],
        poster_url: '',
        has_file: false,
        stream_url: '',
        created_at: '',
      },
      {
        id: 'm2',
        title: 'Beta',
        year: 2021,
        overview: '',
        runtime: 0,
        vote_average: 0,
        genres: [],
        poster_url: '',
        has_file: false,
        stream_url: '',
        created_at: '',
      },
      {
        id: 'm3',
        title: 'Ready',
        year: 2022,
        overview: '',
        runtime: 0,
        vote_average: 0,
        genres: [],
        poster_url: '',
        has_file: true,
        stream_url: '/stream/movies/m3',
        created_at: '',
      },
    ]
    const shows: TVShow[] = []

    const merged = mergeInProgressEntries(requests, movies, shows)
    expect(merged).toHaveLength(2)
    expect(merged.some((e) => e.source === 'request' && e.request.id === 'r1')).toBe(true)
    expect(merged.some((e) => e.source === 'library' && e.item.title === 'Beta')).toBe(true)
    expect(merged.some((e) => e.source === 'library' && e.item.title === 'Ready')).toBe(false)
  })

  it('groups merged entries by acquisition phase', () => {
    const entries = mergeInProgressEntries(
      [
        {
          id: 'r1',
          itemType: 'movie',
          itemId: 'm1',
          tmdbId: 1,
          title: 'Alpha',
          year: 2020,
          poster: '',
          status: 'downloading',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'r2',
          itemType: 'tv',
          itemId: 's1',
          tmdbId: 2,
          title: 'Bravo',
          year: 2021,
          poster: '',
          status: 'searching',
          createdAt: '',
          updatedAt: '',
        },
      ],
      [],
      [],
    )
    const grouped = groupInProgressByPhase(entries)
    expect(grouped.downloading).toHaveLength(1)
    expect(grouped.searching).toHaveLength(1)
    expect(grouped.requested).toHaveLength(0)
  })
})
