import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, OperatorError } from '../../api/client';
import { OPERATOR_COPY } from '../../api/errors';
import { clearCurrentSession, getCurrentRoles, setCurrentRoles, setCurrentUserId } from '../../lib/session';
import { DeleteEpisodeFileButton } from '../media/DeleteEpisodeFileButton';
import { DeleteMovieFileButton } from '../media/DeleteMovieFileButton';
import { MonitorButton } from '../media/MonitorButton';
import { QualityProfileSelect } from '../media/QualityProfileSelect';
import { RefreshMetadataButton } from '../media/RefreshMetadataButton';
import { RemoveLibraryButton } from '../media/RemoveLibraryButton';
import { RootFolderSelect } from '../media/RootFolderSelect';
import { ErrorBanner } from '../ui/ErrorBanner';

// A stale cached role shows an operator control that the BFF then refuses (T-M5-12, C-30). The
// SPA reports the server decision calmly (polite status, no retry); it never grants anything.

const forbidden = () => new OperatorError('operator.forbidden', 403);

beforeEach(() => {
  clearCurrentSession();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  vi.spyOn(api, 'listRoots').mockResolvedValue({ available: true, roots: [{ id: 'r1', path: '/media/movies', name: 'Movies' }] } as Awaited<ReturnType<typeof api.listRoots>>);
  vi.spyOn(api, 'pickRoot').mockResolvedValue({ root: null } as Awaited<ReturnType<typeof api.pickRoot>>);
  vi.spyOn(api, 'getFormats').mockResolvedValue({ profiles: [{ id: 'hd', name: 'HD' }] } as Awaited<ReturnType<typeof api.getFormats>>);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function expectCalmNote(testId: string, text = OPERATOR_COPY['operator.forbidden'].message) {
  const note = await screen.findByTestId(testId);
  expect(note).toHaveTextContent(text);
  expect(note).toHaveAttribute('role', 'status');
  expect(screen.queryByRole('alert')).toBeNull();
}

describe('operator role denial in action controls', () => {
  beforeEach(() => setCurrentRoles(['admin']));

  it('Monitor (full) explains a 403 and does not retry', async () => {
    const spy = vi.spyOn(api, 'setMonitored').mockRejectedValue(forbidden());
    const onChange = vi.fn();
    render(<MonitorButton kind="movie" id="m1" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Monitor' }));
    await expectCalmNote('monitor-note');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Monitor (compact) explains a 403', async () => {
    vi.spyOn(api, 'setMonitored').mockRejectedValue(forbidden());
    render(<MonitorButton compact kind="episode" id="e1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Unmonitored' }));
    await expectCalmNote('monitor-note');
  });

  it('keeps an ordinary failure as an alert', async () => {
    vi.spyOn(api, 'setMonitored').mockRejectedValue(new Error('upstream down'));
    render(<MonitorButton kind="movie" id="m1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Monitor' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('upstream down');
  });

  it('Refresh metadata explains a 403 and stays unrefreshed', async () => {
    const spy = vi.spyOn(api, 'refreshLibraryItem').mockRejectedValue(forbidden());
    const onRefreshed = vi.fn();
    render(<RefreshMetadataButton kind="movie" id="m1" onRefreshed={onRefreshed} />);
    fireEvent.click(screen.getByTestId('refresh-metadata'));
    await expectCalmNote('refresh-metadata-note');
    expect(screen.getByTestId('refresh-metadata')).toHaveTextContent('Refresh metadata');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(onRefreshed).not.toHaveBeenCalled();
  });

  it('Delete movie file explains a 403', async () => {
    const spy = vi.spyOn(api, 'removeMovieFile').mockRejectedValue(forbidden());
    const onRemoved = vi.fn();
    render(<DeleteMovieFileButton id="m1" onRemoved={onRemoved} />);
    fireEvent.click(screen.getByTestId('delete-movie-file'));
    await expectCalmNote('delete-movie-file-note');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(onRemoved).not.toHaveBeenCalled();
  });

  it('Delete episode file explains a 403', async () => {
    vi.spyOn(api, 'removeEpisodeFile').mockRejectedValue(forbidden());
    render(<DeleteEpisodeFileButton id="e1" />);
    fireEvent.click(screen.getByTestId('delete-episode-file'));
    await expectCalmNote('delete-episode-file-note');
  });

  it('Remove from library explains a 403 as a status, not an alert', async () => {
    const spy = vi.spyOn(api, 'removeLibraryItem').mockRejectedValue(forbidden());
    render(<RemoveLibraryButton kind="movie" id="m1" title="Family Film" />);
    fireEvent.click(screen.getByTestId('remove-library'));
    fireEvent.click(screen.getByRole('button', { name: 'Remove from library' }));
    await expectCalmNote('remove-library-note');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('Quality profile explains a 403', async () => {
    vi.spyOn(api, 'setQualityProfile').mockRejectedValue(forbidden());
    const onChange = vi.fn();
    render(<QualityProfileSelect kind="movie" id="m1" onChange={onChange} />);
    fireEvent.change(await screen.findByRole('combobox', { name: 'Quality profile' }), { target: { value: 'hd' } });
    await expectCalmNote('quality-note');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Root folder explains operator.admin_required with the administrator copy', async () => {
    const spy = vi.spyOn(api, 'setRootFolder').mockRejectedValue(new OperatorError('operator.admin_required', 403));
    render(<RootFolderSelect kind="movie" id="m1" />);
    fireEvent.change(await screen.findByRole('combobox', { name: 'Root folder' }), { target: { value: '/media/movies' } });
    await expectCalmNote('root-folder-note', OPERATOR_COPY['operator.admin_required'].message);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('stale cached role against the real client', () => {
  // The control is offered from a cached `manager`; the BFF answers 403 and the session re-read
  // shows the role really is `viewer`. The control goes away, the explanation stays, nothing retries.
  it('hides the control once the session re-read downgrades the role, keeping the note', async () => {
    setCurrentUserId('u-member');
    setCurrentRoles(['manager']);
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const path = String(url);
      calls.push(`${init?.method || 'GET'} ${path}`);
      if (path.startsWith('/api/session')) {
        return new Response(JSON.stringify({ user_id: 'u-member', roles: ['viewer'] }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: 'admin or manager role required', code: 'operator.forbidden' }), { status: 403 });
    }));
    render(<MonitorButton kind="movie" id="m1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Monitor' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Monitor' })).toBeNull());
    await expectCalmNote('monitor-note');
    expect(getCurrentRoles()).toEqual(['viewer']);
    expect(calls.filter((c) => c.startsWith('PATCH'))).toHaveLength(1);
    expect(calls.filter((c) => c.endsWith('/api/session'))).toHaveLength(1);
  });
});

describe('ErrorBanner operator denial', () => {
  it.each(['operator.forbidden', 'operator.admin_required'] as const)('shows %s as a calm status, never an alert', (code) => {
    render(<ErrorBanner message={OPERATOR_COPY[code].message} />);
    const notice = screen.getByTestId('operator-notice');
    expect(notice).toHaveAttribute('role', 'status');
    expect(notice).toHaveAttribute('data-operator-code', code);
    expect(notice).toHaveTextContent(OPERATOR_COPY[code].title);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('keeps a custom test id on the notice', () => {
    render(<ErrorBanner message={OPERATOR_COPY['operator.forbidden'].message} testId="release-search-error" />);
    expect(screen.getByTestId('release-search-error')).toHaveAttribute('data-operator-code', 'operator.forbidden');
  });
});
