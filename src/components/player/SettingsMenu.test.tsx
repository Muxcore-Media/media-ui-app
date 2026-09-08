import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SettingsMenu, { type SkipPointsEditor } from './SettingsMenu';
import type { UserPreferences } from '../../lib/userdata';

const subtitlePrefs: UserPreferences['subtitles'] = {
  enabled: true,
  language: 'eng',
  textSize: 'md',
  backgroundOpacity: 40,
  edgeStyle: 'drop-shadow',
  verticalPosition: 'bottom',
  offsetMs: 0,
  textColor: '#ffffff',
};

function renderMenu(skipPoints?: SkipPointsEditor) {
  return render(
    <SettingsMenu
      onClose={() => undefined}
      playMode="direct"
      transcoderAvailable={false}
      quality="original"
      qualityOptions={[{ id: 'original', label: 'Original' }]}
      onQuality={() => undefined}
      audioTracks={[{ id: 'a0', label: 'Default', kind: 'audio', index: 0 }]}
      audioIdx={0}
      onAudio={() => undefined}
      textTracks={[]}
      textIdx={-1}
      onText={() => undefined}
      rate={1}
      onRate={() => undefined}
      subtitlePrefs={subtitlePrefs}
      onSubtitlePrefs={() => undefined}
      audioOffsetMs={0}
      onAudioOffset={() => undefined}
      aspectMode="contain"
      onAspectMode={() => undefined}
      skipPoints={skipPoints}
    />,
  );
}

describe('SettingsMenu skip points', () => {
  it('hides skip points unless an editor is provided', () => {
    renderMenu();
    expect(screen.queryByText('Skip points')).not.toBeInTheDocument();
  });

  it('marks intro and outro from the current position', () => {
    const onMarkIntroEnd = vi.fn();
    const onMarkOutroStart = vi.fn();
    const onClear = vi.fn();
    renderMenu({
      currentSec: 82,
      durationSec: 1200,
      segments: [],
      busy: false,
      error: null,
      onMarkIntroEnd,
      onMarkOutroStart,
      onClear,
    });

    fireEvent.click(screen.getByText('Skip points'));
    expect(screen.getByTestId('player-skip-points')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('player-mark-intro'));
    fireEvent.click(screen.getByTestId('player-mark-outro'));
    expect(onMarkIntroEnd).toHaveBeenCalled();
    expect(onMarkOutroStart).toHaveBeenCalled();
  });
});
