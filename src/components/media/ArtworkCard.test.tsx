import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ArtworkCard } from './ArtworkCard';

const listItemArtwork = vi.fn();
const replaceItemArtwork = vi.fn();

vi.mock('../../api/client', () => ({
  api: {
    listItemArtwork: (...args: unknown[]) => listItemArtwork(...args),
    replaceItemArtwork: (...args: unknown[]) => replaceItemArtwork(...args),
  },
}));

vi.mock('../../lib/session', () => ({
  canManageLibrary: () => true,
}));

describe('ArtworkCard', () => {
  it('shows stored posters when ListArtwork is available', async () => {
    listItemArtwork.mockReset();
    replaceItemArtwork.mockReset();
    listItemArtwork.mockResolvedValue({
      available: true,
      items: [{ id: 'm1_poster', itemId: 'm1', type: 'poster', url: '/images/movies/m1/poster.jpg', width: 0, height: 0, mimeType: '' }],
    });
    render(<ArtworkCard kind="movie" id="m1" />);
    expect(await screen.findByTestId('item-artwork-list')).toHaveTextContent('Poster');
    expect(screen.getByAltText('Poster')).toHaveAttribute('src', '/images/movies/m1/poster.jpg');
  });

  it('uploads replacement artwork', async () => {
    listItemArtwork.mockReset();
    replaceItemArtwork.mockReset();
    listItemArtwork.mockResolvedValue({ available: true, items: [] });
    replaceItemArtwork.mockResolvedValue({
      id: 'm1_poster',
      itemId: 'm1',
      type: 'poster',
      url: '/images/movies/m1/poster.jpg',
      width: 0,
      height: 0,
      mimeType: '',
    });
    const readAsDataURL = vi.fn();
    vi.stubGlobal(
      'FileReader',
      class {
        result = 'data:image/png;base64,abc';
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        readAsDataURL() {
          readAsDataURL();
          this.onload?.();
        }
      },
    );
    render(<ArtworkCard kind="movie" id="m1" />);
    expect(await screen.findByTestId('item-artwork-replace')).toBeInTheDocument();
    const file = new File(['x'], 'poster.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Upload artwork'), { target: { files: [file] } });
    await waitFor(() => {
      expect(replaceItemArtwork).toHaveBeenCalledWith('movie', 'm1', {
        type: 'poster',
        filename: 'poster.png',
        data: 'data:image/png;base64,abc',
      });
    });
    expect(screen.getByText('Poster replaced')).toBeInTheDocument();
  });
});
