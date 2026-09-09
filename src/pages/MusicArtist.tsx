import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useId, useState } from 'react';
import { ArrowLeft, Pause, Play } from 'lucide-react';
import { api } from '../api/client';
import { AddAlbumField } from '../components/media/AddAlbumField';
import { ImportFileField } from '../components/media/ImportFileField';
import { MonitorButton } from '../components/media/MonitorButton';
import { QualityProfileSelect } from '../components/media/QualityProfileSelect';
import { RootFolderSelect } from '../components/media/RootFolderSelect';
import { TagSelect } from '../components/media/TagSelect';
import { RefreshMetadataButton } from '../components/media/RefreshMetadataButton';
import { RemoveLibraryButton } from '../components/media/RemoveLibraryButton';
import Spinner from '../components/Spinner';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import { useNowPlaying } from '../lib/nowPlaying';
import { canManageLibrary } from '../lib/session';
import type { MusicAlbum, MusicArtistDetail } from '../types';

export default function MusicArtist() {
  const albumsHeadingId = useId();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<MusicArtistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const nowPlaying = useNowPlaying();
  const playing = nowPlaying.playing ? nowPlaying.track?.id ?? null : null;
  const [lyrics, setLyrics] = useState<{ found: boolean; text: string; title?: string } | null>(
    null,
  );
  const [busyFileId, setBusyFileId] = useState('');
  const canEdit = canManageLibrary();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const d = await api.getMusicArtist(id);
        if (!cancelled) setDetail(d);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load artist');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!playing) {
      setLyrics(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const l = await api.getTrackLyrics(playing);
        if (!cancelled) setLyrics(l);
      } catch {
        if (!cancelled) setLyrics({ found: false, text: '' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [playing]);

  if (loading) {
    return (
      <div className="flex justify-center py-16" data-testid="music-artist-page" aria-busy="true">
        <LoadingStatus label="Loading artist" />
        <Spinner />
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="space-y-3" data-testid="music-artist-page">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Artist not found
        </h1>
        <ErrorBanner message={error || 'Artist not found.'} />
        <Link to="/music" className="text-[var(--accent-color)] hover:underline">
          Back to music
        </Link>
      </div>
    );
  }

  const artist = detail.artist;
  const albums: MusicAlbum[] = detail.albums || [];

  async function onDeleteTrack(trackId: string, title: string) {
    if (!artist.id || !trackId || busyFileId) return;
    if (!window.confirm(`Delete “${title}” from disk? The album stays in the library.`)) return;
    setBusyFileId(trackId);
    try {
      await api.deleteTrackFile(artist.id, trackId);
      setDetail((cur) =>
        cur
          ? {
              ...cur,
              albums: cur.albums.map((al) => ({
                ...al,
                tracks: (al.tracks || []).filter((row) => row.id !== trackId),
              })),
            }
          : cur,
      );
    } finally {
      setBusyFileId('');
    }
  }

  return (
    <div className="space-y-8" data-testid="music-artist-page">
      <div>
        <Link
          to="/music"
          className="flex items-center gap-1 text-sm font-medium text-[var(--accent-color)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Music
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            {artist.name}
          </h1>
          <MonitorButton
            kind="artist"
            id={artist.id}
            monitored={artist.monitored}
            compact
            onChange={(next) =>
              setDetail((cur) => (cur ? { ...cur, artist: { ...cur.artist, monitored: next } } : cur))
            }
          />
          <QualityProfileSelect
            kind="artist"
            id={artist.id}
            value={artist.quality_profile_id}
            onChange={(next) =>
              setDetail((cur) =>
                cur ? { ...cur, artist: { ...cur.artist, quality_profile_id: next } } : cur,
              )
            }
          />
          <RootFolderSelect
            kind="artist"
            id={artist.id}
            value={artist.root_folder_path}
            onChange={(next) =>
              setDetail((cur) =>
                cur ? { ...cur, artist: { ...cur.artist, root_folder_path: next } } : cur,
              )
            }
          />
          <TagSelect kind="artist" id={artist.id} />
          <RefreshMetadataButton
            kind="artist"
            id={artist.id}
            onRefreshed={() => {
              void api.getMusicArtist(artist.id).then(setDetail).catch(() => undefined);
            }}
          />
          <RemoveLibraryButton
            kind="artist"
            id={artist.id}
            title={artist.name}
            hasFile={albums.some((al) => (al.tracks || []).some((tr) => Boolean(tr.stream_url)))}
            onRemoved={() => navigate('/music')}
          />
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          {albums.length} album{albums.length === 1 ? '' : 's'}
        </p>
      </div>

      <AddAlbumField
        onAdd={async ({ title, year }) => {
          await api.addMusicAlbum({ artistId: artist.id, title, year });
          setDetail(await api.getMusicArtist(id));
        }}
      />

      {albums.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No albums for this artist yet.</p>
      ) : (
        <section className="space-y-6" aria-labelledby={albumsHeadingId}>
          <h2 id={albumsHeadingId} className="sr-only">
            Albums
          </h2>
          {albums.map((al) => (
            <section key={al.id} className="space-y-3" aria-labelledby={`album-${al.id}`}>
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  id={`album-${al.id}`}
                  className="text-lg font-semibold text-[var(--text-primary)]"
                >
                  {al.title}
                  {al.year ? (
                    <span className="text-sm font-normal text-[var(--text-tertiary)]">
                      {' '}
                      · {al.year}
                    </span>
                  ) : null}
                </h3>
                <MonitorButton
                  kind="album"
                  id={al.id}
                  monitored={al.monitored}
                  compact
                  onChange={(next) =>
                    setDetail((cur) =>
                      cur
                        ? {
                            ...cur,
                            albums: cur.albums.map((row) => (row.id === al.id ? { ...row, monitored: next } : row)),
                          }
                        : cur,
                    )
                  }
                />
              </div>
              <ul
                className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                aria-label={`${al.title} tracks`}
              >
                {(al.tracks || []).map((t, i) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 px-4 py-2 text-sm transition hover:bg-[var(--bg-elevated-2)]"
                  >
                    <div className="min-w-0">
                      <span className="mr-2 text-[var(--text-tertiary)]">{i + 1}.</span>
                      <span className="font-medium text-[var(--text-primary)]">{t.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {canEdit && (t.stream_url || t.path) ? (
                        <button
                          type="button"
                          disabled={Boolean(busyFileId)}
                          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--danger-color)] disabled:opacity-40"
                          aria-label={`Delete ${t.title}`}
                          onClick={() => void onDeleteTrack(t.id, t.title)}
                        >
                          {busyFileId === t.id ? 'Deleting…' : 'Delete'}
                        </button>
                      ) : null}
                      {t.stream_url || t.path ? (
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--accent-color)] transition hover:bg-[var(--bg-elevated-2)]"
                          aria-label={playing === t.id ? `Pause ${t.title}` : `Play ${t.title}`}
                          aria-pressed={playing === t.id}
                          onClick={() => {
                            const src = t.stream_url || '';
                            if (!src) return;
                            const queue = (al.tracks || [])
                              .filter((x) => x.stream_url)
                              .map((x) => ({
                                id: x.id,
                                src: x.stream_url || '',
                                title: x.title,
                                artistName: detail?.artist?.name,
                                href: `/music/${id}`,
                              }));
                            nowPlaying.toggle(
                              {
                                id: t.id,
                                src,
                                title: t.title,
                                artistName: detail?.artist?.name,
                                href: `/music/${id}`,
                              },
                              queue,
                            );
                          }}
                        >
                          {playing === t.id ? (
                            <Pause className="h-4 w-4 fill-current" aria-hidden="true" />
                          ) : (
                            <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                          )}
                        </button>
                      ) : (
                        <span className="text-xs text-[var(--text-tertiary)]">Unavailable</span>
                      )}
                    </div>
                  </li>
                ))}
                {(al.tracks || []).length === 0 && (
                  <li className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                    No tracks in this album yet.
                  </li>
                )}
              </ul>
              <ImportFileField
                onImport={async (path) => {
                  await api.importLibraryFile({ kind: 'album', id: al.id, path });
                  setDetail(await api.getMusicArtist(id));
                }}
              />
              {playing &&
                al.tracks?.some((t) => t.id === playing) &&
                (() => {
                  const track = al.tracks!.find((t) => t.id === playing)!;
                  return (
                    <div className="space-y-2">
                      <div
                        className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-sm"
                        aria-labelledby={`lyrics-${track.id}`}
                      >
                        <div
                          id={`lyrics-${track.id}`}
                          className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]"
                        >
                          Lyrics
                        </div>
                        {lyrics?.found && lyrics.text ? (
                          <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-sans text-[var(--text-primary)]">
                            {lyrics.text}
                          </pre>
                        ) : (
                          <p className="text-[var(--text-secondary)]">
                            Lyrics aren&apos;t available for this track yet.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}
            </section>
          ))}
        </section>
      )}
    </div>
  );
}
