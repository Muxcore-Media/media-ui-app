import { setCurrentRoles } from '../lib/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Activity from './Activity';

beforeEach(() => setCurrentRoles(['admin']));

const listActivity = vi.fn();
const listWanted = vi.fn();
const retryImport = vi.fn();
const searchNow = vi.fn();
const removeWanted = vi.fn();
const addWanted = vi.fn();
const blockRelease = vi.fn();
const listImportCandidates = vi.fn();
const importPath = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      listActivity: (...args: unknown[]) => listActivity(...args),
      listWanted: (...args: unknown[]) => listWanted(...args),
      retryImport: (...args: unknown[]) => retryImport(...args),
      searchNow: (...args: unknown[]) => searchNow(...args),
      removeWanted: (...args: unknown[]) => removeWanted(...args),
      addWanted: (...args: unknown[]) => addWanted(...args),
      blockRelease: (...args: unknown[]) => blockRelease(...args),
      listImportCandidates: (...args: unknown[]) => listImportCandidates(...args),
      importPath: (...args: unknown[]) => importPath(...args),
    },
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <Activity />
    </MemoryRouter>,
  );
}

describe('Activity page', () => {
  beforeEach(() => {
    listActivity.mockReset();
    listWanted.mockReset();
    retryImport.mockReset();
    searchNow.mockReset();
    removeWanted.mockReset();
    addWanted.mockReset();
    blockRelease.mockReset();
    listImportCandidates.mockReset();
    importPath.mockReset();
    listActivity.mockResolvedValue({ items: [], total: 0, available: true });
    listWanted.mockResolvedValue({ items: [], total: 0, available: true });
    listImportCandidates.mockResolvedValue({ items: [], total: 0, available: true });
    importPath.mockResolvedValue({ imported: 1, skipped: 0, found: 1, message: 'imported=1' });
    retryImport.mockResolvedValue({ attempted: 1, message: 'ok' });
    searchNow.mockResolvedValue({ started: true, message: 'wanted search started' });
    removeWanted.mockResolvedValue({ removed: true, queue_id: 'q-miss' });
    addWanted.mockResolvedValue({ added: true, queue_id: 'w_movie_m1' });
    blockRelease.mockResolvedValue({ success: true });
  });

  it.each(['user', 'viewer', 'approver'])('keeps %s activity readable without acquisition actions', async (role) => {
    setCurrentRoles([role]);
    listWanted.mockResolvedValue({ available: true, items: [{ id: 'w1', item_type: 'movie', item_id: 'm1', title: 'Missing film', monitored: true, missing: true }] });
    listActivity.mockResolvedValue({ available: true, items: [{ id: 'h1', title: 'Failed film', status: 'import_failed', stuck: true, wanted_item_id: 'w1', guid: 'g1' }] });
    listImportCandidates.mockResolvedValue({ available: true, items: [{ path: '/fixture/film.mkv', title: 'Import fixture' }] });
    renderPage();
    expect(await screen.findByText('Missing film')).toBeInTheDocument();
    expect(screen.getByText('Failed film')).toBeInTheDocument();
    expect(screen.getByText('Import fixture')).toBeInTheDocument();
    expect(screen.queryByTestId('wanted-add-form')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Search|Remove|Retry import|Block|Import/ })).not.toBeInTheDocument();
    expect(addWanted).not.toHaveBeenCalled();
    expect(searchNow).not.toHaveBeenCalled();
    expect(importPath).not.toHaveBeenCalled();
    expect(retryImport).not.toHaveBeenCalled();
  });

  it('shows empty state when nothing is downloading', async () => {
    renderPage();
    expect(await screen.findByTestId('activity-empty')).toBeInTheDocument();
  });

  it('adds a library title to the wanted queue', async () => {
    renderPage();
    const form = await screen.findByTestId('wanted-add-form');
    fireEvent.change(form.querySelector('input[name="title"]') as HTMLInputElement, { target: { value: 'Dune' } });
    fireEvent.change(form.querySelector('input[name="item_id"]') as HTMLInputElement, { target: { value: 'm1' } });
    fireEvent.change(form.querySelector('input[name="year"]') as HTMLInputElement, { target: { value: '2021' } });
    fireEvent.submit(form);
    await waitFor(() => {
      expect(addWanted).toHaveBeenCalledWith({
        itemType: 'movie',
        itemId: 'm1',
        title: 'Dune',
        year: 2021,
      });
    });
    expect(await screen.findByTestId('activity-flash')).toHaveTextContent('Added to wanted');
  });

  it('lists missing wanted titles and retries a failed import', async () => {
    listWanted.mockResolvedValue({
      available: true,
      total: 1,
      items: [
        {
          id: 'q-miss',
          item_type: 'movie',
          item_id: 'm-miss',
          title: 'Still Missing',
          year: 2024,
          monitored: true,
          missing: true,
        },
      ],
    });
    listActivity.mockResolvedValue({
      available: true,
      total: 1,
      items: [
        {
          id: 'h-fail',
          wanted_item_id: 'q-1',
          guid: 'g-fail',
          title: 'Broken Import',
          status: 'import_failed',
          status_label: 'Import failed',
          status_detail: 'path not watched',
          stuck: true,
          warning: true,
        },
      ],
    });

    renderPage();

    expect(await screen.findByTestId('activity-wanted')).toBeInTheDocument();
    expect(screen.getByText('Still Missing')).toBeInTheDocument();
    expect(screen.getByTestId('activity-attention')).toBeInTheDocument();
    expect(screen.getByText('Broken Import')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /retry import/i }));
    await waitFor(() => {
      expect(retryImport).toHaveBeenCalledWith('h-fail');
    });
    expect(await screen.findByTestId('activity-flash')).toHaveTextContent(/import retry/i);
  });

  it('searches again for a failed grab', async () => {
    listActivity.mockResolvedValue({
      available: true,
      total: 1,
      items: [
        {
          id: 'h-fail-grab',
          wanted_item_id: 'q-fail',
          guid: 'g-fail',
          title: 'Dead Torrent',
          status: 'failed',
          status_label: 'Download failed',
          stuck: true,
          warning: true,
        },
      ],
    });
    renderPage();
    expect(await screen.findByTestId('activity-attention')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /search now/i }));
    await waitFor(() => {
      expect(searchNow).toHaveBeenCalledWith({ queue_id: 'q-fail' });
    });
    expect(await screen.findByTestId('activity-flash')).toHaveTextContent(/search started/i);
  });

  it('imports a file sitting in the download folder', async () => {
    listImportCandidates.mockResolvedValue({
      available: true,
      total: 1,
      items: [
        {
          path: '/downloads/Dune.2021.mkv',
          name: 'Dune.2021.mkv',
          title: 'Dune',
          mediaType: 'movie',
          year: 2021,
          size: 1048576,
          quality: { label: '1080p Remux', resolution: '1080p', source: 'Remux', codec: '', hdr: false, score: 150 },
        },
      ],
    });
    renderPage();
    expect(await screen.findByTestId('activity-import')).toBeInTheDocument();
    expect(screen.getByText('Dune')).toBeInTheDocument();
    expect(screen.getByText(/1080p Remux/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /import/i }));
    await waitFor(() => {
      expect(importPath).toHaveBeenCalledWith({
        path: '/downloads/Dune.2021.mkv',
        title: 'Dune',
        media_type: 'movie',
        year: 2021,
        season_number: undefined,
        episode_number: undefined,
      });
    });
    expect(await screen.findByTestId('activity-flash')).toHaveTextContent(/imported into the library/i);
  });

  it('shows a library episode match on Manual Import', async () => {
    listImportCandidates.mockResolvedValue({
      available: true,
      total: 1,
      items: [
        {
          path: '/downloads/Severance.S01E01.mkv',
          name: 'Severance.S01E01.mkv',
          title: 'Severance',
          mediaType: 'tv',
          seasonNumber: 1,
          episodeNumber: 1,
          matched: true,
          seriesName: 'Severance',
          episodeTitle: 'Good News About Hell',
        },
      ],
    });
    renderPage();
    expect(await screen.findByTestId('import-match')).toHaveTextContent('Severance · S01E01 · Good News About Hell');
    fireEvent.click(screen.getByRole('button', { name: /import/i }));
    await waitFor(() => {
      expect(importPath).toHaveBeenCalledWith({
        path: '/downloads/Severance.S01E01.mkv',
        title: 'Severance',
        media_type: 'tv',
        year: undefined,
        season_number: 1,
        episode_number: 1,
      });
    });
  });

  it('has a page h1 and announces loading', () => {
    listActivity.mockImplementation(() => new Promise(() => {}));
    listWanted.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Downloads' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading downloads' })).toBeInTheDocument();
  });
});
