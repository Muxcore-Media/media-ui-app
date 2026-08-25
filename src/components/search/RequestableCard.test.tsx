import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RequestableCard from './RequestableCard';

describe('RequestableCard', () => {
  it('links to discover detail and keeps return path', () => {
    render(
      <MemoryRouter>
        <RequestableCard
          item={{
            id: 550,
            title: 'Fight Club',
            year: 1999,
            overview: 'soap',
            poster: '/p.jpg',
            voteAvg: 8.4,
            mediaType: 'movie',
          }}
          onRequest={() => {}}
          returnTo="/search?q=fight"
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /Fight Club/i });
    expect(link).toHaveAttribute('href', '/discover/movie/550?return=%2Fsearch%3Fq%3Dfight');
    expect(screen.getByRole('button', { name: 'Request' })).toBeInTheDocument();
  });

  it('does not link music items to discover', () => {
    render(
      <MemoryRouter>
        <RequestableCard
          item={{
            id: 0,
            musicbrainzId: 'a74b1b7f-71a5-3961-8c07-9170df271ef9',
            title: 'Radiohead',
            year: 0,
            overview: 'British rock band',
            poster: '',
            voteAvg: 0,
            mediaType: 'music',
          }}
          onRequest={() => {}}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Artist')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request' })).toBeInTheDocument();
  });
});
