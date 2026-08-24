import { describe, expect, it } from 'vitest'
import { ALL_CAPABILITIES, DEFAULT_CAPABILITIES } from './capabilities'
import { routeAllowed, showDesktopMoreMenu, showMobileMoreMenu, visibleOverflowNav, visiblePrimaryNav } from './nav-catalog'

describe('nav-catalog', () => {
  it('hides library-plus sections on the default MVP stack', () => {
    const primary = visiblePrimaryNav(DEFAULT_CAPABILITIES)
    expect(primary.map((i) => i.label)).toEqual(['Home', 'Movies', 'TV'])
    const overflow = visibleOverflowNav(DEFAULT_CAPABILITIES)
    expect(overflow.map((i) => i.label)).toContain('Collections')
    expect(overflow.map((i) => i.label)).toContain('In progress')
    expect(overflow.map((i) => i.label)).not.toContain('Watchlist')
    expect(overflow.map((i) => i.label)).not.toContain('Music Videos')
    expect(overflow.map((i) => i.label)).not.toContain('Home Videos')
  })

  it('shows watchlist in overflow when feature is enabled', () => {
    const caps = {
      ...DEFAULT_CAPABILITIES,
      features: { ...DEFAULT_CAPABILITIES.features, watchlist: true },
    }
    const overflow = visibleOverflowNav(caps)
    expect(overflow.map((i) => i.label)).toContain('Watchlist')
    expect(routeAllowed(caps, '/watchlist')).toBe(true)
    expect(routeAllowed(DEFAULT_CAPABILITIES, '/watchlist')).toBe(false)
  })

  it('shows all library sections when capabilities enable them', () => {
    const primary = visiblePrimaryNav(ALL_CAPABILITIES)
    expect(primary.map((i) => i.label)).toEqual([
      'Home',
      'Movies',
      'TV',
      'Music',
      'Books',
      'Comics',
      'Audiobooks',
    ])
    const overflow = visibleOverflowNav(ALL_CAPABILITIES)
    expect(overflow.map((i) => i.label)).toContain('Music Videos')
    expect(overflow.map((i) => i.label)).toContain('Home Videos')
    expect(overflow.map((i) => i.label)).toContain('Watchlist')
  })

  it('blocks routes for disabled libraries', () => {
    expect(routeAllowed(DEFAULT_CAPABILITIES, '/music')).toBe(false)
    expect(routeAllowed(DEFAULT_CAPABILITIES, '/movies')).toBe(true)
    expect(routeAllowed(DEFAULT_CAPABILITIES, '/music/ar1')).toBe(false)
  })

  it('shows desktop More when overflow sections exist', () => {
    expect(showDesktopMoreMenu(DEFAULT_CAPABILITIES)).toBe(true)
    expect(showMobileMoreMenu(DEFAULT_CAPABILITIES)).toBe(true)
  })

  it('hides More menus when nothing extra is available', () => {
    const bare: typeof DEFAULT_CAPABILITIES = {
      libraries: {
        movies: true,
        tv: false,
        music: false,
        books: false,
        comics: false,
        audiobooks: false,
        homevideos: false,
        musicvideos: false,
      },
      features: {
        search: false,
        request: false,
        collections: false,
        studios: false,
        upcoming: false,
        mixed: false,
        livetv: false,
        quickconnect: false,
        playlists: false,
        queue: false,
        favorites: false,
        debrid: false,
        watchlist: false,
      },
    }
    expect(showDesktopMoreMenu(bare)).toBe(false)
    expect(showMobileMoreMenu(bare)).toBe(false)
  })
})
