import { Play, RotateCcw, RotateCw } from 'lucide-react'
import Spinner from '../Spinner'

type Props = {
  loading: boolean
  buffering: boolean
  playing: boolean
  showControls: boolean
  onTogglePlay: () => void
  seekBubble: number | null
}

export default function CenterOverlay({ loading, buffering, playing, showControls, onTogglePlay, seekBubble }: Props) {
  return (
    <>
      {loading ? (
        <div className="flex h-full items-center justify-center gap-2 text-sm text-[var(--player-fg-muted)]">
          <Spinner className="h-8 w-8 text-[var(--accent-color)]" />
          Loading…
        </div>
      ) : null}

      {!loading && buffering ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[var(--player-scrim-light)]">
          <Spinner className="h-12 w-12 text-[var(--player-fg)]" />
        </div>
      ) : null}

      {!loading && !playing && !buffering ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onTogglePlay()
          }}
          aria-label="Play"
          className={`absolute inset-0 z-10 flex items-center justify-center bg-[var(--player-scrim-faint)] transition-opacity ${showControls ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--player-play-bg)] text-[var(--bg-base)] shadow-2xl">
            <Play className="h-9 w-9 fill-current" aria-hidden="true" />
          </span>
        </button>
      ) : null}

      {seekBubble != null ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" data-testid="player-seek-bubble">
          <span className="flex items-center gap-2 rounded-full bg-black/70 px-5 py-3 text-lg font-semibold text-white">
            {seekBubble < 0 ? <RotateCcw className="h-5 w-5" aria-hidden="true" /> : <RotateCw className="h-5 w-5" aria-hidden="true" />}
            {Math.abs(seekBubble)}s
          </span>
        </div>
      ) : null}
    </>
  )
}
