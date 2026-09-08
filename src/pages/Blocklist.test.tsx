import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Blocklist from './Blocklist';

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
