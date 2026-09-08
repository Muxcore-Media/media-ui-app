import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SeriesOverrideCard } from './SeriesOverrideCard';

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
