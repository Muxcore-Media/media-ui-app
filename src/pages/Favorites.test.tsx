import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Favorites from './Favorites';
import { toggleFavorite } from '../lib/userdata';

describe('Favorites page', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows empty state when no favorites saved', () => {
    render(
      <MemoryRouter>
        <Favorites />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('favorites-page')).toBeInTheDocument();
    expect(screen.getByText(/No favorites yet/i)).toBeInTheDocument();
  });

  it('renders saved favorites', () => {
    toggleFavorite({
      id: 'm-42',
      kind: 'movie',
      title: 'Saved Title',
      href: '/movies/m-42',
      poster_url: '',
      year: 1999,
    });
    render(
      <MemoryRouter>
        <Favorites />
      </MemoryRouter>,
    );
    expect(screen.getByText('Saved Title')).toBeInTheDocument();
  });
});

describe('Favorites accessibility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('has a page h1, labeled section, and refresh control', () => {
    render(
      <MemoryRouter>
        <Favorites />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Favorites' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Saved titles (0)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh favorites' })).toBeInTheDocument();
    expect(screen.getByTestId('favorites-empty')).toBeInTheDocument();
  });
});
