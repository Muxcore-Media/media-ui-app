import { describe, expect, it } from 'vitest';
import {
  listSourceLabel,
  listSourceUpdateBody,
  listSourceWriteBody,
  listSyncItemLabel,
  listSyncLogLabel,
  normalizeListSources,
  normalizeListSyncHistory,
  normalizeListSyncItems,
} from './list-sources';

describe('list sources', () => {
  it('normalizes household list-sync rows and hides missing keys', () => {
    const next = normalizeListSources({
      available: true,
      sources: [
        {
          id: 'ls1',
          name: 'Trakt watchlist',
          type: 'trakt',
          list_url: 'https://trakt.tv/users/sam/watchlist',
          has_api_key: true,
        },
        { id: '' },
      ],
    });
    expect(next.sources).toHaveLength(1);
    expect(next.sources[0].hasApiKey).toBe(true);
    expect(listSourceLabel(next.sources[0])).toBe('Trakt watchlist (trakt)');
    expect(next.sources[0].enabled).toBe(true);
    expect(listSourceLabel({ ...next.sources[0], enabled: false })).toBe('Trakt watchlist (trakt) · paused');
  });

  it('writes a pause patch without wiping other fields', () => {
    expect(listSourceUpdateBody({ enabled: false })).toEqual({ enabled: false });
  });

  it('soft-fails when list-sync is down', () => {
    expect(normalizeListSources({ available: false, sources: [] })).toEqual({
      available: false,
      sources: [],
    });
  });

  it('normalizes list-sync history and imported items', () => {
    const history = normalizeListSyncHistory({
      available: true,
      total: 1,
      entries: [{ id: 'log1', source_name: 'Trakt watchlist', items_found: 12, items_new: 3, status: 'ok' }],
    });
    expect(listSyncLogLabel(history.entries[0])).toBe('Trakt watchlist: 3 new of 12 (ok)');
    const items = normalizeListSyncItems({
      available: true,
      total: 1,
      items: [{ id: 'it1', title: 'Fight Club', year: 1999, media_type: 'movie', status: 'added' }],
    });
    expect(listSyncItemLabel(items.items[0])).toBe('Fight Club (1999) · movie · added');
  });

  it('writes snake_case create bodies', () => {
    expect(listSourceWriteBody({ name: 'IMDb', type: 'imdb', listUrl: 'https://imdb.com/list/1' })).toEqual({
      name: 'IMDb',
      type: 'imdb',
      username: undefined,
      client_id: undefined,
      list_url: 'https://imdb.com/list/1',
      sync_interval_minutes: undefined,
      base_url: undefined,
      api_key: undefined,
      quality_profile_id: undefined,
      root_folder_path: undefined,
    });
  });
});
