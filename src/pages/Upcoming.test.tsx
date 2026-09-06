import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Upcoming from './Upcoming';
import { updatePreferences } from '../lib/userdata';

const listTVShows = vi.fn();
const getTVShow = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      listTVShows: (...args: unknown[]) => listTVShows(...args),
      getTVShow: (...args: unknown[]) => getTVShow(...args),
    },
  };
});

function tomorrowIso(): string {
  const air = new Date();
  air.setDate(air.getDate() + 1);
  return air.toISOString().slice(0, 10);
}

function showStub(id: string, title: string, contentRating?: string) {
  return {
    id,
    title,
    year: 2026,
    overview: '',
    genres: [],
    poster_url: '',
    has_file: false,
    created_at: '',
    ...(contentRating ? { content_rating: contentRating } : {}),
  };
}

function showDetail(
  id: string,
  title: string,
  episodeTitle: string,
  airDate: string,
  contentRating?: string,
) {
  return {
    ...showStub(id, title, contentRating),
    seasons: [
      {
        id: `${id}-season-1`,
        season_number: 1,
        episodes: [
          {
            id: `${id}-e1`,
            title: episodeTitle,
            season_number: 1,
            episode_number: 1,
            air_date: airDate,
            has_file: false,
          },
        ],
      },
    ],
  };
}

function enableKidsPgCeiling() {
  updatePreferences({
    parental: { kidsMode: true, maxRating: 'PG', pinHash: '', pinEnabled: false },
  });
}

describe('Upcoming page', () => {
  beforeEach(() => {
    localStorage.clear();
    listTVShows.mockReset();
    getTVShow.mockReset();
    const airDate = tomorrowIso();
    listTVShows.mockResolvedValue({
      items: [showStub('s1', 'Orbital')],
      total: 1,
    });
    getTVShow.mockResolvedValue(showDetail('s1', 'Orbital', 'Pilot', airDate));
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

  it('hides a restricted show from the calendar under kids mode / maxRating', async () => {
    enableKidsPgCeiling();
    const airDate = tomorrowIso();
    listTVShows.mockResolvedValue({
      items: [
        showStub('s-pg', 'Bluey', 'TV-Y'),
        showStub('s-ma', 'The Boys', 'TV-MA'),
      ],
      total: 2,
    });
    getTVShow.mockImplementation(async (id: unknown) => {
      if (id === 's-pg') return showDetail('s-pg', 'Bluey', 'The Beach', airDate, 'TV-Y');
      return showDetail('s-ma', 'The Boys', 'The Name of the Game', airDate, 'TV-MA');
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
});

describe('Upcoming accessibility', () => {
  beforeEach(() => {
    localStorage.clear();
    listTVShows.mockReset();
    getTVShow.mockReset();
    listTVShows.mockResolvedValue({ items: [], total: 0 });
    getTVShow.mockResolvedValue({ id: 's1', title: 'Orbital', seasons: [] });
  });

  it('has a page h1 and announces loading on initial render', () => {
    listTVShows.mockImplementation(() => new Promise(() => {}));

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
