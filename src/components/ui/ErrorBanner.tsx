type Props = {
  message: string
  testId?: string
}

/** Standard inline error for route-level fetch failures (AGENTS.md §12). */
export function ErrorBanner({ message, testId = 'page-error' }: Props) {
  return (
    <p
      role="alert"
      data-testid={testId}
      className="rounded-[var(--radius-md)] border border-[var(--danger-color)]/40 bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--danger-color)]"
    >
      {message}
    </p>
  )
}
