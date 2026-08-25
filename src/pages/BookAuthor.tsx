import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { api } from '../api/client';
import Spinner from '../components/Spinner';
import { Badge } from '../components/ui/Badge';

type BookFile = { id: string; title: string; path: string; stream_url?: string };
type Book = {
  id: string;
  title: string;
  year?: number;
  isbn?: string;
  files?: BookFile[];
};
type AuthorDetail = {
  author: { id: string; name: string; path?: string };
  books: Book[];
};

export default function BookAuthor() {
  const { id = '' } = useParams();
  const [detail, setDetail] = useState<AuthorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const d = await api.getBookAuthor(id);
        if (!cancelled) setDetail(d);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load author');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="space-y-3">
        <p className="text-[var(--text-secondary)]">{error || 'Author not found'}</p>
        <Link to="/books" className="text-[var(--accent-color)]">
          Back to books
        </Link>
      </div>
    );
  }

  const { author, books } = detail;

  return (
    <div className="space-y-8" data-testid="book-author-page">
      <div>
        <Link
          to="/books"
          className="flex items-center gap-1 text-sm font-medium text-[var(--accent-color)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Books
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          {author.name}
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          {books.length} book{books.length === 1 ? '' : 's'}
        </p>
      </div>

      {books.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No books for this author yet.</p>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          {books.map((b) => (
            <li key={b.id} className="space-y-2 px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span className="font-medium text-[var(--text-primary)]">{b.title}</span>
                  {b.year ? (
                    <span className="text-sm text-[var(--text-tertiary)]"> · {b.year}</span>
                  ) : null}
                  {b.isbn ? (
                    <span className="text-xs text-[var(--text-tertiary)]"> · ISBN {b.isbn}</span>
                  ) : null}
                </div>
              </div>
              {(b.files || []).length === 0 ? (
                <p className="text-xs text-[var(--text-tertiary)]">Not available yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(b.files || []).map((f) =>
                    f.stream_url ? (
                      <a
                        key={f.id}
                        href={f.stream_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-3 py-1 text-xs font-semibold text-[var(--accent-color)] transition hover:border-[var(--accent-color)]"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        Open {f.title || 'file'}
                      </a>
                    ) : (
                      <Badge key={f.id} tone="neutral">
                        Not available yet
                      </Badge>
                    ),
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
