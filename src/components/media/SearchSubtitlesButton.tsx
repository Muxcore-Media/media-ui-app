import { Captions } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../api/client';
import { canManageSubtitles } from '../../lib/session';
import { Button } from '../ui/Button';

export function SearchSubtitlesButton({
  id,
}: {
  id: string;
}) {
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  if (!canManageSubtitles() || !id) return null;

  async function search() {
    if (!id || busy) return;
    setBusy(true);
    setFlash(null);
    try {
      const next = await api.searchSubtitleWanted({ mediaIds: [id] });
      setFlash(`Searched ${next.searched}, downloaded ${next.downloaded}`);
    } catch (err) {
      setFlash(err instanceof Error ? err.message : 'Wanted search failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1" data-testid="search-subtitles">
      <Button
        variant="secondary"
        icon={<Captions className="h-4 w-4" aria-hidden="true" />}
        disabled={busy}
        onClick={() => void search()}
      >
        {busy ? 'Searching…' : 'Search subtitles'}
      </Button>
      {flash ? <p className="text-sm text-[var(--text-secondary)]">{flash}</p> : null}
    </div>
  );
}
