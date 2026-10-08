import { useSyncExternalStore } from 'react';
import { canChangeRootFolder, canOperateLibrary, getSessionSnapshot, subscribeSession } from '../lib/session';

export type OperatorAccess = Readonly<{
  /** admin or manager: may use the state-changing operator controls (T-M5-12). */
  canOperate: boolean;
  /** admin only: may change a library item's root folder. */
  canChangeRoot: boolean;
}>;

/**
 * Presentation-only view of the cached household roles. It re-renders when the identity refresh,
 * a 403 `operator.*` correction, sign-out, or another tab changes the roles. The BFF enforces the
 * same rule on every request, so this only decides which controls to offer.
 */
export function useOperatorAccess(): OperatorAccess {
  const { roles } = useSyncExternalStore(subscribeSession, getSessionSnapshot, getSessionSnapshot);
  return { canOperate: canOperateLibrary(roles), canChangeRoot: canChangeRootFolder(roles) };
}
