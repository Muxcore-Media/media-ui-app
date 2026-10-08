import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setCurrentRoles } from '../../lib/session';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SeriesOverrideCard } from './SeriesOverrideCard';
import { OperatorError } from '../../api/errors';
import { MEMBER_ROLE_CASES, OPERATOR_ROLE_CASES } from '../../test/operator-roles';

const getSeriesOverride = vi.fn();
const upsertSeriesOverride = vi.fn();
const deleteSeriesOverride = vi.fn();

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>('../../api/client');
  return {
    ...actual,
    api: {
      getSeriesOverride: (...args: unknown[]) => getSeriesOverride(...args),
      upsertSeriesOverride: (...args: unknown[]) => upsertSeriesOverride(...args),
      deleteSeriesOverride: (...args: unknown[]) => deleteSeriesOverride(...args),
    },
  };
});

describe('SeriesOverrideCard', () => {
  // The BFF reserves these controls for admin/manager (T-M5-12).
  beforeEach(() => setCurrentRoles(['manager']));

  it('saves delay and release groups', async () => {
    getSeriesOverride.mockResolvedValue({
      available: true,
      found: false,
      override: { seriesId: 's1', delayMinutes: 0, preferredGroups: [], ignoredGroups: [] },
    });
    upsertSeriesOverride.mockResolvedValue({
      available: true,
      found: true,
      override: { seriesId: 's1', delayMinutes: 45, preferredGroups: ['FLUX'], ignoredGroups: ['RARBG'] },
    });
    render(<SeriesOverrideCard seriesId="s1" />);
    expect(await screen.findByTestId('series-override')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('series-override-delay'), { target: { value: '45' } });
    fireEvent.change(screen.getByLabelText('Preferred release groups'), { target: { value: 'FLUX' } });
    fireEvent.change(screen.getByLabelText('Ignored release groups'), { target: { value: 'RARBG' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save override' }));
    await waitFor(() => {
      expect(upsertSeriesOverride).toHaveBeenCalledWith({
        id: 's1',
        delayMinutes: 45,
        preferredGroups: ['FLUX'],
        ignoredGroups: ['RARBG'],
      });
    });
  });
});

describe('SeriesOverrideCard operator gate (T-M5-12)', () => {
  const found = {
    available: true,
    found: false,
    override: { seriesId: 's1', delayMinutes: 0, preferredGroups: [], ignoredGroups: [] },
  };

  it.each(MEMBER_ROLE_CASES)('renders nothing and loads nothing for %s', (_label, roles) => {
    getSeriesOverride.mockReset();
    getSeriesOverride.mockResolvedValue(found);
    setCurrentRoles(roles);
    const { container } = render(<SeriesOverrideCard seriesId="s1" />);
    expect(screen.queryByTestId('series-override')).toBeNull();
    expect(container).toBeEmptyDOMElement();
    expect(getSeriesOverride).not.toHaveBeenCalled();
  });

  it.each(OPERATOR_ROLE_CASES)('offers the card to %s', async (_label, roles) => {
    getSeriesOverride.mockReset();
    getSeriesOverride.mockResolvedValue(found);
    setCurrentRoles(roles);
    render(<SeriesOverrideCard seriesId="s1" />);
    expect(await screen.findByTestId('series-override')).toBeInTheDocument();
  });

  it('explains a stale-role 403 calmly and does not retry', async () => {
    getSeriesOverride.mockReset();
    getSeriesOverride.mockResolvedValue(found);
    upsertSeriesOverride.mockReset();
    upsertSeriesOverride.mockRejectedValue(new OperatorError('operator.forbidden', 403));
    setCurrentRoles(['manager']);
    render(<SeriesOverrideCard seriesId="s1" />);
    await screen.findByTestId('series-override');
    fireEvent.click(screen.getByRole('button', { name: 'Save override' }));
    const notice = await screen.findByTestId('series-override-error');
    expect(notice).toHaveTextContent("You don't have permission for this action.");
    expect(notice).toHaveAttribute('role', 'status');
    expect(upsertSeriesOverride).toHaveBeenCalledTimes(1);
  });
});
