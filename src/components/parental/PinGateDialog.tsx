/**
 * Cosmetic PIN gate dialog. Local verification cannot override a server denial.
 *
 * Accepts the same 4–6 digit PINs as Settings, with explicit submission.
 */

import { useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '../ui/Button';
import { verifyPin } from '../../lib/parental';

export interface PinGateDialogProps {
  /** SHA-256 hex of the existing cosmetic PIN. */
  pinHash: string;
  /** Called after the correct PIN is entered. */
  onSuccess: () => void;
  /** Called when the user dismisses without entering the correct PIN. */
  onCancel: () => void;
  /** Optional label for the action being unlocked. */
  actionLabel?: string;
}

export function PinGateDialog({ pinHash, onSuccess, onCancel, actionLabel }: PinGateDialogProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const verificationPending = useRef(false);
  const validPin = /^\d{4,6}$/.test(pin);

  // Focus on open and after verification has re-enabled the input for a retry.
  useEffect(() => {
    if (!verifying) inputRef.current?.focus();
  }, [verifying]);

  async function submit() {
    if (verificationPending.current) return;
    if (!validPin) {
      setError('Enter 4–6 digits.');
      return;
    }
    verificationPending.current = true;
    setVerifying(true);
    try {
      const ok = await verifyPin(pin, pinHash);
      if (ok) {
        onSuccess();
      } else {
        setError('Incorrect PIN. Try again.');
        setPin('');
      }
    } finally {
      verificationPending.current = false;
      setVerifying(false);
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-overlay)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-gate-title"
      data-testid="pin-gate-dialog"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !verificationPending.current) {
          e.preventDefault();
          onCancel();
        }
      }}
    >
      <form
        className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-8 shadow-2xl"
        noValidate
        onSubmit={(e) => { e.preventDefault(); void submit(); }}
      >
        {/* Icon + heading */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-base)]">
            <Lock className="h-7 w-7 text-[var(--accent-text)]" aria-hidden="true" />
          </div>
          <h2
            id="pin-gate-title"
            className="text-lg font-semibold text-[var(--text-primary)]"
          >
            Parental PIN required
          </h2>
          {actionLabel && (
            <p className="text-sm text-[var(--text-secondary)]">{actionLabel}</p>
          )}
        </div>

        <div className="mb-4 space-y-2">
          <label htmlFor="pin-gate-input" className="block text-sm text-[var(--text-secondary)]">PIN</label>
          <input
            id="pin-gate-input"
            ref={inputRef}
            type="password"
            inputMode="numeric"
            maxLength={6}
            pattern="[0-9]{4,6}"
            value={pin}
            aria-describedby="pin-gate-help"
            aria-invalid={Boolean(error)}
            className="h-14 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-base)] text-center text-2xl font-bold text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)] focus:ring-offset-2 focus:ring-offset-[var(--bg-elevated)]"
            onChange={(e) => { setPin(e.target.value); setError(''); }}
            disabled={verifying}
            autoComplete="off"
          />
          <p id="pin-gate-help" className="text-sm text-[var(--text-secondary)]">Enter 4–6 digits.</p>
        </div>

        {/* Error */}
        {error && (
          <p
            role="alert"
            className="mb-4 text-center text-sm font-medium text-[var(--danger-color)]"
          >
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            fullWidth
            type="submit"
            disabled={verifying || !validPin}
            aria-busy={verifying}
          >
            {verifying ? 'Verifying…' : 'Unlock'}
          </Button>
          <Button variant="ghost" fullWidth type="button" onClick={onCancel} disabled={verifying}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
