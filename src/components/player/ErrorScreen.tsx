import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { PARENTAL_COPY, type ParentalCode } from '../../api/errors';

type Props = {
  message: string;
  href: string;
  onRetry?: () => void;
  /**
   * Server-side parental outcome (ADR-0031). Replaces the generic heading with the specific
   * state, shows Retry only when trying again can help, and never auto-retries.
   */
  parentalCode?: ParentalCode | null;
};

export default function ErrorScreen({ message, href, onRetry, parentalCode }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const copy = parentalCode ? PARENTAL_COPY[parentalCode] : null;
  const calm = copy?.tone === 'calm';
  const showRetry = onRetry && (!copy || copy.retryable);

  // The player is the whole page: move focus to the heading so keyboard and screen-reader
  // users land on the outcome instead of an inert full-screen overlay.
  useEffect(() => {
    if (parentalCode) headingRef.current?.focus();
  }, [parentalCode]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--player-bg)] px-6 text-[var(--text-secondary)]"
      role="main"
      aria-labelledby="player-error-heading"
      data-testid={parentalCode ? 'player-parental-state' : undefined}
      data-parental-code={parentalCode ?? undefined}
    >
      <div className="max-w-md space-y-4 text-center">
        <h1
          id="player-error-heading"
          ref={headingRef}
          tabIndex={parentalCode ? -1 : undefined}
          className="text-lg font-semibold text-[var(--text-primary)] outline-none"
        >
          {copy ? copy.title : 'Playback unavailable'}
        </h1>
        <p role={calm ? 'status' : 'alert'}>{message}</p>
        <div className="flex items-center justify-center gap-4">
          <Link to={href} className="text-[var(--accent-color)] hover:underline">
            Go back
          </Link>
          {parentalCode === 'parental.session_invalid' ? (
            <a href="/login" className="text-[var(--accent-color)] hover:underline">
              Sign in
            </a>
          ) : null}
          {showRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-1.5 text-[var(--accent-color)] hover:underline"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
