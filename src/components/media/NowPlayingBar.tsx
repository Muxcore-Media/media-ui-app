import { Link } from 'react-router-dom';
import { SkipBack, SkipForward, X } from 'lucide-react';
import { useNowPlayingOptional } from '../../lib/nowPlaying';
import AudioPlayerBar from './AudioPlayerBar';

/** Sticky household mini-player so music keeps playing across routes. */
export default function NowPlayingBar() {
  const np = useNowPlayingOptional();
  if (!np?.track) return null;
  const { track, queue, playing, play, pause, next, prev, stop } = np;
  const idx = queue.findIndex((t) => t.id === track.id);
  const hasPrev = idx > 0;
  const hasNext = idx >= 0 && idx < queue.length - 1;

  const label = track.artistName ? `${track.title} · ${track.artistName}` : track.title;

  return (
    <div
      className="sticky bottom-16 z-30 border-t border-[var(--border-subtle)] bg-[var(--bg-base)]/95 px-4 py-3 backdrop-blur-md lg:bottom-0"
      data-testid="now-playing-bar"
      role="region"
      aria-label="Now playing"
    >
      <div className="mx-auto flex max-w-[1920px] items-start gap-3">
        <div className="mt-6 flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated-2)] disabled:opacity-40"
            aria-label="Previous track"
            disabled={!hasPrev}
            onClick={prev}
          >
            <SkipBack className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated-2)] disabled:opacity-40"
            aria-label="Next track"
            disabled={!hasNext}
            onClick={next}
          >
            <SkipForward className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="min-w-0 flex-1">
          {track.href ? (
            <Link
              to={track.href}
              className="mb-2 inline-block truncate text-xs text-[var(--text-tertiary)] underline-offset-2 hover:underline"
            >
              {track.artistName || 'Now playing'}
            </Link>
          ) : null}
          <AudioPlayerBar
            src={track.src}
            title={label}
            playing={playing}
            onPlayingChange={(on) => (on ? play(track) : pause())}
            onEnded={() => {
              if (hasNext) next();
            }}
          />
        </div>
        <button
          type="button"
          className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated-2)]"
          aria-label="Stop playback"
          onClick={stop}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
