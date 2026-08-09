import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import Spinner from '../components/Spinner'
import type { MediaRequest } from '../types'

export default function Home() {
  const [requests, setRequests] = useState<MediaRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await api.listRequests()
        if (!cancelled) setRequests(list.slice(0, 12))
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load requests')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Your library</h1>
        <p className="max-w-2xl text-[var(--muted)]">
          Browse movies and TV, search through request-media (fixture or live TMDB), and play titles that are ready.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/movies"
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black"
          >
            Browse movies
          </Link>
          <Link
            to="/tv"
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold"
          >
            Browse TV
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Recent requests</h2>
        {loading && (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        )}
        {error && (
          <p className="rounded-md border border-[var(--danger)]/40 bg-[var(--surface)] px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
        {!loading && !error && requests.length === 0 && (
          <p className="text-sm text-[var(--muted)]">No requests yet. Search from Movies to add one.</p>
        )}
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {requests.map((req) => (
            <li
              key={req.id}
              className="flex gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"
            >
              <div className="h-20 w-14 shrink-0 overflow-hidden rounded bg-[var(--surface-2)]">
                {req.poster ? (
                  <img
                    src={
                      req.poster.startsWith('http') || req.poster.startsWith('/')
                        ? req.poster.startsWith('/') && !req.poster.startsWith('/images')
                          ? `https://image.tmdb.org/t/p/w185${req.poster}`
                          : req.poster
                        : req.poster
                    }
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{req.title}</p>
                <p className="text-xs text-[var(--muted)]">
                  {req.year || '—'} · {req.status}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
