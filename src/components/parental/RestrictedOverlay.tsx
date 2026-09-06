/**
 * Full-page overlay shown when a title's content rating exceeds the configured
 * parental ceiling and the user has not yet unlocked it.
 */

import { ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';

export interface RestrictedOverlayProps {
  /** Content rating of the restricted title (e.g. "R", "TV-MA"). */
  contentRating?: string;
  /** Max allowed rating configured by the admin (e.g. "PG-13"). */
  maxRating: string;
  /** Called when the user taps "Unlock with PIN". */
  onUnlock: () => void;
  /** Called when the user wants to go back. */
  onBack?: () => void;
}

export function RestrictedOverlay({ contentRating, maxRating, onUnlock, onBack }: RestrictedOverlayProps) {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8 text-center"
      data-testid="restricted-overlay"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-elevated)]">
        <ShieldAlert className="h-8 w-8 text-[var(--warning-color)]" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          This title is restricted
        </h2>
        <p className="max-w-sm text-sm text-[var(--text-secondary)]">
          {contentRating
            ? `This title is rated ${contentRating}. `
            : ''}
          Your parental controls allow up to {maxRating}.
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="primary" onClick={onUnlock}>
          Unlock with PIN
        </Button>
        {onBack && (
          <Button variant="secondary" onClick={onBack}>
            Go back
          </Button>
        )}
      </div>
    </div>
  );
}
