import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  icon: LucideIcon
  title?: string
  message: string
  action?: ReactNode
  testId?: string
}

/** Standard empty library/list state (AGENTS.md §12). */
export function EmptyState({ icon: Icon, title, message, action, testId = 'page-empty' }: Props) {
  return (
    <div
      data-testid={testId}
      className="flex flex-col items-center gap-3 rounded-[var(--radius-md)] border border-dashed border-[var(--border-subtle)] px-4 py-14 text-center"
    >
      <Icon className="h-8 w-8 text-[var(--text-tertiary)]" aria-hidden="true" />
      {title ? <p className="font-semibold text-[var(--text-primary)]">{title}</p> : null}
      <p className="max-w-sm text-sm text-[var(--text-secondary)]">{message}</p>
      {action}
    </div>
  )
}
