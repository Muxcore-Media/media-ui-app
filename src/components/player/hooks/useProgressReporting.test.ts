import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useProgressReporting } from './useProgressReporting';

const emitPlaybackSession = vi.fn();
const upsertProgress = vi.fn();

vi.mock('../../../lib/playback-session', () => ({
  emitPlaybackSession: (...args: unknown[]) => emitPlaybackSession(...args),
}));

vi.mock('../../../lib/userdata', () => ({
  upsertProgress: (...args: unknown[]) => upsertProgress(...args),
}));

const base = {
  mediaId: 'm1',
  mediaKind: 'movie' as const,
  title: 'Dune',
  href: '/movies/m1',
  src: '/stream/movies/m1',
  enabled: true,
  playing: false,
  positionSec: 10,
  durationSec: 7200,
};

describe('useProgressReporting', () => {
  beforeEach(() => {
    emitPlaybackSession.mockReset();
    upsertProgress.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('emits started then stopped around a play session', () => {
    const { rerender, unmount } = renderHook(
      (props: typeof base) => useProgressReporting(props),
      { initialProps: base },
    );
    expect(emitPlaybackSession).not.toHaveBeenCalled();

    act(() => {
      rerender({ ...base, playing: true });
    });
    expect(emitPlaybackSession).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'started', mediaId: 'm1', title: 'Dune' }),
    );

    act(() => {
      rerender({ ...base, playing: false, positionSec: 40 });
    });
    expect(emitPlaybackSession).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'stopped', positionSec: 40 }),
    );

    unmount();
  });
});
