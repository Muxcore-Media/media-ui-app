import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useKeyboardShortcuts, type KeyboardShortcutHandlers } from './useKeyboardShortcuts';

function handlers(overrides: Partial<KeyboardShortcutHandlers> = {}): KeyboardShortcutHandlers {
  return {
    enabled: true,
    togglePlay: vi.fn(),
    seekBy: vi.fn(),
    seekToFraction: vi.fn(),
    volumeBy: vi.fn(),
    toggleMute: vi.fn(),
    toggleFullscreen: vi.fn(),
    toggleTheater: vi.fn(),
    togglePiP: vi.fn(),
    toggleSubtitles: vi.fn(),
    nudgeSubtitleOffset: vi.fn(),
    nudgeAudioOffset: vi.fn(),
    cycleSpeed: vi.fn(),
    skipActiveSegment: vi.fn(),
    toggleHelp: vi.fn(),
    closeOverlays: vi.fn(),
    anyOverlayOpen: false,
    ...overrides,
  };
}

function Fixture({ shortcuts, activate, label = 'Settings' }: {
  shortcuts: KeyboardShortcutHandlers;
  activate: () => void;
  label?: string;
}) {
  useKeyboardShortcuts(shortcuts);
  return (
    <>
      <button type="button" onClick={activate}>{label}</button>
      <input aria-label="Text input" />
      <textarea aria-label="Text area" />
      <select aria-label="Select"><option>First</option><option>Second</option></select>
    </>
  );
}

describe('player shortcuts and native button activation', () => {
  it.each(['Settings', 'Mute'])('lets Space activate the focused %s button once without toggling playback', async (label) => {
    const shortcuts = handlers();
    const activate = vi.fn();
    const user = userEvent.setup();
    render(<Fixture shortcuts={shortcuts} activate={activate} label={label} />);
    await user.tab();
    expect(screen.getByRole('button', { name: label })).toHaveFocus();
    await user.keyboard('[Space]');
    expect.soft(activate).toHaveBeenCalledTimes(1);
    expect.soft(shortcuts.togglePlay).not.toHaveBeenCalled();
  });

  it('retains native Enter activation once without toggling playback', async () => {
    const shortcuts = handlers();
    const activate = vi.fn();
    const user = userEvent.setup();
    render(<Fixture shortcuts={shortcuts} activate={activate} />);
    await user.tab();
    await user.keyboard('[Enter]');
    expect(activate).toHaveBeenCalledTimes(1);
    expect(shortcuts.togglePlay).not.toHaveBeenCalled();
  });

  it('does not prevent the native button Space default', () => {
    const shortcuts = handlers();
    render(<Fixture shortcuts={shortcuts} activate={vi.fn()} />);
    expect(fireEvent.keyDown(screen.getByRole('button', { name: 'Settings' }), {
      key: ' ', code: 'Space', cancelable: true,
    })).toBe(true);
    expect(shortcuts.togglePlay).not.toHaveBeenCalled();
  });

  it('retains K and arrow seek shortcuts while a button is focused', async () => {
    const shortcuts = handlers();
    const activate = vi.fn();
    const user = userEvent.setup();
    render(<Fixture shortcuts={shortcuts} activate={activate} />);
    await user.tab();
    await user.keyboard('k[ArrowRight][ArrowLeft]');
    expect(shortcuts.togglePlay).toHaveBeenCalledTimes(1);
    expect(shortcuts.seekBy).toHaveBeenNthCalledWith(1, 10);
    expect(shortcuts.seekBy).toHaveBeenNthCalledWith(2, -10);
    expect(activate).not.toHaveBeenCalled();
  });

  it('keeps global Space and K play shortcuts away from a focused button', async () => {
    const shortcuts = handlers();
    const user = userEvent.setup();
    render(<Fixture shortcuts={shortcuts} activate={vi.fn()} />);
    expect(document.activeElement).toBe(document.body);
    await user.keyboard('[Space]');
    expect(shortcuts.togglePlay).toHaveBeenCalledTimes(1);
    await user.keyboard('k');
    expect(shortcuts.togglePlay).toHaveBeenCalledTimes(2);
  });

  it.each(['disabled', 'overlay'] as const)('retains native button Space when shortcuts are %s', async (state) => {
    const shortcuts = handlers({ enabled: state !== 'disabled', anyOverlayOpen: state === 'overlay' });
    const activate = vi.fn();
    const user = userEvent.setup();
    render(<Fixture shortcuts={shortcuts} activate={activate} />);
    await user.tab();
    await user.keyboard('[Space]');
    expect(activate).toHaveBeenCalledTimes(1);
    expect(shortcuts.togglePlay).not.toHaveBeenCalled();
  });

  it('leaves input, textarea and select Space events alone', () => {
    const shortcuts = handlers();
    render(<Fixture shortcuts={shortcuts} activate={vi.fn()} />);
    for (const label of ['Text input', 'Text area', 'Select']) {
      expect(fireEvent.keyDown(screen.getByLabelText(label), { key: ' ', code: 'Space' })).toBe(true);
    }
    expect(shortcuts.togglePlay).not.toHaveBeenCalled();
  });
});
