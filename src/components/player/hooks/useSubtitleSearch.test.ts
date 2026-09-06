import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSubtitleSearch } from './useSubtitleSearch';

function mockFetch(
  handler: (url: string) => { ok: boolean; status?: number; body: unknown },
) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      const { ok, status = ok ? 200 : 500, body } = handler(url);
      return Promise.resolve({
        ok,
        status,
        statusText: ok ? 'OK' : 'Error',
        json: () => Promise.resolve(body),
      });
    }),
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useSubtitleSearch – search()', () => {
  it('transitions idle → searching → done with results', async () => {
    mockFetch(() => ({
      ok: true,
      body: {
        available: true,
        results: [
          { id: 'sub1', provider: 'opensubtitles', title: 'Interstellar', language: 'en', format: 'srt' },
        ],
      },
    }));

    const { result } = renderHook(() => useSubtitleSearch());
    expect(result.current.status).toBe('idle');

    await act(async () => {
      await result.current.search({ title: 'Interstellar', language: 'en' });
    });

    expect(result.current.status).toBe('done');
    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe('sub1');
    expect(result.current.error).toBeNull();
  });

  it('sets status to unavailable when available=false in response', async () => {
    mockFetch(() => ({
      ok: true,
      body: { available: false, results: [] },
    }));

    const { result } = renderHook(() => useSubtitleSearch());

    await act(async () => {
      await result.current.search({ title: 'Anything', language: 'en' });
    });

    expect(result.current.status).toBe('unavailable');
    expect(result.current.results).toHaveLength(0);
  });

  it('sets status to unavailable on 503 HTTP error', async () => {
    mockFetch(() => ({
      ok: false,
      status: 503,
      body: { error: 'Service Unavailable' },
    }));

    const { result } = renderHook(() => useSubtitleSearch());

    await act(async () => {
      await result.current.search({ title: 'Anything', language: 'en' });
    });

    expect(result.current.status).toBe('unavailable');
  });

  it('sets status to unavailable on 404 (module not installed)', async () => {
    mockFetch(() => ({
      ok: false,
      status: 404,
      body: { error: 'Not Found' },
    }));

    const { result } = renderHook(() => useSubtitleSearch());

    await act(async () => {
      await result.current.search({ title: 'Anything', language: 'en' });
    });

    expect(result.current.status).toBe('unavailable');
  });

  it('sets status to error on unexpected server failure', async () => {
    mockFetch(() => ({
      ok: false,
      status: 500,
      body: { error: 'Internal Server Error' },
    }));

    const { result } = renderHook(() => useSubtitleSearch());

    await act(async () => {
      await result.current.search({ title: 'Anything', language: 'en' });
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBeTruthy();
  });

  it('returns empty results list when search finds nothing', async () => {
    mockFetch(() => ({
      ok: true,
      body: { available: true, results: [] },
    }));

    const { result } = renderHook(() => useSubtitleSearch());

    await act(async () => {
      await result.current.search({ title: 'UnknownTitle9999', language: 'zh' });
    });

    expect(result.current.status).toBe('done');
    expect(result.current.results).toHaveLength(0);
  });
});

describe('useSubtitleSearch – download()', () => {
  it('returns a PlaybackSubtitleTrack and sets downloadedId on success', async () => {
    mockFetch((url) => {
      if (url.includes('/api/subtitles/search')) {
        return {
          ok: true,
          body: {
            available: true,
            results: [
              { id: 'sub1', provider: 'opensubtitles', title: 'The Matrix', language: 'en', format: 'srt' },
            ],
          },
        };
      }
      if (url.includes('/api/subtitles/download')) {
        return {
          ok: true,
          body: { track_url: '/api/subtitles/files/sub1.vtt', language: 'en', label: 'English' },
        };
      }
      return { ok: true, body: {} };
    });

    const { result } = renderHook(() => useSubtitleSearch());

    await act(async () => {
      await result.current.search({ title: 'The Matrix', language: 'en' });
    });
    expect(result.current.status).toBe('done');

    let track: Awaited<ReturnType<typeof result.current.download>> = null;
    await act(async () => {
      track = await result.current.download('sub1', 'opensubtitles');
    });

    expect(track).not.toBeNull();
    expect(track!.src).toBe('/api/subtitles/files/sub1.vtt');
    expect(track!.label).toBe('English');
    expect(track!.srclang).toBe('en');
    expect(result.current.downloadedId).toBe('sub1');
    expect(result.current.downloadingId).toBeNull();
  });

  it('returns null and sets error when download fails', async () => {
    mockFetch((url) => {
      if (url.includes('/api/subtitles/download')) {
        return { ok: false, status: 500, body: { error: 'Download failed' } };
      }
      return {
        ok: true,
        body: {
          available: true,
          results: [
            { id: 'sub1', provider: 'opensubtitles', title: 'Test', language: 'en', format: 'srt' },
          ],
        },
      };
    });

    const { result } = renderHook(() => useSubtitleSearch());

    await act(async () => {
      await result.current.search({ title: 'Test', language: 'en' });
    });

    let track: Awaited<ReturnType<typeof result.current.download>> = undefined as never;
    await act(async () => {
      track = await result.current.download('sub1', 'opensubtitles');
    });

    expect(track).toBeNull();
    expect(result.current.downloadingId).toBeNull();
    expect(result.current.error).toBeTruthy();
  });
});

describe('useSubtitleSearch – reset()', () => {
  it('clears results and resets to idle', async () => {
    mockFetch(() => ({
      ok: true,
      body: {
        available: true,
        results: [
          { id: 's1', provider: 'opensubtitles', title: 'Movie', language: 'en', format: 'srt' },
        ],
      },
    }));

    const { result } = renderHook(() => useSubtitleSearch());

    await act(async () => {
      await result.current.search({ title: 'Movie', language: 'en' });
    });
    expect(result.current.status).toBe('done');

    act(() => result.current.reset());

    expect(result.current.status).toBe('idle');
    expect(result.current.results).toHaveLength(0);
    expect(result.current.error).toBeNull();
    expect(result.current.downloadedId).toBeNull();
  });
});
