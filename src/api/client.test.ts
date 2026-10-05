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
  setPlaybackSegments,
  deletePlaybackSegments,
  fetchTrickplaySprite,
  reportPlaybackSession,
  normalizeRequestPolicy,
  signOut,
} from './client';
import { normalizeAcquisitionStatus } from '../lib/acquisition-status';

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

  it('maps episode file quality from the household show payload', () => {
    const tv = normalizeTV({
      id: 's1',
      name: 'Show',
      seasons: [
        {
          id: '1',
          season_number: 1,
          episodes: [
            {
              id: 'e1',
              has_file: true,
              episode_number: 1,
              quality: 'WEBDL-1080p',
              filename: 'Show.S01E01.mkv',
              file_id: 'ef1',
            },
          ],
        },
      ],
    });
    expect(tv.seasons?.[0]?.episodes[0]).toMatchObject({
      quality: 'WEBDL-1080p',
      filename: 'Show.S01E01.mkv',
      file_id: 'ef1',
    });
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

  it('maps qualityProfileId from household requests', () => {
    const req = normalizeRequest({
      id: 'r4',
      itemType: 'movie',
      title: 'Dune',
      qualityProfileId: '4k',
    });
    expect(req.qualityProfileId).toBe('4k');
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

  it('approveRequest and denyRequest POST to request-media action routes', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'requested' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await expect(api.approveRequest('req-1')).resolves.toEqual({ status: 'requested' });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/requests/req-1/approve');
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('POST');

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'denied' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await expect(api.denyRequest('req-2', 'nope')).resolves.toEqual({ status: 'denied' });
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/requests/req-2/deny');
    expect((fetchMock.mock.calls[1][1] as RequestInit).body).toBe(JSON.stringify({ reason: 'nope' }));
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

  it('list source CRUD talks to the household BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, sources: [{ id: 'ls1', name: 'Trakt watchlist', type: 'trakt' }] }),
    });
    const listed = await api.listListSources();
    expect(listed.sources[0].id).toBe('ls1');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/lists');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ source: { id: 'ls-new', name: 'IMDb', type: 'imdb' } }),
    });
    const created = await api.createListSource({ name: 'IMDb', type: 'imdb', listUrl: 'https://imdb.com/list/1' });
    expect(created.id).toBe('ls-new');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ started: true, items_found: 12, items_new: 3 }),
    });
    const synced = await api.syncListSources();
    expect(synced.itemsNew).toBe(3);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ started: true, id: 'ls1', items_found: 4, items_new: 1 }),
    });
    const one = await api.syncListSource('ls1');
    expect(one.itemsNew).toBe(1);
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('/api/lists/ls1/sync');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, id: 'ls1', message: 'Found 4 titles', items_found: 4 }),
    });
    const tested = await api.testListSource('ls1');
    expect(tested.ok).toBe(true);
    expect(tested.itemsFound).toBe(4);
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('/api/lists/ls1/test');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ removed: true, id: 'ls1' }),
    });
    const removed = await api.deleteListSource('ls1');
    expect(removed.removed).toBe(true);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ source: { id: 'ls1', name: 'Trakt watchlist', type: 'trakt', enabled: false } }),
    });
    const paused = await api.updateListSource('ls1', { enabled: false });
    expect(paused.enabled).toBe(false);
    expect(fetchMock.mock.calls.at(-1)?.[1]).toMatchObject({ method: 'PATCH' });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        entries: [{ id: 'log1', source_name: 'Trakt watchlist', items_new: 3, status: 'ok' }],
      }),
    });
    const history = await api.listListHistory();
    expect(history.entries[0].itemsNew).toBe(3);
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('/api/lists/history');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        items: [{ id: 'it1', title: 'Fight Club', year: 1999, media_type: 'movie', status: 'added' }],
      }),
    });
    const imported = await api.listListItems({ sourceId: 'ls1' });
    expect(imported.items[0].title).toBe('Fight Club');
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('/api/lists/items?source_id=ls1');
  });

  it('migrateArrLibrary posts a dry-run body to the household BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        dry_run: true,
        fetched: 1,
        imported: 0,
        preview: [{ title: 'Fight Club', root_folder_path: '/data/movies' }],
      }),
    });
    const next = await api.migrateArrLibrary({
      service: 'radarr',
      baseUrl: 'http://radarr:7878',
      apiKey: 'secret',
      dryRun: true,
      remapTo: '/data/movies',
    });
    expect(next.fetched).toBe(1);
    expect(next.preview[0].title).toBe('Fight Club');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/migrate');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      service: 'radarr',
      dry_run: true,
      remap_to: '/data/movies',
    });
  });

  it('syncJellyfinLibrary posts a dry-run body to the household BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        direction: 'jellyfin',
        dry_run: true,
        scanned: 40,
        matched: 12,
        upserted: 3,
        removed: 1,
      }),
    });
    const next = await api.syncJellyfinLibrary({ direction: 'jellyfin', dryRun: true });
    expect(next.scanned).toBe(40);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/jellyfin/sync');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      direction: 'jellyfin',
      dry_run: true,
    });
  });

  it('matchJellyfinItem posts mux id and TMDB to the household BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        matched: true,
        mux_id: 'mux-1',
        jellyfin_id: 'jf-99',
        match_reason: 'provider_id',
      }),
    });
    const next = await api.matchJellyfinItem({ muxId: 'mux-1', title: 'Dune', mediaKind: 'movie', tmdbId: 438631 });
    expect(next.jellyfinId).toBe('jf-99');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/jellyfin/match');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      mux_id: 'mux-1',
      tmdb_id: 438631,
      media_kind: 'movie',
    });
  });

  it('listPlexSyncLists asks the household BFF to refresh device downloads', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        lists: [{ id: 'list-1', deviceName: 'Pat iPad', items: [{ title: 'Dune' }] }],
      }),
    });
    const next = await api.listPlexSyncLists({ refresh: true, userId: 'plex-user' });
    expect(next.lists[0]?.deviceName).toBe('Pat iPad');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/plex/sync-lists?refresh=1&userId=plex-user');
  });

  it('plexPlayURL reads the household Plex deep-link', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://plex.example/web/#!/details' }),
    });
    const url = await api.plexPlayURL('99');
    expect(url).toBe('https://plex.example/web/#!/details');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/plex/play?rating_key=99');
  });

  it('library tags talk to the household BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, tags: [{ id: 'm1', label: '4K', media: 'movie' }] }),
    });
    const listed = await api.listTags('movie');
    expect(listed.tags[0].label).toBe('4K');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/tags?media=movie');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tag: { id: 'm-new', label: 'kids', media: 'movie' } }),
    });
    const created = await api.createTag({ label: 'kids', media: 'movie' });
    expect(created.id).toBe('m-new');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, tags: [{ id: 'm1', label: '4K' }] }),
    });
    const mine = await api.getItemTags('movie', 'mov1');
    expect(mine.tags[0].id).toBe('m1');
    expect(String(fetchMock.mock.calls[2][0])).toContain('/api/movies/mov1/tags');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, tag_ids: ['m1'] }),
    });
    const saved = await api.setItemTags('tv', 'show1', ['m1']);
    expect(saved.ok).toBe(true);
    expect(String(fetchMock.mock.calls[3][0])).toContain('/api/tv/show1/tags');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, tags: [{ id: 'u1', label: 'live', media: 'music' }] }),
    });
    const artistTags = await api.getItemTags('artist', 'ar1');
    expect(artistTags.tags[0].id).toBe('u1');
    expect(String(fetchMock.mock.calls[4][0])).toContain('/api/music/ar1/tags');
  });

  it('alternate titles talk to the household BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        titles: [{ id: 'mt2', title: 'El club de la lucha', source: 'user', user: true }],
      }),
    });
    const listed = await api.listAlternateTitles('movie', 'm1');
    expect(listed.titles[0].title).toBe('El club de la lucha');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/movies/m1/titles');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ title: { id: 'mt-new', title: 'Club de Combate', source: 'user' } }),
    });
    const added = await api.addAlternateTitle('movie', 'm1', 'Club de Combate');
    expect(added.user).toBe(true);
    expect(String(fetchMock.mock.calls[1][1]?.method)).toBe('POST');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ removed: true, id: 'mt2' }),
    });
    const removed = await api.deleteAlternateTitle('tv', 's1', 'mt2');
    expect(removed.removed).toBe(true);
    expect(String(fetchMock.mock.calls[2][0])).toContain('/api/tv/s1/titles/mt2');
  });

  it('title history talks to the household BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        total: 1,
        items: [{ id: 'mh1', event_type: 'grab', source_title: 'Fight.Club.1999.1080p', indexer: 'Knaben' }],
      }),
    });
    const listed = await api.listItemHistory('movie', 'm1', 'grab');
    expect(listed.items[0].eventType).toBe('grab');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/movies/m1/history?event=grab');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, items: [], total: 0 }),
    });
    const tv = await api.listItemHistory('tv', 's1');
    expect(tv.available).toBe(true);
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/tv/s1/history');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, items: [], total: 0 }),
    });
    const artist = await api.listItemHistory('artist', 'ar1');
    expect(artist.available).toBe(true);
    expect(String(fetchMock.mock.calls[2][0])).toContain('/api/music/ar1/history');
  });

  it('title artwork talks to the household BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        items: [{ id: 'm1_poster', type: 'poster', url: '/images/movies/m1/poster.jpg' }],
      }),
    });
    const listed = await api.listItemArtwork('movie', 'm1');
    expect(listed.items[0].type).toBe('poster');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/movies/m1/artwork');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, items: [] }),
    });
    const tv = await api.listItemArtwork('tv', 's1');
    expect(tv.available).toBe(true);
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/tv/s1/artwork');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, items: [] }),
    });
    const books = await api.listItemArtwork('author', 'au1');
    expect(books.available).toBe(true);
    expect(String(fetchMock.mock.calls[2][0])).toContain('/api/books/au1/artwork');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, items: [] }),
    });
    const audiobooks = await api.listItemArtwork('audiobook', 'ab1');
    expect(audiobooks.available).toBe(true);
    expect(String(fetchMock.mock.calls[3][0])).toContain('/api/audiobooks/ab1/artwork');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, artwork: { id: 'm1_poster', type: 'poster', url: '/images/movies/m1/poster.jpg' } }),
    });
    const replaced = await api.replaceItemArtwork('movie', 'm1', { type: 'poster', filename: 'p.jpg', data: 'abc' });
    expect(replaced.type).toBe('poster');
    expect(String(fetchMock.mock.calls[4][1]?.method)).toBe('POST');
  });

  it('title subtitle files talk to the household BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        items: [{ id: 'sub1', language: 'eng', format: 'srt', media_file_id: 'mf1' }],
        files: [{ id: 'mf1' }],
      }),
    });
    const listed = await api.listItemSubtitles('movie', 'm1');
    expect(listed.items[0].language).toBe('eng');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/movies/m1/subtitles');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, subtitle: { id: 'sub-new', language: 'spa', source: 'upload' } }),
    });
    const uploaded = await api.uploadItemSubtitle('movie', 'm1', {
      language: 'spa',
      filename: 'a.srt',
      data: 'abc',
      mediaFileId: 'mf1',
    });
    expect(uploaded.language).toBe('spa');
    expect(String(fetchMock.mock.calls[1][1]?.method)).toBe('POST');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ removed: true, id: 'sub1' }),
    });
    const removed = await api.deleteItemSubtitle('sub1');
    expect(removed.id).toBe('sub1');
    expect(String(fetchMock.mock.calls[2][0])).toContain('/api/subtitles/files/sub1');
  });

  it('household maintainer talks to the BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        rules_total: 1,
        candidates: [{ id: 'c1', title: 'Old Movie', status: 'pending', arr_action: 'delete' }],
      }),
    });
    const listed = await api.getMaintainer();
    expect(listed.candidates[0].title).toBe('Old Movie');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/maintainer');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, dry_run: true, candidates_found: 2, run: { id: 'r1' } }),
    });
    const scanned = await api.scanMaintainer();
    expect(scanned.candidatesFound).toBe(2);
    expect(String(fetchMock.mock.calls[1][1]?.method)).toBe('POST');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, candidate: { id: 'c1', status: 'approved' } }),
    });
    const approved = await api.maintainerCandidateAction('c1', 'approve');
    expect(approved.status).toBe('approved');
    expect(String(fetchMock.mock.calls[2][0])).toContain('/api/maintainer/candidates/c1/approve');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, rule: { id: 'rule-new', name: 'Stale unwatched movies' } }),
    });
    const saved = await api.upsertMaintainerRule({
      name: 'Stale unwatched movies',
      preset: 'stale_unwatched',
      days: 90,
      scope: 'movie',
      action: 'delete',
    });
    expect(saved.name).toBe('Stale unwatched movies');
    expect(String(fetchMock.mock.calls[3][0])).toContain('/api/maintainer/rules');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, protection: { id: 'p1', item_id: 'm1', title: 'Fight Club' } }),
    });
    const protectedTitle = await api.upsertMaintainerProtection({
      itemId: 'm1',
      title: 'Fight Club',
      scope: 'movie',
    });
    expect(protectedTitle.title).toBe('Fight Club');
    expect(String(fetchMock.mock.calls[4][0])).toContain('/api/maintainer/protections');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, collection: { id: 'col1', name: 'Leaving soon', grace_days: 7 } }),
    });
    const collection = await api.upsertMaintainerCollection({ name: 'Leaving soon', graceDays: 7 });
    expect(collection.name).toBe('Leaving soon');
    expect(collection.graceDays).toBe(7);
    expect(String(fetchMock.mock.calls[5][0])).toContain('/api/maintainer/collections');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, exclusion: { id: 'excl1', name: 'Favorites', type: 'local', tmdb_ids: [550] } }),
    });
    const exclusion = await api.upsertMaintainerExclusion({
      name: 'Favorites',
      type: 'local',
      tmdbIdsText: '550',
    });
    expect(exclusion.name).toBe('Favorites');
    expect(exclusion.tmdbIds).toEqual([550]);
    expect(String(fetchMock.mock.calls[6][0])).toContain('/api/maintainer/exclusions');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, imported: 1 }),
    });
    const imported = await api.importMaintainerRules({ rulesYaml: 'name: Unwatched 90d\n' });
    expect(imported.imported).toBe(1);
    expect(String(fetchMock.mock.calls[7][0])).toContain('/api/maintainer/rules/import');
  });

  it('household backups talk to the BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        restore_dir: '/data/restore',
        backups: [{ id: 'backup_1', created_at: '2024-01-02T03:04:05Z', size_bytes: 2048 }],
      }),
    });
    const listed = await api.listBackups();
    expect(listed.backups[0].id).toBe('backup_1');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/backups');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, backup: { id: 'backup_new', size_bytes: 512 } }),
    });
    const created = await api.createBackup();
    expect(created.id).toBe('backup_new');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, id: 'backup_1', files_restored: 4, restore_dir: '/data/restore' }),
    });
    const restored = await api.restoreBackup('backup_1');
    expect(restored.ok).toBe(true);
    expect(String(fetchMock.mock.calls[2][0])).toContain('/api/backups/backup_1/restore');
  });

  it('household API keys talk to the BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, keys: [{ id: 'tok1', name: 'laptop', prefix: 'mct_abc' }] }),
    });
    const listed = await api.listAPIKeys();
    expect(listed.keys[0].name).toBe('laptop');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/keys');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: { id: 'tok-new', name: 'tv' }, secret: 'mct_copyonce' }),
    });
    const created = await api.createAPIKey({ name: 'tv', userId: 'u1' });
    expect(created.secret).toBe('mct_copyonce');
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toMatchObject({ name: 'tv', user_id: 'u1' });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: { id: 'tok2', name: 'tv' }, secret: 'mct_rotated' }),
    });
    const rotated = await api.rotateAPIKey('tok1');
    expect(rotated.secret).toBe('mct_rotated');
    expect(String(fetchMock.mock.calls[2][0])).toContain('/api/keys/tok1/rotate');
  });

  it('household subtitle wanted talks to the BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, wanted: [{ id: 'w1', title: 'Interstellar', language: 'eng' }] }),
    });
    const listed = await api.listSubtitleWanted();
    expect(listed.wanted[0].title).toBe('Interstellar');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/subtitles/wanted');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ item: { id: 'w-new', title: 'Dune' } }),
    });
    const created = await api.createSubtitleWanted({ title: 'Dune', language: 'eng' });
    expect(created.title).toBe('Dune');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, searched: 2, downloaded: 0 }),
    });
    const searched = await api.searchSubtitleWanted();
    expect(searched.searched).toBe(2);
    expect(String(fetchMock.mock.calls[2][0])).toContain('/api/subtitles/wanted/search');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, providers: [{ id: 'opensubtitles', enabled: true }] }),
    });
    const providers = await api.listSubtitleProviders();
    expect(providers.providers[0].id).toBe('opensubtitles');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, entries: [{ id: 'bl1', title: 'Dune.2021.1080p', reason: 'wrong hash' }] }),
    });
    const blocked = await api.listSubtitleBlacklist();
    expect(blocked.entries[0].title).toBe('Dune.2021.1080p');
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('/api/subtitles/blacklist');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ removed: true, id: 'bl1' }),
    });
    const allowed = await api.removeSubtitleBlacklist('bl1');
    expect(allowed.removed).toBe(true);
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('/api/subtitles/blacklist/bl1');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, languages: [{ code: 'eng', name: 'English' }, { code: 'spa', name: 'Spanish' }] }),
    });
    const langs = await api.listSubtitleLanguages();
    expect(langs.languages[0].code).toBe('eng');
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('/api/subtitles/languages');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        items: [{ id: 'mov1', title: 'Dune', media_type: 'movie', language_profile_id: 'lp_default' }],
      }),
    });
    const library = await api.listSubtitleMedia();
    expect(library.items[0].title).toBe('Dune');
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('/api/subtitles/media');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, updated: 2 }),
    });
    const edited = await api.massEditSubtitleMedia({ mediaIds: ['ep1', 'ep2'], languageProfileId: 'lp_hi' });
    expect(edited.updated).toBe(2);
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('/api/subtitles/media/mass-edit');
    expect(JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body))).toMatchObject({
      media_ids: ['ep1', 'ep2'],
      language_profile_id: 'lp_hi',
    });
  });

  it('notification Connect talks to the household BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, channels: [{ id: 'discord', enabled: true, description: 'Discord' }] }),
    });
    const listed = await api.getNotifications();
    expect(listed.channels[0].id).toBe('discord');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/notifications');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ configured: true, channel: 'slack' }),
    });
    const saved = await api.configureNotification({ channel: 'slack', webhookUrl: 'https://hooks.example/s' });
    expect(saved.configured).toBe(true);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toMatchObject({
      channel: 'slack',
      webhook_url: 'https://hooks.example/s',
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, channel: 'discord' }),
    });
    const ping = await api.testNotification('discord');
    expect(ping.ok).toBe(true);
    expect(String(fetchMock.mock.calls[2][0])).toContain('/api/notifications/test');
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
    expect(caps.features.offline).toBe(true);
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

  it('setPlaybackSegments replaces skip points', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        media_id: 'm1',
        enabled: true,
        segments: [{ kind: 'intro', start_seconds: 0, end_seconds: 80, confidence: 1, source: 'manual' }],
      }),
    });
    const res = await setPlaybackSegments('m1', [
      { kind: 'intro', start_seconds: 0, end_seconds: 80, confidence: 1, source: 'manual' },
    ]);
    expect(res.segments[0].end_seconds).toBe(80);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/playback/segments');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PUT' });
  });

  it('deletePlaybackSegments clears skip points', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ media_id: 'm1', enabled: true, segments: [] }),
    });
    const res = await deletePlaybackSegments('m1');
    expect(res.segments).toEqual([]);
    expect(String(fetchMock.mock.calls[0][0])).toContain('media_id=m1');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });
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

  it('normalizeRequestPolicy maps household quota fields', () => {
    const p = normalizeRequestPolicy({
      max_pending_per_user: 3,
      maxPerWeek: 5,
      autoApproveUsers: ['alice'],
      remaining_week: 2,
      can_request: true,
      can_edit: true,
    });
    expect(p.maxPendingPerUser).toBe(3);
    expect(p.maxPerWeek).toBe(5);
    expect(p.remainingWeek).toBe(2);
    expect(p.autoApproveUsers).toEqual(['alice']);
    expect(p.canEdit).toBe(true);
  });

  it('normalizeAcquisitionStatus maps live peers', () => {
    const s = normalizeAcquisitionStatus({
      ready: true,
      has_indexer: true,
      hasDownloader: true,
      message: 'ready',
      peers: [{ id: 'idx', kind: 'indexer', label: 'Pirate Bay', live: true }],
    });
    expect(s.ready).toBe(true);
    expect(s.hasIndexer).toBe(true);
    expect(s.hasDownloader).toBe(true);
    expect(s.peers).toEqual([{ id: 'idx', kind: 'indexer', label: 'Pirate Bay', live: true }]);
  });

  it('getAcquisition reads household grab peers', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ready: false,
        hasIndexer: true,
        hasDownloader: false,
        message: 'An indexer is up, but no downloader is connected.',
        peers: [{ id: 'idx', kind: 'indexer', label: 'Pirate Bay indexer', live: true }],
        capabilities_available: true,
        capabilities: { supports_id_search: true, supports_season_pack: true, supports_movie_search: true },
      }),
    });
    const status = await api.getAcquisition();
    expect(status.hasIndexer).toBe(true);
    expect(status.ready).toBe(false);
    expect(status.capabilitiesAvailable).toBe(true);
    expect(status.capabilities.supportsIdSearch).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/acquisition');
  });

  it('listIndexers reads the Prowlarr catalog', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, indexers: [{ id: 3, name: 'Knaben', protocol: 'torrent', configured: true }] }),
    });
    const listed = await api.listIndexers();
    expect(listed.indexers[0].name).toBe('Knaben');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/indexers');
  });

  it('createIndexer posts a Prowlarr feed', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 9, name: 'Knaben', protocol: 'torrent', configured: true }),
    });
    const created = await api.createIndexer({
      name: 'Knaben',
      base_url: 'https://knaben.example/api',
      api_key: 'secret',
    });
    expect(created.name).toBe('Knaben');
    expect(fetchMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('listSessions reads household now-watching rows', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        total: 1,
        items: [{ id: 's1', title: 'Dune', href: '/movies/m1', user: 'sam' }],
      }),
    });
    const res = await api.listSessions();
    expect(res.items[0]?.title).toBe('Dune');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/sessions');
  });

  it('listSkipMedia reads titles with skip points', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, items: [{ id: 'm1' }, { id: 'ep1' }] }),
    });
    const res = await api.listSkipMedia();
    expect(res.items.map((row) => row.id)).toEqual(['m1', 'ep1']);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/playback/segments/media');
  });

  it('getWatchStats reads household monitor totals', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        days: 30,
        stats: [{ key: 'plays', label: 'Plays', value: 12 }],
        topMovies: [{ title: 'Dune', playCount: 4 }],
      }),
    });
    const res = await api.getWatchStats(30);
    expect(res.stats[0]?.value).toBe(12);
    expect(res.topMovies[0]?.title).toBe('Dune');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/watch-stats?days=30');
  });

  it('getItemWatchStats reads per-title monitor totals', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, itemId: 'm1', playCount: 4, uniqueUsers: 2, neverWatched: false }),
    });
    const res = await api.getItemWatchStats('m1', 139);
    expect(res.playCount).toBe(4);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/watch-stats/item?');
    expect(String(fetchMock.mock.calls[0][0])).toContain('id=m1');
  });

  it('getStaleLibrary reads never-watched titles', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        neverWatched: 1,
        items: [{ title: 'Old Movie', category: 'never_watched', daysStale: 400 }],
      }),
    });
    const res = await api.getStaleLibrary(90);
    expect(res.items[0]?.title).toBe('Old Movie');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/watch-stats/stale?');
  });

  it('importTautulliHistory posts a dry-run body', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ imported: 0, skipped: 3, totalFetched: 3, dryRun: true }),
    });
    const res = await api.importTautulliHistory({
      tautulliUrl: 'http://tautulli:8181',
      apiKey: 'k',
      dryRun: true,
    });
    expect(res.skipped).toBe(3);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/watch-stats/import-tautulli');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      tautulli_url: 'http://tautulli:8181',
      api_key: 'k',
      records_json: '',
      dry_run: true,
    });
  });

  it('importJellystatHistory posts backup JSON', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ imported: 1, skipped: 0, totalFetched: 1, dryRun: true }),
    });
    const res = await api.importJellystatHistory({ backupJson: '[]', dryRun: true });
    expect(res.imported).toBe(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/watch-stats/import-jellystat');
  });

  it('getLibraryDuplicates and getLibraryStorage read monitor leftovers', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ available: true, groups: [{ title: 'Dune', copyCount: 2 }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ available: true, totalItems: 12, libraries: [{ name: 'movies', itemCount: 8 }] }),
      });
    expect((await api.getLibraryDuplicates()).groups[0]?.title).toBe('Dune');
    expect((await api.getLibraryStorage()).totalItems).toBe(12);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        history: [{ day: '2026-09-01', bytes: 1000, itemCount: 12 }],
        prediction: { projectedBytes: 2000, horizonDays: 90 },
      }),
    });
    expect((await api.getLibraryStorageHistory(90)).history[0]?.day).toBe('2026-09-01');
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('/api/watch-stats/storage-history?');
  });

  it('getWatchCharts reads hour and user leftovers', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        hours: [{ label: '20:00', count: 4 }],
        users: [{ label: 'pat', count: 6 }],
        daysOfWeek: [{ label: 'Saturday', count: 7 }],
        streamTypes: [{ label: 'Direct play', count: 9 }],
        concurrent: { peak: 3, series: [] },
      }),
    });
    const res = await api.getWatchCharts(30);
    expect(res.hours[0]?.label).toBe('20:00');
    expect(res.daysOfWeek[0]?.label).toBe('Saturday');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/watch-stats/charts?');
  });

  it('getGuard reads household playback-guard rules', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        rules: [{ id: 'r1', type: 'concurrent_streams', name: 'Two streams', enabled: true, params: { max_streams: '2' } }],
        violations: [],
        trust: [],
      }),
    });
    const res = await api.getGuard();
    expect(res.rules[0]?.name).toBe('Two streams');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/guard');
  });

  it('mergeGuardUsers posts a household identity merge', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ aliasesCreated: 1, violationsUpdated: 2, sessionsUpdated: 3 }),
    });
    const res = await api.mergeGuardUsers({ sourceUserName: 'pat-tv', targetUserName: 'pat' });
    expect(res.aliasesCreated).toBe(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/guard/users/merge');
  });

  it('upsertGuardRule puts a concurrent-stream limit', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'r1', type: 'concurrent_streams', name: 'Two streams', enabled: true, params: { max_streams: '2' } }),
    });
    const res = await api.upsertGuardRule({ type: 'concurrent_streams', name: 'Two streams', enabled: true, params: { max_streams: '2' } });
    expect(res.id).toBe('r1');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/guard/rules');
  });

  it('getWatchNotify reads household watch alert rules', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        rules: [{ id: 'nr1', name: 'Session start', eventType: 'playback.started', enabled: true }],
        destinations: [{ id: 'd1', name: 'Family Discord', type: 'discord' }],
      }),
    });
    const res = await api.getWatchNotify();
    expect(res.rules[0]?.name).toBe('Session start');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/watch-notify');
  });

  it('upsertWatchNotifyRule posts a playback-started leftover', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'nr1', name: 'Someone started', eventType: 'playback.started', enabled: true }),
    });
    const res = await api.upsertWatchNotifyRule({
      name: 'Someone started',
      enabled: true,
      eventType: 'playback.started',
    });
    expect(res.id).toBe('nr1');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/watch-notify/rules');
  });

  it('classifyTagging posts a household auto-tag run', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ mediaId: 'm1', tags: [{ id: 't1', name: 'Kids' }], matchedRuleIds: ['r1'] }),
    });
    const res = await api.classifyTagging({ mediaId: 'm1', title: 'Paw Patrol', mediaType: 'tv' });
    expect(res.tags[0]?.name).toBe('Kids');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/tagging/classify');
  });

  it('getTagging reads auto-tag rules', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        tags: [{ id: 't1', name: 'Kids' }],
        rules: [{ id: 'r1', tagId: 't1', field: 'title', match: 'contains', pattern: 'Paw Patrol' }],
      }),
    });
    const res = await api.getTagging();
    expect(res.rules[0]?.pattern).toBe('Paw Patrol');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/tagging');
  });

  it('stopSession posts a household kick', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ stopped: true, serverType: 'native' }),
    });
    const res = await api.stopSession('sess-1');
    expect(res.stopped).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/sessions/sess-1/stop');
  });

  it('listWatchHistory reads household monitor history', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        total: 1,
        items: [{ id: 'h1', title: 'Dune', href: '/movies/m1', mediaId: 'm1', watched: true }],
      }),
    });
    const res = await api.listWatchHistory();
    expect(res.items[0]?.title).toBe('Dune');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/history');
  });

  it('listWatchHistory forwards user and search filters', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, total: 0, items: [] }),
    });
    await api.listWatchHistory(40, { userId: 'u-sam', q: 'Dune' });
    const href = String(fetchMock.mock.calls[0][0]);
    expect(href).toContain('/api/history');
    expect(href).toContain('userId=u-sam');
    expect(href).toContain('q=Dune');
    expect(href).toContain('limit=40');
  });

  it('getSeriesOverride reads a per-show grab delay', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        found: true,
        override: { series_id: 's1', delay_minutes: 45, preferred_groups: ['FLUX'] },
      }),
    });
    const res = await api.getSeriesOverride('s1');
    expect(res.override.delayMinutes).toBe(45);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/tv/s1/override');
  });

  it('listBlocklist reads blocked releases', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        total: 1,
        items: [{ wanted_item_id: 'q1', guid: 'g-bad', title: 'CAM.Rip' }],
      }),
    });
    const res = await api.listBlocklist();
    expect(res.items[0]?.guid).toBe('g-bad');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/blocklist');
  });

  it('addWanted posts a title onto the automation wanted queue', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ added: true, queue_id: 'w_movie_m1' }),
    });
    const res = await api.addWanted({ itemType: 'movie', itemId: 'm1', title: 'Dune', year: 2021, tmdbId: 438631 });
    expect(res.queue_id).toBe('w_movie_m1');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/wanted');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      item_type: 'movie',
      item_id: 'm1',
      title: 'Dune',
      year: 2021,
      tmdb_id: 438631,
    });
  });

  it('listMissing reads monitored library titles without files', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        movies: { available: true, items: [{ id: 'm1', title: 'Dune', href: '/movies/m1' }] },
        tv: { available: true, items: [] },
      }),
    });
    const res = await api.listMissing();
    expect(res.movies.items[0]?.title).toBe('Dune');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/missing');
  });

  it('getComicSeries reads a series and its issues', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        series: { id: 's1', title: 'Saga' },
        issues: [{ id: 'i1', title: 'Chapter One', stream_url: '/stream/comics/i1' }],
      }),
    });
    const res = await api.getComicSeries('s1');
    expect(res.series.title).toBe('Saga');
    expect(res.issues[0]?.stream_url).toBe('/stream/comics/i1');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/comics/s1');
  });

  it('importLibraryFile posts a plus-library path', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'f1', stream_url: '/stream/books/f1' }),
    });
    const res = await api.importLibraryFile({ kind: 'book', id: 'b1', path: '/library/Dune.epub' });
    expect(res.stream_url).toBe('/stream/books/f1');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/books/works/b1/import');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'tr1', stream_url: '/stream/music/tr1', imported: true }),
    });
    const album = await api.importLibraryFile({ kind: 'album', id: 'al1', path: '/data/music/One.More.Time.flac' });
    expect(album.imported).toBe(true);
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/music/albums/al1/import');
  });

  it('listDelayProfiles reads grab delays', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        profiles: [{ protocol: 'torrent', wait_minutes: 15 }],
      }),
    });
    const res = await api.listDelayProfiles();
    expect(res.profiles[0]?.waitMinutes).toBe(15);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/delay-profiles');
  });

  it('listInvites and createInvite talk to the household BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        invites: [{ id: 'inv1', prefix: 'abcd', role: 'user', max_uses: 1, use_count: 0 }],
      }),
    });
    const list = await api.listInvites();
    expect(list.invites[0]?.id).toBe('inv1');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        invite: { id: 'inv2', role: 'viewer', join_url: 'https://media.example/invite/tok' },
      }),
    });
    const created = await api.createInvite({ role: 'viewer', maxUses: 1, ttlHours: 24 });
    expect(created.joinUrl).toContain('/invite/tok');
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/invites');
  });

  it('listUsers setUserRole and deleteUser talk to the household BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, users: [{ id: 'u1', username: 'pat', roles: ['user'] }] }),
    });
    const listed = await api.listUsers();
    expect(listed.users[0].username).toBe('pat');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/users');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: 'u1', username: 'pat', roles: ['viewer'] } }),
    });
    const patched = await api.setUserRole('u1', 'viewer');
    expect(patched.roles).toEqual(['viewer']);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ removed: true, id: 'u1' }),
    });
    const removed = await api.deleteUser('u1');
    expect(removed.removed).toBe(true);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: 'u2', username: 'sam', roles: ['viewer'] } }),
    });
    const created = await api.createUser({ username: 'sam', password: 'password123', role: 'viewer' });
    expect(created.username).toBe('sam');
    expect(String(fetchMock.mock.calls[3][0])).toContain('/api/users');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, id: 'u1' }),
    });
    const pw = await api.setUserPassword('u1', 'newpass99');
    expect(pw.ok).toBe(true);
    expect(String(fetchMock.mock.calls[4][0])).toContain('/api/users/u1/password');
  });

  it('household TOTP talks to the BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, enabled: false }),
    });
    const status = await api.getTOTP();
    expect(status.enabled).toBe(false);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/totp');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ enabled: true, secret: 'SECRETBASE32', qr_code_url: 'otpauth://totp/MuxCore:sam' }),
    });
    const enabled = await api.enableTOTP();
    expect(enabled.secret).toBe('SECRETBASE32');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ verified: true, enabled: true }),
    });
    const verified = await api.verifyTOTP('123456');
    expect(verified.verified).toBe(true);
    expect(String(fetchMock.mock.calls[2][0])).toContain('/api/totp/verify');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ enabled: false }),
    });
    const disabled = await api.disableTOTP();
    expect(disabled.enabled).toBe(false);
  });

  it('household passkeys talk to the BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, passkeys: [{ id: 'cred1', credential_type: 'public-key' }] }),
    });
    const listed = await api.listPasskeys();
    expect(listed.passkeys[0].id).toBe('cred1');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/passkeys');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, options: { publicKey: { challenge: 'chal-1' } }, challenge: 'chal-1' }),
    });
    const began = await api.beginPasskeyRegister();
    expect(began.challenge).toBe('chal-1');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ registered: true }),
    });
    const done = await api.completePasskeyRegister('chal-1', { id: 'cred-new' });
    expect(done.registered).toBe(true);
    expect(String(fetchMock.mock.calls[2][0])).toContain('/api/passkeys/register/complete');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ removed: true, id: 'cred1' }),
    });
    const removed = await api.deletePasskey('cred1');
    expect(removed.removed).toBe(true);
  });

  it('password reset queue talks to the household BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        count: 1,
        requests: [{ id: 'req1', username: 'alice', user_id: 'u-alice', user: true }],
      }),
    });
    const listed = await api.listPasswordResets();
    expect(listed.requests[0].username).toBe('alice');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/password-reset');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, id: 'req1', user_id: 'u-alice' }),
    });
    const set = await api.setPasswordReset('req1', 'newpass99');
    expect(set.ok).toBe(true);
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/password-reset/req1/password');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, id: 'req1' }),
    });
    const dismissed = await api.dismissPasswordReset('req1');
    expect(dismissed.ok).toBe(true);
    expect(String(fetchMock.mock.calls[2][0])).toContain('/api/password-reset/req1/dismiss');
  });

  it('listImportCandidates reads scanner download-folder rows', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        total: 1,
        items: [{ path: '/downloads/Dune.2021.mkv', title: 'Dune', media_type: 'movie' }],
      }),
    });
    const res = await api.listImportCandidates();
    expect(res.items[0]?.title).toBe('Dune');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/import/candidates');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        items: [{
          path: '/downloads/Severance.S01E01.mkv',
          title: 'Severance',
          media_type: 'tv',
          season_number: 1,
          episode_number: 1,
          matched: true,
          series_name: 'Severance',
          episode_title: 'Good News About Hell',
        }],
      }),
    });
    const tv = await api.listImportCandidates();
    expect(tv.items[0]?.matched).toBe(true);
    expect(tv.items[0]?.episodeTitle).toBe('Good News About Hell');
  });

  it('setMonitored patches a movie', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ monitored: false }),
    });
    const res = await api.setMonitored({ kind: 'movie', id: 'm1', monitored: false });
    expect(res.monitored).toBe(false);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/movies/m1');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PATCH' });
  });

  it('setMonitored patches a music album', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ monitored: true }),
    });
    const res = await api.setMonitored({ kind: 'album', id: 'al1', monitored: true });
    expect(res.monitored).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/music/albums/al1');
  });

  it('setMonitored patches a book and a comic series', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ monitored: false }),
    });
    await api.setMonitored({ kind: 'book', id: 'b1', monitored: false });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/books/works/b1');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ monitored: true }),
    });
    await api.setMonitored({ kind: 'series', id: 's1', monitored: true });
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/comics/s1');
  });

  it('removeLibraryItem deletes a movie', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ removed: true, delete_files: true }),
    });
    const res = await api.removeLibraryItem({ kind: 'movie', id: 'm1', deleteFiles: true });
    expect(res.removed).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/movies/m1?delete_files=1');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });
  });

  it('removeLibraryItem deletes a book author', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ removed: true, delete_files: false }),
    });
    await api.removeLibraryItem({ kind: 'author', id: 'a1' });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/books/a1');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });
  });

  it('removeLibraryItem deletes a music artist', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ removed: true, delete_files: true }),
    });
    await api.removeLibraryItem({ kind: 'artist', id: 'ar1', deleteFiles: true });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/music/ar1?delete_files=1');
  });

  it('refreshLibraryItem posts a TV refresh', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ refreshed: true }),
    });
    const res = await api.refreshLibraryItem({ kind: 'tv', id: 's1' });
    expect(res.refreshed).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/tv/s1/refresh');
  });

  it('refreshLibraryItem posts a music artist refresh', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ refreshed: true }),
    });
    const res = await api.refreshLibraryItem({ kind: 'artist', id: 'ar1' });
    expect(res.refreshed).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/music/ar1/refresh');
  });

  it('getEpisodeFile reads household episode quality', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        id: 'e1',
        file_id: 'ef1',
        filename: 'Show.S01E01.mkv',
        quality: 'WEBDL-1080p',
      }),
    });
    const res = await api.getEpisodeFile('e1');
    expect(res.quality).toBe('WEBDL-1080p');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/episodes/e1/file');
  });

  it('removeEpisodeFile deletes the episode file', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ removed: true, delete_files: true }),
    });
    const res = await api.removeEpisodeFile({ id: 'e1', deleteFiles: true });
    expect(res.removed).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/episodes/e1/file?delete_files=1');
  });

  it('removeMovieFile deletes the movie file and keeps the title', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ removed: true, delete_files: true, files: 1 }),
    });
    const res = await api.removeMovieFile({ id: 'm1', deleteFiles: true });
    expect(res.removed).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/movies/m1/file?delete_files=1');
  });

  it('listMovieFiles and deleteMovieFile talk to the household BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        items: [{ id: 'f1', filename: 'Fight.Club.1999.mkv', quality: 'Bluray-1080p', size_bytes: 100, container: 'mkv' }],
      }),
    });
    const listed = await api.listMovieFiles('m1');
    expect(listed.items[0].filename).toBe('Fight.Club.1999.mkv');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/movies/m1/files');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ removed: true, id: 'f1', delete_files: true }),
    });
    const removed = await api.deleteMovieFile('m1', 'f1');
    expect(removed.removed).toBe(true);
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/movies/m1/files/f1');
  });

  it('lists and deletes music track files', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, items: [{ id: 'tr1', filename: 'One.More.Time.flac' }] }),
    });
    const listed = await api.listTrackFiles('ar1', 'al1');
    expect(listed.items[0].id).toBe('tr1');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/music/ar1/files?album_id=al1');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ removed: true, id: 'tr1', delete_files: true }),
    });
    const removed = await api.deleteTrackFile('ar1', 'tr1');
    expect(removed.removed).toBe(true);
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/music/ar1/files/tr1?delete_files=1');
  });

  it('setQualityProfile patches a movie profile', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ quality_profile_id: 'qp_uhd' }),
    });
    const res = await api.setQualityProfile({ kind: 'movie', id: 'm1', qualityProfileId: 'qp_uhd' });
    expect(res.quality_profile_id).toBe('qp_uhd');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/movies/m1');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ quality_profile_id: 'qp_flac' }),
    });
    const artist = await api.setQualityProfile({ kind: 'artist', id: 'ar1', qualityProfileId: 'qp_flac' });
    expect(artist.quality_profile_id).toBe('qp_flac');
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/music/ar1');
  });

  it('addMusicAlbum posts a new album', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ added: true, album: { id: 'al-new', title: 'Homework', year: 1997 } }),
    });
    const res = await api.addMusicAlbum({ artistId: 'ar1', title: 'Homework', year: 1997 });
    expect(res.added).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/music/ar1/albums');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' });
  });

  it('addMusicArtist posts a new artist', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ added: true, artist: { id: 'ar-new', name: 'Daft Punk' } }),
    });
    const res = await api.addMusicArtist({ name: 'Daft Punk' });
    expect(res.added).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/music');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' });
  });

  it('addBook posts a new book', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ added: true, item: { id: 'bk-new', title: 'The Dispossessed', year: 1974 } }),
    });
    const res = await api.addBook({ authorId: 'au1', title: 'The Dispossessed', year: 1974 });
    expect(res.added).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/books/au1/books');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' });
  });

  it('addComicIssue posts a new issue', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ added: true, item: { id: 'ci-new', title: 'Romance Dawn', number: '1' } }),
    });
    const res = await api.addComicIssue({ seriesId: 's1', title: 'Romance Dawn', number: '1', year: 1997 });
    expect(res.added).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/comics/s1/issues');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' });
  });

  it('addBookAuthor posts a new author', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ added: true, item: { id: 'au-new', name: 'Octavia E. Butler' } }),
    });
    const res = await api.addBookAuthor({ name: 'Octavia E. Butler' });
    expect(res.added).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/books');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' });
  });

  it('addComicSeries posts a new series', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ added: true, item: { id: 'cs-new', title: 'One Piece' } }),
    });
    const res = await api.addComicSeries({ title: 'One Piece', publisher: 'Shueisha' });
    expect(res.added).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/comics');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' });
  });

  it('addAudiobook posts a new audiobook', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ added: true, item: { id: 'ab-new', title: 'The Name of the Wind', year: 2007 } }),
    });
    const res = await api.addAudiobook({ author: 'Patrick Rothfuss', title: 'The Name of the Wind', year: 2007 });
    expect(res.added).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/audiobooks');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' });
  });

  it('parseQuality talks to the household BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        quality: { label: '1080p Remux', resolution: '1080p', source: 'Remux', codec: 'hevc', hdr: true, score: 150 },
      }),
    });
    const q = await api.parseQuality('Dune.2021.1080p.REMUX.mkv');
    expect(q.label).toBe('1080p Remux');
    expect(q.hdr).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/formats/parse');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' });
  });

  it('quality profile CRUD talks to the household BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ profile: { id: 'qp-new', name: 'UHD', cutoff_score: 15000, upgrade_allowed: true } }),
    });
    const created = await api.createQualityProfile({
      name: 'UHD',
      minScore: 0,
      cutoffScore: 15000,
      upgradeAllowed: true,
      upgradeDelayMinutes: 0,
      formatScores: {},
    });
    expect(created.id).toBe('qp-new');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/formats/profiles');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ profile: { id: 'qp1', name: 'HD', cutoffScore: 12000 } }),
    });
    const updated = await api.updateQualityProfile('qp1', {
      name: 'HD',
      minScore: 0,
      cutoffScore: 12000,
      upgradeAllowed: true,
      upgradeDelayMinutes: 0,
      formatScores: { cf1: 1850 },
    });
    expect(updated.cutoffScore).toBe(12000);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ removed: true, id: 'qp1' }),
    });
    const removed = await api.deleteQualityProfile('qp1');
    expect(removed.removed).toBe(true);
  });

  it('release profile CRUD talks to the household BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ profile: { id: 'rpg-new', name: 'No CAM', must_not_contain: ['cam'], enabled: true } }),
    });
    const created = await api.createReleaseProfile({ name: 'No CAM', mustNotContain: ['cam'], enabled: true });
    expect(created.id).toBe('rpg-new');
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('/api/formats/release-profiles');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ profile: { id: 'rpg1', name: 'Default Blocklist', enabled: false } }),
    });
    const updated = await api.updateReleaseProfile('rpg1', { name: 'Default Blocklist', enabled: false });
    expect(updated.enabled).toBe(false);
    expect(fetchMock.mock.calls.at(-1)?.[1]).toMatchObject({ method: 'PATCH' });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ removed: true, id: 'rpg1' }),
    });
    const removed = await api.deleteReleaseProfile('rpg1');
    expect(removed.removed).toBe(true);
  });

  it('custom format CRUD talks to the household BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ format: { id: 'cf-new', name: 'HDR', score: 500, rules: [{ field: 'title', op: 'contains', value: 'HDR' }] } }),
    });
    const created = await api.createCustomFormat({
      name: 'HDR',
      score: 500,
      rules: [{ field: 'title', op: 'contains', value: 'HDR', negate: false }],
    });
    expect(created.id).toBe('cf-new');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/formats');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ format: { id: 'cf1', name: 'REMUX', score: 2000 } }),
    });
    const updated = await api.updateCustomFormat('cf1', {
      name: 'REMUX',
      score: 2000,
      rules: [{ field: 'title', op: 'contains', value: 'REMUX', negate: false }],
    });
    expect(updated.score).toBe(2000);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ removed: true, id: 'cf1' }),
    });
    const removed = await api.deleteCustomFormat('cf1');
    expect(removed.removed).toBe(true);
  });

  it('previewRename and applyRename talk to the household BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        items: [{ file_id: 'f1', current_path: '/a.mkv', new_path: '/A (1999)/A.mkv', changed: true }],
      }),
    });
    const preview = await api.previewRename({ movieId: 'm1' });
    expect(preview.items[0].fileId).toBe('f1');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/rename/preview?movie_id=m1');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, renamed: 1, errors: 0, items: [] }),
    });
    const applied = await api.applyRename({ movieId: 'm1' });
    expect(applied.renamed).toBe(1);
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/rename');
  });

  it('naming template CRUD talks to the household BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        templates: [{ id: 'movie_tpl', name: 'Default Movie', media_type: 'movie', is_default: true }],
      }),
    });
    const listed = await api.listNamingTemplates('movie');
    expect(listed.templates[0].id).toBe('movie_tpl');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/rename/templates?media_type=movie');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ template: { id: 'tpl-new', name: 'UHD', media_type: 'tv', pattern: '{Title}' } }),
    });
    const created = await api.createNamingTemplate({ name: 'UHD', mediaType: 'tv', pattern: '{Title}' });
    expect(created.id).toBe('tpl-new');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ template: { id: 'movie_tpl', name: 'Movies', pattern: '{Title} ({Year})' } }),
    });
    const updated = await api.updateNamingTemplate('movie_tpl', { name: 'Movies', pattern: '{Title} ({Year})' });
    expect(updated.name).toBe('Movies');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ removed: true, id: 'movie_dot' }),
    });
    const removed = await api.deleteNamingTemplate('movie_dot');
    expect(removed.removed).toBe(true);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        directory: '/data/movies',
        media_type: 'movie',
        dry_run: true,
        total: 1,
        renamed: 1,
        items: [{ original: 'Fight.Club.1999.mkv', renamed_to: '/data/movies/Fight Club (1999).mkv', success: true }],
      }),
    });
    const organized = await api.organizeLibrary({ directory: '/data/movies', mediaType: 'movie', dryRun: true });
    expect(organized.renamed).toBe(1);
    expect(organized.dryRun).toBe(true);
    expect(String(fetchMock.mock.calls[4][0])).toContain('/api/rename/organize');
  });

  it('listRoots and setRootFolder talk to the household BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        roots: [{ id: 'r1', path: '/data/movies', name: 'Movies', media_kind: 'movies', is_default: true }],
      }),
    });
    const catalog = await api.listRoots('movies');
    expect(catalog.roots[0].path).toBe('/data/movies');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/roots?kind=movies');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        root: { id: 'r1', path: '/data/movies', name: 'Movies', media_kind: 'movies', is_default: true },
      }),
    });
    const picked = await api.pickRoot('movies');
    expect(picked.root?.path).toBe('/data/movies');
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/roots/pick?kind=movies');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ root_folder_path: '/data/uhd' }),
    });
    const res = await api.setRootFolder({ kind: 'movie', id: 'm1', rootFolderPath: '/data/uhd' });
    expect(res.root_folder_path).toBe('/data/uhd');
    expect(String(fetchMock.mock.calls[2][0])).toContain('/api/movies/m1');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ root_folder_path: '/data/music' }),
    });
    const artist = await api.setRootFolder({ kind: 'artist', id: 'ar1', rootFolderPath: '/data/music' });
    expect(artist.root_folder_path).toBe('/data/music');
    expect(String(fetchMock.mock.calls[3][0])).toContain('/api/music/ar1');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ root_folder_path: '/data/books' }),
    });
    const author = await api.setRootFolder({ kind: 'author', id: 'au1', rootFolderPath: '/data/books' });
    expect(author.root_folder_path).toBe('/data/books');
    expect(String(fetchMock.mock.calls[4][0])).toContain('/api/books/au1');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ root_folder_path: '/data/audiobooks' }),
    });
    const audiobook = await api.setRootFolder({ kind: 'audiobook', id: 'ab1', rootFolderPath: '/data/audiobooks' });
    expect(audiobook.root_folder_path).toBe('/data/audiobooks');
    expect(String(fetchMock.mock.calls[5][0])).toContain('/api/audiobooks/ab1');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ root_folder_path: '/data/comics' }),
    });
    const series = await api.setRootFolder({ kind: 'series', id: 's1', rootFolderPath: '/data/comics' });
    expect(series.root_folder_path).toBe('/data/comics');
    expect(String(fetchMock.mock.calls[6][0])).toContain('/api/comics/s1');
  });

  it('browseRoots createRoot and deleteRoot talk to the household BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        available: true,
        path: '/data',
        parent: '/',
        entries: [{ name: 'movies', path: '/data/movies', is_dir: true }],
      }),
    });
    const listing = await api.browseRoots('/data');
    expect(listing.entries[0].path).toBe('/data/movies');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/roots/browse?path=%2Fdata');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, path: '/data/movies', accessible: true, free_bytes: 120_000_000_000 }),
    });
    const probed = await api.probeRoot('/data/movies');
    expect(probed.accessible).toBe(true);
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/roots/probe');
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'POST' });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, root: { id: 'r2', path: '/data/uhd', name: 'UHD', media_kind: 'movies' } }),
    });
    const created = await api.createRoot({ path: '/data/uhd', name: 'UHD', mediaKind: 'movies', isDefault: true });
    expect(created.path).toBe('/data/uhd');
    expect(fetchMock.mock.calls[2][1]).toMatchObject({ method: 'POST' });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, root: { id: 'r2', path: '/data/uhd', name: '4K', media_kind: 'movies', is_default: true } }),
    });
    const updated = await api.updateRoot('r2', { name: '4K', mediaKind: 'movies', isDefault: true });
    expect(updated.name).toBe('4K');
    expect(fetchMock.mock.calls[3][1]).toMatchObject({ method: 'PATCH' });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ removed: true, id: 'r2' }),
    });
    const removed = await api.deleteRoot('r2');
    expect(removed.removed).toBe(true);
    expect(String(fetchMock.mock.calls[4][0])).toContain('/api/roots/r2');
  });

  it('library scan talks to the household BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, status: 'idle', watch_dirs: 2, total_imported: 12 }),
    });
    const status = await api.getLibraryScan();
    expect(status.totalImported).toBe(12);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/scan');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ type: 'watch', files_imported: 4, message: 'watch scan complete' }),
    });
    const result = await api.runLibraryScan({ type: 'watch' });
    expect(result.filesImported).toBe(4);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'POST' });
  });

  it('watch dir CRUD talks to the household BFF', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, dirs: [{ id: 'wd1', path: '/downloads', media_type: 'both' }] }),
    });
    const listed = await api.listWatchDirs();
    expect(listed.dirs[0].path).toBe('/downloads');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/scan/watch-dirs');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'wd-new', path: '/downloads/tv', media_type: 'tv' }),
    });
    const created = await api.createWatchDir({ path: '/downloads/tv', mediaType: 'tv' });
    expect(created.id).toBe('wd-new');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ removed: true, id: 'wd1' }),
    });
    const removed = await api.deleteWatchDir('wd1');
    expect(removed.removed).toBe(true);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'wd1', path: '/downloads', enabled: false }),
    });
    const paused = await api.updateWatchDir('wd1', { enabled: false });
    expect(paused.enabled).toBe(false);
    expect(fetchMock.mock.calls.at(-1)?.[1]).toMatchObject({ method: 'PATCH' });
  });

  it('createWatchTogether posts a household SyncPlay room', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'wt_1',
        hostToken: 'h_1',
        src: '/stream/movies/m1',
        youAreHost: true,
        playing: true,
      }),
    });
    const room = await api.createWatchTogether({ src: '/stream/movies/m1', title: 'Dune' });
    expect(room.id).toBe('wt_1');
    expect(room.hostToken).toBe('h_1');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/watch-together');
  });

  it('reportPlaybackSession posts native play events', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ accepted: true, forwarded: true, session_id: 'sess-1' }),
    });
    const res = await reportPlaybackSession({
      event_type: 'started',
      session_id: 'web-1',
      media_id: 'm1',
      title: 'Dune',
      media_type: 'movie',
      position_seconds: 0,
      duration_seconds: 7200,
    });
    expect(res.forwarded).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/playback/session');
    expect(fetchMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        method: 'POST',
      }),
    );
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

describe('signOut', () => {
  const assign = vi.fn();
  beforeEach(() => {
    assign.mockReset();
    vi.stubGlobal('location', { ...window.location, assign });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs /logout same-origin then navigates to /login', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    await signOut();
    expect(fetchMock).toHaveBeenCalledWith('/logout', {
      method: 'POST',
      credentials: 'same-origin',
    });
    expect(assign).toHaveBeenCalledWith('/login');
  });

  it('falls back to the GET confirm page when the POST fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    await signOut();
    expect(assign).toHaveBeenCalledWith('/logout');
    assign.mockReset();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')));
    await signOut();
    expect(assign).toHaveBeenCalledWith('/logout');
  });
});
