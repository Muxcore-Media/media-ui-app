import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Tone = 'accent' | 'neutral' | 'success' | 'warning' | 'danger';

const toneClass: Record<Tone, string> = {
  accent: 'bg-[var(--accent-color)] text-black',
  neutral: 'bg-[var(--bg-overlay)] text-[var(--text-primary)] border border-white/15 backdrop-blur',
  success: 'bg-[var(--success)] text-black',
  warning: 'bg-[var(--warning)] text-black',
  danger: 'bg-[var(--danger-surface)] text-[var(--text-on-danger)]',
};

/** Small consistent badge for "Ready", content ratings, and score chips (AGENTS.md §5). */
export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
