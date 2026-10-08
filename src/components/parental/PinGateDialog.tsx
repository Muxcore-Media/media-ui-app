/**
 * PIN gate dialog — shown when the user attempts an action that requires
 * parental-PIN verification (unlocking a restricted title or exiting kids mode).
 *
 * Renders a 4-digit PIN entry using individual focusable digit inputs for
 * accessible, TV-remote-compatible interaction.
 */

import { useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '../ui/Button';
import { verifyPin } from '../../lib/parental';

export interface PinGateDialogProps {
  /** SHA-256 hex of the admin-set PIN. */
  pinHash: string;
  /** Called after the correct PIN is entered. */
  onSuccess: () => void;
  /** Called when the user dismisses without entering the correct PIN. */
  onCancel: () => void;
  /** Optional label for the action being unlocked. */
  actionLabel?: string;
}

const PIN_LENGTH = 4;

export function PinGateDialog({ pinHash, onSuccess, onCancel, actionLabel }: PinGateDialogProps) {
  const [digits, setDigits] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus the first empty input on mount.
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function handleDigitChange(idx: number, value: string) {
    const char = value.replace(/\D/g, '').slice(-1);
    if (!char) return;
    const next = [...digits];
    next[idx] = char;
    setDigits(next);
    setError('');
    if (idx < PIN_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus();
    } else {
      // Last digit filled — auto-submit.
      void submit(next);
    }
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...digits];
      if (next[idx]) {
        next[idx] = '';
        setDigits(next);
      } else if (idx > 0) {
        next[idx - 1] = '';
        setDigits(next);
        inputRefs.current[idx - 1]?.focus();
      }
      setError('');
    } else if (e.key === 'Escape') {
      onCancel();
    }
  }

  async function submit(pin = digits) {
    const code = pin.join('');
    if (code.length < PIN_LENGTH) {
      setError('Enter all 4 digits.');
      return;
    }
    setVerifying(true);
    try {
      const ok = await verifyPin(code, pinHash);
      if (ok) {
        onSuccess();
      } else {
        setError('Incorrect PIN. Try again.');
        setDigits(Array(PIN_LENGTH).fill(''));
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
      }
    } finally {
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
    >
      <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-8 shadow-2xl">
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

        {/* 4-digit inputs */}
        <div className="mb-4 flex justify-center gap-3" role="group" aria-label="PIN entry">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              aria-label={`PIN digit ${i + 1}`}
              className="h-14 w-12 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-base)] text-center text-2xl font-bold text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)] focus:ring-offset-2 focus:ring-offset-[var(--bg-elevated)]"
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={verifying}
              autoComplete="off"
            />
          ))}
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
            onClick={() => void submit()}
            disabled={verifying || digits.some((d) => !d)}
            aria-busy={verifying}
          >
            {verifying ? 'Verifying…' : 'Unlock'}
          </Button>
          <Button variant="ghost" fullWidth onClick={onCancel} disabled={verifying}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
