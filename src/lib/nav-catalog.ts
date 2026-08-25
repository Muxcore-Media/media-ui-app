import type { FeatureKey, LibraryKey } from './capabilities';
import { featureEnabled, libraryEnabled, type Capabilities } from './capabilities';

export type NavItem = {
  to: string;
  label: string;
  end?: boolean;
  library?: LibraryKey;
  feature?: FeatureKey;
};

/** Always-visible primary sections (Home + library modules when enabled). */
export const PRIMARY_CATALOG: NavItem[] = [
  { to: '/', label: 'Home', end: true },
  { to: '/movies', label: 'Movies', library: 'movies' },
  { to: '/tv', label: 'TV', library: 'tv' },
  { to: '/music', label: 'Music', library: 'music' },
  { to: '/books', label: 'Books', library: 'books' },
  { to: '/comics', label: 'Comics', library: 'comics' },
  { to: '/audiobooks', label: 'Audiobooks', library: 'audiobooks' },
];

/** Secondary sections in the "More" menu when their module or feature is enabled. */
export const OVERFLOW_CATALOG: NavItem[] = [
  { to: '/musicvideos', label: 'Music Videos', library: 'musicvideos' },
  { to: '/mixed', label: 'Mixed', feature: 'mixed' },
  { to: '/homevideos', label: 'Home Videos', library: 'homevideos' },
  { to: '/collections', label: 'Collections', feature: 'collections' },
  { to: '/studios', label: 'Studios', feature: 'studios' },
  { to: '/upcoming', label: 'Upcoming', feature: 'upcoming' },
  { to: '/discover', label: 'Discover', feature: 'request' },
  { to: '/watchlist', label: 'Watchlist', feature: 'watchlist' },
  { to: '/requests', label: 'In progress', feature: 'request' },
  { to: '/playlists', label: 'Playlists', feature: 'playlists' },
  { to: '/queue', label: 'Queue', feature: 'queue' },
  { to: '/livetv', label: 'Live TV', feature: 'livetv' },
  { to: '/quickconnect', label: 'Quick Connect', feature: 'quickconnect' },
];

function navItemVisible(caps: Capabilities, item: NavItem): boolean {
  if (item.library) return libraryEnabled(caps, item.library);
  if (item.feature) return featureEnabled(caps, item.feature);
  return true;
}

export function visiblePrimaryNav(caps: Capabilities): NavItem[] {
  return PRIMARY_CATALOG.filter((item) => navItemVisible(caps, item));
}

export function visibleOverflowNav(caps: Capabilities): NavItem[] {
  return OVERFLOW_CATALOG.filter((item) => navItemVisible(caps, item));
}

/** Bottom-tab paths — destinations already one tap away on mobile. */
export const MOBILE_TAB_PATHS = new Set(['/', '/search', '/movies']);

/** Items for the mobile "More" sheet (primary libs not in the tab bar + overflow). */
export function mobileMoreMenuItems(caps: Capabilities): NavItem[] {
  const fromPrimary = visiblePrimaryNav(caps).filter((item) => !MOBILE_TAB_PATHS.has(item.to));
  return [...fromPrimary, ...visibleOverflowNav(caps)];
}

export function showDesktopMoreMenu(caps: Capabilities): boolean {
  return visibleOverflowNav(caps).length > 0;
}

export function showMobileMoreMenu(caps: Capabilities): boolean {
  return mobileMoreMenuItems(caps).length > 0;
}

/** Route path → capability requirement for guarded SPA routes. */
export const ROUTE_LIBRARY: Record<string, LibraryKey | undefined> = {
  '/movies': 'movies',
  '/tv': 'tv',
  '/music': 'music',
  '/books': 'books',
  '/comics': 'comics',
  '/audiobooks': 'audiobooks',
  '/homevideos': 'homevideos',
  '/musicvideos': 'musicvideos',
};

export const ROUTE_FEATURE: Record<string, FeatureKey | undefined> = {
  '/mixed': 'mixed',
  '/collections': 'collections',
  '/studios': 'studios',
  '/upcoming': 'upcoming',
  '/discover': 'request',
  '/watchlist': 'watchlist',
  '/requests': 'request',
  '/playlists': 'playlists',
  '/queue': 'queue',
  '/livetv': 'livetv',
  '/quickconnect': 'quickconnect',
};

export function routeAllowed(caps: Capabilities, pathname: string): boolean {
  const base = '/' + pathname.split('/').filter(Boolean)[0];
  const lib = ROUTE_LIBRARY[base];
  if (lib && !libraryEnabled(caps, lib)) return false;
  const feat = ROUTE_FEATURE[base];
  if (feat && !featureEnabled(caps, feat)) return false;
  return true;
}
