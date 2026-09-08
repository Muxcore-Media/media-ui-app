import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setCurrentRoles } from '../../lib/session';
import { JellyfinLinkButton } from './JellyfinLinkButton';

const matchJellyfinItem = vi.fn();
const unlinkJellyfinItem = vi.fn();
const jellyfinPlayURL = vi.fn();

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>('../../api/client');
  return {
    ...actual,
    api: {
      matchJellyfinItem: (...args: unknown[]) => matchJellyfinItem(...args),
      unlinkJellyfinItem: (...args: unknown[]) => unlinkJellyfinItem(...args),
      jellyfinPlayURL: (...args: unknown[]) => jellyfinPlayURL(...args),
    },
  };
});

describe('JellyfinLinkButton', () => {
  beforeEach(() => {
    setCurrentRoles([]);
    matchJellyfinItem.mockReset();
    unlinkJellyfinItem.mockReset();
    jellyfinPlayURL.mockReset();
    matchJellyfinItem.mockResolvedValue({
      available: true,
      linked: true,
      matched: true,
      muxId: 'm1',
      jellyfinId: 'jf-99',
      matchReason: 'provider_id',
    });
    jellyfinPlayURL.mockResolvedValue('https://jellyfin.example/web/#/details?id=jf-99');
    unlinkJellyfinItem.mockResolvedValue({ ok: true, muxId: 'm1' });
  });

  afterEach(() => {
    setCurrentRoles([]);
  });

  it('hides match controls from household users', () => {
    render(
      <JellyfinLinkButton muxId="m1" title="Dune" mediaKind="movie" linked={false} />,
    );
    expect(screen.queryByTestId('jellyfin-link')).not.toBeInTheDocument();
  });

  it('matches an unlinked title for admins', async () => {
    setCurrentRoles(['admin']);
    const onLinked = vi.fn();
    render(
      <JellyfinLinkButton
        muxId="m1"
        title="Dune"
        mediaKind="movie"
        tmdbId={438631}
        linked={false}
        onLinked={onLinked}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Match Jellyfin' }));
    expect(await screen.findByTestId('jellyfin-link-flash')).toHaveTextContent('Linked');
    expect(matchJellyfinItem).toHaveBeenCalledWith({
      muxId: 'm1',
      title: 'Dune',
      mediaKind: 'movie',
      tmdbId: 438631,
      path: undefined,
    });
    expect(onLinked).toHaveBeenCalledWith('https://jellyfin.example/web/#/details?id=jf-99');
  });

  it('unlinks a title for admins', async () => {
    setCurrentRoles(['admin']);
    const onUnlinked = vi.fn();
    render(
      <JellyfinLinkButton muxId="m1" title="Dune" mediaKind="movie" linked onUnlinked={onUnlinked} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Unlink Jellyfin' }));
    expect(await screen.findByTestId('jellyfin-link-flash')).toHaveTextContent('Unlinked');
    expect(unlinkJellyfinItem).toHaveBeenCalledWith('m1');
    expect(onUnlinked).toHaveBeenCalled();
  });
});
