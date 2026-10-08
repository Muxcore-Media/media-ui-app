import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Player from './Player';
import { updatePreferences } from '../lib/userdata';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            stream_url: '/stream/movies/m1',
            mode: 'direct',
            resume_enabled: true,
            transcoder_enabled: false,
            prefer_direct_play: true,
            max_bitrate_mbps: '80',
            trickplay_enabled: false,
            transcoder_available: false,
          }),
      }),
    ),
  );
});

function renderPlayer(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/player${search}`]}>
      <Routes>
        <Route path="/player" element={<Player />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Player shell empty states', () => {
  it('shows empty stream shell when src query is missing', () => {
    renderPlayer('');
    expect(screen.getByText(/isn't available to play/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go back' })).toHaveAttribute('href', '/movies');
  });

  it('mounts immersive video element when stream src is provided', async () => {
    renderPlayer('?src=%2Fstream%2Fmovies%2Fm1&title=Fight%20Club&back=%2Fmovies%2Fm1');
    expect(screen.getByRole('heading', { name: 'Fight Club' })).toBeInTheDocument();
    expect(screen.queryByText(/isn't available to play/i)).not.toBeInTheDocument();
    await waitFor(() => {
      const video = document.querySelector('video');
      expect(video).not.toBeNull();
      expect(video).toHaveAttribute('src', '/stream/movies/m1');
    });
    expect(screen.getByTestId('video-player')).toHaveClass('fixed');
  });
});

describe('Player accessibility', () => {
  it('exposes a main landmark and page h1 when playback is available', async () => {
    renderPlayer('?src=%2Fstream%2Fmovies%2Fm1&title=Fight%20Club&back=%2Fmovies%2Fm1');
    expect(await screen.findByRole('main', { name: 'Fight Club player' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Fight Club' })).toBeInTheDocument();
  });

  it('exposes an error heading and alert when src is missing', () => {
    renderPlayer('');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Playback unavailable' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/isn't available to play/i);
    expect(screen.getByRole('link', { name: 'Go back' })).toHaveAttribute('href', '/movies');
  });
});

describe('Player parental gate (progress resume)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('blocks playback when a resume URL carries a rating above the kids ceiling', () => {
    updatePreferences({
      parental: { kidsMode: true, maxRating: 'PG', pinHash: '', pinEnabled: false },
    });
    renderPlayer(
      '?src=%2Fstream%2Fmovies%2Fm1&title=R%20Movie&id=m1&kind=movie&content_rating=R',
    );
    expect(screen.getByTestId('restricted-overlay')).toBeInTheDocument();
    expect(screen.getByText(/rated R/i)).toBeInTheDocument();
    expect(document.querySelector('video')).toBeNull();
  });

  it('allows playback when the resume rating is within the ceiling', async () => {
    updatePreferences({
      parental: { kidsMode: false, maxRating: 'PG-13', pinHash: '', pinEnabled: false },
    });
    renderPlayer(
      '?src=%2Fstream%2Fmovies%2Fm1&title=Family%20Film&id=m1&kind=movie&content_rating=PG',
    );
    expect(screen.queryByTestId('restricted-overlay')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(document.querySelector('video')).not.toBeNull();
    });
  });

  it('soft-fails open when the resume URL has no content_rating', async () => {
    updatePreferences({
      parental: { kidsMode: true, maxRating: 'PG', pinHash: '', pinEnabled: false },
    });
    renderPlayer('?src=%2Fstream%2Fmovies%2Fm1&title=Unknown&id=m1&kind=movie');
    expect(screen.queryByTestId('restricted-overlay')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(document.querySelector('video')).not.toBeNull();
    });
  });
});

describe('Player server-side parental states (ADR-0031)', () => {
  const OK_RESOLVE = {
    stream_url: '/stream/movies/m1',
    mode: 'direct',
    resume_enabled: true,
    transcoder_enabled: false,
    prefer_direct_play: true,
    max_bitrate_mbps: '80',
    trickplay_enabled: false,
    transcoder_available: false,
  };

  /** Resolve answers with `first` then `rest`; every other BFF call is a harmless 200. */
  function stubResolve(...answers: Array<{ status: number; body: unknown }>) {
    let call = 0;
    const resolveCalls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/playback/resolve')) {
          resolveCalls.push(url);
          const answer = answers[Math.min(call++, answers.length - 1)];
          return Promise.resolve(
            new Response(JSON.stringify(answer.body), {
              status: answer.status,
              headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
            }),
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } }),
        );
      }),
    );
    return resolveCalls;
  }

  const SRC = '?src=%2Fstream%2Fmovies%2Fm1&title=Fight%20Club&id=m1&kind=movie&back=%2Fmovies%2Fm1';

  beforeEach(() => {
    localStorage.clear();
  });

  it('403 parental.blocked shows a clear not-available state and never mounts a video', async () => {
    stubResolve({
      status: 403,
      body: { error: 'blocked', code: 'playback.parental_blocked', parental_code: 'parental.blocked' },
    });
    renderPlayer(SRC);
    const state = await screen.findByTestId('player-parental-state');
    expect(state).toHaveAttribute('data-parental-code', 'parental.blocked');
    expect(screen.getByRole('heading', { level: 1, name: 'Not available for this profile' })).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent(/isn't available for this profile/i);
    expect(screen.getByRole('link', { name: 'Go back' })).toHaveAttribute('href', '/movies/m1');
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    expect(document.querySelector('video')).toBeNull();
  });

  it('403 parental.policy_unconfigured asks for an administrator, with no retry', async () => {
    stubResolve({ status: 403, body: { error: 'x', code: 'parental.policy_unconfigured' } });
    renderPlayer(SRC);
    expect(
      await screen.findByRole('heading', { level: 1, name: "Parental controls aren't set up" }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/ask an administrator/i);
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    expect(document.querySelector('video')).toBeNull();
  });

  it('403 parental.policy_unverifiable tells the user to sign in with a password', async () => {
    stubResolve({ status: 403, body: { error: 'x', code: 'parental.policy_unverifiable' } });
    renderPlayer(SRC);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sign in with a password' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/instead of Quick Connect/i);
    expect(document.querySelector('video')).toBeNull();
  });

  it('401 parental.session_invalid offers a sign-in link', async () => {
    stubResolve({ status: 401, body: { error: 'x', code: 'parental.session_invalid' } });
    renderPlayer(SRC);
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in again' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  for (const code of ['parental.policy_unavailable', 'parental.classification_unavailable']) {
    it(`503 ${code} is a retryable alert, never auto-plays, and retries only on request`, async () => {
      const resolveCalls = stubResolve(
        { status: 503, body: { error: 'x', code } },
        { status: 200, body: OK_RESOLVE },
      );
      renderPlayer(SRC);
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/try again in a moment/i);
      expect(document.querySelector('video')).toBeNull();
      // Nothing retries on its own.
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(resolveCalls).toHaveLength(1);
      expect(document.querySelector('video')).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: /retry/i }));
      await waitFor(() => expect(document.querySelector('video')).not.toBeNull());
      expect(resolveCalls).toHaveLength(2);
    });
  }

  it('a PIN unlock of the local pre-check cannot lift a server denial', async () => {
    updatePreferences({
      parental: { kidsMode: true, maxRating: 'PG', pinHash: '', pinEnabled: false },
    });
    stubResolve({ status: 403, body: { error: 'x', code: 'parental.blocked' } });
    renderPlayer(`${SRC}&content_rating=R`);
    fireEvent.click(await screen.findByRole('button', { name: 'Unlock with PIN' }));
    expect(await screen.findByTestId('player-parental-state')).toHaveAttribute(
      'data-parental-code',
      'parental.blocked',
    );
    expect(document.querySelector('video')).toBeNull();
  });

  it('does not fall back to allowed when the policy cannot be checked on a restricted-looking item', async () => {
    stubResolve({ status: 503, body: { error: 'x', code: 'parental.policy_unavailable' } });
    renderPlayer(SRC);
    await screen.findByTestId('player-parental-state');
    expect(document.querySelector('video')).toBeNull();
  });
});
