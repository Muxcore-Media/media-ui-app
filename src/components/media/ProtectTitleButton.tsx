import { Shield } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../api/client';
import { canManageLibrary } from '../../lib/session';
import { Button } from '../ui/Button';

export function ProtectTitleButton({
  kind,
  id,
  title,
}: {
  kind: 'movie' | 'tv';
  id: string;
  title: string;
}) {
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  if (!canManageLibrary() || !id) return null;

  async function protect() {
    if (!id || busy) return;
    setBusy(true);
    setFlash(null);
    try {
      await api.upsertMaintainerProtection({
        itemId: id,
        title,
        scope: kind === 'tv' ? 'series' : 'movie',
        reason: 'Household favorite',
      });
      setFlash('Protected from cleanup');
    } catch (err) {
      setFlash(err instanceof Error ? err.message : 'Could not protect title');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1" data-testid="protect-title">
      <Button
        variant="secondary"
        icon={<Shield className="h-4 w-4" aria-hidden="true" />}
        disabled={busy}
        onClick={() => void protect()}
      >
        {busy ? 'Protecting…' : 'Protect from cleanup'}
      </Button>
      {flash ? <p className="text-sm text-[var(--text-secondary)]">{flash}</p> : null}
    </div>
  );
}
