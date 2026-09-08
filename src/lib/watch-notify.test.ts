import { describe, expect, it } from 'vitest';
import {
  normalizeWatchNotifyCatalog,
  parseCsvList,
  watchNotifyDestinationLabel,
  watchNotifyEventLabel,
  watchNotifyRuleLabel,
} from './watch-notify';

describe('watch-notify', () => {
  it('normalizes household playback-monitor alert catalogs', () => {
    const catalog = normalizeWatchNotifyCatalog({
      available: true,
      rules: [
        {
          id: 'nr1',
          name: 'Session start',
          enabled: true,
          event_type: 'playback.started',
          filters: { transcode_only: true, platforms: 'tvos, android' },
        },
      ],
      destinations: [{ id: 'd1', name: 'Family Discord', type: 'discord', events: ['playback.started'] }],
    });
    expect(catalog.available).toBe(true);
    expect(watchNotifyRuleLabel(catalog.rules[0])).toBe('Session start · Playback started · on');
    expect(catalog.rules[0].filters.transcodeOnly).toBe(true);
    expect(catalog.rules[0].filters.platforms).toEqual(['tvos', 'android']);
    expect(watchNotifyDestinationLabel(catalog.destinations[0])).toBe('Family Discord · discord · on');
    expect(watchNotifyEventLabel('media.request.ready')).toBe('Request ready');
    expect(parseCsvList(' pat, alex ')).toEqual(['pat', 'alex']);
  });
});
