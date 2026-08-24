import { X } from 'lucide-react'
import { KEYBOARD_SHORTCUTS } from './hooks/useKeyboardShortcuts'

type Props = {
  onClose: () => void
}

/** On-screen keyboard shortcut reference, toggled with "?". */
export default function ShortcutsHelp({ onClose }: Props) {
  return (
    <div
      className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-[var(--player-scrim)] p-4"
      data-testid="player-shortcuts-help"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-[var(--player-chip-border)] bg-[var(--player-panel-bg)] p-5 shadow-2xl backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--player-fg)]">Keyboard shortcuts</h2>
          <button
            type="button"
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--player-fg-muted)] hover:bg-[var(--player-chip-hover)]"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <ul className="max-h-[60vh] space-y-1.5 overflow-y-auto text-sm">
          {KEYBOARD_SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between gap-4">
              <span className="text-[var(--player-fg-muted)]">{s.description}</span>
              <kbd className="rounded border border-[var(--player-chip-border)] bg-[var(--player-chip-bg)] px-2 py-0.5 text-xs font-medium text-[var(--player-fg)]">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
