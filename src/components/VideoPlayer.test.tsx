import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VideoPlayer from './VideoPlayer';
import { upsertProgress } from '../lib/userdata';

const RESOLVED_STREAM_URL = '/stream/movies/m1';

function mockJSON(body: unknown, ok = true) {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 400,
    statusText: ok ? 'OK' : 'Bad Request',
    json: () => Promise.resolve(body),
  });
}

function stubFetch(overrides: Record<string, unknown> = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/playback/subtitles')) {
        return mockJSON(overrides.subtitles ?? { tracks: [] });
      }
      if (url.includes('/api/playback/analysis')) {
        return mockJSON(
          overrides.analysis ?? {
            src: '/stream/movies/m1',
            enabled: true,
            info_line: '1080p Remux',
          },
        );
      }
      if (url.includes('/api/playback/segments')) {
        return mockJSON(overrides.segments ?? { media_id: 'm1', segments: [], enabled: true });
      }
      if (url.includes('/api/playback/resolve')) {
        if (overrides.resolveFail) {
          return mockJSON({ error: 'src required', code: 'playback.src_required' }, false);
        }
        return mockJSON(
          overrides.resolve ?? {
            stream_url: RESOLVED_STREAM_URL,
            mode: 'direct',
            resume_enabled: true,
            transcoder_enabled: false,
            prefer_direct_play: true,
            max_bitrate_mbps: '80',
            trickplay_enabled: false,
            transcoder_available: false,
          },
        );
      }
      return mockJSON({});
    }),
  );
}

/** Waits for the async playback-resolve round trip to finish and the real
 * <video> element (with its resolved src) to be mounted, since the video
 * element itself unmounts/remounts around the loading transition. */
async function waitForResolvedVideo(expectedSrc = RESOLVED_STREAM_URL): Promise<HTMLVideoElement> {
  await waitFor(() => {
    const video = document.querySelector('video');
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute('src', expectedSrc);
  });
  return document.querySelector('video') as HTMLVideoElement;
}

/** jsdom video elements don't naturally load metadata; fake it. */
function fireLoadedMetadata(video: HTMLVideoElement, duration: number) {
  Object.defineProperty(video, 'duration', { value: duration, configurable: true });
  fireEvent(video, new Event('loadedmetadata'));
}

beforeEach(() => {
  localStorage.clear();
  stubFetch();
});

describe('VideoPlayer empty shell', () => {
  it('renders empty-state copy when src is blank', () => {
    render(
      <MemoryRouter>
        <VideoPlayer src="" title="Anything" />
      </MemoryRouter>,
    );
    expect(screen.getByText(/isn't available to play/i)).toBeInTheDocument();
    expect(document.querySelector('video')).toBeNull();
  });
});

describe('VideoPlayer OSD', () => {
  it('renders immersive overlay controls when src is set', async () => {
    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />
      </MemoryRouter>,
    );
    await waitForResolvedVideo();
    expect(screen.getByTestId('player-osd')).toBeInTheDocument();
    expect(screen.getByTestId('player-seek')).toBeInTheDocument();
    expect(screen.getByTestId('player-top-bar')).toBeInTheDocument();
  });

  it('opens the settings menu with quality, audio, subtitles and speed entries', async () => {
    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />
      </MemoryRouter>,
    );
    await waitForResolvedVideo();

    fireEvent.click(screen.getByLabelText('Settings'));
    const menu = screen.getByTestId('player-settings-menu');
    expect(within(menu).getByText('Quality')).toBeInTheDocument();
    expect(within(menu).getByText('Audio')).toBeInTheDocument();
    expect(within(menu).getByText('Subtitles')).toBeInTheDocument();
    expect(within(menu).getByText('Speed')).toBeInTheDocument();

    fireEvent.click(within(menu).getByText('Speed'));
    expect(within(menu).getByText('1× (Normal)')).toBeInTheDocument();
  });

  it('shows friendly message and a retry action when playback resolve fails', async () => {
    stubFetch({ resolveFail: true });

    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" href="/movies" />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/isn't available to play/i)).toBeInTheDocument();
    });
    expect(document.querySelector('video')).toBeNull();
    expect(screen.getByRole('link', { name: 'Go back' })).toHaveAttribute('href', '/movies');
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('prompts to resume from saved progress and seeks on confirmation', async () => {
    upsertProgress({
      id: 'm1',
      kind: 'movie',
      title: 'Test',
      href: '/movies/m1',
      positionSec: 120,
      durationSec: 600,
    });

    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />
      </MemoryRouter>,
    );
    const video = await waitForResolvedVideo();
    fireLoadedMetadata(video, 600);

    await waitFor(() => expect(screen.getByTestId('player-resume-dialog')).toBeInTheDocument());
    expect(screen.getByText(/Resume from/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(video.currentTime).toBe(120);
    expect(screen.queryByTestId('player-resume-dialog')).not.toBeInTheDocument();
  });

  it('does not prompt to resume when there is no saved progress', async () => {
    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />
      </MemoryRouter>,
    );
    const video = await waitForResolvedVideo();
    fireLoadedMetadata(video, 600);
    expect(screen.queryByTestId('player-resume-dialog')).not.toBeInTheDocument();
  });

  it('shows a skip button while an intro segment is active', async () => {
    stubFetch({
      segments: {
        media_id: 'm1',
        enabled: true,
        segments: [
          { kind: 'intro', start_seconds: 0, end_seconds: 30, confidence: 0.9, source: 'test' },
        ],
      },
    });

    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />
      </MemoryRouter>,
    );
    const video = await waitForResolvedVideo();
    fireLoadedMetadata(video, 1200);

    await waitFor(() => expect(screen.getByTestId('player-skip-segment')).toBeInTheDocument());
    expect(screen.getByText('Skip Intro')).toBeInTheDocument();
  });

  it('toggles the keyboard shortcuts help overlay with "?" and closes it with Escape', async () => {
    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />
      </MemoryRouter>,
    );
    await waitForResolvedVideo();

    fireEvent.keyDown(window, { key: '?' });
    expect(screen.getByTestId('player-shortcuts-help')).toBeInTheDocument();

    fireEvent.keyDown(window, { code: 'Escape' });
    expect(screen.queryByTestId('player-shortcuts-help')).not.toBeInTheDocument();
  });

  it('seeks forward/back 10s with the L/J keyboard shortcuts', async () => {
    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />
      </MemoryRouter>,
    );
    const video = await waitForResolvedVideo();
    fireLoadedMetadata(video, 600);

    fireEvent.keyDown(window, { code: 'KeyL' });
    expect(video.currentTime).toBe(10);

    fireEvent.keyDown(window, { code: 'KeyJ' });
    expect(video.currentTime).toBe(0);
  });

  it('shows ffprobe quality metadata in the top bar', async () => {
    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />
      </MemoryRouter>,
    );
    await waitForResolvedVideo();
    await waitFor(() => {
      expect(screen.getByText('1080p Remux')).toBeInTheDocument();
    });
  });
});

describe('VideoPlayer subtitle search', () => {
  function stubFetchWithSubtitleSearch(overrides: {
    searchBody?: unknown;
    searchOk?: boolean;
    downloadBody?: unknown;
    downloadOk?: boolean;
  } = {}) {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/subtitles/search')) {
          return Promise.resolve({
            ok: overrides.searchOk ?? true,
            status: overrides.searchOk === false ? 503 : 200,
            statusText: overrides.searchOk === false ? 'Service Unavailable' : 'OK',
            json: () =>
              Promise.resolve(
                overrides.searchBody ?? {
                  available: true,
                  results: [
                    {
                      id: 'sub42',
                      provider: 'opensubtitles',
                      title: 'Test 2024',
                      language: 'en',
                      format: 'srt',
                      release: 'BluRay',
                    },
                  ],
                },
              ),
          });
        }
        if (url.includes('/api/subtitles/download')) {
          return Promise.resolve({
            ok: overrides.downloadOk ?? true,
            status: overrides.downloadOk === false ? 500 : 200,
            statusText: overrides.downloadOk === false ? 'Server Error' : 'OK',
            json: () =>
              Promise.resolve(
                overrides.downloadBody ?? {
                  track_url: '/api/subtitles/files/sub42.vtt',
                  language: 'en',
                  label: 'English',
                },
              ),
          });
        }
        if (url.includes('/api/playback/subtitles')) {
          return Promise.resolve({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve({ tracks: [] }) });
        }
        if (url.includes('/api/playback/analysis')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: () =>
              Promise.resolve({ src: '/stream/movies/m1', enabled: true, info_line: '1080p' }),
          });
        }
        if (url.includes('/api/playback/segments')) {
          return Promise.resolve({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve({ media_id: 'm1', segments: [], enabled: true }) });
        }
        if (url.includes('/api/playback/resolve')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: () =>
              Promise.resolve({
                stream_url: RESOLVED_STREAM_URL,
                mode: 'direct',
                resume_enabled: true,
                transcoder_enabled: false,
                prefer_direct_play: true,
                max_bitrate_mbps: '80',
                trickplay_enabled: false,
                transcoder_available: false,
              }),
          });
        }
        return Promise.resolve({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve({}) });
      }),
    );
  }

  it('shows "Find online" button in the subtitles settings panel', async () => {
    stubFetchWithSubtitleSearch();

    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />
      </MemoryRouter>,
    );
    await waitForResolvedVideo();

    fireEvent.click(screen.getByLabelText('Settings'));
    const menu = screen.getByTestId('player-settings-menu');
    fireEvent.click(within(menu).getByText('Subtitles'));

    expect(within(menu).getByTestId('subtitle-find-online-btn')).toBeInTheDocument();
  });

  it('shows search results after clicking "Find online"', async () => {
    stubFetchWithSubtitleSearch();

    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />
      </MemoryRouter>,
    );
    await waitForResolvedVideo();

    fireEvent.click(screen.getByLabelText('Settings'));
    const menu = screen.getByTestId('player-settings-menu');
    fireEvent.click(within(menu).getByText('Subtitles'));
    fireEvent.click(within(menu).getByTestId('subtitle-find-online-btn'));

    await waitFor(() => {
      expect(within(menu).getByTestId('subtitle-find-results')).toBeInTheDocument();
    });
    expect(within(menu).getByText('Test 2024')).toBeInTheDocument();
  });

  it('auto-selects the track after a successful subtitle download', async () => {
    stubFetchWithSubtitleSearch();

    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />
      </MemoryRouter>,
    );
    await waitForResolvedVideo();

    fireEvent.click(screen.getByLabelText('Settings'));
    const menu = screen.getByTestId('player-settings-menu');
    fireEvent.click(within(menu).getByText('Subtitles'));
    fireEvent.click(within(menu).getByTestId('subtitle-find-online-btn'));

    await waitFor(() => {
      expect(within(menu).getByTestId('subtitle-find-results')).toBeInTheDocument();
    });

    fireEvent.click(within(menu).getByLabelText(/Download Test 2024/i));

    await waitFor(() => {
      expect(within(menu).queryByTestId('subtitle-find-results')).not.toBeNull();
    });
  });

  it('shows unavailable message when subtitle module is absent (503)', async () => {
    stubFetchWithSubtitleSearch({ searchOk: false });

    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />
      </MemoryRouter>,
    );
    await waitForResolvedVideo();

    fireEvent.click(screen.getByLabelText('Settings'));
    const menu = screen.getByTestId('player-settings-menu');
    fireEvent.click(within(menu).getByText('Subtitles'));
    fireEvent.click(within(menu).getByTestId('subtitle-find-online-btn'));

    await waitFor(() => {
      expect(within(menu).getByTestId('subtitle-find-unavailable')).toBeInTheDocument();
    });
  });

  it('shows empty state when no results are found', async () => {
    stubFetchWithSubtitleSearch({ searchBody: { available: true, results: [] } });

    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />
      </MemoryRouter>,
    );
    await waitForResolvedVideo();

    fireEvent.click(screen.getByLabelText('Settings'));
    const menu = screen.getByTestId('player-settings-menu');
    fireEvent.click(within(menu).getByText('Subtitles'));
    fireEvent.click(within(menu).getByTestId('subtitle-find-online-btn'));

    await waitFor(() => {
      expect(within(menu).getByTestId('subtitle-find-empty')).toBeInTheDocument();
    });
  });
});
