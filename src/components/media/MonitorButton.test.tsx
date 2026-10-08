import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setCurrentRoles } from '../../lib/session';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MonitorButton } from './MonitorButton';
import { OperatorError } from '../../api/errors';
import { MEMBER_ROLE_CASES, OPERATOR_ROLE_CASES } from '../../test/operator-roles';

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
  // The BFF reserves these controls for admin/manager (T-M5-12).
  beforeEach(() => setCurrentRoles(['manager']));

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

describe('MonitorButton operator gate (T-M5-12)', () => {
  it.each(MEMBER_ROLE_CASES)('renders nothing for %s (full and compact)', (_label, roles) => {
    setCurrentRoles(roles);
    const full = render(<MonitorButton kind="movie" id="m1" monitored />);
    expect(full.container).toBeEmptyDOMElement();
    full.unmount();
    const compact = render(<MonitorButton compact kind="episode" id="e1" monitored />);
    expect(compact.container).toBeEmptyDOMElement();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it.each(OPERATOR_ROLE_CASES)('offers the toggle to %s', (_label, roles) => {
    setCurrentRoles(roles);
    render(<MonitorButton kind="movie" id="m1" monitored />);
    expect(screen.getByRole('button', { name: 'Monitoring' })).toBeInTheDocument();
  });

  it('explains a stale-role 403 calmly and does not retry', async () => {
    setCurrentRoles(['manager']);
    setMonitored.mockReset();
    setMonitored.mockRejectedValue(new OperatorError('operator.forbidden', 403));
    const onChange = vi.fn();
    render(<MonitorButton kind="movie" id="m1" monitored onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Monitoring' }));
    const note = await screen.findByTestId('monitor-note');
    expect(note).toHaveTextContent("You don't have permission for this action.");
    expect(note).toHaveAttribute('role', 'status');
    expect(setMonitored).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });
});
