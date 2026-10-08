/**
 * Inline state for a server-side parental outcome (ADR-0031): the BFF decided, the SPA reports.
 *
 * Decisions (`blocked`, `restricted_route`, `policy_unconfigured`, `policy_unverifiable`,
 * `session_invalid`) render as a calm polite status, not an error. "Could not check" failures
 * (`policy_unavailable`, `classification_unavailable`) render as an alert with an optional
 * Retry; they are never treated as allowed and nothing retries on its own.
 */

import { RefreshCw, ShieldAlert } from 'lucide-react';
import { PARENTAL_COPY, type ParentalCode } from '../../api/errors';

export interface ParentalNoticeProps {
  code: ParentalCode;
  /** Shown as a Retry button for retryable codes only. */
  onRetry?: () => void;
  testId?: string;
}

export function ParentalNotice({ code, onRetry, testId = 'parental-notice' }: ParentalNoticeProps) {
  const copy = PARENTAL_COPY[code];
  const isAlert = copy.tone === 'error';
  return (
    <div
      role={isAlert ? 'alert' : 'status'}
      data-testid={testId}
      data-parental-code={code}
      className={`flex items-start gap-3 rounded-[var(--radius-md)] border bg-[var(--bg-elevated)] px-4 py-3 text-sm ${
        isAlert ? 'border-[var(--danger-color)]/40' : 'border-[var(--border-subtle)]'
      }`}
    >
      <ShieldAlert
        className={`mt-0.5 h-5 w-5 shrink-0 ${
          isAlert ? 'text-[var(--danger-color)]' : 'text-[var(--warning-color)]'
        }`}
        aria-hidden="true"
      />
      <div className="space-y-1">
        <p className="font-semibold text-[var(--text-primary)]">{copy.title}</p>
        <p className="text-[var(--text-secondary)]">{copy.message}</p>
        {code === 'parental.session_invalid' ? (
          <a href="/login" className="inline-block text-[var(--accent-text)] hover:underline">
            Sign in
          </a>
        ) : null}
        {copy.retryable && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 text-[var(--accent-text)] hover:underline"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}
