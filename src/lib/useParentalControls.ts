/**
 * React hook for reading parental prefs and managing the PIN-gate dialog state.
 *
 * Usage:
 *   const { state, requestUnlock, cancelUnlock, onPinSuccess } = useParentalControls();
 *
 * `state.anyRestriction` is true when kids mode or a maxRating ceiling is set.
 * Call `requestUnlock(callback)` to open the PIN dialog; `callback` is invoked
 * if the user supplies the correct PIN.
 */

import { useCallback, useEffect, useState } from 'react';
import { getParentalState, type ParentalState } from './parental';
import { pullUserdataFromServer } from './userdata';

export interface ParentalControlsHandle {
  /** Current parental state (reads from localStorage). */
  state: ParentalState;
  /** True when the PIN dialog is open. */
  pinDialogOpen: boolean;
  /**
   * Request a PIN unlock.  Opens the dialog; `onSuccess` is called if the
   * user provides the correct PIN (or if no PIN is configured).
   */
  requestUnlock: (onSuccess: () => void) => void;
  /** Cancel / close the PIN dialog without granting access. */
  cancelUnlock: () => void;
  /** Called by PinGateDialog when the correct PIN is entered. */
  onPinSuccess: () => void;
  /** Pending success callback (consumed by PinGateDialog via the handle). */
  _pendingCallback: (() => void) | null;
}

export function useParentalControls(): ParentalControlsHandle {
  const [state, setState] = useState<ParentalState>(getParentalState);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  // Re-read prefs whenever a BFF pull may have refreshed them.
  useEffect(() => {
    let mounted = true;
    pullUserdataFromServer().then(() => {
      if (mounted) setState(getParentalState());
    }).catch(() => { /* soft-fail */ });
    return () => { mounted = false; };
  }, []);

  const requestUnlock = useCallback((onSuccess: () => void) => {
    const current = getParentalState();
    setState(current);
    if (!current.pinEnabled || !current.pinHash) {
      // No PIN required — grant access immediately.
      onSuccess();
      return;
    }
    setPendingCallback(() => onSuccess);
    setPinDialogOpen(true);
  }, []);

  const cancelUnlock = useCallback(() => {
    setPinDialogOpen(false);
    setPendingCallback(null);
  }, []);

  const onPinSuccess = useCallback(() => {
    setPinDialogOpen(false);
    const cb = pendingCallback;
    setPendingCallback(null);
    cb?.();
  }, [pendingCallback]);

  return {
    state,
    pinDialogOpen,
    requestUnlock,
    cancelUnlock,
    onPinSuccess,
    _pendingCallback: pendingCallback,
  };
}
