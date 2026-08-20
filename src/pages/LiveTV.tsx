import { FormEvent, useEffect, useState } from 'react'
import { api } from '../api/client'

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
        <h1 className="text-2xl font-bold">Live TV</h1>
        <p className="text-sm text-[var(--muted)]">
          Guide, recordings, and timers from durable Live TV JSON (admin + BFF share the same file). Physical tuners /
          EPG grabbers waived under playback decision B.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['guide', 'recordings', 'timers'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm capitalize ${
              tab === t ? 'bg-[var(--accent)] font-semibold text-black' : 'border border-[var(--border)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-[var(--muted)]">Loading…</p>}
      {error && <p className="text-sm text-red-300">{error}</p>}

      {tab === 'guide' && (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--surface)] max-h-[70vh] overflow-auto">
            {channels.map((ch) => (
              <li key={ch.id}>
                <button
                  type="button"
                  onClick={() => setActive(ch)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg)] ${
                    active?.id === ch.id ? 'bg-[var(--bg)]' : ''
                  }`}
                >
                  <div className="font-medium">
                    <span className="text-[var(--muted)] mr-2">{ch.number}</span>
                    {ch.name}
                  </div>
                  {ch.now_playing && (
                    <div className="truncate text-xs text-[var(--muted)]">{ch.now_playing.title}</div>
                  )}
                </button>
              </li>
            ))}
            {!loading && channels.length === 0 && (
              <li className="px-3 py-6 text-sm text-[var(--muted)]">No channels configured.</li>
            )}
          </ul>

          <div className="space-y-3">
            {active ? (
              <>
                <div className="rounded-lg border border-[var(--border)] bg-black aspect-video flex items-center justify-center overflow-hidden">
                  {active.url ? (
                    <video className="h-full w-full" controls autoPlay src={active.url} />
                  ) : (
                    <div className="px-6 text-center text-sm text-[var(--muted)]">
                      <p className="text-lg font-semibold text-[var(--text)] mb-2">{active.name}</p>
                      <p>No stream URL set for this channel. Add one in admin Live TV JSON.</p>
                    </div>
                  )}
                </div>
                {active.now_playing && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
                    <div className="font-medium">{active.now_playing.title}</div>
                    <div className="text-xs text-[var(--muted)] mt-1">
                      {active.now_playing.start} → {active.now_playing.end}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-10 text-sm text-[var(--muted)]">
                Select a channel.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'recordings' && (
        <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          {recordings.length === 0 && (
            <li className="px-4 py-6 text-sm text-[var(--muted)]">
              No recordings yet. Add completed entries in admin Live TV JSON (or a recorder module writing the same file).
            </li>
          )}
          {recordings.map((r) => (
            <li key={r.id} className="px-4 py-3 text-sm">
              <div className="font-medium">{r.title}</div>
              <div className="text-xs text-[var(--muted)]">
                {r.status} · {r.start} → {r.end}
                {r.path ? ` · ${r.path}` : ''}
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === 'timers' && (
        <div className="space-y-4">
          <form
            onSubmit={onSchedule}
            className="flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <label className="space-y-1 text-sm">
              <span className="text-[var(--muted)]">Channel</span>
              <select name="channel_id" required className="block rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5">
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.number} · {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[var(--muted)]">Title</span>
              <input name="title" required className="block rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="series" value="1" />
              Series timer
            </label>
            <button type="submit" className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-black">
              Schedule
            </button>
          </form>
          {timerMsg && <p className="text-sm text-[var(--muted)]">{timerMsg}</p>}
          <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            {timers.length === 0 && (
              <li className="px-4 py-6 text-sm text-[var(--muted)]">No timers scheduled.</li>
            )}
            {timers.map((t) => (
              <li key={t.id} className="px-4 py-3 text-sm">
                <div className="font-medium">
                  {t.title} {t.series ? <span className="text-xs text-[var(--muted)]">(series)</span> : null}
                </div>
                <div className="text-xs text-[var(--muted)]">
                  {t.channel_id} · {t.start} → {t.end}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
