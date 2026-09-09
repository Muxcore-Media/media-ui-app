import { useCallback, useEffect, useRef, useState } from 'react';
import { Ban, Download, Search } from 'lucide-react';
import { api } from '../../api/client';
import { featureEnabled, useCapabilities } from '../../lib/capabilities';
import type { AcquisitionStatus } from '../../lib/acquisition-status';
import { normalizeParsedQuality, parsedQualityLabel } from '../../lib/formats';
import { Button } from '../ui/Button';
import { ErrorBanner } from '../ui/ErrorBanner';
import type { ReleaseMatch } from '../../types';

type Props = {
  itemType: 'movie' | 'tv';
  itemId: string;
  title: string;
  year?: number;
  tmdbId?: number;
  /** Start indexer search on mount (quality-upgrade deep link). */
  autoSearch?: boolean;
};

function formatSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '—';
  const gb = bytes / 1e9;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / 1e6;
  return `${mb.toFixed(0)} MB`;
}

export default function InteractiveSearch({
  itemType,
  itemId,
  title,
  year,
  tmdbId,
  autoSearch = false,
}: Props) {
  const { caps } = useCapabilities();
  const [items, setItems] = useState<ReleaseMatch[] | null>(null);
  const [available, setAvailable] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grabbing, setGrabbing] = useState<string | null>(null);
  const [grabbed, setGrabbed] = useState<string | null>(null);
  const [blocking, setBlocking] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<Set<string>>(() => new Set());
  const [acquisition, setAcquisition] = useState<AcquisitionStatus | null>(null);
  const didAutoSearch = useRef(false);
  const enabled = featureEnabled(caps, 'releases');
  const grabAllowed = acquisition?.liveGrabAllowed !== false;

  const search = useCallback(async () => {
    setLoading(true);
    setError(null);
    setGrabbed(null);
    try {
      const res = await api.searchReleases({
        q: title,
        type: itemType,
        year,
        tmdbId,
      });
      setAvailable(res.available !== false);
      setMessage(res.message || null);
      setItems(res.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setItems([]);
      setAvailable(false);
    } finally {
      setLoading(false);
    }
  }, [title, itemType, year, tmdbId]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void api
      .getAcquisition()
      .then((next) => {
        if (!cancelled) setAcquisition(next);
      })
      .catch(() => {
        if (!cancelled) setAcquisition(null);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !autoSearch || didAutoSearch.current) return;
    didAutoSearch.current = true;
    void search();
  }, [enabled, autoSearch, search]);

  if (!enabled) return null;

  const grab = async (rel: ReleaseMatch) => {
    setGrabbing(rel.guid);
    setError(null);
    try {
      const out = await api.grabRelease({
        guid: rel.guid,
        title: rel.title,
        download_url: rel.download_url,
        download_protocol: rel.download_protocol,
        size: rel.size,
        score: rel.score,
        indexer_name: rel.indexer_name,
        item_type: itemType,
        item_id: itemId,
        tmdb_id: tmdbId,
      });
      setGrabbed(out.status ? `${rel.title} — ${out.status}` : rel.title);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Grab failed');
    } finally {
      setGrabbing(null);
    }
  };

  const block = async (rel: ReleaseMatch) => {
    if (!rel.guid) return;
    setBlocking(rel.guid);
    setError(null);
    try {
      await api.blockRelease({
        guid: rel.guid,
        item_id: itemId,
        reason: 'household',
      });
      setBlocked((prev) => new Set(prev).add(rel.guid));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Block failed');
    } finally {
      setBlocking(null);
    }
  };

  return (
    <section className="space-y-3" data-testid="interactive-search" aria-labelledby="release-search-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="release-search-heading"
            className="text-lg font-semibold text-[var(--text-primary)]"
          >
            Releases
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Search indexers and grab a scored release, same as Radarr/Sonarr interactive search.
          </p>
        </div>
        <Button
          variant="secondary"
          icon={<Search className="h-4 w-4" aria-hidden="true" />}
          onClick={() => void search()}
          disabled={loading}
        >
          {loading ? 'Searching…' : items ? 'Search again' : 'Search releases'}
        </Button>
      </div>

      {error ? <ErrorBanner message={error} testId="release-search-error" /> : null}
      {!grabAllowed ? (
        <p className="text-sm text-[var(--text-secondary)]" data-testid="release-grab-blocked">
          {acquisition?.message ||
            'Live grab is off until WireGuard is connected (fixture engine or WG_CONF).'}
        </p>
      ) : null}
      {grabbed ? (
        <p className="text-sm text-[var(--text-secondary)]" data-testid="release-grabbed">
          Queued {grabbed}
        </p>
      ) : null}

      {items && !available ? (
        <p className="text-sm text-[var(--text-secondary)]" data-testid="release-search-unavailable">
          {message || 'Release search is not available yet.'}
        </p>
      ) : null}

      {items && available && items.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]" data-testid="release-search-empty">
          No scored releases found.
        </p>
      ) : null}

      {items && available && items.length > 0 ? (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
          <table className="w-full text-left text-sm" data-testid="release-search-table">
            <caption className="sr-only">Scored indexer releases</caption>
            <thead className="bg-[var(--bg-elevated)] text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Score
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Quality
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Title
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Indexer
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Size
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {items.map((rel) => (
                <tr key={rel.guid || rel.title}>
                  <td className="px-3 py-2 font-semibold text-[var(--accent-color)]">
                    {rel.score ?? 0}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)]" data-testid="release-quality">
                    {rel.quality ? parsedQualityLabel(normalizeParsedQuality(rel.quality)) : '—'}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-primary)]">
                    <span className="line-clamp-2">{rel.title}</span>
                    {rel.download_protocol ? (
                      <span className="block text-xs text-[var(--text-tertiary)]">
                        {rel.download_protocol}
                        {rel.seeders != null ? ` · ${rel.seeders} seeders` : ''}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)]">
                    {rel.indexer_name || '—'}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-secondary)]">{formatSize(rel.size)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-[var(--radius-md)] px-2 py-1 text-xs font-semibold text-[var(--accent-color)] hover:bg-[var(--bg-elevated-2)]"
                        aria-label={`Grab ${rel.title}`}
                        disabled={!grabAllowed || grabbing === rel.guid || blocked.has(rel.guid)}
                        onClick={() => void grab(rel)}
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        {grabbing === rel.guid ? 'Grabbing…' : 'Grab'}
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-[var(--radius-md)] px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated-2)] hover:text-[var(--danger-color)]"
                        aria-label={`Block ${rel.title}`}
                        disabled={blocking === rel.guid || blocked.has(rel.guid)}
                        onClick={() => void block(rel)}
                      >
                        <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                        {blocked.has(rel.guid) ? 'Blocked' : blocking === rel.guid ? 'Blocking…' : 'Block'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
