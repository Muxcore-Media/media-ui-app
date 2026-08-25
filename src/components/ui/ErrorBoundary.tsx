import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './Button';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

function ErrorFallback() {
  return (
    <div
      role="alert"
      data-testid="render-error"
      className="flex flex-col items-center gap-4 rounded-[var(--radius-md)] border border-[var(--danger-color)]/40 bg-[var(--bg-elevated)] px-4 py-14 text-center"
    >
      <p className="font-semibold text-[var(--text-primary)]">Something went wrong</p>
      <p className="max-w-sm text-sm text-[var(--text-secondary)]">
        This page hit an unexpected error. Try reloading, or go back and try again.
      </p>
      <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
        Reload page
      </Button>
    </div>
  );
}

/** Catches render errors in route content and shows a friendly fallback. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Render error caught by ErrorBoundary:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
