import { Link, useParams } from 'react-router-dom';
import { useEffect, useId, useState } from 'react';
import { ArrowLeft, Pause, Play } from 'lucide-react';
import { api } from '../api/client';
import AudioPlayerBar from '../components/media/AudioPlayerBar';
import Spinner from '../components/Spinner';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import type { MusicAlbum, MusicArtistDetail } from '../types';

export default function MusicArtist() {
  const albumsHeadingId = useId();
  const { id = '' } = useParams();
  const [detail, setDetail] = useState<MusicArtistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<{ found: boolean; text: string; title?: string } | null>(
    null,
  );

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
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          {artist.name}
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          {albums.length} album{albums.length === 1 ? '' : 's'}
        </p>
      </div>

      {albums.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No albums for this artist yet.</p>
      ) : (
        <section className="space-y-6" aria-labelledby={albumsHeadingId}>
          <h2 id={albumsHeadingId} className="sr-only">
            Albums
          </h2>
          {albums.map((al) => (
            <section key={al.id} className="space-y-3" aria-labelledby={`album-${al.id}`}>
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
                    {t.stream_url || t.path ? (
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--accent-color)] transition hover:bg-[var(--bg-elevated-2)]"
                        aria-label={playing === t.id ? `Pause ${t.title}` : `Play ${t.title}`}
                        aria-pressed={playing === t.id}
                        onClick={() => setPlaying(playing === t.id ? null : t.id)}
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
                  </li>
                ))}
                {(al.tracks || []).length === 0 && (
                  <li className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                    No tracks in this album yet.
                  </li>
                )}
              </ul>
              {playing &&
                al.tracks?.some((t) => t.id === playing) &&
                (() => {
                  const track = al.tracks!.find((t) => t.id === playing)!;
                  const src = track.stream_url || '';
                  return (
                    <div className="space-y-2">
                      {src ? (
                        <AudioPlayerBar
                          src={src}
                          title={track.title}
                          playing
                          onPlayingChange={(on) => setPlaying(on ? track.id : null)}
                        />
                      ) : (
                        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                          This track isn&apos;t available to play yet.
                        </div>
                      )}
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
