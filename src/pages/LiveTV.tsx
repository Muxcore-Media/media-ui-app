import { type FormEvent, useEffect, useId, useState } from 'react'
import { CalendarClock, Clapperboard, Radio } from 'lucide-react'
import { api } from '../api/client'
import { Badge } from '../components/ui/Badge'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingStatus } from '../components/ui/LoadingStatus'
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

const TAB_LABEL: Record<Tab, string> = {
  guide: 'Guide',
  recordings: 'Recordings',
  timers: 'Timers',
}

const TAB_ICON: Record<Tab, typeof Radio> = {
  guide: Radio,
  recordings: Clapperboard,
  timers: CalendarClock,
}

export default function LiveTV() {
  const tabsId = useId()
  const [tab, setTab] = useState<Tab>('guide')
  const [channels, setChannels] = useState<Channel[]>([])
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [timers, setTimers] = useState<Timer[]>([])
  const [active, setActive] = useState<Channel | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [timerMsg, setTimerMsg] = useState<string | null>(null)
  const [timerOk, setTimerOk] = useState(false)

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
      setTimerOk(true)
      setTimerMsg('Timer scheduled.')
      await refresh()
      ;(e.target as HTMLFormElement).reset()
    } catch (err) {
      setTimerOk(false)
      setTimerMsg(err instanceof Error ? err.message : 'Failed to schedule')
    }
  }

  const guidePanelId = `${tabsId}-guide`
  const recordingsPanelId = `${tabsId}-recordings`
  const timersPanelId = `${tabsId}-timers`
  const panelId = tab === 'guide' ? guidePanelId : tab === 'recordings' ? recordingsPanelId : timersPanelId

  return (
    <div className="space-y-4" data-testid="livetv-page">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Live TV</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Watch live channels, browse your recordings, and schedule timers.
        </p>
      </header>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Live TV sections">
        {(['guide', 'recordings', 'timers'] as Tab[]).map((t) => {
          const Icon = TAB_ICON[t]
          const tabId = `${tabsId}-${t}`
          const selected = tab === t
          return (
            <button
              key={t}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={t === 'guide' ? guidePanelId : t === 'recordings' ? recordingsPanelId : timersPanelId}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium transition ${
                selected
                  ? 'bg-[var(--accent-color)] text-black'
                  : 'border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {TAB_LABEL[t]}
            </button>
          )
        })}
      </div>

      {loading && (
        <div data-testid="livetv-loading" aria-busy="true">
          <LoadingStatus label="Loading Live TV" />
          <ShelfSkeleton count={4} />
        </div>
      )}
      {error ? <ErrorBanner message={error} /> : null}

      {!loading && !error && (
        <div
          id={panelId}
          role="tabpanel"
          aria-labelledby={`${tabsId}-${tab}`}
        >
          {tab === 'guide' && channels.length === 0 && (
            <EmptyState
              icon={Radio}
              title="No channels"
              message="Live TV channels will appear here once your provider or tuner is configured."
              testId="livetv-guide-empty"
            />
          )}

          {tab === 'guide' && channels.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
              <ul
                className="max-h-[70vh] divide-y divide-[var(--border-subtle)] overflow-auto rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                aria-label="Channels"
              >
                {channels.map((ch) => (
                  <li key={ch.id}>
                    <button
                      type="button"
                      onClick={() => setActive(ch)}
                      aria-pressed={active?.id === ch.id}
                      aria-label={`${ch.number} ${ch.name}${ch.now_playing ? `, now playing ${ch.now_playing.title}` : ''}`}
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
                        <video
                          className="h-full w-full"
                          controls
                          autoPlay
                          src={active.url}
                          aria-label={`Live stream for ${active.name}`}
                        />
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

          {tab === 'recordings' && recordings.length === 0 && (
            <EmptyState
              icon={Clapperboard}
              title="No recordings yet"
              message="Scheduled recordings will show up here once you start capturing live TV."
              testId="livetv-recordings-empty"
            />
          )}

          {tab === 'recordings' && recordings.length > 0 && (
            <ul
              className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
              aria-label="Recordings"
            >
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

          {tab === 'timers' && (
            <div className="space-y-4">
              <form
                onSubmit={onSchedule}
                className="flex flex-wrap items-end gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4"
                aria-labelledby={`${tabsId}-timers`}
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
              {timerMsg && (
                <p
                  role={timerOk ? 'status' : 'alert'}
                  className={`text-sm ${timerOk ? 'text-[var(--success)]' : 'text-[var(--danger-color)]'}`}
                >
                  {timerMsg}
                </p>
              )}
              {timers.length === 0 ? (
                <EmptyState
                  icon={CalendarClock}
                  title="No timers scheduled"
                  message="Use the form above to schedule a one-off or series recording."
                  testId="livetv-timers-empty"
                />
              ) : (
                <ul
                  className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
                  aria-label="Scheduled timers"
                >
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
      )}
    </div>
  )
}
