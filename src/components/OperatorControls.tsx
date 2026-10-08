import type { ReactNode } from 'react';
import { useOperatorAccess } from '../hooks/useOperatorAccess';

/** Hide operator affordances as identity changes, without replacing consumer page state. */
export function OperatorControls({ children }: { children: ReactNode }) {
  const { canOperate } = useOperatorAccess();
  return canOperate ? <>{children}</> : null;
}

export function OperatorNotice() {
  const { canOperate } = useOperatorAccess();
  return canOperate ? null : (
    <p className="text-sm text-[var(--text-secondary)]">
      Changes to the shared library require an administrator or manager.
    </p>
  );
}
