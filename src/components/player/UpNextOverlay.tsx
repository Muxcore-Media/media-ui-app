import { Play, X } from 'lucide-react'

type Props = {
  title: string
  secondsLeft: number | null
  onPlayNow: () => void
  onCancel: () => void
}

const RADIUS = 16
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const TOTAL_SECONDS = 15

/** "Up Next" overlay with a countdown ring + cancel, matching the
 * Netflix/Jellyfin/Plex auto-advance convention. */
export default function UpNextOverlay({ title, secondsLeft, onPlayNow, onCancel }: Props) {
  const fraction = secondsLeft == null ? 0 : Math.max(0, Math.min(1, secondsLeft / TOTAL_SECONDS))
  const dashoffset = CIRCUMFERENCE * (1 - fraction)

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-28 flex justify-center px-4" data-testid="player-up-next">
      <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border border-[var(--player-chip-border)] bg-[var(--player-panel-bg)] px-4 py-3 shadow-2xl backdrop-blur">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide text-[var(--player-fg-subtle)]">Up next</p>
          <p className="truncate text-sm text-[var(--player-fg)]">{title}</p>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--player-fg-muted)] transition hover:bg-[var(--player-chip-hover)]"
          onClick={onCancel}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent-color)] text-[var(--text-on-accent)]"
          onClick={onPlayNow}
          aria-label="Play now"
        >
          {secondsLeft != null ? (
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40" aria-hidden="true">
              <circle cx="20" cy="20" r={RADIUS} fill="none" stroke="currentColor" strokeOpacity={0.3} strokeWidth={2} />
              <circle
                cx="20"
                cy="20"
                r={RADIUS}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashoffset}
                strokeLinecap="round"
              />
            </svg>
          ) : null}
          <Play className="h-4 w-4 fill-current" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
