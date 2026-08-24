import { X } from 'lucide-react'
import type { Episode, TVShow } from '../../types'
import { buildEpisodePlayerHref } from '../../lib/playHref'

type Props = {
  show: TVShow
  currentEpisodeId?: string
  onClose: () => void
  onPick: (href: string) => void
}

export default function PlayerEpisodeDrawer({ show, currentEpisodeId, onClose, onPick }: Props) {
  return (
    <div className="absolute inset-0 z-30 flex justify-end" data-testid="player-episode-drawer">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--player-scrim)]"
        aria-label="Close episode list"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-[var(--border-on-media)] bg-[var(--bg-overlay)] shadow-2xl backdrop-blur-md">
        <div className="flex items-start gap-3 border-b border-[var(--border-on-media)] p-4">
          {show.poster_url ? (
            <img src={show.poster_url} alt="" className="h-16 w-11 rounded object-cover" loading="lazy" />
          ) : (
            <div className="h-16 w-11 rounded bg-[var(--surface-glass)]" />
          )}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-[var(--player-fg)]">{show.title}</h2>
            <p className="mt-1 line-clamp-2 text-xs text-[var(--player-fg-muted)]">{show.overview || 'Episodes'}</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--player-fg-muted)] transition hover:bg-[var(--player-chip-hover)]"
            onClick={onClose}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {(show.seasons || []).map((season) => (
            <section key={season.id || season.season_number} className="mb-5">
              <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--player-fg-subtle)]">
                Season {season.season_number}
                {season.name ? ` · ${season.name}` : ''}
              </h3>
              <ul className="space-y-1">
                {(season.episodes || []).map((ep) => (
                  <EpisodeRow
                    key={ep.id}
                    show={show}
                    ep={ep}
                    active={ep.id === currentEpisodeId}
                    onPick={onPick}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </aside>
    </div>
  )
}

function EpisodeRow({
  show,
  ep,
  active,
  onPick,
}: {
  show: TVShow
  ep: Episode
  active: boolean
  onPick: (href: string) => void
}) {
  const href = buildEpisodePlayerHref(show, ep)
  const playable = Boolean(href)
  const code = `S${String(ep.season_number).padStart(2, '0')}E${String(ep.episode_number).padStart(2, '0')}`

  return (
    <li>
      <button
        type="button"
        disabled={!playable}
        onClick={() => href && onPick(href)}
        className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition ${
          active ? 'bg-[var(--accent-color)]/20 ring-1 ring-[var(--accent-color)]/50' : 'hover:bg-[var(--player-chip-hover)]'
        } ${!playable ? 'cursor-not-allowed opacity-45' : ''}`}
      >
        <span className="w-12 shrink-0 text-xs font-medium tabular-nums text-[var(--player-fg-muted)]">{code}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-[var(--player-fg)]">{ep.title || `Episode ${ep.episode_number}`}</span>
          {!playable ? <span className="text-[11px] text-[var(--player-fg-subtle)]">Not available yet</span> : null}
        </span>
      </button>
    </li>
  )
}
