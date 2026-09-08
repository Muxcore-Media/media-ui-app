import { Link2, Unlink } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../api/client';
import { canManageLibrary } from '../../lib/session';
import { Button } from '../ui/Button';

export function JellyfinLinkButton({
  muxId,
  title,
  mediaKind,
  tmdbId,
  path,
  linked,
  onLinked,
  onUnlinked,
}: {
  muxId: string;
  title: string;
  mediaKind: 'movie' | 'tv';
  tmdbId?: number;
  path?: string;
  linked: boolean;
  onLinked?: (playUrl: string | null) => void;
  onUnlinked?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  if (!canManageLibrary() || !muxId) return null;

  async function match() {
    setBusy(true);
    setFlash(null);
    try {
      const next = await api.matchJellyfinItem({
        muxId,
        title,
        mediaKind,
        tmdbId,
        path,
      });
      if (!next.linked) {
        setFlash('No Jellyfin match');
        return;
      }
      setFlash(next.matchReason ? `Linked · ${next.matchReason}` : 'Linked');
      const url = await api.jellyfinPlayURL(muxId);
      onLinked?.(url);
    } catch (err) {
      setFlash(err instanceof Error ? err.message : 'Could not match Jellyfin');
    } finally {
      setBusy(false);
    }
  }

  async function unlink() {
    setBusy(true);
    setFlash(null);
    try {
      await api.unlinkJellyfinItem(muxId);
      setFlash('Unlinked');
      onUnlinked?.();
    } catch (err) {
      setFlash(err instanceof Error ? err.message : 'Could not unlink Jellyfin');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1" data-testid="jellyfin-link">
      {linked ? (
        <Button
          variant="secondary"
          icon={<Unlink className="h-4 w-4" aria-hidden="true" />}
          disabled={busy}
          onClick={() => void unlink()}
        >
          Unlink Jellyfin
        </Button>
      ) : (
        <Button
          variant="secondary"
          icon={<Link2 className="h-4 w-4" aria-hidden="true" />}
          disabled={busy}
          onClick={() => void match()}
        >
          Match Jellyfin
        </Button>
      )}
      {flash ? (
        <p className="text-xs text-[var(--text-secondary)]" data-testid="jellyfin-link-flash">
          {flash}
        </p>
      ) : null}
    </div>
  );
}
