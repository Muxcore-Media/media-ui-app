import { describe, expect, it } from 'vitest';
import { migrateWriteBody, normalizeMigrateResult } from './arr-migrate';

describe('arr migrate', () => {
  it('normalizes a dry-run preview and never requires an api key field', () => {
    const next = normalizeMigrateResult({
      dry_run: true,
      fetched: 2,
      imported: 0,
      skipped: 0,
      errors: [],
      preview: [
        {
          source: 'radarr',
          arr_id: 10,
          title: 'Fight Club',
          year: 1999,
          tmdb_id: 550,
          monitored: true,
          quality_profile_name: 'HD-1080p',
          root_folder_path: '/data/movies',
        },
      ],
    });
    expect(next.dryRun).toBe(true);
    expect(next.fetched).toBe(2);
    expect(next.preview[0].title).toBe('Fight Club');
    expect(next.preview[0].rootFolderPath).toBe('/data/movies');
  });

  it('writes snake_case migrate bodies', () => {
    expect(
      migrateWriteBody({
        service: 'radarr',
        baseUrl: 'http://radarr:7878',
        apiKey: 'secret',
        dryRun: true,
        remapTo: '/data/movies',
      }),
    ).toEqual({
      service: 'radarr',
      base_url: 'http://radarr:7878',
      api_key: 'secret',
      dry_run: true,
      remap_from: undefined,
      remap_to: '/data/movies',
    });
  });
});
