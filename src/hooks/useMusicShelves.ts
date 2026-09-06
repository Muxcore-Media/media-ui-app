/**
 * Fetches artists and a bounded set of their albums for the Home music shelves
 * (umbrella#113). Errors are swallowed so a missing/unavailable music library
 * never breaks the Home page — callers receive empty lists and `available=false`.
 *
 * Album ordering: albums are sorted by `year` descending (newest first, nulls/undefined
 * last) before the MAX_ALBUMS slice is applied. This is a release-year approximation —
 * the BFF /api/music/:id response does not currently expose an `addedAt` / `dateAdded`
 * field on album objects. If a real library-added-at signal becomes available on the
 * MusicAlbum type, replace the `year` comparator with that field and update the shelf
 * label in Home.tsx back to "Recently Added Albums" (umbrella#115).
 */
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { LibraryRow, MusicAlbum } from '../types';

export type MusicAlbumWithArtist = MusicAlbum & {
  artistId: string;
  artistName: string;
};

export type UseMusicShelvesResult = {
  /** True while the initial fetch is in flight. */
  loading: boolean;
  /** False when the music library endpoint is unavailable or returned an error. */
  available: boolean;
  /** Up to MAX_ARTISTS artists from the library. */
  artists: LibraryRow[];
  /** Albums flattened from the first MAX_ARTISTS artists, sorted by year descending (nulls last). */
  albums: MusicAlbumWithArtist[];
};

const MAX_ARTISTS = 20;
const MAX_ALBUMS = 24;

export function useMusicShelves(): UseMusicShelvesResult {
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(false);
  const [artists, setArtists] = useState<LibraryRow[]>([]);
  const [albums, setAlbums] = useState<MusicAlbumWithArtist[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.listMusic();
        if (cancelled) return;

        if (list.available === false || list.items.length === 0) {
          setAvailable(list.available !== false && list.items.length > 0);
          return;
        }

        const artistSlice = list.items.slice(0, MAX_ARTISTS);
        setArtists(artistSlice);
        setAvailable(true);

        // Flatten albums from each artist in parallel (cap concurrency via Promise.all).
        const results = await Promise.all(
          artistSlice.map(async (a) => {
            try {
              const detail = await api.getMusicArtist(a.id);
              const name = String(a.name || detail.artist?.name || a.id);
              return (detail.albums || []).map<MusicAlbumWithArtist>((al) => ({
                ...al,
                artistId: a.id,
                artistName: name,
              }));
            } catch {
              return [] as MusicAlbumWithArtist[];
            }
          }),
        );
        if (cancelled) return;

        // Sort by year descending (nulls/undefined last) before capping at MAX_ALBUMS.
        // Year is the only recency proxy available on MusicAlbum; see module comment.
        const flat = results
          .flat()
          .sort((a, b) => {
            if (a.year == null && b.year == null) return 0;
            if (a.year == null) return 1;
            if (b.year == null) return -1;
            return b.year - a.year;
          })
          .slice(0, MAX_ALBUMS);
        setAlbums(flat);
      } catch {
        // Music library unavailable — soft-fail, leave available=false.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, available, artists, albums };
}
