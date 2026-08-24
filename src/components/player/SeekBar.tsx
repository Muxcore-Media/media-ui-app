import { useRef, useState } from 'react'
import { formatTime } from '../../lib/player/format'
import type { PlaybackChapter, PlaybackSegment } from '../../api/client'
import type { TrickplayFrame } from './hooks/useTrickplay'

type Props = {
  currentSec: number
  durationSec: number
  bufferedAheadSec: number
  segments: PlaybackSegment[]
  chapters?: PlaybackChapter[]
  onSeek: (absoluteSeconds: number) => void
  trickplayFrameAt?: (seconds: number) => TrickplayFrame | null
  trickplayEnabled: boolean
}

const SEGMENT_COLOR: Record<string, string> = {
  intro: 'bg-sky-400/70',
  outro: 'bg-amber-400/70',
  credits: 'bg-amber-400/70',
  recap: 'bg-violet-400/70',
}

export default function SeekBar({
  currentSec,
  durationSec,
  bufferedAheadSec,
  segments,
  chapters = [],
  onSeek,
  trickplayFrameAt,
  trickplayEnabled,
}: Props) {
  const barRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ x: number; sec: number } | null>(null)

  const duration = durationSec || 0
  const bufferedEndSec = Math.min(duration, currentSec + bufferedAheadSec)
  const pct = (v: number) => (duration > 0 ? Math.min(100, Math.max(0, (v / duration) * 100)) : 0)

  function timeFromClientX(clientX: number): number {
    const rect = barRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return 0
    const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    return fraction * duration
  }

  function handleHover(clientX: number) {
    const rect = barRef.current?.getBoundingClientRect()
    if (!rect) return
    const sec = timeFromClientX(clientX)
    setHover({ x: Math.min(rect.width - 1, Math.max(0, clientX - rect.left)), sec })
  }

  const frame = hover && trickplayEnabled ? trickplayFrameAt?.(hover.sec) ?? null : null

  return (
    <div className="relative w-full select-none pb-1">
      {hover ? (
        <div
          className="pointer-events-none absolute bottom-6 z-20 flex -translate-x-1/2 flex-col items-center gap-1"
          style={{ left: hover.x }}
          data-testid="seek-hover-preview"
        >
          {frame ? (
            <div
              className="h-[72px] w-[128px] overflow-hidden rounded-md border border-[var(--player-chip-border)] bg-black shadow-xl"
              style={{
                backgroundImage: `url(${frame.url})`,
                backgroundSize: `${frame.cols * 100}% ${frame.sh * 100}%`,
                backgroundPositionX: `${(frame.sx / (frame.cols - 1 || 1)) * 100}%`,
                backgroundPositionY: `${(frame.sy / (frame.sh - 1 || 1)) * 100}%`,
              }}
            />
          ) : null}
          <span className="rounded bg-black/85 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
            {formatTime(hover.sec)}
            {(() => {
              const ch = chapters.find(
                (c) => hover.sec >= c.start_seconds && hover.sec < c.end_seconds,
              )
              return ch ? ` · ${ch.title}` : ''
            })()}
          </span>
        </div>
      ) : null}

      <div
        ref={barRef}
        className="relative h-3 w-full cursor-pointer"
        onMouseMove={(e) => handleHover(e.clientX)}
        onMouseLeave={() => setHover(null)}
        onTouchMove={(e) => e.touches[0] && handleHover(e.touches[0].clientX)}
        onTouchEnd={() => setHover(null)}
      >
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-visible rounded-full bg-[var(--player-fg)]/20">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[var(--player-fg)]/35"
            style={{ width: `${pct(bufferedEndSec)}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent-color)]"
            style={{ width: `${pct(currentSec)}%` }}
          />
          {segments.map((seg, i) => (
            <div
              key={`seg-${i}`}
              className={`absolute inset-y-0 ${SEGMENT_COLOR[seg.kind] || 'bg-white/50'}`}
              style={{
                left: `${pct(seg.start_seconds)}%`,
                width: `${Math.max(0.4, pct(seg.end_seconds) - pct(seg.start_seconds))}%`,
              }}
              title={seg.kind}
            />
          ))}
          {chapters.map((ch, i) => (
            <div
              key={`ch-${ch.index}-${i}`}
              className={`absolute inset-y-0 w-px ${ch.source === 'interval' ? 'bg-white/35' : 'bg-white/60'}`}
              style={{ left: `${pct(ch.start_seconds)}%` }}
              title={ch.title}
            />
          ))}
          <div
            className="absolute top-1/2 h-3 w-3 -translate-y-1/2 -translate-x-1/2 rounded-full bg-[var(--accent-color)] shadow"
            style={{ left: `${pct(currentSec)}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(currentSec, duration || 0)}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="Seek"
          data-testid="player-seek"
        />
      </div>
    </div>
  )
}
