import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import TrailerSection from './TrailerSection';
import type { DiscoverTrailer } from '../../types';

const trailer: DiscoverTrailer = {
  name: 'Official Trailer',
  youtubeKey: 'dQw4w9WgXcQ',
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
};

describe('TrailerSection', () => {
  it('renders the section and iframe when a trailer with a youtubeKey is provided', () => {
    render(<TrailerSection trailer={trailer} titleLabel="Test Movie" />);

    expect(screen.getByTestId('trailer-section')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Trailer' }),
    ).toBeInTheDocument();
    const iframe = screen.getByTitle('Official Trailer');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute(
      'src',
      expect.stringContaining('dQw4w9WgXcQ'),
    );
  });

  it('shows the trailer name as a caption below the embed', () => {
    render(<TrailerSection trailer={trailer} titleLabel="Test Movie" />);
    expect(screen.getByText('Official Trailer')).toBeInTheDocument();
  });

  it('falls back to a generated iframe title when trailer.name is absent', () => {
    const nameless: DiscoverTrailer = { name: '', youtubeKey: 'abc123', url: '' };
    render(<TrailerSection trailer={nameless} titleLabel="The Film" />);
    expect(screen.getByTitle('The Film trailer')).toBeInTheDocument();
  });

  it('renders nothing when trailer is null', () => {
    const { container } = render(
      <TrailerSection trailer={null} titleLabel="Test Movie" />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId('trailer-section')).not.toBeInTheDocument();
  });

  it('renders nothing when trailer is undefined', () => {
    const { container } = render(
      <TrailerSection trailer={undefined} titleLabel="Test Movie" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when trailer.youtubeKey is an empty string', () => {
    const noKey: DiscoverTrailer = {
      name: 'Trailer',
      youtubeKey: '',
      url: 'https://example.com',
    };
    const { container } = render(
      <TrailerSection trailer={noKey} titleLabel="Test Movie" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
