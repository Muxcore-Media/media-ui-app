import { Link } from 'react-router-dom';
import { ArrowLeft, Info, Keyboard, ListVideo } from 'lucide-react';

type Props = {
  href: string;
  title: string;
  metaLine: string | null;
  showEpisodesButton: boolean;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  statsVisible: boolean;
  onToggleStats: () => void;
  onShowShortcuts: () => void;
  visible: boolean;
};

export default function TopBar({
  href,
  title,
  metaLine,
  showEpisodesButton,
  drawerOpen,
  onToggleDrawer,
  statsVisible,
  onToggleStats,
  onShowShortcuts,
  visible,
}: Props) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-[var(--player-bar-top-from)] via-[var(--player-bar-top-via)] to-transparent px-4 pb-10 pt-4 transition-opacity duration-300 sm:px-6 ${visible ? 'opacity-100' : 'opacity-0'}`}
      data-testid="player-top-bar"
    >
      <div className="pointer-events-auto flex items-center gap-3">
        <Link
          to={href}
          aria-label="Back"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--player-fg)] transition hover:bg-[var(--player-chip-hover)]"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-[var(--player-fg)] sm:text-lg">
            {title}
          </h1>
          {metaLine ? <p className="text-xs text-[var(--player-fg-muted)]">{metaLine}</p> : null}
        </div>
        <button
          type="button"
          aria-label="Keyboard shortcuts"
          className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--player-fg)] transition hover:bg-[var(--player-chip-hover)] sm:flex"
          onClick={onShowShortcuts}
        >
          <Keyboard className="h-4.5 w-4.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Playback stats"
          aria-pressed={statsVisible}
          className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:bg-[var(--player-chip-hover)] sm:flex ${statsVisible ? 'text-[var(--accent-color)]' : 'text-[var(--player-fg)]'}`}
          onClick={onToggleStats}
        >
          <Info className="h-4.5 w-4.5" aria-hidden="true" />
        </button>
        {showEpisodesButton ? (
          <button
            type="button"
            aria-label="Episodes"
            aria-expanded={drawerOpen}
            className="flex h-10 items-center gap-2 rounded-full border border-[var(--player-chip-border)] bg-[var(--player-chip-bg)] px-3 text-sm text-[var(--player-fg)] transition hover:bg-[var(--player-chip-hover)]"
            onClick={onToggleDrawer}
          >
            <ListVideo className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Episodes</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
