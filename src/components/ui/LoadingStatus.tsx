type Props = {
  label: string
}

/** Screen-reader-only loading announcement (WCAG 4.1.3 status messages). */
export function LoadingStatus({ label }: Props) {
  return (
    <p role="status" aria-live="polite" aria-label={label} className="sr-only">
      {label}
    </p>
  )
}
