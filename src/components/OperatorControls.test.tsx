import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { clearCurrentSession, refreshCurrentUserId, setCurrentRoles } from '../lib/session';
import { MonitorButton } from './media/MonitorButton';
import { RemoveLibraryButton } from './media/RemoveLibraryButton';
import { RefreshMetadataButton } from './media/RefreshMetadataButton';
import { DeleteMovieFileButton } from './media/DeleteMovieFileButton';
import { DeleteEpisodeFileButton } from './media/DeleteEpisodeFileButton';
import { RootFolderSelect } from './media/RootFolderSelect';
import { QualityProfileSelect } from './media/QualityProfileSelect';
import { SeriesOverrideCard } from './media/SeriesOverrideCard';
import { PreviewRename } from './media/PreviewRename';
import { AddWantedButton } from './media/AddWantedButton';

function controls() {
  return <>
    <MonitorButton kind="movie" id="m1" />
    <RemoveLibraryButton kind="movie" id="m1" title="Family Film" hasFile />
    <RefreshMetadataButton kind="movie" id="m1" />
    <DeleteMovieFileButton id="m1" />
    <DeleteEpisodeFileButton id="e1" />
    <RootFolderSelect kind="movie" id="m1" />
    <QualityProfileSelect kind="movie" id="m1" />
    <SeriesOverrideCard seriesId="t1" />
    <PreviewRename kind="movie" id="m1" />
    <AddWantedButton itemType="movie" itemId="m1" title="Family Film" />
  </>;
}

beforeEach(() => {
  clearCurrentSession();
  vi.spyOn(api, 'listRoots').mockResolvedValue({ available: true, roots: [{ id: 'r1', path: '/media/movies', name: 'Movies' }] } as Awaited<ReturnType<typeof api.listRoots>>);
  vi.spyOn(api, 'pickRoot').mockResolvedValue({ root: null } as Awaited<ReturnType<typeof api.pickRoot>>);
  vi.spyOn(api, 'getFormats').mockResolvedValue({ profiles: [{ id: 'hd', name: 'HD' }] } as Awaited<ReturnType<typeof api.getFormats>>);
  vi.spyOn(api, 'getSeriesOverride').mockResolvedValue({ available: false } as Awaited<ReturnType<typeof api.getSeriesOverride>>);
  vi.spyOn(api, 'previewRename').mockResolvedValue({ available: false, items: [] } as Awaited<ReturnType<typeof api.previewRename>>);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('operator control identity boundaries', () => {
  it.each([[], ['user'], ['viewer'], ['member'], ['approver'], ['administrator'], ['managerial'], ['user', 'approver']].map((roles) => ({ roles })))(
    'hides library mutations and avoids operator-only control reads for %j', ({ roles }) => {
      setCurrentRoles(roles);
      const view = render(controls());
      expect(view.container).toBeEmptyDOMElement();
      expect(api.listRoots).not.toHaveBeenCalled();
      expect(api.getFormats).not.toHaveBeenCalled();
      expect(api.getSeriesOverride).not.toHaveBeenCalled();
      expect(api.previewRename).not.toHaveBeenCalled();
    },
  );

  it.each([['manager'], ['user', ' Manager '], ['admin'], ['viewer', 'ADMIN']].map((roles) => ({ roles })))(
    'shows operator controls for %j and reserves root assignment for admin', async ({ roles }) => {
      setCurrentRoles(roles);
      render(controls());
      expect(screen.getByRole('button', { name: 'Monitor' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
      expect(await screen.findByRole('combobox', { name: 'Quality profile' })).toBeInTheDocument();
      if (roles.some((r) => r.toLowerCase() === 'admin')) {
        expect(await screen.findByRole('combobox', { name: 'Root folder' })).toBeInTheDocument();
      } else {
        expect(screen.queryByRole('combobox', { name: 'Root folder' })).not.toBeInTheDocument();
        expect(api.listRoots).not.toHaveBeenCalled();
      }
    },
  );

  it('keeps fresh pending identity hidden, then shows a current manager without remounting', async () => {
    let finish!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; })));
    const pending = refreshCurrentUserId();
    const view = render(controls());
    expect(view.container).toBeEmptyDOMElement();
    await act(async () => {
      finish(new Response(JSON.stringify({ user_id: 'manager', roles: ['manager'] })));
      await pending;
    });
    expect(screen.getByRole('button', { name: 'Monitor' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Root folder' })).not.toBeInTheDocument();
  });

  it.each(['refresh', 'clear', 'cross-tab'])('removes open destructive controls after %s downgrades identity', async (mode) => {
    setCurrentRoles(['admin']);
    const view = render(controls());
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.getByTestId('remove-library-confirm')).toBeInTheDocument();
    await act(async () => {
      if (mode === 'refresh') {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ user_id: 'member', roles: ['viewer'] }))));
        await refreshCurrentUserId();
      } else if (mode === 'clear') clearCurrentSession();
      else {
        localStorage.setItem('muxcore.session.roles.v1', JSON.stringify(['user']));
        window.dispatchEvent(new StorageEvent('storage', { key: 'muxcore.session.roles.v1' }));
      }
    });
    await waitFor(() => expect(view.container).toBeEmptyDOMElement());
  });
});
