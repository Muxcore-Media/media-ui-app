import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, OperatorError } from '../../api/client';
import { OPERATOR_COPY } from '../../api/errors';
import { clearCurrentSession, getCurrentRoles, setCurrentRoles, setCurrentUserId } from '../../lib/session';
import { DeleteEpisodeFileButton } from '../media/DeleteEpisodeFileButton';
import { DeleteMovieFileButton } from '../media/DeleteMovieFileButton';
import { MonitorButton } from '../media/MonitorButton';
import { PreviewRename } from '../media/PreviewRename';
import { QualityProfileSelect } from '../media/QualityProfileSelect';
import { RefreshMetadataButton } from '../media/RefreshMetadataButton';
import { RemoveLibraryButton } from '../media/RemoveLibraryButton';
import { RootFolderSelect } from '../media/RootFolderSelect';
import { SeriesOverrideCard } from '../media/SeriesOverrideCard';
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
  it.each([
    { action: 'Rename 1 file', method: 'POST', path: '/api/rename', testId: 'rename-error', formId: 'preview-rename', element: <PreviewRename kind="movie" id="m1" /> },
    { action: 'Save override', method: 'PUT', path: '/api/tv/s1/override', testId: 'series-override-error', formId: 'series-override', element: <SeriesOverrideCard seriesId="s1" /> },
    { action: 'Use household delay', method: 'DELETE', path: '/api/tv/s1/override', testId: 'series-override-error', formId: 'series-override', element: <SeriesOverrideCard seriesId="s1" /> },
  ])('retains the $action denial after removing the downgraded operator form', async ({ action, method, path, testId, formId, element }) => {
    setCurrentUserId('u-member');
    setCurrentRoles(['manager']);
    const calls: string[] = [];
    const unexpected: string[] = [];
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const verb = init?.method || 'GET';
      calls.push(`${verb} ${url}`);
      if (verb === method && url === path) return json({ code: 'operator.forbidden', error: 'private server diagnostic' }, 403);
      if (verb === 'GET' && url === '/api/session') return json({ user_id: 'u-member', roles: ['viewer'] });
      if (verb === 'GET' && url === '/api/rename/preview?movie_id=m1') return json({
        available: true,
        items: [{ file_id: 'f1', current_path: '/fixture/old.mkv', new_path: '/fixture/new.mkv', new_filename: 'new.mkv', changed: true }],
      });
      if (verb === 'GET' && url === '/api/tv/s1/override') return json({
        available: true, found: true,
        override: { series_id: 's1', delay_minutes: 15, preferred_groups: [], ignored_groups: [] },
      });
      unexpected.push(`${verb} ${url}`);
      return json({ error: 'No fixture for this request' }, 501);
    }));
    render(element);
    // Wait for the initial read, including the existing override's clear action.
    await screen.findByRole('button', { name: formId === 'series-override' ? 'Use household delay' : action });
    fireEvent.click(screen.getByRole('button', { name: action }));
    await waitFor(() => expect(getCurrentRoles()).toEqual(['viewer']));
    await expectCalmNote(testId);
    expect(screen.queryByTestId(formId)).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText('private server diagnostic')).toBeNull();
    expect(calls.filter((call) => !call.startsWith('GET '))).toEqual([`${method} ${path}`]);
    expect(calls.filter((call) => call === 'GET /api/session')).toHaveLength(1);
    expect(unexpected).toEqual([]);
  });

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
