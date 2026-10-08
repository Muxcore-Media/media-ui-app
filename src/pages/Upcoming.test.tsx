import { setCurrentRoles } from '../lib/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Upcoming from './Upcoming';
import { updatePreferences } from '../lib/userdata';

beforeEach(() => setCurrentRoles(['admin']));

const listCalendar = vi.fn();
const listTVShows = vi.fn();
const listMovies = vi.fn();
const searchNow = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      listCalendar: (...args: unknown[]) => listCalendar(...args),
      listTVShows: (...args: unknown[]) => listTVShows(...args),
      listMovies: (...args: unknown[]) => listMovies(...args),
      searchNow: (...args: unknown[]) => searchNow(...args),
    },
  };
});

function tomorrowIso(): string {
  const air = new Date();
  air.setDate(air.getDate() + 1);
  return air.toISOString().slice(0, 10);
}

function enableKidsPgCeiling() {
  updatePreferences({
    parental: { kidsMode: true, maxRating: 'PG', pinHash: '', pinEnabled: false },
  });
}

describe('Upcoming page', () => {
  beforeEach(() => {
    localStorage.clear();
    listCalendar.mockReset();
    listTVShows.mockReset();
    listMovies.mockReset();
    searchNow.mockReset();
    searchNow.mockResolvedValue({ started: true, message: 'wanted search started' });
    const airDate = tomorrowIso();
    listTVShows.mockResolvedValue({ items: [], total: 0 });
    listMovies.mockResolvedValue({ items: [], total: 0 });
    listCalendar.mockResolvedValue({
      available: true,
      items: [
        {
          kind: 'tv',
          id: 'ep-1',
          parent_id: 's1',
          title: 'Orbital',
          subtitle: 'S01E01 · Pilot',
          date: airDate,
          href: '/tv/s1',
        },
      ],
    });
  });

  it('lists episodes airing soon', async () => {
    render(
      <MemoryRouter>
        <Upcoming />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('upcoming-page')).toBeInTheDocument();
    expect(await screen.findByText('Orbital')).toBeInTheDocument();
    expect(screen.getByText(/Pilot/)).toBeInTheDocument();
  });

  it('lists movie releases on the same calendar', async () => {
    const airDate = tomorrowIso();
    listCalendar.mockResolvedValue({
      available: true,
      items: [
        {
          kind: 'movie',
          id: 'mv-1',
          parent_id: 'mv-1',
          title: 'Upcoming Film',
          subtitle: 'Theatrical / digital',
          date: airDate,
          href: '/movies/mv-1',
        },
      ],
    });
    render(
      <MemoryRouter>
        <Upcoming />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Upcoming Film')).toBeInTheDocument();
    expect(screen.getByText(/Theatrical/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Upcoming Film/i })).toHaveAttribute(
      'href',
      '/movies/mv-1',
    );
  });

  it('hides a restricted show from the calendar under kids mode / maxRating', async () => {
    enableKidsPgCeiling();
    const airDate = tomorrowIso();
    listTVShows.mockResolvedValue({
      items: [
        { id: 's-pg', title: 'Bluey', content_rating: 'TV-Y' },
        { id: 's-ma', title: 'The Boys', content_rating: 'TV-MA' },
      ],
      total: 2,
    });
    listCalendar.mockResolvedValue({
      available: true,
      items: [
        {
          kind: 'tv',
          id: 'ep-pg',
          parent_id: 's-pg',
          title: 'Bluey',
          subtitle: 'The Beach',
          date: airDate,
          href: '/tv/s-pg',
        },
        {
          kind: 'tv',
          id: 'ep-ma',
          parent_id: 's-ma',
          title: 'The Boys',
          subtitle: 'The Name of the Game',
          date: airDate,
          href: '/tv/s-ma',
        },
      ],
    });

    render(
      <MemoryRouter>
        <Upcoming />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Bluey')).toBeInTheDocument();
    expect(screen.getByText(/The Beach/)).toBeInTheDocument();
    expect(screen.queryByText('The Boys')).not.toBeInTheDocument();
    expect(screen.queryByText(/The Name of the Game/)).not.toBeInTheDocument();
  });

  it('searches a missing series from the calendar', async () => {
    setCurrentRoles(['manager']);
    render(
      <MemoryRouter>
        <Upcoming />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Search now' }));
    await waitFor(() => {
      expect(searchNow).toHaveBeenCalledWith({ item_type: 'tv', item_id: 's1' });
    });
    expect(await screen.findByText('wanted search started')).toBeInTheDocument();
  });

  it('hides in-library rows when Missing only is checked', async () => {
    const airDate = tomorrowIso();
    listCalendar.mockResolvedValue({
      available: true,
      items: [
        {
          kind: 'tv',
          id: 'ep-1',
          parent_id: 's1',
          title: 'Orbital',
          subtitle: 'S01E01 · Pilot',
          date: airDate,
          href: '/tv/s1',
          has_file: false,
        },
        {
          kind: 'movie',
          id: 'mv-1',
          parent_id: 'mv-1',
          title: 'Already Here',
          date: airDate,
          href: '/movies/mv-1',
          has_file: true,
        },
      ],
    });
    render(
      <MemoryRouter>
        <Upcoming />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Orbital')).toBeInTheDocument();
    expect(screen.getByText('Already Here')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Missing only'));
    expect(screen.getByText('Orbital')).toBeInTheDocument();
    expect(screen.queryByText('Already Here')).not.toBeInTheDocument();
  });
});

describe('Upcoming accessibility', () => {
  beforeEach(() => {
    localStorage.clear();
    listCalendar.mockReset();
    listTVShows.mockReset();
    listMovies.mockReset();
    listTVShows.mockResolvedValue({ items: [], total: 0 });
    listMovies.mockResolvedValue({ items: [], total: 0 });
    listCalendar.mockResolvedValue({ items: [], total: 0, available: true });
  });

  it('has a page h1 and announces loading on initial render', () => {
    listCalendar.mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <Upcoming />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Upcoming' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading upcoming episodes' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Month navigation' })).toBeInTheDocument();
  });

  it('shows empty state with title when no episodes air in the month', async () => {
    render(
      <MemoryRouter>
        <Upcoming />
      </MemoryRouter>,
    );

    expect(await screen.findByText('No upcoming episodes')).toBeInTheDocument();
    expect(screen.getByTestId('upcoming-empty')).toBeInTheDocument();
  });
});
