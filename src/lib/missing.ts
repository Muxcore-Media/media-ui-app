export type MissingKind = 'movie' | 'tv' | 'music' | 'book' | 'comic' | 'audiobook';

export type MissingItem = {
  kind: MissingKind;
  id: string;
  itemId: string;
  seriesId: string;
  artistId: string;
  artistName: string;
  title: string;
  year: number;
  tmdbId: number;
  musicbrainzId: string;
  seasonNumber: number;
  episodeNumber: number;
  issueNumber: string;
  airDate: string;
  qualityProfileId: string;
  href: string;
};

export type MissingList = {
  available: boolean;
  items: MissingItem[];
  total: number;
};

export type MissingResponse = {
  available: boolean;
  movies: MissingList;
  tv: MissingList;
  music: MissingList;
  books: MissingList;
  comics: MissingList;
  audiobooks: MissingList;
};

function asNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const MISSING_KINDS = new Set<string>(['movie', 'tv', 'music', 'book', 'comic', 'audiobook']);

function kindFrom(row: Record<string, unknown>, fallback: MissingKind): MissingKind {
  if (typeof row.kind === 'string' && MISSING_KINDS.has(row.kind)) return row.kind as MissingKind;
  return fallback;
}

function defaultHref(kind: MissingKind, id: string, itemId: string, artistId: string, seriesId: string): string {
  if (kind === 'tv') return `/tv/${itemId}`;
  if (kind === 'music') return `/music/${artistId || itemId}`;
  if (kind === 'book') return `/books/${artistId || seriesId || itemId}`;
  if (kind === 'comic') return `/comics/${seriesId || itemId}`;
  if (kind === 'audiobook') return `/audiobooks/${id || itemId}`;
  return `/movies/${id}`;
}

function listFrom(raw: unknown, fallbackKind: MissingKind): MissingList {
  const rec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const rows = Array.isArray(rec.items) ? rec.items : [];
  const items = rows
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map((row) => {
      const kind = kindFrom(row, fallbackKind);
      const id = String(
        row.id ??
          row.itemId ??
          row.item_id ??
          row.albumId ??
          row.album_id ??
          row.bookId ??
          row.book_id ??
          row.issueId ??
          row.issue_id ??
          row.audiobookId ??
          row.audiobook_id ??
          '',
      ).trim();
      const itemId = String(
        row.itemId ??
          row.item_id ??
          row.bookId ??
          row.book_id ??
          row.issueId ??
          row.issue_id ??
          row.audiobookId ??
          row.audiobook_id ??
          row.seriesId ??
          row.series_id ??
          row.albumId ??
          row.album_id ??
          id,
      ).trim();
      const artistId = String(
        row.artistId ??
          row.artist_id ??
          row.authorId ??
          row.author_id ??
          (kind === 'music' || kind === 'book' || kind === 'audiobook' ? String(row.seriesId ?? '') : ''),
      ).trim();
      return {
        kind,
        id,
        itemId,
        seriesId: String(row.seriesId ?? row.series_id ?? (kind === 'tv' ? itemId : artistId)).trim(),
        artistId,
        artistName: String(row.artistName ?? row.artist_name ?? row.authorName ?? row.author_name ?? row.seriesName ?? row.series_name ?? ''),
        title: String(row.title ?? 'Untitled'),
        year: asNumber(row.year),
        tmdbId: asNumber(row.tmdbId ?? row.tmdb_id),
        musicbrainzId: String(row.musicbrainzId ?? row.musicbrainz_id ?? ''),
        seasonNumber: asNumber(row.seasonNumber ?? row.season_number),
        episodeNumber: asNumber(row.episodeNumber ?? row.episode_number),
        issueNumber: String(row.issueNumber ?? row.issue_number ?? row.number ?? ''),
        airDate: String(row.airDate ?? row.air_date ?? ''),
        qualityProfileId: String(row.qualityProfileId ?? row.quality_profile_id ?? ''),
        href: String(row.href ?? defaultHref(kind, id, itemId, artistId, String(row.seriesId ?? row.series_id ?? ''))),
      };
    })
    .filter((row) => row.id || row.itemId);
  return {
    available: rec.available === true,
    items,
    total: asNumber(rec.total) || items.length,
  };
}

export function normalizeMissing(raw: Record<string, unknown> | null | undefined): MissingResponse {
  const movies = listFrom(raw?.movies, 'movie');
  const tv = listFrom(raw?.tv, 'tv');
  const music = listFrom(raw?.music, 'music');
  const books = listFrom(raw?.books, 'book');
  const comics = listFrom(raw?.comics, 'comic');
  const audiobooks = listFrom(raw?.audiobooks, 'audiobook');
  return {
    available:
      raw?.available === true ||
      movies.available ||
      tv.available ||
      music.available ||
      books.available ||
      comics.available ||
      audiobooks.available,
    movies,
    tv,
    music,
    books,
    comics,
    audiobooks,
  };
}

export function missingEpisodeLabel(item: MissingItem): string {
  if (item.kind === 'music' || item.kind === 'book' || item.kind === 'audiobook') return missingAlbumLabel(item);
  if (item.kind === 'comic') {
    const issue = item.issueNumber ? `#${item.issueNumber}` : '';
    const bits = [item.artistName, issue, item.year ? String(item.year) : ''].filter(Boolean);
    return bits.join(' · ');
  }
  if (item.kind !== 'tv' || !item.seasonNumber) return item.year ? String(item.year) : '';
  const ep = item.episodeNumber ? String(item.episodeNumber).padStart(2, '0') : '??';
  const extra = item.airDate ? ` · ${item.airDate}` : '';
  return `S${String(item.seasonNumber).padStart(2, '0')}E${ep}${extra}`;
}

export function missingAlbumLabel(item: MissingItem): string {
  const bits = [item.artistName, item.year ? String(item.year) : ''].filter(Boolean);
  return bits.join(' · ');
}
