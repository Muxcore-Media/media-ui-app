import { formatTime } from '../../lib/player/format';

type Props = {
  positionSec: number;
  onResume: () => void;
  onStartOver: () => void;
};

/** Resume-vs-start-over prompt shown when a title has saved progress, matching
 * Jellyfin/Plex/Emby's "Continue Watching" confirmation on load. */
export default function ResumeDialog({ positionSec, onResume, onStartOver }: Props) {
  return (
    <div
      className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-[var(--player-scrim)]"
      data-testid="player-resume-dialog"
    >
      <div className="w-full max-w-sm rounded-xl border border-[var(--player-chip-border)] bg-[var(--player-panel-bg)] p-5 text-center shadow-2xl backdrop-blur-md">
        <p className="text-sm text-[var(--player-fg)]">
          Resume from <span className="font-semibold tabular-nums">{formatTime(positionSec)}</span>?
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-full border border-[var(--player-chip-border)] px-4 py-2.5 text-sm font-medium text-[var(--player-fg)] transition hover:bg-[var(--player-chip-hover)]"
            onClick={onStartOver}
          >
            Start over
          </button>
          <button
            type="button"
            className="flex-1 rounded-full bg-[var(--accent-color)] px-4 py-2.5 text-sm font-medium text-[var(--text-on-accent)] transition hover:opacity-90"
            onClick={onResume}
            autoFocus
          >
            Resume
          </button>
        </div>
      </div>
    </div>
  );
}
