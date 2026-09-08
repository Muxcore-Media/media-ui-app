import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emitPlaybackSession, nativePlaybackSessionId } from './playback-session';

const reportPlaybackSession = vi.fn();

vi.mock('../api/client', () => ({
  reportPlaybackSession: (...args: unknown[]) => reportPlaybackSession(...args),
}));

describe('nativePlaybackSessionId', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('reuses the same id for a title in this tab', () => {
    const a = nativePlaybackSessionId('m1');
    const b = nativePlaybackSessionId('m1');
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(8);
    expect(nativePlaybackSessionId('m2')).not.toBe(a);
  });
});

describe('emitPlaybackSession', () => {
  beforeEach(() => {
    sessionStorage.clear();
    reportPlaybackSession.mockReset();
    reportPlaybackSession.mockResolvedValue({ accepted: true, forwarded: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('posts started/progress/stopped to the BFF', async () => {
    await emitPlaybackSession({
      eventType: 'started',
      mediaId: 'm1',
      title: 'Dune',
      mediaType: 'movie',
      positionSec: 12.4,
      durationSec: 7200,
      isTranscode: true,
    });
    expect(reportPlaybackSession).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'started',
        media_id: 'm1',
        title: 'Dune',
        media_type: 'movie',
        position_seconds: 12,
        duration_seconds: 7200,
        is_transcode: true,
        player: 'media-ui',
      }),
    );
    const sessionId = reportPlaybackSession.mock.calls[0][0].session_id as string;
    expect(sessionId).toBe(nativePlaybackSessionId('m1'));
  });

  it('swallows monitor errors', async () => {
    reportPlaybackSession.mockRejectedValueOnce(new Error('offline'));
    await expect(emitPlaybackSession({ eventType: 'stopped', mediaId: 'm1' })).resolves.toBe(false);
  });

  it('signals a remote household kick', async () => {
    reportPlaybackSession.mockResolvedValueOnce({ accepted: true, forwarded: true, stopped: true });
    await expect(emitPlaybackSession({ eventType: 'progress', mediaId: 'm1' })).resolves.toBe(true);
  });
});
