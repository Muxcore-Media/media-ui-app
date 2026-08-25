import { SkipForward } from 'lucide-react';
import { segmentKindLabel } from '../../lib/player/format';
import type { PlaybackSegment } from '../../api/client';

type Props = {
  segment: PlaybackSegment;
  onSkip: () => void;
};

/** Backend-wired intro/outro/credits/recap skip button (media-intro-outro). */
export default function SkipSegmentButton({ segment, onSkip }: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 flex justify-end px-4 sm:px-6">
      <button
        type="button"
        onClick={onSkip}
        data-testid="player-skip-segment"
        className="pointer-events-auto flex items-center gap-2 rounded-full border border-[var(--player-chip-border)] bg-[var(--player-panel-bg)] px-4 py-2.5 text-sm font-medium text-[var(--player-fg)] shadow-2xl backdrop-blur transition hover:bg-[var(--player-chip-hover)]"
      >
        {segmentKindLabel(segment.kind)}
        <SkipForward className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
