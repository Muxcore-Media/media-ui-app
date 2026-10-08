import { operatorCodeFromMessage } from '../../api/errors';

/**
 * Compact result line for an operator action (monitor, refresh, delete file, quality, root folder).
 * A role denial is a polite status in the muted tone; any other failure is an alert.
 */
export function ActionNote({ message, testId = 'action-note' }: { message: string | null; testId?: string }) {
  if (!message) return null;
  const denied = operatorCodeFromMessage(message) !== null;
  return (
    <p
      role={denied ? 'status' : 'alert'}
      data-testid={testId}
      className={`text-xs ${denied ? 'text-[var(--text-tertiary)]' : 'text-[var(--danger-color)]'}`}
    >
      {message}
    </p>
  );
}
