import { describe, expect, it } from 'vitest';
import {
  detailHrefForRequest,
  groupInProgressByPhase,
  isActiveRequestStatus,
  isWatchable,
  mergeInProgressEntries,
  requestDisplayDetail,
  requestDisplayLabel,
  requestPhase,
  requestStatusLabel,
  requestStatusTone,
} from './acquisition';
import type { MediaRequest, Movie, TVShow } from '../types';

describe('acquisition helpers', () => {
  it('treats only has_file titles as watchable', () => {
    expect(isWatchable({ has_file: true })).toBe(true);
    expect(isWatchable({ has_file: false })).toBe(false);
  });

  it('filters active request statuses', () => {
    expect(isActiveRequestStatus('downloading')).toBe(true);
    expect(isActiveRequestStatus('available')).toBe(false);
  });

  it('labels request statuses for display', () => {
    expect(requestStatusLabel('searching')).toBe('Searching');
    expect(requestStatusLabel('workflow')).toBe('Pending approval');
    expect(requestStatusLabel('import_failed')).toBe('Import failed');
    expect(requestStatusLabel('failed')).toBe('Download failed');
    expect(requestStatusLabel('stalled')).toBe('Stalled');
    expect(requestStatusLabel('denied')).toBe('Denied');
  });

  it('prefers API statusLabel for badge text when present', () => {
    expect(
      requestDisplayLabel({
        status: 'stalled',
        statusLabel: 'Stalled — no peers',
      }),
    ).toBe('Stalled — no peers');
    expect(requestDisplayLabel({ status: 'downloading' })).toBe('Downloading');
  });

  it('surfaces statusDetail as subtitle when not already in statusLabel', () => {
    expect(
      requestDisplayDetail({
        statusLabel: 'Stalled — no peers',
        statusDetail: 'no peers',
      }),
    ).toBeNull();
    expect(
      requestDisplayDetail({
        statusLabel: 'Import failed: scanner unavailable',
        statusDetail: 'scanner unavailable',
      }),
    ).toBeNull();
    expect(
      requestDisplayDetail({
        statusLabel: 'Stalled',
        statusDetail: 'no progress for 1h',
      }),
    ).toBe('no progress for 1h');
    expect(requestDisplayDetail({ statusDetail: 'download path missing on disk' })).toBe(
      'download path missing on disk',
    );
  });

  it('assigns badge tones for attention and in-progress statuses', () => {
    expect(requestStatusTone('import_failed')).toBe('danger');
    expect(requestStatusTone('failed')).toBe('danger');
    expect(requestStatusTone('denied')).toBe('danger');
    expect(requestStatusTone('stalled')).toBe('warning');
    expect(requestStatusTone('downloading')).toBe('accent');
    expect(requestStatusTone('pending')).toBe('warning');
  });

  it('routes problem statuses into the attention phase', () => {
    for (const status of ['import_failed', 'failed', 'stalled', 'denied'] as const) {
      expect(requestPhase(status)).toBe('attention');
    }
    expect(requestPhase('downloading')).toBe('downloading');
    expect(requestPhase('searching')).toBe('searching');
    expect(requestPhase('pending')).toBe('pending');
    expect(requestPhase('requested')).toBe('requested');
  });

  function needsAttention(status: string): boolean {
    return requestPhase(status) === 'attention';
  }

  it('treats import_failed, stalled, and failed as needing attention', () => {
    expect(needsAttention('import_failed')).toBe(true);
    expect(needsAttention('stalled')).toBe(true);
    expect(needsAttention('failed')).toBe(true);
    expect(needsAttention('denied')).toBe(true);
    expect(needsAttention('downloading')).toBe(false);
    expect(needsAttention('searching')).toBe(false);
    expect(needsAttention('pending')).toBe(false);
  });

  it('links music requests to the music library', () => {
    expect(
      detailHrefForRequest({
        id: 'r1',
        itemType: 'music',
        itemId: 'ar_1',
        tmdbId: 0,
        title: 'Radiohead',
        year: 0,
        poster: '',
        status: 'searching',
        createdAt: '',
        updatedAt: '',
      }),
    ).toBe('/music/ar_1');
  });

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
    ];
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
    ];
    const shows: TVShow[] = [];

    const merged = mergeInProgressEntries(requests, movies, shows);
    expect(merged).toHaveLength(2);
    expect(merged.some((e) => e.source === 'request' && e.request.id === 'r1')).toBe(true);
    expect(merged.some((e) => e.source === 'library' && e.item.title === 'Beta')).toBe(true);
    expect(merged.some((e) => e.source === 'library' && e.item.title === 'Ready')).toBe(false);
  });

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
    );
    const grouped = groupInProgressByPhase(entries);
    expect(grouped.downloading).toHaveLength(1);
    expect(grouped.searching).toHaveLength(1);
    expect(grouped.pending).toHaveLength(0);
    expect(grouped.requested).toHaveLength(0);
  });

  it('groups pending approval requests separately', () => {
    const entries = mergeInProgressEntries(
      [
        {
          id: 'r-pending',
          itemType: 'movie',
          itemId: '',
          tmdbId: 99,
          title: 'Pending Film',
          year: 2024,
          poster: '',
          status: 'pending',
          createdAt: '',
          updatedAt: '',
        },
      ],
      [],
      [],
    );
    const grouped = groupInProgressByPhase(entries);
    expect(grouped.pending).toHaveLength(1);
    expect(requestStatusLabel('pending')).toBe('Pending approval');
  });

  it('groups stalled and failed requests in the attention phase', () => {
    const entries = mergeInProgressEntries(
      [
        {
          id: 'r-stalled',
          itemType: 'tv',
          itemId: 's2',
          tmdbId: 12,
          title: 'Stalled Show',
          year: 2021,
          poster: '',
          status: 'stalled',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'r-failed',
          itemType: 'movie',
          itemId: 'm8',
          tmdbId: 8,
          title: 'Failed Grab',
          year: 2019,
          poster: '',
          status: 'failed',
          createdAt: '',
          updatedAt: '',
        },
      ],
      [],
      [],
    );
    const grouped = groupInProgressByPhase(entries);
    expect(grouped.attention).toHaveLength(2);
    expect(grouped.downloading).toHaveLength(0);
    expect(grouped.searching).toHaveLength(0);
    expect(grouped.pending).toHaveLength(0);
    expect(grouped.requested).toHaveLength(0);
    const statuses = grouped.attention
      .filter(
        (entry): entry is Extract<typeof entry, { source: 'request' }> =>
          entry.source === 'request',
      )
      .map((entry) => entry.request.status);
    expect(statuses).toEqual(expect.arrayContaining(['stalled', 'failed']));
  });

  it('sorts attention requests ahead of other in-progress phases', () => {
    const entries = mergeInProgressEntries(
      [
        {
          id: 'r-dl',
          itemType: 'movie',
          itemId: 'm1',
          tmdbId: 1,
          title: 'Still Downloading',
          year: 2020,
          poster: '',
          status: 'downloading',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'r-fail',
          itemType: 'movie',
          itemId: 'm9',
          tmdbId: 9,
          title: 'Broken Import',
          year: 2020,
          poster: '',
          status: 'import_failed',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'r-search',
          itemType: 'tv',
          itemId: 's1',
          tmdbId: 2,
          title: 'Searching Show',
          year: 2021,
          poster: '',
          status: 'searching',
          createdAt: '',
          updatedAt: '',
        },
      ],
      [],
      [],
    );
    const grouped = groupInProgressByPhase(entries);
    expect(grouped.attention).toHaveLength(1);
    expect(grouped.attention[0].source).toBe('request');
    if (grouped.attention[0].source === 'request') {
      expect(grouped.attention[0].request.status).toBe('import_failed');
    }
    expect(grouped.downloading).toHaveLength(1);
    expect(entries[0].source).toBe('request');
    if (entries[0].source === 'request') {
      expect(entries[0].request.status).toBe('import_failed');
    }
  });
});
