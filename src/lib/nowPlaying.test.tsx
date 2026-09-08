import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NowPlayingProvider, nowPlayingMediaType, useNowPlaying, type NowPlayingTrack } from './nowPlaying';

const emitPlaybackSession = vi.fn();
vi.mock('./playback-session', () => ({
  emitPlaybackSession: (...args: unknown[]) => emitPlaybackSession(...args),
}));

const sample: NowPlayingTrack = {
  id: 't1',
  src: '/stream/t1',
  title: 'Hyperballad',
  artistName: 'Björk',
  href: '/music/ar1',
};

const sampleB: NowPlayingTrack = {
  id: 't2',
  src: '/stream/t2',
  title: 'Jóga',
  artistName: 'Björk',
};

function Probe() {
  const { track, playing, play, pause, toggle, next, prev, stop } = useNowPlaying();
  return (
    <div>
      <p data-testid="np-title">{track?.title ?? 'none'}</p>
      <p data-testid="np-playing">{playing ? 'on' : 'off'}</p>
      <button type="button" onClick={() => play(sample, [sample, sampleB])}>
        play
      </button>
      <button type="button" onClick={pause}>
        pause
      </button>
      <button type="button" onClick={() => toggle(sample)}>
        toggle
      </button>
      <button type="button" onClick={next}>
        next
      </button>
      <button type="button" onClick={prev}>
        prev
      </button>
      <button type="button" onClick={stop}>
        stop
      </button>
    </div>
  );
}

describe('nowPlayingMediaType', () => {
  it('classifies audiobook hrefs', () => {
    expect(nowPlayingMediaType({ href: '/audiobooks/ab1' })).toBe('audiobook');
    expect(nowPlayingMediaType({ href: '/music/ar1' })).toBe('music');
    expect(nowPlayingMediaType({ mediaType: 'audiobook', href: '/music/x' })).toBe('audiobook');
  });
});

describe('NowPlayingProvider', () => {
  it('plays, pauses, toggles the same track, and stops', async () => {
    emitPlaybackSession.mockReset();
    const user = userEvent.setup();
    render(
      <NowPlayingProvider>
        <Probe />
      </NowPlayingProvider>,
    );

    expect(screen.getByTestId('np-title')).toHaveTextContent('none');
    await user.click(screen.getByRole('button', { name: 'play' }));
    expect(screen.getByTestId('np-title')).toHaveTextContent('Hyperballad');
    expect(screen.getByTestId('np-playing')).toHaveTextContent('on');

    await user.click(screen.getByRole('button', { name: 'pause' }));
    expect(screen.getByTestId('np-playing')).toHaveTextContent('off');
    expect(screen.getByTestId('np-title')).toHaveTextContent('Hyperballad');

    await user.click(screen.getByRole('button', { name: 'toggle' }));
    expect(screen.getByTestId('np-playing')).toHaveTextContent('on');
    await user.click(screen.getByRole('button', { name: 'toggle' }));
    expect(screen.getByTestId('np-playing')).toHaveTextContent('off');

    await user.click(screen.getByRole('button', { name: 'next' }));
    expect(screen.getByTestId('np-title')).toHaveTextContent('Jóga');
    await user.click(screen.getByRole('button', { name: 'prev' }));
    expect(screen.getByTestId('np-title')).toHaveTextContent('Hyperballad');

    await user.click(screen.getByRole('button', { name: 'stop' }));
    expect(screen.getByTestId('np-title')).toHaveTextContent('none');
    expect(screen.getByTestId('np-playing')).toHaveTextContent('off');
    expect(emitPlaybackSession).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'started', mediaId: 't1', mediaType: 'music' }),
    );
    expect(emitPlaybackSession).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'stopped', mediaId: 't1', mediaType: 'music' }),
    );
  });
});
