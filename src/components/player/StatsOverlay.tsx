import type { StatsSnapshot } from '../../lib/player/types'

type Props = {
  stats: StatsSnapshot | null
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[var(--player-fg-subtle)]">{label}</span>
      <span className="text-right tabular-nums text-[var(--player-fg)]">{value}</span>
    </div>
  )
}

/** "Stats for nerds" overlay: codec/resolution, bitrate, dropped frames, buffer
 * health — the same diagnostic surface Jellyfin/YouTube expose. */
export default function StatsOverlay({ stats }: Props) {
  if (!stats) return null
  const dropPct = stats.totalFrames > 0 ? (stats.droppedFrames / stats.totalFrames) * 100 : 0

  return (
    <div
      className="pointer-events-none absolute left-3 top-16 z-20 w-64 space-y-1 rounded-lg border border-[var(--player-chip-border)] bg-black/80 p-3 font-mono text-[11px] text-white backdrop-blur"
      data-testid="player-stats-overlay"
    >
      <Row label="Resolution" value={stats.resolutionWidth ? `${stats.resolutionWidth}×${stats.resolutionHeight}` : '—'} />
      <Row label="Mode" value={stats.mode === 'transcode' ? 'Transcoding' : 'Direct play'} />
      <Row
        label="Bitrate"
        value={
          stats.estimatedBitrateMbps != null
            ? `${stats.estimatedBitrateMbps.toFixed(1)} Mbps`
            : stats.targetBitrateMbps != null
              ? `~${stats.targetBitrateMbps} Mbps (target)`
              : '—'
        }
      />
      <Row label="Dropped frames" value={`${stats.droppedFrames} / ${stats.totalFrames} (${dropPct.toFixed(1)}%)`} />
      <Row label="Buffer health" value={`${stats.bufferedAheadSec.toFixed(1)}s`} />
      <Row label="Playback rate" value={`${stats.playbackRate}×`} />
      {stats.streamUrl ? (
        <div className="truncate pt-1 text-[10px] text-[var(--player-fg-subtle)]" title={stats.streamUrl}>
          {stats.streamUrl}
        </div>
      ) : null}
    </div>
  )
}
