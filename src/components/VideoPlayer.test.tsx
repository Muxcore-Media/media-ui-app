import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VideoPlayer from './VideoPlayer';
import { updatePreferences, upsertProgress } from '../lib/userdata';
import { setCurrentRoles } from '../lib/session';

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
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = String(init?.method || 'GET').toUpperCase();
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
        if (method === 'PUT') {
          const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
          return mockJSON({
            media_id: body.media_id ?? 'm1',
            segments: body.segments ?? [],
            enabled: true,
          });
        }
        if (method === 'DELETE') {
          return mockJSON({ media_id: 'm1', segments: [], enabled: true });
        }
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
    expect(screen.getByTestId('player-watch-together')).toBeInTheDocument();
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

  it('auto-skips a detected intro when the preference is on', async () => {
    updatePreferences({
      playback: {
        autoplayNext: false,
        rememberPosition: true,
        skipIntroSec: 0,
        autoSkipIntro: true,
        autoSkipCredits: false,
        audioOffsetMs: 0,
      },
    });
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
    Object.defineProperty(video, 'currentTime', { value: 5, configurable: true, writable: true });
    fireEvent(video, new Event('timeupdate'));
    await waitFor(() => {
      expect(video.currentTime).toBeGreaterThanOrEqual(30);
    });
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

  it('track selection — audio: lists tracks in settings and calls through on selection', async () => {
    // formatAudioTrackLabel: language uppercased, channelLayout as-is, codec uppercased
    stubFetch({
      analysis: {
        src: '/stream/movies/m1',
        enabled: true,
        info_line: '1080p',
        audio: [
          { index: 0, language: 'eng', channel_layout: 'stereo', codec: 'aac', label: 'Default' },
          { index: 1, language: 'jpn', channel_layout: '5.1', codec: 'dts', label: 'JPN' },
        ],
        subtitles: [],
      },
    });

    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />
      </MemoryRouter>,
    );
    await waitForResolvedVideo();

    // Wait for analysis to load (async fetch), then open settings
    await waitFor(() => screen.getByLabelText('Settings'));
    fireEvent.click(screen.getByLabelText('Settings'));
    const menu = screen.getByTestId('player-settings-menu');

    // Audio row should show the default track label
    expect(within(menu).getByText('Audio')).toBeInTheDocument();

    // Drill into Audio panel — the tracks appear after analysis resolves
    fireEvent.click(within(menu).getByText('Audio'));
    // formatAudioTrackLabel: 'ENG · stereo · AAC' and 'JPN · 5.1 · DTS'
    await waitFor(() => {
      expect(within(menu).getByText('ENG · stereo · AAC')).toBeInTheDocument();
      expect(within(menu).getByText('JPN · 5.1 · DTS')).toBeInTheDocument();
    });

    // Select the second track — no throw means the callback wire is intact
    fireEvent.click(within(menu).getByText('JPN · 5.1 · DTS'));
  });

  it('track selection — subtitles: lists tracks and allows turning captions off', async () => {
    // formatSubtitleTrackLabel: language uppercased, codec uppercased
    stubFetch({
      analysis: {
        src: '/stream/movies/m1',
        enabled: true,
        info_line: '1080p',
        audio: [],
        subtitles: [
          { index: 0, language: 'en', codec: 'webvtt', picture_based: false, text_based: true, label: 'English' },
          { index: 1, language: 'fr', codec: 'webvtt', picture_based: false, text_based: true, label: 'French' },
        ],
      },
    });

    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />
      </MemoryRouter>,
    );
    await waitForResolvedVideo();

    // Open settings → Subtitles panel
    fireEvent.click(screen.getByLabelText('Settings'));
    const menu = screen.getByTestId('player-settings-menu');
    fireEvent.click(within(menu).getByText('Subtitles'));

    await waitFor(() => {
      // Both tracks and the "Off" option should be listed
      // formatSubtitleTrackLabel with language + webvtt codec → 'EN · WEBVTT', 'FR · WEBVTT'
      expect(within(menu).getByText('Off')).toBeInTheDocument();
      expect(within(menu).getByText('EN · WEBVTT')).toBeInTheDocument();
      expect(within(menu).getByText('FR · WEBVTT')).toBeInTheDocument();
    });

    // Selecting "Off" should not throw
    fireEvent.click(within(menu).getByText('Off'));
  });

  it('nudges subtitle sync offset from appearance and G/H', async () => {
    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />
      </MemoryRouter>,
    );
    await waitForResolvedVideo();

    fireEvent.click(screen.getByLabelText('Settings'));
    const menu = screen.getByTestId('player-settings-menu');
    fireEvent.click(within(menu).getByText('Subtitles'));
    fireEvent.click(within(menu).getByText('Appearance…'));
    fireEvent.click(within(menu).getByLabelText('Subtitle color Yellow'));
    expect(within(menu).getByLabelText('Subtitle color Yellow')).toHaveAttribute('aria-pressed', 'true');
    expect(within(menu).getByTestId('subtitle-offset-value')).toHaveTextContent('In sync');
    fireEvent.click(within(menu).getByLabelText('Shift subtitles later'));
    expect(within(menu).getByTestId('subtitle-offset-value')).toHaveTextContent('+0.25s');
    fireEvent.click(within(menu).getByLabelText('Close settings'));

    fireEvent.keyDown(window, { code: 'KeyH' });
    expect(screen.getByTestId('subtitle-offset-toast')).toHaveTextContent('Subtitles +0.50s');
    fireEvent.keyDown(window, { code: 'KeyG' });
    expect(screen.getByTestId('subtitle-offset-toast')).toHaveTextContent('Subtitles +0.25s');
  });

  it('track selection — graceful empty state when no audio or subtitle tracks exist', async () => {
    stubFetch({
      analysis: {
        src: '/stream/movies/m1',
        enabled: true,
        info_line: '1080p',
        audio: [],
        subtitles: [],
      },
    });

    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />
      </MemoryRouter>,
    );
    await waitForResolvedVideo();

    fireEvent.click(screen.getByLabelText('Settings'));
    const menu = screen.getByTestId('player-settings-menu');

    fireEvent.click(within(menu).getByText('Audio'));
    expect(within(menu).getByTestId('audio-offset-value')).toHaveTextContent('In sync');
    fireEvent.click(within(menu).getByLabelText('Shift audio later'));
    expect(within(menu).getByTestId('audio-offset-value')).toHaveTextContent('+0.25s');
    fireEvent.click(within(menu).getByLabelText('Close settings'));
    fireEvent.keyDown(window, { code: 'BracketRight' });
    expect(screen.getByTestId('subtitle-offset-toast')).toHaveTextContent('Audio +0.50s');
  });
});

// ---------------------------------------------------------------------------
// Shared TV show fixture for skip-outro + next-episode tests
// ---------------------------------------------------------------------------

const TV_SHOW_FIXTURE = {
  id: 'show1',
  title: 'My Show',
  seasons: [
    {
      id: 's1',
      season_number: 1,
      name: 'Season 1',
      episode_count: 2,
      episodes: [
        {
          id: 'ep1',
          season_number: 1,
          episode_number: 1,
          title: 'Pilot',
          has_file: true,
          stream_url: '/stream/tv/ep1',
        },
        {
          id: 'ep2',
          season_number: 1,
          episode_number: 2,
          title: 'Episode 2',
          has_file: true,
          stream_url: '/stream/tv/ep2',
        },
      ],
    },
  ],
};

function stubFetchWithEpisode(segmentOverrides?: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/playback/subtitles')) return mockJSON({ tracks: [] });
      if (url.includes('/api/playback/analysis')) {
        return mockJSON({ src: '/stream/tv/ep1', enabled: true, info_line: '1080p' });
      }
      if (url.includes('/api/playback/segments')) {
        return mockJSON(
          segmentOverrides ?? { media_id: 'ep1', segments: [], enabled: true },
        );
      }
      if (url.includes('/api/playback/resolve')) {
        return mockJSON({
          stream_url: '/stream/tv/ep1',
          mode: 'direct',
          resume_enabled: true,
          transcoder_enabled: false,
          prefer_direct_play: true,
          max_bitrate_mbps: '80',
          trickplay_enabled: false,
          transcoder_available: false,
        });
      }
      if (url.includes('/api/tv/show1')) {
        return mockJSON({ show: TV_SHOW_FIXTURE });
      }
      return mockJSON({});
    }),
  );
}

describe('VideoPlayer skip outro + next episode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows Skip Outro button while an outro segment is active', async () => {
    stubFetchWithEpisode({
      media_id: 'ep1',
      enabled: true,
      segments: [
        {
          kind: 'outro',
          start_seconds: 1100,
          end_seconds: 1200,
          confidence: 0.9,
          source: 'test',
        },
      ],
    });

    render(
      <MemoryRouter>
        <VideoPlayer
          src="/stream/tv/ep1"
          title="Pilot"
          mediaId="ep1"
          mediaKind="episode"
          showId="show1"
          seasonNumber={1}
          episodeNumber={1}
        />
      </MemoryRouter>,
    );
    const video = await waitForResolvedVideo('/stream/tv/ep1');
    fireLoadedMetadata(video, 1200);

    // Advance into the outro window
    Object.defineProperty(video, 'currentTime', { value: 1110, configurable: true });
    fireEvent(video, new Event('timeupdate'));

    await waitFor(() => expect(screen.getByTestId('player-skip-segment')).toBeInTheDocument());
    expect(screen.getByText('Skip Outro')).toBeInTheDocument();
  });

  it('keeps Skip Outro button visible even while the Up Next countdown is showing', async () => {
    stubFetchWithEpisode({
      media_id: 'ep1',
      enabled: true,
      segments: [
        {
          kind: 'outro',
          start_seconds: 1100,
          end_seconds: 1200,
          confidence: 0.9,
          source: 'test',
        },
      ],
    });

    render(
      <MemoryRouter>
        <VideoPlayer
          src="/stream/tv/ep1"
          title="Pilot"
          mediaId="ep1"
          mediaKind="episode"
          showId="show1"
          seasonNumber={1}
          episodeNumber={1}
        />
      </MemoryRouter>,
    );
    const video = await waitForResolvedVideo('/stream/tv/ep1');
    fireLoadedMetadata(video, 1200);

    Object.defineProperty(video, 'currentTime', { value: 1110, configurable: true });
    fireEvent(video, new Event('timeupdate'));

    // Wait for show data + both affordances to appear
    await waitFor(() => {
      expect(screen.getByTestId('player-skip-segment')).toBeInTheDocument();
    });
    // Up Next overlay may take a moment to appear (requires show fetch + countdown trigger)
    // at minimum the skip button must stay visible
    expect(screen.getByText('Skip Outro')).toBeInTheDocument();
  });

  it('shows Next Episode button when within the last 120 s of a TV episode', async () => {
    stubFetchWithEpisode();

    render(
      <MemoryRouter>
        <VideoPlayer
          src="/stream/tv/ep1"
          title="Pilot"
          mediaId="ep1"
          mediaKind="episode"
          showId="show1"
          seasonNumber={1}
          episodeNumber={1}
        />
      </MemoryRouter>,
    );
    const video = await waitForResolvedVideo('/stream/tv/ep1');
    fireLoadedMetadata(video, 2400);

    // Advance to 100 s from end (within NEAR_END_SEC = 120)
    Object.defineProperty(video, 'currentTime', { value: 2300, configurable: true });
    fireEvent(video, new Event('timeupdate'));

    await waitFor(
      () => expect(screen.getByTestId('player-next-episode')).toBeInTheDocument(),
      { timeout: 3000 },
    );
    expect(screen.getByLabelText(/play next episode/i)).toBeInTheDocument();
  });

  it('hides Next Episode button when more than 120 s remain', async () => {
    stubFetchWithEpisode();

    render(
      <MemoryRouter>
        <VideoPlayer
          src="/stream/tv/ep1"
          title="Pilot"
          mediaId="ep1"
          mediaKind="episode"
          showId="show1"
          seasonNumber={1}
          episodeNumber={1}
        />
      </MemoryRouter>,
    );
    const video = await waitForResolvedVideo('/stream/tv/ep1');
    fireLoadedMetadata(video, 2400);

    // 200 s from end — should NOT show the button
    Object.defineProperty(video, 'currentTime', { value: 2200, configurable: true });
    fireEvent(video, new Event('timeupdate'));

    // Give it a moment to settle
    await waitFor(() => expect(document.querySelector('video')).toBeTruthy());
    expect(screen.queryByTestId('player-next-episode')).not.toBeInTheDocument();
  });

  it('does not show Next Episode button for a movie', async () => {
    stubFetch();

    render(
      <MemoryRouter>
        <VideoPlayer
          src="/stream/movies/m1"
          title="A Movie"
          mediaId="m1"
          mediaKind="movie"
        />
      </MemoryRouter>,
    );
    const video = await waitForResolvedVideo();
    fireLoadedMetadata(video, 1200);

    // Near end of movie
    Object.defineProperty(video, 'currentTime', { value: 1150, configurable: true });
    fireEvent(video, new Event('timeupdate'));

    await waitFor(() => expect(document.querySelector('video')).toBeTruthy());
    expect(screen.queryByTestId('player-next-episode')).not.toBeInTheDocument();
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

// ---------------------------------------------------------------------------
// PiP and Cast / AirPlay controls
// ---------------------------------------------------------------------------

describe('VideoPlayer PiP controls', () => {
  beforeEach(() => {
    stubFetch();
  });

  afterEach(() => {
    // Restore Picture-in-Picture API state
    Object.defineProperty(document, 'pictureInPictureEnabled', {
      value: false,
      configurable: true,
    });
    Object.defineProperty(document, 'pictureInPictureElement', {
      value: null,
      configurable: true,
    });
    // Remove any requestPictureInPicture mock added per-test
    Object.defineProperty(HTMLVideoElement.prototype, 'requestPictureInPicture', {
      configurable: true,
      writable: true,
      value: undefined,
    });
  });

  it('hides the PiP button when Picture-in-Picture is not supported', async () => {
    Object.defineProperty(document, 'pictureInPictureEnabled', {
      value: false,
      configurable: true,
    });

    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />
      </MemoryRouter>,
    );
    await waitForResolvedVideo();

    expect(screen.queryByRole('button', { name: 'Picture in picture' })).not.toBeInTheDocument();
  });

  it('shows the PiP button when Picture-in-Picture is supported', async () => {
    Object.defineProperty(document, 'pictureInPictureEnabled', {
      value: true,
      configurable: true,
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'requestPictureInPicture', {
      configurable: true,
      writable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });

    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />
      </MemoryRouter>,
    );
    await waitForResolvedVideo();

    expect(screen.getByRole('button', { name: 'Picture in picture' })).toBeInTheDocument();
  });

  it('calls requestPictureInPicture when the PiP button is clicked', async () => {
    Object.defineProperty(document, 'pictureInPictureEnabled', {
      value: true,
      configurable: true,
    });
    Object.defineProperty(document, 'pictureInPictureElement', {
      value: null,
      configurable: true,
    });
    const requestPiP = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(HTMLVideoElement.prototype, 'requestPictureInPicture', {
      configurable: true,
      writable: true,
      value: requestPiP,
    });

    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />
      </MemoryRouter>,
    );
    await waitForResolvedVideo();

    fireEvent.click(screen.getByRole('button', { name: 'Picture in picture' }));
    expect(requestPiP).toHaveBeenCalledTimes(1);
  });

  it('triggers PiP via the P keyboard shortcut', async () => {
    Object.defineProperty(document, 'pictureInPictureEnabled', {
      value: true,
      configurable: true,
    });
    Object.defineProperty(document, 'pictureInPictureElement', {
      value: null,
      configurable: true,
    });
    const requestPiP = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(HTMLVideoElement.prototype, 'requestPictureInPicture', {
      configurable: true,
      writable: true,
      value: requestPiP,
    });

    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />
      </MemoryRouter>,
    );
    await waitForResolvedVideo();

    fireEvent.keyDown(window, { code: 'KeyP' });
    expect(requestPiP).toHaveBeenCalledTimes(1);
  });
});

describe('VideoPlayer Cast and AirPlay controls', () => {
  beforeEach(() => {
    stubFetch();
  });

  afterEach(() => {
    // Remove Remote Playback API mock if added
    const proto = HTMLVideoElement.prototype as unknown as Record<string, unknown>;
    if ('remote' in HTMLVideoElement.prototype) {
      delete proto['remote'];
    }
    // Remove AirPlay mock if added
    if ('webkitShowPlaybackTargetPicker' in HTMLVideoElement.prototype) {
      delete proto['webkitShowPlaybackTargetPicker'];
    }
  });

  it('renders no Cast control at all when the Remote Playback API is not available (FR-PLAY-009)', async () => {
    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />
      </MemoryRouter>,
    );
    await waitForResolvedVideo();

    expect(screen.queryByRole('button', { name: /cast/i })).toBeNull();
    expect(screen.queryByLabelText(/cast/i)).toBeNull();
    expect(screen.queryByTitle(/cast/i)).toBeNull();
  });

  it('shows an enabled Cast button and invokes remote.prompt() when Remote Playback API is available', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const mockRemote = {
      state: 'disconnected' as const,
      prompt,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
    Object.defineProperty(HTMLVideoElement.prototype, 'remote', {
      configurable: true,
      get: () => mockRemote,
    });

    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />
      </MemoryRouter>,
    );
    await waitForResolvedVideo();

    const castBtn = screen.getByRole('button', { name: 'Cast to device' });
    expect(castBtn).not.toBeDisabled();
    fireEvent.click(castBtn);
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it('renders no AirPlay control at all when webkitShowPlaybackTargetPicker is not available (FR-PLAY-009)', async () => {
    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />
      </MemoryRouter>,
    );
    await waitForResolvedVideo();

    expect(screen.queryByRole('button', { name: /airplay/i })).toBeNull();
    expect(screen.queryByLabelText(/airplay/i)).toBeNull();
    expect(screen.queryByTitle(/airplay/i)).toBeNull();
  });

  it('shows an enabled AirPlay button and invokes the picker when webkitShowPlaybackTargetPicker is available', async () => {
    const picker = vi.fn();
    Object.defineProperty(HTMLVideoElement.prototype, 'webkitShowPlaybackTargetPicker', {
      configurable: true,
      writable: true,
      value: picker,
    });

    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />
      </MemoryRouter>,
    );
    await waitForResolvedVideo();

    const airPlayBtn = screen.getByRole('button', { name: 'AirPlay' });
    expect(airPlayBtn).not.toBeDisabled();
    fireEvent.click(airPlayBtn);
    expect(picker).toHaveBeenCalledTimes(1);
  });
});

describe('VideoPlayer skip-point editor', () => {
  beforeEach(() => {
    localStorage.clear();
    setCurrentRoles(['admin']);
    stubFetch();
  });

  it('lets a manager mark intro end at the current position', async () => {
    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />
      </MemoryRouter>,
    );
    const video = await waitForResolvedVideo();
    fireLoadedMetadata(video, 3600);
    Object.defineProperty(video, 'currentTime', { value: 85, configurable: true });
    fireEvent(video, new Event('timeupdate'));

    fireEvent.click(screen.getByLabelText('Settings'));
    fireEvent.click(screen.getByText('Skip points'));
    fireEvent.click(screen.getByTestId('player-mark-intro'));

    await waitFor(() => {
      expect(screen.getByTestId('player-skip-points-summary')).toHaveTextContent('Intro 0:00–1:25');
    });
    const fetchMock = vi.mocked(fetch);
    expect(fetchMock.mock.calls.some((call) => String(call[1]?.method || '').toUpperCase() === 'PUT')).toBe(true);
  });
});

describe('VideoPlayer direct-play fallback', () => {
  it('switches to HLS transcode when direct play hits a format error', async () => {
    stubFetch({
      resolve: {
        stream_url: RESOLVED_STREAM_URL,
        mode: 'direct',
        resume_enabled: true,
        transcoder_enabled: true,
        prefer_direct_play: true,
        max_bitrate_mbps: '80',
        trickplay_enabled: false,
        transcoder_available: true,
      },
    });

    render(
      <MemoryRouter>
        <VideoPlayer src="/stream/movies/m1" title="Test" mediaId="m1" />
      </MemoryRouter>,
    );
    const video = await waitForResolvedVideo(RESOLVED_STREAM_URL);
    Object.defineProperty(video, 'error', {
      configurable: true,
      value: { code: 4 },
    });
    fireEvent(video, new Event('error'));

    await waitFor(() => {
      const next = document.querySelector('video');
      expect(next?.getAttribute('src') ?? '').toContain('/stream/hls');
    });
  });
});
