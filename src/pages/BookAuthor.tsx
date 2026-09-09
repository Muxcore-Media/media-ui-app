import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { api } from '../api/client';
import InteractiveSearch from '../components/media/InteractiveSearch';
import { AddAlbumField } from '../components/media/AddAlbumField';
import { ImportFileField } from '../components/media/ImportFileField';
import { MonitorButton } from '../components/media/MonitorButton';
import { RemoveLibraryButton } from '../components/media/RemoveLibraryButton';
import { ItemHistoryCard } from '../components/media/ItemHistoryCard';
import { RootFolderSelect } from '../components/media/RootFolderSelect';
import Spinner from '../components/Spinner';
import { Badge } from '../components/ui/Badge';

type BookFile = { id: string; title: string; path: string; stream_url?: string };
type Book = {
  id: string;
  title: string;
  year?: number;
  isbn?: string;
  monitored?: boolean;
  files?: BookFile[];
};
type AuthorDetail = {
  author: { id: string; name: string; path?: string; monitored?: boolean };
  books: Book[];
};

function bookViewerKind(file: BookFile): 'pdf' | 'epub' | 'other' {
  const hint = `${file.title} ${file.stream_url || ''}`.toLowerCase();
  if (hint.includes('.pdf') || hint.includes('pdf')) return 'pdf';
  if (hint.includes('.epub') || hint.includes('epub')) return 'epub';
  return 'other';
}

export default function BookAuthor() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<AuthorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openFileId, setOpenFileId] = useState<string | null>(null);

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
  const openFile = books
    .flatMap((b) => b.files || [])
    .find((f) => f.id === openFileId && f.stream_url);

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
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            {author.name}
          </h1>
          <MonitorButton
            kind="author"
            id={author.id}
            monitored={author.monitored}
            compact
            onChange={(next) =>
              setDetail((cur) => (cur ? { ...cur, author: { ...cur.author, monitored: next } } : cur))
            }
          />
          <RemoveLibraryButton
            kind="author"
            id={author.id}
            title={author.name}
            hasFile={books.some((b) => (b.files || []).some((f) => Boolean(f.path || f.stream_url)))}
            onRemoved={() => navigate('/books')}
          />
          <RootFolderSelect
            kind="author"
            id={author.id}
            value={author.path}
            onChange={(next) =>
              setDetail((cur) => (cur ? { ...cur, author: { ...cur.author, path: next } } : cur))
            }
          />
          <ItemHistoryCard kind="author" id={author.id} />
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          {books.length} book{books.length === 1 ? '' : 's'}
        </p>
      </div>

      {openFile?.stream_url ? (
        <section
          className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
          aria-label={`Reading ${openFile.title}`}
          data-testid="book-inline-reader"
        >
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-2">
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">
              {openFile.title}
            </p>
            <button
              type="button"
              className="text-xs font-semibold text-[var(--accent-color)] hover:underline"
              onClick={() => setOpenFileId(null)}
            >
              Close reader
            </button>
          </div>
          {bookViewerKind(openFile) === 'pdf' ? (
            <iframe
              title={openFile.title}
              src={openFile.stream_url}
              className="h-[min(70vh,720px)] w-full bg-[var(--bg-base)]"
            />
          ) : bookViewerKind(openFile) === 'epub' ? (
            <object
              title={openFile.title}
              data={openFile.stream_url}
              type="application/epub+zip"
              className="h-[min(70vh,720px)] w-full bg-[var(--bg-base)]"
            >
              <p className="p-4 text-sm text-[var(--text-secondary)]">
                Your browser cannot render EPUB inline.{' '}
                <a
                  href={openFile.stream_url}
                  className="font-medium text-[var(--accent-color)] hover:underline"
                >
                  Open the file
                </a>
              </p>
            </object>
          ) : (
            <iframe
              title={openFile.title}
              src={openFile.stream_url}
              className="h-[min(70vh,720px)] w-full bg-[var(--bg-base)]"
            />
          )}
        </section>
      ) : null}

      <AddAlbumField
        titleLabel="Book title"
        submitLabel="Add book"
        testId="add-book"
        titlePlaceholder="The Dispossessed"
        onAdd={async ({ title, year }) => {
          await api.addBook({ authorId: author.id, title, year });
          setDetail(await api.getBookAuthor(id));
        }}
      />

      {books.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No books for this author yet.</p>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          {books.map((b) => (
            <li key={b.id} className="space-y-2 px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="font-medium text-[var(--text-primary)]">{b.title}</span>
                  {b.year ? (
                    <span className="text-sm text-[var(--text-tertiary)]"> · {b.year}</span>
                  ) : null}
                  {b.isbn ? (
                    <span className="text-xs text-[var(--text-tertiary)]"> · ISBN {b.isbn}</span>
                  ) : null}
                  <MonitorButton
                    kind="book"
                    id={b.id}
                    monitored={b.monitored}
                    compact
                    onChange={(next) =>
                      setDetail((cur) =>
                        cur
                          ? {
                              ...cur,
                              books: cur.books.map((row) => (row.id === b.id ? { ...row, monitored: next } : row)),
                            }
                          : cur,
                      )
                    }
                  />
                </div>
              </div>
              {(b.files || []).length === 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-[var(--text-tertiary)]">Not available yet.</p>
                  <ImportFileField
                    onImport={async (path) => {
                      await api.importLibraryFile({ kind: 'book', id: b.id, path });
                      const next = await api.getBookAuthor(id);
                      setDetail(next);
                    }}
                  />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(b.files || []).map((f) =>
                    f.stream_url ? (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setOpenFileId(f.id)}
                        className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-3 py-1 text-xs font-semibold text-[var(--accent-color)] transition hover:border-[var(--accent-color)]"
                      >
                        Read {f.title || 'file'}
                      </button>
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

      <InteractiveSearch itemType="book" itemId={author.id} title={author.name} />
    </div>
  );
}
