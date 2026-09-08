import type { Audiobook, AudiobookFile, LibraryRow } from '../types';
import type { NowPlayingTrack } from './nowPlaying';

function asFile(raw: unknown): AudiobookFile | null {
  if (!raw || typeof raw !== 'object') return null;
  const f = raw as Record<string, unknown>;
  const id = typeof f.id === 'string' ? f.id : '';
  if (!id) return null;
  return {
    id,
    audiobook_id: typeof f.audiobook_id === 'string' ? f.audiobook_id : undefined,
    title: typeof f.title === 'string' && f.title ? f.title : id,
    path: typeof f.path === 'string' ? f.path : undefined,
    stream_url: typeof f.stream_url === 'string' ? f.stream_url : undefined,
  };
}

export function audiobookFromRow(row: LibraryRow): Audiobook {
  const files = Array.isArray(row.files)
    ? row.files.map(asFile).filter((f): f is AudiobookFile => f !== null)
    : [];
  return {
    id: row.id,
    author_id: typeof row.author_id === 'string' ? row.author_id : undefined,
    title: String(row.title || row.name || row.id),
    narrator: typeof row.narrator === 'string' ? row.narrator : undefined,
    asin: typeof row.asin === 'string' ? row.asin : undefined,
    year: typeof row.year === 'number' ? row.year : undefined,
    duration_seconds: typeof row.duration_seconds === 'number' ? row.duration_seconds : undefined,
    stream_url: typeof row.stream_url === 'string' ? row.stream_url : undefined,
    files,
  };
}

export function audiobookHref(id: string): string {
  return `/audiobooks/${encodeURIComponent(id)}`;
}

export function audiobookQueue(
  ab: Audiobook,
  href: string,
  artistName?: string,
): NowPlayingTrack[] {
  const narrator = artistName || ab.narrator;
  const files = (ab.files || []).filter((f) => f.stream_url);
  if (files.length > 0) {
    return files.map((f) => ({
      id: f.id,
      src: f.stream_url || '',
      title: f.title || ab.title,
      artistName: narrator,
      href,
      mediaType: 'audiobook',
    }));
  }
  if (ab.stream_url) {
    return [
      {
        id: ab.id,
        src: ab.stream_url,
        title: ab.title,
        artistName: narrator,
        href,
        mediaType: 'audiobook',
      },
    ];
  }
  return [];
}
