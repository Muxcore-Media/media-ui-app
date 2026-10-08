import { setCurrentRoles } from '../../lib/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MonitorButton } from './MonitorButton';

beforeEach(() => setCurrentRoles(['admin']));

const setMonitored = vi.fn();

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>('../../api/client');
  return {
    ...actual,
    api: {
      setMonitored: (...args: unknown[]) => setMonitored(...args),
    },
  };
});

describe('MonitorButton', () => {
  it('unmonitors a movie', async () => {
    setMonitored.mockResolvedValue({ monitored: false });
    const onChange = vi.fn();
    render(<MonitorButton kind="movie" id="m1" monitored onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Monitoring' }));
    await waitFor(() => {
      expect(setMonitored).toHaveBeenCalledWith({ kind: 'movie', id: 'm1', monitored: false });
    });
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
