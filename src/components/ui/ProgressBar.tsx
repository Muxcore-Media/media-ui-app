/** Thin accent progress bar used on continue-watching cards and the player scrubber (AGENTS.md §5). */
export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const pct = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  return (
    <div className={`h-1 overflow-hidden rounded-full bg-white/20 ${className || ''}`}>
      <div className="h-full rounded-full bg-[var(--accent-color)]" style={{ width: `${pct}%` }} />
    </div>
  );
}
