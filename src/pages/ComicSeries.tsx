import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { api } from '../api/client';
import { AddIssueField } from '../components/media/AddIssueField';
import { ImportFileField } from '../components/media/ImportFileField';
import { MonitorButton } from '../components/media/MonitorButton';
import { RemoveLibraryButton } from '../components/media/RemoveLibraryButton';
import Spinner from '../components/Spinner';
import { Badge } from '../components/ui/Badge';

export type ComicIssue = {
  id: string;
  series_id?: string;
  title: string;
  number?: string;
  year?: number;
  has_file?: boolean;
  monitored?: boolean;
  stream_url?: string;
};

export type ComicSeriesDetail = {
  series: { id: string; title: string; publisher?: string; monitored?: boolean };
  issues: ComicIssue[];
};

export default function ComicSeries() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ComicSeriesDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openIssueId, setOpenIssueId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const d = await api.getComicSeries(id);
        if (!cancelled) setDetail(d);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load series');
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
        <p className="text-[var(--text-secondary)]">{error || 'Series not found'}</p>
        <Link to="/comics" className="text-[var(--accent-color)]">
          Back to comics
        </Link>
      </div>
    );
  }

  const { series, issues } = detail;
  const openIssue = issues.find((iss) => iss.id === openIssueId && iss.stream_url);

  return (
    <div className="space-y-8" data-testid="comic-series-page">
      <div>
        <Link
          to="/comics"
          className="mb-3 inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--accent-color)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Comics
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{series.title}</h1>
          <MonitorButton
            kind="series"
            id={series.id}
            monitored={series.monitored}
            compact
            onChange={(next) =>
              setDetail((cur) => (cur ? { ...cur, series: { ...cur.series, monitored: next } } : cur))
            }
          />
          <RemoveLibraryButton
            kind="series"
            id={series.id}
            title={series.title}
            hasFile={issues.some((iss) => Boolean(iss.stream_url || iss.has_file))}
            onRemoved={() => navigate('/comics')}
          />
        </div>
        <p className="text-sm text-[var(--text-secondary)]">{series.publisher || 'Comic series'}</p>
      </div>

      {openIssue?.stream_url ? (
        <section className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-2">
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">
              {openIssue.title}
            </p>
            <button
              type="button"
              className="text-xs font-semibold text-[var(--accent-color)] hover:underline"
              onClick={() => setOpenIssueId(null)}
            >
              Close reader
            </button>
          </div>
          <iframe
            title={openIssue.title}
            src={openIssue.stream_url}
            className="h-[min(70vh,720px)] w-full bg-[var(--bg-base)]"
          />
        </section>
      ) : null}

      <AddIssueField
        onAdd={async ({ title, number, year }) => {
          await api.addComicIssue({ seriesId: series.id, title, number, year });
          setDetail(await api.getComicSeries(id));
        }}
      />

      {issues.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No issues for this series yet.</p>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]" data-testid="comic-issues">
          {issues.map((iss) => (
            <li key={iss.id} className="space-y-2 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--text-primary)]">{iss.title}</p>
                  <p className="truncate text-xs text-[var(--text-tertiary)]">
                    {[iss.number ? `#${iss.number}` : '', iss.year ? String(iss.year) : ''].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <MonitorButton
                    kind="issue"
                    id={iss.id}
                    monitored={iss.monitored}
                    compact
                    onChange={(next) =>
                      setDetail((cur) =>
                        cur
                          ? {
                              ...cur,
                              issues: cur.issues.map((row) => (row.id === iss.id ? { ...row, monitored: next } : row)),
                            }
                          : cur,
                      )
                    }
                  />
                  {iss.stream_url ? (
                    <button
                      type="button"
                      onClick={() => setOpenIssueId(iss.id)}
                      className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-3 py-1 text-xs font-semibold text-[var(--accent-color)] transition hover:border-[var(--accent-color)]"
                    >
                      Read {iss.number ? `#${iss.number}` : iss.title}
                    </button>
                  ) : (
                    <Badge tone="neutral">Missing file</Badge>
                  )}
                </div>
              </div>
              {!iss.stream_url ? (
                <ImportFileField
                  onImport={async (path) => {
                    await api.importLibraryFile({ kind: 'issue', id: iss.id, path });
                    setDetail(await api.getComicSeries(id));
                  }}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
