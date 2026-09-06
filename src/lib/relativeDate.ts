/**
 * Format seconds remaining as a human-readable string — e.g. "1h 40m left",
 * "22 min left". Returns null when duration is unknown or under one minute.
 */
export function formatTimeRemaining(positionSec: number, durationSec: number): string | null {
  if (durationSec <= 0) return null;
  const remainingSec = Math.max(0, durationSec - positionSec);
  if (remainingSec < 60) return null;
  const totalMin = Math.round(remainingSec / 60);
  if (totalMin < 60) return `${totalMin} min left`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return mins > 0 ? `${hours}h ${mins}m left` : `${hours}h left`;
}

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
