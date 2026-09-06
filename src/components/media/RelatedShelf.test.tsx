import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RelatedShelf from './RelatedShelf';
import type { RelatedItem } from '../../types';

const getRelated = vi.fn();

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>('../../api/client');
  return {
    ...actual,
    api: {
      ...actual.api,
      getRelated: (...args: unknown[]) => getRelated(...args),
    },
  };
});

vi.mock('../../lib/parental', async () => {
  const actual = await vi.importActual<typeof import('../../lib/parental')>('../../lib/parental');
  return {
    ...actual,
    applyParentalFilter: <T,>(items: T[]) => items,
  };
});

function relatedItem(overrides: Partial<RelatedItem> = {}): RelatedItem {
  return {
    id: 550,
    title: 'Fight Club',
    year: 1999,
    overview: 'A classic.',
    poster: '/fc.jpg',
    voteAvg: 8.4,
    mediaType: 'movie',
    relation: 'related_to',
    ...overrides,
  };
}

function renderShelf(kind: 'movie' | 'tv' = 'movie', tmdbId?: number) {
  return render(
    <MemoryRouter>
      <RelatedShelf kind={kind} tmdbId={tmdbId} />
    </MemoryRouter>,
  );
}

describe('RelatedShelf', () => {
  beforeEach(() => {
    getRelated.mockReset();
  });

  it('renders the shelf and poster cards when items are returned', async () => {
    getRelated.mockResolvedValue({
      items: [
        relatedItem({ id: 550, title: 'Fight Club' }),
        relatedItem({ id: 278, title: 'The Shawshank Redemption' }),
      ],
      available: true,
    });

    renderShelf('movie', 550);

    const shelf = await screen.findByTestId('related-shelf');
    expect(shelf).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Fight Club/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Shawshank/i })).toBeInTheDocument();
  });

  it('renders nothing when the graph module is unavailable (available=false)', async () => {
    getRelated.mockResolvedValue({ items: [], available: false });

    const { container } = renderShelf('movie', 550);

    await waitFor(() => expect(getRelated).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when the graph returns no related items', async () => {
    getRelated.mockResolvedValue({ items: [], available: true });

    const { container } = renderShelf('movie', 550);

    await waitFor(() => expect(getRelated).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing on a network error (soft-empty, does not throw)', async () => {
    getRelated.mockRejectedValue(new Error('graph offline'));

    const { container } = renderShelf('movie', 550);

    await waitFor(() => expect(getRelated).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it('is a no-op (renders nothing) when tmdbId is undefined', () => {
    const { container } = renderShelf('movie');
    expect(getRelated).not.toHaveBeenCalled();
    expect(container.firstChild).toBeNull();
  });

  it('uses tv kind in the shelf heading by default for TV shows', async () => {
    getRelated.mockResolvedValue({
      items: [relatedItem({ id: 1396, title: 'Breaking Bad', mediaType: 'tv' })],
      available: true,
    });

    renderShelf('tv', 1396);

    await screen.findByTestId('related-shelf');
    expect(getRelated).toHaveBeenCalledWith('tmdb:tv:1396');
  });
});
