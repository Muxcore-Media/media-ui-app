import { useEffect, useState } from 'react';
import { Flag } from 'lucide-react';
import { api } from '../api/client';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import type { MediaIssue } from '../types';

function kindLabel(kind: string): string {
  switch (kind) {
    case 'video':
      return 'Video';
    case 'audio':
      return 'Audio';
    case 'subtitles':
      return 'Subtitles';
    case 'wrong':
      return 'Wrong title';
    default:
      return 'Other';
  }
}

export default function Issues() {
  const [items, setItems] = useState<MediaIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .listIssues()
      .then((rows) => {
        if (!cancelled) {
          setItems(rows);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load issues');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-w-0 space-y-6" data-testid="issues-page">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Issues</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Problems the household reported from Discover or a title page — video, audio, subs, or the
          wrong file.
        </p>
      </header>
      {loading ? <LoadingStatus label="Loading issues" /> : null}
      {error ? <ErrorBanner message={error} /> : null}
      {!loading && !error && items.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="No issues reported"
          message="Use Report issue on a title when playback or the file is wrong."
          testId="issues-empty"
        />
      ) : null}
      <ul className="grid gap-3">
        {items.map((iss) => (
          <li
            key={iss.id}
            className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3"
          >
            <p className="font-medium text-[var(--text-primary)]">{iss.title}</p>
            <p className="text-xs text-[var(--text-tertiary)]">
              {iss.mediaType || 'title'}
              {iss.reportedBy ? ` · ${iss.reportedBy}` : ''}
              {iss.createdAt ? ` · ${iss.createdAt.slice(0, 10)}` : ''}
            </p>
            <Badge tone="warning">{kindLabel(iss.kind)}</Badge>
            {iss.message ? (
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{iss.message}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
