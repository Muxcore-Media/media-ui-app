import { type FormEvent, useEffect, useState } from 'react'
import { CalendarClock, Clapperboard, Radio } from 'lucide-react'
import { api } from '../api/client'
import { Badge } from '../components/ui/Badge'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { EmptyState } from '../components/ui/EmptyState'
import { ShelfSkeleton } from '../components/ui/Skeleton'

type Channel = {
  id: string
  name: string
  number: string
  url?: string
  category?: string
  now_playing?: { title: string; start: string; end: string }
}

type Recording = {
  id: string
  channel_id: string
  title: string
  start: string
  end: string
  status: string
  path?: string
}

type Timer = {
  id: string
  channel_id: string
  title: string
  start: string
  end: string
  series?: boolean
}

type Tab = 'guide' | 'recordings' | 'timers'

const TAB_ICON: Record<Tab, typeof Radio> = {
  guide: Radio,
  recordings: Clapperboard,
  timers: CalendarClock,
}

export default function LiveTV() {
  const [tab, setTab] = useState<Tab>('guide')
  const [channels, setChannels] = useState<Channel[]>([])
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [timers, setTimers] = useState<Timer[]>([])
  const [active, setActive] = useState<Channel | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [timerMsg, setTimerMsg] = useState<string | null>(null)

  async function refresh() {
    const data = await api.listLiveTV()
    setChannels(data.channels)
    setRecordings(data.recordings || [])
    setTimers(data.timers || [])
    setActive((cur) => cur || data.channels[0] || null)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await refresh()
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load Live TV')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function onSchedule(e: FormEvent) {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    try {
      await api.createLiveTVTimer({
        channel_id: String(fd.get('channel_id') || ''),
        title: String(fd.get('title') || ''),
        series: fd.get('series') === '1',
      })
      setTimerMsg('Timer scheduled.')
      await refresh()
      ;(e.target as HTMLFormElement).reset()
    } catch (err) {
      setTimerMsg(err instanceof Error ? err.message : 'Failed to schedule')
    }
  }

  return (
    <div className="space-y-4" data-testid="livetv-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Live TV</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Watch live channels, browse your recordings, and schedule timers.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['guide', 'recordings', 'timers'] as Tab[]).map((t) => {
          const Icon = TAB_ICON[t]
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium capitalize transition ${
                tab === t
                  ? 'bg-[var(--accent-color)] text-black'
                  : 'border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {t}
            </button>
          )
        })}
      </div>

      {loading && (
        <div data-testid="livetv-loading" aria-busy="true" aria-label="Loading Live TV">
          <ShelfSkeleton count={4} />
        </div>
      )}
      {error ? <ErrorBanner message={error} /> : null}

      {!loading && !error && tab === 'guide' && channels.length === 0 && (
        <EmptyState
          icon={Radio}
          title="No channels"
          message="Live TV channels will appear here once your provider or tuner is configured."
        />
      )}

      {!loading && !error && tab === 'guide' && channels.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <ul className="max-h-[70vh] divide-y divide-[var(--border-subtle)] overflow-auto rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            {channels.map((ch) => (
              <li key={ch.id}>
                <button
                  type="button"
                  onClick={() => setActive(ch)}
                  className={`w-full px-3 py-2 text-left text-sm transition hover:bg-[var(--bg-elevated-2)] ${
                    active?.id === ch.id ? 'bg-[var(--bg-elevated-2)]' : ''
                  }`}
                >
                  <div className="font-medium text-[var(--text-primary)]">
                    <span className="mr-2 text-[var(--text-tertiary)]">{ch.number}</span>
                    {ch.name}
                  </div>
                  {ch.now_playing && (
                    <div className="truncate text-xs text-[var(--text-tertiary)]">{ch.now_playing.title}</div>
                  )}
                </button>
              </li>
            ))}
          </ul>

          <div className="space-y-3">
            {active ? (
              <>
                <div className="flex aspect-video items-center justify-center overflow-hidden rounded-[var(--radius-md)] bg-[var(--player-bg)]">
                  {active.url ? (
                    <video className="h-full w-full" controls autoPlay src={active.url} />
                  ) : (
                    <div className="px-6 text-center text-sm text-[var(--text-secondary)]">
                      <p className="mb-2 text-lg font-semibold text-[var(--text-primary)]">{active.name}</p>
                      <p>This channel isn&apos;t available right now. Try another channel.</p>
                    </div>
                  )}
                </div>
                {active.now_playing && (
                  <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-sm">
                    <div className="font-medium text-[var(--text-primary)]">{active.now_playing.title}</div>
                    <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                      {active.now_playing.start} → {active.now_playing.end}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-10 text-sm text-[var(--text-secondary)]">
                Select a channel.
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !error && tab === 'recordings' && recordings.length === 0 && (
        <EmptyState
          icon={Clapperboard}
          title="No recordings yet"
          message="Scheduled recordings will show up here once you start capturing live TV."
        />
      )}

      {!loading && !error && tab === 'recordings' && recordings.length > 0 && (
        <ul className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          {recordings.map((r) => (
            <li key={r.id} className="px-4 py-3 text-sm">
              <div className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                {r.title}
                <Badge tone={r.status === 'completed' ? 'success' : 'neutral'}>{r.status}</Badge>
              </div>
              <div className="text-xs text-[var(--text-tertiary)]">
                {r.start} → {r.end}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && tab === 'timers' && (
        <div className="space-y-4">
          <form
            onSubmit={onSchedule}
            className="flex flex-wrap items-end gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4"
          >
            <label className="space-y-1 text-sm">
              <span className="text-[var(--text-secondary)]">Channel</span>
              <select
                name="channel_id"
                required
                className="block rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] px-2 py-1.5 text-sm"
              >
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.number} · {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[var(--text-secondary)]">Title</span>
              <input
                name="title"
                required
                className="block rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] px-2 py-1.5 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input type="checkbox" name="series" value="1" />
              Series timer
            </label>
            <button
              type="submit"
              className="rounded-[var(--radius-md)] bg-[var(--accent-color)] px-3 py-1.5 text-sm font-semibold text-black transition hover:bg-[var(--accent-hover)]"
            >
              Schedule
            </button>
          </form>
          {timerMsg && <p className="text-sm text-[var(--text-secondary)]">{timerMsg}</p>}
          {timers.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="No timers scheduled"
              message="Use the form above to schedule a one-off or series recording."
            />
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
              {timers.map((t) => (
                <li key={t.id} className="px-4 py-3 text-sm">
                  <div className="font-medium text-[var(--text-primary)]">
                    {t.title} {t.series ? <span className="text-xs text-[var(--text-tertiary)]">(series)</span> : null}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)]">
                    {channels.find((c) => c.id === t.channel_id)?.name || 'Scheduled recording'} · {t.start} → {t.end}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
