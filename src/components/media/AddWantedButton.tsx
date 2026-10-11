import { useOperatorAccess } from '../../hooks/useOperatorAccess';
import { Clock3 } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../api/client';
import { operatorCodeFromMessage } from '../../api/errors';
import { Button } from '../ui/Button';

export function AddWantedButton({
  itemType,
  itemId,
  title,
  year,
  tmdbId,
  qualityProfileId,
  seriesId,
}: {
  itemType: 'movie' | 'tv';
  itemId: string;
  title: string;
  year?: number;
  tmdbId?: number;
  qualityProfileId?: string;
  seriesId?: string;
}) {
  const { canOperate } = useOperatorAccess();
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  async function add() {
    if (!itemId || busy) return;
    setBusy(true);
    setFlash(null);
    try {
      const res = await api.addWanted({
        itemType,
        itemId,
        title,
        year,
        tmdbId,
        qualityProfileId,
        seriesId: seriesId || (itemType === 'tv' ? itemId : undefined),
      });
      setFlash(res.added ? 'Added to wanted' : 'Already on wanted');
    } catch (err) {
      setFlash(err instanceof Error ? err.message : 'Could not add to wanted');
    } finally {
      setBusy(false);
    }
  }

  const denied = operatorCodeFromMessage(flash) !== null;
  // A role correction removes the button while retaining only fixed denial copy.
  if (!canOperate && !denied) return null;

  return (
    <div className="space-y-1">
      {canOperate ? (
        <Button
          variant="secondary"
          icon={<Clock3 className="h-4 w-4" aria-hidden="true" />}
          disabled={busy || !itemId}
          onClick={() => void add()}
        >
          {busy ? 'Adding…' : 'Add to wanted'}
        </Button>
      ) : null}
      {flash ? (
        <p role={denied ? 'status' : undefined} className="text-xs text-[var(--text-tertiary)]" data-testid="add-wanted-flash">
          {flash}
        </p>
      ) : null}
    </div>
  );
}
