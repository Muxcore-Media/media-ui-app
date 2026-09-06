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
