import { useEffect, useRef } from 'react';

export type KeyboardShortcutHandlers = {
  enabled: boolean;
  togglePlay: () => void;
  seekBy: (deltaSec: number) => void;
  seekToFraction: (fraction: number) => void;
  volumeBy: (delta: number) => void;
  toggleMute: () => void;
  toggleFullscreen: () => void;
  toggleTheater: () => void;
  togglePiP: () => void;
  toggleSubtitles: () => void;
  cycleSpeed: (direction: 1 | -1) => void;
  skipActiveSegment: () => void;
  toggleEpisodeDrawer?: () => void;
  toggleHelp: () => void;
  closeOverlays: () => void;
  anyOverlayOpen: boolean;
};

/** Reference list surfaced by the on-screen keyboard shortcut help overlay. */
export const KEYBOARD_SHORTCUTS: { keys: string; description: string }[] = [
  { keys: 'Space / K', description: 'Play / pause' },
  { keys: '← / J', description: 'Seek back 10s' },
  { keys: '→ / L', description: 'Seek forward 10s' },
  { keys: '↑ / ↓', description: 'Volume up / down' },
  { keys: 'M', description: 'Mute / unmute' },
  { keys: 'F', description: 'Fullscreen' },
  { keys: 'T', description: 'Theater mode' },
  { keys: 'P', description: 'Picture-in-picture' },
  { keys: 'C', description: 'Toggle subtitles' },
  { keys: 'I', description: 'Skip intro / outro / credits' },
  { keys: 'E', description: 'Episodes' },
  { keys: '< / >', description: 'Playback speed' },
  { keys: '0-9', description: 'Jump to 0%-90%' },
  { keys: '?', description: 'Show / hide this help' },
  { keys: 'Esc', description: 'Close menus' },
];

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  // Keep the listener identity stable across renders (handlers is a fresh
  // object every render) by always reading the latest handlers via a ref.
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const h = ref.current;
      if (!h.enabled) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'Escape') {
        if (h.anyOverlayOpen) {
          e.preventDefault();
          h.closeOverlays();
        }
        return;
      }
      if (e.key === '?') {
        e.preventDefault();
        h.toggleHelp();
        return;
      }
      // Leave overlay-specific keys alone once a menu/help/drawer is open.
      if (h.anyOverlayOpen) return;

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          h.togglePlay();
          break;
        case 'ArrowRight':
        case 'KeyL':
          e.preventDefault();
          h.seekBy(10);
          break;
        case 'ArrowLeft':
        case 'KeyJ':
          e.preventDefault();
          h.seekBy(-10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          h.volumeBy(0.05);
          break;
        case 'ArrowDown':
          e.preventDefault();
          h.volumeBy(-0.05);
          break;
        case 'KeyM':
          h.toggleMute();
          break;
        case 'KeyF':
          h.toggleFullscreen();
          break;
        case 'KeyT':
          h.toggleTheater();
          break;
        case 'KeyP':
          h.togglePiP();
          break;
        case 'KeyC':
          h.toggleSubtitles();
          break;
        case 'KeyI':
          h.skipActiveSegment();
          break;
        case 'KeyE':
          h.toggleEpisodeDrawer?.();
          break;
        case 'Comma':
        case 'Period': {
          e.preventDefault();
          h.cycleSpeed(e.code === 'Comma' ? -1 : 1);
          break;
        }
        default:
          if (e.code.startsWith('Digit')) {
            const n = Number(e.code.replace('Digit', ''));
            if (!Number.isNaN(n)) {
              e.preventDefault();
              h.seekToFraction(n / 10);
            }
          }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
