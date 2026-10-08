import { OperatorControls, OperatorNotice } from '../components/OperatorControls';
import { useEffect, useState } from 'react';
import { Ban } from 'lucide-react';
import { api } from '../api/client';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import type { BlocklistEntry } from '../lib/blocklist';

export default function Blocklist() {
  const [items, setItems] = useState<BlocklistEntry[]>([]);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState('');

  async function reload() {
    const res = await api.listBlocklist();
    setItems(res.items);
    setAvailable(res.available);
  }

  useEffect(() => {
    let cancelled = false;
    void api
      .listBlocklist()
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setAvailable(res.available);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load blocklist');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function clearOne(row: BlocklistEntry) {
    setBusy(row.guid);
    try {
      await api.clearBlocklist({ wantedItemId: row.wantedItemId, guid: row.guid });
      await reload();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear entry');
    } finally {
      setBusy('');
    }
  }

  async function clearAll() {
    if (!window.confirm('Clear the entire release blocklist? Automation can grab these releases again.')) {
      return;
    }
    setBusy('all');
    try {
      await api.clearBlocklist({ clearAll: true });
      await reload();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear blocklist');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="space-y-6" data-testid="blocklist-page">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Blocklist</h1>
          <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
            Releases automation will skip — the same list as Sonarr/Radarr Blocklist. Clear an entry
            to let Search now try it again.
          </p>
        </div>
        {items.length > 0 ? (
          <OperatorControls>
            <Button variant="danger" disabled={busy === 'all'} onClick={() => void clearAll()}>
              Clear all
            </Button>
          </OperatorControls>
        ) : null}
      </header>
      <OperatorNotice />
      {loading ? <LoadingStatus label="Loading blocklist" /> : null}
      {error ? <ErrorBanner message={error} /> : null}
      {!loading && !available ? (
        <p className="text-sm text-[var(--text-secondary)]">
          Automation is not listing the blocklist right now.
        </p>
      ) : null}
      {!loading && available && items.length === 0 ? (
        <EmptyState
          icon={Ban}
          title="Nothing blocklisted"
          message="Interactive Search and failed grabs add releases here so they are not grabbed again."
          testId="blocklist-empty"
        />
      ) : null}
      {items.length > 0 ? (
        <ul className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
          {items.map((row) => (
            <li
              key={`${row.wantedItemId}:${row.guid}`}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--text-primary)]">{row.title}</p>
                <p className="truncate text-xs text-[var(--text-tertiary)]">
                  {row.reason || 'Blocked'}
                  {row.loop ? ` · loop ${row.loop}` : ''}
                  {row.guid ? ` · ${row.guid}` : ''}
                </p>
              </div>
              <OperatorControls>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy === row.guid}
                  onClick={() => void clearOne(row)}
                >
                  Unblock
                </Button>
              </OperatorControls>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
