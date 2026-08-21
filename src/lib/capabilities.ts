import { createContext, useContext } from 'react'

/** Library sections backed by module HTTP/gRPC (see GET /api/capabilities). */
export type LibraryKey =
  | 'movies'
  | 'tv'
  | 'music'
  | 'books'
  | 'comics'
  | 'audiobooks'
  | 'homevideos'
  | 'musicvideos'

/** Cross-library product features (search, livetv, userdata, etc.). */
export type FeatureKey =
  | 'search'
  | 'request'
  | 'collections'
  | 'studios'
  | 'upcoming'
  | 'mixed'
  | 'livetv'
  | 'quickconnect'
  | 'playlists'
  | 'queue'
  | 'favorites'

export type Capabilities = {
  libraries: Record<LibraryKey, boolean>
  features: Record<FeatureKey, boolean>
}

export const ALL_CAPABILITIES: Capabilities = {
  libraries: {
    movies: true,
    tv: true,
    music: true,
    books: true,
    comics: true,
    audiobooks: true,
    homevideos: true,
    musicvideos: true,
  },
  features: {
    search: true,
    request: true,
    collections: true,
    studios: true,
    upcoming: true,
    mixed: true,
    livetv: true,
    quickconnect: true,
    playlists: true,
    queue: true,
    favorites: true,
  },
}

/** Default MVP stack: movies + TV only (optional library-plus modules off). */
export const DEFAULT_CAPABILITIES: Capabilities = {
  libraries: {
    movies: true,
    tv: true,
    music: false,
    books: false,
    comics: false,
    audiobooks: false,
    homevideos: false,
    musicvideos: false,
  },
  features: {
    search: true,
    request: true,
    collections: true,
    studios: true,
    upcoming: true,
    mixed: true,
    livetv: true,
    quickconnect: true,
    playlists: true,
    queue: true,
    favorites: true,
  },
}

export type CapabilitiesContextValue = {
  caps: Capabilities
  loading: boolean
  error: string | null
}

export const CapabilitiesContext = createContext<CapabilitiesContextValue>({
  caps: DEFAULT_CAPABILITIES,
  loading: true,
  error: null,
})

export function useCapabilities() {
  return useContext(CapabilitiesContext)
}

export function libraryEnabled(caps: Capabilities, key: LibraryKey): boolean {
  return caps.libraries[key] === true
}

export function featureEnabled(caps: Capabilities, key: FeatureKey): boolean {
  return caps.features[key] === true
}
