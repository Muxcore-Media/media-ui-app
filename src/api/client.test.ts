import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  api,
  friendlyFetchError,
  friendlyPlaybackError,
  normalizeMovie,
  normalizeRequest,
  normalizeTV,
  OFFLINE_FETCH_MESSAGE,
  posterURL,
  resolvePlayback,
  fetchPlaybackChapters,
  fetchPlaybackAnalysis,
  fetchTrickplaySprite,
} from './client';

describe('posterURL', () => {
  it('passes through absolute and /images paths', () => {
    expect(posterURL('https://cdn.example/p.jpg')).toBe('https://cdn.example/p.jpg');
    expect(posterURL('/images/movies/a.jpg')).toBe('/images/movies/a.jpg');
  });

  it('rewrites relative library paths', () => {
    expect(posterURL('posters/a.jpg', 'movie')).toBe('/images/movies/posters/a.jpg');
    expect(posterURL('posters/b.jpg', 'tv')).toBe('/images/tv/posters/b.jpg');
  });
});

describe('normalizeMovie / normalizeTV', () => {
  it('builds stream URLs for library items', () => {
    const m = normalizeMovie({
      id: 'm1',
      title: 'Fight Club',
      has_file: true,
      poster_url: '/images/movies/p.jpg',
    });
    expect(m.stream_url).toBe('/stream/movies/m1');
    expect(m.poster_url).toBe('/images/movies/p.jpg');

    const tv = normalizeTV({
      id: 's1',
      name: 'Show',
      seasons: [
        { id: '1', season_number: 1, episodes: [{ id: 'e1', has_file: true, episode_number: 1 }] },
      ],
    });
    expect(tv.has_file).toBe(true);
    expect(tv.stream_url).toBe('/stream/tv/e1');
  });
});

describe('normalizeRequest', () => {
  it('maps camelCase status fields from /api/requests', () => {
    const req = normalizeRequest({
      id: 'r1',
      itemType: 'movie',
      itemId: 'm1',
      tmdbId: 42,
      title: 'Test',
      year: 2020,
      poster: '',
      status: 'stalled',
      statusDetail: 'no peers',
      statusLabel: 'Stalled — no peers',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    });
    expect(req.statusDetail).toBe('no peers');
    expect(req.statusLabel).toBe('Stalled — no peers');
  });

  it('accepts snake_case status fields from upstream', () => {
    const req = normalizeRequest({
      id: 'r2',
      item_type: 'tv',
      item_id: 's1',
      tmdb_id: 7,
      title: 'Show',
      year: 2021,
      poster: '',
      status: 'import_failed',
      status_detail: 'scanner unavailable',
      status_label: 'Import failed',
      created_at: '',
      updated_at: '',
    });
    expect(req.itemType).toBe('tv');
    expect(req.statusDetail).toBe('scanner unavailable');
    expect(req.statusLabel).toBe('Import failed');
  });

  it('omits empty status detail/label', () => {
    const req = normalizeRequest({
      id: 'r3',
      itemType: 'movie',
      itemId: 'm3',
      tmdbId: 1,
      title: 'Plain',
      year: 2020,
      poster: '',
      status: 'downloading',
      statusDetail: '',
      statusLabel: '',
      createdAt: '',
      updatedAt: '',
    });
    expect(req.statusDetail).toBeUndefined();
    expect(req.statusLabel).toBeUndefined();
  });
});

describe('api smoke (library + request + auth errors)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('listMovies parses BFF list contract', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ items: [{ id: 'm1', title: 'A' }], total: 1, page: 1, page_size: 48 }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
    const list = await api.listMovies();
    expect(list.items).toHaveLength(1);
    expect(list.items[0].title).toBe('A');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/movies?');
  });

  it('listMovies passes library filter query', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [{ id: 'mv1', title: 'MV', library_type: 'musicvideos' }],
          total: 1,
          page: 1,
          page_size: 48,
          library: 'musicvideos',
          filter_mode: 'config',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const list = await api.listMovies(1, 48, { library: 'musicvideos' });
    expect(String(fetchMock.mock.calls[0][0])).toContain('library=musicvideos');
    expect(list.library).toBe('musicvideos');
    expect(list.filter_mode).toBe('config');
    expect(list.items[0].library_type).toBe('musicvideos');
  });

  it('surfaces offline message when fetch fails and navigator.onLine is false', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(api.listMovies()).rejects.toThrow(OFFLINE_FETCH_MESSAGE);
    expect(friendlyFetchError(new TypeError('Failed to fetch'))).toBe(OFFLINE_FETCH_MESSAGE);
  });

  it('rethrows network errors when online', async () => {
    vi.stubGlobal('navigator', { onLine: true });
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(api.listMovies()).rejects.toThrow('Failed to fetch');
    expect(friendlyFetchError(new TypeError('Failed to fetch'), 'Load failed')).toBe(
      'Failed to fetch',
    );
  });

  it('surfaces JSON auth errors instead of silent empty lists', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'unauthorized', code: 'auth.required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await expect(api.listMovies()).rejects.toThrow(/unauthorized/);
  });

  it('listRequests normalizes statusDetail and statusLabel from /api/requests', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: 'r1',
            itemType: 'movie',
            itemId: 'm1',
            tmdbId: 1,
            title: 'Stalled',
            year: 2020,
            poster: '',
            status: 'stalled',
            statusDetail: 'no peers',
            statusLabel: 'Stalled — no peers',
            createdAt: '',
            updatedAt: '',
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const rows = await api.listRequests();
    expect(rows).toHaveLength(1);
    expect(rows[0].statusDetail).toBe('no peers');
    expect(rows[0].statusLabel).toBe('Stalled — no peers');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/requests');
  });

  it('watchlist normalizes items from /api/watchlist', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [
            {
              id: 550,
              title: 'Fight Club',
              year: 1999,
              overview: '',
              poster: '',
              voteAvg: 8.4,
              mediaType: 'movie',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const rows = await api.watchlist({ type: 'movie' });
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('Fight Club');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/watchlist');
    expect(String(fetchMock.mock.calls[0][0])).toContain('type=movie');
  });

  it('search + requestMovie cover request path', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [
              { id: 550, title: 'Fight Club', year: 1999, overview: '', poster: '', voteAvg: 8 },
            ],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ requestId: 'r1', movieId: 'm1', status: 'pending' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    const results = await api.search('Fight Club');
    expect(results[0]?.title).toBe('Fight Club');
    expect(results[0]?.mediaType).toBe('movie');

    const req = await api.requestTitle({
      tmdbId: 550,
      title: 'Fight Club',
      year: 1999,
      overview: '',
      poster: '',
      mediaType: 'movie',
    });
    expect(req.requestId).toBe('r1');
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/request');
  });

  it('merges capabilities from BFF with safe defaults', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        libraries: { movies: true, tv: true, music: false },
        features: { search: true, livetv: false },
      }),
    });
    const caps = await api.getCapabilities();
    expect(caps.libraries.movies).toBe(true);
    expect(caps.libraries.music).toBe(false);
    expect(caps.libraries.books).toBe(false);
    expect(caps.features.search).toBe(true);
    expect(caps.features.livetv).toBe(false);
    expect(caps.features.queue).toBe(true);
  });

  it('resolvePlayback surfaces JSON playback errors', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'src required', code: 'playback.src_required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await expect(resolvePlayback('/stream/movies/m1')).rejects.toThrow(/src required/);
    expect(friendlyPlaybackError(new Error('src required (playback.src_required)'))).toMatch(
      /isn't available/i,
    );
  });

  it('fetchPlaybackChapters normalizes chapter list', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        src: '/stream/movies/m1',
        enabled: true,
        chapters: [
          { index: 0, title: 'Opening', start_seconds: 0, end_seconds: 90 },
          { title: 'Act 1', start_seconds: 90, end_seconds: 600 },
        ],
      }),
    });
    const res = await fetchPlaybackChapters('/stream/movies/m1');
    expect(res.chapters).toHaveLength(2);
    expect(res.chapters[0].title).toBe('Opening');
    expect(res.chapters[1].start_seconds).toBe(90);
  });

  it('fetchPlaybackAnalysis returns probe metadata', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        src: '/stream/movies/m1',
        enabled: true,
        info_line: '1080p · HDR · H264',
        container: 'mkv',
        duration_seconds: 7200,
        video: { codec: 'h264', height: 1080, hdr: true, resolution_label: '1080p' },
        audio: [
          {
            index: 1,
            language: 'eng',
            channel_layout: '5.1',
            codec: 'aac',
            label: 'ENG · 5.1 · AAC',
          },
        ],
        subtitles: [{ index: 2, language: 'eng', codec: 'subrip', picture_based: false }],
        quality: { label: '1080p' },
      }),
    });
    const res = await fetchPlaybackAnalysis('/stream/movies/m1');
    expect(res.enabled).toBe(true);
    expect(res.info_line).toBe('1080p · HDR · H264');
    expect(res.audio?.[0].label).toBe('ENG · 5.1 · AAC');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/playback/analysis');
  });

  it('fetchTrickplaySprite parses sprite headers into a manifest', async () => {
    const blob = new Blob(['sprite'], { type: 'image/jpeg' });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      blob: async () => blob,
      headers: new Headers({
        'X-Trickplay-Cols': '4',
        'X-Trickplay-Rows': '3',
        'X-Trickplay-Count': '12',
        'X-Trickplay-Interval-Seconds': '15',
      }),
    });

    const manifest = await fetchTrickplaySprite('/stream/movies/m1', 7200, 10);
    expect(manifest).not.toBeNull();
    expect(manifest?.cols).toBe(4);
    expect(manifest?.rows).toBe(3);
    expect(manifest?.intervalSeconds).toBe(15);
    expect(manifest?.url).toBe('blob:test');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/stream/trickplay');
  });

  // ── api.getRelated — BFF contract tests ──────────────────────────────────
  // The BFF GET /api/graph/related requires id=tmdb:{movie|tv}:{n}.
  // Any other id format (e.g. a library-internal id) returns 400 graph.invalid_id.
  // The client must absorb errors and return { items: [], available: false }.

  it('getRelated sends id=tmdb:movie:550 and parses items', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          available: true,
          items: [
            {
              id: 550,
              title: 'Fight Club',
              year: 1999,
              overview: '',
              poster: '/fc.jpg',
              vote_avg: 8.4,
              media_type: 'movie',
              relation: 'related_to',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await api.getRelated('tmdb:movie:550');

    expect(result.available).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Fight Club');
    expect(result.items[0].id).toBe(550);
    expect(result.items[0].mediaType).toBe('movie');
    expect(result.items[0].relation).toBe('related_to');

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/api/graph/related');
    expect(url).toContain('id=tmdb%3Amovie%3A550');
  });

  it('getRelated returns available=false when BFF signals module unavailable', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ available: false, items: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await api.getRelated('tmdb:movie:550');

    expect(result.available).toBe(false);
    expect(result.items).toHaveLength(0);
  });

  it('getRelated returns available=false on 400 graph.invalid_id (wrong id format)', async () => {
    // BFF rejects library-internal ids with 400 graph.invalid_id.
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: 'invalid external id', code: 'graph.invalid_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await api.getRelated('movie-seed'); // wrong format — library id, not tmdb:...

    expect(result.available).toBe(false);
    expect(result.items).toHaveLength(0);
  });

  it('getRelated returns available=false on network failure (graph service down)', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const result = await api.getRelated('tmdb:movie:550');

    expect(result.available).toBe(false);
    expect(result.items).toHaveLength(0);
  });

  it('getRelated sends tmdb:tv: prefix for TV shows', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ available: true, items: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await api.getRelated('tmdb:tv:1396');

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('id=tmdb%3Atv%3A1396');
  });
});
