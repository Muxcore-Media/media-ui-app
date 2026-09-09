import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { historyEventLabel, type ItemHistoryEntry } from '../../lib/item-history';

export function ItemHistoryCard({
  kind,
  id,
}: {
  kind: 'movie' | 'tv' | 'artist' | 'author' | 'series' | 'audiobook';
  id: string;
}) {
  const [items, setItems] = useState<ItemHistoryEntry[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api
      .listItemHistory(kind, id)
      .then((next) => {
        if (cancelled) return;
        setAvailable(next.available);
        setItems(next.items);
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, id]);

  if (available === false) return null;

  return (
    <section className="min-w-0 space-y-2" data-testid="item-history">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">History</h3>
      <p className="text-sm text-[var(--text-secondary)]">
        Grabs, imports, and file removals for this title, like Radarr/Sonarr History.
      </p>
      {available === true && items.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)]">No history yet.</p>
      ) : null}
      <ul className="space-y-2" data-testid="item-history-list">
        {items.map((row) => (
          <li key={row.id || `${row.eventType}-${row.createdAt}`} className="text-sm">
            <p className="text-[var(--text-primary)]">
              {historyEventLabel(row.eventType)}
              {row.quality ? ` · ${row.quality}` : ''}
            </p>
            <p className="truncate text-[var(--text-secondary)]">
              {row.sourceTitle || row.title}
              {row.indexer ? ` · ${row.indexer}` : ''}
            </p>
            {row.createdAt ? (
              <p className="text-xs text-[var(--text-tertiary)]">{row.createdAt}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
