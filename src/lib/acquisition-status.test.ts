import { describe, expect, it } from 'vitest';
import {
  acquisitionFallbackMessage,
  indexerCapabilityLabels,
  normalizeAcquisitionStatus,
} from './acquisition-status';

describe('acquisition status', () => {
  it('treats missing peers as not ready', () => {
    const s = normalizeAcquisitionStatus({});
    expect(s.ready).toBe(false);
    expect(s.hasIndexer).toBe(false);
    expect(s.hasDownloader).toBe(false);
    expect(s.peers).toEqual([]);
    expect(s.indexers).toEqual([]);
  });

  it('accepts snake_case flags', () => {
    const s = normalizeAcquisitionStatus({
      has_indexer: true,
      has_downloader: false,
      message: 'need a downloader',
    });
    expect(s.hasIndexer).toBe(true);
    expect(s.hasDownloader).toBe(false);
    expect(s.message).toBe('need a downloader');
    expect(s.liveGrabAllowed).toBe(true);
  });

  it('maps live grab VPN policy', () => {
    const s = normalizeAcquisitionStatus({
      live_grab_allowed: false,
      downloader_mode: 'live',
      indexer_mode: 'live',
      vpn: { configured: true, conf_present: false },
    });
    expect(s.liveGrabAllowed).toBe(false);
    expect(s.downloaderMode).toBe('live');
    expect(s.vpn).toEqual({ configured: true, confPresent: false });
  });

  it('maps Prowlarr/Jackett children', () => {
    const s = normalizeAcquisitionStatus({
      hasIndexer: true,
      indexers_available: true,
      indexers: [{ id: 3, name: 'Knaben', protocol: 'torrent', language: 'en', configured: true }],
    });
    expect(s.indexersAvailable).toBe(true);
    expect(s.indexers[0]).toEqual({
      id: 3,
      name: 'Knaben',
      protocol: 'torrent',
      language: 'en',
      configured: true,
    });
  });

  it('maps Prowlarr/Jackett capabilities', () => {
    const s = normalizeAcquisitionStatus({
      capabilities_available: true,
      capabilities: {
        supports_movie_search: true,
        supports_tv_search: true,
        supports_id_search: true,
        supports_season_pack: true,
        supported_protocols: ['torrent', 'usenet'],
      },
    });
    expect(s.capabilitiesAvailable).toBe(true);
    expect(indexerCapabilityLabels(s.capabilities)).toEqual([
      'Movies',
      'TV',
      'ID search',
      'Season packs',
      'torrent',
      'usenet',
    ]);
  });

  it('keeps fallback copy for the setup banner', () => {
    expect(acquisitionFallbackMessage()).toMatch(/indexer and a downloader/i);
  });
});
