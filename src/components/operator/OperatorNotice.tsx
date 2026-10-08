/**
 * Inline state for a server-side operator role denial (T-M5-12): the BFF decided, the SPA reports.
 * It is a calm polite status, not an error, and offers no retry: asking again returns the same answer.
 */

import { ShieldAlert } from 'lucide-react';
import { OPERATOR_COPY, type OperatorCode } from '../../api/errors';

export interface OperatorNoticeProps {
  code: OperatorCode;
  testId?: string;
}

export function OperatorNotice({ code, testId = 'operator-notice' }: OperatorNoticeProps) {
  const copy = OPERATOR_COPY[code];
  return (
    <div
      role="status"
      data-testid={testId}
      data-operator-code={code}
      className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-sm"
    >
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[var(--warning-color)]" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-semibold text-[var(--text-primary)]">{copy.title}</p>
        <p className="text-[var(--text-secondary)]">{copy.message}</p>
      </div>
    </div>
  );
}
