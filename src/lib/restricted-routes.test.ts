import { beforeEach, describe, expect, it } from 'vitest';
import {
  getRestrictedEntryPoints,
  isRestrictedEntryPoint,
  recordRestrictedRoute,
  resetRestrictedRoutes,
  subscribeRestrictedRoutes,
} from './restricted-routes';
import { ALL_CAPABILITIES } from './capabilities';
import { mobileMoreMenuItems, visibleOverflowNav, visiblePrimaryNav } from './nav-catalog';

beforeEach(() => resetRestrictedRoutes());

describe('restricted-routes', () => {
  it('only records parental.restricted_route', () => {
    recordRestrictedRoute('/api/search?q=a', 'parental.blocked');
    recordRestrictedRoute('/api/search?q=a', 'parental.policy_unavailable');
    expect(getRestrictedEntryPoints().size).toBe(0);
    recordRestrictedRoute('/api/search?q=a', 'parental.restricted_route');
    expect([...getRestrictedEntryPoints()]).toEqual(['/search']);
  });

  it('matches whole path segments, not string prefixes', () => {
    recordRestrictedRoute('/api/musicvideos', 'parental.restricted_route');
    expect(getRestrictedEntryPoints().has('/music')).toBe(false);
    recordRestrictedRoute('/api/music/123/artwork', 'parental.restricted_route');
    expect(getRestrictedEntryPoints().has('/music')).toBe(true);
  });

  it('ignores unmapped routes and notifies subscribers once per change', () => {
    let calls = 0;
    const off = subscribeRestrictedRoutes(() => { calls++; });
    recordRestrictedRoute('/api/unknown', 'parental.restricted_route');
    expect(calls).toBe(0);
    recordRestrictedRoute('/api/watchlist', 'parental.restricted_route');
    recordRestrictedRoute('/api/watchlist', 'parental.restricted_route');
    expect(calls).toBe(1);
    off();
  });

  it('hides matching nav entries and leaves the rest alone', () => {
    recordRestrictedRoute('/api/discover/trending', 'parental.restricted_route');
    recordRestrictedRoute('/api/requests', 'parental.restricted_route');
    recordRestrictedRoute('/api/music', 'parental.restricted_route');
    const hidden = getRestrictedEntryPoints();
    const overflow = visibleOverflowNav(ALL_CAPABILITIES, hidden).map((i) => i.label);
    expect(overflow).not.toContain('Discover');
    expect(overflow).not.toContain('In progress');
    expect(overflow).not.toContain('Quality upgrades');
    expect(overflow).toContain('Collections');
    expect(visiblePrimaryNav(ALL_CAPABILITIES, hidden).map((i) => i.label)).not.toContain('Music');
    expect(mobileMoreMenuItems(ALL_CAPABILITIES, hidden).map((i) => i.label)).not.toContain('Music');
    expect(isRestrictedEntryPoint(hidden, '/requests#upgrades')).toBe(true);
  });

  it('keeps nav unchanged when nothing was refused', () => {
    expect(visibleOverflowNav(ALL_CAPABILITIES)).toEqual(
      visibleOverflowNav(ALL_CAPABILITIES, getRestrictedEntryPoints()),
    );
  });
});
