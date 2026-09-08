import { useEffect, useMemo, useState, useId, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowBigUp, Clock3, Download, Search, ShieldAlert, TriangleAlert } from 'lucide-react';
import { api } from '../api/client';
import {
  detailHrefForRequest,
  groupInProgressByPhase,
  mergeInProgressEntries,
  posterUrlForRequest,
  requestDisplayDetail,
  requestDisplayLabel,
  requestStatusLabel,
  requestStatusTone,
  requestPhase,
  type InProgressEntry,
} from '../lib/acquisition';
import { featureEnabled, useCapabilities } from '../lib/capabilities';
import { canApproveRequests } from '../lib/session';
import { AcquisitionSetupBanner } from '../components/media/AcquisitionSetupBanner';
import { RequestQuotaBanner } from '../components/media/RequestQuotaBanner';
import { qualityProfileLabel } from '../lib/request-quality';
import { cutoffScoreGap, upgradeDetailHref, upgradeKindLabel } from '../lib/upgrades';
import { ShelfSkeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import type { CutoffItem } from '../types';

function entryTitle(entry: InProgressEntry): string {
  return entry.source === 'request' ? entry.request.title : entry.item.title;
}

function entryYear(entry: InProgressEntry): number | undefined {
  return entry.source === 'request' ? entry.request.year : entry.item.year;
}

function entryPoster(entry: InProgressEntry): string {
  if (entry.source === 'request') return posterUrlForRequest(entry.request.poster);
  return entry.item.poster_url || '';
}

function entryStatus(entry: InProgressEntry): string {
  if (entry.source === 'request') return entry.request.status;
  return 'added';
}

function entryHref(entry: InProgressEntry): string | null {
  if (entry.source === 'request') {
    return detailHrefForRequest(entry.request);
  }
  return entry.kind === 'tv' ? `/tv/${entry.item.id}` : `/movies/${entry.item.id}`;
}

function entryKey(entry: InProgressEntry): string {
  if (entry.source === 'request') return `req-${entry.request.id}`;
  return `lib-${entry.kind}-${entry.item.id}`;
}

function kindLabelForEntry(entry: InProgressEntry): string {
  if (entry.source === 'request') {
    switch (entry.request.itemType) {
      case 'tv':
        return 'TV Show';
      case 'music':
        return 'Music';
      default:
        return 'Movie';
    }
  }
  return entry.kind === 'tv' ? 'TV Show' : 'Movie';
}

function attentionHint(status: string): string | null {
  switch (status.trim().toLowerCase()) {
    case 'import_failed':
      return 'Download finished but could not be added to your library yet.';
    case 'failed':
      return 'The grab did not complete successfully.';
    case 'stalled':
      return 'Download is stuck and may need attention.';
    case 'denied':
      return 'This request was not approved.';
    case 'pending':
      return 'Waiting for a household admin to approve this request.';
    default:
      return null;
  }
}

function InProgressCard({
  entry,
  canApprove,
  busy,
  onApprove,
  onDeny,
}: {
  entry: InProgressEntry;
  canApprove: boolean;
  busy: boolean;
  onApprove: (requestId: string) => void;
  onDeny: (requestId: string) => void;
}) {
  const href = entryHref(entry);
  const status = entryStatus(entry);
  const poster = entryPoster(entry);
  const kindLabel = kindLabelForEntry(entry);
  const apiDetail = entry.source === 'request' ? requestDisplayDetail(entry.request) : null;
  const hint = entry.source === 'request' ? (apiDetail ?? attentionHint(status)) : null;
  const badgeLabel =
    entry.source === 'request' ? requestDisplayLabel(entry.request) : requestStatusLabel(status);
  const pending =
    entry.source === 'request' && requestPhase(entry.request.status) === 'pending';
  const showActions = pending && canApprove;
  const cardBorder =
    entry.source === 'request' && requestPhase(status) === 'attention'
      ? 'border-[var(--danger-color)]/35'
      : 'border-[var(--border-subtle)]';

  const body = (
    <>
      <div className="h-24 w-16 shrink-0 overflow-hidden rounded bg-[var(--bg-elevated-2)]">
        {poster ? <img src={poster} alt="" className="h-full w-full object-cover" /> : null}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        {href ? (
          <Link
            to={href}
            className="block truncate font-medium text-[var(--text-primary)] hover:text-[var(--accent-color)]"
          >
            {entryTitle(entry)}
          </Link>
        ) : (
          <p className="truncate font-medium text-[var(--text-primary)]">{entryTitle(entry)}</p>
        )}
        <p className="truncate text-xs text-[var(--text-tertiary)]">
          {kindLabel}
          {entryYear(entry) ? ` · ${entryYear(entry)}` : ''}
          {entry.source === 'request' && entry.request.seasonNumber
            ? ` · S${String(entry.request.seasonNumber).padStart(2, '0')}`
            : ''}
          {entry.source === 'request' && qualityProfileLabel(entry.request.qualityProfileId)
            ? ` · ${qualityProfileLabel(entry.request.qualityProfileId)}`
            : ''}
        </p>
        <Badge tone={requestStatusTone(status)}>{badgeLabel}</Badge>
        {hint ? <p className="text-xs leading-snug text-[var(--text-secondary)]">{hint}</p> : null}
        {showActions ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              variant="primary"
              disabled={busy}
              onClick={() => {
                if (entry.source === 'request') onApprove(entry.request.id);
              }}
            >
              {busy ? 'Working…' : 'Approve'}
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={busy}
              onClick={() => {
                if (entry.source === 'request') onDeny(entry.request.id);
              }}
            >
              Deny
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );

  return (
    <li
      className={`flex min-w-0 gap-3 rounded-[var(--radius-md)] border ${cardBorder} bg-[var(--bg-elevated)] p-3`}
    >
      {body}
    </li>
  );
}

function PhaseSection({
  title,
  icon,
  entries,
  testId,
  canApprove,
  busyId,
  onApprove,
  onDeny,
}: {
  title: string;
  icon: ReactNode;
  entries: InProgressEntry[];
  testId: string;
  canApprove: boolean;
  busyId: string | null;
  onApprove: (requestId: string) => void;
  onDeny: (requestId: string) => void;
}) {
  const headingId = useId();
  if (entries.length === 0) return null;
  return (
    <section className="space-y-3" data-testid={testId} aria-labelledby={headingId}>
      <div className="flex items-center gap-2">
        {icon}
        <h2 id={headingId} className="text-lg font-semibold text-[var(--text-primary)]">
          {title} <span className="text-[var(--text-tertiary)]">({entries.length})</span>
        </h2>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => (
          <InProgressCard
            key={entryKey(entry)}
            entry={entry}
            canApprove={canApprove}
            busy={entry.source === 'request' && busyId === entry.request.id}
            onApprove={onApprove}
            onDeny={onDeny}
          />
        ))}
      </ul>
    </section>
  );
}

function UpgradeCard({
  item,
  searching,
  onSearchNow,
}: {
  item: CutoffItem;
  searching: boolean;
  onSearchNow: () => void;
}) {
  const href = upgradeDetailHref(item);
  const gap = cutoffScoreGap(item);
  const titleBlock = (
    <div className="min-w-0 flex-1 space-y-1">
      <p className="truncate font-medium text-[var(--text-primary)]">{item.title}</p>
      <p className="truncate text-xs text-[var(--text-tertiary)]">
        {upgradeKindLabel(item.item_type)}
        {item.year ? ` · ${item.year}` : ''}
      </p>
      <Badge tone="warning">
        Score {item.current_score} / cutoff {item.cutoff_score}
        {gap > 0 ? ` · ${gap} below` : ''}
      </Badge>
    </div>
  );

  return (
    <li className="flex min-w-0 items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
      {href ? (
        <Link
          to={href}
          className="min-w-0 flex-1 rounded-[var(--radius-sm)] hover:text-[var(--accent-color)]"
        >
          {titleBlock}
        </Link>
      ) : (
        titleBlock
      )}
      <button
        type="button"
        className="shrink-0 rounded-[var(--radius-md)] px-2 py-1 text-xs font-semibold text-[var(--accent-color)] hover:bg-[var(--bg-elevated-2)]"
        disabled={searching}
        onClick={onSearchNow}
      >
        {searching ? 'Searching…' : 'Search now'}
      </button>
    </li>
  );
}

/** Titles being requested, searched, or downloaded — kept out of main library feeds. */
export default function InProgress() {
  const { caps } = useCapabilities();
  const showUpgrades = featureEnabled(caps, 'releases');
  const [entries, setEntries] = useState<InProgressEntry[]>([]);
  const [upgrades, setUpgrades] = useState<CutoffItem[]>([]);
  const [upgradesAvailable, setUpgradesAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchingKey, setSearchingKey] = useState<string | null>(null);
  const [searchNowMsg, setSearchNowMsg] = useState<string | null>(null);
  const [decideId, setDecideId] = useState<string | null>(null);
  const [decideError, setDecideError] = useState<string | null>(null);
  const canApprove = canApproveRequests();

  const reloadEntries = async () => {
    const [requests, movies, shows] = await Promise.all([
      api.listRequests(),
      api.listMovies(1, 200),
      api.listTVShows(1, 200),
    ]);
    setEntries(mergeInProgressEntries(requests, movies.items, shows.items));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await reloadEntries();
        if (cancelled) return;
        setError(null);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load in-progress titles');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const decideRequest = async (requestId: string, action: 'approve' | 'deny') => {
    if (action === 'deny') {
      const reason = window.prompt('Optional reason for denying this request');
      if (reason === null) return;
      setDecideId(requestId);
      setDecideError(null);
      try {
        await api.denyRequest(requestId, reason);
        await reloadEntries();
      } catch (err) {
        setDecideError(err instanceof Error ? err.message : 'Could not deny request');
      } finally {
        setDecideId(null);
      }
      return;
    }
    setDecideId(requestId);
    setDecideError(null);
    try {
      await api.approveRequest(requestId);
      await reloadEntries();
    } catch (err) {
      setDecideError(err instanceof Error ? err.message : 'Could not approve request');
    } finally {
      setDecideId(null);
    }
  };

  useEffect(() => {
    if (!showUpgrades) {
      setUpgrades([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.listUpgrades();
        if (cancelled) return;
        setUpgrades(res.items || []);
        setUpgradesAvailable(res.available !== false);
      } catch {
        if (!cancelled) {
          setUpgrades([]);
          setUpgradesAvailable(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showUpgrades]);

  const grouped = useMemo(() => groupInProgressByPhase(entries), [entries]);

  const runSearchNow = async (item?: CutoffItem) => {
    const key = item ? item.queue_id || item.item_id : 'all';
    setSearchingKey(key);
    setSearchNowMsg(null);
    try {
      const out = await api.searchNow(
        item
          ? { queue_id: item.queue_id, item_type: item.item_type, item_id: item.item_id }
          : undefined,
      );
      setSearchNowMsg(out.message || (out.started ? 'Wanted search started.' : 'Search did not start.'));
    } catch (err) {
      setSearchNowMsg(err instanceof Error ? err.message : 'Search now failed');
    } finally {
      setSearchingKey(null);
    }
  };

  const empty = !loading && !error && entries.length === 0 && upgrades.length === 0;

  return (
    <div className="min-w-0 space-y-8 overflow-x-hidden" data-testid="in-progress-page">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          In progress
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Titles you&apos;ve requested that aren&apos;t ready to watch yet
          {showUpgrades ? ', plus library titles still below your quality cutoff' : ''}. Your main
          library only shows what you can play now.
        </p>
      </header>

      <AcquisitionSetupBanner />
      <RequestQuotaBanner />

      {loading && (
        <div data-testid="in-progress-loading" aria-busy="true">
          <LoadingStatus label="Loading in-progress titles" />
          <ShelfSkeleton count={4} />
        </div>
      )}
      {error && <ErrorBanner message={error} testId="in-progress-error" />}
      {decideError && <ErrorBanner message={decideError} testId="in-progress-decide-error" />}

      {empty && (
        <EmptyState
          icon={Clock3}
          title="Nothing in progress"
          message="Search to add titles that are still downloading or awaiting approval."
          action={
            <Link
              to="/search"
              className="text-sm font-medium text-[var(--accent-color)] hover:underline"
            >
              Search to add titles
            </Link>
          }
          testId="in-progress-empty"
        />
      )}

      {!loading && showUpgrades && upgrades.length > 0 && (
        <section className="space-y-3" data-testid="in-progress-upgrades" id="upgrades">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ArrowBigUp className="h-5 w-5 text-[var(--accent-color)]" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Quality upgrades <span className="text-[var(--text-tertiary)]">({upgrades.length})</span>
              </h2>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<Search className="h-4 w-4" aria-hidden="true" />}
              disabled={searchingKey !== null}
              onClick={() => void runSearchNow()}
            >
              {searchingKey === 'all' ? 'Searching…' : 'Search all upgrades'}
            </Button>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Titles already in the library that sit below the profile cutoff — Sonarr/Radarr
            &quot;Cutoff Unmet&quot;. Open a title to pick a scored release, or search now to let
            automation grab the next match.
          </p>
          {searchNowMsg ? (
            <p className="text-sm text-[var(--text-secondary)]" data-testid="upgrade-search-now">
              {searchNowMsg}
            </p>
          ) : null}
          {!upgradesAvailable ? (
            <p className="text-sm text-[var(--text-secondary)]">Automation is not listing upgrades right now.</p>
          ) : null}
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upgrades.map((item) => (
              <UpgradeCard
                key={item.queue_id || `${item.item_type}-${item.item_id}`}
                item={item}
                searching={searchingKey === (item.queue_id || item.item_id)}
                onSearchNow={() => void runSearchNow(item)}
              />
            ))}
          </ul>
        </section>
      )}

      {!loading && entries.length > 0 && (
        <div className="space-y-10">
          <PhaseSection
            title="Needs attention"
            icon={
              <TriangleAlert className="h-5 w-5 text-[var(--danger-color)]" aria-hidden="true" />
            }
            entries={grouped.attention}
            testId="in-progress-attention"
            canApprove={canApprove}
            busyId={decideId}
            onApprove={(id) => void decideRequest(id, 'approve')}
            onDeny={(id) => void decideRequest(id, 'deny')}
          />
          <PhaseSection
            title="Pending approval"
            icon={
              <ShieldAlert
                className="h-5 w-5 text-[var(--warning-color,#f5a623)]"
                aria-hidden="true"
              />
            }
            entries={grouped.pending}
            testId="in-progress-pending"
            canApprove={canApprove}
            busyId={decideId}
            onApprove={(id) => void decideRequest(id, 'approve')}
            onDeny={(id) => void decideRequest(id, 'deny')}
          />
          <PhaseSection
            title="Downloading"
            icon={<Download className="h-5 w-5 text-[var(--accent-color)]" aria-hidden="true" />}
            entries={grouped.downloading}
            testId="in-progress-downloading"
            canApprove={canApprove}
            busyId={decideId}
            onApprove={(id) => void decideRequest(id, 'approve')}
            onDeny={(id) => void decideRequest(id, 'deny')}
          />
          <PhaseSection
            title="Searching"
            icon={
              <Search className="h-5 w-5 text-[var(--warning-color,#f5a623)]" aria-hidden="true" />
            }
            entries={grouped.searching}
            testId="in-progress-searching"
            canApprove={canApprove}
            busyId={decideId}
            onApprove={(id) => void decideRequest(id, 'approve')}
            onDeny={(id) => void decideRequest(id, 'deny')}
          />
          <PhaseSection
            title="Requested"
            icon={<Clock3 className="h-5 w-5 text-[var(--text-tertiary)]" aria-hidden="true" />}
            entries={grouped.requested}
            testId="in-progress-requested"
            canApprove={canApprove}
            busyId={decideId}
            onApprove={(id) => void decideRequest(id, 'approve')}
            onDeny={(id) => void decideRequest(id, 'deny')}
          />
        </div>
      )}
    </div>
  );
}
