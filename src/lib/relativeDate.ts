/** Relative "Added … ago" labels for recently-imported library rows (AGENTS.md §4). */
export function formatAddedRelative(createdAt: string, nowMs = Date.now()): string {
  const t = Date.parse(createdAt);
  if (!Number.isFinite(t)) return '';
  const diffSec = Math.max(0, Math.floor((nowMs - t) / 1000));
  if (diffSec < 45) return 'Added just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Added ${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Added ${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 14) return `Added ${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 8) return `Added ${diffWeek} week${diffWeek === 1 ? '' : 's'} ago`;
  return `Added ${new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}
