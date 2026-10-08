import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, Clock3, Download, FolderInput, RotateCcw, Search, Trash2, TriangleAlert } from 'lucide-react';
import { api } from '../api/client';
import { useOperatorAccess } from '../hooks/useOperatorAccess';
import {
  activityCanRetryImport,
  activityCanSearchAgain,
  activityDetailHref,
  activityStatusLabel,
  activityStatusTone,
  splitActivity,
} from '../lib/activity';
import { upgradeDetailHref, upgradeKindLabel } from '../lib/upgrades';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import { ShelfSkeleton } from '../components/ui/Skeleton';
import { importCandidateDetail, importCandidateMatch, importPathBody, type ImportCandidate } from '../lib/manual-import';
import type { ActivityRecord, WantedItem } from '../types';

function HistoryRow({
  rec,
  busy,
  canAct,
  onRetry,
  onBlock,
  onSearch,
}: {
  rec: ActivityRecord;
  busy: boolean;
  /** admin/manager: retry, search and block are role-gated on the BFF (T-M5-12). */
  canAct: boolean;
  onRetry: () => void;
  onBlock: () => void;
  onSearch?: () => void;
}) {
  const stuck = rec.stuck || rec.warning;
  const canRetry = activityCanRetryImport(rec.status);
  const canSearch = activityCanSearchAgain(rec.status) && !!rec.wanted_item_id && !!onSearch;
  const canBlock = Boolean(rec.guid && rec.wanted_item_id);
  // No empty action group: members see the status, not controls that would be refused.
  const showActions = canAct && stuck && (canRetry || canSearch || canBlock);
  return (
    <li
      className={`flex min-w-0 flex-wrap items-center gap-3 rounded-[var(--radius-md)] border bg-[var(--bg-elevated)] p-3 ${
        stuck ? 'border-[var(--danger-color)]/35' : 'border-[var(--border-subtle)]'
      }`}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate font-medium text-[var(--text-primary)]">{rec.title}</p>
        <p className="truncate text-xs text-[var(--text-tertiary)]">
          {rec.indexer || rec.download_protocol || 'Download'}
          {rec.created_at ? ` · ${rec.created_at.slice(0, 10)}` : ''}
        </p>
        <Badge tone={activityStatusTone(rec.status)}>{activityStatusLabel(rec)}</Badge>
        {rec.status_detail ? (
          <p className="text-xs leading-snug text-[var(--text-secondary)]">{rec.status_detail}</p>
        ) : null}
      </div>
      {showActions ? (
        <div className="flex shrink-0 flex-wrap gap-1">
          {canRetry ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-[var(--radius-md)] px-2 py-1 text-xs font-semibold text-[var(--accent-text)] hover:bg-[var(--bg-elevated-2)]"
              disabled={busy}
              onClick={onRetry}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry import
            </button>
          ) : null}
          {canSearch ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-[var(--radius-md)] px-2 py-1 text-xs font-semibold text-[var(--accent-text)] hover:bg-[var(--bg-elevated-2)]"
              disabled={busy}
              onClick={onSearch}
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              Search now
            </button>
          ) : null}
          {canBlock ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-[var(--radius-md)] px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated-2)] hover:text-[var(--danger-color)]"
              disabled={busy}
              onClick={onBlock}
            >
              <Ban className="h-3.5 w-3.5" aria-hidden="true" />
              Block
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function WantedRow({
  item,
  busy,
  canAct,
  onSearch,
  onRemove,
}: {
  item: WantedItem;
  busy: boolean;
  /** admin/manager: search-now and wanted/remove are role-gated on the BFF (T-M5-12). */
  canAct: boolean;
  onSearch: () => void;
  onRemove: () => void;
}) {
  const href = upgradeDetailHref(item) || activityDetailHref(item);
  return (
    <li className="flex min-w-0 items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
      <div className="min-w-0 flex-1 space-y-1">
        {href ? (
          <Link to={href} className="truncate font-medium text-[var(--text-primary)] hover:text-[var(--accent-text)]">
            {item.title}
          </Link>
        ) : (
          <p className="truncate font-medium text-[var(--text-primary)]">{item.title}</p>
        )}
        <p className="truncate text-xs text-[var(--text-tertiary)]">
          {upgradeKindLabel(item.item_type)}
          {item.year ? ` · ${item.year}` : ''}
          {item.season_number ? ` · S${item.season_number}` : ''}
          {item.episode_number ? `E${item.episode_number}` : ''}
        </p>
        <Badge tone="warning">Missing</Badge>
      </div>
      {canAct ? (
        <div className="flex shrink-0 flex-wrap gap-1">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-[var(--radius-md)] px-2 py-1 text-xs font-semibold text-[var(--accent-text)] hover:bg-[var(--bg-elevated-2)]"
            disabled={busy}
            onClick={onSearch}
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            Search now
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-[var(--radius-md)] px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated-2)] hover:text-[var(--danger-color)]"
            disabled={busy}
            aria-label={`Remove ${item.title} from wanted`}
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Remove
          </button>
        </div>
      ) : null}
    </li>
  );
}

/** Arr-style download activity: stuck grabs, missing wanted, recent history. */
export default function Activity() {
  const { canOperate } = useOperatorAccess();
  const [history, setHistory] = useState<ActivityRecord[]>([]);
  const [wanted, setWanted] = useState<WantedItem[]>([]);
  const [candidates, setCandidates] = useState<ImportCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const reload = async () => {
    const [hist, miss, imports] = await Promise.all([
      api.listActivity(),
      api.listWanted({ missing: true, monitored: true }),
      api.listImportCandidates().catch(() => ({ items: [] as ImportCandidate[], available: false })),
    ]);
    setHistory(hist.items || []);
    setWanted(miss.items || []);
    setCandidates(imports.items || []);
    setAvailable(hist.available !== false && miss.available !== false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await reload();
        if (!cancelled) setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load downloads');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => splitActivity(history), [history]);
  const empty =
    !loading && !error && history.length === 0 && wanted.length === 0 && (!canOperate || candidates.length === 0);

  const run = async (key: string, fn: () => Promise<void>, ok: string) => {
    setBusyKey(key);
    setFlash(null);
    try {
      await fn();
      await reload();
      setFlash(ok);
    } catch (err) {
      setFlash(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="min-w-0 space-y-8 overflow-x-hidden" data-testid="activity-page">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Downloads</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Active grabs, missing wanted titles, failed imports, and Manual Import from the
            download folder — the same daily queue as Sonarr/Radarr.
          </p>
        </div>
        {canOperate ? (
          <Button
            variant="secondary"
            size="sm"
            icon={<Search className="h-4 w-4" aria-hidden="true" />}
            disabled={busyKey !== null}
            onClick={() =>
              void run('all', async () => {
                await api.searchNow();
              }, 'Wanted search started.')
            }
          >
            Search all wanted
          </Button>
        ) : null}
      </header>

      {loading && (
        <div data-testid="activity-loading" aria-busy="true">
          <LoadingStatus label="Loading downloads" />
          <ShelfSkeleton count={4} />
        </div>
      )}
      {error && <ErrorBanner message={error} testId="activity-error" />}
      {flash ? (
        <p className="text-sm text-[var(--text-secondary)]" data-testid="activity-flash">
          {flash}
        </p>
      ) : null}
      {!available && !loading ? (
        <p className="text-sm text-[var(--text-secondary)]" data-testid="activity-unavailable">
          Automation is not listing downloads right now.
        </p>
      ) : null}

      {!loading && canOperate ? (
        <form
          className="grid gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 sm:grid-cols-[8rem_1fr_10rem_auto]"
          data-testid="wanted-add-form"
          onSubmit={(event) => {
            event.preventDefault();
            const fd = new FormData(event.currentTarget);
            const itemType = String(fd.get('item_type') || 'movie').trim();
            const itemId = String(fd.get('item_id') || '').trim();
            const title = String(fd.get('title') || '').trim();
            const year = Number(fd.get('year') || 0);
            if (!itemId) return;
            void run(
              'add-wanted',
              async () => {
                await api.addWanted({
                  itemType,
                  itemId,
                  title: title || itemId,
                  year: Number.isFinite(year) ? year : 0,
                });
              },
              'Added to wanted.',
            );
          }}
        >
          <label className="block text-xs text-[var(--text-secondary)]">
            Type
            <select name="item_type" defaultValue="movie" className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--text-primary)]">
              <option value="movie">Movie</option>
              <option value="tv">TV</option>
              <option value="music">Music</option>
              <option value="book">Book</option>
              <option value="comic">Comic</option>
              <option value="audiobook">Audiobook</option>
            </select>
          </label>
          <label className="block text-xs text-[var(--text-secondary)]">
            Title
            <input
              name="title"
              placeholder="Dune"
              className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--text-primary)]"
            />
          </label>
          <label className="block text-xs text-[var(--text-secondary)]">
            Library id
            <input
              name="item_id"
              required
              placeholder="m1"
              className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--text-primary)]"
            />
          </label>
          <div className="flex items-end gap-2">
            <label className="block min-w-[5rem] flex-1 text-xs text-[var(--text-secondary)]">
              Year
              <input
                name="year"
                type="number"
                min={1900}
                max={2100}
                className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--text-primary)]"
              />
            </label>
            <button
              type="submit"
              disabled={busyKey !== null}
              className="inline-flex items-center gap-1 rounded-[var(--radius-md)] bg-[var(--accent-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-on-accent)] disabled:opacity-50"
            >
              Add to wanted
            </button>
          </div>
        </form>
      ) : null}

      {empty && (
        <EmptyState
          icon={Download}
          title="Nothing downloading"
          message="Requested titles appear here while they search, grab, or fail to import."
          action={
            <Link to="/requests" className="text-sm font-medium text-[var(--accent-text)] hover:underline">
              Open in progress
            </Link>
          }
          testId="activity-empty"
        />
      )}

      {!loading && wanted.length > 0 && (
        <section className="space-y-3" data-testid="activity-wanted">
          <div className="flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-[var(--warning-color,#f5a623)]" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Wanted <span className="text-[var(--text-tertiary)]">({wanted.length})</span>
            </h2>
          </div>
          <ul className="grid gap-3">
            {wanted.map((item) => (
              <WantedRow
                key={item.id}
                item={item}
                busy={busyKey !== null}
                canAct={canOperate}
                onSearch={() =>
                  void run(
                    item.id,
                    async () => {
                      await api.searchNow({ queue_id: item.id, item_type: item.item_type, item_id: item.item_id });
                    },
                    'Search started.',
                  )
                }
                onRemove={() =>
                  void run(
                    item.id,
                    async () => {
                      await api.removeWanted(item.id);
                    },
                    'Removed from wanted.',
                  )
                }
              />
            ))}
          </ul>
        </section>
      )}

      {!loading && canOperate && candidates.length > 0 && (
        <section className="space-y-3" data-testid="activity-import">
          <div className="flex items-center gap-2">
            <FolderInput className="h-5 w-5 text-[var(--accent-text)]" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Manual import <span className="text-[var(--text-tertiary)]">({candidates.length})</span>
            </h2>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Files sitting in the download folder that have not been copied into the library yet.
          </p>
          <ul className="grid gap-3">
            {candidates.map((row) => {
              const detail = importCandidateDetail(row);
              const match = importCandidateMatch(row);
              return (
                <li
                  key={row.path}
                  className="flex min-w-0 flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate font-medium text-[var(--text-primary)]">{row.seriesName || row.title}</p>
                    <p className="truncate text-xs text-[var(--text-tertiary)]">
                      {detail || row.name || row.path}
                    </p>
                    {match ? (
                      <p
                        className={`truncate text-xs ${row.matched ? 'text-[var(--success)]' : 'text-[var(--warning-color,#f5a623)]'}`}
                        data-testid="import-match"
                      >
                        {match}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-[var(--radius-md)] px-2 py-1 text-xs font-semibold text-[var(--accent-text)] hover:bg-[var(--bg-elevated-2)]"
                    disabled={busyKey !== null}
                    onClick={() =>
                      void run(
                        row.path,
                        async () => {
                          await api.importPath(importPathBody(row));
                        },
                        'Imported into the library.',
                      )
                    }
                  >
                    <FolderInput className="h-3.5 w-3.5" aria-hidden="true" />
                    Import
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!loading && grouped.attention.length > 0 && (
        <section className="space-y-3" data-testid="activity-attention">
          <div className="flex items-center gap-2">
            <TriangleAlert className="h-5 w-5 text-[var(--danger-color)]" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Needs attention <span className="text-[var(--text-tertiary)]">({grouped.attention.length})</span>
            </h2>
          </div>
          <ul className="grid gap-3">
            {grouped.attention.map((rec) => (
              <HistoryRow
                key={rec.id}
                rec={rec}
                busy={busyKey !== null}
                canAct={canOperate}
                onRetry={() =>
                  void run(
                    rec.id,
                    async () => {
                      await api.retryImport(rec.id);
                    },
                    'Import retry started.',
                  )
                }
                onSearch={() =>
                  void run(
                    rec.id,
                    async () => {
                      await api.searchNow({ queue_id: rec.wanted_item_id });
                    },
                    'Search started.',
                  )
                }
                onBlock={() =>
                  void run(
                    rec.id,
                    async () => {
                      await api.blockRelease({
                        guid: rec.guid || '',
                        item_id: rec.wanted_item_id || '',
                        wanted_item_id: rec.wanted_item_id,
                        reason: 'household',
                      });
                    },
                    'Release blocklisted.',
                  )
                }
              />
            ))}
          </ul>
        </section>
      )}

      {!loading && grouped.active.length > 0 && (
        <section className="space-y-3" data-testid="activity-active">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-[var(--accent-text)]" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Downloading <span className="text-[var(--text-tertiary)]">({grouped.active.length})</span>
            </h2>
          </div>
          <ul className="grid gap-3">
            {grouped.active.map((rec) => (
              <HistoryRow key={rec.id} rec={rec} busy={false} canAct={canOperate} onRetry={() => undefined} onBlock={() => undefined} />
            ))}
          </ul>
        </section>
      )}

      {!loading && grouped.recent.length > 0 && (
        <section className="space-y-3" data-testid="activity-recent">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Recent <span className="text-[var(--text-tertiary)]">({grouped.recent.length})</span>
          </h2>
          <ul className="grid gap-3">
            {grouped.recent.map((rec) => (
              <HistoryRow key={rec.id} rec={rec} busy={false} canAct={canOperate} onRetry={() => undefined} onBlock={() => undefined} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
