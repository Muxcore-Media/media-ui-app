import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CastSection from './CastSection';
import type { DiscoverCastMember } from '../../types';

function renderCast(cast: DiscoverCastMember[]) {
  return render(
    <MemoryRouter>
      <CastSection cast={cast} />
    </MemoryRouter>,
  );
}

describe('CastSection', () => {
  it('renders nothing when cast is empty', () => {
    const { container } = renderCast([]);
    expect(container.firstChild).toBeNull();
  });

  it('renders member names and characters', () => {
    renderCast([
      { id: 1, name: 'Brad Pitt', character: 'Tyler Durden', profilePath: '/brad.jpg' },
      { id: 2, name: 'Edward Norton', character: 'The Narrator' },
    ]);

    // img alt covers Brad Pitt; text node covers Edward Norton (no photo)
    expect(screen.getByRole('img', { name: 'Brad Pitt' })).toBeInTheDocument();
    expect(screen.getByText('Tyler Durden')).toBeInTheDocument();
    expect(screen.getAllByText('Edward Norton').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('The Narrator')).toBeInTheDocument();
  });

  it('links to /person/:id when member has an id', () => {
    renderCast([
      { id: 287, name: 'Brad Pitt', character: 'Tyler Durden' },
    ]);

    const link = screen.getByRole('link', { name: /Brad Pitt/i });
    expect(link).toHaveAttribute('href', '/person/287');
  });

  it('renders a non-link tile when member id is 0 / falsy', () => {
    renderCast([
      { id: 0, name: 'Unknown Actor', character: 'Villain' },
    ]);

    expect(screen.queryByRole('link', { name: /Unknown Actor/i })).toBeNull();
    expect(screen.getAllByText('Unknown Actor').length).toBeGreaterThanOrEqual(1);
  });

  it('renders profile image with member name as alt text', () => {
    renderCast([
      { id: 1, name: 'Brad Pitt', profilePath: '/brad.jpg' },
    ]);

    const img = screen.getByRole('img', { name: 'Brad Pitt' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', expect.stringContaining('brad.jpg'));
  });
});
