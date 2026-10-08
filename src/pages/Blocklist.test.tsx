import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setCurrentRoles } from '../lib/session';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Blocklist from './Blocklist';
import { OperatorError } from '../api/errors';
import { MEMBER_ROLE_CASES, OPERATOR_ROLE_CASES } from '../test/operator-roles';

const listBlocklist = vi.fn();
const clearBlocklist = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      listBlocklist: (...args: unknown[]) => listBlocklist(...args),
      clearBlocklist: (...args: unknown[]) => clearBlocklist(...args),
    },
  };
});

describe('Blocklist page', () => {
  // The BFF reserves these controls for admin/manager (T-M5-12).
  beforeEach(() => setCurrentRoles(['manager']));

  beforeEach(() => {
    listBlocklist.mockReset();
    clearBlocklist.mockReset();
  });

  it('renders empty state', async () => {
    listBlocklist.mockResolvedValue({ available: true, items: [], total: 0 });
    render(
      <MemoryRouter>
        <Blocklist />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('blocklist-empty')).toBeInTheDocument();
  });

  it('unblocks a release', async () => {
    listBlocklist
      .mockResolvedValueOnce({
        available: true,
        total: 1,
        items: [{ wantedItemId: 'q1', guid: 'g-bad', title: 'CAM.Rip', reason: 'household', loop: 1, createdAt: '' }],
      })
      .mockResolvedValueOnce({ available: true, items: [], total: 0 });
    clearBlocklist.mockResolvedValue({ removed: 1 });
    render(
      <MemoryRouter>
        <Blocklist />
      </MemoryRouter>,
    );
    expect(await screen.findByText('CAM.Rip')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Unblock' }));
    await waitFor(() => {
      expect(clearBlocklist).toHaveBeenCalledWith({ wantedItemId: 'q1', guid: 'g-bad' });
    });
    expect(await screen.findByTestId('blocklist-empty')).toBeInTheDocument();
  });
});

describe('Blocklist page operator gate (T-M5-12)', () => {
  const list = {
    available: true,
    total: 1,
    items: [{ wantedItemId: 'q1', guid: 'g-bad', title: 'CAM.Rip', reason: 'household', loop: 1, createdAt: '' }],
  };

  beforeEach(() => {
    listBlocklist.mockReset();
    clearBlocklist.mockReset();
    listBlocklist.mockResolvedValue(list);
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <Blocklist />
      </MemoryRouter>,
    );
  }

  it.each(MEMBER_ROLE_CASES)('lists entries without clear or unblock for %s', async (_label, roles) => {
    setCurrentRoles(roles);
    renderPage();
    expect(await screen.findByText('CAM.Rip')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unblock' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Clear all' })).toBeNull();
    expect(screen.queryByText(/clear an entry/i)).toBeNull();
  });

  it.each(OPERATOR_ROLE_CASES)('offers unblock and clear all to %s', async (_label, roles) => {
    setCurrentRoles(roles);
    renderPage();
    expect(await screen.findByRole('button', { name: 'Unblock' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear all' })).toBeInTheDocument();
  });

  it('explains a stale-role 403 calmly and does not retry', async () => {
    setCurrentRoles(['manager']);
    clearBlocklist.mockRejectedValue(new OperatorError('operator.forbidden', 403));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Unblock' }));
    expect(await screen.findByTestId('operator-notice')).toHaveTextContent("You don't have permission for this action.");
    expect(clearBlocklist).toHaveBeenCalledTimes(1);
  });
});
