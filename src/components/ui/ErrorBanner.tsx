import { parentalCodeFromMessage } from '../../api/errors';
import { ParentalNotice } from '../parental/ParentalNotice';

type Props = {
  message: string;
  testId?: string;
};

/**
 * Standard inline error for route-level fetch failures (AGENTS.md §12).
 *
 * Pages store `err.message`; a server-side parental outcome (`ParentalError`, ADR-0031) has
 * fixed SPA copy, so it is recognised here and shown as a calm "not available" state (or a
 * retryable alert for "could not check") instead of a red failure.
 */
export function ErrorBanner({ message, testId = 'page-error' }: Props) {
  const parentalCode = parentalCodeFromMessage(message);
  if (parentalCode) return <ParentalNotice code={parentalCode} testId={testId === 'page-error' ? undefined : testId} />;
  return (
    <p
      role="alert"
      data-testid={testId}
      className="rounded-[var(--radius-md)] border border-[var(--danger-color)]/40 bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--danger-color)]"
    >
      {message}
    </p>
  );
}
