import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { ProgressBar } from '../ui/ProgressBar';

/** Compact card for Continue Watching / Next Up / Recently Watched rows — poster + optional progress bar + subtitle. */
export function ProgressCard({
  title,
  subtitle,
  posterUrl,
  href,
  progressPct,
  ariaLabel,
}: {
  title: string;
  subtitle?: string;
  posterUrl?: string;
  href: string;
  progressPct?: number;
  /** Override the default "Resume <title>" aria-label (e.g. for watched items). */
  ariaLabel?: string;
}) {
  const label = subtitle ? `${title}, ${subtitle}` : title;

  return (
    <Link
      to={href}
      aria-label={ariaLabel ?? `Resume ${label}`}
      className="group block rounded-[var(--radius-md)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
    >
      <div className="motion-safe-hover-lift relative aspect-[2/3] overflow-hidden rounded-[var(--radius-md)] bg-[var(--bg-elevated-2)] shadow-md group-hover:shadow-2xl">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt=""
            className="motion-safe-scale h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[var(--bg-elevated-2)] to-[var(--bg-elevated)]" />
        )}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[var(--scrim-overlay)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-contrast)] text-[var(--text-on-accent)] shadow-lg"
            aria-hidden="true"
          >
            <Play className="h-4 w-4 fill-current" />
          </span>
        </div>
        {typeof progressPct === 'number' && (
          <div className="absolute inset-x-0 bottom-0 px-1.5 pb-1.5">
            <ProgressBar value={progressPct} />
          </div>
        )}
      </div>
      <div className="space-y-0.5 pt-2">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)] transition group-hover:text-[var(--accent-color)] group-focus-visible:text-[var(--accent-color)]">
          {title}
        </h3>
        {subtitle && <p className="text-xs text-[var(--text-tertiary)]">{subtitle}</p>}
      </div>
    </Link>
  );
}
