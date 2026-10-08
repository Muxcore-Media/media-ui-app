import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LiveTV from './LiveTV';
import { setCurrentRoles } from '../lib/session';
import { OperatorError } from '../api/errors';
import { MEMBER_ROLE_CASES, OPERATOR_ROLE_CASES } from '../test/operator-roles';

const listLiveTV = vi.fn();
const createLiveTVTimer = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      listLiveTV: (...args: unknown[]) => listLiveTV(...args),
      createLiveTVTimer: (...args: unknown[]) => createLiveTVTimer(...args),
    },
  };
});

describe('LiveTV page', () => {
  beforeEach(() => {
    listLiveTV.mockReset();
    listLiveTV.mockResolvedValue({
      channels: [
        {
          id: 'ch1',
          name: 'News 24',
          number: '101',
          url: 'http://example/stream',
          category: 'News',
        },
      ],
      recordings: [],
      timers: [],
    });
  });

  it('renders channel guide', async () => {
    render(
      <MemoryRouter>
        <LiveTV />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('livetv-page')).toBeInTheDocument();
    expect(await screen.findByText('News 24')).toBeInTheDocument();
  });
});

describe('LiveTV accessibility', () => {
  beforeEach(() => {
    listLiveTV.mockReset();
    listLiveTV.mockResolvedValue({ channels: [], recordings: [], timers: [] });
  });

  it('has a page h1, tablist, and announces loading on initial render', () => {
    listLiveTV.mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <LiveTV />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Live TV' })).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: 'Live TV sections' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Guide' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('status', { name: 'Loading Live TV' })).toBeInTheDocument();
  });

  it('shows guide empty state when no channels are configured', async () => {
    render(
      <MemoryRouter>
        <LiveTV />
      </MemoryRouter>,
    );

    expect(await screen.findByText('No channels')).toBeInTheDocument();
    expect(screen.getByTestId('livetv-guide-empty')).toBeInTheDocument();
  });
});

describe('LiveTV page operator gate (T-M5-12)', () => {
  beforeEach(() => {
    listLiveTV.mockReset();
    createLiveTVTimer.mockReset();
    createLiveTVTimer.mockResolvedValue({ ok: true });
    listLiveTV.mockResolvedValue({
      channels: [{ id: 'ch1', name: 'News 24', number: '101', url: 'http://example/stream', category: 'News' }],
      recordings: [],
      timers: [],
    });
  });

  async function openTimers() {
    render(
      <MemoryRouter>
        <LiveTV />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('tab', { name: /timers/i }));
  }

  // GET timers is a read and stays visible; scheduling a recording is operator-only.
  it.each(MEMBER_ROLE_CASES)('shows timers without the schedule form for %s', async (_label, roles) => {
    setCurrentRoles(roles);
    await openTimers();
    expect(await screen.findByTestId('livetv-timers-empty')).toHaveTextContent(/scheduled by a household manager/i);
    expect(screen.queryByRole('button', { name: 'Schedule' })).toBeNull();
    expect(screen.queryByLabelText('Title')).toBeNull();
  });

  it.each(OPERATOR_ROLE_CASES)('offers the schedule form to %s', async (_label, roles) => {
    setCurrentRoles(roles);
    await openTimers();
    expect(await screen.findByRole('button', { name: 'Schedule' })).toBeInTheDocument();
  });

  it('explains a stale-role 403 calmly and does not retry', async () => {
    setCurrentRoles(['manager']);
    createLiveTVTimer.mockRejectedValue(new OperatorError('operator.forbidden', 403));
    await openTimers();
    fireEvent.change(await screen.findByLabelText('Title'), { target: { value: 'Evening news' } });
    fireEvent.click(screen.getByRole('button', { name: 'Schedule' }));
    const note = await screen.findByText("You don't have permission for this action.");
    expect(note).toHaveAttribute('role', 'status');
    expect(createLiveTVTimer).toHaveBeenCalledTimes(1);
  });
});
