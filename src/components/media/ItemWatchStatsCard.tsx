import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { itemWatchStatsLabel, type ItemWatchStats } from '../../lib/watch-stats';

export function ItemWatchStatsCard({
  id,
  runtimeMinutes,
}: {
  id: string;
  runtimeMinutes?: number;
}) {
  const [stats, setStats] = useState<ItemWatchStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    void api
      .getItemWatchStats(id, runtimeMinutes)
      .then((next) => {
        if (!cancelled) setStats(next);
      })
      .catch(() => {
        if (!cancelled) setStats({ available: false, itemId: id, playCount: 0, uniqueUsers: 0, watchMinutes: 0, neverWatched: true, hasActivity: false, lastWatchedAt: '', daysSinceLastWatch: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, [id, runtimeMinutes]);

  if (!stats?.available) return null;

  return (
    <section className="min-w-0 space-y-2" data-testid="item-watch-stats">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Watch stats</h3>
      <p className="text-sm text-[var(--text-secondary)]">{itemWatchStatsLabel(stats)}</p>
      {stats.lastWatchedAt ? (
        <p className="text-xs text-[var(--text-tertiary)]">Last watched {stats.lastWatchedAt}</p>
      ) : null}
    </section>
  );
}
