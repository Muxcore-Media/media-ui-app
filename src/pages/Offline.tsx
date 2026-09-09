import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HardDrive, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { EmptyState } from '../components/ui/EmptyState';
import {
  formatOfflineBytes,
  listOfflineTitles,
  removeOfflineTitle,
  type OfflineTitle,
} from '../lib/offline-library';
import { plexSyncItemLabel, plexSyncListLabel, type PlexSyncListsResponse } from '../lib/plex-sync';
import { buildPlayerHref } from '../lib/playHref';
import type { MediaKind } from '../lib/userdata';

export default function Offline() {
  const [items, setItems] = useState<OfflineTitle[]>([]);
  const [plex, setPlex] = useState<PlexSyncListsResponse | null>(null);
  const [plexBusy, setPlexBusy] = useState(false);
  const [openingKey, setOpeningKey] = useState<string | null>(null);
  const [plexError, setPlexError] = useState<string | null>(null);

  function refresh() {
    setItems(listOfflineTitles());
  }

  async function loadPlex(refreshRemote = false) {
    setPlexBusy(true);
    try {
      setPlex(await api.listPlexSyncLists({ refresh: refreshRemote }));
    } catch {
      setPlex({
        available: false,
        machineIdentifier: '',
        updatedAt: '',
        lists: [],
        total: 0,
        error: '',
      });
    } finally {
      setPlexBusy(false);
    }
  }

  useEffect(() => {
    refresh();
    void loadPlex(false);
  }, []);

  async function onRemove(id: string) {
    await removeOfflineTitle(id);
    refresh();
  }

  return (
    <div className="space-y-6" data-testid="offline-page">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Saved offline</h1>
        <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
          Titles stored on this device. Play them without the library server — same idea as Jellyfin
          downloads, in the household browser.
        </p>
      </header>
      {items.length === 0 ? (
        <EmptyState
          icon={HardDrive}
          title="Nothing saved yet"
          message="Open a movie or episode and choose Save offline."
        />
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
          {items.map((item) => {
            const playTo = buildPlayerHref({
              src: item.src,
              title: item.title,
              id: item.id,
              kind: (item.kind as MediaKind) || 'movie',
              poster: item.poster,
              back: '/offline',
            });
            return (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--text-primary)]">{item.title}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {item.status === 'ready' ? formatOfflineBytes(item.bytes) : item.error || item.status}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {item.status === 'ready' ? (
                    <Link
                      to={playTo}
                      className="text-sm font-semibold text-[var(--accent-color)] hover:underline"
                    >
                      Play
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    aria-label={`Remove ${item.title}`}
                    className="rounded-full p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated-2)]"
                    onClick={() => void onRemove(item.id)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <section className="space-y-3" data-testid="plex-sync-lists">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Plex device downloads</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Sync lists from phones and tablets still talking to Plex.
            </p>
          </div>
          <button
            type="button"
            disabled={plexBusy}
            className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)]"
            onClick={() => void loadPlex(true)}
          >
            {plexBusy ? 'Refreshing…' : 'Refresh Plex'}
          </button>
        </div>
        {plexError ? <p className="text-sm text-[var(--danger-color)]">{plexError}</p> : null}
        {!plex?.available ? (
          <p className="text-sm text-[var(--text-secondary)]">Plex is not connected.</p>
        ) : plex.lists.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">No Plex device downloads.</p>
        ) : (
          <ul className="space-y-4">
            {plex.lists.map((list) => (
              <li key={list.id || list.clientIdentifier} className="rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                <p className="border-b border-[var(--border-subtle)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]">
                  {plexSyncListLabel(list)}
                </p>
                <ul className="divide-y divide-[var(--border-subtle)]">
                  {list.items.map((item) => (
                    <li key={item.id || item.ratingKey} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                      <span className="truncate text-[var(--text-primary)]">{item.title}</span>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-xs text-[var(--text-tertiary)]">
                          {item.totalSizeBytes ? `${formatOfflineBytes(item.totalSizeBytes)} · ` : ''}
                          {plexSyncItemLabel(item)}
                        </span>
                        {item.ratingKey ? (
                          <button
                            type="button"
                            className="text-xs font-semibold text-[var(--accent-color)] hover:underline disabled:opacity-50"
                            disabled={openingKey === item.ratingKey}
                            aria-label={`Open ${item.title} in Plex`}
                            onClick={() => {
                              setOpeningKey(item.ratingKey);
                              setPlexError(null);
                              void api
                                .plexPlayURL(item.ratingKey)
                                .then((url) => {
                                  if (url) window.open(url, '_blank', 'noopener,noreferrer');
                                  else setPlexError('Plex play link is not available');
                                })
                                .finally(() => setOpeningKey(null));
                            }}
                          >
                            Open in Plex
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
