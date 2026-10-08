import { setCurrentRoles } from '../../lib/session';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddWantedButton } from './AddWantedButton';

beforeEach(() => setCurrentRoles(['admin']));

const addWanted = vi.fn();

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>('../../api/client');
  return {
    ...actual,
    api: {
      addWanted: (...args: unknown[]) => addWanted(...args),
    },
  };
});

describe('AddWantedButton', () => {
  beforeEach(() => {
    addWanted.mockReset();
    addWanted.mockResolvedValue({ added: true, queue_id: 'w_movie_m1' });
  });

  it('adds the title to the automation wanted queue', async () => {
    render(
      <AddWantedButton itemType="movie" itemId="m1" title="Dune" year={2021} tmdbId={438631} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add to wanted' }));
    expect(await screen.findByTestId('add-wanted-flash')).toHaveTextContent('Added to wanted');
    expect(addWanted).toHaveBeenCalledWith({
      itemType: 'movie',
      itemId: 'm1',
      title: 'Dune',
      year: 2021,
      tmdbId: 438631,
      qualityProfileId: undefined,
      seriesId: undefined,
    });
  });
});
