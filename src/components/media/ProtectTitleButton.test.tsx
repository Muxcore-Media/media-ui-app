import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProtectTitleButton } from './ProtectTitleButton';

const upsertMaintainerProtection = vi.fn();

vi.mock('../../api/client', () => ({
  api: {
    upsertMaintainerProtection: (...args: unknown[]) => upsertMaintainerProtection(...args),
  },
}));

vi.mock('../../lib/session', () => ({
  canManageLibrary: () => true,
}));

describe('ProtectTitleButton', () => {
  it('protects a title from maintainer cleanup', async () => {
    upsertMaintainerProtection.mockReset();
    upsertMaintainerProtection.mockResolvedValue({ id: 'p1', itemId: 'm1', title: 'Fight Club' });
    render(<ProtectTitleButton kind="movie" id="m1" title="Fight Club" />);
    fireEvent.click(screen.getByRole('button', { name: 'Protect from cleanup' }));
    await waitFor(() => {
      expect(upsertMaintainerProtection).toHaveBeenCalledWith({
        itemId: 'm1',
        title: 'Fight Club',
        scope: 'movie',
        reason: 'Household favorite',
      });
    });
    expect(screen.getByText('Protected from cleanup')).toBeInTheDocument();
  });
});
