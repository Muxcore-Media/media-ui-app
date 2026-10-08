import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setCurrentRoles } from '../../lib/session';
import { AddWantedButton } from './AddWantedButton';
import { OperatorError } from '../../api/errors';
import { MEMBER_ROLE_CASES, OPERATOR_ROLE_CASES } from '../../test/operator-roles';

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
  // The BFF reserves these controls for admin/manager (T-M5-12).
  beforeEach(() => setCurrentRoles(['manager']));

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

describe('AddWantedButton operator gate (T-M5-12)', () => {
  it.each(MEMBER_ROLE_CASES)('renders nothing for %s', (_label, roles) => {
    setCurrentRoles(roles);
    const { container } = render(<AddWantedButton itemType="movie" itemId="m1" title="Dune" />);
    expect(screen.queryByRole('button', { name: 'Add to wanted' })).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });

  it.each(OPERATOR_ROLE_CASES)('offers the button to %s', (_label, roles) => {
    setCurrentRoles(roles);
    render(<AddWantedButton itemType="movie" itemId="m1" title="Dune" />);
    expect(screen.getByRole('button', { name: 'Add to wanted' })).toBeInTheDocument();
  });

  it('explains a stale-role 403 calmly and does not retry', async () => {
    setCurrentRoles(['manager']);
    addWanted.mockReset();
    addWanted.mockRejectedValue(new OperatorError('operator.forbidden', 403));
    render(<AddWantedButton itemType="movie" itemId="m1" title="Dune" />);
    fireEvent.click(screen.getByRole('button', { name: 'Add to wanted' }));
    expect(await screen.findByTestId('add-wanted-flash')).toHaveTextContent("You don't have permission for this action.");
    expect(addWanted).toHaveBeenCalledTimes(1);
  });
});
