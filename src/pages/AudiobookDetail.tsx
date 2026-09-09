import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useId, useState } from 'react';
import { ArrowLeft, Pause, Play } from 'lucide-react';
import { api } from '../api/client';
import { ArtworkCard } from '../components/media/ArtworkCard';
import InteractiveSearch from '../components/media/InteractiveSearch';
import { ImportFileField } from '../components/media/ImportFileField';
import { MonitorButton } from '../components/media/MonitorButton';
import { RemoveLibraryButton } from '../components/media/RemoveLibraryButton';
import { RootFolderSelect } from '../components/media/RootFolderSelect';
import Spinner from '../components/Spinner';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import { audiobookHref, audiobookQueue } from '../lib/audiobookPlayback';
import { useNowPlaying } from '../lib/nowPlaying';
import { formatDuration } from '../lib/player/format';
import type { AudiobookDetail } from '../types';

export default function AudiobookDetailPage() {
  const filesHeadingId = useId();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<AudiobookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const nowPlaying = useNowPlaying();
  const playingId = nowPlaying.playing ? nowPlaying.track?.id ?? null : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const d = await api.getAudiobook(id);
        if (!cancelled) {
          setDetail(d);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setDetail(null);
          setError(err instanceof Error ? err.message : 'Failed to load audiobook');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-16" data-testid="audiobook-detail-page" aria-busy="true">
        <LoadingStatus label="Loading audiobook" />
        <Spinner />
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="space-y-3" data-testid="audiobook-detail-page">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Audiobook not found
        </h1>
        <ErrorBanner message={error || 'Audiobook not found.'} />
        <Link to="/audiobooks" className="text-[var(--accent-color)] hover:underline">
          Back to audiobooks
        </Link>
      </div>
    );
  }

  const { author, audiobook } = detail;
  const href = audiobookHref(audiobook.id);
  const queue = audiobookQueue(audiobook, href, author.name);
  const first = queue[0];
  const files = audiobook.files || [];
  const meta = [author.name, audiobook.narrator ? `Narrated by ${audiobook.narrator}` : null]
    .filter(Boolean)
    .join(' · ');
  const duration = formatDuration(audiobook.duration_seconds || 0);

  return (
    <div className="space-y-8" data-testid="audiobook-detail-page">
      <div>
        <Link
          to="/audiobooks"
          className="flex items-center gap-1 text-sm font-medium text-[var(--accent-color)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Audiobooks
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            {audiobook.title}
          </h1>
          <MonitorButton
            kind="audiobook"
            id={audiobook.id}
            monitored={audiobook.monitored}
            compact
            onChange={(next) =>
              setDetail((cur) =>
                cur ? { ...cur, audiobook: { ...cur.audiobook, monitored: next } } : cur,
              )
            }
          />
          <RemoveLibraryButton
            kind="audiobook"
            id={audiobook.id}
            title={audiobook.title}
            hasFile={(audiobook.files || []).length > 0}
            onRemoved={() => navigate('/audiobooks')}
          />
          <RootFolderSelect
            kind="audiobook"
            id={audiobook.id}
            value={author.path}
            onChange={(next) =>
              setDetail((cur) => (cur ? { ...cur, author: { ...cur.author, path: next } } : cur))
            }
          />
          <ArtworkCard kind="audiobook" id={audiobook.id} />
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          {meta}
          {audiobook.year ? ` · ${audiobook.year}` : ''}
          {duration ? ` · ${duration}` : ''}
        </p>
        {first ? (
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent-color)] px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
            aria-label={
              playingId === first.id ? `Pause ${audiobook.title}` : `Play ${audiobook.title}`
            }
            onClick={() => nowPlaying.toggle(first, queue)}
          >
            {playingId === first.id ? (
              <Pause className="h-4 w-4 fill-current" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            )}
            {playingId === first.id ? 'Pause' : 'Play'}
          </button>
        ) : null}
      </div>

      {files.length === 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-[var(--text-secondary)]">
            No chapters imported for this audiobook yet.
          </p>
          <ImportFileField
            onImport={async (path) => {
              await api.importLibraryFile({ kind: 'audiobook', id: audiobook.id, path });
              setDetail(await api.getAudiobook(id));
            }}
          />
        </div>
      ) : (
        <section className="space-y-3" aria-labelledby={filesHeadingId}>
          <h2
            id={filesHeadingId}
            className="text-lg font-semibold text-[var(--text-primary)]"
          >
            Chapters ({files.length})
          </h2>
          <ul
            className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
            aria-label={`${audiobook.title} chapters`}
          >
            {files.map((f, i) => {
              const track = queue.find((t) => t.id === f.id);
              const isPlaying = Boolean(track && playingId === track.id);
              return (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-3 px-4 py-2 text-sm transition hover:bg-[var(--bg-elevated-2)]"
                >
                  <div className="min-w-0">
                    <span className="mr-2 text-[var(--text-tertiary)]">{i + 1}.</span>
                    <span className="font-medium text-[var(--text-primary)]">{f.title}</span>
                  </div>
                  {track ? (
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--accent-color)] transition hover:bg-[var(--bg-elevated-2)]"
                      aria-label={isPlaying ? `Pause ${f.title}` : `Play ${f.title}`}
                      aria-pressed={isPlaying}
                      onClick={() => nowPlaying.toggle(track, queue)}
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4 fill-current" aria-hidden="true" />
                      ) : (
                        <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                      )}
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--text-tertiary)]">Unavailable</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <InteractiveSearch
        itemType="audiobook"
        itemId={audiobook.id}
        title={audiobook.title}
        year={audiobook.year}
      />
    </div>
  );
}
