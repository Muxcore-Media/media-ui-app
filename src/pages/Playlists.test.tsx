import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Playlists from './Playlists';
import { toggleFavorite } from '../lib/userdata';

describe('Playlists page', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates a playlist from the form', async () => {
    render(
      <MemoryRouter>
        <Playlists />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('playlists-page')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('New playlist name'), {
      target: { value: 'Road trip' },
    });
    fireEvent.submit(screen.getByPlaceholderText('New playlist name').closest('form')!);
    expect(await screen.findByText('Road trip')).toBeInTheDocument();
  });

  it('lists favorites to add into a playlist', () => {
    toggleFavorite({
      id: 'm1',
      kind: 'movie',
      title: 'Playlist Pick',
      href: '/movies/m1',
    });
    render(
      <MemoryRouter>
        <Playlists />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByPlaceholderText('New playlist name'), {
      target: { value: 'Favs' },
    });
    fireEvent.submit(screen.getByPlaceholderText('New playlist name').closest('form')!);
    expect(screen.getByRole('button', { name: /Playlist Pick/i })).toBeInTheDocument();
  });

  it('removes an item from a playlist', async () => {
    toggleFavorite({
      id: 'fav1',
      kind: 'movie',
      title: 'Remove Me',
      href: '/movies/fav1',
    });
    render(
      <MemoryRouter>
        <Playlists />
      </MemoryRouter>,
    );

    // Create playlist and add the favorite
    fireEvent.change(screen.getByPlaceholderText('New playlist name'), {
      target: { value: 'Test list' },
    });
    fireEvent.submit(screen.getByPlaceholderText('New playlist name').closest('form')!);
    await screen.findByText('Test list');
    fireEvent.click(screen.getByRole('button', { name: /Remove Me/i }));

    // The item should now be in the playlist
    const removeBtn = screen.getByRole('button', { name: /Remove Remove Me from/i });
    expect(removeBtn).toBeInTheDocument();
    fireEvent.click(removeBtn);

    // After removal, the link to the item should be gone
    expect(screen.queryByRole('link', { name: 'Remove Me' })).not.toBeInTheDocument();
  });

  it('reorders items within a playlist', async () => {
    toggleFavorite({ id: 'a1', kind: 'movie', title: 'Alpha', href: '/movies/a1' });
    toggleFavorite({ id: 'b1', kind: 'movie', title: 'Beta', href: '/movies/b1' });
    render(
      <MemoryRouter>
        <Playlists />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText('New playlist name'), {
      target: { value: 'Ordered' },
    });
    fireEvent.submit(screen.getByPlaceholderText('New playlist name').closest('form')!);
    await screen.findByText('Ordered');

    // Add both favorites to the playlist
    fireEvent.click(screen.getByRole('button', { name: /Alpha/i }));
    fireEvent.click(screen.getByRole('button', { name: /Beta/i }));

    // Verify both are now in the list
    expect(screen.getByRole('link', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Beta' })).toBeInTheDocument();

    // Move Beta up (should become first)
    fireEvent.click(screen.getByRole('button', { name: /Move Beta up/i }));

    // Beta's "move up" button should now be disabled (it's first)
    expect(screen.getByRole('button', { name: /Move Beta up/i })).toBeDisabled();
  });

  it('shows a play button linking to the first item href', async () => {
    toggleFavorite({
      id: 'play-item',
      kind: 'movie',
      title: 'Playable Title',
      href: '/movies/play-item',
    });
    render(
      <MemoryRouter>
        <Playlists />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText('New playlist name'), {
      target: { value: 'Watchable' },
    });
    fireEvent.submit(screen.getByPlaceholderText('New playlist name').closest('form')!);
    await screen.findByText('Watchable');

    // Add the item
    fireEvent.click(screen.getByRole('button', { name: /Playable Title/i }));

    // Play link should be present and point to the item's href
    const playLink = await screen.findByRole('link', { name: /Play Watchable/i });
    expect(playLink).toBeInTheDocument();
    expect(playLink.getAttribute('href')).toBe('/movies/play-item');
  });

  it('deletes a playlist', async () => {
    render(
      <MemoryRouter>
        <Playlists />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText('New playlist name'), {
      target: { value: 'Temp list' },
    });
    fireEvent.submit(screen.getByPlaceholderText('New playlist name').closest('form')!);
    await screen.findByText('Temp list');

    fireEvent.click(screen.getByRole('button', { name: /Delete playlist Temp list/i }));

    expect(screen.queryByText('Temp list')).not.toBeInTheDocument();
    expect(screen.getByTestId('playlists-empty')).toBeInTheDocument();
  });
});

describe('Playlists accessibility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('has a page h1, labeled sections, and empty state', () => {
    render(
      <MemoryRouter>
        <Playlists />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Playlists' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Create playlist' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Your playlists (0)' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('playlists-empty')).toBeInTheDocument();
    expect(screen.getByLabelText('New playlist name')).toBeInTheDocument();
  });
});

describe('Playlists — empty state', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows empty state when no playlists exist', () => {
    render(
      <MemoryRouter>
        <Playlists />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('playlists-empty')).toBeInTheDocument();
    expect(screen.getByText(/No playlists yet/i)).toBeInTheDocument();
  });

  it('shows per-playlist empty message when playlist has no items', async () => {
    render(
      <MemoryRouter>
        <Playlists />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByPlaceholderText('New playlist name'), {
      target: { value: 'Empty List' },
    });
    fireEvent.submit(screen.getByPlaceholderText('New playlist name').closest('form')!);
    await screen.findByText('Empty List');

    const playlistSection = screen.getByRole('region', { name: 'Empty List' });
    expect(within(playlistSection).getByText(/Empty — add from favorites below/i)).toBeInTheDocument();
  });
});
