import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  'aria-label': string
  size?: 'sm' | 'md' | 'lg'
  active?: boolean
}

const sizeClass = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
}

/** Circular icon-only control used in nav, cards, and the player OSD. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, size = 'md', active, className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'inline-flex items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated-2)] hover:text-[var(--text-primary)]',
        active && 'bg-[var(--bg-elevated-2)] text-[var(--accent-color)]',
        sizeClass[size],
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  )
})
