import { useOperatorAccess } from '../../hooks/useOperatorAccess';
import { type FormEvent, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { parseGroupList } from '../../lib/series-override';
import { ErrorBanner } from '../ui/ErrorBanner';

export function SeriesOverrideCard({ seriesId }: { seriesId: string }) {
  const { canOperate } = useOperatorAccess();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [found, setFound] = useState(false);
  const [delay, setDelay] = useState('15');
  const [preferred, setPreferred] = useState('');
  const [ignored, setIgnored] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!canOperate) return;
    let cancelled = false;
    void api
      .getSeriesOverride(seriesId)
      .then((next) => {
        if (cancelled) return;
        setAvailable(next.available);
        setFound(next.found);
        setDelay(String(next.override.delayMinutes || 0));
        setPreferred(next.override.preferredGroups.join(', '));
        setIgnored(next.override.ignoredGroups.join(', '));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load series override');
      });
    return () => {
      cancelled = true;
    };
  }, [seriesId, canOperate]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    const wait = Number(delay);
    if (!Number.isFinite(wait) || wait < 0 || wait > 10080) {
      setError('Wait must be 0–10080 minutes');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await api.upsertSeriesOverride({
        id: seriesId,
        delayMinutes: Math.round(wait),
        preferredGroups: parseGroupList(preferred),
        ignoredGroups: parseGroupList(ignored),
      });
      setAvailable(true);
      setFound(true);
      setDelay(String(next.override.delayMinutes));
      setPreferred(next.override.preferredGroups.join(', '));
      setIgnored(next.override.ignoredGroups.join(', '));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save series override');
    } finally {
      setBusy(false);
    }
  }

  async function onClear() {
    setBusy(true);
    setError(null);
    try {
      await api.deleteSeriesOverride(seriesId);
      setFound(false);
      setDelay('0');
      setPreferred('');
      setIgnored('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear series override');
    } finally {
      setBusy(false);
    }
  }

  if (!canOperate) return null;

  if (available === false) return null;

  return (
    <form
      onSubmit={(e) => void onSave(e)}
      className="space-y-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4"
      data-testid="series-override"
    >
      <h2 className="font-semibold text-[var(--text-primary)]">Grab override</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        Wait longer than the household delay, and prefer or skip release groups for this show only.
      </p>
      {error ? <ErrorBanner message={error} testId="series-override-error" /> : null}
      <label className="block text-sm text-[var(--text-primary)]">
        <span className="mb-1 block text-xs text-[var(--text-tertiary)]">Wait (minutes)</span>
        <input
          type="number"
          min={0}
          max={10080}
          value={delay}
          onChange={(e) => setDelay(e.target.value)}
          aria-label="Series delay minutes"
          data-testid="series-override-delay"
          className="w-28 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-2 text-sm outline-none focus:border-[var(--accent-color)]"
        />
      </label>
      <label className="block text-sm text-[var(--text-primary)]">
        <span className="mb-1 block text-xs text-[var(--text-tertiary)]">Preferred groups</span>
        <input
          value={preferred}
          onChange={(e) => setPreferred(e.target.value)}
          aria-label="Preferred release groups"
          placeholder="FLUX, EMBER"
          className="w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-2 text-sm outline-none focus:border-[var(--accent-color)]"
        />
      </label>
      <label className="block text-sm text-[var(--text-primary)]">
        <span className="mb-1 block text-xs text-[var(--text-tertiary)]">Ignored groups</span>
        <input
          value={ignored}
          onChange={(e) => setIgnored(e.target.value)}
          aria-label="Ignored release groups"
          placeholder="RARBG, CAM"
          className="w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-2 text-sm outline-none focus:border-[var(--accent-color)]"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-[var(--radius-md)] bg-[var(--accent-color)] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save override'}
        </button>
        {found ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onClear()}
            className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            Use household delay
          </button>
        ) : null}
      </div>
    </form>
  );
}
