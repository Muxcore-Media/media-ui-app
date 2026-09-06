import { ChevronRight } from 'lucide-react';

type Props = {
  title: string;
  onPlay: () => void;
};

/**
 * Persistent "Next Episode" button shown in the final stretch of a TV episode
 * (before the Up Next countdown fires). Clicking it immediately starts the
 * next episode — same navigation path as the Up Next overlay.
 */
export default function NextEpisodeButton({ title, onPlay }: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 flex justify-end px-4 sm:px-6">
      <button
        type="button"
        onClick={onPlay}
        data-testid="player-next-episode"
        aria-label={`Play next episode: ${title}`}
        className="pointer-events-auto flex items-center gap-2 rounded-full border border-[var(--player-chip-border)] bg-[var(--player-panel-bg)] px-4 py-2.5 text-sm font-medium text-[var(--player-fg)] shadow-2xl backdrop-blur transition hover:bg-[var(--player-chip-hover)]"
      >
        Next Episode
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
