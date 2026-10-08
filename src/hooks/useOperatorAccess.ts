import { useSyncExternalStore } from 'react';
import { canManageLibrary, canManageRootFolder, getSessionSnapshot, subscribeSession } from '../lib/session';

/** Presentation only: App refreshes identity; the BFF authorizes every mutation. */
export function useOperatorAccess() {
  const { roles } = useSyncExternalStore(subscribeSession, getSessionSnapshot, getSessionSnapshot);
  return {
    canOperate: canManageLibrary([...roles]),
    canChangeRoot: canManageRootFolder([...roles]),
  };
}
