import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import Spinner from '../components/Spinner'

type BookFile = { id: string; title: string; path: string; stream_url?: string }
type Book = {
  id: string
  title: string
  year?: number
  isbn?: string
  files?: BookFile[]
}
type AuthorDetail = {
  author: { id: string; name: string; path?: string }
  books: Book[]
}

export default function BookAuthor() {
  const { id = '' } = useParams()
  const [detail, setDetail] = useState<AuthorDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const d = await api.getBookAuthor(id)
        if (!cancelled) setDetail(d)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load author')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }
  if (!detail) {
    return (
      <div className="space-y-3">
        <p className="text-[var(--muted)]">{error || 'Author not found'}</p>
        <Link to="/books" className="text-[var(--accent)]">
          Back to books
        </Link>
      </div>
    )
  }

  const { author, books } = detail

  return (
    <div className="space-y-8" data-testid="book-author-page">
      <div>
        <Link to="/books" className="text-sm text-[var(--accent)]">
          ← Books
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{author.name}</h1>
        <p className="text-sm text-[var(--muted)]">
          {books.length} book{books.length === 1 ? '' : 's'}
          {author.path ? ` · ${author.path}` : ''}
        </p>
      </div>

      {books.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No books for this author yet.</p>
      ) : (
        <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          {books.map((b) => (
            <li key={b.id} className="space-y-2 px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span className="font-medium">{b.title}</span>
                  {b.year ? <span className="text-sm text-[var(--muted)]"> · {b.year}</span> : null}
                  {b.isbn ? <span className="text-xs text-[var(--muted)]"> · ISBN {b.isbn}</span> : null}
                </div>
              </div>
              {(b.files || []).length === 0 ? (
                <p className="text-xs text-[var(--muted)]">No ebook files scanned.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(b.files || []).map((f) =>
                    f.stream_url ? (
                      <a
                        key={f.id}
                        href={f.stream_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--accent)]"
                      >
                        Open {f.title || 'file'}
                      </a>
                    ) : (
                      <span key={f.id} className="text-xs text-[var(--muted)]">
                        {f.path}
                      </span>
                    ),
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
